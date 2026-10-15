# A108-A111 verification

Status: COMPLETE. Verified 2026-10-14 against current code, an isolated local MongoDB database, and the running frontend in headless Edge.

## Changes

- Added a read-only **Consolidated Report** tab to the existing admin academic-record workspace. Search/select a student, then open this tab.
- Displays identity, course/program, year level, classifications, authorized religion, current standing, academic periods and subjects, overall/major GWA, status history, and faculty evaluation status/reasons/remarks/author/date.
- Uses the existing `GET /api/students/:institutionId/report`; no new database, endpoint, schema, GWA formula, or permission changes.
- Added optional status remarks to the existing status editor; loads saved remarks and clears the previous reason after refresh/save.
- Extended frontend types to reflect existing report fields.
- Added three backend regression tests for report contents, empty/missing records, and access restrictions.

## A108

Probation, Leave, and Dropped use `academicStatus.currentStatus`; probation additionally sets `isOnProbation`. Shifter and Transferee remain separate classification booleans. Existing profile checkboxes and status endpoint support these values.

Controlled API writes confirmed all three statuses persist, probation flag clears for Leave/Dropped, history preserves reasons/remarks, and audit entries are created. Identity, user linkage, account status, profile, and classification remained unchanged by status updates. Browser status edits and remarks survived reload and appeared in consolidated history.

## A109

Existing admin editor maintains academic year, semester, code, name, units, grade, major flag, and subject status. Controlled saves and reloads yielded expected major GWAs of 1.50, 1.71, and 1.50 after grade/unit/major-flag edits. Same-period saves updated one record. Audit entries persisted; student profile stayed intact.

Duplicate subject codes, zero units on new writes, and invalid grades returned 400. Existing formula tests cover exclusion of legacy zero-unit, ungraded, and dropped subjects. No calculation changes were needed.

## A110/A111

Existing MongoDB-backed report already returned the required data; the missing admin presentation is now implemented. Browser checks confirmed profile, subjects, period GWA, status history, and faculty evaluation were visible together. Empty academic/history/evaluation sections and missing-student errors passed.

Evaluation data comes from `FacultyEvaluation`, linked to the selected student. Metadata includes faculty username and evaluation date. This model records a current student-level evaluation, not a period-specific evaluation; the interface explicitly states that scope. Admin has no evaluation editing controls and its evaluation PUT returns 403.

## Authorization verified

| Operation | Admin | Faculty | Student | Unauthenticated |
| --- | --- | --- | --- | --- |
| Update academic status | Allowed | Allowed | 403 | 401 |
| Maintain academic record | Allowed | 403 | 403 | 401 |
| Read shared student report/evaluation | Allowed | Allowed, restricted profile projection | 403 | 401 |
| Edit faculty evaluation | 403 | Allowed | 403 | 401 |

Existing role and permission middleware remains authoritative. Admin report reads require `view_reports` or `view_student_records`; faculty uses the existing shared report with religious details removed. Student self-report permissions are unchanged.

## Verification

| Check | Result |
| --- | --- |
| `npm --prefix client run lint` | PASS |
| `npm --prefix client run build` | PASS |
| `npm --prefix server test` | PASS: 54 tests, 0 failed |
| `npm --prefix server run db:indexes` | PASS: required indexes present |
| `node --check server/test/adminConsolidatedReport.test.js` | PASS |
| `git diff --check` | PASS |
| Controlled MongoDB/API acceptance | PASS: 4 groups covering A108-A111, validation, audit, integrity, and role matrix |
| Headless Edge acceptance | PASS: 5 groups covering consolidated data, remarks, reload, empty and not-found states |

Test accounts and writes were confined to isolated development databases. No existing student records were changed. Temporary test credentials were removed after verification. No remaining gaps identified within A108-A111.
