'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useMemo, 
  useEffect 
} from 'react';
import { usePathname } from 'next/navigation';

// ==========================================
// 1. Authoritative Domain Types
// ==========================================

export type SentinelRoute = '/' | '/scan' | '/audit' | '/copilot' | 'unknown';

export type GatekeeperStatus = 
  | 'IDLE' 
  | 'INGESTING' 
  | 'EVALUATING' 
  | 'VERIFIED_PASS' 
  | 'MERGE_BLOCKED' 
  | 'ADVERSARIAL_ALERT';

export type HardwareAccelerationUnit = 'WEBGPU' | 'WASM_SIMD' | 'PENDING';

export interface ThreatInvariant {
  id: string;
  filename: string;
  lineNumber: number;
  threatType: 'entropy' | 'sink' | 'hotspot' | 'clean';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  signature: string;
  rawSnippet: string;
  detectedAt: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  source: 'WASM_CORE' | 'AST_SCANNER' | 'NEURAL_COPILOT' | 'INGESTION_GATE';
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  meta?: Record<string, unknown>;
}

export interface NeuralCopilotState {
  device: HardwareAccelerationUnit;
  modelReady: boolean;
  activeTarget: ThreatInvariant | null;
  backgroundPatchQueue: Map<string, string>; // filename -> pre-computed patch
  tokensPerSecond: number;
  totalInferenceCycles: number;
}

export interface SentinelState {
  currentRoute: SentinelRoute;
  targetRepository: string | null;
  targetRef: string | null; // PR number or commit SHA
  gatekeeperStatus: GatekeeperStatus;
  overallHealthScore: number;
  totalFilesAudited: number;
  activeThreat: ThreatInvariant | null;
  threatRegistry: ThreatInvariant[];
  neuralCopilot: NeuralCopilotState;
  telemetryRingBuffer: TelemetryEvent[]; // Max 100 historical logs
  adversarialFlags: {
    promptInjectionBlocked: number;
    heapOverflowSuppressed: number;
    hardGatekeeperEnforced: boolean;
  };
}

// ==========================================
// 2. Action Vectors
// ==========================================

export type SentinelAction =
  | { type: 'SET_ROUTE'; payload: SentinelRoute }
  | { type: 'SET_TARGET'; payload: { repo: string; ref?: string } }
  | { type: 'SET_GATEKEEPER_STATUS'; payload: GatekeeperStatus }
  | { type: 'SET_HEALTH_SCORE'; payload: { score: number; fileCount: number } }
  | { type: 'REGISTER_THREATS'; payload: ThreatInvariant[] }
  | { type: 'SELECT_ACTIVE_THREAT'; payload: ThreatInvariant | null }
  | { type: 'UPDATE_NEURAL_TELEMETRY'; payload: Partial<NeuralCopilotState> }
  | { type: 'CACHE_BACKGROUND_PATCH'; payload: { threatId: string; patch: string } }
  | { type: 'APPEND_TELEMETRY'; payload: Omit<TelemetryEvent, 'id' | 'timestamp'> }
  | { type: 'FLAG_ADVERSARIAL_ATTEMPT'; payload: 'INJECTION' | 'OVERFLOW' }
  | { type: 'RESET_STATE' };

// ==========================================
// 3. Initial Baseline State
// ==========================================

const INITIAL_STATE: SentinelState = {
  currentRoute: '/',
  targetRepository: null,
  targetRef: null,
  gatekeeperStatus: 'IDLE',
  overallHealthScore: 100,
  totalFilesAudited: 0,
  activeThreat: null,
  threatRegistry: [],
  neuralCopilot: {
    device: 'PENDING',
    modelReady: false,
    activeTarget: null,
    backgroundPatchQueue: new Map(),
    tokensPerSecond: 0,
    totalInferenceCycles: 0,
  },
  telemetryRingBuffer: [
    {
      id: 'boot-0',
      timestamp: Date.now(),
      source: 'WASM_CORE',
      level: 'INFO',
      message: 'PR-XRay Sentinel Neural Awareness Bus mounted.',
    },
  ],
  adversarialFlags: {
    promptInjectionBlocked: 0,
    heapOverflowSuppressed: 0,
    hardGatekeeperEnforced: false,
  },
};

const MAX_RING_BUFFER = 100;

// ==========================================
// 4. Deterministic Reducer
// ==========================================

