# A105-A107 REPORT

## Status

COMPLETE. Scope restricted to A105-A107; no UI redesign or GWA-rule changes.

## A105

- Root cause: account status changes wrote User only; Student creation also relied on its active default even when User was inactive.
- Fix: mirror User.accountStatus on student creation, account editing, and the dedicated status endpoint. Faculty/admin operations never create Student mirrors.
- MongoDB result: local `sapes_dev` contained 9 linked students. Five Student documents lacked status; all five now match their linked User. A second backfill updated zero records, and a final dry run found zero differences.
- Session result: controlled real-MongoDB tests verified deactivation rejects login and revokes existing sessions; reactivation mirrors active status and permits a fresh login. User remains the authentication source of truth. Profile and academic data were preserved.

## A106

- Root cause: names were already nested in Student.personalInformation, but administrator profile edits did not update linked User names.
- Final paths: `Student.institutionId` with `Student.personalInformation.firstName`, `middleName`, `lastName`, and `suffix`. No redundant fullName/studentName fields added. User supports firstName/lastName; middleName/suffix stay in Student.
- Creation: admin-created Student receives User first/last names, linkage, institutional ID, and initial account status.
- Updates: account-editor name updates synchronize Student; admin profile first/last-name edits synchronize the linked student User. Blank account names are rejected to prevent disagreement with required profile names. Identity/linkage remain protected.
- Backfill: only missing/blank first/last names are filled from linked User; existing names, middle name, suffix, and academic data are preserved. All 9 existing students already had first/last names, so zero live name fields changed. Controlled missing-name fixtures verified actual database fill behavior and idempotence.

## A107

- Browser verified student search/select, existing periods, new academic year/semester, add/edit/remove subjects, units/grades/major flag, save, full page reload, and matching GWA.
- Real MongoDB/API tests verified term upserts, distinct period records, persistent subject changes, and unchanged Student profile/status after academic updates.
- Unique student/year/semester index rejects direct duplicate insertion; API re-saving the same period updates one existing record.
- Duplicate subject codes, invalid units/grades, malformed subject data, and unsupported fields are rejected.
- Controlled first-term grades 1.25 and 1.50 produced Major GWA 1.38. Browser-created term with a four-unit Major subject graded 1.50 retained GWA 1.50 after reload.
- Backend role matrix: Admin allowed; Faculty and Student denied with 403; unauthenticated denied with 401 for deactivation, staff profile edits, and academic-record edits.
- Persisted audit events verified: USER_STATUS_UPDATED, UPDATE_STUDENT_PROFILE, ACADEMIC_RECORD_SAVED. No passwords, tokens, or complete sensitive payloads were logged by these changes.

## Database Changes

- Schema: none.
- Backfill: `node server/scripts/backfillStudentIdentity.js` defaults to dry-run; append `--apply` to write. It skips unlinked/non-student accounts, updates existing documents only, and uses field-value guards to avoid overwriting concurrent Student edits.
- Application records: 9 inspected, 5 status fields updated, zero name fields updated. Second apply: zero changes.
- Controlled integration data used separate `sapes_a105_107_*` local databases, retained separately; existing grades/accounts were not used for destructive tests.
- Index definitions unchanged; required unique indexes verified using `db:indexes`.

## Tests

| Command/check | Result |
|---|---|
| npm --prefix client run lint | PASS, zero diagnostics |
| npm --prefix client run build | PASS |
| npm --prefix server test | PASS, 51 tests; zero failures/skips |
| npm --prefix server run db:indexes | PASS |
| Changed backend JavaScript syntax checks | PASS |
| git diff --check | PASS |
| MongoDB/API checks | PASS, 10 scenario groups |
| Browser workflow checks | PASS, 4 groups |
| Backfill apply, repeat apply, final dry-run | PASS: 5 updates, 0 updates, 0 candidates |
| git status | Reviewed; only task files included in commit |

Seven focused regression tests added; existing account-creation test extended to assert initial inactive status and name fields.

## Files Changed

| File | Reason |
|---|---|
| server/routes/userRoutes.js | Mirror student status at creation and both update endpoints; reject blank names |
| server/routes/studentRoutes.js | Synchronize admin profile first/last-name edits to linked User |
| server/scripts/backfillStudentIdentity.js | Safe dry-run/apply, missing-name fill and status reconciliation |
| server/test/adminStudentSync.test.js | Seven focused status/name/backfill/academic-isolation regressions |
| server/test/userCreation.test.js | Verify new Student name fields and initial status |
| A105_A107_REPORT.md | Record fixes and verification evidence |

## Final Verdict

A105: PASS.

A106: PASS.

A107: PASS.

## Remaining Issues

No remaining gaps found within A105-A107. An already-running backend must be restarted to load the updated routes; tests used a freshly started isolated backend. No unrelated requirements were changed.
