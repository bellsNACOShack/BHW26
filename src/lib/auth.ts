import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "interlog-development-secret-key-32chars";

export type UserRole =
  | "student"
  | "workplace_supervisor"
  | "academic_supervisor"
  | "administrator"
  | "itf_verifier"
  | "departmental_coordinator";

export interface TokenPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password with bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for an authenticated user
 */
export function generateToken(payload: TokenPayload, expiresIn: string = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify JWT token and extract payload
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract authenticated user payload from Next.js request Authorization header
 */
export function getAuthenticatedUser(request: NextRequest): TokenPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

/**
 * Middleware helper to enforce authentication and optional role restrictions
 */
export function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): { user: TokenPayload } | { errorResponse: NextResponse } {
  const user = getAuthenticatedUser(request);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "A valid Bearer authentication token is required.",
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Role '${user.role}' is not authorized to access this resource. Allowed: ${allowedRoles.join(", ")}`,
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