function sentinelReducer(state: SentinelState, action: SentinelAction): SentinelState {
  switch (action.type) {
    case 'SET_ROUTE':
      return { ...state, currentRoute: action.payload };

    case 'SET_TARGET':
      return {
        ...state,
        targetRepository: action.payload.repo,
        targetRef: action.payload.ref || null,
        gatekeeperStatus: 'INGESTING',
      };

    case 'SET_GATEKEEPER_STATUS':
      return { ...state, gatekeeperStatus: action.payload };

    case 'SET_HEALTH_SCORE':
      return {
        ...state,
        overallHealthScore: Math.max(0, Math.min(100, action.payload.score)),
        totalFilesAudited: action.payload.fileCount,
        gatekeeperStatus: action.payload.score < 50 ? 'MERGE_BLOCKED' : 'VERIFIED_PASS',
      };

    case 'REGISTER_THREATS': {
      // Prioritize highest severity threats automatically
      const sorted = [...action.payload].sort((a, b) => {
        const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1 };
        return severityRank[b.severity] - severityRank[a.severity];
      });
      const topThreat = sorted.length > 0 ? sorted[0] : null;

      return {
        ...state,
        threatRegistry: sorted,
        activeThreat: topThreat,
        neuralCopilot: {
          ...state.neuralCopilot,
          activeTarget: topThreat,
        },
      };
    }

    case 'SELECT_ACTIVE_THREAT':
      return {
        ...state,
        activeThreat: action.payload,
        neuralCopilot: {
          ...state.neuralCopilot,
          activeTarget: action.payload,
        },
      };

    case 'UPDATE_NEURAL_TELEMETRY':
      return {
        ...state,
        neuralCopilot: {
          ...state.neuralCopilot,
          ...action.payload,
        },
      };

    case 'CACHE_BACKGROUND_PATCH': {
      const nextQueue = new Map(state.neuralCopilot.backgroundPatchQueue);
      nextQueue.set(action.payload.threatId, action.payload.patch);
      return {
        ...state,
        neuralCopilot: {
          ...state.neuralCopilot,
          backgroundPatchQueue: nextQueue,
        },
      };
    }

    case 'APPEND_TELEMETRY': {
      const entry: TelemetryEvent = {
        ...action.payload,
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      };
      const trimmedBuffer = [entry, ...state.telemetryRingBuffer].slice(0, MAX_RING_BUFFER);
      return { ...state, telemetryRingBuffer: trimmedBuffer };
    }

    case 'FLAG_ADVERSARIAL_ATTEMPT': {
      const isInjection = action.payload === 'INJECTION';
      return {
        ...state,
        gatekeeperStatus: 'ADVERSARIAL_ALERT',
        adversarialFlags: {
          ...state.adversarialFlags,
          promptInjectionBlocked: state.adversarialFlags.promptInjectionBlocked + (isInjection ? 1 : 0),
          heapOverflowSuppressed: state.adversarialFlags.heapOverflowSuppressed + (!isInjection ? 1 : 0),
          hardGatekeeperEnforced: true,
        },
      };
    }

    case 'RESET_STATE':
      return { ...INITIAL_STATE, currentRoute: state.currentRoute };

    default:
      return state;
  }
}

// ==========================================
// 5. Context & Hook Interfaces
// ==========================================

export interface SentinelContextValue {
  state: SentinelState;
  dispatch: React.Dispatch<SentinelAction>;
  setTarget: (repo: string, ref?: string) => void;
  recordAuditCompletion: (score: number, fileCount: number, threats: ThreatInvariant[]) => void;
  selectThreat: (threat: ThreatInvariant | null) => void;
  appendLog: (source: TelemetryEvent['source'], level: TelemetryEvent['level'], message: string, meta?: Record<string, unknown>) => void;
  flagAdversarial: (type: 'INJECTION' | 'OVERFLOW') => void;
  updateNeuralMetrics: (metrics: Partial<NeuralCopilotState>) => void;
}

const SentinelContext = createContext<SentinelContextValue | null>(null);

// ==========================================
// 6. Provider Implementation
// ==========================================

export function SentinelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sentinelReducer, INITIAL_STATE);
  const pathname = usePathname();

  // Route Synchronization Hook
  useEffect(() => {
    let cleanRoute: SentinelRoute = 'unknown';
    if (pathname === '/') cleanRoute = '/';
    else if (pathname?.startsWith('/scan')) cleanRoute = '/scan';
    else if (pathname?.startsWith('/audit')) cleanRoute = '/audit';
    else if (pathname?.startsWith('/copilot')) cleanRoute = '/copilot';

    dispatch({ type: 'SET_ROUTE', payload: cleanRoute });
  }, [pathname]);

  // Hardware Verification Hook
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const unit: HardwareAccelerationUnit = 'gpu' in navigator ? 'WEBGPU' : 'WASM_SIMD';
      dispatch({ type: 'UPDATE_NEURAL_TELEMETRY', payload: { device: unit } });
    }
  }, []);

  const setTarget = useCallback((repo: string, ref?: string) => {
    dispatch({ type: 'SET_TARGET', payload: { repo, ref } });
  }, []);

  const recordAuditCompletion = useCallback((score: number, fileCount: number, threats: ThreatInvariant[]) => {
    dispatch({ type: 'SET_HEALTH_SCORE', payload: { score, fileCount } });
    dispatch({ type: 'REGISTER_THREATS', payload: threats });
  }, []);

  const selectThreat = useCallback((threat: ThreatInvariant | null) => {
    dispatch({ type: 'SELECT_ACTIVE_THREAT', payload: threat });
  }, []);

  const appendLog = useCallback((
    source: TelemetryEvent['source'], 
    level: TelemetryEvent['level'], 
    message: string, 
    meta?: Record<string, unknown>
  ) => {
    dispatch({ type: 'APPEND_TELEMETRY', payload: { source, level, message, meta } });
  }, []);

  const flagAdversarial = useCallback((type: 'INJECTION' | 'OVERFLOW') => {
    dispatch({ type: 'FLAG_ADVERSARIAL_ATTEMPT', payload: type });
  }, []);

  const updateNeuralMetrics = useCallback((metrics: Partial<NeuralCopilotState>) => {
    dispatch({ type: 'UPDATE_NEURAL_TELEMETRY', payload: metrics });
  }, []);

  const contextValue = useMemo<SentinelContextValue>(() => ({
    state,
    dispatch,
    setTarget,
    recordAuditCompletion,
    selectThreat,
    appendLog,
    flagAdversarial,
    updateNeuralMetrics,
  }), [
    state,
    setTarget,
    recordAuditCompletion,
    selectThreat,
    appendLog,
    flagAdversarial,
    updateNeuralMetrics,
  ]);

  return (
    <SentinelContext.Provider value={contextValue}>
      {children}
    </SentinelContext.Provider>
  );
}

// ==========================================
// 7. Client Hook
// ==========================================

export function useSentinel(): SentinelContextValue {
  const ctx = useContext(SentinelContext);
  if (!ctx) {
    throw new Error('useSentinel must be invoked within a <SentinelProvider>');
  }
  return ctx;
}