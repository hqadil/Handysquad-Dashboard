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
