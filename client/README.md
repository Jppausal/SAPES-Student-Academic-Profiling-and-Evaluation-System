# Student Enrollment & Academic Status Management System

SAPES is a role-based React client for student profiling, academic records,
faculty evaluation, and registrar administration. It uses the Express API in
the sibling `server` directory.

## Run Locally

**Prerequisites:** Node.js 20 or newer


1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` if the API is hosted somewhere other than `http://localhost:5000`.
3. Start the API from the sibling directory: `cd ../server; npm start`
4. Start the client: `npm run dev`

The Vite development server proxies `/api` requests to `http://localhost:5000`.
The current client uses seeded local storage data while the server API is being
expanded beyond its health endpoint.

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
