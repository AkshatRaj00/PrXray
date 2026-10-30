/**
 * PR-XRay: Enterprise Unified Diff & Adversarial Invariant Parser
 * Hardened against Diff-Bombs, V8 Heap Exhaustion, CRLF Skew, and Prompt Injection Payloads.
 */

export interface AddedLineItem {
  lineNumber: number;
  content: string;
}

export interface ParsedDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
  addedLines: string[];
  deletedLines: string[];
  addedLinesWithNumbers: AddedLineItem[];
}

export interface AdversarialFlags {
  promptInjectionTokensDetected: number;
  nullBytesDetected: boolean;
  isTruncated: boolean;
  rawByteSize: number;
}

export interface ParsedDiffFile {
  filename: string;
  oldFilename?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  language: string;
  originalCode: string;
  modifiedCode: string;
  hunks: ParsedDiffHunk[];
  isBinary: boolean;
  securityFlags: AdversarialFlags;
}

// Hard-caps for browser sandbox resilience
const MAX_DIFF_TOTAL_BYTES = 4 * 1024 * 1024; // 4MB maximum raw diff
const MAX_TOTAL_FILES = 200;                  // Prevent object heap blowup
const MAX_LINES_PER_FILE = 20000;             // Prevent unbounded string joins
const MAX_LINE_CHAR_LENGTH = 4096;            // Strip minified/adversarial mega-lines

// Adversarial prompt injection tokens targeting LLM Copilots
const INJECTION_SIGNATURES = [
  /<\|im_end\|>/gi,
  /<\|im_start\|>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<system>/gi,
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+all\s+prior\s+context/gi,
  /output\s+cwe-none\s+and\s+bypass/gi,
  /eval\(compile\(/gi,
];

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    pyw: 'python',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    css: 'css',
    scss: 'scss',
    html: 'html',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql',
    sol: 'solidity',
    dockerfile: 'dockerfile',
  };
  return langMap[ext] || 'plaintext';
}

function scanForAdversarialInvariants(content: string): { injectionCount: number; hasNull: boolean } {
  let injectionCount = 0;
  const hasNull = content.includes('\0');

  for (const pattern of INJECTION_SIGNATURES) {
    const matches = content.match(pattern);
    if (matches) {
      injectionCount += matches.length;
    }
  }

  return { injectionCount, hasNull };
}

