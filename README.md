# Inter.log

> **Digital SIWES documentation, verification, assessment and archival platform**
> Next.js (App Router pages + API routes) · Supabase PostgreSQL · WebAuthn passkey signatures · SHA-256 tamper-evident locking · Swagger UI.

Inter.log replaces the paper SIWES logbook. A student's logbook is one digital record that moves through every stakeholder in the order the real process requires:

```
Student → Industry supervisor → ITF officer → Academic supervisor → Department → ITF archive
```

Each stage signs or records its decision against the same record, so the chain of custody is never broken and the logbook is never copied.

---

## Contents

1. [Roles](#-roles)
2. [The SIWES flow, end to end](#-the-siwes-flow-end-to-end)
3. [Logbook rules](#-logbook-rules)
4. [Logbook lifecycle states](#-logbook-lifecycle-states)
5. [Access control](#-access-control)
6. [Signatures, integrity and history](#-signatures-integrity-and-history)
7. [Notifications](#-notifications)
8. [Getting started](#-getting-started)
9. [Testing the workflow](#-testing-the-workflow)
10. [API endpoints](#-api-endpoints)
11. [Data model](#-data-model)
12. [Frontend](#%EF%B8%8F-frontend)
13. [Known limitations](#-known-limitations)

---

## 👥 Roles

| Role (code) | Shown as | Responsibilities | Main screens |
| :--- | :--- | :--- | :--- |
| `student` | Student | Registers the placement, submits the SCAF, writes the daily logs, sends the logbook through each stage | Dashboard, Logbook, Diagrams, Placement |
| `workplace_supervisor` | Workplace (industry) supervisor | Approves and passkey-signs each week; the **only** role that signs weekly entries | Dashboard, Reviews, Students |
| `itf_verifier` | ITF officer | Reviews SCAFs and logbooks routed to **their ITF office**; approves and signs, or rejects with a mandatory reason | Dashboard, SCAF submissions, Logbook requests, Students, Audit logs, Verify a record |
| `academic_supervisor` | Academic supervisor | Reviews the ITF-approved logbook, grades the student and signs | Dashboard, Assessments, Students, Audit logs |
| `departmental_coordinator` | Departmental SIWES coordinator | Receives completed logbooks for their department, keeps them for assessment and defense, submits them to the ITF archive | Dashboard, Department logbooks, Students, Audit logs |
| `administrator` | Administrator | Institution-wide oversight; can act at any stage | Dashboard, Reviews, Placements, Audit logs, Verify a record |

Everyone signs up at `/signup`, which uses the same authentication for every role. Sign-up asks for different details depending on the role:

- **Students:** matric number, institution, department and program.
- **ITF officers:** the ITF office they work at.
- **Coordinators:** their institution and department. These must be spelled the way their students spell them; matching ignores capitalisation.

---

## 🔁 The SIWES flow, end to end

### 1. Placement and ITF office routing
The student adds their placement on **Placement**: the organization, its address, its **state**, the training dates and an optional acceptance-letter link.

The organization's state routes the placement to that state's **ITF area office**: Student → SIWES organization → ITF office → ITF officer(s). The form previews which office it will go to. The state can only change until the SCAF or logbook has been sent to ITF.

The student then pastes their supervisors' IDs. Each supervisor copies their ID from their dashboard. The API rejects an ID that belongs to the wrong role, for example a student's ID in the industry-supervisor slot.

### 2. SCAF (Student Commencement Attestation Form)
On **Placement → SCAF form** the student fills in the digital SCAF. Their profile and placement details are attached automatically. They can save a draft and then **Submit to ITF**.

| SCAF status | Meaning |
| :--- | :--- |
| Draft | Saved, not yet sent. ITF can't see drafts |
| Submitted | Sent to the routed ITF office |
| Under review | An ITF officer has opened it |
| Approved | ITF verified it (the placement's SCAF badge shows **Verified**) |
| Requires correction | Returned with a mandatory comment; the student edits it and resubmits |

ITF officers work from **SCAF submissions** (`/itf/scaf`) and the SCAF review screen (`/itf/scaf/{id}`).

### 3. Weekly logbook (student ↔ industry supervisor)
1. Each week the student logs every day (see the [Logbook rules](#-logbook-rules)), saves drafts, and submits the week for review.
2. The **industry supervisor** reviews the week under **Reviews**. They either approve it or return it with a comment.
3. The industry supervisor then **signs** the approved week with a passkey. Signing locks the week permanently with a SHA-256 hash.

### 4. ITF review and signing
Once every week of the placement has been signed, the student uses **Logbook → Logbook verification → Submit logbook for ITF review**. The request goes to the officers of the routed ITF office (**Logbook requests**, `/itf/logbooks`).

The ITF officer opens the full logbook (`/logbooks/{id}`). There they see every week, the industry supervisor's comments and signatures, and the verification history. Then they do one of two things:

- **Approve & sign.** A passkey signature seals a hash of the whole logbook, and the stage becomes *ITF approved*.
- **Reject.** A **reason is mandatory**; both the screen and the API refuse an empty reason.
  - The officer can also tick weeks to **reopen**. Reopened weeks go back to the student to correct, and the industry supervisor has to approve and sign them again.
  - Earlier signatures stay in the history.
  - The student sees the reason on their Logbook page and in a notification, makes the corrections, and **resubmits to ITF**.

### 5. Academic review, grading and signing
After ITF approval the student uses **Submit for academic review**. It goes to their assigned academic supervisor (**Assessments**, `/assessments`). The supervisor:

1. Reviews the logbook, including the industry and ITF verification. They can't change any weekly entry.
2. Enters a **score out of 100**, which is converted to a letter grade (**A** 70+, **B** 60–69, **C** 50–59, **D** 45–49, **E** 40–44, **F** below 40), plus optional remarks. The grade can be changed until the supervisor signs.
3. **Signs with their passkey.** Signing locks the grade and completes the academic stage.

### 6. Final departmental submission
The student uses **Submit final logbook to department**. A warning tells them it is a permanent, final submission.

The department's coordinator gets the logbook under **Department logbooks** (`/department`). Opening it records **Received by department**. From then on the logbook is part of the department's records for assessment and defense, with all signatures, the ITF approval, the academic grade and the full history visible. The coordinator can't change any of it.

### 7. ITF archive
After the departmental assessment, the coordinator uses **Submit to ITF archive** (with a confirmation). This is the final stage: the logbook is marked **Archived** and the placement **Completed**.

The final record shows every stage as complete: Industry supervisor ✓ · ITF officer ✓ · Academic supervisor ✓ · Department ✓ · ITF archive ✓.

### Verification codes
At any time, the student, an academic supervisor or an administrator can issue a verification code and QR code (`ITL-XXXXXXXX`). Employers, the institution and ITF can check it at `/verify/{code}` without an account.

---

## 📅 Logbook rules

All "today" checks use **Nigerian time (Africa/Lagos)** in both the browser and the API, so the two always agree. The rules live in `src/features/logbook/lib/weeks.ts` and `src/features/placements/lib/dates.ts`, and the API enforces them as well as the UI.

**Placement dates** (checked when the placement is created):
- The end date can't be before today.
- The end date must be at least **4 weeks (28 days)** after the start date.
- The start date may be in the past, so students who register mid-placement can still use the platform.

**Weeks run Monday to Saturday:**
- **Week 1** runs from the start date to that Saturday. For example, a Thursday 1 Oct start gives a Thu–Sat first week.
- Every later week runs Monday to Saturday. The last week stops at the end date.
- A start on Saturday or Sunday begins week 1 on the following Monday.
- Sunday is never a logging day. On a Sunday, the current week is the one that just ended.
- **Saturday is optional.** It can be logged, but it never blocks a submission.

**What can be edited, and when:**
- **Future weeks** can't be opened or created.
- **Future days** are read-only and show when they open, e.g. "Opens 5 Oct 2026". You can't log Friday on Monday.
- The **week summary** (skills, tools, challenges, remarks) and the week diagram can be edited once the week has started.
- **Past weeks** stay editable while they are *Draft* or *Needs revision*. Submitted, approved and locked weeks can't be edited.
- A week can be **submitted** once its last weekday (normally Friday) has arrived.

**SIWES progress:** the dashboard shows *Week N of M* based on today's date. Its progress bar counts approved weeks.

---

## 🧭 Logbook lifecycle states

The stage lives on `placements.logbook_stage`. All transitions go through `POST /api/placements/{id}/logbook`, which checks the role, the stage and the ownership of every action.

```
in_progress
  └─ submit_itf (student, every week signed) ─────────────► itf_submitted
                                                              └─ itf_open (ITF, on first view) ─► itf_review
itf_submitted / itf_review
  ├─ itf_approve (ITF, passkey) ──────────────────────────► itf_approved
  └─ itf_reject (ITF, reason required, may reopen weeks) ─► itf_rejected ─ submit_itf (resubmit) ─► itf_submitted
itf_approved
  └─ submit_academic (student) ───────────────────────────► academic_submitted
                                                              └─ academic_open (on first view) ─► academic_review
academic_submitted / academic_review
  ├─ academic_grade (academic, 0–100, repeatable) ─────────► academic_review
  └─ academic_sign (academic, passkey, needs a grade) ─────► academic_completed
academic_completed
  └─ submit_department (student, confirm: true) ──────────► department_submitted
                                                              └─ department_receive (on first view) ─► department_received
department_received
  └─ archive (coordinator) ───────────────────────────────► archived   (placement status → completed)
```

Weekly entries keep their own status: `draft → submitted → approved → locked`, or `rejected` when returned for revision.

---

## 🔐 Access control

Every API route checks access on the server (`src/lib/access.ts`). The frontend's role gates only decide what to show.

| Role | Can access |
| :--- | :--- |
| Student | Only their own placement, entries and SCAF |
| Industry supervisor | Placements where they are the workplace supervisor |
| Academic supervisor | Placements where they are the academic supervisor |
| ITF officer | Placements and SCAFs routed to **their ITF office** (never SCAF drafts) |
| Departmental coordinator | Students whose institution + department match theirs |
| Administrator | Everything |

This scoping applies to the placement lists and details, log entries, the SCAF, audit logs, verification and the dashboard stats.

On top of that scoping, each action has its own check:
- Only the industry supervisor (or an admin) can review and sign weeks.
- Only the assigned academic supervisor can grade and sign.
- Only students can submit their own records.
- The manual SCAF status override is admin-only.

---

## 🔏 Signatures, integrity and history

- **Weekly signatures:** the industry supervisor signs each approved week with a passkey. The entry is hashed (SHA-256), locked, and recorded in `signatures` with `stage = 'industry'`.
- **Logbook signatures:** the ITF officer and the academic supervisor sign the whole logbook with the **same passkey flow**. Each signature stores a hash of the placement plus every week's locked hash (`computeLogbookHash` in `src/lib/hash.ts`), so any later change to a signed week no longer matches the signature. These rows have `stage = 'itf'` or `'academic'`.
- **Verification history:** `logbook_events` records every stage change with the person who made it, the time, and any comments (e.g. the ITF rejection reason). Everyone who can access the logbook sees it.
- **Audit log:** every action is also written to `audit_logs`. Staff with audit access see it, scoped to the records they can access.

Users register passkeys from their dashboard. Industry supervisors, ITF officers, academic supervisors and admins all have the **Biometric signing** card there.

---

## 🔔 Notifications

Notifications are stored in the `notifications` table and shown under the bell in every page header. The list refreshes every minute.

| Who | Is notified when |
| :--- | :--- |
| Student | SCAF submitted / approved / needs correction · logbook sent to ITF · ITF approval · ITF rejection (with the reason and any reopened weeks) · sent to academic supervisor · grade recorded · academic signature · department submission / receipt · archived · a week returned for revision |
| Industry supervisor | A week is submitted for review · ITF reopened weeks that need re-signing |
| ITF officer | New SCAF · corrected SCAF resubmitted · new logbook request · corrected logbook resubmitted · logbook archived |
| Academic supervisor | New logbook review request |
| Departmental coordinator | New completed logbook submitted by a student |

---

## 🚀 Getting started

### 1. Environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-jwt-secret-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database

In the [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, run these **in order**:

1. `supabase/schema.sql`: users, student profiles, placements, log entries, approvals, signatures, passkeys, audit logs, verifications.
2. `supabase/migrations/002_siwes_lifecycle.sql`: the departmental coordinator role, ITF offices (one per state, seeded), staff scope columns, placement state / ITF office / lifecycle stage, SCAF submissions, logbook events, academic assessments, logbook-level signatures and notifications.

The migration can be run more than once safely. **The app needs it.** Without it, placement and SCAF pages fail because the new columns don't exist.

### 3. Run

```bash
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000). It signs you in, then goes to `/dashboard`.
- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 🧪 Testing the workflow

### Automated end-to-end test

With the dev server running:

```bash
npm run test:lifecycle                       # against http://localhost:3000
node scripts/test-siwes-lifecycle.mjs --keep # keep the test accounts for manual UI checks
node scripts/test-siwes-lifecycle.mjs --base=http://localhost:3100
```

`scripts/test-siwes-lifecycle.mjs` creates a throwaway account for every role and runs the whole chain through the API. It covers:

- **SCAF:** draft → submit → correction → resubmit → approve.
- **Weeks:** four weeks logged, approved and signed.
- **ITF:** submission, rejection with a reopened week, correction, re-signing, resubmission, then approval and signing.
- **Academic:** grading and signing.
- **Department and archive:** submission, receipt and archive.
- **Expected failures:**
  - rejecting without a reason;
  - signing before grading;
  - a score above 100;
  - submitting before every week is signed;
  - another ITF office or department trying to access the record;
  - editing a locked week;
  - the wrong role in a supervisor slot.

It also checks the final record (Industry ✓ · ITF ✓ · Academic ✓ · Department ✓ · Archive ✓), the notifications and the audit trail.

The only direct database write is moving the test placement's dates into the past so every week can be logged today. The accounts are deleted at the end unless you pass `--keep`, in which case the password is `Test-pass-123`.

### Manually in the UI

1. Sign up one account per role. Give the coordinator the same institution and department as the student, and give the ITF officer the office for the state you'll use on the placement.
2. **Student:** add the placement, then paste the industry and academic supervisor IDs from their dashboards. Fill in and submit the SCAF.
3. **ITF officer:** approve the SCAF under **SCAF submissions**.
4. **Student:** log and submit weeks. **Industry supervisor:** approve and sign each one under **Reviews**.
5. **Student:** Logbook → **Submit logbook for ITF review**.
6. **ITF officer:** **Logbook requests** → open the logbook. Reject it with a reason, or approve and sign it.
7. **Student:** **Submit for academic review**. **Academic supervisor:** **Assessments** → grade, then sign.
8. **Student:** **Submit final logbook to department**. **Coordinator:** **Department logbooks** → open the logbook (this records receipt) → **Submit to ITF archive**.

Because of the date rules, a brand-new placement can't reach ITF until its weeks have actually happened. To try the later stages straight away, use the automated script with `--keep`.

### Via Swagger UI

`/docs` covers the original endpoints: auth, placements, log entries, review/sign and verification. Use **Authorize** with `Bearer <token>`. It doesn't yet document the lifecycle, SCAF or notification endpoints listed below.

---

## 📡 API endpoints

| Category | Method | Endpoint | Description | Who |
| :--- | :--- | :--- | :--- | :--- |
| Diagnostics | `GET` | `/api/health` | Backend & Supabase connection | Public |
| Auth | `POST` | `/api/auth/register` | Register any role (ITF officers need `itf_office_id`; coordinators need `institution` + `department`) | Public |
| Auth | `POST` | `/api/auth/login` | Sign in and get a JWT | Public |
| Auth | `GET` | `/api/auth/me` | Current user, incl. student profile, ITF office or department | Bearer |
| Passkeys | `POST` | `/api/auth/passkey/register-challenge` | WebAuthn registration challenge | Bearer |
| Passkeys | `POST` | `/api/auth/passkey/register-verify` | Store a passkey credential | Bearer |
| ITF offices | `GET` | `/api/itf-offices` | List ITF area offices | Public |
| Placements | `GET` | `/api/placements?logbook_stage=a,b` | Placements in scope, optionally by lifecycle stage | Bearer |
| Placements | `POST` | `/api/placements` | Create a placement (date rules, `organization_state` → ITF office) | Student, Admin |
| Placements | `GET` | `/api/placements/{id}` | Full logbook record: entries, events, signatures, grade, SCAF | Bearer (in scope) |
| Placements | `PUT` | `/api/placements/{id}` | Edit details / state (status: admin only) | Owner, Admin |
| Placements | `PUT` | `/api/placements/{id}/assign` | Assign supervisors (role-checked IDs) | Owner, assigned academic supervisor, Admin |
| Placements | `PUT` | `/api/placements/{id}/scaf` | Manual SCAF status override | Admin |
| Lifecycle | `POST` | `/api/placements/{id}/logbook` | Lifecycle action: `submit_itf`, `itf_open`, `itf_approve`, `itf_reject`, `submit_academic`, `academic_open`, `academic_grade`, `academic_sign`, `submit_department`, `department_receive`, `archive` | Per action |
| SCAF | `GET` | `/api/scaf?status=a,b` | SCAF submissions in scope | Bearer |
| SCAF | `POST` | `/api/scaf` | Save (`submit: false`) or submit the student's SCAF | Student |
| SCAF | `GET` | `/api/scaf/{id}` | One SCAF with student, placement and office | Bearer (in scope) |
| SCAF | `POST` | `/api/scaf/{id}/review` | `open`, `approve` or `request_correction` (comment required) | ITF officer, Admin |
| Log entries | `GET` | `/api/logs` | Entries in scope (filters: `placement_id`, `status`, `week_number`) | Bearer |
| Log entries | `POST` | `/api/logs` | Create a draft week (dates come from the placement) | Student |
| Log entries | `GET` | `/api/logs/{id}` | One entry with reviews and signatures | Bearer (in scope) |
| Log entries | `PUT` | `/api/logs/{id}` | Edit a draft / returned week (only days that have arrived) | Student |
| Log entries | `DELETE` | `/api/logs/{id}` | Delete a draft week | Student, Admin |
| Log entries | `POST` | `/api/logs/{id}/submit` | Submit a week (from its last weekday) | Student |
| Review | `POST` | `/api/logs/{id}/review` | Approve or return a submitted week | Industry supervisor, Admin |
| Signing | `POST` | `/api/logs/{id}/sign` | Passkey-sign and lock an approved week | Industry supervisor, Admin |
| Verification | `POST` | `/api/verifications/generate` | Issue a verification code + QR | Student, Academic supervisor, Admin |
| Verification | `GET` | `/api/verifications/{code}` | Public verification check | Public |
| Notifications | `GET` | `/api/notifications` | Latest notifications + unread count | Bearer |
| Notifications | `POST` | `/api/notifications/read` | Mark `ids` (or all) as read | Bearer |
| Audit | `GET` | `/api/audit-logs` | Audit records in scope | Admin, Academic, ITF, Coordinator |
| Dashboard | `GET` | `/api/dashboard/stats` | Role-specific counters | Bearer |
| Docs | `GET` | `/api/openapi.json` | OpenAPI 3.0 spec (original endpoints) | Public |

---

## 🗄️ Data model

The placement plus its `log_entries` is **the one authoritative logbook**. Later stages add to it but never copy it.

| Table | Purpose |
| :--- | :--- |
| `users` | Accounts and roles. ITF officers have `itf_office_id`; coordinators have `institution` and `department` |
| `student_profiles` | Matric number, institution, department, program, level |
| `itf_offices` | ITF area offices (one per state, seeded by the migration) |
| `placements` | The organization, its state and routed `itf_office_id`, the dates, both supervisors, the SCAF badge, and `logbook_stage` / `logbook_stage_updated_at` |
| `log_entries` | Weekly entries (daily logs, summary, diagram, status, record hash) |
| `approvals` | Week approvals and returns, including ITF reopen notes (`ITF: …`) |
| `signatures` | Passkey signatures: weekly (`log_entry_id`, `stage = industry`) or whole-logbook (`placement_id`, `stage = itf / academic`) |
| `scaf_submissions` | One digital SCAF per placement (details JSON, status, reviewer, comments) |
| `logbook_events` | The logbook's verification history (stage changes, comments, reopened weeks, grades) |
| `logbook_assessments` | The academic grade: score, letter grade, remarks, supervisor |
| `notifications` | In-app notifications per user |
| `audit_logs` | Tamper-evident record of every action |
| `verifications` | Issued verification codes and their sealed hashes |
| `passkey_credentials` | Registered WebAuthn credentials |

---

## 🖥️ Frontend

The web app lives in the same Next.js project and calls the API routes above.

**Stack:** shadcn/ui on Tailwind CSS · TanStack Query for server state · react-hook-form + zod for forms · `@simplewebauthn/browser` for passkey signing · `qrcode.react` for verification QR codes.

| Looking for… | Where |
| :--- | :--- |
| API calls | `src/features/<feature>/api/requests.ts` (or `api.ts`) |
| Types | `src/features/<feature>/types.ts` |
| TanStack Query hooks | `src/features/<feature>/hooks/` (query keys in `keys.ts`) |
| Domain rules shared with the API | `src/features/<feature>/lib/` (weeks, placement dates, lifecycle stages, SCAF fields, states) |
| Server-side access, routing, notifications | `src/lib/access.ts`, `src/lib/placements.ts`, `src/lib/notifications.ts` |
| shadcn primitives | `src/components/ui/` |
| Reusable UI | `src/components/atoms`, `molecules`, `organisms` |
| Page compositions | `src/components/pages/<Name>Page/` |
| Routes (thin) | `src/app/(auth)`, `src/app/(app)` (authenticated), `src/app/verify` (public) |

Features: `auth`, `placements` (incl. lifecycle and ITF offices), `logbook`, `scaf`, `notifications`, `passkeys`, `dashboard`, `verifications`, `audit`. Role-based UI comes from `src/features/auth/permissions.ts`, which mirrors the API's checks.

**Screens added for the lifecycle**

| Route | Who | What |
| :--- | :--- | :--- |
| `/placement` | Student | Placement, supervisors, **SCAF form**, verification code |
| `/logbook` | Student | **Logbook verification** card: progress tracker, ITF rejection reason, and the next action (submit to ITF / academic / department) |
| `/itf/scaf`, `/itf/scaf/{id}` | ITF officer | SCAF queue (To review / Approved / Requires correction) and review |
| `/itf/logbooks` | ITF officer | Logbook requests (Requests / Approved / Rejected / All students) |
| `/assessments` | Academic supervisor | Logbooks to review, sign and grade |
| `/department` | Coordinator | Received and archived departmental logbooks |
| `/logbooks/{id}` | ITF, academic, coordinator, admin | The full logbook: every week, signatures, grade, verification history and the role's action panel |

**How the UI maps onto the API**
- **Daily logs:** a week's Monday–Saturday logs are stored in the entry's single `activities` field as `## Monday` … `## Saturday` sections (`features/logbook/lib/daily-logs.ts`).
- **Week diagrams:** there's no file storage, so one diagram per week is stored as a compressed image data URL in `supporting_evidence_url` (`features/logbook/lib/diagram.ts`).
- **Assigning supervisors:** supervisors copy their ID from their dashboard and students paste it on the Placement page, because there is no user directory.
- **Opening a record:** when an ITF officer, academic supervisor or coordinator first opens a newly submitted logbook (or an ITF officer opens a SCAF), that is recorded as *under review* or *received*.
- **Sessions:** the JWT is kept in localStorage ("Keep me logged in") or sessionStorage; routes are guarded on the client, and every API call is checked on the server.

---

## ⚠️ Known limitations

- **Anyone can register as `administrator` through the public register API.** The sign-up form doesn't offer the role, but the endpoint accepts it. Restrict or seed admin accounts before production.
- **Sign-up checks no credentials.** ITF officers and coordinators register themselves, with the same level of trust as supervisors today.
- **Passkey signatures aren't verified on the server.** The client sends the WebAuthn assertion, which is stored as the signature reference. Use server-side verification for production.
- **ITF offices** are one seeded area office per state, with names and cities only. Edit `itf_offices` to match the real offices.
- **Coordinators are matched to students by name.** Institution and department are compared as text, ignoring capitalisation, so the spelling must be the same.
- **Swagger** (`/docs`) doesn't yet cover the lifecycle, SCAF, ITF office or notification endpoints.
- **Older log entries** created before weeks were made Monday–Saturday keep their old stored dates.
