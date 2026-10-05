import type { UserRole } from "@/lib/auth";

export type { UserRole };

export interface StudentProfile {
  id: string;
  user_id: string;
  matric_number: string;
  institution: string;
  department: string;
  program: string;
  level: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItfOffice {
  id: string;
  name: string;
  state: string;
  city: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at?: string;
  student_profile: StudentProfile | null;
  /** ITF officers: the office whose students they handle. */
  itf_office_id?: string | null;
  itf_office?: ItfOffice | null;
  /** Departmental coordinators: the department they keep records for. */
  institution?: string | null;
  department?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Roles that may self-register through the public sign-up flow. */
export type SelfRegisterRole = Extract<
  UserRole,
  "student" | "workplace_supervisor" | "academic_supervisor" | "itf_verifier" | "departmental_coordinator"
>;

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: SelfRegisterRole;
  phone_number?: string;
  matric_number?: string;
  institution?: string;
  department?: string;
  program?: string;
  level?: string;
  itf_office_id?: string;
}


export interface AuthResponse {
  success: true;
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  success: true;
  user: User;
}
