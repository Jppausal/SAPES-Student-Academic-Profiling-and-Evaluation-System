# Account status reconciliation — 2026-10-14

Investigated a reported suspended account whose linked Student document still displayed active.

- Confirmed the affected record in the database selected by `ATLAS_URI`, database `test`. It was absent from the separate `MONGO_URI` local development database.
- The authoritative User document was suspended, with an October 8 update timestamp. The linked Student mirror was still active.
- Current user status routes already synchronize the mirror. No route or permission changes were needed; the exact historical write path that left the mismatch was not established.
- Repaired only the reported Student document's accountStatus, after confirming its linked User was suspended. Used a conditional filter on document ID, user linkage, and previous active status.
- Read back and compared the complete document: accountStatus now matches suspended, and every other field is unchanged.
- Ran `node --test server/test/adminStudentSync.test.js server/test/authMiddleware.test.js`: 11 passed, 0 failed. These cover synchronization and rejection of suspended sessions.

Operational note: `server/server.js` currently connects using ATLAS_URI (with LOCAL_MONGO_URI fallback), while several scripts use MONGO_URI. Verify the running server's configured database before inspecting or repairing data; local-script results do not establish the Atlas state.
