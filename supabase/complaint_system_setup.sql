-- supabase/migrations/20261017000001_complaint_management_schema.sql
-- HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 1 - CORE SCHEMA)
-- Compatible with PostgreSQL 14+ / Supabase

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. PROFILES (Extends auth.users with company roles & cities)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN (
        'BDA_SALES',
        'HR',
        'SCHEDULING_TEAM',
        'OPERATIONS_TEAM',
        'OPERATIONS_MANAGER',
        'COO',
        'MANAGEMENT_ADMIN'
    )),
    city TEXT DEFAULT 'Kochi' CHECK (city IN ('Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur', 'All_Kerala')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. EMPLOYEES (Stable staff records: technicians, supervisors)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL CHECK (designation IN (
        'TECHNICIAN',
        'SENIOR_TECHNICIAN',
        'SUPERVISOR',
        'TEAM_LEAD',
        'OPERATIONS_EXECUTIVE',
        'OPERATIONS_MANAGER',
        'DRIVER'
    )),
    city TEXT NOT NULL CHECK (city IN ('Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur')),
    primary_phone TEXT NOT NULL,
    hire_date DATE NOT NULL,
    unit_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED')),
    training_status TEXT NOT NULL DEFAULT 'UP_TO_DATE' CHECK (training_status IN ('UP_TO_DATE', 'TRAINING_REQUIRED', 'REASSESSMENT_PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- SEQUENCE FOR COMPLAINT NUMBERS (HS-CMP-YYYYMM-XXXX)
-- -------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS complaint_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
    seq_val BIGINT;
    year_month TEXT;
BEGIN
    seq_val := nextval('complaint_number_seq');
    year_month := to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM');
    RETURN 'HS-CMP-' || year_month || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- 3. COMPLAINTS (Core ticket records)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number TEXT NOT NULL UNIQUE DEFAULT generate_complaint_number(),
    reporting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_by_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    city TEXT NOT NULL CHECK (city IN ('Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur')),
    service_type TEXT NOT NULL CHECK (service_type IN (
        'DEEP_CLEANING',
        'MOVE_IN_OUT_CLEANING',
        'SOFA_CARPET_SHAMPOO',
        'KITCHEN_DEGREASING',
        'BATHROOM_RESTORATION',
        'MARBLE_POLISHING',
        'GENERAL_HOUSEKEEPING',
        'POST_CONSTRUCTION_CLEANING'
    )),
    job_id TEXT,
    job_date DATE NOT NULL,
    job_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN (
        'PROCESS_ISSUE',
        'DAMAGE_ISSUE',
        'SKILL_ISSUE',
        'SCOPE_CONFUSION',
        'MACHINE_ISSUE',
        'LATE_START',
        'LATE_COMPLETION',
        'SCOPE_MISSED',
        'CUSTOMER_EXPERIENCE',
        'COMPANY_GOODWILL_DECISION'
    )),
    severity TEXT NOT NULL DEFAULT 'MODERATE' CHECK (severity IN ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN (
        'REGISTERED',
        'INVESTIGATION_PENDING',
        'UNDER_INVESTIGATION',
        'EVIDENCE_REVIEW',
        'ASSESSMENT_COMPLETED',
        'APPROVAL_PENDING',
        'CORRECTIVE_ACTION_REQUIRED',
        'REWORK_IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
    )),
    assigned_investigator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_investigator_name TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    pre_service_checklist_done BOOLEAN DEFAULT false,
    post_service_signoff_done BOOLEAN DEFAULT false,
    before_photos_available BOOLEAN DEFAULT false,
    after_photos_available BOOLEAN DEFAULT false,
    work_order_verified BOOLEAN DEFAULT false,
    target_resolution_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closure_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 4. COMPLAINT_PARTICIPANTS (Employees on the job)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    role_on_job TEXT NOT NULL CHECK (role_on_job IN (
        'SUPERVISOR',
        'PRIMARY_TECHNICIAN',
        'ASSISTANT_TECHNICIAN',
        'DRIVER',
        'OPERATIONS_LEAD'
    )),
    statement TEXT,
    interviewed_at TIMESTAMPTZ,
    interviewed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    allegation_status TEXT NOT NULL DEFAULT 'PARTICIPANT' CHECK (allegation_status IN (
        'PARTICIPANT',
        'NAMED_IN_COMPLAINT',
        'EXONERATED',
        'SUBSTANTIATED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (complaint_id, employee_id)
);

-- -------------------------------------------------------------
-- 5. COMPLAINT_EVIDENCE (Private storage metadata)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'BEFORE_PHOTO',
        'AFTER_PHOTO',
        'WORK_ORDER',
        'CHECKLIST',
        'CUSTOMER_COMMUNICATION',
        'SCOPE_CHANGE',
        'MAINTENANCE_RECORD',
        'TRAINING_RECORD',
        'COMPLETION_SIGNOFF',
        'DAMAGE_ASSESSMENT',
        'REWORK_PHOTO',
        'AUDIO_RECORDING',
        'OTHER_DOCUMENT'
    )),
    title TEXT NOT NULL,
    description TEXT,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_by_name TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. INVESTIGATION_RECORDS (In-depth root cause findings)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investigation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    investigator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    investigator_name TEXT NOT NULL,
    investigation_status TEXT NOT NULL CHECK (investigation_status IN (
        'IN_PROGRESS',
        'EVIDENCE_INSUFFICIENT',
        'COMPLETED',
        'ESCALATED'
    )),
    customer_statement TEXT,
    supervisor_statement TEXT,
    technician_statements TEXT,
    equipment_status_check TEXT,
    materials_used_check TEXT,
    arrival_departure_verification TEXT,
    root_cause_analysis TEXT,
    root_cause_category TEXT CHECK (root_cause_category IN (
        'INDIVIDUAL_SKILL_GAP',
        'INSUFFICIENT_TIME_ALLOCATION',
        'EQUIPMENT_MALFUNCTION',
        'CHEMICAL_MISAPPLICATION',
        'CUSTOMER_MISUNDERSTANDING',
        'SCOPE_NOT_IN_WORK_ORDER',
        'PRE_EXISTING_DEFECT_NOT_DOCUMENTED',
        'SUPERVISION_LAPSE',
        'LOGISTICAL_TRAFFIC_DELAY',
        'FATIGUE_OVERBURDEN',
        'COMPANY_GOODWILL'
    )),
    is_pre_existing_damage BOOLEAN DEFAULT false,
    missing_evidence_flags TEXT[] DEFAULT '{}',
    findings_summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 13 & 14. RULE_CONFIGURATION & RULE_VERSIONS (Created early for FKs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE CHECK (category IN (
        'PROCESS_ISSUE',
        'DAMAGE_ISSUE',
        'SKILL_ISSUE',
        'SCOPE_CONFUSION',
        'MACHINE_ISSUE',
        'LATE_START',
        'LATE_COMPLETION',
        'SCOPE_MISSED',
        'CUSTOMER_EXPERIENCE',
        'COMPANY_GOODWILL_DECISION'
    )),
    category_title TEXT NOT NULL,
    description TEXT NOT NULL,
    default_severity TEXT NOT NULL DEFAULT 'MODERATE',
    mandatory_evidence_required TEXT[] NOT NULL DEFAULT '{}',
    investigation_checklist JSONB NOT NULL DEFAULT '[]',
    default_responsibility TEXT NOT NULL DEFAULT 'COMPANY',
    approval_threshold_minor NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
    approval_threshold_moderate NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    approval_threshold_major NUMERIC(10, 2) NOT NULL DEFAULT 15000.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INT NOT NULL DEFAULT 1,
    updated_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_config_id UUID NOT NULL REFERENCES public.rule_configuration(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    version_number INT NOT NULL,
    rule_snapshot JSONB NOT NULL,
    changed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. RESPONSIBILITY_ASSESSMENTS (Assessment determinations)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.responsibility_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    rule_version_id UUID REFERENCES public.rule_versions(id) ON DELETE SET NULL,
    assessment_number INT NOT NULL DEFAULT 1,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    assessed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assessed_by_name TEXT NOT NULL,
    assessment_status TEXT NOT NULL CHECK (assessment_status IN (
        'PROVISIONAL',
        'INVESTIGATION_REQUIRED',
        'RECOMMENDED',
        'CONFIRMED',
        'OVERRULED'
    )),
    primary_responsible_party TEXT NOT NULL CHECK (primary_responsible_party IN (
        'COMPANY',
        'EMPLOYEE_INDIVIDUAL',
        'CREW_SHARED',
        'CUSTOMER',
        'THIRD_PARTY_VENDOR',
        'NO_FAULT_GOODWILL'
    )),
    company_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (company_share_pct >= 0 AND company_share_pct <= 100),
    employee_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (employee_share_pct >= 0 AND employee_share_pct <= 100),
    responsible_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    rationale TEXT NOT NULL,
    evidence_reviewed_summary TEXT NOT NULL,
    conflicting_evidence_notes TEXT,
    recommended_corrective_action TEXT NOT NULL,
    required_approval_authority TEXT NOT NULL CHECK (required_approval_authority IN (
        'OPERATIONS_MANAGER',
        'COO',
        'MANAGEMENT_ADMIN'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 8. COST_RECORDS (Granular financial ledger)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    cost_type TEXT NOT NULL CHECK (cost_type IN (
        'REWORK_LABOUR',
        'REWORK_MATERIALS',
        'REWORK_TRAVEL',
        'DAMAGE_REPAIR_VENDOR',
        'REPLACEMENT_ITEM',
        'CUSTOMER_REFUND',
        'CUSTOMER_DISCOUNT_COUPON',
        'EXECUTIVE_GOODWILL_GESTURE',
        'EQUIPMENT_REPAIR'
    )),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'ESTIMATED' CHECK (status IN (
        'ESTIMATED',
        'VERIFIED_INCURRED',
        'REJECTED',
        'WAIVED'
    )),
    vendor_name TEXT,
    invoice_receipt_ref TEXT,
    verified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    is_company_absorption BOOLEAN NOT NULL DEFAULT true,
    proposed_employee_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    approved_employee_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 9. APPROVAL_RECORDS (Multi-level approvals)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.responsibility_assessments(id) ON DELETE SET NULL,
    approval_type TEXT NOT NULL CHECK (approval_type IN (
        'RESPONSIBILITY_ASSESSMENT',
        'FINANCIAL_LOSS_APPROVAL',
        'CUSTOMER_COMPENSATION',
        'EMPLOYEE_ADJUSTMENT',
        'COMPLAINT_CLOSURE'
    )),
    approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ESCALATED',
        'RETURNED_FOR_INVESTIGATION'
    )),
    comments TEXT NOT NULL,
    conditions TEXT,
    financial_amount_approved NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 10. CORRECTIVE_ACTIONS (Prevention and remedy tracking)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'REWORK_SERVICE',
        'APOLOGY_CALL_VISIT',
        'TRAINING_ASSIGNMENT',
        'SOP_PROCESS_UPDATE',
        'EQUIPMENT_OVERHAUL',
        'SUPERVISION_AUDIT',
        'DOCUMENTATION_POLICY_MANDATE',
        'COACHING_COUNSELING'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_to_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'VERIFIED_EFFECTIVE',
        'OVERDUE'
    )),
    completion_date TIMESTAMPTZ,
    verification_notes TEXT,
    verified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 11. TRAINING_RECORDS (Skill & SOP coaching tracking)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
    module_code TEXT NOT NULL,
    module_title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'CHEMICAL_SAFETY',
        'MACHINE_OPERATION',
        'DELICATE_SURFACES',
        'TIME_MANAGEMENT',
        'CUSTOMER_COMMUNICATION',
        'CHECKLIST_DOCUMENTATION',
        'DAMAGE_PREVENTION'
    )),
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN (
        'ASSIGNED',
        'IN_TRAINING',
        'COMPLETED_PASSED',
        'FAILED_RETEST_REQUIRED'
    )),
    trainer_name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    completion_date DATE,
    score_pct NUMERIC(5, 2),
    reassessment_required BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 12. COMPLAINT_COMMENTS (Internal collaboration notes)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'INTERNAL_NOTE' CHECK (comment_type IN (
        'INTERNAL_NOTE',
        'CUSTOMER_UPDATE',
        'INVESTIGATION_LOG',
        'DECISION_JUSTIFICATION',
        'SYSTEM_GENERATED'
    )),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 15. AUDIT_LOG (Immutable action logging)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    complaint_id UUID,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'INSERT',
        'UPDATE',
        'DELETE',
        'APPROVE',
        'REJECT',
        'STATUS_CHANGE',
        'UPLOAD_EVIDENCE',
        'ASSESS_RESPONSIBILITY',
        'FINANCIAL_ADJUSTMENT'
    )),
    reason TEXT,
    before_values JSONB,
    after_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 16. NOTIFICATIONS (Alerts & tasks)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'APPROVAL_REQUIRED',
        'NEW_COMPLAINT_ASSIGNED',
        'OVERDUE_ACTION',
        'HIGH_SEVERITY_ALERT',
        'INVESTIGATION_UPDATE',
        'STATUS_CHANGE'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE SEARCHING & DASHBOARDS
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_city ON public.complaints(city);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON public.complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_reporting_date ON public.complaints(reporting_date);
CREATE INDEX IF NOT EXISTS idx_complaints_number ON public.complaints(complaint_number);

