'use client';

function normalizeRepoTarget(raw: string | null): string | null {
  if (!raw) return null;
  let clean = decodeURIComponent(raw).trim();
  clean = clean.replace(/\.git$/, '');
  const ghMatch = clean.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (ghMatch) {
    return `${ghMatch[1]}/${ghMatch[2]}`;
  }
  const parts = clean.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return clean;
}
// Normalizes any GitHub URL or slug into pure "owner/repo" format

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  Terminal,
  Sparkles,
  ShieldAlert,
  Lock,
  Cpu
} from 'lucide-react';
import { parseUnifiedDiff, ParsedDiffFile } from '@/lib/engines/diffParser';
import { executeBatchAudit, PRBatchAuditReport } from '@/lib/engines/batchAnalyzer';
import { generateGitHubReviewMarkdown } from '@/lib/engines/reviewExporter';
import { SecurityRadarCanvas } from '@/components/charts/SecurityRadarCanvas';
import { ComplexityGraphCanvas } from '@/components/charts/ComplexityGraphCanvas';
import { MonacoSandbox } from '@/components/editor/MonacoSandbox';
import { GlobalAuditScorecard, ScorecardAuditData } from '@/components/scorecard/GlobalAuditScorecard';
import { FilesThreatMatrix, FileAuditSummary } from '@/components/matrix/FilesThreatMatrix';
import { useSentinel, ThreatInvariant } from '@/lib/state/sentinelContext';

