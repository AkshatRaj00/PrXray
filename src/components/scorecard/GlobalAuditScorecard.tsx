'use client';

import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  FileWarning, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import styles from './GlobalAuditScorecard.module.css';

export interface ScorecardAuditData {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  overallHealthScore: number;
  criticalFindingsCount: number;
  totalHotspots: number;
  averageComplexity: number;
  unsafeFilesCount: number;
  blockMerge: boolean;
}

interface GlobalAuditScorecardProps {
  audit: ScorecardAuditData;
}

export const GlobalAuditScorecard: React.FC<GlobalAuditScorecardProps> = ({ audit }) => {
  const isHealthy = audit.overallHealthScore >= 80;
  const isWarning = audit.overallHealthScore >= 50 && audit.overallHealthScore < 80;

  const scoreColor = isHealthy ? 'var(--color-success)' : isWarning ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className={styles.scorecardRoot}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2 className={styles.mainTitle}>Pull Request Security Scorecard</h2>
          <p className={styles.subTitle}>
            Global scan across all {audit.totalFiles} modified files (+{audit.totalAdditions} / -{audit.totalDeletions} LOC)
          </p>
        </div>

        <div className={`${styles.mergeBadge} ${audit.blockMerge ? styles.badgeBlocked : styles.badgeReady}`}>
          {audit.blockMerge ? (
            <>
              <AlertCircle size={14} />
              <span>MERGE BLOCKED</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              <span>MERGE READY</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {/* Metric 1: Health Score */}
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>PR Health</span>
            <Activity size={14} style={{ color: scoreColor }} />
          </div>
          <div className={styles.metricValue} style={{ color: scoreColor }}>
            {audit.overallHealthScore}%
          </div>
          <p className={styles.metricFoot}>
            {isHealthy ? 'Production Ready' : isWarning ? 'Review Advised' : 'High Threat Density'}
          </p>
        </div>

        {/* Metric 2: Entropy Leaks */}
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Entropy Leaks</span>
            <ShieldAlert size={14} style={{ color: audit.criticalFindingsCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }} />
          </div>
          <div className={styles.metricValue} style={{ color: audit.criticalFindingsCount > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
            {audit.criticalFindingsCount}
          </div>
          <p className={styles.metricFoot}>Shannon key anomalies</p>
        </div>

        {/* Metric 3: Spaghetti Code */}
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Hotspots</span>
            <Cpu size={14} style={{ color: audit.totalHotspots > 0 ? 'var(--color-warning)' : 'var(--color-success)' }} />
          </div>
          <div className={styles.metricValue} style={{ color: audit.totalHotspots > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
            {audit.totalHotspots}
          </div>
          <p className={styles.metricFoot}>M &gt; 15 decision branches</p>
        </div>

        {/* Metric 4: Average Complexity */}
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Avg Complexity</span>
            <Activity size={14} style={{ color: 'var(--color-info)' }} />
          </div>
          <div className={styles.metricValue} style={{ color: 'var(--color-info)' }}>
            {audit.averageComplexity.toFixed(2)}
          </div>
          <p className={styles.metricFoot}>McCabe index / function</p>
        </div>

        {/* Metric 5: Threat Ratio */}
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Threat Ratio</span>
            <FileWarning size={14} style={{ color: audit.unsafeFilesCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }} />
          </div>
          <div className={styles.metricValue} style={{ color: audit.unsafeFilesCount > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
            {audit.unsafeFilesCount}/{audit.totalFiles}
          </div>
          <p className={styles.metricFoot}>Unsafe files flagged</p>
        </div>
      </div>
    </div>
  );
};