CREATE INDEX IF NOT EXISTS idx_evidence_complaint ON public.complaint_evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_participants_complaint ON public.complaint_participants(complaint_id);
CREATE INDEX IF NOT EXISTS idx_participants_employee ON public.complaint_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_costs_complaint ON public.cost_records(complaint_id);
CREATE INDEX IF NOT EXISTS idx_approvals_complaint ON public.approval_records(complaint_id);
CREATE INDEX IF NOT EXISTS idx_actions_complaint ON public.corrective_actions(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_complaint ON public.audit_log(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
-- supabase/migrations/20261017000002_complaint_management_rls.sql
-- HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 1 - ROW LEVEL SECURITY)
-- Strict authorization policies for all 16 tables + storage

-- -------------------------------------------------------------
-- 1. HELPER FUNCTIONS FOR ROLE & PERMISSION CHECKS
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
DECLARE
    u_role TEXT;
BEGIN
    SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid() AND active = true;
    RETURN COALESCE(u_role, 'ANONYMOUS');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_coo()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() IN ('MANAGEMENT_ADMIN', 'COO');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_operations_management()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() IN ('MANAGEMENT_ADMIN', 'COO', 'OPERATIONS_MANAGER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() IN (
        'BDA_SALES',
        'HR',
        'SCHEDULING_TEAM',
        'OPERATIONS_TEAM',
        'OPERATIONS_MANAGER',
        'COO',
        'MANAGEMENT_ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 16 TABLES
-- -------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 3. PROFILES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Profiles viewable by authenticated internal staff"
ON public.profiles FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Users can update their own profile basic info"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-role elevation
);

CREATE POLICY "Admins have full profile management"
ON public.profiles FOR ALL
TO authenticated
USING (is_admin_or_coo())
WITH CHECK (is_admin_or_coo());

-- -------------------------------------------------------------
-- 4. EMPLOYEES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Employees viewable by internal staff"
ON public.employees FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "HR and Management can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (current_user_role() IN ('HR', 'MANAGEMENT_ADMIN', 'COO', 'OPERATIONS_MANAGER'))
WITH CHECK (current_user_role() IN ('HR', 'MANAGEMENT_ADMIN', 'COO', 'OPERATIONS_MANAGER'));

-- -------------------------------------------------------------
-- 5. COMPLAINTS POLICIES
-- -------------------------------------------------------------
-- Read: Staff can view complaints according to operational scope
CREATE POLICY "Internal staff can view complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (
    is_operations_management() OR
    current_user_role() IN ('HR', 'SCHEDULING_TEAM', 'OPERATIONS_TEAM') OR
    (current_user_role() = 'BDA_SALES' AND reported_by_id = auth.uid())
);

