#!/usr/bin/env node
/**
 * End-to-end test of the SIWES lifecycle against a running Inter.log server:
 *
 *   Student → Industry supervisor → ITF officer → Academic supervisor → Department → ITF archive
 *
 * Creates one throwaway account per role, runs the whole workflow through the
 * public API (including the required failures, e.g. rejecting without a reason),
 * then deletes the accounts again. The only direct database write is moving the
 * test placement's dates into the past so every week can be logged today.
 *
 * Usage:   npm run dev            (in another terminal)
 *          node scripts/test-siwes-lifecycle.mjs [--keep] [--base=http://localhost:3000]
 *
 * --keep leaves the test accounts in place (password: Test-pass-123) for manual UI checks.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const KEEP = args.includes("--keep");
const BASE = (args.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "Test-pass-123";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
  }
}

async function api(token, method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const run = Date.now().toString(36);
const INSTITUTION = `Interlog Test University ${run}`;
const DEPARTMENT = "Computer Science";
const created = [];

async function register(role, name, extra = {}) {
  const res = await api(null, "POST", "/auth/register", {
    email: `${role}.${run}@interlog.test`,
    password: PASSWORD,
    full_name: name,
    role,
    ...extra,
  });
  if (res.status !== 201) throw new Error(`register ${role} failed: ${res.status} ${res.message}`);
  created.push(res.user.id);
  return { token: res.token, user: res.user };
}

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

async function main() {
  console.log(`Testing against ${BASE} (run ${run})\n`);

  // ── Phase 1–2: accounts, roles and ITF office routing ─────────────────────
  console.log("Accounts & ITF offices");
  const { offices } = await api(null, "GET", "/itf-offices");
  const lagos = offices?.find((o) => o.state === "Lagos");
  const ogun = offices?.find((o) => o.state === "Ogun");
  check("ITF offices are seeded", offices?.length >= 37 && lagos && ogun, `${offices?.length} offices`);

  const student = await register("student", "Test Student", {
    matric_number: `TST/${run}`,
    institution: INSTITUTION,
    department: DEPARTMENT,
    program: "BTech",
  });
  const industry = await register("workplace_supervisor", "Test Industry Supervisor");
  const academic = await register("academic_supervisor", "Test Academic Supervisor");
  const itf = await register("itf_verifier", "Test ITF Officer", { itf_office_id: lagos.id });
  const itfOther = await register("itf_verifier", "Other-office ITF Officer", { itf_office_id: ogun.id });
  const coordinator = await register("departmental_coordinator", "Test Coordinator", {
    institution: INSTITUTION,
    department: DEPARTMENT.toLowerCase(), // matching is case-insensitive
  });
  const otherCoordinator = await register("departmental_coordinator", "Other-dept Coordinator", {
    institution: INSTITUTION,
    department: "Mechanical Engineering",
  });
  check("ITF officer is linked to their office", itf.user.itf_office?.id === lagos.id);
  const noOffice = await api(null, "POST", "/auth/register", {
    email: `itf.none.${run}@interlog.test`, password: PASSWORD, full_name: "No Office", role: "itf_verifier",
  });
  check("ITF officer sign-up requires an office", noOffice.status === 400);

  // ── Placement with date rules and routing ─────────────────────────────────
  console.log("\nPlacement");
  const today = new Date();
  const badDates = await api(student.token, "POST", "/placements", {
    organization_name: "Acme", organization_address: "1 Test Road, Ikeja", organization_state: "Lagos",
    start_date: ymd(addDays(today, -60)), end_date: ymd(addDays(today, -1)),
  });
  check("End date before today is rejected", badDates.status === 400, badDates.message);
  const noState = await api(student.token, "POST", "/placements", {
    organization_name: "Acme", organization_address: "1 Test Road, Ikeja",
    start_date: ymd(today), end_date: ymd(addDays(today, 35)),
  });
  check("Organization state is required", noState.status === 400);
  const created_ = await api(student.token, "POST", "/placements", {
    organization_name: "Acme Systems Ltd", organization_address: "1 Test Road, Ikeja", organization_state: "Lagos",
    start_date: ymd(today), end_date: ymd(addDays(today, 35)),
  });
  check("Placement created", created_.status === 201, created_.message);
  const placementId = created_.placement.id;
  check("Placement routed to the Lagos ITF office", created_.placement.itf_office_id === lagos.id);

  // Move the placement into the past (4 weeks, Mon 3 Aug – Sat 29 Aug 2026) so every week can be logged.
  await db.from("placements").update({ start_date: "2026-08-03", end_date: "2026-08-29" }).eq("id", placementId);

  const wrongRole = await api(student.token, "PUT", `/placements/${placementId}/assign`, {
    workplace_supervisor_id: academic.user.id,
  });
  check("Assigning an academic supervisor to the industry slot is rejected", wrongRole.status === 400, wrongRole.message);
  const assign = await api(student.token, "PUT", `/placements/${placementId}/assign`, {
    workplace_supervisor_id: industry.user.id,
    academic_supervisor_id: academic.user.id,
  });
  check("Supervisors assigned", assign.status === 200, assign.message);
  const foreignAssign = await api(itfOther.token, "PUT", `/placements/${placementId}/assign`, {});
  check("Other roles can't reassign supervisors", foreignAssign.status === 403);

  // ── Phase 3: SCAF ─────────────────────────────────────────────────────────
  console.log("\nSCAF");
  const draft = await api(student.token, "POST", "/scaf", { placement_id: placementId, details: { phone_number: "08030000000" }, submit: false });
  check("SCAF draft saved", draft.status === 201 && draft.submission.status === "draft", draft.message);
  const draftHidden = await api(itf.token, "GET", "/scaf");
  check("ITF officers don't see drafts", !draftHidden.submissions?.some((s) => s.id === draft.submission.id));
  const incomplete = await api(student.token, "POST", "/scaf", { placement_id: placementId, details: { phone_number: "08030000000" }, submit: true });
  check("Incomplete SCAF can't be submitted", incomplete.status === 400);
  const details = {
    commencement_date: "2026-08-03", phone_number: "0803 000 0000", residential_address: "2 Hostel Close, Ikeja",
    nature_of_business: "Software", organization_phone: "0803 111 1111", organization_email: "hr@acme.test",
    supervisor_name: "Test Industry Supervisor", supervisor_designation: "Engineering manager", supervisor_phone: "0803 222 2222",
  };
  const submitted = await api(student.token, "POST", "/scaf", { placement_id: placementId, details, submit: true });
  check("SCAF submitted", submitted.submission?.status === "submitted", submitted.message);
  const scafId = submitted.submission.id;
  check("SCAF associated with the Lagos office", submitted.submission.itf_office_id === lagos.id);
  check("Other ITF office can't open the SCAF", (await api(itfOther.token, "GET", `/scaf/${scafId}`)).status === 403);
  const queue = await api(itf.token, "GET", "/scaf?status=submitted,under_review");
  check("ITF officer receives the SCAF", queue.submissions?.some((s) => s.id === scafId));
  await api(itf.token, "POST", `/scaf/${scafId}/review`, { action: "open" });
  check("Opening marks it under review", (await api(itf.token, "GET", `/scaf/${scafId}`)).submission.status === "under_review");
  check(
    "Correction without a comment is rejected",
    (await api(itf.token, "POST", `/scaf/${scafId}/review`, { action: "request_correction" })).status === 400
  );
  const correction = await api(itf.token, "POST", `/scaf/${scafId}/review`, { action: "request_correction", comments: "Add your organization's email." });
  check("Correction requested", correction.submission?.status === "requires_correction");
  const resubmitted = await api(student.token, "POST", "/scaf", { placement_id: placementId, details, submit: true });
  check("Student resubmits the corrected SCAF", resubmitted.submission?.status === "submitted");
  const approvedScaf = await api(itf.token, "POST", `/scaf/${scafId}/review`, { action: "approve" });
  check("ITF approves the SCAF", approvedScaf.submission?.status === "approved");

  // ── Weekly logs with the industry supervisor ──────────────────────────────
  console.log("\nWeekly logbook (industry supervisor)");
  const early = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_itf" });
  check("Logbook can't go to ITF before every week is signed", early.status === 400, early.message);

  const entryIds = {};
  for (let week = 1; week <= 4; week++) {
    const entry = await api(student.token, "POST", "/logs", {
      placement_id: placementId, week_number: week, start_date: "x", end_date: "x",
      activities: `## Monday\nWeek ${week} onboarding and tasks.\n\n## Friday\nWeek ${week} review.`,
      skills: "TypeScript", tools: "VS Code",
    });
    if (entry.status !== 201) { check(`Week ${week} created`, false, entry.message); continue; }
    entryIds[week] = entry.log_entry.id;
    await api(student.token, "POST", `/logs/${entry.log_entry.id}/submit`);
    if (week === 1) {
      const academicReview = await api(academic.token, "POST", `/logs/${entry.log_entry.id}/review`, { action: "approve" });
      check("Academic supervisors can no longer sign off weeks", academicReview.status === 403);
    }
    const approve = await api(industry.token, "POST", `/logs/${entry.log_entry.id}/review`, { action: "approve" });
    const sign = await api(industry.token, "POST", `/logs/${entry.log_entry.id}/sign`, { signature_reference: `test-${week}`, signature_type: "passkey" });
    check(`Week ${week} approved and signed by the industry supervisor`, approve.status === 200 && sign.log_entry?.status === "locked", sign.message);
  }
  check("ITF officers at another office can't read the weeks", (await api(itfOther.token, "GET", `/logs/${entryIds[1]}`)).status === 403);

  // ── Phases 4–6: ITF review, rejection with reason, resubmission, approval ─
  console.log("\nITF logbook review");
  const toItf = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_itf" });
  check("Student submits logbook for ITF review", toItf.logbook_stage === "itf_submitted", toItf.message);
  const itfList = await api(itf.token, "GET", "/placements?logbook_stage=itf_submitted,itf_review");
  check("ITF officer receives the logbook request", itfList.placements?.some((p) => p.id === placementId));
  const otherList = await api(itfOther.token, "GET", "/placements");
  check("Other ITF office doesn't see it", !otherList.placements?.some((p) => p.id === placementId));
  check("Other ITF office can't act on it", (await api(itfOther.token, "POST", `/placements/${placementId}/logbook`, { action: "itf_open" })).status === 403);
  const opened = await api(itf.token, "POST", `/placements/${placementId}/logbook`, { action: "itf_open" });
  check("Opening marks it under ITF review", opened.logbook_stage === "itf_review");
  const emptyReject = await api(itf.token, "POST", `/placements/${placementId}/logbook`, { action: "itf_reject", comments: "  " });
  check("Reject without a comment fails validation", emptyReject.status === 400, emptyReject.message);
  const reject = await api(itf.token, "POST", `/placements/${placementId}/logbook`, {
    action: "itf_reject", comments: "Week 2 needs more detail on the tasks performed.", reopen_weeks: [2],
  });
  check("Reject with a comment succeeds", reject.logbook_stage === "itf_rejected", reject.message);

  const studentView = await api(student.token, "GET", `/placements/${placementId}`);
  const rejection = studentView.placement?.logbook_events?.find((e) => e.action === "itf_rejected");
  check("Student can see the ITF rejection reason", rejection?.comments?.includes("Week 2 needs more detail"));
  const week2 = await api(student.token, "GET", `/logs/${entryIds[2]}`);
  check("Reopened week is back with the student", week2.log_entry?.status === "rejected");
  check("Signed weeks stay locked", (await api(student.token, "PUT", `/logs/${entryIds[1]}`, { activities: "tamper" })).status === 400);

  const edit = await api(student.token, "PUT", `/logs/${entryIds[2]}`, {
    activities: "## Monday\nWeek 2: built the reporting module.\n\n## Friday\nWeek 2: demo to the team.",
  });
  check("Student corrects the reopened week", edit.status === 200, edit.message);
  await api(student.token, "POST", `/logs/${entryIds[2]}/submit`);
  await api(industry.token, "POST", `/logs/${entryIds[2]}/review`, { action: "approve" });
  const resign = await api(industry.token, "POST", `/logs/${entryIds[2]}/sign`, { signature_reference: "test-2b" });
  check("Industry supervisor re-signs the corrected week", resign.log_entry?.status === "locked");
  const resubmit = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_itf" });
  check("Student resubmits the corrected logbook", resubmit.logbook_stage === "itf_submitted" && resubmit.metadata?.resubmission === true);
  await api(itf.token, "POST", `/placements/${placementId}/logbook`, { action: "itf_open" });
  const itfApprove = await api(itf.token, "POST", `/placements/${placementId}/logbook`, {
    action: "itf_approve", signature_reference: "itf-passkey-sig", passkey_credential_id: "test-cred",
  });
  check("ITF officer approves and signs", itfApprove.logbook_stage === "itf_approved", itfApprove.message);

  // ── Phases 7–8: academic review, grading and signing ──────────────────────
  console.log("\nAcademic supervisor");
  const toAcademic = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_academic" });
  check("Student submits for academic review", toAcademic.logbook_stage === "academic_submitted", toAcademic.message);
  const academicList = await api(academic.token, "GET", "/placements?logbook_stage=academic_submitted,academic_review");
  check("Academic supervisor receives the request", academicList.placements?.some((p) => p.id === placementId));
  await api(academic.token, "POST", `/placements/${placementId}/logbook`, { action: "academic_open" });
  const signFirst = await api(academic.token, "POST", `/placements/${placementId}/logbook`, { action: "academic_sign", signature_reference: "x" });
  check("Signing before grading is rejected", signFirst.status === 400);
  const badScore = await api(academic.token, "POST", `/placements/${placementId}/logbook`, { action: "academic_grade", score: 150 });
  check("Score above 100 is rejected", badScore.status === 400);
  const grade = await api(academic.token, "POST", `/placements/${placementId}/logbook`, { action: "academic_grade", score: 72.5, remarks: "Consistent, detailed logbook." });
  check("Academic supervisor grades the student (72.5 → A)", grade.metadata?.grade === "A", grade.message);
  const academicSign = await api(academic.token, "POST", `/placements/${placementId}/logbook`, { action: "academic_sign", signature_reference: "academic-passkey-sig" });
  check("Academic supervisor signs; academic stage complete", academicSign.logbook_stage === "academic_completed", academicSign.message);

  // ── Phases 9–11: department and archive ───────────────────────────────────
  console.log("\nDepartment & ITF archive");
  const noConfirm = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_department" });
  check("Final submission requires confirmation", noConfirm.status === 400);
  const toDepartment = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_department", confirm: true });
  check("Student submits final logbook to department", toDepartment.logbook_stage === "department_submitted");
  const deptList = await api(coordinator.token, "GET", "/placements?logbook_stage=department_submitted,department_received");
  check("Coordinator receives the completed logbook", deptList.placements?.some((p) => p.id === placementId));
  check("Other department's coordinator can't open it", (await api(otherCoordinator.token, "GET", `/placements/${placementId}`)).status === 403);
  const received = await api(coordinator.token, "POST", `/placements/${placementId}/logbook`, { action: "department_receive" });
  check("Department records receipt", received.logbook_stage === "department_received");
  const archive = await api(coordinator.token, "POST", `/placements/${placementId}/logbook`, { action: "archive" });
  check("Coordinator submits to the ITF archive", archive.logbook_stage === "archived");
  const studentArchive = await api(student.token, "POST", `/placements/${placementId}/logbook`, { action: "submit_itf" });
  check("Archived logbook can't be resubmitted", studentArchive.status === 400);

  // ── Final record ──────────────────────────────────────────────────────────
  console.log("\nFinal record");
  const final = (await api(coordinator.token, "GET", `/placements/${placementId}`)).placement;
  const weeks = final.log_entries ?? [];
  const events = (final.logbook_events ?? []).map((e) => e.action);
  const stages = (final.signatures ?? []).map((s) => s.stage).sort();
  check("Industry Supervisor ✓ (all weeks signed)", weeks.length === 4 && weeks.every((w) => w.status === "locked"));
  check("ITF Officer ✓ (signature + approval)", stages.includes("itf") && events.includes("itf_approved"));
  check("Academic Supervisor ✓ (signature + grade A)", stages.includes("academic") && final.assessment?.grade === "A");
  check("Department ✓", events.includes("department_received"));
  check("ITF Archive ✓", final.logbook_stage === "archived" && final.status === "completed");
  check(
    "History keeps the rejection and resubmission",
    events.filter((e) => e === "submitted_to_itf").length === 2 && events.includes("itf_rejected"),
    events
  );

  const notifications = async (who) => (await api(who.token, "GET", "/notifications")).notifications?.map((n) => n.title) ?? [];
  const [studentN, itfN, academicN, coordinatorN] = await Promise.all([student, itf, academic, coordinator].map(notifications));
  check("Student notified of rejection, approval, grade and archive", ["ITF returned your logbook", "ITF approved your logbook", "Your SIWES grade was recorded", "Logbook archived with ITF"].every((t) => studentN.includes(t)), studentN);
  check("ITF officer notified of SCAF, request and resubmission", ["New SCAF submission", "New logbook review request", "Corrected logbook resubmitted"].every((t) => itfN.includes(t)), itfN);
  check("Academic supervisor notified of the request", academicN.includes("New logbook review request"), academicN);
  check("Coordinator notified of the completed logbook", coordinatorN.includes("New completed logbook"), coordinatorN);
  const audit = await api(coordinator.token, "GET", `/audit-logs?resource_type=placements&resource_id=${placementId}`);
  check("Audit trail records the lifecycle", ["LOGBOOK_ITF_REJECTED", "LOGBOOK_ACADEMIC_GRADED", "LOGBOOK_ARCHIVED"].every((a) => audit.audit_logs?.some((l) => l.action === a)));
}

try {
  await main();
} catch (error) {
  failures++;
  console.error(`\n✗ Aborted: ${error.message}`);
} finally {
  if (KEEP) {
    console.log(`\nKept test accounts (*.${run}@interlog.test, password ${PASSWORD}).`);
  } else if (created.length) {
    await db.from("users").delete().in("id", created);
    console.log(`\nCleaned up ${created.length} test accounts.`);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}