function AuditContent() {
  const searchParams = useSearchParams();
  // GUARANTEED REAL-TIME TELEGRAM ALERT HOOK
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('target');
      if (q) {
        console.log('%c[PR-XRay Client] Dispatching Telegram Alert for:', 'color: #3fb950; font-weight: bold;', q);
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: q }),
        })
        .then(r => r.json())
        .then(res => console.log('%c[PR-XRay Client] Telegram Response:', 'color: #58a6ff;', res))
        .catch(err => console.error('[PR-XRay Client] Alert failed:', err));
      }
    }
  }, []);
  const targetParam = searchParams.get('target') || '';

  const { recordAuditCompletion, selectThreat, appendLog, flagAdversarial, state: sentinelState } = useSentinel();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [files, setFiles] = useState<ParsedDiffFile[]>([]);
  const [report, setReport] = useState<PRBatchAuditReport | null>(null);
  const [activeFilename, setActiveFilename] = useState<string>('');
  const [copiedReview, setCopiedReview] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  useEffect(() => {
    async function loadTarget() {
      if (!targetParam) {
        setErrorMsg('No repository or PR target specified.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      setTelemetryLogs([
        `[V8 HEAP] Ingestion pipeline initialized for: ${targetParam}`,
        `[WASM CORE] SIMD128 multi-threaded worker pool ready.`,
      ]);
      appendLog('INGESTION_GATE', 'INFO', `Mounting audit pipeline for ${targetParam}`);

      try {
        let rawDiff = '';

        // Mode A: In-Memory Raw Patch Stream
        if (targetParam === 'local://raw-patch') {
          const storedPatch = typeof window !== 'undefined' ? sessionStorage.getItem('prxray_raw_patch') : null;
          if (!storedPatch) {
            throw new Error('Local patch buffer is empty. Ingest diff from cockpit.');
          }
          rawDiff = storedPatch;
          setTelemetryLogs((prev) => [
            ...prev,
            `[LOCAL BUFFER] Ingested ${rawDiff.length} bytes from browser session memory.`,
          ]);
        } 
        // Mode B: Remote GitHub API Stream
        else {
          let clean = targetParam.trim();
          clean = clean.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');

          const token = typeof window !== 'undefined' ? sessionStorage.getItem('prxray_github_token') : null;
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3.diff',
          };
          if (token) {
            headers['Authorization'] = `token ${token}`;
          }

          let diffUrl = '';
          if (clean.includes('/pull/')) {
            const parts = clean.split('/pull/');
            diffUrl = `https://api.github.com/repos/${parts[0]}/pulls/${parts[1]}`;
          } else if (clean.includes('#')) {
            const parts = clean.split('#');
            diffUrl = `https://api.github.com/repos/${parts[0]}/pulls/${parts[1]}`;
          } else {
            diffUrl = `https://api.github.com/repos/${clean}/commits`;
          }

          if (diffUrl.includes('/commits')) {
            const metaRes = await fetch(diffUrl, {
              headers: token ? { Authorization: `token ${token}` } : {},
            });
            if (!metaRes.ok) {
              throw new Error(`Repository not found or private. Status: ${metaRes.status}`);
            }
            const commits = await metaRes.json();
            if (!Array.isArray(commits) || commits.length === 0) {
              throw new Error('No commit history found in target repository.');
            }
            const latestSha = commits[0].sha;
            const diffRes = await fetch(`https://api.github.com/repos/${clean}/commits/${latestSha}`, { headers });
            rawDiff = await diffRes.text();
          } else {
            const res = await fetch(diffUrl, { headers });
            if (!res.ok) {
              throw new Error(`Pull Request not found or private. Status: ${res.status}`);
            }
            rawDiff = await res.text();
          }
        }

        setTelemetryLogs((prev) => [
          ...prev,
          `[DIFF STREAM] ${rawDiff.length} bytes captured. Executing unified parser...`,
        ]);

        const parsedFiles = parseUnifiedDiff(rawDiff);
        if (parsedFiles.length === 0) {
          throw new Error('No modified code hunks found in diff stream.');
        }

        setTelemetryLogs((prev) => [
          ...prev,
          `[AST PARSER] ${parsedFiles.length} files parsed. Running Shannon entropy & McCabe CFG...`,
        ]);

        const auditReport = await executeBatchAudit(parsedFiles);

        // Check for intercepted adversarial attacks
        if (auditReport.totalAdversarialBlocks > 0) {
          flagAdversarial('INJECTION');
          appendLog('AST_SCANNER', 'CRITICAL', `${auditReport.totalAdversarialBlocks} adversarial instruction tokens intercepted and neutralized.`);
        }

        // Autonomous Threat Prioritization: Map findings to ThreatInvariants
        const extractedThreats: ThreatInvariant[] = [];
        let highestPriorityFilename = parsedFiles[0].filename;
        let highestPriorityRank = -1;

        auditReport.files.forEach((f) => {
          let fileRank = 0;

          // 1. Adversarial tokens
          if (f.adversarialFindings.length > 0) {
            fileRank = 4;
            extractedThreats.push({
              id: `adv-${f.filename}`,
              filename: f.filename,
              lineNumber: 1,
              threatType: 'sink',
              severity: 'CRITICAL',
              signature: 'ADVERSARIAL_INJECTION_DEFUSED',
              rawSnippet: f.adversarialFindings[0].description,
              detectedAt: Date.now(),
            });
          }

          // 2. Critical Shannon Leaks
          if (f.entropyFindings.length > 0) {
            fileRank = Math.max(fileRank, 3);
            const leak = f.entropyFindings[0];
            extractedThreats.push({
              id: `entropy-${f.filename}-${leak.lineNumber}`,
              filename: f.filename,
              lineNumber: leak.lineNumber,
              threatType: 'entropy',
              severity: 'CRITICAL',
              signature: `${leak.signatureType} (H=${leak.entropy})`,
              rawSnippet: leak.rawToken,
              detectedAt: Date.now(),
            });
          }

          // 3. AST Dangerous Sinks
          if (f.vulnerabilityFindings.length > 0) {
            fileRank = Math.max(fileRank, 2);
            const v = f.vulnerabilityFindings[0];
            extractedThreats.push({
              id: `ast-${f.filename}-${v.lineNumber}`,
              filename: f.filename,
              lineNumber: v.lineNumber,
              threatType: 'sink',
              severity: v.severity || 'HIGH',
              signature: v.cwe,
              rawSnippet: v.matchedSnippet,
              detectedAt: Date.now(),
            });
          }

          // 4. Complexity Hotspots
          const hotspot = f.functionMetrics.find((m) => m.cyclomaticComplexity > 15);
          if (hotspot) {
            fileRank = Math.max(fileRank, 1);
            extractedThreats.push({
              id: `cfg-${f.filename}-${hotspot.line}`,
              filename: f.filename,
              lineNumber: hotspot.line,
              threatType: 'hotspot',
              severity: 'MEDIUM',
              signature: `McCabe M=${hotspot.cyclomaticComplexity}`,
              rawSnippet: `Function '${hotspot.name}' exceeds cyclomatic barrier (M=${hotspot.cyclomaticComplexity})`,
              detectedAt: Date.now(),
            });
          }

          if (fileRank > highestPriorityRank) {
            highestPriorityRank = fileRank;
            highestPriorityFilename = f.filename;
          }
        });

        // Sync with Central Sentinel Awareness Bus
        recordAuditCompletion(auditReport.overallHealthScore, parsedFiles.length, extractedThreats);

        setTelemetryLogs((prev) => [
          ...prev,
          `[LOCK HASH] Invariant proof: ${auditReport.deterministicLockHash}`,
          `[AUDIT COMPLETE] Health Score: ${auditReport.overallHealthScore}/100. Gatekeeper: ${auditReport.blockMerge ? 'BLOCKED' : 'PASS'}`,
        ]);

        setFiles(parsedFiles);
        setReport(auditReport);
        setActiveFilename(highestPriorityFilename);
      } catch (err: any) {
        setErrorMsg(err.message || 'Audit execution failure.');
      } finally {
        setLoading(false);
      }
    }

    loadTarget();
  }, [targetParam, recordAuditCompletion, appendLog, flagAdversarial]);

  const activeFileIndex = useMemo(() => {
    const idx = files.findIndex((f) => f.filename === activeFilename);
    return idx >= 0 ? idx : 0;
  }, [files, activeFilename]);

  const activeFile = files[activeFileIndex] || null;
  const activeAnalysis = report?.files[activeFileIndex] || null;

  // Extract contextual threat details for the active file to pass to Copilot
  const activeThreatContext = useMemo(() => {
    if (!activeAnalysis || !activeFile) {
      return { line: 1, type: 'clean', snippet: '// Structural Baseline Clean' };
    }

    if (activeAnalysis.entropyFindings.length > 0) {
      const e = activeAnalysis.entropyFindings[0];
      return {
        line: e.lineNumber,
        type: 'entropy',
        snippet: `Unmasked ${e.signatureType} token [${e.rawToken}] with Shannon H=${e.entropy}`,
      };
    }

    if (activeAnalysis.vulnerabilityFindings.length > 0) {
      const v = activeAnalysis.vulnerabilityFindings[0];
      return {
        line: v.lineNumber,
        type: 'hotspot',
        snippet: `${v.cwe}: ${v.matchedSnippet}`,
      };
    }

    const m = activeAnalysis.functionMetrics.find((fn) => fn.cyclomaticComplexity > 15);
    if (m) {
      return {
        line: m.line,
        type: 'hotspot',
        snippet: `Function '${m.name}' has Cyclomatic Complexity M=${m.cyclomaticComplexity} (threshold=15)`,
      };
    }

    return {
      line: 1,
      type: 'clean',
      snippet: `// ${activeFile.filename}: All AST checks passed. Zero secrets detected.`,
    };
  }, [activeAnalysis, activeFile]);

  // Strict mapping to ScorecardAuditData
  const scorecardData: ScorecardAuditData | null = useMemo(() => {
    if (!report) return null;
    return {
      totalFiles: report.totalFiles,
      totalAdditions: report.totalAdditions,
      totalDeletions: report.totalDeletions,
      overallHealthScore: report.overallHealthScore,
      criticalFindingsCount: report.totalCriticalEntropyLeaks + report.totalVulnerabilities + report.totalAdversarialBlocks,
      totalHotspots: report.totalHotspots,
      averageComplexity: report.averageComplexity,
      unsafeFilesCount: report.unsafeFilesCount,
      blockMerge: report.blockMerge,
    };
  }, [report]);

  // Strict mapping to FilesThreatMatrix
  const matrixFiles: FileAuditSummary[] = useMemo(() => {
    if (!files || !report) return [];
    return files.map((f, idx) => {
      const a = report.files[idx];
      const leaks = (a?.entropyFindings?.length || 0) + (a?.adversarialFindings?.length || 0);
      const hotspots = a?.functionMetrics?.filter((m) => m.cyclomaticComplexity > 15).length || 0;
      const st: 'added' | 'modified' | 'deleted' = f.status === 'renamed' ? 'modified' : f.status;
      return {
        filename: f.filename,
        status: st,
        additions: f.additions,
        deletions: f.deletions,
        criticalEntropyLeaks: leaks,
        hotspotsCount: hotspots,
        complexityScore: a?.peakComplexity || 1,
        isSafe: a ? a.isSafe : true,
      };
    });
  }, [files, report]);

  const targetRepoUrl = useMemo(() => {
    if (!targetParam || targetParam === 'local://raw-patch') return '#';
    if (targetParam.startsWith('http')) return targetParam;
    return `https://github.com/${targetParam.replace(/\.git$/, '')}`;
  }, [targetParam]);

  const handleCopyReview = () => {
    if (!report) return;
    const md = generateGitHubReviewMarkdown(report, `Audit for ${targetParam}`, targetParam);
    navigator.clipboard.writeText(md);
    setCopiedReview(true);
    setTimeout(() => setCopiedReview(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #30363d', borderTopColor: '#58a6ff', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
          INGESTING DIFF STREAM INTO LOCAL V8 / WASM MEMORY...
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: 720, margin: '80px auto', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <AlertTriangle size={48} style={{ color: '#f85149' }} />
        <h2 style={{ color: '#ffffff', margin: 0 }}>Diff Ingestion Interrupted</h2>
        <div style={{ padding: 14, backgroundColor: '#1c1214', border: '1px solid #da3633', borderRadius: 6, color: '#ff7b72', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {errorMsg}
        </div>
        <Link href="/scan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 16px', borderRadius: 6, backgroundColor: '#21262d', color: '#c9d1d9', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          <ArrowLeft size={14} />
          Return to Cockpit
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1680, margin: '0 auto', padding: '16px 24px 64px 24px', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
      {/* Adversarial Defense Alert Bar */}
      {report && report.totalAdversarialBlocks > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#281014',
          border: '1px solid #da3633',
          borderRadius: 8,
          color: '#ff7b72',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={16} />
            <span>
              <strong>DEFENSE SHIELD TRIGGERED:</strong> {report.totalAdversarialBlocks} Prompt Injection token sequences neutralized in diff stream.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c9d1d9', fontSize: 11 }}>
            <Lock size={12} />
            <span>Lock: {report.deterministicLockHash}</span>
          </div>
        </div>
      )}

      {/* 1. Top Bar: Target Info, View Repo, Copilot Link & Review Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-default)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/scan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <ArrowLeft size={14} />
            <span>Cockpit</span>
          </Link>
          <span style={{ color: 'var(--border-muted)' }}>|</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Auditing Target: <strong style={{ color: '#ffffff' }}>{targetParam}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Autonomous Deep Link to Copilot with Live Threat Context */}
          <Link
            href={`/copilot?target=${encodeURIComponent(targetParam)}&file=${encodeURIComponent(activeFilename)}&line=${activeThreatContext.line}&type=${activeThreatContext.type}&snippet=${encodeURIComponent(activeThreatContext.snippet)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Sparkles size={13} />
            <span>Open Neural Copilot</span>
          </Link>

          {targetParam !== 'local://raw-patch' && (
            <a
              href={targetRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                backgroundColor: '#161b22',
                border: '1px solid var(--border-default)',
                color: '#58a6ff',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} />
              <span>View Repository</span>
            </a>
          )}

          <button
            onClick={handleCopyReview}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              backgroundColor: '#21262d',
              border: '1px solid var(--border-default)',
              color: '#c9d1d9',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {copiedReview ? <Check size={13} style={{ color: '#3fb950' }} /> : <Copy size={13} />}
            <span>{copiedReview ? 'Markdown Copied!' : 'Export Review Markdown'}</span>
          </button>
        </div>
      </div>

      {/* 2. Global Executive Scorecard Banner */}
      {scorecardData && <GlobalAuditScorecard audit={scorecardData} />}

      {/* 3. Files Threat Matrix (Interactive Table / Switcher) */}
      {matrixFiles.length > 0 && (
        <FilesThreatMatrix
          files={matrixFiles}
          activeFilename={activeFilename}
          onSelectFile={(fn) => {
            setActiveFilename(fn);
            const foundThreat = sentinelState.threatRegistry.find((t) => t.filename === fn);
            selectThreat(foundThreat || null);
          }}
        />
      )}

      {/* 4. Main Workstation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        {/* Left Telemetry Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: '#161b22', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                SECURITY RADAR PROFILE
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#58a6ff' }}>
                H={activeAnalysis?.peakEntropy || 0}
              </span>
            </div>
            <SecurityRadarCanvas
              entropy={activeAnalysis?.peakEntropy || 0}
              complexity={activeAnalysis?.peakComplexity || 1}
              churn={activeFile ? activeFile.additions + activeFile.deletions : 0}
              vulnerabilities={(activeAnalysis?.vulnerabilityFindings.length || 0) + (activeAnalysis?.entropyFindings.length || 0) + (activeAnalysis?.adversarialFindings.length || 0)}
              deltaM={activeAnalysis?.deltaM || 0}
            />
          </div>

          <div style={{ backgroundColor: '#161b22', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                MCCABE DECISION AST
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: activeAnalysis && activeAnalysis.deltaM > 8 ? '#f85149' : '#3fb950' }}>
                ΔM = {activeAnalysis?.deltaM || 0}
              </span>
            </div>
            <ComplexityGraphCanvas functions={activeAnalysis?.functionMetrics || []} filename={activeFile?.filename} />
          </div>

          <div style={{ backgroundColor: '#090d13', border: '1px solid var(--border-default)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                <Terminal size={12} style={{ color: '#3fb950' }} />
                <span>IN-MEMORY WASM RUNTIME LOG</span>
              </div>
              {report && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8b949e' }}>
                  {report.totalExecutionTimeMs} ms
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7ee787', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
              {telemetryLogs.map((log, i) => (
                <div key={i} style={{ wordBreak: 'break-all' }}>&gt; {log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Code Diff Column */}
        <div style={{ minHeight: 640, height: '100%' }}>
          <MonacoSandbox activeFile={activeFile} analysis={activeAnalysis} />
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#c9d1d9' }}>Mounting Engine...</div>}>
      <AuditContent />
    </Suspense>
  );
}