-- Insert: BDA/Sales, Scheduling, and Operations can register complaints
CREATE POLICY "Authorized roles can register complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (
    is_internal_staff() AND
    reported_by_id = auth.uid()
);

-- Update: Operations Manager, COO, and Admins can update complaint status and assignments
CREATE POLICY "Operations management can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (is_operations_management() OR assigned_investigator_id = auth.uid())
WITH CHECK (is_operations_management() OR assigned_investigator_id = auth.uid());

-- Delete: Strictly prohibited for non-Admins
CREATE POLICY "Only Management Admins can delete complaints"
ON public.complaints FOR DELETE
TO authenticated
USING (current_user_role() = 'MANAGEMENT_ADMIN');

-- -------------------------------------------------------------
-- 6. COMPLAINT_PARTICIPANTS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Participants viewable by internal staff"
ON public.complaint_participants FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Operations and HR can link participants"
ON public.complaint_participants FOR ALL
TO authenticated
USING (is_operations_management() OR current_user_role() IN ('HR', 'SCHEDULING_TEAM'))
WITH CHECK (is_operations_management() OR current_user_role() IN ('HR', 'SCHEDULING_TEAM'));

-- -------------------------------------------------------------
-- 7. COMPLAINT_EVIDENCE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Evidence viewable by authorized staff"
ON public.complaint_evidence FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Staff can upload evidence"
ON public.complaint_evidence FOR INSERT
TO authenticated
WITH CHECK (is_internal_staff() AND uploaded_by_id = auth.uid());

