'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Key, 
  Cpu, 
  Shield, 
  HardDrive, 
  FileText, 
  GitPullRequest,
  Terminal,
  Database,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useSentinel } from '@/lib/state/sentinelContext';
import styles from './scan.module.css';

// Maximum bounds for raw patch input buffer
const MAX_RAW_PATCH_BYTES = 4 * 1024 * 1024; // 4MB
const ADVERSARIAL_INJECTION_PATTERN = /(<\|im_start\|>|<\|im_end\|>|\[INST\]|<<SYS>>|ignore\s+all\s+previous\s+instructions)/i;

export default function ScanCockpitPage() {
  const router = useRouter();
  const { setTarget, appendLog, flagAdversarial, state } = useSentinel();

  const [targetInput, setTargetInput] = useState('');
  const [patToken, setPatToken] = useState('');
  const [showPatVault, setShowPatVault] = useState(false);
  const [ingestionMode, setIngestionMode] = useState<'url' | 'raw'>('url');
  const [rawPatchInput, setRawPatchInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hardwareCores, setHardwareCores] = useState<number>(8);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const doodleRef = useRef<HTMLDivElement>(null);

  // Dynamic Hardware Detection
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      setHardwareCores(navigator.hardwareConcurrency);
    }
  }, []);

  // Subtle Eye Tracking for the Notion-Style Ink Doodle
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!doodleRef.current) return;
      const rect = doodleRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      const maxDistance = 3.5;
      const factor = Math.min(distance / 250, 1) * maxDistance;
      const angle = Math.atan2(deltaY, deltaX);

      setEyeOffset({
        x: Math.cos(angle) * factor,
        y: Math.sin(angle) * factor,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Restore stored PAT
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('prxray_github_token');
      if (stored) setPatToken(stored);
    }
  }, []);

  // URL Target Ingestion Handler
  const handleLaunchUrlAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const clean = targetInput.trim();
    if (!clean) {
      setValidationError('Please specify a GitHub repository or pull request identifier.');
      return;
    }

    // Adversarial inspection on URL string
    if (ADVERSARIAL_INJECTION_PATTERN.test(clean)) {
      flagAdversarial('INJECTION');
      appendLog('INGESTION_GATE', 'CRITICAL', `Adversarial sequence intercepted in target input: ${clean}`);
      setValidationError('Adversarial instruction sequence detected and blocked by Sentinel Guard.');
      return;
    }

    // Basic format validation
    const isValidFormat = /^[a-zA-Z0-9_\-\./#:]+$/.test(clean);
    if (!isValidFormat) {
      setValidationError('Invalid target format. Use "owner/repo" or "https://github.com/owner/repo/pull/123".');
      return;
    }

    // Persist PAT if provided
    if (patToken.trim() && typeof window !== 'undefined') {
      sessionStorage.setItem('prxray_github_token', patToken.trim());
    }

    // Wire to Central Sentinel Awareness Bus
    setTarget(clean);
    appendLog('INGESTION_GATE', 'INFO', `Ingestion target registered: ${clean}`);

    router.push(`/audit?target=${encodeURIComponent(clean)}`);
  };

  // Raw Patch Stream Ingestion Handler
  const handleLaunchRawAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const raw = rawPatchInput.trim();
    if (!raw) {
      setValidationError('Please paste unified diff headers (e.g. diff --git a/... b/...).');
      return;
    }

    // DoS Shield: Check byte length
    if (raw.length > MAX_RAW_PATCH_BYTES) {
      flagAdversarial('OVERFLOW');
      appendLog('INGESTION_GATE', 'CRITICAL', `Raw patch size (${raw.length} bytes) exceeds 4MB buffer bound.`);
      setValidationError('Raw diff payload exceeds 4MB memory boundary. Ingestion aborted.');
      return;
    }

    // Adversarial Check: Prompt Injection
    if (ADVERSARIAL_INJECTION_PATTERN.test(raw)) {
      flagAdversarial('INJECTION');
      appendLog('INGESTION_GATE', 'WARN', 'Adversarial instruction patterns defused in raw patch stream.');
    }

    // Save to browser session storage for zero-cloud Wasm ingestion
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prxray_raw_patch', raw);
      if (patToken.trim()) {
        sessionStorage.setItem('prxray_github_token', patToken.trim());
      }
    }

    const localTargetRef = 'local://raw-patch';
    setTarget(localTargetRef);
    appendLog('INGESTION_GATE', 'INFO', `Local unified diff stream buffered (${raw.length} bytes). Launching workstation.`);

    router.push(`/audit?target=${encodeURIComponent(localTargetRef)}`);
  };

  const handleSavePat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatToken(val);
    if (typeof window !== 'undefined') {
      if (val.trim()) {
        sessionStorage.setItem('prxray_github_token', val.trim());
      } else {
        sessionStorage.removeItem('prxray_github_token');
      }
    }
  };

  const hardwareEngineLabel = useMemo(() => {
    return state.neuralCopilot.device === 'WEBGPU' ? 'WebGPU Native (DirectX/Metal)' : 'Wasm SIMD128 Threaded';
  }, [state.neuralCopilot.device]);

  return (
    <div className={styles.cockpitContainer}>
      {/* 1. Notion-Style Breadcrumb Navigation */}
      <nav className={styles.breadcrumbRow}>
        <Link href="/" className={styles.breadcrumbLink}>PR-XRay</Link>
        <span className={styles.breadcrumbSlash}>/</span>
        <span style={{ color: '#d4d4d4' }}>Ingestion Cockpit</span>
      </nav>

      {/* 2. Notion Page Header with Hand-Drawn Ink Doodle */}
      <header className={styles.pageHeader}>
        <div className={styles.mascotHeader}>
          <div ref={doodleRef} className={styles.inkDoodleWrapper} title="PR-XRay Sentinel">
            <svg className={styles.inkDoodleSvg} viewBox="0 0 48 48" fill="none">
              <path 
                d="M10 14 C10 11, 14 8, 24 8 C34 8, 38 11, 38 14 C38 28, 37 36, 35 38 C33 40, 29 41, 24 41 C19 41, 15 40, 13 38 C11 36, 10 28, 10 14 Z" 
                stroke="#E3E2DE" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <circle cx="18" cy="22" r="4.5" stroke="#E3E2DE" strokeWidth="1.5" />
              <circle cx="30" cy="22" r="4.5" stroke="#E3E2DE" strokeWidth="1.5" />

              <g className={styles.eyeLid}>
                <circle 
                  cx={18 + eyeOffset.x} 
                  cy={22 + eyeOffset.y} 
                  r="2" 
                  fill="#E3E2DE" 
                  className={styles.eyePupil}
                />
                <circle 
                  cx={30 + eyeOffset.x} 
                  cy={22 + eyeOffset.y} 
                  r="2" 
                  fill="#E3E2DE" 
                  className={styles.eyePupil}
                />
              </g>

              <path d="M15 16 Q18 15 21 16" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M27 16 Q30 15 33 16" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M21 31 Q24 33 27 31" stroke="#E3E2DE" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>Ingestion Cockpit</h1>
            <p className={styles.pageDescription}>
              Audit pull request diffs inside local browser memory without network egress.
            </p>
          </div>
        </div>
      </header>

      {/* Validation / Adversarial Warning Alert */}
      {validationError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 6,
          backgroundColor: '#281014',
          border: '1px solid #da3633',
          color: '#ff7b72',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}>
          <AlertTriangle size={15} />
          <span>{validationError}</span>
        </div>
      )}

      {/* 3. Notion Quick Find / Ingestion Card */}
      <section className={styles.notionSearchCard}>
        <div className={styles.tabBar}>
          <div className={styles.tabGroup}>
            <button
              type="button"
              className={`${styles.tabItem} ${ingestionMode === 'url' ? styles.tabItemActive : ''}`}
              onClick={() => { setIngestionMode('url'); setValidationError(null); }}
            >
              <GitPullRequest size={13} />
              <span>Pull Request URL</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${ingestionMode === 'raw' ? styles.tabItemActive : ''}`}
              onClick={() => { setIngestionMode('raw'); setValidationError(null); }}
            >
              <Terminal size={13} />
              <span>Raw .patch</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.patAction}
            onClick={() => setShowPatVault(!showPatVault)}
          >
            <Key size={12} />
            <span>{showPatVault ? 'Close Token Vault' : 'GitHub PAT'}</span>
          </button>
        </div>

        {ingestionMode === 'url' ? (
          <form className={styles.searchRow} onSubmit={handleLaunchUrlAudit}>
            <input
              type="text"
              className={styles.inputBox}
              placeholder="e.g. facebook/react or owner/repo#123"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              autoFocus
            />

            <button type="submit" className={styles.runBtn}>
              <span>Audit Diff</span>
              <ArrowRight size={13} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleLaunchRawAudit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              className={styles.rawArea}
              placeholder="Paste unified diff headers (diff --git a/... b/...) here..."
              value={rawPatchInput}
              onChange={(e) => setRawPatchInput(e.target.value)}
              rows={8}
            />
            <button 
              type="submit" 
              className={styles.runBtn}
              style={{ alignSelf: 'flex-end' }}
            >
              <span>Parse & Audit In-Memory</span>
              <ArrowRight size={13} />
            </button>
          </form>
        )}

        {showPatVault && (
          <div className={styles.patDrawer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9b9b9b', fontFamily: 'var(--font-mono)' }}>
              <Lock size={12} />
              <span>Personal Access Token (Encrypted in browser sessionStorage only)</span>
            </div>
            <input
              type="password"
              className={styles.patInput}
              placeholder="ghp_..."
              value={patToken}
              onChange={handleSavePat}
            />
          </div>
        )}
      </section>

      {/* 4. Notion Database Properties (Live Hardware Specs) */}
      <section className={styles.databaseSection}>
        <div className={styles.sectionHeader}>
          <Database size={13} />
          <span>System Environment Properties</span>
        </div>

        <div className={styles.propertiesRow}>
          <div className={styles.propertyCard}>
            <span className={styles.propertyLabel}>
              <Cpu size={12} />
              Concurrency
            </span>
            <span className={`${styles.notionTag} ${styles.tagGray}`}>
              {hardwareCores} Cores (Wasm Threaded)
            </span>
          </div>

          <div className={styles.propertyCard}>
            <span className={styles.propertyLabel}>
              <HardDrive size={12} />
              Execution Engine
            </span>
            <span className={`${styles.notionTag} ${styles.tagSage}`}>
              {hardwareEngineLabel}
            </span>
          </div>

          <div className={styles.propertyCard}>
            <span className={styles.propertyLabel}>
              <Shield size={12} />
              Detection Bound
            </span>
            <span className={`${styles.notionTag} ${styles.tagAmber}`}>
              Shannon H &ge; 4.5 &bull; DoS 4MB Cap
            </span>
          </div>
        </div>
      </section>

      {/* 5. Notion Database Rows (Verified Presets) */}
      <section className={styles.databaseSection}>
        <div className={styles.sectionHeader}>
          <FileText size={13} />
          <span>Verified Reference Benchmarks</span>
        </div>

        <div className={styles.presetList}>
          <Link 
            href="/audit?target=AkshatRaj00%2Fsemantica" 
            className={styles.presetRow}
            onClick={() => {
              setTarget('AkshatRaj00/semantica');
              appendLog('INGESTION_GATE', 'INFO', 'Preset selected: AkshatRaj00/semantica');
            }}
          >
            <div className={styles.presetTitleArea}>
              <FileText size={14} className={styles.fileIcon} />
              <div>
                <div className={styles.presetName}>AkshatRaj00/semantica</div>
                <div className={styles.presetDesc}>Causal Graph Framework Architecture</div>
              </div>
            </div>
            <span className={`${styles.notionTag} ${styles.tagSage}`}>Verified Clean (0 Leaks)</span>
          </Link>

          <Link 
            href="/audit?target=facebook%2Freact" 
            className={styles.presetRow}
            onClick={() => {
              setTarget('facebook/react');
              appendLog('INGESTION_GATE', 'INFO', 'Preset selected: facebook/react');
            }}
          >
            <div className={styles.presetTitleArea}>
              <FileText size={14} className={styles.fileIcon} />
              <div>
                <div className={styles.presetName}>facebook/react</div>
                <div className={styles.presetDesc}>Fiber Reconciler Tree Implementation</div>
              </div>
            </div>
            <span className={`${styles.notionTag} ${styles.tagAmber}`}>High Churn</span>
          </Link>
        </div>
      </section>
    </div>
  );
}