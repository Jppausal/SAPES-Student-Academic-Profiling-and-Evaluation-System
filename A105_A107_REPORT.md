# Historical A105-A107 report

This document records work performed against an earlier database design and is retained only as historical context. Its claims about a shared `User` model, linked student documents, status mirroring, database backfills, local databases, and previous test results no longer describe the current project. Do not use it as a deployment guide or as evidence of the current cloud database state.

The current implementation uses Atlas database `sapes_dev` exclusively. Admin, faculty, and student authentication data live in `admin users`, `faculty users`, and `student users`, respectively. A student's account and profile are one document in `student users`; no linked shared-user record or identity backfill is used. See [README.md](./README.md) and [server/utils/database.js](./server/utils/database.js) for current setup details.
