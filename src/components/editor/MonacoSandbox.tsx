'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import type * as MonacoEditorType from 'monaco-editor';
import { FileCode, Cpu } from 'lucide-react';
import styles from './MonacoSandbox.module.css';
import { FileAnalysisResult } from '@/lib/engines/batchAnalyzer';
import { ParsedDiffFile } from '@/lib/engines/diffParser';

interface MonacoSandboxProps {
  activeFile: ParsedDiffFile | null;
  analysis: FileAnalysisResult | null;
}

export const MonacoSandbox: React.FC<MonacoSandboxProps> = ({ activeFile, analysis }) => {
  const editorRef = useRef<MonacoEditorType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Suppress unhandled Monaco disposal/domNode exceptions during route navigation
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('domNode') ||
        event.reason?.message?.includes('InstantiationService') ||
        event.reason?.message?.includes('disposed')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (editorRef.current) {
        try {
          const model = editorRef.current.getModel();
          if (model && !model.isDisposed()) {
            model.dispose();
          }
          editorRef.current.dispose();
        } catch {
          // Swallow cleanup errors
        }
        editorRef.current = null;
        monacoRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    try {
      monaco.editor.defineTheme('prxray-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6e7681', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff7b72' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'number', foreground: '79c0ff' },
        ],
        colors: {
          'editor.background': '#090d13',
          'editor.lineHighlightBackground': '#161b22',
          'editorGutter.background': '#090d13',
          'editorLineNumber.foreground': '#484f58',
          'editorLineNumber.activeForeground': '#e6edf3',
        },
      });
      monaco.editor.setTheme('prxray-dark');
    } catch {
      // Theme fallback
    }
  };

  // Safe Marker Update with Active DOM Verification
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !analysis) return;

    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          const editor = editorRef.current;
          const monaco = monacoRef.current;
          if (!editor || !monaco) return;

          const domNode = editor.getDomNode();
          if (!domNode || !document.body.contains(domNode)) return;

          const model = editor.getModel();
          if (!model || model.isDisposed()) return;

          const markers: MonacoEditorType.editor.IMarkerData[] = [];
          const lineCount = model.getLineCount();
          if (lineCount === 0) return;

          if (analysis.entropyFindings) {
            analysis.entropyFindings.forEach((leak) => {
              const line = Math.max(1, Math.min(leak.lineNumber, lineCount));
              markers.push({
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: model.getLineMaxColumn(line) || 80,
                message: `[PR-XRay CRITICAL] High-Entropy Secret (Shannon H=${leak.entropy}). Signature: ${leak.signatureType}`,
                severity: monaco.MarkerSeverity.Error,
              });
            });
          }

          if (analysis.vulnerabilityFindings) {
            analysis.vulnerabilityFindings.forEach((vuln) => {
              const line = Math.max(1, Math.min(vuln.lineNumber, lineCount));
              markers.push({
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: model.getLineMaxColumn(line) || 80,
                message: `[PR-XRay ${vuln.severity || 'HIGH'}] AST Violation: ${vuln.cwe} (${vuln.matchedSnippet})`,
                severity: monaco.MarkerSeverity.Error,
              });
            });
          }

          monaco.editor.setModelMarkers(model, 'pr-xray-sentinel', markers);
        } catch {
          // Swallow any layout race conditions
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [analysis, activeFile]);

  if (!activeFile) {
    return (
      <div className={styles.sandboxContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          NO TARGET FILE SELECTED FOR MEMORY AUDIT
        </span>
      </div>
    );
  }

  const editorCode = activeFile.modifiedCode || activeFile.originalCode || '// Empty diff payload';
  const fileKey = `monaco-${activeFile.filename}-${activeFile.additions}-${activeFile.deletions}`;

  return (
    <div ref={containerRef} className={styles.sandboxContainer} data-gramm="false">
      <div className={styles.editorHeader}>
        <div className={styles.fileBadge}>
          <FileCode size={14} style={{ color: '#58a6ff' }} />
          <span>{activeFile.filename}</span>
          <span style={{ color: 'var(--text-muted)' }}>({activeFile.language})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className={styles.diffStat}>
            <span className={styles.diffStatGreen}>+{activeFile.additions}</span>{' '}
            <span className={styles.diffStatRed}>-{activeFile.deletions}</span>
          </span>
          <span style={{ fontSize: 11, color: '#3fb950', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
            <Cpu size={12} />
            Hardware SIMD: Direct
          </span>
        </div>
      </div>

      <div className={styles.editorViewport}>
        {isMounted && (
          <Editor
            key={fileKey}
            height="100%"
            language={
              activeFile.language === 'typescript' || activeFile.language === 'tsx'
                ? 'typescript'
                : activeFile.language === 'python'
                ? 'python'
                : 'javascript'
            }
            value={editorCode}
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: true, maxColumn: 40 },
              scrollBeyondLastLine: false,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              glyphMargin: true,
              folding: true,
              overviewRulerBorder: false,
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
};