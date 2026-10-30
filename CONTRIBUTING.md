# Contributing to PR-XRay

Thank you for your interest in contributing to **PR-XRay: In-Browser Client-Side Security Auditing Platform**.

## Architectural Standard
All contributions must adhere to our zero-data-ingestion guarantee:
1. **Zero Outbound Telemetry:** Code analysis, AST traversal, and Shannon entropy calculations must run 100% inside client-side V8/Wasm memory boundaries.
2. **Deterministic Lifecycle:** Monaco Editor instances must implement proper cleanup (isDisposed checks) on route transitions.
3. **Type Safety:** All pull requests must pass strict TypeScript compilation (
pm run build).

## Pull Request Lifecycle
1. Fork the repository and create a feature branch (git checkout -b feat/your-feature).
2. Verify local builds and edge runs:
   `ash
   npm run build
   npm run dev
Commit your changes with conventional commit syntax (feat:, fix:, chore:).

Open a pull request against the main branch. Our automated CI bots will test and triage your PR.