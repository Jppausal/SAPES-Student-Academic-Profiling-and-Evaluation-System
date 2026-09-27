# Changelog

All notable SAPES changes are recorded here.

## Unreleased

### Added

- MongoDB-backed administrator upsert API for academic-year and semester records.
- Academic-record validation for term identity, subjects, grades, units, and duplicate subject codes.
- Administrator academic-record workspace backed by shared student report and status APIs.
- Faculty evaluation workspace now uses only protected backend student reports and mutations.
- Structured shifter and transferee classification fields for student profiles.
- Shared backend validation for student and administrator profile updates.
- Backend regression tests using the Node.js test runner.
- Administrator access to the audited student-status update workflow.

### Changed

- Faculty reports now display persisted term subjects and capture evaluation and status reasons.
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
