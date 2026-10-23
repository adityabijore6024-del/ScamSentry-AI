import { z } from 'zod';

export type SsrfRiskCategory =
  | 'PUBLIC_EXTERNAL_HOST'
  | 'LOOPBACK_TARGET'
  | 'PRIVATE_NETWORK_TARGET'
  | 'CLOUD_METADATA_TARGET'
  | 'UNUSUAL_SCHEME'
  | 'MALFORMED';

export interface UrlInspectionResult {
  url: string;
  normalizedUrl: string;
  scheme: string;
  hostname: string;
  port: string | null;
  pathname: string;
  isIpAddress: boolean;
  ipVersion: 'IPv4' | 'IPv6' | null;
  ssrfClassification: SsrfRiskCategory;
  hasEmbeddedCredentials: boolean;
  hasUnusualPort: boolean;
  isLookalikeDomain: boolean;
  lookalikeTarget: string | null;
  hasDeceptiveSubdomain: boolean;
  suspiciousTld: boolean;
  suspiciousTokens: string[];
  reputationCheck: {
    performed: boolean;
    provider: string;
    status: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
    details: string;
  };
  observableEvidence: string[];
  limitations: string[];
}

export const InspectUrlInputSchema = z.object({
  url: z.string().min(1, 'URL is required').max(2048, 'URL exceeds maximum length of 2048 characters'),
});

export type InspectUrlInput = z.infer<typeof InspectUrlInputSchema>;

// Suspicious top-level domains frequently abused for throwaway phishing
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'buzz', 'icu', 'tk', 'ml', 'ga', 'cf', 'gq', 'work', 'vip',
  'click', 'rest', 'fit', 'sbs', 'cfd', 'monster', 'country', 'stream', 'live'
]);

// High-value brand names targeted in deceptive domains
const HIGH_VALUE_BRANDS = [
  { brand: 'PayPal', root: 'paypal', legitimateDomain: 'paypal.com' },
  { brand: 'Amazon', root: 'amazon', legitimateDomain: 'amazon.com' },
  { brand: 'Apple', root: 'apple', legitimateDomain: 'apple.com' },
  { brand: 'Google', root: 'google', legitimateDomain: 'google.com' },
  { brand: 'Microsoft', root: 'microsoft', legitimateDomain: 'microsoft.com' },
  { brand: 'Netflix', root: 'netflix', legitimateDomain: 'netflix.com' },
  { brand: 'Wells Fargo', root: 'wellsfargo', legitimateDomain: 'wellsfargo.com' },
  { brand: 'Chase', root: 'chase', legitimateDomain: 'chase.com' },
  { brand: 'USPS', root: 'usps', legitimateDomain: 'usps.com' },
  { brand: 'FedEx', root: 'fedex', legitimateDomain: 'fedex.com' },
  { brand: 'DHL', root: 'dhl', legitimateDomain: 'dhl.com' },
  { brand: 'Meta / Facebook', root: 'facebook', legitimateDomain: 'facebook.com' },
  { brand: 'Instagram', root: 'instagram', legitimateDomain: 'instagram.com' }
];

const HOMOGLYPH_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  'vv': 'w',
  'rn': 'm'
};

const STANDARD_IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^\[?([a-fA-F0-9:]+)\]?$/;

// Cloud metadata endpoints
const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'instance-data',
  'metadata'
]);

// Non-HTTP schemes
const DANGEROUS_SCHEMES = new Set([
  'javascript', 'file', 'data', 'blob', 'gopher', 'ftp', 'ldap', 'dict', 'sftp', 'tftp', 'telnet', 'mailto'
]);

function parseIpv4Octets(host: string): number[] | null {
  if (!STANDARD_IPV4_REGEX.test(host)) return null;
  const parts = host.split('.').map(n => parseInt(n, 10));
  return parts.length === 4 ? parts : null;
}

