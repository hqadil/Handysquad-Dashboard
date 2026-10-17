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
