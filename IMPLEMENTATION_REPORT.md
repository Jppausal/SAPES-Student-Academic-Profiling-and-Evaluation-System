# SAPES Implementation Report

Updated: 2026-09-27

## Implemented in the current work

### Student profile requirements T104-T106

- Students update personal information, classification, and religion through `PUT /api/me/student/profile`.
- Student identity is resolved from the authenticated user; the endpoint does not accept a client-selected student ID.
- Classification supports IP, PWD, shifter, and transferee flags.
- The student dashboard displays all structured classification flags.
- A shared validator rejects protected sections, unsupported nested fields, invalid types, oversized strings, and invalid dates.

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

### Authentication and account security

- Every protected request verifies the JWT, stored session, current user record, and current account status.
- Role and username are refreshed from the database so account changes take effect without waiting for JWT expiration.
- Suspended and inactive accounts cannot continue using an existing session.
- Google sign-in checks account status in every account-linking branch.
- Invalid Google credentials produce a controlled authentication response rather than exposing internal errors.
- Password resets, role changes, suspension, and deactivation revoke active sessions.

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

## Known remaining work

- Replace the remaining browser-local institutional reporting views with authoritative backend data.
- Perform live end-to-end tests with MongoDB and valid institutional Google credentials.
- Design offline local MongoDB operation and Atlas synchronization; synchronization is not implemented.

No `.env` files or credentials are included in source control.
