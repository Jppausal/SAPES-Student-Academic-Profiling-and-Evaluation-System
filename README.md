# SEASMS
A secure web-based student enrollment system for the College of Technologies developed by EnTech-T

## Local development

### Prerequisites

- Node.js 20 or later and npm
- Access to the configured MongoDB Atlas cluster

### Setup

From the repository root, install the root, client, and server dependencies:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

Create the server environment file by copying `server/.env.example` to `server/.env`, then set `MONGO_URI` to a database you can access and replace `JWT_SECRET` with a random development secret. Do not commit `.env` files or share database credentials. If a MongoDB URI contains reserved characters in its username or password, URL-encode them (for example, `@` as `%40`).

The API is configured for MongoDB Atlas only and requires the database name `sapes_dev`. Make sure the cluster allows connections from your deployment/network and the database user has access to this database. Authentication reads admin accounts from `admin users`, faculty accounts from `faculty users`, and student accounts from `student users`.

If your network's DNS resolver cannot resolve MongoDB Atlas SRV records, set `MONGO_DNS_SERVERS` in your local `server/.env` to a comma-separated resolver list. The server otherwise uses the operating system's default DNS.

Google sign-in is optional. To use it locally, set `GOOGLE_CLIENT_ID` in `server/.env` and add the exact client origin you open (normally `http://localhost:3000`) to the OAuth client's **Authorized JavaScript origins** in Google Cloud Console. If this origin is not authorized, email/password sign-in still works, but Google sign-in reports an origin error.

Start the client and API together:

```bash
npm run dev
```

Open the **Local** URL printed by Vite (normally `http://localhost:3000`). If port `3000` is already in use, Vite selects another available port; use that printed URL or stop the other server and restart. The API listens on port `5001`; `http://localhost:5001/api/health` reports whether the database connection is ready. The API exits with a startup error if MongoDB cannot be reached or its credentials are rejected.

To check the client build, TypeScript types, and server tests:

```bash
npm run build
npm run lint --prefix client
npm test
```

To create development demo accounts for all three roles and sample student records in the configured cloud `sapes_dev` database, run:

```bash
npm --prefix server run seed:demo
```

Use these development-only credentials after seeding:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin.test` | `Test1234!` |
| Faculty | `faculty.test` | `Test1234!` |
| Student | `student.test` | `Test1234!` |

Run the demo seeder only against a development database. It creates sample users and academic data; do not use it on production data.

Account authentication and student profiles use only the role-specific Atlas collections `admin users`, `faculty users`, and `student users`. A student's profile and login account share one document in `student users`; the removed shared `users` collection is not queried or used as a fallback.