CREATE POLICY "Verifiers can verify evidence"
ON public.complaint_evidence FOR UPDATE
TO authenticated
USING (is_operations_management())
WITH CHECK (is_operations_management());

-- -------------------------------------------------------------
-- 8. INVESTIGATION_RECORDS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Investigations viewable by operations, HR and management"
ON public.investigation_records FOR SELECT
TO authenticated
USING (is_operations_management() OR current_user_role() IN ('HR', 'OPERATIONS_TEAM'));

CREATE POLICY "Assigned investigators and Ops Managers can manage investigations"
ON public.investigation_records FOR ALL
TO authenticated
USING (is_operations_management() OR investigator_id = auth.uid())
WITH CHECK (is_operations_management() OR investigator_id = auth.uid());

-- -------------------------------------------------------------
-- 9. RESPONSIBILITY_ASSESSMENTS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Assessments viewable by authorized roles"
ON public.responsibility_assessments FOR SELECT
TO authenticated
USING (is_operations_management() OR current_user_role() IN ('HR', 'OPERATIONS_TEAM'));

CREATE POLICY "Ops Managers, COO and Admins can create assessments"
ON public.responsibility_assessments FOR INSERT
TO authenticated
WITH CHECK (is_operations_management());

-- Assessments are immutable historical records once confirmed
CREATE POLICY "Only COO and Admin can overrule or update assessments"
ON public.responsibility_assessments FOR UPDATE
TO authenticated
USING (is_admin_or_coo())
WITH CHECK (is_admin_or_coo());

