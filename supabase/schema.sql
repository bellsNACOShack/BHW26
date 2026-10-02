-- ==============================================================================
-- Interlog: Digital SIWES Management and Verification Platform
-- Database Schema for Supabase PostgreSQL
-- Version: 1.0 (Strict PRD Compliance)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'workplace_supervisor', 'academic_supervisor', 'administrator', 'itf_verifier')),
    avatar_url TEXT,
    phone_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    matric_number VARCHAR(100) UNIQUE NOT NULL,
    institution VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    program VARCHAR(255) NOT NULL,
    level VARCHAR(50) DEFAULT '400L',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PLACEMENTS TABLE (SIWES Organization & Assigned Supervisors)
CREATE TABLE IF NOT EXISTS public.placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    organization_address TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    workplace_supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    academic_supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    acceptance_letter_url TEXT,
    scaf_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (scaf_status IN ('pending', 'printed', 'submitted_to_itf', 'verified')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WEEKLY LOG ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    activities TEXT NOT NULL,
    skills TEXT,
    tools TEXT,
    challenges TEXT,
    remarks TEXT,
    supporting_evidence_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'locked')),
    record_hash VARCHAR(64), -- SHA-256 tamper-evident integrity hash when locked
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_week UNIQUE (student_id, week_number)
);

-- 5. REVIEWS & APPROVALS TABLE
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_entry_id UUID NOT NULL REFERENCES public.log_entries(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'reject', 'request_changes')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DIGITAL SIGNATURES & STAMPS TABLE (Passkey / Cryptographic Biometric Sign-offs)
CREATE TABLE IF NOT EXISTS public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_entry_id UUID NOT NULL REFERENCES public.log_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL DEFAULT 'passkey' CHECK (signature_type IN ('passkey', 'digital_pin', 'crypto_ecdsa')),
    signature_reference TEXT NOT NULL,
    passkey_credential_id TEXT,
    content_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PASSKEY CREDENTIALS TABLE (WebAuthn Credentials for Strong Authentication)
CREATE TABLE IF NOT EXISTS public.passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE (Tamper-evident system activity trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. VERIFICATIONS TABLE (For ITF & Institution QR verification of completed SIWES)
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_code VARCHAR(64) UNIQUE NOT NULL,
    placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    record_hash VARCHAR(64) NOT NULL,
    total_weeks_approved INTEGER NOT NULL DEFAULT 0,
    qr_code_data TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked', 'pending')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_placements_student ON public.placements(student_id);
CREATE INDEX IF NOT EXISTS idx_placements_workplace_sup ON public.placements(workplace_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_placements_academic_sup ON public.placements(academic_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_student ON public.log_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_placement ON public.log_entries(placement_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_status ON public.log_entries(status);
CREATE INDEX IF NOT EXISTS idx_approvals_log_entry ON public.approvals(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_signatures_log_entry ON public.signatures(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_verifications_code ON public.verifications(verification_code);

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_placements_updated_at
BEFORE UPDATE ON public.placements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_log_entries_updated_at
BEFORE UPDATE ON public.log_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
