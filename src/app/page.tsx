'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowRight, 
  Terminal, 
  Cpu, 
  Activity, 
  Lock, 
  Binary, 
  Radio, 
  Workflow,
  Sparkles,
  AlertTriangle,
  Code2,
  CheckCircle2
} from 'lucide-react';
import styles from './page.module.css';

// Notion-Style Verb Sequence
const VERB_STATES = [
  { text: '• Intercept', style: styles.morphRose },
  { text: '• Audit', style: styles.morphCyan },
  { text: '• Remediate', style: styles.morphAmber },
  { text: '• Hard-Gate', style: styles.morphEmerald },
];

export default function HomePage() {
  const [verbIndex, setVerbIndex] = useState(0);

  // Auto-flip Notion-style verb every 2.4s
  useEffect(() => {
    const timer = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % VERB_STATES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const activeVerb = VERB_STATES[verbIndex];

  return (
    <div className={styles.homeContainer}>
      {/* 1. Hero Section with Notion-Style Morphing Headline */}
      <section className={styles.heroSection}>
        <div className={styles.airgapPill}>
          <span className={styles.pulseDot} />
          <span>ZERO-CLOUD AIR-GAPPED CODE INTELLIGENCE</span>
        </div>

        <h1 className={styles.heroHeading}>
          <span>Pre-Flight Security Radar to</span>
          <div className={styles.headingRow}>
            <span key={activeVerb.text} className={`${styles.morphPill} ${activeVerb.style}`}>
              {activeVerb.text}
            </span>
            <span>Pull Requests.</span>
          </div>
        </h1>

        <p className={styles.heroSubtitle}>
          Audit pull request diffs directly inside your browser memory. Native C++20 WebAssembly AST parsing, thermodynamic Shannon entropy leak detection, and deterministic McCabe complexity without sending a single byte of code to external servers.
        </p>

        <div className={styles.ctaButtonGroup}>
          <Link href="/scan" className={styles.primaryCta}>
            <span>Launch Ingestion Cockpit</span>
            <ArrowRight size={14} />
          </Link>

          <Link 
            href="/audit?target=AkshatRaj00%2Fsemantica" 
            className={styles.secondaryCta}
          >
            <Terminal size={14} />
            <span>View Demo Benchmark</span>
          </Link>
        </div>
      </section>

      {/* 2. Notion-Style Live Simulated Code Review Workbench */}
      <div className={styles.liveSandboxBoard}>
        <div className={styles.laserLine} />
        <div className={styles.sandboxTopBar}>
          <div className={styles.windowControls}>
            <div className={styles.windowDot} style={{ backgroundColor: '#f85149' }} />
            <div className={styles.windowDot} style={{ backgroundColor: '#e3b341' }} />
            <div className={styles.windowDot} style={{ backgroundColor: '#238636' }} />
          </div>
          <div className={styles.sandboxMeta}>
            <span style={{ color: 'var(--text-secondary)' }}>auth_service.py</span>
            <span style={{ color: '#58a6ff' }}>diff: +14 / -2</span>
            <span style={{ color: '#3fb950', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className={styles.pulseDot} />
              Wasm Engine: Active
            </span>
          </div>
        </div>

        <div className={styles.sandboxSplit}>
          {/* Simulated Code Diff */}
          <div className={styles.codeDiffViewer}>
            <div className={styles.diffLine}>
              <span style={{ color: '#484f58' }}>14</span>
              <span>&nbsp;&nbsp;def initialize_session(user_id: str):</span>
            </div>
            <div className={styles.diffLine}>
              <span style={{ color: '#484f58' }}>15</span>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;client = create_gateway_client()</span>
            </div>
            <div className={`${styles.diffLine} ${styles.diffDanger}`}>
              <span style={{ color: '#f85149' }}>16 +</span>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;aws_key = &quot;AKIAIOSFODNN7EXAMPLE&quot;&nbsp;&nbsp; # [FLAGGED]</span>
            </div>
            <div className={`${styles.diffLine} ${styles.diffAdded}`}>
              <span style={{ color: '#3fb950' }}>17 +</span>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;auth_token = os.getenv(&quot;SYSTEM_AUTH_KEY&quot;)</span>
            </div>
            <div className={styles.diffLine}>
              <span style={{ color: '#484f58' }}>18</span>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;return client.authorize(token=auth_token)</span>
            </div>
          </div>

          {/* Live Side Inspector Activity */}
          <div className={styles.sideInspector}>
            <div className={styles.inspectorCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  SHANNON ENTROPY
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f85149', fontWeight: 700 }}>
                  5.18 H (LEAK)
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Pattern matches AWS API Credential structure.
              </span>
            </div>

            <div className={styles.inspectorCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ON-DEVICE COPILOT
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3fb950', fontWeight: 700 }}>
                  PATCH READY
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Extracted to runtime environment variable.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24x7 Continuous Breaking-News Style Telemetry Marquee Ticker */}
      <div className={styles.tickerViewport}>
        <div className={styles.tickerRail}>
          {/* Segment A */}
          <div className={styles.tickerSegment}>
            <span className={styles.tickerItem}>
              <span className={styles.pulseDot} />
              <span>WASM CORE: <strong>NATIVE C++20 ACTIVE</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Cpu size={12} style={{ color: 'var(--color-info)' }} />
              <span>ALLOCATED WORKERS: <strong>HARDWARE CALIBRATED</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Lock size={12} style={{ color: 'var(--color-success)' }} />
              <span>AIR-GAP ISOLATION: <strong>0 BYTES OUTBOUND</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Activity size={12} style={{ color: '#d29922' }} />
              <span>ENTROPY SCANNER: <strong>SHANNON $H_0 \ge 4.5$ BOUNDS</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Binary size={12} style={{ color: 'var(--color-info)' }} />
              <span>AST CFG ENGINE: <strong>McCABE $M = E - V + 2P$</strong></span>
            </span>
          </div>

          {/* Segment B (Seamless Infinite Loop Mirror) */}
          <div className={styles.tickerSegment}>
            <span className={styles.tickerItem}>
              <span className={styles.pulseDot} />
              <span>WASM CORE: <strong>NATIVE C++20 ACTIVE</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Cpu size={12} style={{ color: 'var(--color-info)' }} />
              <span>ALLOCATED WORKERS: <strong>HARDWARE CALIBRATED</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Lock size={12} style={{ color: 'var(--color-success)' }} />
              <span>AIR-GAP ISOLATION: <strong>0 BYTES OUTBOUND</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Activity size={12} style={{ color: '#d29922' }} />
              <span>ENTROPY SCANNER: <strong>SHANNON $H_0 \ge 4.5$ BOUNDS</strong></span>
            </span>
            <span className={styles.tickerItem}>
              <Binary size={12} style={{ color: 'var(--color-info)' }} />
              <span>AST CFG ENGINE: <strong>McCABE $M = E - V + 2P$</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Three Motion Containers (Live SVG Visual Generators) */}
      <section className={styles.motionGrid}>
        {/* Card 1: Shannon Secret Radar */}
        <div className={styles.motionCard}>
          <div className={styles.visualStage}>
            <svg className={styles.radarGraphic} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#21262d" strokeWidth="1" />
              <circle cx="60" cy="60" r="34" fill="none" stroke="#21262d" strokeWidth="1" />
              <circle cx="60" cy="60" r="18" fill="none" stroke="#21262d" strokeWidth="1" />
              <line x1="10" y1="60" x2="110" y2="60" stroke="#21262d" strokeWidth="1" />
              <line x1="60" y1="10" x2="60" y2="110" stroke="#21262d" strokeWidth="1" />

              <g className={styles.radarSweepHand}>
                <line x1="60" y1="60" x2="60" y2="10" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" />
                <path d="M 60 60 L 60 10 A 50 50 0 0 1 100 30 Z" fill="rgba(63, 185, 80, 0.15)" />
              </g>

              <circle cx="78" cy="35" r="3" fill="#f85149" className={styles.radarBlip1} />
              <circle cx="42" cy="74" r="2.5" fill="#e3b341" className={styles.radarBlip2} />
              <circle cx="60" cy="60" r="3" fill="#3fb950" />
            </svg>
          </div>

          <div className={styles.cardMeta}>
            <div className={styles.cardHeader}>
              <Radio size={13} style={{ color: '#f85149' }} />
              <span>Entropy Engine</span>
            </div>
            <h3 className={styles.cardTitle}>Shannon Secret Radar</h3>
            <p className={styles.cardDescription}>
              Computes thermodynamic information entropy across modified tokens to unmask hardcoded keys, JWTs, and AWS tokens before commits reach origin.
            </p>
          </div>
        </div>

        {/* Card 2: McCabe Decision AST */}
        <div className={styles.motionCard}>
          <div className={styles.visualStage}>
            <svg className={styles.astGraphic} viewBox="0 0 180 120">
              <line x1="90" y1="20" x2="45" y2="60" stroke="#58a6ff" strokeWidth="1.5" className={styles.astEdge} />
              <line x1="90" y1="20" x2="135" y2="60" stroke="#58a6ff" strokeWidth="1.5" className={styles.astEdge} />
              <line x1="45" y1="60" x2="25" y2="100" stroke="#30363d" strokeWidth="1.5" />
              <line x1="45" y1="60" x2="65" y2="100" stroke="#58a6ff" strokeWidth="1.5" className={styles.astEdge} />
              <line x1="135" y1="60" x2="115" y2="100" stroke="#58a6ff" strokeWidth="1.5" className={styles.astEdge} />
              <line x1="135" y1="60" x2="155" y2="100" stroke="#30363d" strokeWidth="1.5" />

              <circle cx="90" cy="20" r="5" fill="#58a6ff" className={styles.astNodePulse} />
              <circle cx="45" cy="60" r="4" fill="#79c0ff" />
              <circle cx="135" cy="60" r="4" fill="#79c0ff" />
              <circle cx="25" cy="100" r="3" fill="#8b949e" />
              <circle cx="65" cy="100" r="3.5" fill="#3fb950" />
              <circle cx="115" cy="100" r="3.5" fill="#3fb950" />
              <circle cx="155" cy="100" r="3.5" fill="#8b949e" />
            </svg>
          </div>

          <div className={styles.cardMeta}>
            <div className={styles.cardHeader}>
              <Binary size={13} style={{ color: 'var(--color-info)' }} />
              <span>WASM Graph Core</span>
            </div>
            <h3 className={styles.cardTitle}>McCabe Decision AST</h3>
            <p className={styles.cardDescription}>
              Traverses control-flow graphs in C++20 WebAssembly to calculate cyclomatic cycle spaces, isolating spaghetti nesting and unreachable branches.
            </p>
          </div>
        </div>

        {/* Card 3: Zero-Cloud Compliance */}
        <div className={styles.motionCard}>
          <div className={styles.visualStage}>
            <div className={styles.shieldGraphic}>
              <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
                <circle 
                  cx="60" 
                  cy="60" 
                  r="48" 
                  fill="none" 
                  stroke="rgba(63, 185, 80, 0.4)" 
                  strokeWidth="1.5" 
                  strokeDasharray="12 8" 
                  className={styles.shieldOrbitRing} 
                />
                <circle cx="60" cy="60" r="38" fill="none" stroke="#21262d" strokeWidth="1" />
              </svg>

              <div className={styles.shieldCorePulse} style={{ position: 'absolute' }}>
                <ShieldCheck size={42} style={{ color: '#3fb950' }} />
              </div>
            </div>
          </div>

          <div className={styles.cardMeta}>
            <div className={styles.cardHeader}>
              <Lock size={13} style={{ color: 'var(--color-success)' }} />
              <span>Air-Gapped Privacy</span>
            </div>
            <h3 className={styles.cardTitle}>Zero-Cloud Compliance</h3>
            <p className={styles.cardDescription}>
              Proprietary code never leaves your local hardware. No remote API gateways, no external LLM data leaks, and zero network telemetry during execution.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Deterministic Verification Pipeline Matrix */}
      <section className={styles.pipelineSection}>
        <div className={styles.pipelineHeader}>
          <h2 className={styles.pipelineTitle}>
            <Workflow size={16} style={{ color: 'var(--color-info)' }} />
            <span>Deterministic Verification Pipeline Matrix</span>
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-success)' }}>
            ● PIPELINE VERIFIED (V8 BOUND)
          </span>
        </div>

        <div className={styles.pipelineFlowRow}>
          <div className={styles.pipelineNode}>
            <span className={styles.nodeNumber}>STAGE 01</span>
            <h4 className={styles.nodeTitle}>Diff Stream Ingestion</h4>
            <p className={styles.nodeDetails}>
              GitHub REST or raw git diffs ingested directly into browser memory buffers.
            </p>
            <div className={styles.nodeStatusBar} />
          </div>

          <div className={styles.pipelineNode}>
            <span className={styles.nodeNumber}>STAGE 02</span>
            <h4 className={styles.nodeTitle}>WASM AST Compiler</h4>
            <p className={styles.nodeDetails}>
              C++20 SIMD128 binaries construct control-flow graphs in parallel Web Workers.
            </p>
            <div className={styles.nodeStatusBar} />
          </div>

          <div className={styles.pipelineNode}>
            <span className={styles.nodeNumber}>STAGE 03</span>
            <h4 className={styles.nodeTitle}>Thermodynamic Shannon</h4>
            <p className={styles.nodeDetails}>
              Markov-chain byte distribution models flag unmasked cryptographic patterns.
            </p>
            <div className={styles.nodeStatusBar} />
          </div>

          <div className={styles.pipelineNode}>
            <span className={styles.nodeNumber}>STAGE 04</span>
            <h4 className={styles.nodeTitle}>Gatekeeper Verdict</h4>
            <p className={styles.nodeDetails}>
              Automated Merge Block enforcement or 1-click verified GitHub Markdown review.
            </p>
            <div className={styles.nodeStatusBar} />
          </div>
        </div>
      </section>
    </div>
  );
}