-- -------------------------------------------------------------
-- 10. COST_RECORDS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Cost records viewable by management and operations"
ON public.cost_records FOR SELECT
TO authenticated
USING (is_operations_management() OR current_user_role() = 'HR');

CREATE POLICY "Operations Managers and Admins can manage cost records"
ON public.cost_records FOR ALL
TO authenticated
USING (is_operations_management())
WITH CHECK (is_operations_management());

-- -------------------------------------------------------------
-- 11. APPROVAL_RECORDS POLICIES (Immutable decisions)
-- -------------------------------------------------------------
CREATE POLICY "Approvals viewable by management, HR and investigators"
ON public.approval_records FOR SELECT
TO authenticated
USING (is_operations_management() OR current_user_role() = 'HR');

CREATE POLICY "Authorized approvers can record decisions"
ON public.approval_records FOR INSERT
TO authenticated
WITH CHECK (
    is_operations_management() AND
    approver_id = auth.uid()
);

-- Decision records cannot be edited once cast (audit integrity)
-- No UPDATE policy created by design

-- -------------------------------------------------------------
-- 12. CORRECTIVE_ACTIONS & TRAINING_RECORDS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Corrective actions viewable by staff"
ON public.corrective_actions FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Ops management and HR can manage corrective actions"
ON public.corrective_actions FOR ALL
TO authenticated
USING (is_operations_management() OR current_user_role() = 'HR')
WITH CHECK (is_operations_management() OR current_user_role() = 'HR');

CREATE POLICY "Training records viewable by HR and Operations"
ON public.training_records FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "HR and Management can manage training records"
ON public.training_records FOR ALL
TO authenticated
USING (current_user_role() IN ('HR', 'MANAGEMENT_ADMIN', 'COO', 'OPERATIONS_MANAGER'))
WITH CHECK (current_user_role() IN ('HR', 'MANAGEMENT_ADMIN', 'COO', 'OPERATIONS_MANAGER'));

-- -------------------------------------------------------------
-- 13. COMPLAINT_COMMENTS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Comments viewable by internal staff"
ON public.complaint_comments FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Internal staff can post comments"
ON public.complaint_comments FOR INSERT
TO authenticated
WITH CHECK (is_internal_staff() AND author_id = auth.uid());

-- -------------------------------------------------------------
-- 14. RULE CONFIGURATION & VERSIONS
-- -------------------------------------------------------------
CREATE POLICY "Rules viewable by all staff"
ON public.rule_configuration FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Only COO and Admin can modify rule configurations"
ON public.rule_configuration FOR ALL
TO authenticated
USING (is_admin_or_coo())
WITH CHECK (is_admin_or_coo());

CREATE POLICY "Rule versions viewable by all staff"
ON public.rule_versions FOR SELECT
TO authenticated
USING (is_internal_staff());

CREATE POLICY "Rule versions insertable by Admin and COO only"
ON public.rule_versions FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_coo());

-- -------------------------------------------------------------
-- 15. AUDIT_LOG (Immutable Append-Only Security)
-- -------------------------------------------------------------
CREATE POLICY "Audit logs viewable by Management and COO only"
ON public.audit_log FOR SELECT
TO authenticated
USING (is_admin_or_coo());

CREATE POLICY "Authenticated users and triggers can append to audit log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (is_internal_staff());

-- Strictly NO UPDATE or DELETE on audit logs for any user
-- Enforces immutable record keeping per spec requirement

-- -------------------------------------------------------------
-- 16. NOTIFICATIONS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view and manage their own notifications"
ON public.notifications FOR ALL
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- -------------------------------------------------------------
-- STORAGE BUCKET CREATION (Supabase Storage: complaint-evidence)
-- -------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'complaint-evidence',
    'complaint-evidence',
    false,
    26214400, -- 25 MB max file size
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'audio/mpeg',
        'audio/wav',
        'audio/m4a'
    ]
)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Private evidence access for internal staff"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'complaint-evidence' AND is_internal_staff());

