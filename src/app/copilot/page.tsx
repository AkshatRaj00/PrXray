'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Terminal, 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  FileCode, 
  Sparkles,
  RefreshCw,
  AlertOctagon,
  Zap,
  RotateCcw
} from 'lucide-react';
import type { AIWorkerRequest, AIWorkerResponse } from '@/lib/workers/aiWorker';
import styles from './copilot.module.css';

interface TelemetryState {
  device: 'webgpu' | 'wasm' | 'detecting';
  status: 'idle' | 'downloading' | 'ready' | 'generating' | 'error';
  progressFile: string;
  progressPercent: number;
  tokensPerSecond: number;
  inferenceTimeMs: number;
}

function CopilotWorkbench() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetParam = searchParams ? searchParams.get('target') || '' : '';
  const fileParam = searchParams ? searchParams.get('file') || 'unknown_target' : 'unknown_target';
  const lineParam = searchParams ? searchParams.get('line') || '1' : '1';
  const threatType = (searchParams ? searchParams.get('type') || 'clean' : 'clean') as 'entropy' | 'hotspot' | 'clean';
  const snippetParam = searchParams ? searchParams.get('snippet') || '' : '';

  const workerRef = useRef<Worker | null>(null);
  const codeAreaRef = useRef<HTMLPreElement | null>(null);
  const streamedBufferRef = useRef<string>('');
  const hasAutoExecutedRef = useRef<boolean>(false);

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    device: 'detecting',
    status: 'idle',
    progressFile: '',
    progressPercent: 0,
    tokensPerSecond: 0,
    inferenceTimeMs: 0,
  });

  const [streamedText, setStreamedText] = useState('');
  const [rootCause, setRootCause] = useState<string>('');
  const [cveRef, setCveRef] = useState<string>('');
  const [finalPatch, setFinalPatch] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState<boolean>(true);

  // Deterministic Bulletproof Return to Audit
  const handleReturnToAudit = useCallback(() => {
    let resolvedTarget = targetParam;
    if (!resolvedTarget && typeof window !== 'undefined') {
      try {
        resolvedTarget = sessionStorage.getItem('pr_xray_last_target') || '';
      } catch {
        resolvedTarget = '';
      }
    }
    if (resolvedTarget) {
      router.replace(`/audit?target=${encodeURIComponent(resolvedTarget)}`);
    } else {
      router.replace('/scan');
    }
  }, [targetParam, router]);

  // Execute synthesis action
  const executeSynthesis = useCallback(() => {
    if (!workerRef.current) return;

    streamedBufferRef.current = '';
    setStreamedText('');
    setRootCause('');
    setCveRef('');
    setFinalPatch('');
    setRuntimeError(null);

    setTelemetry((prev) => ({ ...prev, status: 'generating' }));

    const reqId = `synth-${Date.now()}`;
    workerRef.current.postMessage({
      id: reqId,
      type: 'GENERATE_PATCH',
      payload: {
        filename: fileParam,
        line: parseInt(lineParam, 10),
        threatType,
        codeSnippet: snippetParam || `// Context block target at line ${lineParam}`,
      },
    } as AIWorkerRequest);
  }, [fileParam, lineParam, threatType, snippetParam]);

  // Auto-scroll stream terminal
  useEffect(() => {
    if (codeAreaRef.current) {
      codeAreaRef.current.scrollTop = codeAreaRef.current.scrollHeight;
    }
  }, [streamedText]);

  // Dedicated Worker Lifecycle
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setTelemetry((prev) => ({
        ...prev,
        device: 'gpu' in navigator ? 'webgpu' : 'wasm',
      }));
    }

    const worker = new Worker(new URL('@/lib/workers/aiWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<AIWorkerResponse>) => {
      const res = e.data;

      if (res.type === 'PROGRESS' && res.progress) {
        setTelemetry((prev) => ({
          ...prev,
          status: 'downloading',
          progressFile: res.progress?.file || 'weights.onnx',
          progressPercent: res.progress?.percent || 0,
        }));
      }

      if (res.type === 'TOKEN_STREAM' && res.payload?.token) {
        streamedBufferRef.current += res.payload.token;
        setStreamedText(streamedBufferRef.current);
      }

      if (res.type === 'COMPLETE' && res.payload) {
        setTelemetry((prev) => ({
          ...prev,
          status: 'ready',
          inferenceTimeMs: res.payload!.inferenceTimeMs,
          tokensPerSecond: res.payload!.tokensPerSecond || 0,
        }));

        setRootCause(res.payload.rootCause);
        setCveRef(res.payload.cveRef);
        setFinalPatch(res.payload.patch || streamedBufferRef.current);
      }

      if (res.type === 'ERROR') {
        setTelemetry((prev) => ({ ...prev, status: 'error' }));
        setRuntimeError(res.error || 'Neural synthesis failed.');
      }
    };

    // Pre-warm and trigger automatic synthesis
    worker.postMessage({
      id: 'init-ping',
      type: 'INIT_MODEL',
      payload: {
        filename: fileParam,
        line: parseInt(lineParam, 10),
        threatType,
        codeSnippet: snippetParam,
      },
    } as AIWorkerRequest);

    // Automation: Auto-execute once pipeline initializes
    const autoTimer = setTimeout(() => {
      if (!hasAutoExecutedRef.current && autoMode) {
        hasAutoExecutedRef.current = true;
        executeSynthesis();
      }
    }, 400);

    return () => {
      clearTimeout(autoTimer);
      worker.terminate();
    };
  }, [fileParam, lineParam, threatType, snippetParam, autoMode, executeSynthesis]);

  const handleCopy = () => {
    const textToCopy = finalPatch || streamedText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.copilotContainer}>
      {/* 1. Header Bar: Responsive Nav */}
      <div className={styles.copilotHeaderBar}>
        <div className={styles.headerLeft}>
          <div className={styles.brandIcon}>
            <Terminal size={18} />
          </div>
          <div className={styles.headerMeta}>
            <h1 className={styles.headerTitle}>
              Neural Remediation Copilot
              <span className={styles.modelBadge}>
                {telemetry.device === 'webgpu' ? 'WebGPU Acceleration' : 'Wasm SIMD'}
              </span>
            </h1>
            <span className={styles.targetBreadcrumb}>
              Target: <strong>{fileParam}</strong> : L{lineParam} ({threatType.toUpperCase()})
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button 
            type="button"
            onClick={handleReturnToAudit}
            className={styles.backBtn}
            title="Return to Audit Workspace"
          >
            <ArrowLeft size={14} />
            <span>Return to Audit</span>
          </button>
        </div>
      </div>

      {/* 2. Hardware Engine Telemetry Strip */}
      <div className={styles.telemetryStrip}>
        <div className={styles.telemetryItem}>
          <Cpu size={13} style={{ color: '#58a6ff' }} />
          <span>Engine:</span>
          <strong>{telemetry.device.toUpperCase()}</strong>
        </div>

        <div className={styles.telemetryItem}>
          <Activity size={13} style={{ color: '#3fb950' }} />
          <span>Throughput:</span>
          <strong>{telemetry.tokensPerSecond > 0 ? `${telemetry.tokensPerSecond} t/s` : 'Standby'}</strong>
        </div>

        <div className={styles.telemetryItem}>
          <RefreshCw size={13} style={{ color: '#d29922' }} />
          <span>Latency:</span>
          <strong>{telemetry.inferenceTimeMs > 0 ? `${telemetry.inferenceTimeMs} ms` : '0 ms'}</strong>
        </div>

        <div className={styles.telemetryItem} style={{ marginLeft: 'auto' }}>
          <span className={styles.statusIndicator}>
            {telemetry.status === 'downloading' && `Downloading Weights: ${telemetry.progressPercent}%`}
            {telemetry.status === 'generating' && 'Executing Local Neural Inference...'}
            {telemetry.status === 'ready' && 'Synthesis Ready'}
            {telemetry.status === 'idle' && 'Initializing Pipeline...'}
            {telemetry.status === 'error' && 'Execution Fault'}
          </span>
        </div>
      </div>

      {/* Download Progress Bar */}
      {telemetry.status === 'downloading' && (
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${telemetry.progressPercent}%` }} 
          />
        </div>
      )}

      {/* Runtime Exception Alert */}
      {runtimeError && (
        <div className={styles.errorAlert}>
          <AlertOctagon size={16} />
          <span>{runtimeError}</span>
        </div>
      )}

      {/* 3. Responsive Workbench Core Grid */}
      <div className={styles.remediationGrid}>
        {/* Left Column: Diagnostics & Root-Cause */}
        <div className={styles.contextCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.cardSectionTitle}>
              <ShieldAlert size={14} style={{ color: threatType === 'clean' ? '#3fb950' : 'var(--color-warning, #d29922)' }} />
              Vulnerability Invariant
            </h2>
            <button 
              type="button" 
              className={styles.modeToggle} 
              onClick={() => setAutoMode(!autoMode)}
              title="Toggle Auto-Synthesis on mount"
            >
              <Zap size={11} style={{ color: autoMode ? '#3fb950' : '#8b949e' }} />
              <span>Auto: {autoMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className={`${styles.threatPill} ${threatType === 'clean' ? styles.threatClean : styles.threatWarn}`}>
            {threatType === 'entropy' && 'Shannon Entropy Anomaly (Hardcoded Secret)'}
            {threatType === 'hotspot' && 'McCabe Cyclomatic Complexity Hotspot'}
            {threatType === 'clean' && 'Structural Baseline Intact (Clean)'}
          </div>

          <pre className={styles.codeSnippetPreview}>
            <code>{snippetParam || `Target File: ${fileParam}\nInspection Line: ${lineParam}`}</code>
          </pre>

          <button
            type="button"
            className={styles.synthesizeBtn}
            onClick={executeSynthesis}
            disabled={telemetry.status === 'generating' || telemetry.status === 'downloading'}
          >
            {telemetry.status === 'generating' ? (
              <>
                <RefreshCw size={14} className={styles.spinIcon} />
                <span>Computing In-VRAM...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Re-Synthesize Remediation</span>
              </>
            )}
          </button>

          {rootCause && (
            <div className={styles.causeBox}>
              <h3 className={styles.cardSectionTitle}>
                <ShieldCheck size={13} style={{ color: '#3fb950' }} />
                Root-Cause Diagnostic
              </h3>
              <p className={styles.causeText}>{rootCause}</p>
              <div className={styles.cveBadge}>
                <span>{cveRef || 'CWE Security Invariant'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Patch Output & Stream Terminal */}
        <div className={styles.patchCard}>
          <div className={styles.patchHeaderRow}>
            <h2 className={styles.cardSectionTitle}>
              <FileCode size={14} style={{ color: '#3fb950' }} />
              Deterministic Code Remediation
            </h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(finalPatch || streamedText) && (
                <button type="button" className={styles.copyBtn} onClick={handleCopy}>
                  {copied ? <Check size={13} style={{ color: '#3fb950' }} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy Remediation'}</span>
                </button>
              )}
              <button 
                type="button" 
                className={styles.iconActionBtn} 
                onClick={executeSynthesis}
                title="Regenerate Patch"
                disabled={telemetry.status === 'generating'}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          <pre ref={codeAreaRef} className={styles.codeArea}>
            <code>
              {finalPatch || streamedText || (
                <span style={{ color: '#8b949e' }}>
                  {telemetry.status === 'generating' 
                    ? '// Autoregressive token stream starting...' 
                    : '// Remediation patch will stream here directly from local GPU/SIMD.'}
                </span>
              )}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={
      <div className={styles.copilotContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#8b949e', fontFamily: 'monospace' }}>
          INITIALIZING NEURAL RUNTIME...
        </div>
      </div>
    }>
      <CopilotWorkbench />
    </Suspense>
  );
}