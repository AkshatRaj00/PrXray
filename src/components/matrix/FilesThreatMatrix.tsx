'use client';

import React from 'react';
import { 
  FileCode, 
  ShieldAlert, 
  Cpu, 
  CheckCircle 
} from 'lucide-react';
import styles from './FilesThreatMatrix.module.css';

export interface FileAuditSummary {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  criticalEntropyLeaks: number;
  hotspotsCount: number;
  complexityScore: number;
  isSafe: boolean;
}

interface FilesThreatMatrixProps {
  files: FileAuditSummary[];
  activeFilename: string;
  onSelectFile: (filename: string) => void;
}

export const FilesThreatMatrix: React.FC<FilesThreatMatrixProps> = ({
  files,
  activeFilename,
  onSelectFile,
}) => {
  return (
    <div className={styles.matrixRoot}>
      <div className={styles.matrixHeader}>
        <div className={styles.titleArea}>
          <FileCode size={14} style={{ color: 'var(--text-secondary)' }} />
          <h3 className={styles.matrixTitle}>Modified File Matrix</h3>
          <span className={styles.countBadge}>{files.length} Files</span>
        </div>

        <div className={styles.legendArea}>
          <div className={styles.legendItem}>
            <span className={styles.dotDanger} />
            <span>Entropy Secret Leak</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotWarning} />
            <span>Spaghetti Hotspot</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotClean} />
            <span>Verified Clean</span>
          </div>
        </div>
      </div>

      <div className={styles.gridScroll}>
        {files.map((file) => {
          const isSelected = file.filename === activeFilename;
          const statusClass =
            file.status === 'added'
              ? styles.tagAdded
              : file.status === 'deleted'
              ? styles.tagDeleted
              : styles.tagModified;

          return (
            <button
              key={file.filename}
              type="button"
              className={`${styles.fileChip} ${isSelected ? styles.chipSelected : ''}`}
              onClick={() => onSelectFile(file.filename)}
            >
              <div className={styles.chipTop}>
                <span className={styles.fileName} title={file.filename}>
                  {file.filename.split('/').pop() || file.filename}
                </span>
                <span className={`${styles.statusTag} ${statusClass}`}>
                  {file.status}
                </span>
              </div>

              <div className={styles.chipBottom}>
                <div className={styles.diffStats}>
                  <span className={styles.statAdd}>+{file.additions}</span>
                  <span className={styles.statDel}>-{file.deletions}</span>
                </div>

                <div className={styles.threatBadgeGroup}>
                  {file.criticalEntropyLeaks > 0 && (
                    <span className={`${styles.threatFlag} ${styles.threatCritical}`} title="Critical Entropy Leaks">
                      <ShieldAlert size={12} />
                      {file.criticalEntropyLeaks}
                    </span>
                  )}
                  {file.hotspotsCount > 0 && (
                    <span className={`${styles.threatFlag} ${styles.threatWarning}`} title="Spaghetti Hotspots">
                      <Cpu size={12} />
                      {file.hotspotsCount}
                    </span>
                  )}
                  {file.isSafe && file.criticalEntropyLeaks === 0 && file.hotspotsCount === 0 && (
                    <span className={`${styles.threatFlag} ${styles.threatClean}`} title="Zero Issues Flagged">
                      <CheckCircle size={12} />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};