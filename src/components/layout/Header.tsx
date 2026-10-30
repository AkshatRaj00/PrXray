'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { GitPullRequest, ArrowRight } from 'lucide-react';
import { useSentinel } from '@/lib/state/sentinelContext';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { state } = useSentinel();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const engineStatusLabel = useMemo(() => {
    if (!mounted) return 'Local Engine: Ready';
    if (state.neuralCopilot.device === 'WEBGPU') {
      return 'Local Engine: Ready (WebGPU)';
    }
    if (state.neuralCopilot.device === 'WASM_SIMD') {
      return 'Local Engine: Ready (Wasm SIMD)';
    }
    return 'Local Engine: Ready';
  }, [mounted, state.neuralCopilot.device]);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink}>
        <div className={styles.logoIcon}>
          <GitPullRequest size={16} />
        </div>
        <div className={styles.brandMeta}>
          <div className={styles.brandRow}>
            <span className={styles.brandTitle}>PR-XRay</span>
            <span className={styles.versionTag}>v1.0.0-Frontier</span>
          </div>
          <span className={styles.brandSubtitle}>Zero-Cloud Client Gatekeeper</span>
        </div>
      </Link>

      <nav className={styles.rightNav}>
        <div className={styles.statusIndicator}>
          <span 
            className={styles.statusDot} 
            style={{ 
              backgroundColor: mounted && state.gatekeeperStatus === 'ADVERSARIAL_ALERT' ? '#f85149' : '#3fb950',
              boxShadow: mounted && state.gatekeeperStatus === 'ADVERSARIAL_ALERT' ? '0 0 8px rgba(248, 81, 73, 0.4)' : '0 0 8px rgba(63, 185, 80, 0.4)'
            }} 
          />
          <span>{engineStatusLabel}</span>
        </div>

        <Link href="/scan" className={styles.cockpitBtn}>
          <span>Launch Cockpit</span>
          <ArrowRight size={13} />
        </Link>
      </nav>
    </header>
  );
};