function classifyHostSsrfRisk(hostname: string, scheme: string): { category: SsrfRiskCategory; isIp: boolean; ipVersion: 'IPv4' | 'IPv6' | null; details: string[] } {
  const details: string[] = [];
  const cleanHost = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // Check dangerous schemes
  if (DANGEROUS_SCHEMES.has(scheme)) {
    details.push(`High-risk non-HTTP protocol '${scheme}:' detected. This scheme is prohibited for external web traffic.`);
    return { category: 'UNUSUAL_SCHEME', isIp: false, ipVersion: null, details };
  }

  // Cloud metadata host check
  if (CLOUD_METADATA_HOSTS.has(cleanHost)) {
    details.push(`Critical SSRF risk: URL targets cloud instance metadata service (${cleanHost}).`);
    return { category: 'CLOUD_METADATA_TARGET', isIp: true, ipVersion: 'IPv4', details };
  }

  // Loopback hostnames
  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost')) {
    details.push(`High SSRF risk: URL targets local host loopback interface ('${cleanHost}').`);
    return { category: 'LOOPBACK_TARGET', isIp: false, ipVersion: null, details };
  }

  // IPv4 inspection
  const octets = parseIpv4Octets(cleanHost);
  if (octets) {
    const [b0, b1, b2, b3] = octets;

    // Cloud metadata 169.254.169.254
    if (b0 === 169 && b1 === 254 && b2 === 169 && b3 === 254) {
      details.push('Critical SSRF risk: URL targets cloud instance metadata address (169.254.169.254).');
      return { category: 'CLOUD_METADATA_TARGET', isIp: true, ipVersion: 'IPv4', details };
    }

    // Loopback 127.0.0.0/8 or 0.0.0.0
    if (b0 === 127 || (b0 === 0 && b1 === 0 && b2 === 0 && b3 === 0)) {
      details.push(`Critical SSRF risk: URL targets local loopback IP address (${cleanHost}).`);
      return { category: 'LOOPBACK_TARGET', isIp: true, ipVersion: 'IPv4', details };
    }

    // Link-local 169.254.0.0/16
    if (b0 === 169 && b1 === 254) {
      details.push(`High SSRF risk: URL targets link-local network address (${cleanHost}).`);
      return { category: 'PRIVATE_NETWORK_TARGET', isIp: true, ipVersion: 'IPv4', details };
    }

    // Private RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (
      b0 === 10 ||
      (b0 === 172 && b1 >= 16 && b1 <= 31) ||
      (b0 === 192 && b1 === 168)
    ) {
      details.push(`High SSRF risk: URL targets private intranet IP range (${cleanHost}) specified in RFC 1918.`);
      return { category: 'PRIVATE_NETWORK_TARGET', isIp: true, ipVersion: 'IPv4', details };
    }

    // Public IPv4
    details.push(`URL points directly to a raw public IP address (${cleanHost}) instead of a verified registered domain.`);
    return { category: 'PUBLIC_EXTERNAL_HOST', isIp: true, ipVersion: 'IPv4', details };
  }

  // Hex / Octal / Decimal single-integer IP representations (e.g. 0x7f000001, 2130706433, 0177.0.0.1)
  if (/^(?:0x[0-9a-fA-F]+|[0-9]{8,10})$/.test(cleanHost)) {
    details.push(`Evasion indicator: URL uses non-standard numeric or hexadecimal IP representation (${cleanHost}).`);
    return { category: 'LOOPBACK_TARGET', isIp: true, ipVersion: 'IPv4', details };
  }

  // IPv6 inspection
  if (IPV6_REGEX.test(hostname)) {
    const rawIpv6 = cleanHost;

    // Loopback ::1
    if (rawIpv6 === '::1' || rawIpv6 === '0:0:0:0:0:0:0:1') {
      details.push(`Critical SSRF risk: URL targets IPv6 loopback address ([${rawIpv6}]).`);
      return { category: 'LOOPBACK_TARGET', isIp: true, ipVersion: 'IPv6', details };
    }

    // Link-local fe80::/10
    if (rawIpv6.startsWith('fe8') || rawIpv6.startsWith('fe9') || rawIpv6.startsWith('fea') || rawIpv6.startsWith('feb')) {
      details.push(`High SSRF risk: URL targets IPv6 link-local address ([${rawIpv6}]).`);
      return { category: 'PRIVATE_NETWORK_TARGET', isIp: true, ipVersion: 'IPv6', details };
    }

    // Unique Local fc00::/7 (fc.. or fd..)
    if (rawIpv6.startsWith('fc') || rawIpv6.startsWith('fd')) {
      details.push(`High SSRF risk: URL targets IPv6 unique local intranet address ([${rawIpv6}]).`);
      return { category: 'PRIVATE_NETWORK_TARGET', isIp: true, ipVersion: 'IPv6', details };
    }

    // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:192.168.x.x)
    if (rawIpv6.includes('ffff:')) {
      const mappedIpv4 = rawIpv6.split('ffff:')[1];
      if (mappedIpv4 && parseIpv4Octets(mappedIpv4)) {
        return classifyHostSsrfRisk(mappedIpv4, scheme);
      }
    }

    details.push(`URL points to an IPv6 address ([${cleanHost}]).`);
    return { category: 'PUBLIC_EXTERNAL_HOST', isIp: true, ipVersion: 'IPv6', details };
  }

  return { category: 'PUBLIC_EXTERNAL_HOST', isIp: false, ipVersion: null, details };
}