export function parseUnifiedDiff(rawDiff: string): ParsedDiffFile[] {
  if (!rawDiff || typeof rawDiff !== 'string') return [];

  // 1. Boundary Defense: Hard-cap raw string size to guarantee V8 heap stability
  let sanitizedDiff = rawDiff;
  let isDiffTruncated = false;

  if (sanitizedDiff.length > MAX_DIFF_TOTAL_BYTES) {
    sanitizedDiff = sanitizedDiff.substring(0, MAX_DIFF_TOTAL_BYTES);
    isDiffTruncated = true;
    console.warn(`[PR-XRay Sandbox] Diff payload truncated at ${MAX_DIFF_TOTAL_BYTES} bytes to protect V8 heap.`);
  }

  // 2. Normalize CRLF to prevent Shannon entropy and line count skew
  sanitizedDiff = sanitizedDiff.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const files: ParsedDiffFile[] = [];
  const rawFileBlocks = sanitizedDiff.split(/^diff --git /m).filter(Boolean);

  // Clamp maximum processed files
  const safeFileBlocks = rawFileBlocks.slice(0, MAX_TOTAL_FILES);

  for (const block of safeFileBlocks) {
    const lines = block.split('\n');
    let oldFilename = '';
    let newFilename = '';
    let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
    let isBinary = false;

    // Scan headers (first 15 lines max)
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      if (line.startsWith('--- a/')) {
        oldFilename = line.substring(6).trim();
      } else if (line.startsWith('--- /dev/null')) {
        status = 'added';
      } else if (line.startsWith('+++ b/')) {
        newFilename = line.substring(6).trim();
      } else if (line.startsWith('+++ /dev/null')) {
        status = 'deleted';
      } else if (line.startsWith('new file mode')) {
        status = 'added';
      } else if (line.startsWith('deleted file mode')) {
        status = 'deleted';
      } else if (line.startsWith('rename to ')) {
        status = 'renamed';
        newFilename = line.substring(10).trim();
      } else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
        isBinary = true;
      }
    }

    const filename = newFilename || oldFilename || 'unknown.txt';
    const hunks: ParsedDiffHunk[] = [];
    const originalLines: string[] = [];
    const modifiedLines: string[] = [];

    let currentHunk: ParsedDiffHunk | null = null;
    let currentNewLineNumber = 1;
    let linesProcessedCount = 0;
    let fileTruncated = isDiffTruncated;
    let totalInjectionsInFile = 0;
    let nullBytesDetected = false;

    // Fast-path bypass for binary assets
    if (!isBinary) {
      for (const line of lines) {
        if (linesProcessedCount >= MAX_LINES_PER_FILE) {
          fileTruncated = true;
          break;
        }

        // Bound individual line width against buffer injection
        const boundedLine = line.length > MAX_LINE_CHAR_LENGTH 
          ? line.substring(0, MAX_LINE_CHAR_LENGTH) 
          : line;

        // Scan for adversarial tokens
        const advScan = scanForAdversarialInvariants(boundedLine);
        totalInjectionsInFile += advScan.injectionCount;
        if (advScan.hasNull) nullBytesDetected = true;

        if (boundedLine.startsWith('@@ ')) {
          const match = boundedLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
          const oldStart = match ? parseInt(match[1], 10) : 1;
          const oldLines = match && match[2] ? parseInt(match[2], 10) : 1;
          const newStart = match ? parseInt(match[3], 10) : 1;
          const newLinesCount = match && match[4] ? parseInt(match[4], 10) : 1;

          currentNewLineNumber = newStart;

          currentHunk = {
            oldStart,
            oldLines,
            newStart,
            newLines: newLinesCount,
            lines: [],
            addedLines: [],
            deletedLines: [],
            addedLinesWithNumbers: [],
          };
          hunks.push(currentHunk);
          continue;
        }

        if (!currentHunk) continue;

        currentHunk.lines.push(boundedLine);
        linesProcessedCount++;

        if (boundedLine.startsWith('+') && !boundedLine.startsWith('+++')) {
          const content = boundedLine.substring(1);
          currentHunk.addedLines.push(content);
          currentHunk.addedLinesWithNumbers.push({
            lineNumber: currentNewLineNumber,
            content,
          });
          modifiedLines.push(content);
          currentNewLineNumber++;
        } else if (boundedLine.startsWith('-') && !boundedLine.startsWith('---')) {
          const content = boundedLine.substring(1);
          currentHunk.deletedLines.push(content);
          originalLines.push(content);
        } else if (boundedLine.startsWith(' ') || boundedLine === '') {
          const content = boundedLine.startsWith(' ') ? boundedLine.substring(1) : boundedLine;
          originalLines.push(content);
          modifiedLines.push(content);
          currentNewLineNumber++;
        }
      }
    }

    const additions = hunks.reduce((acc, h) => acc + h.addedLines.length, 0);
    const deletions = hunks.reduce((acc, h) => acc + h.deletedLines.length, 0);

    files.push({
      filename,
      oldFilename: oldFilename || undefined,
      status,
      additions,
      deletions,
      language: detectLanguage(filename),
      originalCode: originalLines.join('\n'),
      modifiedCode: modifiedLines.join('\n'),
      hunks,
      isBinary,
      securityFlags: {
        promptInjectionTokensDetected: totalInjectionsInFile,
        nullBytesDetected,
        isTruncated: fileTruncated,
        rawByteSize: block.length,
      },
    });
  }

  return files;
}