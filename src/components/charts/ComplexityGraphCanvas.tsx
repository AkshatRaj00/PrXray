'use client';

import React, { useRef, useEffect } from 'react';
import { GitCommit, Activity } from 'lucide-react';
import styles from './Charts.module.css';

export interface FunctionComplexityMetric {
  name: string;
  line: number;
  cyclomaticComplexity: number; // M = Decision Points + 1
  nestingDepth?: number;
}

interface ComplexityGraphCanvasProps {
  functions: FunctionComplexityMetric[];
  filename?: string;
}

const MCCABE_MODERATE_THRESHOLD = 10;
const MCCABE_CRITICAL_THRESHOLD = 15;

export const ComplexityGraphCanvas: React.FC<ComplexityGraphCanvasProps> = ({
  functions = [],
  filename = 'Active File',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina / High-DPI Display Scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 24, right: 16, bottom: 42, left: 36 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Empty state fallback when no functions detected
    if (functions.length === 0) {
      ctx.font = '11px ui-monospace, SFMono-Regular, "SF Mono", monospace';
      ctx.fillStyle = '#484f58';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No isolated function blocks found in AST', width / 2, height / 2);
      return;
    }

    const maxComplexity = Math.max(
      20,
      ...functions.map((f) => f.cyclomaticComplexity)
    );

    // Coordinate Mapping Helpers
    const getX = (index: number) => {
      const step = chartWidth / functions.length;
      return padding.left + index * step + step / 2;
    };

    const getY = (val: number) => {
      const ratio = val / maxComplexity;
      return padding.top + chartHeight - ratio * chartHeight;
    };

    // 1. Draw Grid Lines & Y-Axis Labels
    ctx.font = '9px ui-monospace, SFMono-Regular, "SF Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [0, 5, 10, 15, maxComplexity];
    const uniqueTicks = Array.from(new Set(yTicks)).sort((a, b) => a - b);

    uniqueTicks.forEach((tick) => {
      const y = getY(tick);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = tick === 0 ? '#30363d' : '#161b22';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = tick > MCCABE_CRITICAL_THRESHOLD ? '#f85149' : '#484f58';
      ctx.fillText(String(tick), padding.left - 6, y);
    });

    // 2. Draw Critical Threshold Warning Line (M = 15)
    if (maxComplexity >= MCCABE_CRITICAL_THRESHOLD) {
      const criticalY = getY(MCCABE_CRITICAL_THRESHOLD);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, criticalY);
      ctx.lineTo(width - padding.right, criticalY);
      ctx.strokeStyle = 'rgba(248, 81, 73, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f85149';
      ctx.textAlign = 'right';
      ctx.font = '8px ui-monospace, SFMono-Regular, "SF Mono", monospace';
      ctx.fillText('SPAGHETTI HOTSPOT LIMIT (M=15)', width - padding.right, criticalY - 6);
      ctx.restore();
    }

    // 3. Render Complexity Bars & Decision Caps
    const barWidth = Math.max(8, Math.min(28, (chartWidth / functions.length) * 0.55));

    functions.forEach((fn, idx) => {
      const x = getX(idx);
      const y = getY(fn.cyclomaticComplexity);
      const barH = padding.top + chartHeight - y;

      const isCritical = fn.cyclomaticComplexity > MCCABE_CRITICAL_THRESHOLD;
      const isModerate = fn.cyclomaticComplexity > MCCABE_MODERATE_THRESHOLD;

      // Solid color grading
      const barColor = isCritical ? '#f85149' : isModerate ? '#d29922' : '#238636';

      // Bar Body
      ctx.fillStyle = barColor;
      ctx.fillRect(x - barWidth / 2, y, barWidth, barH);

      // Top Edge Highlight Cap
      ctx.fillStyle = isCritical ? '#ff7b72' : isModerate ? '#e3b341' : '#3fb950';
      ctx.fillRect(x - barWidth / 2, y, barWidth, 2);

      // Value label on top of bar
      ctx.font = '10px ui-monospace, SFMono-Regular, "SF Mono", monospace';
      ctx.fillStyle = isCritical ? '#ff7b72' : '#c9d1d9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(fn.cyclomaticComplexity), x, y - 3);

      // Function identifier on X axis (truncated to 8 chars)
      const label = fn.name.length > 8 ? fn.name.substring(0, 7) + '…' : fn.name;
      ctx.fillStyle = '#8b949e';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, padding.top + chartHeight + 6);

      // Line number annotation
      ctx.fillStyle = '#484f58';
      ctx.font = '8px ui-monospace, SFMono-Regular, "SF Mono", monospace';
      ctx.fillText(`L:${fn.line}`, x, padding.top + chartHeight + 18);
    });
  }, [functions]);

  const maxRecorded = functions.reduce(
    (acc, f) => (f.cyclomaticComplexity > acc ? f.cyclomaticComplexity : acc),
    0
  );
  const criticalCount = functions.filter(
    (f) => f.cyclomaticComplexity > MCCABE_CRITICAL_THRESHOLD
  ).length;

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.titleArea}>
          <Activity size={14} style={{ color: 'var(--color-warning)' }} />
          <h4 className={styles.chartTitle}>McCabe Decision AST</h4>
        </div>
        <span className={styles.chartBadge}>Cyclomatic M</span>
      </div>

      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.radarCanvas} />
      </div>

      <div className={styles.chartFooter}>
        <span>Analyzed: {functions.length} Routine Blocks</span>
        <div className={styles.statPill}>
          <span className={criticalCount > 0 ? styles.statDotCritical : styles.statDotOptimal} />
          <span>Peak M: {maxRecorded} {criticalCount > 0 ? `(${criticalCount} Hotspots)` : '(Optimal)'}</span>
        </div>
      </div>
    </div>
  );
};