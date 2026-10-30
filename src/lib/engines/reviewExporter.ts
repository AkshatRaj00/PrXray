import { PRBatchAuditReport } from './batchAnalyzer';

export function generateGitHubReviewMarkdown(
  report: PRBatchAuditReport,
  prTitle: string,
  targetUrl: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const statusBadge = report.blockMerge
    ? '🛑 **GATEKEEPER VERDICT: MERGE BLOCKED**'
    : '✅ **GATEKEEPER VERDICT: MERGE PERMITTED**';

  let md = `## 🛡️ PR-XRay Security & Architecture Review\n\n`;
  md += `**Target:** [${targetUrl}](${targetUrl}) | **Evaluated on:** \`${date}\`\n`;
  md += `**PR Title:** ${prTitle}\n\n`;
  md += `${statusBadge}\n\n`;

  md += `### 📊 Telemetry Scorecard\n`;
  md += `| Metric | Measurement | Gate Boundary |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Overall Health Score** | **${report.overallHealthScore}/100** | $\\ge 75$ |\n`;
  md += `| **Critical Secret Leaks** | \`${report.totalCriticalEntropyLeaks}\` | $0$ Tolerance |\n`;
  md += `| **AST Dangerous Sinks (CWE)** | \`${report.totalVulnerabilities}\` | $0$ Tolerance |\n`;
  md += `| **Cyclomatic Hotspots (M > 15)**| \`${report.totalHotspots}\` | $\\le 2$ |\n`;
  md += `| **Net Delta Complexity ($\\Delta M$)** | \`${report.netDeltaM > 0 ? '+' : ''}${report.netDeltaM}\` | $\\le +8$ |\n\n`;

  if (report.totalCriticalEntropyLeaks > 0 || report.totalVulnerabilities > 0) {
    md += `### 🚨 Critical Vulnerability Breakdown\n\n`;
    for (const file of report.files) {
      if (file.entropyFindings.length > 0 || file.vulnerabilityFindings.length > 0) {
        md += `#### \`${file.filename}\`\n`;
        for (const leak of file.entropyFindings) {
          md += `- **Line ${leak.lineNumber}**: \`${leak.signatureType}\` (Shannon $H = ${leak.entropy}$) - *Token: \`${leak.rawToken}\`*\n`;
        }
        for (const vuln of file.vulnerabilityFindings) {
          md += `- **Line ${vuln.lineNumber}**: \`${vuln.cwe}\` - ${vuln.description}\n  > \`${vuln.matchedSnippet}\`\n`;
        }
        md += `\n`;
      }
    }
  }

  md += `---\n`;
  md += `*Audited via [PR-XRay](https://github.com/AkshatRaj00) • Zero-Cloud Air-Gapped Client Engine.*`;

  return md;
}