CREATE POLICY "Evidence upload for internal staff"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-evidence' AND is_internal_staff());
-- supabase/migrations/20261017000003_complaint_management_seed.sql
-- HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 1 - SEED DATA)
-- Initial configurations for 10 complaint categories, Kerala employees, and initial complaints

-- -------------------------------------------------------------
-- 1. SEED RULE CONFIGURATIONS (All 10 Complaint Categories)
-- -------------------------------------------------------------
INSERT INTO public.rule_configuration (
    category,
    category_title,
    description,
    default_severity,
    mandatory_evidence_required,
    investigation_checklist,
    default_responsibility,
    approval_threshold_minor,
    approval_threshold_moderate,
    approval_threshold_major
) VALUES 
(
    'PROCESS_ISSUE',
    'Process & Protocol Non-Compliance',
    'Deviation from standard operating cleaning procedures, safety rules, or chemical usage guidelines.',
    'MODERATE',
    ARRAY['CHECKLIST', 'BEFORE_PHOTO', 'AFTER_PHOTO'],
    '[
        "Did supervisor review the standard SOP checklist before starting?",
        "Were dilution ratios followed as per Handy Squad chemical guide?",
        "Was pre-inspection signoff obtained from client prior to deep-clean?"
    ]'::jsonb,
    'COMPANY',
    2000.00,
    5000.00,
    15000.00
),
(
    'DAMAGE_ISSUE',
    'Physical Surface or Property Damage',
    'Accidental chipping, scratching, chemical burn on Italian marble/varnish, or appliance breakage.',
    'MAJOR',
    ARRAY['BEFORE_PHOTO', 'AFTER_PHOTO', 'DAMAGE_ASSESSMENT'],
    '[
        "Were pre-existing surface cracks documented in pre-service checklist?",
        "Was appropriate pH-neutral chemical used on delicate stone/varnish?",
        "Did technician notify supervisor immediately when incident occurred?",
        "Has a verified repair quotation been obtained from approved third-party vendor?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    5000.00,
    25000.00
),
(
    'SKILL_ISSUE',
    'Workmanship & Technical Quality Gap',
    'Sub-standard finishing, streak marks on glass, residue in tile grout, or incomplete sofa extraction.',
    'MODERATE',
    ARRAY['AFTER_PHOTO', 'CHECKLIST'],
    '[
        "Has the primary technician completed module HS-SKILL-02 (Machine Operation)?",
        "Was the extraction machine vacuum head maintained and suction adequate?",
        "Did the supervisor personally conduct quality walk-through before handoff?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    4000.00,
    10000.00
),
(
    'SCOPE_CONFUSION',
    'Scope & Booking Expectation Misalignment',
    'Discrepancy between sales quote / customer expectations and operational work order delivered.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CUSTOMER_COMMUNICATION', 'SCOPE_CHANGE'],
    '[
        "Does the initial CRM booking quotation explicitly list the disputed area?",
        "Did the sales/BDA rep communicate attic, loft, or balcony exclusions?",
        "Was an on-site scope variation signed before additional work commenced?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    8000.00
),
(
    'MACHINE_ISSUE',
    'Equipment Failure or Tool Breakdown',
    'Single-disc scrubber motor trip, wet vacuum leakage, high-pressure washer malfunction on site.',
    'MODERATE',
    ARRAY['MAINTENANCE_RECORD', 'WORK_ORDER'],
    '[
        "Was machine electrical cord and carbon brush inspected on weekly audit?",
        "Was a backup machine dispatched within 45 minutes to prevent job delay?",
        "Did the power outlet or voltage surge at customer premises contribute?"
    ]'::jsonb,
    'COMPANY',
    2000.00,
    5000.00,
    12000.00
),
(
    'LATE_START',
    'Delayed Crew Arrival on Job',
    'Team arrived past scheduled booking time without prior customer notification.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CUSTOMER_COMMUNICATION'],
    '[
        "Was customer proactively notified by scheduling desk 30 min in advance?",
        "Was delay caused by traffic congestion, preceding job overrun, or vehicle fault?",
        "Was arrival timestamp accurately verified by supervisor GPS check-in?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    2500.00,
    5000.00
),
(
    'LATE_COMPLETION',
    'Delayed Service Handoff',
    'Job exceeded estimated duration significantly, causing inconvenience to the client.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CHECKLIST'],
    '[
        "Was the initial property estimation undersized relative to square footage?",
        "Did customer add scope mid-service without duration adjustment?",
        "Were sufficient staff allocated for the contracted scope?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    6000.00
),
(
    'SCOPE_MISSED',
    'Overlooked Areas or Incomplete Deliverables',
    'Agreed work items omitted (e.g., inside kitchen cabinets, exhaust fan, balcony railing).',
    'MODERATE',
    ARRAY['CHECKLIST', 'AFTER_PHOTO', 'WORK_ORDER'],
    '[
        "Did the customer sign off on the 24-point completion handover checklist?",
        "Were missed items explicitly enumerated in the contracted work order?",
        "Is quick rework dispatch scheduled to rectify within 24 hours?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    4000.00,
    10000.00
),
(
    'CUSTOMER_EXPERIENCE',
    'Behavioral, Demeanor or Communication Grievance',
    'Customer dissatisfaction regarding staff demeanor, uniform cleanliness, noise, or attitude.',
    'MODERATE',
    ARRAY['CUSTOMER_COMMUNICATION'],
    '[
        "Was supervisor present during the interaction in question?",
        "Did the customer receive a courteous apology from Operations Lead?",
        "Is soft-skills customer etiquette coaching recommended for the crew?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    7500.00
),
(
    'COMPANY_GOODWILL_DECISION',
    'Executive Discretionary Resolution',
    'Commercial gesture or compensation provided for client retention where fault is ambiguous.',
    'MINOR',
    ARRAY['CUSTOMER_COMMUNICATION', 'WORK_ORDER'],
    '[
        "Is the customer a high-value recurring or AMC client?",
        "Is the cost absorbed as customer acquisition/retention marketing expense?",
        "Has COO / Management approval been obtained?"
    ]'::jsonb,
    'NO_FAULT_GOODWILL',
    1000.00,
    5000.00,
    20000.00
)
ON CONFLICT (category) DO NOTHING;