export function inspectUrl(rawUrl: string): UrlInspectionResult {
  const observableEvidence: string[] = [];
  const limitations = [
    'Submitted URL was analyzed statically using structural heuristics and was NEVER visited, resolved via DNS, or fetched to prevent SSRF and tracking.',
    'Fast-flux DNS or short-lived zero-hour phishing domains may shift redirect targets post-inspection.',
    'Analysis does not evaluate dynamic client-side DOM redirection without active execution.'
  ];

  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return {
      url: rawUrl || '',
      normalizedUrl: '',
      scheme: 'invalid',
      hostname: 'empty',
      port: null,
      pathname: '',
      isIpAddress: false,
      ipVersion: null,
      ssrfClassification: 'MALFORMED',
      hasEmbeddedCredentials: false,
      hasUnusualPort: false,
      isLookalikeDomain: false,
      lookalikeTarget: null,
      hasDeceptiveSubdomain: false,
      suspiciousTld: false,
      suspiciousTokens: ['empty_url'],
      reputationCheck: {
        performed: false,
        provider: 'Local Static Heuristic Engine',
        status: 'SUSPICIOUS',
        details: 'Empty or blank URL input provided.'
      },
      observableEvidence: ['URL input was empty.'],
      limitations
    };
  }

  // Check for null bytes or control characters
  if (/[\x00-\x1F\x7F]/.test(rawUrl)) {
    return {
      url: rawUrl,
      normalizedUrl: '',
      scheme: 'invalid',
      hostname: 'malformed',
      port: null,
      pathname: '',
      isIpAddress: false,
      ipVersion: null,
      ssrfClassification: 'MALFORMED',
      hasEmbeddedCredentials: false,
      hasUnusualPort: false,
      isLookalikeDomain: false,
      lookalikeTarget: null,
      hasDeceptiveSubdomain: false,
      suspiciousTld: false,
      suspiciousTokens: ['control_characters_detected'],
      reputationCheck: {
        performed: false,
        provider: 'Local Static Heuristic Engine',
        status: 'MALICIOUS',
        details: 'URL contains illegal control characters or null bytes.'
      },
      observableEvidence: ['URL contains illegal null bytes or ASCII control characters, a typical security exploit indicator.'],
      limitations
    };
  }

  let normalized = rawUrl.trim();

  // Detect raw scheme if present before URL parsing
  const schemeMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  const rawScheme = schemeMatch ? schemeMatch[1].toLowerCase() : null;

  // If missing scheme, prepend https://
  if (!rawScheme) {
    normalized = 'https://' + normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      url: rawUrl,
      normalizedUrl: normalized,
      scheme: rawScheme || 'invalid',
      hostname: 'unparseable',
      port: null,
      pathname: '',
      isIpAddress: false,
      ipVersion: null,
      ssrfClassification: 'MALFORMED',
      hasEmbeddedCredentials: false,
      hasUnusualPort: false,
      isLookalikeDomain: false,
      lookalikeTarget: null,
      hasDeceptiveSubdomain: false,
      suspiciousTld: false,
      suspiciousTokens: ['malformed_url_syntax'],
      reputationCheck: {
        performed: false,
        provider: 'Local Static Heuristic Engine',
        status: 'SUSPICIOUS',
        details: 'URL syntax could not be parsed according to RFC 3986 standard.'
      },
      observableEvidence: ['URL syntax is malformed or uses illegal character sequences.'],
      limitations
    };
  }

  const scheme = parsed.protocol.replace(':', '').toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port || null;
  const pathname = parsed.pathname;

  // SSRF & IP Classification
  const hostClassification = classifyHostSsrfRisk(hostname, scheme);
  const isIpAddress = hostClassification.isIp;
  const ipVersion = hostClassification.ipVersion;
  const ssrfClassification = hostClassification.category;

  observableEvidence.push(...hostClassification.details);

  // Check Scheme
  if (scheme !== 'https') {
    if (scheme === 'http') {
      observableEvidence.push(`Insecure protocol 'http:' used instead of encrypted HTTPS.`);
    } else {
      observableEvidence.push(`Non-standard protocol '${scheme}:' detected.`);
    }
  }

  // Check Embedded Credentials
  const hasEmbeddedCredentials = Boolean(parsed.username || parsed.password);
  if (hasEmbeddedCredentials) {
    observableEvidence.push(`URL embeds explicit user authentication parameters ('${parsed.username}'), an evasion technique.`);
  }

  // Check Unusual Port
  let hasUnusualPort = false;
  if (port) {
    const numPort = parseInt(port, 10);
    if (numPort !== 80 && numPort !== 443) {
      hasUnusualPort = true;
      observableEvidence.push(`URL specifies non-standard web port :${port}. Legitimate banking and institutional portals run on standard HTTPS (443).`);
    }
  }

  // Check TLD
  const domainParts = hostname.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  const suspiciousTld = SUSPICIOUS_TLDS.has(tld);
  if (suspiciousTld) {
    observableEvidence.push(`Domain uses high-abuse top-level domain '.${tld}' frequently associated with throwaway phishing campaigns.`);
  }

  // Deceptive subdomains and lookalikes
  let isLookalikeDomain = false;
  let lookalikeTarget: string | null = null;
  let hasDeceptiveSubdomain = false;
  const suspiciousTokens: string[] = [];

  let dehomoglyphed = hostname;
  for (const [sub, orig] of Object.entries(HOMOGLYPH_MAP)) {
    dehomoglyphed = dehomoglyphed.replaceAll(sub, orig);
  }

  for (const item of HIGH_VALUE_BRANDS) {
    if (hostname === item.legitimateDomain || hostname.endsWith('.' + item.legitimateDomain)) {
      continue;
    }

    if (hostname.includes(item.root) || dehomoglyphed.includes(item.root)) {
      if (domainParts.length >= 3) {
        const registeredDomain = domainParts.slice(-2).join('.');
        if (registeredDomain !== item.legitimateDomain) {
          hasDeceptiveSubdomain = true;
          lookalikeTarget = item.brand;
          observableEvidence.push(`Deceptive subdomain structure: Brand '${item.brand}' appears in subdomain, but actual root destination is '${registeredDomain}'.`);
        }
      }

      if (!hostname.endsWith('.' + item.legitimateDomain) && hostname !== item.legitimateDomain) {
        isLookalikeDomain = true;
        lookalikeTarget = item.brand;
        suspiciousTokens.push(`brand_impersonation_${item.root}`);
        if (!hasDeceptiveSubdomain) {
          observableEvidence.push(`Domain '${hostname}' resembles '${item.brand}' (${item.legitimateDomain}) but is hosted on an unauthorized host.`);
        }
      }
    }
  }

  const pathLower = pathname.toLowerCase();
  const highRiskPathTokens = ['login', 'signin', 'verify', 'update', 'banking', 'secure', 'account', 'auth', 'wallet', 'claim', 'refund', 'invoice'];
  highRiskPathTokens.forEach(token => {
    if (pathLower.includes(token)) {
      suspiciousTokens.push(`path_${token}`);
    }
  });

  return {
    url: rawUrl,
    normalizedUrl: parsed.toString(),
    scheme,
    hostname,
    port,
    pathname,
    isIpAddress,
    ipVersion,
    ssrfClassification,
    hasEmbeddedCredentials,
    hasUnusualPort,
    isLookalikeDomain,
    lookalikeTarget,
    hasDeceptiveSubdomain,
    suspiciousTld,
    suspiciousTokens,
    reputationCheck: {
      performed: false,
      provider: 'Local Static Heuristic Engine (RFC 3986 / Safe-by-Default)',
      status: 'NOT_CONFIGURED',
      details: 'Automated remote HTTP/DNS lookup intentionally avoided to prevent SSRF and tracking. Analysis conducted strictly via local offline structural heuristics.'
    },
    observableEvidence,
    limitations
  };
}
