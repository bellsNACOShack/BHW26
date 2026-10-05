-- ==============================================================================
-- Interlog migration 002: ITF offices, SCAF submissions, logbook lifecycle,
-- academic grading, departmental coordinators and notifications.
--
-- Run once in the Supabase SQL editor after schema.sql. Safe to re-run.
-- ==============================================================================

-- 1. ROLES: add the departmental SIWES coordinator.
--    (itf_verifier = ITF officer, academic_supervisor = academic SIWES supervisor.)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
    role IN ('student', 'workplace_supervisor', 'academic_supervisor', 'administrator', 'itf_verifier', 'departmental_coordinator')
);

-- 2. ITF OFFICES (one area office per state for the MVP; students are routed by their organization's state)
CREATE TABLE IF NOT EXISTS public.itf_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(100) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.itf_offices (name, state, city) VALUES
    ('ITF Abia Area Office', 'Abia', 'Umuahia'),
    ('ITF Abuja Area Office', 'FCT', 'Abuja'),
    ('ITF Adamawa Area Office', 'Adamawa', 'Yola'),
    ('ITF Akwa Ibom Area Office', 'Akwa Ibom', 'Uyo'),
    ('ITF Anambra Area Office', 'Anambra', 'Awka'),
    ('ITF Bauchi Area Office', 'Bauchi', 'Bauchi'),
    ('ITF Bayelsa Area Office', 'Bayelsa', 'Yenagoa'),
    ('ITF Benue Area Office', 'Benue', 'Makurdi'),
    ('ITF Borno Area Office', 'Borno', 'Maiduguri'),
    ('ITF Cross River Area Office', 'Cross River', 'Calabar'),
    ('ITF Delta Area Office', 'Delta', 'Asaba'),
    ('ITF Ebonyi Area Office', 'Ebonyi', 'Abakaliki'),
    ('ITF Edo Area Office', 'Edo', 'Benin City'),
    ('ITF Ekiti Area Office', 'Ekiti', 'Ado-Ekiti'),
    ('ITF Enugu Area Office', 'Enugu', 'Enugu'),
    ('ITF Gombe Area Office', 'Gombe', 'Gombe'),
    ('ITF Imo Area Office', 'Imo', 'Owerri'),
    ('ITF Jigawa Area Office', 'Jigawa', 'Dutse'),
    ('ITF Kaduna Area Office', 'Kaduna', 'Kaduna'),
    ('ITF Kano Area Office', 'Kano', 'Kano'),
    ('ITF Katsina Area Office', 'Katsina', 'Katsina'),
    ('ITF Kebbi Area Office', 'Kebbi', 'Birnin Kebbi'),
    ('ITF Kogi Area Office', 'Kogi', 'Lokoja'),
    ('ITF Kwara Area Office', 'Kwara', 'Ilorin'),
    ('ITF Lagos Area Office', 'Lagos', 'Ikeja'),
    ('ITF Nasarawa Area Office', 'Nasarawa', 'Lafia'),
    ('ITF Niger Area Office', 'Niger', 'Minna'),
    ('ITF Ogun Area Office', 'Ogun', 'Abeokuta'),
    ('ITF Ondo Area Office', 'Ondo', 'Akure'),
    ('ITF Osun Area Office', 'Osun', 'Osogbo'),
    ('ITF Oyo Area Office', 'Oyo', 'Ibadan'),
    ('ITF Plateau Area Office', 'Plateau', 'Jos'),
    ('ITF Rivers Area Office', 'Rivers', 'Port Harcourt'),
    ('ITF Sokoto Area Office', 'Sokoto', 'Sokoto'),
    ('ITF Taraba Area Office', 'Taraba', 'Jalingo'),
    ('ITF Yobe Area Office', 'Yobe', 'Damaturu'),
    ('ITF Zamfara Area Office', 'Zamfara', 'Gusau')
ON CONFLICT (state) DO NOTHING;

-- 3. STAFF SCOPE: ITF officers belong to an office; coordinators to an institution + department.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS itf_office_id UUID REFERENCES public.itf_offices(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- 4. PLACEMENTS: organization location, routed ITF office and the logbook lifecycle stage.
--    The placement + its log_entries remain the single authoritative logbook record.
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS organization_state VARCHAR(100);
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS itf_office_id UUID REFERENCES public.itf_offices(id) ON DELETE SET NULL;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS logbook_stage VARCHAR(50) NOT NULL DEFAULT 'in_progress';
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS logbook_stage_updated_at TIMESTAMPTZ;
ALTER TABLE public.placements DROP CONSTRAINT IF EXISTS placements_logbook_stage_check;
ALTER TABLE public.placements ADD CONSTRAINT placements_logbook_stage_check CHECK (
    logbook_stage IN (
        'in_progress',
        'itf_submitted', 'itf_review', 'itf_rejected', 'itf_approved',
        'academic_submitted', 'academic_review', 'academic_completed',
        'department_submitted', 'department_received',
        'archived'
    )
);

-- 5. SCAF SUBMISSIONS (digital Student Commencement Attestation Form, one per placement)
CREATE TABLE IF NOT EXISTS public.scaf_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL UNIQUE REFERENCES public.placements(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    itf_office_id UUID REFERENCES public.itf_offices(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'requires_correction')),
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    review_comments TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LOGBOOK EVENTS: the logbook's chain-of-custody history, readable by everyone with access to it.
CREATE TABLE IF NOT EXISTS public.logbook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'submitted_to_itf', 'itf_opened', 'itf_approved', 'itf_rejected',
        'submitted_to_academic', 'academic_opened', 'academic_graded', 'academic_signed',
        'submitted_to_department', 'department_received', 'archived'
    )),
    comments TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ACADEMIC ASSESSMENT (score /100 mapped to the Nigerian 5-point letter grade)
CREATE TABLE IF NOT EXISTS public.logbook_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL UNIQUE REFERENCES public.placements(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    grade VARCHAR(2) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SIGNATURES: the same passkey signature record now also covers logbook-level sign-offs
--    (ITF officer, academic supervisor) alongside the industry supervisor's weekly ones.
ALTER TABLE public.signatures ALTER COLUMN log_entry_id DROP NOT NULL;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS placement_id UUID REFERENCES public.placements(id) ON DELETE CASCADE;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS stage VARCHAR(50) NOT NULL DEFAULT 'industry';
ALTER TABLE public.signatures DROP CONSTRAINT IF EXISTS signatures_stage_check;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_stage_check CHECK (stage IN ('industry', 'itf', 'academic'));
ALTER TABLE public.signatures DROP CONSTRAINT IF EXISTS signatures_target_check;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_target_check CHECK (log_entry_id IS NOT NULL OR placement_id IS NOT NULL);

-- 9. NOTIFICATIONS (persistent, per user)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    link TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_itf_office ON public.users(itf_office_id);
CREATE INDEX IF NOT EXISTS idx_placements_itf_office ON public.placements(itf_office_id);
CREATE INDEX IF NOT EXISTS idx_placements_logbook_stage ON public.placements(logbook_stage);
CREATE INDEX IF NOT EXISTS idx_scaf_office_status ON public.scaf_submissions(itf_office_id, status);
CREATE INDEX IF NOT EXISTS idx_logbook_events_placement ON public.logbook_events(placement_id, created_at);
CREATE INDEX IF NOT EXISTS idx_signatures_placement ON public.signatures(placement_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE TRIGGER set_scaf_submissions_updated_at
BEFORE UPDATE ON public.scaf_submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_logbook_assessments_updated_at
BEFORE UPDATE ON public.logbook_assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