-- -------------------------------------------------------------
-- 2. SEED KERALA EMPLOYEES (Technicians & Supervisors)
-- -------------------------------------------------------------
INSERT INTO public.employees (
    employee_code,
    full_name,
    designation,
    city,
    primary_phone,
    hire_date,
    status,
    training_status
) VALUES 
('HS-EMP-101', 'Govindan Nair', 'SUPERVISOR', 'Kochi', '+91 98470 11223', '2023-01-15', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-102', 'Pradeep Kumar K.', 'SENIOR_TECHNICIAN', 'Kochi', '+91 94471 22334', '2023-03-20', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-103', 'Anas Mohammed', 'TECHNICIAN', 'Kochi', '+91 97460 33445', '2023-06-10', 'ACTIVE', 'TRAINING_REQUIRED'),
('HS-EMP-104', 'Suresh Babu', 'DRIVER', 'Kochi', '+91 98950 44556', '2023-02-01', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-105', 'Jayan Varghese', 'SUPERVISOR', 'Trivandrum', '+91 94460 55667', '2023-04-12', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-106', 'Manoj Pillai', 'TECHNICIAN', 'Trivandrum', '+91 98461 66778', '2023-07-05', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-107', 'Faizal Rahman', 'SUPERVISOR', 'Kozhikode', '+91 97450 77889', '2023-02-28', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-108', 'Biju Balakrishnan', 'SENIOR_TECHNICIAN', 'Kozhikode', '+91 94960 88990', '2023-05-18', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-109', 'Naveen Rajan', 'SUPERVISOR', 'Thrissur', '+91 98472 99001', '2023-08-01', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-110', 'Rahul Menon', 'TECHNICIAN', 'Thrissur', '+91 94473 10112', '2023-09-15', 'ACTIVE', 'UP_TO_DATE')
ON CONFLICT (employee_code) DO NOTHING;

