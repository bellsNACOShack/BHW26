import { NextResponse } from "next/server";
import type { TokenPayload, UserRole } from "./auth";
import { getSupabaseAdmin } from "./supabase/admin";

/**
 * Server-side record scoping shared by every API route (the frontend's RoleGate is
 * only cosmetic):
 *
 * - students see their own placement;
 * - workplace / academic supervisors see placements they are assigned to;
 * - ITF officers see placements routed to their ITF office;
 * - departmental coordinators see students of their institution + department;
 * - administrators see everything.
 */
export interface Actor {
  id: string;
  role: UserRole;
  itf_office_id: string | null;
  institution: string | null;
  department: string | null;
}

export interface PlacementScope {
  id: string;
  student_id: string;
  workplace_supervisor_id: string | null;
  academic_supervisor_id: string | null;
  itf_office_id: string | null;
}

export async function getActor(user: TokenPayload): Promise<Actor> {
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("id, role, itf_office_id, institution, department")
    .eq("id", user.userId)
    .single();
  return {
    id: user.userId,
    role: (data?.role as UserRole) ?? user.role,
    itf_office_id: data?.itf_office_id ?? null,
    institution: data?.institution ?? null,
    department: data?.department ?? null,
  };
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/** `ilike` treats % and _ as wildcards; escape them so names match exactly (case-insensitively). */
function exactILike(value: string) {
  return value.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Student user ids in the coordinator's institution + department. */
export async function getDepartmentStudentIds(actor: Actor): Promise<string[]> {
  if (!actor.institution || !actor.department) return [];
  const { data } = await getSupabaseAdmin()
    .from("student_profiles")
    .select("user_id")
    .ilike("institution", exactILike(actor.institution))
    .ilike("department", exactILike(actor.department));
  return (data ?? []).map((row) => row.user_id as string);
}

/** Ids of every placement the actor may read, or "all" for administrators. */
export async function getAccessiblePlacementIds(actor: Actor): Promise<string[] | "all"> {
  if (actor.role === "administrator") return "all";
  const supabase = getSupabaseAdmin();
  let query = supabase.from("placements").select("id");

  switch (actor.role) {
    case "student":
      query = query.eq("student_id", actor.id);
      break;
    case "workplace_supervisor":
      query = query.eq("workplace_supervisor_id", actor.id);
      break;
    case "academic_supervisor":
      query = query.eq("academic_supervisor_id", actor.id);
      break;
    case "itf_verifier":
      if (!actor.itf_office_id) return [];
      query = query.eq("itf_office_id", actor.itf_office_id);
      break;
    case "departmental_coordinator": {
      const studentIds = await getDepartmentStudentIds(actor);
      if (studentIds.length === 0) return [];
      query = query.in("student_id", studentIds);
      break;
    }
    default:
      return [];
  }

  const { data } = await query;
  return (data ?? []).map((row) => row.id as string);
}

export async function canAccessPlacement(actor: Actor, placement: PlacementScope): Promise<boolean> {
  switch (actor.role) {
    case "administrator":
      return true;
    case "student":
      return placement.student_id === actor.id;
    case "workplace_supervisor":
      return placement.workplace_supervisor_id === actor.id;
    case "academic_supervisor":
      return placement.academic_supervisor_id === actor.id;
    case "itf_verifier":
      return Boolean(actor.itf_office_id) && placement.itf_office_id === actor.itf_office_id;
    case "departmental_coordinator": {
      if (!actor.institution || !actor.department) return false;
      const { data: profile } = await getSupabaseAdmin()
        .from("student_profiles")
        .select("institution, department")
        .eq("user_id", placement.student_id)
        .single();
      return (
        Boolean(profile) &&
        normalize(profile!.institution) === normalize(actor.institution) &&
        normalize(profile!.department) === normalize(actor.department)
      );
    }
    default:
      return false;
  }
}

/** Loads a placement's scoping columns and checks access; returns null when missing or forbidden. */
export async function loadAccessiblePlacement(actor: Actor, placementId: string): Promise<PlacementScope | null> {
  const { data } = await getSupabaseAdmin()
    .from("placements")
    .select("id, student_id, workplace_supervisor_id, academic_supervisor_id, itf_office_id")
    .eq("id", placementId)
    .single();
  if (!data) return null;
  return (await canAccessPlacement(actor, data)) ? data : null;
}

/** User ids of ITF officers attached to an office (notification recipients). */
export async function getItfOfficerIds(officeId: string | null): Promise<string[]> {
  if (!officeId) return [];
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("id")
    .eq("role", "itf_verifier")
    .eq("itf_office_id", officeId);
  return (data ?? []).map((row) => row.id as string);
}

/** User ids of coordinators responsible for a student's department (notification recipients). */
export async function getCoordinatorIdsForStudent(studentId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("institution, department")
    .eq("user_id", studentId)
    .single();
  if (!profile) return [];
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("role", "departmental_coordinator")
    .ilike("institution", exactILike(profile.institution))
    .ilike("department", exactILike(profile.department));
  return (data ?? []).map((row) => row.id as string);
}

/** PostgREST returns one-to-one embeds as an object or a single-item array depending on the relation. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ success: false, error: "Not Found", message }, { status: 404 });
}

export function forbidden(message = "You don't have access to this record.") {
  return NextResponse.json({ success: false, error: "Forbidden", message }, { status: 403 });
}

export function badRequest(message: string, error = "Validation Error") {
  return NextResponse.json({ success: false, error, message }, { status: 400 });
}

export function serverError(message: string, error = "Database Error") {
  return NextResponse.json({ success: false, error, message }, { status: 500 });
}
