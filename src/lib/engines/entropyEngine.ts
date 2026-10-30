export interface EntropyLeakFinding {
  lineNumber: number;
  rawToken: string;
  entropy: number;
  severity: 'CRITICAL' | 'WARNING';
  signatureType: string;
}

const ANCHOR_PATTERNS = [
  { type: 'AWS Access Key ID', regex: /\b(AKIA[0-9A-Z]{16})\b/g, minEntropy: 2.8 },
  { type: 'AWS Secret Access Key', regex: /\b([a-zA-Z0-9/+=]{40})\b/g, minEntropy: 4.5 },
  { type: 'GitHub Personal Access Token', regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/g, minEntropy: 3.5 },
  { type: 'GitHub Fine-Grained Token', regex: /\b(github_pat_[0-9a-zA-Z_]{82})\b/g, minEntropy: 3.5 },
  { type: 'Slack Token', regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g, minEntropy: 3.5 },
  { type: 'Stripe API Key', regex: /\b(sk_live_[0-9a-zA-Z]{24})\b/g, minEntropy: 3.2 },
  { type: 'JWT Token Structure', regex: /\b(ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g, minEntropy: 4.2 },
  { type: 'RSA/EC Private Key Header', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, minEntropy: 1.0 },
];

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HEX_DIGEST_REGEX = /^[0-9a-fA-F]{32,64}$/;

export function calculateShannonEntropy(str: string): number {
  if (!str || typeof str !== 'string' || str.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;

  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return parseFloat(entropy.toFixed(3));
}

function isFalsePositiveNoise(token: string): boolean {
  if (UUID_REGEX.test(token)) return true;
  if (HEX_DIGEST_REGEX.test(token)) return true;
  if (/^[0-9a-f]{32,64}$/.test(token)) return true;
  if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(token)) return true;

  const uniqueChars = new Set(token).size;
  if (uniqueChars / token.length < 0.35 && token.length > 20) {
    return true;
  }

  return false;
}

export function scanUnifiedDiffEntropy(addedLines: { lineNumber: number; content: string }[]): EntropyLeakFinding[] {
  const findings: EntropyLeakFinding[] = [];
  if (!Array.isArray(addedLines)) return findings;

  for (const line of addedLines) {
    // Null safety guard
    if (!line || typeof line.content !== 'string') continue;
    const text = line.content;

    // Phase 1: High-Confidence Regex Anchors
    for (const anchor of ANCHOR_PATTERNS) {
      anchor.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = anchor.regex.exec(text)) !== null) {
        const rawToken = match[1] || match[0];
        const entropy = calculateShannonEntropy(rawToken);

        if (entropy >= anchor.minEntropy) {
          findings.push({
            lineNumber: line.lineNumber || 1,
            rawToken: rawToken.length > 28 ? `${rawToken.substring(0, 14)}...${rawToken.substring(rawToken.length - 6)}` : rawToken,
            entropy,
            severity: 'CRITICAL',
            signatureType: anchor.type,
          });
        }
      }
    }

    // Phase 2: Unanchored Shannon Window Scanner
    const rawTokens = text.split(/[\s"'`=,:;(){}\[\]]+/);
    for (const token of rawTokens) {
      const clean = token.trim();
      if (clean.length < 18 || clean.length > 120) continue;
      if (isFalsePositiveNoise(clean)) continue;

      const entropy = calculateShannonEntropy(clean);
      if (entropy >= 4.5) {
        const alreadyFound = findings.some(f => f.lineNumber === line.lineNumber && clean.includes(f.rawToken));
        if (!alreadyFound) {
          findings.push({
            lineNumber: line.lineNumber || 1,
            rawToken: `${clean.substring(0, 10)}...${clean.substring(clean.length - 6)}`,
            entropy,
            severity: 'CRITICAL',
            signatureType: 'High-Entropy Unmasked Secret',
          });
        }
      }
    }
  }

  return findings;
}
// Backward-compatible worker export bindings
export type EntropyFinding = EntropyLeakFinding;

export interface LegacyEntropyScanResult {
  findings: EntropyLeakFinding[];
  peakEntropy: number;
}

export function scanContentEntropy(
  content: string | Array<{ lineNumber: number; content: string }>
): LegacyEntropyScanResult {
  const lines = typeof content === 'string'
    ? content.split('\n').map((c, i) => ({ lineNumber: i + 1, content: c }))
    : content;

  const findings = scanUnifiedDiffEntropy(lines);
  const peakEntropy = findings.reduce((max, f) => Math.max(max, f.entropy), 0);

  return { findings, peakEntropy };
}