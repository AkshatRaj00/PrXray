/**
 * PR-XRay: Isolated AST & Thermodynamic Web Worker
 */

import { scanContentEntropy, EntropyFinding } from '../engines/entropyEngine';

export interface ASTWorkerRequest {
  id: string;
  type: 'ANALYZE_FILE';
  payload: {
    filename: string;
    rawDiff: string;
    modifiedCode: string;
  };
}

export interface ASTWorkerResponse {
  id: string;
  success: boolean;
  payload?: {
    filename: string;
    entropyFindings: EntropyFinding[];
    functionMetrics: Array<{
      name: string;
      line: number;
      cyclomaticComplexity: number;
      nestingDepth: number;
    }>;
    peakEntropy: number;
    isHotspotDetected: boolean;
    durationMs: number;
  };
  error?: string;
}

interface WorkerFunctionContext {
  name: string;
  line: number;
  complexity: number;
  depth: number;
}

function analyzeRoutinesInWorker(code: string) {
  const lines = code.split('\n');
  const metrics: Array<{ name: string; line: number; cyclomaticComplexity: number; nestingDepth: number }> = [];
  
  const functionStartRegex = /(?:function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s*)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{)/;
  const decisionRegex = /\b(if|else\s+if|for|while|case|catch)\b|\?|&&|\|\|/g;

  let currentFn: WorkerFunctionContext | null = null;
  let bracketDepth = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const trimmed = lines[idx].trim();

    const fnMatch = trimmed.match(functionStartRegex);
    if (fnMatch) {
      if (currentFn) {
        metrics.push({
          name: currentFn.name,
          line: currentFn.line,
          cyclomaticComplexity: currentFn.complexity,
          nestingDepth: currentFn.depth,
        });
      }

      const fnName = fnMatch[1] || fnMatch[2] || fnMatch[3] || `subroutine_L${lineNum}`;
      currentFn = {
        name: fnName,
        line: lineNum,
        complexity: 1,
        depth: 1,
      };
    }

    if (currentFn) {
      const decisions = (trimmed.match(decisionRegex) || []).length;
      currentFn.complexity += decisions;

      const openBrackets = (trimmed.match(/\{/g) || []).length;
      const closeBrackets = (trimmed.match(/\}/g) || []).length;
      bracketDepth += openBrackets - closeBrackets;

      if (openBrackets > closeBrackets) {
        currentFn.depth = Math.max(currentFn.depth, bracketDepth);
      }

      if (bracketDepth <= 0 && openBrackets === 0 && closeBrackets > 0) {
        metrics.push({
          name: currentFn.name,
          line: currentFn.line,
          cyclomaticComplexity: currentFn.complexity,
          nestingDepth: currentFn.depth,
        });
        currentFn = null;
        bracketDepth = 0;
      }
    }
  }

  if (currentFn) {
    const fn: WorkerFunctionContext = currentFn;
    metrics.push({
      name: fn.name,
      line: fn.line,
      cyclomaticComplexity: fn.complexity,
      nestingDepth: fn.depth,
    });
  }

  return metrics;
}

self.onmessage = async (e: MessageEvent<ASTWorkerRequest>) => {
  const { id, type, payload } = e.data;
  const startTime = performance.now();

  if (type === 'ANALYZE_FILE') {
    try {
      const entropyResult = scanContentEntropy(payload.rawDiff);
      const functionMetrics = analyzeRoutinesInWorker(payload.modifiedCode);

      const isHotspotDetected = functionMetrics.some((m) => m.cyclomaticComplexity > 15);
      const durationMs = Number((performance.now() - startTime).toFixed(2));

      const response: ASTWorkerResponse = {
        id,
        success: true,
        payload: {
          filename: payload.filename,
          entropyFindings: entropyResult.findings,
          functionMetrics,
          peakEntropy: entropyResult.peakEntropy,
          isHotspotDetected,
          durationMs,
        },
      };

      self.postMessage(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown AST worker error';
      self.postMessage({
        id,
        success: false,
        error: message,
      } as ASTWorkerResponse);
    }
  }
};