-- -------------------------------------------------------------
-- 3. SEED SAMPLE REALISTIC COMPLAINTS
-- -------------------------------------------------------------
INSERT INTO public.complaints (
    id,
    complaint_number,
    reporting_date,
    reported_by_name,
    customer_name,
    customer_phone,
    customer_address,
    city,
    service_type,
    job_id,
    job_date,
    job_value,
    category,
    severity,
    status,
    assigned_investigator_name,
    title,
    description,
    pre_service_checklist_done,
    post_service_signoff_done,
    before_photos_available,
    after_photos_available,
    work_order_verified
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'HS-CMP-202610-1001',
    NOW() - INTERVAL '3 days',
    'Ashish Roy (Operations Desk)',
    'Mathew Varghese',
    '+91 98471 55660',
    'Skyline Imperial Heights, Flat 7B, Panampilly Nagar',
    'Kochi',
    'DEEP_CLEANING',
    'JOB-KC-9012',
    (CURRENT_DATE - INTERVAL '3 days')::DATE,
    14500.00,
    'DAMAGE_ISSUE',
    'MAJOR',
    'UNDER_INVESTIGATION',
    'Govindan Nair (Ops Lead)',
    'Micro-scratch marks reported on Italian marble floor in master bedroom',
    'Customer observed circular buffing swirl marks and slight haziness on polished Italian beige marble after single-disc scrubbing. Believes incorrect floor pad or abrasive chemical was utilized.',
    true,
    false,
    true,
    true,
    true
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    'HS-CMP-202610-1002',
    NOW() - INTERVAL '2 days',
    'Deepa Pillai (Scheduling Desk)',
    'Amina Beevi',
    '+91 94472 88991',
    'Kowdiar Heritage Villa, Golf Links Road',
    'Trivandrum',
    'SOFA_CARPET_SHAMPOO',
    'JOB-TV-4410',
    (CURRENT_DATE - INTERVAL '2 days')::DATE,
    6500.00,
    'SKILL_ISSUE',
    'MODERATE',
    'REWORK_IN_PROGRESS',
    'Jayan Varghese (Supervisor)',
    'Damp smell and water ring on 7-seater fabric sofa after extraction',
    'Client called stating 7-seater sectional sofa remained excessively damp 48 hours post-shampooing with faint musty odor. Moisture extraction appears incomplete.',
    true,
    true,
    false,
    true,
    true
),
(
    'a1b2c3d4-0003-4000-8000-000000000003',
    'HS-CMP-202610-1003',
    NOW() - INTERVAL '1 day',
    'Ramesh Nair (BDA)',
    'Dr. Haridasan Nair',
    '+91 97451 22334',
    'Hill View Meadows, Mavoor Road',
    'Kozhikode',
    'MOVE_IN_OUT_CLEANING',
    'JOB-KZ-1029',
    (CURRENT_DATE - INTERVAL '1 day')::DATE,
    18000.00,
    'LATE_START',
    'MINOR',
    'RESOLVED',
    'Faizal Rahman (Ops Lead)',
    'Crew arrived 1 hour 45 minutes late due to bypass vehicle puncture',
    'Team was booked for 09:00 AM start, but vehicle tire puncture near Ramanattukara delayed arrival to 10:45 AM. Customer had taken leave from clinic and was upset.',
    false,
    true,
    false,
    true,
    true
),
(
    'a1b2c3d4-0004-4000-8000-000000000004',
    'HS-CMP-202610-1004',
    NOW() - INTERVAL '12 hours',
    'Ananya Sen (Customer Support)',
    'Nandakumar Menon',
    '+91 98473 33445',
    'Sobha Silver Lake, Puzhakkal',
    'Thrissur',
    'KITCHEN_DEGREASING',
    'JOB-TS-8812',
    CURRENT_DATE,
    7500.00,
    'SCOPE_MISSED',
    'MODERATE',
    'REGISTERED',
    'Naveen Rajan (Supervisor)',
    'Interior of modular pantry cabinets and exhaust baffle filters not degreased',
    'Client notes kitchen counter and hob were cleaned thoroughly, but modular pantry internal shelving and chimney baffle grease traps were left untouched despite being in booking quote.',
    false,
    false,
    true,
    false,
    true
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 4. SEED SAMPLE PARTICIPANTS & INITIAL COSTS
-- -------------------------------------------------------------
INSERT INTO public.complaint_participants (
    complaint_id,
    employee_id,
    role_on_job,
    allegation_status
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-101'),
    'SUPERVISOR',
    'PARTICIPANT'
),
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-102'),
    'PRIMARY_TECHNICIAN',
    'NAMED_IN_COMPLAINT'
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-105'),
    'SUPERVISOR',
    'PARTICIPANT'
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-106'),
    'PRIMARY_TECHNICIAN',
    'PARTICIPANT'
)
ON CONFLICT (complaint_id, employee_id) DO NOTHING;

-- Initial Cost Records
INSERT INTO public.cost_records (
    complaint_id,
    cost_type,
    description,
    amount,
    status,
    is_company_absorption
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'DAMAGE_REPAIR_VENDOR',
    'Estimated diamond crystallizer re-polishing cost by specialized marble restoration contractor',
    4500.00,
    'ESTIMATED',
    true
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    'REWORK_LABOUR',
    'Senior technician re-extraction and deodorization pass scheduled',
    1200.00,
    'VERIFIED_INCURRED',
    true
),
(
    'a1b2c3d4-0003-4000-8000-000000000003',
    'CUSTOMER_DISCOUNT_COUPON',
    '₹1,000 compensation voucher issued for next service due to puncture delay',
    1000.00,
    'VERIFIED_INCURRED',
    true
);
