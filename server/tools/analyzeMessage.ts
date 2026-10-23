import { z } from 'zod';

export interface ExtractedFact {
  type: 'url' | 'organization' | 'payment_method' | 'credential_type' | 'urgency_keyword' | 'contact_handle';
  value: string;
  context: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalyzeMessageResult {
  extractedUrls: string[];
  claimedOrganization: string | null;
  paymentDemands: string[];
  credentialRequests: string[];
  urgencySignals: string[];
  impersonationIndicators: string[];
  observableFacts: ExtractedFact[];
  potentialBenignExplanations: string[];
  analysisLimitations: string[];
  analysisSource: 'GEMINI_AI' | 'HEURISTIC_ANALYSIS';
}

export const AnalyzeMessageInputSchema = z.object({
  messageText: z.string().min(1, 'Message text is required').max(10000, 'Message exceeds 10,000 character limit'),
});

export type AnalyzeMessageInput = z.infer<typeof AnalyzeMessageInputSchema>;

// Known high-risk patterns and keywords
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const PAYMENT_KEYWORDS = [
  'gift card', 'steam card', 'apple card', 'google play card', 'itunes card',
  'wire transfer', 'western union', 'moneygram', 'zelle', 'venmo', 'cashapp', 'cash app',
  'paypal friends', 'crypto', 'bitcoin', 'usdt', 'eth', 'wallet address', 'processing fee',
  'refundable deposit', 'security deposit', 'advance fee', 'equipment fee'
];

const CREDENTIAL_KEYWORDS = [
  'otp', 'one-time password', 'verification code', 'passcode', 'pin', 'ssn',
  'social security', 'password', 'banking credentials', 'login details', 'account number',
  'routing number', 'card number', 'cvv', 'cvc', 'identity verification', 'secret question'
];

const URGENCY_KEYWORDS = [
  'immediately', 'urgent', 'action required', 'suspended within 24 hours', 'account suspended',
  'legal action', 'arrest warrant', 'immediate arrest', 'final notice', 'expires in',
  'act fast', 'limited spots', 'offer expires', 'do not delay', 'within 2 hours', 'unauthorized transaction'
];

const IMPERSONATION_TARGETS = [
  { name: 'Amazon', aliases: ['amazon', 'prime delivery', 'aws support', 'amazon fulfillment'] },
  { name: 'PayPal', aliases: ['paypal', 'paypal security', 'paypal service'] },
  { name: 'Apple', aliases: ['apple id', 'icloud', 'apple support'] },
  { name: 'Microsoft', aliases: ['microsoft support', 'windows defender', 'office 365 team'] },
  { name: 'Internal Revenue Service (IRS)', aliases: ['irs', 'internal revenue service', 'tax refund'] },
  { name: 'FedEx / UPS / Postal Service', aliases: ['fedex', 'ups', 'usps', 'postal service', 'dhl', 'courier parcel', 'customs fee'] },
  { name: 'Wells Fargo / Chase / Bank of America', aliases: ['wells fargo', 'chase bank', 'bank of america', 'citibank', 'fraud department'] },
  { name: 'Tech Recruitment / University Career Center', aliases: ['hr manager', 'talent acquisition', 'internship coordinator', 'remote assistant', 'telegram recruiter'] }
];

export function analyzeMessageHeuristic(text: string): AnalyzeMessageResult {
  const lower = text.toLowerCase();
  
  // 1. Extract URLs
  const rawUrls = text.match(URL_REGEX) || [];
  const extractedUrls = Array.from(new Set(rawUrls.map(u => u.trim().replace(/[.,;!?]+$/, ''))));

  // 2. Identify Claimed Organization
  let claimedOrganization: string | null = null;
  for (const target of IMPERSONATION_TARGETS) {
    if (target.aliases.some(alias => lower.includes(alias))) {
      claimedOrganization = target.name;
      break;
    }
  }

  // 3. Payment Demands
  const paymentDemands: string[] = [];
  for (const kw of PAYMENT_KEYWORDS) {
    if (lower.includes(kw)) {
      paymentDemands.push(kw);
    }
  }

  // 4. Credential / OTP Requests
  const credentialRequests: string[] = [];
  for (const kw of CREDENTIAL_KEYWORDS) {
    if (lower.includes(kw)) {
      credentialRequests.push(kw);
    }
  }

  // 5. Urgency Signals
  const urgencySignals: string[] = [];
  for (const kw of URGENCY_KEYWORDS) {
    if (lower.includes(kw)) {
      urgencySignals.push(kw);
    }
  }

  // 6. Impersonation Indicators
  const impersonationIndicators: string[] = [];
  if (claimedOrganization) {
    impersonationIndicators.push(`Message invokes trust of '${claimedOrganization}'`);
    if (extractedUrls.some(u => !u.toLowerCase().includes(claimedOrganization!.toLowerCase().split(' ')[0].toLowerCase()))) {
      impersonationIndicators.push(`Domain in message does not match claimed organization '${claimedOrganization}'`);
    }
  }
  if (lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('signal')) {
    impersonationIndicators.push('Directs candidate/victim to non-official external messaging apps (Telegram/WhatsApp)');
  }

  // 7. Observable Facts
  const observableFacts: ExtractedFact[] = [];
  extractedUrls.forEach(url => {
    observableFacts.push({
      type: 'url',
      value: url,
      context: 'Extracted URL from message body',
      confidence: 'high'
    });
  });
  paymentDemands.forEach(p => {
    observableFacts.push({
      type: 'payment_method',
      value: p,
      context: `Detected payment keyword '${p}'`,
      confidence: 'high'
    });
  });
  credentialRequests.forEach(c => {
    observableFacts.push({
      type: 'credential_type',
      value: c,
      context: `Detected sensitive credential/OTP request '${c}'`,
      confidence: 'high'
    });
  });
  urgencySignals.forEach(u => {
    observableFacts.push({
      type: 'urgency_keyword',
      value: u,
      context: `Detected artificial urgency keyword '${u}'`,
      confidence: 'high'
    });
  });

  // 8. Potential Benign Explanations
  const potentialBenignExplanations: string[] = [];
  if (extractedUrls.length === 0 && paymentDemands.length === 0 && credentialRequests.length === 0) {
    potentialBenignExplanations.push('Text contains no overt links or payment requests; could be a normal notification or routine inquiry.');
  } else {
    potentialBenignExplanations.push('Legitimate services occasionally send one-time authentication codes or shipping notifications, but legitimate organizations never ask you to read back an OTP or pay fees through third-party money apps.');
  }

  // 9. Limitations
  const analysisLimitations = [
    'Static syntactic analysis cannot inspect caller ID spoofing or email sender header metadata without raw headers.',
    'Message text may have been truncated or modified prior to submission.',
    'Scammers frequently modify phrasing to bypass keyword filters.'
  ];

  return {
    extractedUrls,
    claimedOrganization,
    paymentDemands,
    credentialRequests,
    urgencySignals,
    impersonationIndicators,
    observableFacts,
    potentialBenignExplanations,
    analysisLimitations,
    analysisSource: 'HEURISTIC_ANALYSIS'
  };
}
