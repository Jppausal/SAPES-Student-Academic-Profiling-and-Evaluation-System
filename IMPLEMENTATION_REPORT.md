# SAPES Implementation Report

Updated: 2026-09-27

## Implemented in the current work

### Student profile requirements T104-T106

- Students update personal information, classification, and religion through `PUT /api/me/student/profile`.
- Student identity is resolved from the authenticated user; the endpoint does not accept a client-selected student ID.
- Classification supports IP, PWD, shifter, and transferee flags.
- The student dashboard displays all structured classification flags.
- A shared validator rejects protected sections, unsupported nested fields, invalid types, oversized strings, and invalid dates.
- The rendered student portal uses only authenticated profile and report responses for profile, academic records, status, and GWA.

### Student academic history

- Students select an academic year and semester from periods returned by `GET /api/me/student/report`.
- Only the subjects, units, grades, major classification, status, and major-subject GWA for the selected period are rendered.
- The newest stored period is selected by default, and empty or malformed record states are handled without exposing edit controls.
- The report endpoint resolves the student through the authenticated user and returns a server-calculated major-subject GWA for every academic term.
- `npm run seed:student-test-records` idempotently inserts three MongoDB-backed demonstration periods for `student.test` without replacing existing periods.

The configured database now contains these added `student.test` demonstration records:

- `2024-2025 / 2nd Semester`: IT 121 Computer Programming 2 (3, 1.75, major), IT 122 Discrete Structures (3, 2.00, major), GE 104 Mathematics in the Modern World (3, 1.50, non-major). Period major GWA: 1.88.
- `2025-2026 / 1st Semester`: IT 201 Data Structures and Algorithms (3, 2.00, major), IT 202 Object-Oriented Programming (3, 1.50, major), GE 201 Science, Technology and Society (3, 2.00, non-major). Period major GWA: 1.75.
- `2025-2026 / 2nd Semester`: IT 211 Database Systems (3, 1.50, major), IT 212 Web Systems and Technologies (3, 1.75, major), GE 205 Ethics (3, 1.50, non-major). Period major GWA: 1.63.

The existing `2026-2027 / 1st` test record was preserved. A second seed run made no changes and reported all three added periods as already existing.

### Administrative student profile management

- Administrators with `manage_academic_records` can update allowed profile sections through `PUT /api/students/:institutionId`.
- Institution ID, user linkage, account role, and academic data are excluded from ordinary profile updates.
- Faculty and administrators update academic status through `PUT /api/students/:institutionId/status`, which preserves status history and writes an audit entry.

### Administrative academic records

- Administrators search for the authoritative student record by institution ID.
- `PUT /api/students/:institutionId/academic-records` creates or replaces one academic-year and semester record.
- Subject codes, names, units, grades, major flags, status values, duplicate codes, and record size are validated server-side.
- Academic-year and semester records are unique per student.
- Successful changes write an audit entry and refresh the displayed report and major-subject GWA.

### Faculty evaluation workspace

- Faculty search students by institution ID through the protected report API.
- Persisted term subjects and major-subject GWA are displayed from MongoDB.
- Faculty evaluation status, reasons, and remarks are saved through the authorized evaluation endpoint.
- Academic status and its reason are saved through the status-history endpoint.
- The former browser-local faculty roster and dossier are no longer rendered by the faculty portal.

### Institutional reporting

- Administrators load a paginated institutional summary through `GET /api/students/reports/summary`.
- The endpoint batches students, academic records, and evaluations without per-student queries.
- The analytics view reports classifications, religion, record counts, subject counts, academic status, evaluation status, and major-subject GWA from MongoDB.
- The analytics table retrieves 25 students per page and provides previous/next controls across the complete institution dataset.
- Student, faculty, and administrator reports share the same server-side major-subject GWA calculation.

### Authentication and account security

- Every protected request verifies the JWT, stored session, current user record, and current account status.
- Role and username are refreshed from the database so account changes take effect without waiting for JWT expiration.
- Suspended and inactive accounts cannot continue using an existing session.
- Google sign-in checks account status in every account-linking branch.
- Invalid Google credentials produce a controlled authentication response rather than exposing internal errors.
- Password resets, role changes, suspension, and deactivation revoke active sessions.
- `GET /api/auth/session` restores only a currently valid, active, non-revoked session.
- The client waits for backend session validation before rendering any role dashboard and clears invalid saved tokens.
- An authenticated runtime smoke test confirmed login (`200`), session restoration (`200`), logout (`200`), and rejection of the revoked token (`401`); the temporary account was removed afterward.

### User and student integrity

- `Student.userId` remains required and is unique.
- Student roles and institution IDs cannot be changed through generic account editing.
- Faculty and administrator roles can be updated by an authorized administrator.
- Failed student-profile creation removes the partially created user account.
- Student name changes made through account management synchronize to the linked student profile.

## Verification

The following checks passed on 2026-09-27:

```text
server: npm test
server: node --check for every JavaScript file
client: npm run lint
client: npm run build
repository: git diff --check
```

The backend suite contains focused tests for session/account-status enforcement and student-profile validation.

The academic-history runtime check confirmed `student.test` login (`200`), own report access (`200`), exact period separation and GWA values, unauthenticated rejection (`401`), denial on the arbitrary institution-ID report route for a student (`403`), and continued faculty/admin report access (`200` each).

Production dependency audits report zero known vulnerabilities for both the server and client. The backend `qs` transitive dependency was updated to `6.16.0` to resolve two moderate denial-of-service advisories.

The configured MongoDB database was reachable on 2026-09-27. `npm run db:indexes` completed successfully after duplicate detection, and read-only verification confirmed both the unique `Student.userId` index and the unique student/academic-year/semester index are present.

The Express server was started against the configured environment on 2026-09-27. It connected to MongoDB, returned HTTP 200 from `/api/health`, and rejected an unauthenticated `/api/users` request with HTTP 401. The health endpoint now returns HTTP 503 with a degraded state when MongoDB is unavailable.

An authenticated API smoke test also passed using an isolated temporary administrator: password login, protected user listing, protected institutional reporting, and logout all succeeded. Cleanup removed the temporary account and its sessions, and a follow-up query confirmed no temporary smoke-test users remained. The existing database account was not modified.

## Known remaining work

- Remove obsolete mock-data components and local context mutations after confirming no remaining runtime consumers outside user-management compatibility state.
- Perform live end-to-end tests with MongoDB and valid institutional Google credentials.
- Design offline local MongoDB operation and Atlas synchronization; synchronization is not implemented.

No `.env` files or credentials are included in source control.
