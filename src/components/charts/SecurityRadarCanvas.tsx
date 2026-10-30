'use client';

import React, { useRef, useEffect } from 'react';

export interface RadarMetrics {
  entropyScore?: number;
  complexityScore?: number;
  riskDensity?: number;
  tokenRandomness?: number;
  churnImpact?: number;
}

export interface SecurityRadarCanvasProps {
  // Nested prop interface
  metrics?: RadarMetrics;
  // Flat prop interface
  entropy?: number;
  complexity?: number;
  churn?: number;
  vulnerabilities?: number;
  deltaM?: number;
}

export const SecurityRadarCanvas: React.FC<SecurityRadarCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Normalize inputs across both nested and flat prop signatures
  const entropyVal = props.metrics?.entropyScore ?? props.entropy ?? 0;
  const complexityVal = props.metrics?.complexityScore ?? props.complexity ?? 1;
  const churnVal = props.metrics?.churnImpact ?? props.churn ?? 0;
  const vulnVal = props.metrics?.riskDensity ?? props.vulnerabilities ?? 0;
  const deltaVal = props.metrics?.tokenRandomness ?? props.deltaM ?? 0;

  // Mathematical normalization strictly bound into [0.08, 1.0] for radar visibility
  const normalizedVector = [
    Math.max(0.08, Math.min(1.0, entropyVal / 6.0)),
    Math.max(0.08, Math.min(1.0, complexityVal / 25.0)),
    Math.max(0.08, Math.min(1.0, churnVal / 250.0)),
    Math.max(0.08, Math.min(1.0, vulnVal > 0 ? 0.35 + vulnVal * 0.2 : 0.08)),
    Math.max(0.08, Math.min(1.0, Math.abs(deltaVal) / 12.0)),
  ];

  const axisLabels = [
    'Entropy (H)',
    'Complexity (M)',
    'Churn Impact',
    'Risk Density',
    'Randomness',
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling (retina crispness)
    const dpr = window.devicePixelRatio || 1;
    const width = 340;
    const height = 240;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 + 6;
    const radius = 80;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;

    // 1. Draw 4 Concentric Polygonal Background Grid Webs
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    for (const level of gridLevels) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * level);
        const y = centerY + Math.sin(angle) * (radius * level);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Draw Radial Spokes and Text Labels
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const xEnd = centerX + Math.cos(angle) * radius;
      const yEnd = centerY + Math.sin(angle) * radius;

      // Spoke line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(xEnd, yEnd);
      ctx.strokeStyle = '#21262d';
      ctx.stroke();

      // Label Positioning
      const labelDistance = radius + 20;
      const lx = centerX + Math.cos(angle) * labelDistance;
      const ly = centerY + Math.sin(angle) * labelDistance;

      ctx.fillText(axisLabels[i], lx, ly);
    }

    // 3. Draw Active Telemetry Polygon
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const magnitude = radius * normalizedVector[i];
      const x = centerX + Math.cos(angle) * magnitude;
      const y = centerY + Math.sin(angle) * magnitude;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const isHighThreat = vulnVal > 0 || entropyVal >= 4.5 || Math.abs(deltaVal) > 8;
    ctx.fillStyle = isHighThreat ? 'rgba(248, 81, 73, 0.25)' : 'rgba(56, 189, 248, 0.2)';
    ctx.fill();

    ctx.strokeStyle = isHighThreat ? '#f85149' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Draw Vertex Data Nodes
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const magnitude = radius * normalizedVector[i];
      const x = centerX + Math.cos(angle) * magnitude;
      const y = centerY + Math.sin(angle) * magnitude;

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isHighThreat ? '#f85149' : '#58a6ff';
      ctx.fill();
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [entropyVal, complexityVal, churnVal, vulnVal, deltaVal]);

  const peakVectorPercent = Math.round(Math.max(...normalizedVector) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <span>Threat Amplitude</span>
        <span style={{ color: peakVectorPercent > 70 ? '#f85149' : peakVectorPercent > 40 ? '#d29922' : '#3fb950', fontWeight: 700 }}>
          {peakVectorPercent}% Peak
        </span>
      </div>
    </div>
  );
};