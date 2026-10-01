# Changelog

All notable SAPES changes are recorded here.

## Unreleased

### Added

- MongoDB-backed administrator upsert API for academic-year and semester records.
- Academic-record validation for term identity, subjects, grades, units, and duplicate subject codes.
- Administrator academic-record workspace backed by shared student report and status APIs.
- Faculty evaluation workspace now uses only protected backend student reports and mutations.
- Paginated administrator institutional-summary API and MongoDB-backed analytics view.
- Shared server-side major-subject GWA calculator with regression coverage.
- Student portal navigation backed exclusively by authenticated profile and report APIs.
- Safe database-index synchronization command with duplicate detection.
- Authenticated session-restoration endpoint and client startup validation.
- Patched the backend `qs` dependency to remove known denial-of-service advisories.
- Added administrator report pagination controls for institutional datasets larger than one page.
- Structured shifter and transferee classification fields for student profiles.
- Shared backend validation for student and administrator profile updates.
- Backend regression tests using the Node.js test runner.
- Administrator access to the audited student-status update workflow.

### Changed

- Applied and verified required unique indexes in the configured MongoDB database.
- Health checks now report degraded service when MongoDB is disconnected.
- Saved browser sessions are validated with the backend before a role dashboard renders.
- Faculty reports now display persisted term subjects and capture evaluation and status reasons.
- Administrator analytics no longer read student, academic, or evaluation data from browser storage.
- Removed duplicate browser-local academic and dossier views from the rendered student portal.
- Student classification forms and dashboards now show IP, PWD, shifter, and transferee information.
- Protected requests now resolve current account status and role from MongoDB.
- Administrator account editing now persists supported role and status changes.
- Student provisioning compensates for profile-creation failures.
- `Student.userId` now enforces a unique one-to-one account relationship.

### Security

- Existing sessions are rejected for inactive, suspended, or deleted accounts.
- Active sessions are revoked after password resets, role changes, suspension, or deactivation.
- Student roles and institution IDs cannot be changed through generic account management.
- Google authentication failures no longer return internal error messages.
