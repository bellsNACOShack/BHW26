# Interlog Backend API & Swagger UI

> **Digital SIWES Management and Verification Platform**  
> Built with Next.js (App Router API routes), Supabase PostgreSQL, WebAuthn Passkeys, SHA-256 cryptographic document locking, and interactive Swagger UI.

---

## 🌟 Key Features

1. **Role-Based SIWES Access Control**:
   - `student`: Placement registration, weekly log entries (Draft/Submit), SCAF tracking.
   - `workplace_supervisor`: Weekly review, comment, and passkey biometric signing.
   - `academic_supervisor`: University monitoring, academic sign-off, and review.
   - `administrator`: Institution-wide oversight, supervisor assignments, statistics.
   - `itf_verifier`: Public and portal verification of completed SIWES records.

2. **Core SIWES Workflow (PRD & Bell ITCU Flow)**:
   - Placement registration with Letter of Acceptance.
   - SCAF form status management (`pending` &rarr; `printed` &rarr; `submitted_to_itf` &rarr; `verified`).
   - Weekly logbook entries with Activities, Skills, Tools, Challenges, and Remarks.
   - Supervisor review (`approve` / `reject`).
   - Supervisor passkey digital signature & permanent SHA-256 integrity locking.
   - Automated SIWES completion verification code generation (`ITL-XXXXXXXX`).
   - Public verification endpoint for employers, ITF, and universities.

3. **Interactive Swagger UI**:
   - Hosted at `/docs` (and `/api/docs`).
   - Backed by OpenAPI 3.0 specification at `/api/openapi.json`.
   - "Authorize" button to test all authenticated endpoints with JWT Bearer tokens.
   - Live database connection status indicator.

---

## 🚀 Getting Started

### 1. Configure Environment Variables

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-jwt-secret-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Run Database Schema

Open your [Supabase Dashboard](https://supabase.com/dashboard) &rarr; **SQL Editor**, and run the entire SQL script from:
`supabase/schema.sql`

This creates:
- `users` & `student_profiles`
- `placements`
- `log_entries`
- `approvals`
- `signatures`
- `passkey_credentials`
- `audit_logs`
- `verifications`
- Performance indexes and timestamp triggers.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page or [http://localhost:3000/docs](http://localhost:3000/docs) for the interactive Swagger UI.

---

## 📡 API Endpoints Overview

| Category | Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- | :--- |
| **Diagnostics** | `GET` | `/api/health` | Check backend & Supabase connection | Public |
| **Auth** | `POST` | `/api/auth/register` | Register student, supervisor, admin, or verifier | Public |
| **Auth** | `POST` | `/api/auth/login` | Authenticate and obtain JWT token | Public |
| **Auth** | `GET` | `/api/auth/me` | Current authenticated user profile | Bearer |
| **Passkey** | `POST` | `/api/auth/passkey/register-challenge` | WebAuthn registration challenge | Bearer |
| **Passkey** | `POST` | `/api/auth/passkey/register-verify` | Register supervisor passkey credential | Bearer |
| **Placements** | `GET` | `/api/placements` | List placements for user / institution | Bearer |
| **Placements** | `POST` | `/api/placements` | Create student SIWES placement | Bearer (Student) |
| **Placements** | `GET` | `/api/placements/{id}` | Placement details and weekly logs | Bearer |
| **Placements** | `PUT` | `/api/placements/{id}` | Update placement details | Bearer |
| **Placements** | `PUT` | `/api/placements/{id}/assign` | Assign workplace & academic supervisors | Bearer (Admin) |
| **Placements** | `PUT` | `/api/placements/{id}/scaf` | Update SCAF submission status | Bearer |
| **Log Entries**| `GET` | `/api/logs` | List weekly log entries (with filters) | Bearer |
| **Log Entries**| `POST` | `/api/logs` | Create weekly log entry (in Draft status) | Bearer (Student) |
| **Log Entries**| `GET` | `/api/logs/{id}` | Single log entry details, review & signatures | Bearer |
| **Log Entries**| `PUT` | `/api/logs/{id}` | Update draft or rejected log entry | Bearer (Student) |
| **Log Entries**| `DELETE`| `/api/logs/{id}` | Delete draft log entry | Bearer (Student) |
| **Log Entries**| `POST` | `/api/logs/{id}/submit` | Submit draft entry for supervisor review | Bearer (Student) |
| **Review** | `POST` | `/api/logs/{id}/review` | Supervisor approve or reject entry | Bearer (Supervisor) |
| **Signing** | `POST` | `/api/logs/{id}/sign` | Apply passkey signature & lock with SHA-256 | Bearer (Supervisor) |
| **Verification**| `POST`| `/api/verifications/generate` | Generate verification code for completed SIWES | Bearer |
| **Verification**| `GET` | `/api/verifications/{code}` | Public verification check for ITF & employers | Public |
| **Audit** | `GET` | `/api/audit-logs` | Query tamper-evident audit records | Bearer (Admin) |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Aggregated metrics for student, supervisor, admin | Bearer |
| **Docs** | `GET` | `/api/openapi.json` | OpenAPI 3.0 specification | Public |

---

## 🧪 Testing the SIWES Lifecycle via Swagger UI

1. Go to `http://localhost:3000/docs`.
2. Expand `POST /api/auth/register` and create a `student` user.
3. Copy the returned `token`, click the green **Authorize** button at the top, and paste the token (`Bearer <token>`).
4. Call `POST /api/placements` to register an internship placement.
5. Call `POST /api/logs` to draft a Week 1 entry.
6. Call `POST /api/logs/{id}/submit` to submit the entry for supervisor review.
7. Register or log in as `workplace_supervisor`, authorize with their token.
8. Call `POST /api/logs/{id}/review` to approve.
9. Call `POST /api/logs/{id}/sign` to digitally sign and lock the record with a SHA-256 hash.
10. Call `POST /api/verifications/generate` to issue a completion code.
11. Call `GET /api/verifications/{code}` without auth to verify record validity and cryptographic integrity!
