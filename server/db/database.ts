import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface PersistedInvestigationCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messageText: string;
  submittedUrl?: string | null;
  claimedOrganization?: string | null;
  riskLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  evidenceStrength: string;
  assessment: any;
  safetyPlan: any;
  toolsExecuted: string[];
  verificationHash: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  caseId: string;
  toolName: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'CANCELLED';
  durationMs: number;
  details?: string;
}

export interface DatabaseSchema {
  version: number;
  lastMigration: string;
  cases: Record<string, PersistedInvestigationCase>;
  auditLogs: AuditLogEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'scamsentry_db.json');
const MAX_CASES = 1000;
const MAX_AUDIT_LOGS = 500;

class InvestigationDatabase {
  private schema: DatabaseSchema = {
    version: 1,
    lastMigration: new Date().toISOString(),
    cases: {},
    auditLogs: []
  };
  private isInitialized = false;
  // Sequential write queue to guarantee atomic persistence under concurrent calls
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.schema = {
              version: parsed.version || 1,
              lastMigration: parsed.lastMigration || new Date().toISOString(),
              cases: parsed.cases || {},
              auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []
            };
          }
        }
      } else {
        this.persistSync();
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('[Database] Failed to parse existing database file, backing up and creating fresh store:', err);
      try {
        if (fs.existsSync(DB_FILE)) {
          fs.renameSync(DB_FILE, `${DB_FILE}.corrupt.${Date.now()}`);
        }
        this.persistSync();
      } catch (backupErr) {
        console.error('[Database] Recovery failed:', backupErr);
      }
      this.isInitialized = true;
    }
  }

  private persistSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const nonce = crypto.randomBytes(8).toString('hex');
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${nonce}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.schema, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[Database] Synchronous persistence failure:', err);
    }
  }

  /**
   * Serializes write operations through a promise queue to eliminate race conditions
   * under high-concurrency requests.
   */
  private schedulePersist(): Promise<void> {
    this.writeQueue = this.writeQueue
      .then(() => {
        this.persistSync();
      })
      .catch((err) => {
        console.error('[Database] Scheduled persistence error:', err);
      });
    return this.writeQueue;
  }

  private generateVerificationHash(item: {
    id: string;
    createdAt: string;
    messageText: string;
    riskLevel: string;
    riskScore: number;
  }): string {
    const dataToHash = `${item.id}|${item.createdAt}|${item.messageText}|${item.riskLevel}|${item.riskScore}`;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  // --- CRUD Operations ---

  public createCase(input: {
    id?: string;
    title?: string;
    messageText: string;
    submittedUrl?: string | null;
    claimedOrganization?: string | null;
    riskLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    evidenceStrength: string;
    assessment: any;
    safetyPlan: any;
    toolsExecuted: string[];
  }): PersistedInvestigationCase {
    const id = input.id || `CASE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();
    
    let title = input.title;
    if (!title) {
      const org = input.claimedOrganization ? `[${input.claimedOrganization}] ` : '';
      const snippet = input.messageText.slice(0, 40).replace(/[\r\n]+/g, ' ');
      title = `${org}${snippet}...`;
    }

    const verificationHash = this.generateVerificationHash({
      id,
      createdAt: timestamp,
      messageText: input.messageText,
      riskLevel: input.riskLevel,
      riskScore: input.riskScore
    });

    const newCase: PersistedInvestigationCase = {
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      title,
      messageText: input.messageText,
      submittedUrl: input.submittedUrl || null,
      claimedOrganization: input.claimedOrganization || null,
      riskLevel: input.riskLevel,
      riskScore: input.riskScore,
      evidenceStrength: input.evidenceStrength,
      assessment: input.assessment,
      safetyPlan: input.safetyPlan,
      toolsExecuted: input.toolsExecuted,
      verificationHash
    };

    // Store in-memory
    this.schema.cases[id] = newCase;

    // Bound memory if needed
    const caseKeys = Object.keys(this.schema.cases);
    if (caseKeys.length > MAX_CASES) {
      // Evict oldest
      const oldestKey = caseKeys.sort((a, b) => 
        new Date(this.schema.cases[a].createdAt).getTime() - new Date(this.schema.cases[b].createdAt).getTime()
      )[0];
      delete this.schema.cases[oldestKey];
    }

    this.schedulePersist();

    this.logAudit({
      caseId: id,
      toolName: 'save_investigation',
      action: 'PERSIST_INVESTIGATION_CASE',
      outcome: 'SUCCESS',
      durationMs: 4,
      details: `Saved case '${id}' with risk level ${input.riskLevel}`
    });

    return newCase;
  }

  public getCase(id: string): PersistedInvestigationCase | null {
    if (!id || typeof id !== 'string') return null;
    const item = this.schema.cases[id.trim()];
    return item ? { ...item } : null;
  }

  public listCases(query?: {
    search?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
  }): { cases: PersistedInvestigationCase[]; total: number } {
    let all = Object.values(this.schema.cases);

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Search filter
    if (query?.search) {
      const q = query.search.toLowerCase().trim();
      all = all.filter(c => 
        c.title.toLowerCase().includes(q) ||
        c.messageText.toLowerCase().includes(q) ||
        (c.claimedOrganization && c.claimedOrganization.toLowerCase().includes(q)) ||
        (c.submittedUrl && c.submittedUrl.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
      );
    }

    // Risk level filter
    if (query?.riskLevel && query.riskLevel !== 'ALL') {
      all = all.filter(c => c.riskLevel === query.riskLevel);
    }

    const total = all.length;
    const limit = Math.min(Math.max(1, query?.limit || 50), 100);
    const offset = Math.max(0, query?.offset || 0);
    const cases = all.slice(offset, offset + limit);

    return { cases, total };
  }

  public deleteCase(id: string): boolean {
    if (!id || !this.schema.cases[id]) {
      return false;
    }
    delete this.schema.cases[id];
    this.schedulePersist();

    this.logAudit({
      caseId: id,
      toolName: 'delete_investigation',
      action: 'DELETE_INVESTIGATION_CASE',
      outcome: 'SUCCESS',
      durationMs: 3,
      details: `Purged case record '${id}'`
    });

    return true;
  }

  public clearAllCases(): number {
    const count = Object.keys(this.schema.cases).length;
    this.schema.cases = {};
    this.schema.auditLogs = [];
    this.schedulePersist();
    return count;
  }

  // --- Audit Logging ---

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.schema.auditLogs.unshift(fullEntry);
    if (this.schema.auditLogs.length > MAX_AUDIT_LOGS) {
      this.schema.auditLogs.length = MAX_AUDIT_LOGS;
    }
    this.schedulePersist();
    return fullEntry;
  }

  public getAuditLogs(caseId?: string): AuditLogEntry[] {
    if (caseId) {
      return this.schema.auditLogs.filter(l => l.caseId === caseId);
    }
    return [...this.schema.auditLogs];
  }

  // --- Cryptographic Integrity Verification ---

  public verifyRecordIntegrity(caseId: string): {
    verified: boolean;
    exists: boolean;
    hashMatches: boolean;
    computedHash?: string;
    storedHash?: string;
    record?: PersistedInvestigationCase;
  } {
    const item = this.getCase(caseId);
    if (!item) {
      return { verified: false, exists: false, hashMatches: false };
    }

    const computed = this.generateVerificationHash({
      id: item.id,
      createdAt: item.createdAt,
      messageText: item.messageText,
      riskLevel: item.riskLevel,
      riskScore: item.riskScore
    });

    const hashMatches = computed === item.verificationHash;
    return {
      verified: hashMatches,
      exists: true,
      hashMatches,
      computedHash: computed,
      storedHash: item.verificationHash,
      record: item
    };
  }
}

export const db = new InvestigationDatabase();
