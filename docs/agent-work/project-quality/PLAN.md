# Project quality improvement

## Objective

Improve code quality, UI/UX, performance, and maintainability while retaining
existing SAPES workflows, branding, role boundaries, and academic behavior.
Default emphasis is balanced across roles; an optional user priority is pending.

## Evidence and decisions

- React 19 / TypeScript / Vite client, Express / Mongoose CommonJS server.
- App.tsx eagerly imports student, faculty, and admin portals.
- common/Modal.tsx has no labelled title or focus containment/restoration, and
  every effect cleanup sets body overflow to unset, including closed instances.
- Navbar contains non-interactive navigation-looking spans; its account button
  lacks expanded/control semantics and the reset dialog duplicates modal markup.
- StudentPortal and AdminPortal duplicate tab presentation; student report loading
  is rendered as an alert and the profile-completion predicate is duplicated.
- client/README.md incorrectly says the API is only a health endpoint.
- Existing role folder boundaries are useful. Extend common components and small
  hooks only where reused; avoid a wholesale directory move or new framework.

Keep the existing indigo/slate identity, terminology, logos, records, forms,
actions, tabs, and role-specific features. Improve keyboard access, responsive
spacing, visual hierarchy, and honest status communication. No backend business
logic, API contract, authentication/session/permission, schema, or data migrations.
No synthetic controls or new product functionality. No new dependencies unless a
concrete test blocker is returned to Astra for a decision.

## Baseline and ownership

Workspace: C:/Projects/SAPES-Student-Academic-Profiling-and-Evaluation-System
Branch main; HEAD 8f7b70b3704afa6a01a042ff2d67aefc303897c5. No staged changes.
Untracked docs/agent-work/string-helpers contains an earlier blocked task; leave it.
Existing edits MUST remain byte-for-byte intact:

- client/src/lib/api.ts SHA256 C48E3E205BBD953C3B52E7D419AAD3A65410699A0206ECF63040913229AEE95C
- server/routes/authRoutes.js SHA256 3B0D82FB45FB8DE596C00F3234CC95607F2E2D46B732B5A5962D3C6D2D989F1A

Astra owns PLAN.md and CHECKPOINT.md. One Flash worker owns the paths listed in
PQ-1, relevant dependency-free client test artifacts, and worker-report.md.

## PQ-1: shared interface and loading improvements

Dependencies: none. One coherent implementation and verification bundle.

Allowed source scope: client/src/App.tsx, client/src/index.css,
client/src/components/common/, client/src/components/layout/Navbar.tsx,
client/src/components/student/StudentPortal.tsx,
client/src/components/admin/AdminPortal.tsx,
client/src/components/faculty/FacultyPortal.tsx, new client/src/hooks/ if justified,
client/README.md, root README.md, and new client test files/test-only fixtures.
Avoid editing package manifests/configuration; return a concrete blocker if needed.

1. Capture baseline client lint/build and server test results and build chunk sizes
   before edits. Inspect relevant consumers, existing guidance, and tool support.
2. Preserve Modal's public props; provide a programmatic title/description,
   initial focus, Tab/Shift+Tab containment, Escape handling, focus restoration,
   and safe body scroll locking including multiple simultaneous dialogs and
   React StrictMode. Only the topmost dialog responds to Escape/focus management.
   Closed modal cleanup must not unlock another modal. Keep existing explicit
   dismissal behavior (no new backdrop-dismissal behavior). Make long dialogs and
   footer actions usable on small screens. Prefer native/platform facilities if
   compatible, without adding a library or breaking existing styling/callers.
3. Use the shared modal for local reset confirmation, preserving confirm/cancel
   actions and their effects. Improve account dropdown semantics, Escape/outside
   click behavior, and return focus as appropriate. Keep all account actions.
   Replace misleading header navigation-looking spans with clearly informational
   role context; actual portal tab navigation remains available.
4. Extract one small typed shared portal navigation component and consume it in
   student/admin portals. Preserve tab labels, counts, content, and selection
   behavior. Use appropriate accessible semantics (fully implement keyboard/ARIA
   expectations if using tab roles; ordinary button group is acceptable). Use
   readable mobile layouts and visible focus states.
5. Add reusable loading/error presentation where truly shared. Separate student
   report pending from failure; preserve profile editing during report failure.
   Consolidate the profile-completion predicate. Do not change fetch contracts,
   onboarding detection, authorization, or saved-data behavior.
6. Lazy-load role portals behind Suspense with an accessible loading fallback.
   Handle lazy-load/render failures with a recoverable boundary and honest UI.
   Preserve auth flows and all role entry points; no local auth bypasses. Keep
   expensive feature modules out of the initial bundle where the graph allows.
7. Add restrained shared focus/reduced-motion styling and consistent spacing.
   Preserve established branding. Document actual client/server setup, directory
   responsibilities, and validation commands; do not expose credentials or invent
   environment configuration. Do not delete apparently obsolete files blindly.

## Verification and acceptance

- Run `npm run lint --prefix client`, `npm run build --prefix client`, and
  `npm test --prefix server`. Record exact exit statuses and baseline failures;
  fix introduced failures only. No live database mutations, seeds, or deployments.
- Meaningful behavioral verification for changed dialogs, dropdown, navigation,
  loading/error states, and role lazy loading using available browser tools or
  existing local test tooling. Desktop and narrow mobile checks; keyboard focus,
  Escape, two-modal scroll ownership, and preserved profile/admin actions.
  Test-only API fixtures are allowed, but never embed an auth bypass in app code.
- Do not install tools or claim browser validation if unavailable. Report the
  exact limitation with a repeatable manual checklist and available automated
  evidence. Keep any browser/test scripts scoped to this task.
- Compare initial JS sizes/chunk composition against baseline. Do not invent
  runtime latency improvements from bundle size alone.
- Inspect final scope and preserved dirty files. Report changed files, behaviors,
  command results, evidence paths, performance measurements, and unresolved issues
  in docs/agent-work/project-quality/worker-report.md.

Astra performs one batched specification and code-quality/security review of
actual changes and evidence, using code-review-and-quality. One consolidated
correction cycle by default; acceptance only for verified claims.

## Routing and stop conditions

Doctor is static-ready for gpt-6-astra root and astra_flash_builder using
deepseek/deepseek-v4.1-flash through DeepSeek API. Earlier useful task failed
HTTP 402 Insufficient Balance. This new task may establish whether access is
restored; no paid smoke test or silent model/provider fallback is authorized.
No recursive delegation, commits, staging, publishing, production access, or
router configuration changes. Preserve other writers' work. If blocked, checkpoint
the concrete blocker instead of expanding scope. Otherwise complete internal
discovery/implementation/tests/debugging/visual QA and return one report.

## Status

Blocked before implementation. Native worker /root/project_quality failed with
DeepSeek HTTP 402 Insufficient Balance. No application code was changed and no
tests or implementation acceptance review ran. Resume the same approved bundle
after provider access is restored. Initial code-review findings above remain
proposals, not implemented fixes.
