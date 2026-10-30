export interface FunctionComplexityMetric {
  name: string;
  line: number;
  cyclomaticComplexity: number;
  status: 'OPTIMAL' | 'COMPLEX' | 'HOTSPOT';
}

export interface DeltaComplexityResult {
  addedDecisionPoints: number;
  removedDecisionPoints: number;
  deltaM: number;
  peakComplexity: number;
  functionMetrics: FunctionComplexityMetric[];
  requiresRefactor: boolean;
}

// Language agnostic control-flow branch tokens
const BRANCH_TOKENS = [
  /\bif\b/g,
  /\belse\s+if\b/g,
  /\belif\b/g,
  /\bfor\b/g,
  /\bwhile\b/g,
  /\bcase\b/g,
  /\bcatch\b/g,
  /&&/g,
  /\|\|/g,
  /\?\?/g,
  /\?[^:]+:/g, // Ternary
];

function countDecisions(text: string): number {
  let count = 0;
  for (const tokenRegex of BRANCH_TOKENS) {
    tokenRegex.lastIndex = 0;
    const matches = text.match(tokenRegex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Calculates deterministic McCabe Cyclomatic Delta (Delta M = M_new - M_old)
 */
export function calculateDeltaComplexity(
  originalCode: string,
  modifiedCode: string,
  addedLines: string[],
  deletedLines: string[]
): DeltaComplexityResult {
  let addedPoints = 0;
  for (const line of addedLines) {
    addedPoints += countDecisions(line);
  }

  let removedPoints = 0;
  for (const line of deletedLines) {
    removedPoints += countDecisions(line);
  }

  const deltaM = addedPoints - removedPoints;

  // Function boundaries heuristic parsing
  const functionMetrics: FunctionComplexityMetric[] = [];
  const lines = modifiedCode.split('\n');

  let currentFnName = 'anonymous_block';
  let currentFnLine = 1;
  let currentFnScore = 1;

  const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>|def\s+([a-zA-Z0-9_]+)\s*\(|func\s+(?:\([^)]+\)\s*)?([a-zA-Z0-9_]+)\s*\()/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(fnRegex);

    if (match) {
      if (currentFnScore > 1) {
        functionMetrics.push({
          name: currentFnName,
          line: currentFnLine,
          cyclomaticComplexity: currentFnScore,
          status: currentFnScore > 15 ? 'HOTSPOT' : currentFnScore > 8 ? 'COMPLEX' : 'OPTIMAL',
        });
      }
      currentFnName = match[1] || match[2] || match[3] || match[4] || 'anonymous';
      currentFnLine = i + 1;
      currentFnScore = 1;
    }

    currentFnScore += countDecisions(line);
  }

  if (currentFnScore > 1 || functionMetrics.length === 0) {
    functionMetrics.push({
      name: currentFnName,
      line: currentFnLine,
      cyclomaticComplexity: currentFnScore,
      status: currentFnScore > 15 ? 'HOTSPOT' : currentFnScore > 8 ? 'COMPLEX' : 'OPTIMAL',
    });
  }

  const peakComplexity = functionMetrics.reduce((max, f) => Math.max(max, f.cyclomaticComplexity), 1);

  return {
    addedDecisionPoints: addedPoints,
    removedDecisionPoints: removedPoints,
    deltaM,
    peakComplexity,
    functionMetrics,
    requiresRefactor: deltaM > 8 || peakComplexity > 20,
  };
}