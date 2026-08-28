# Student Enrollment & Academic Status Management System

SEASMS is a role-based React client for student profiling, academic records,
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
