# SAPES — Student Academic Profiling and Evaluation System

A secure web-based student academic profiling system for the College of Technologies,
developed by EnTech-T.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [First-Time Setup](#first-time-setup)
4. [Configuring MongoDB](#configuring-mongodb)
5. [Running the Application](#running-the-application)
6. [Verifying the Setup](#verifying-the-setup)
7. [Running Tests](#running-tests)
8. [Seeding Development Data](#seeding-development-data)
9. [Building for Production](#building-for-production)
10. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 18.x or later | LTS recommended |
| npm | 9.x or later | bundled with Node.js |
| MongoDB | 6.x or later | local, or use Atlas |
| Git | any recent | for cloning |

> **Note:** The React frontend communicates with the backend exclusively via the REST API. React must never connect directly to MongoDB.

---

## Project Structure

```
SAPES/
├── client/          # Vite + React + TypeScript frontend
│   ├── src/
│   ├── .env.example
│   └── package.json
├── server/          # Express + Mongoose backend
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── scripts/
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd SAPES-Student-Academic-Profiling-and-Evaluation-System
```

### 2. Install server dependencies

```bash
npm --prefix server install
```

### 3. Install client dependencies

```bash
npm --prefix client install
```

### 4. Create server environment file

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in all required values.
**Do not commit `server/.env` to version control.**

### 5. Create client environment file

```bash
cp client/.env.example client/.env
```

Open `client/.env` and fill in your `VITE_GOOGLE_CLIENT_ID`.
**Do not commit `client/.env` to version control.**

---

## Configuring MongoDB

### Option A — Local MongoDB (default for solo development)

Ensure MongoDB is running locally. The default connection string in `.env.example` is:

```
MONGO_URI=mongodb://localhost:27017/sapes_dev
```

### Option B — MongoDB Atlas (recommended for group development)

Replace `MONGO_URI` in `server/.env` with your Atlas connection string:

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/sapes_dev?retryWrites=true&w=majority
```

- Each developer keeps their own `server/.env` and must not commit it.
- A shared Atlas cluster gives all group members a common development database.
- Local-to-Atlas synchronization is **not implemented** — use Atlas directly.

### Synchronize database indexes

After configuring MongoDB, run once (and after any schema changes):

```bash
npm --prefix server run db:indexes
```

---

## Running the Application

### Start the backend

```bash
npm --prefix server start
```

The server starts at `http://localhost:5001` (or the port in your `.env`).

### Start the frontend

```bash
npm --prefix client run dev
```

The Vite dev server starts at `http://localhost:5173` (default).

---

## Verifying the Setup

Confirm the backend is running and connected to MongoDB:

```
GET http://localhost:5001/api/health
```

Expected response (connected):
```json
{ "status": "ok", "database": "connected" }
```

---

## Running Tests

### Server tests (unit + integration)

```bash
npm --prefix server test
```

Expected: **44 tests pass, 0 failures** (as of the current baseline).

### Client type-check (lint)

```bash
npm --prefix client run lint
```

Expected: **0 TypeScript diagnostics**.

---

## Seeding Development Data

The following seed scripts populate the development database with test records.
Run them only against a development or test database — never against production data.

```bash
# Seed initial admin, faculty, and student accounts
npm --prefix server run seed

# Seed test academic records for existing student accounts
npm --prefix server run seed:student-test-records

# Seed BSIT curriculum students and academic records
npm --prefix server run seed:bsit-students
```

---

## Building for Production

```bash
npm --prefix client run build
```

The production bundle is output to `client/dist/`.
Serve `client/dist/` as static files, or configure your server to serve it.

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `PORT` | No | Backend port (default: 5001) |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (min 32 chars recommended) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (e.g. 587) |
| `SMTP_SECURE` | For email | `true` for port 465, `false` for STARTTLS |
| `SMTP_USER` | For email | SMTP authentication username |
| `SMTP_PASSWORD` | For email | SMTP authentication password |
| `SMTP_FROM` | For email | From address for outgoing emails |

> SMTP variables are required for password-reset email delivery. If not configured, email sending will fail and the password-reset flow will not complete.

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID (same as server) |
| `VITE_API_URL` | No | Backend base URL; leave blank to use same-origin default |
