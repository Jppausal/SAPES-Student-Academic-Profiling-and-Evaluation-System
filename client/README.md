# Student Enrollment & Academic Status Management System

SAPES is a role-based React client for student profiling, academic records,
faculty evaluation, and registrar administration. It uses the Express API in
the sibling `server` directory.

## Run Locally

**Prerequisites:** Node.js 20 or newer

From the repository root, follow the setup instructions in the root
[README](../README.md), including configuring `server/.env` with the MongoDB
connection string and JWT secret. Start the client and API together with:

```bash
npm run dev
```

The Vite development server proxies `/api` requests to the API on port `5001`.
For a separately hosted API, set `VITE_API_URL` in the client environment to the
API origin (for example, `https://api.example.com`). The client uses API-backed
authentication for admin, faculty, and student accounts.

## Build and test

From the repository root:

```bash
npm run build
npm run lint --prefix client
npm test
```

## Google Sign-In Setup

For local development, add the exact client origin to the Google OAuth client
in Google Cloud Console under **Authorized JavaScript origins**:

```text
http://localhost:3000
```

Add the deployed HTTPS origin there as well. The origin must match the browser
address exactly, including the scheme, hostname, and port. `origin_mismatch`
is a Google Console configuration error, so changing the React login code will
not resolve it.

Students can sign in with a verified account matching
`student-number@student.buksu.edu.ph`. SAPES uses the numeric email prefix as
the institution ID and creates the linked student record automatically on the
first successful sign-in.
