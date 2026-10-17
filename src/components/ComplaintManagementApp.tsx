// src/components/ComplaintManagementApp.tsx
// HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 4 - RESPONSIBILITY ENGINE & CORRECTIVE ACTIONS)

import React, { useState, useEffect, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TargetIcon,
  LayersIcon,
  CalendarIcon,
  BarChartIcon,
  TableIcon,
  GearIcon,
  FileTextIcon,
  MixerHorizontalIcon,
  InfoCircledIcon,
  PersonIcon,
  ArchiveIcon,
  ClockIcon,
  DownloadIcon,
  ArrowTopRightIcon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { 
  Complaint, 
  ComplaintCategory, 
  ComplaintSeverity, 
  ComplaintStatus, 
  KeralaCity, 
  ServiceType,
  ComplaintDashboardSummary,
  Employee,
  ComplaintEvidence,
  EvidenceType,
  InvestigationRecord,
  ComplaintParticipant,
  ResponsibilityAssessment,
  ResponsibleParty,
  AssessmentStatus,
  CorrectiveAction,
  CorrectiveActionType,
  CorrectiveActionStatus,
  CostRecord,
  ApprovalRecord,
  TrainingRecord,
  CostType,
  CostStatus,
  ApprovalType,
  ApprovalDecision
} from '../types/complaints';
import { 
  fetchComplaints, 
  computeComplaintDashboardSummary, 
  fetchEmployees,
  updateComplaintStatus,
  assignComplaintInvestigator,
  addComplaintComment,
  exportComplaintsToCSV,
  fetchComplaintEvidence,
  uploadComplaintEvidence,
  verifyComplaintEvidence,
  fetchInvestigationRecord,
  saveInvestigationRecord,
  updateParticipantStatement,
  evaluateComplaintResponsibility,
  confirmComplaintAssessment,
  fetchComplaintAssessments,
  fetchCorrectiveActions,
  createCorrectiveAction,
  updateCorrectiveActionStatus,
  fetchComplaintCosts,
  addComplaintCost,
  verifyComplaintCost,
  fetchComplaintApprovals,
  submitApprovalDecision,
  fetchEmployeeTrainingRecords,
  assignEmployeeTraining,
  completeEmployeeTraining,
  fetchAuditLogs,
  CATEGORY_EVIDENCE_RULES
} from '../lib/complaintsService';
import { formatINR } from '../lib/finance';
import { ResponsibilityEvaluationResult } from '../lib/responsibilityEngine';

interface ComplaintManagementAppProps {
  onSwitchToEconomicCalculator: () => void;
}

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  PROCESS_ISSUE: 'Process & Protocol Issue',
  DAMAGE_ISSUE: 'Surface / Property Damage',
  SKILL_ISSUE: 'Workmanship / Skill Gap',
  SCOPE_CONFUSION: 'Scope & Booking Confusion',
  MACHINE_ISSUE: 'Equipment / Machine Failure',
  LATE_START: 'Late Arrival / Delayed Start',
  LATE_COMPLETION: 'Late Completion / Overrun',
  SCOPE_MISSED: 'Missed Cleaning Areas',
  CUSTOMER_EXPERIENCE: 'Staff Demeanor & Experience',
  COMPANY_GOODWILL_DECISION: 'Company Goodwill Decision',
};

const SEVERITY_COLORS: Record<ComplaintSeverity, { text: string; bg: string; border: string }> = {
  MINOR: { text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  MODERATE: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  MAJOR: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  CRITICAL: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const STATUS_BADGES: Record<ComplaintStatus, { label: string; bg: string; text: string }> = {
  REGISTERED: { label: 'Registered', bg: 'bg-blue-50', text: 'text-blue-700' },
  INVESTIGATION_PENDING: { label: 'Investigation Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  EVIDENCE_REVIEW: { label: 'Evidence Review', bg: 'bg-purple-50', text: 'text-purple-700' },
  ASSESSMENT_COMPLETED: { label: 'Assessed', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  APPROVAL_PENDING: { label: 'Approval Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
  CORRECTIVE_ACTION_REQUIRED: { label: 'Action Required', bg: 'bg-orange-50', text: 'text-orange-700' },
  REWORK_IN_PROGRESS: { label: 'Rework In Progress', bg: 'bg-rose-50', text: 'text-rose-700' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-600' },
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  BEFORE_PHOTO: 'Before Photo (Pre-Service)',
  AFTER_PHOTO: 'After Photo (Post-Service)',
  WORK_ORDER: 'Work Order & Booking Order',
  CHECKLIST: 'Signed Inspection Checklist',
  CUSTOMER_COMMUNICATION: 'Customer WhatsApp/SMS/Call',
  SCOPE_CHANGE: 'Scope Change Document',
  MAINTENANCE_RECORD: 'Machine Maintenance Log',
  TRAINING_RECORD: 'Staff Training Certificate',
  COMPLETION_SIGNOFF: 'Customer Completion Signoff',
  DAMAGE_ASSESSMENT: 'Damage Expert Assessment',
  REWORK_PHOTO: 'Rework Verification Photo',
  AUDIO_RECORDING: 'Recorded Audio/Call Voice Note',
  OTHER_DOCUMENT: 'Supporting Document',
};

const RESPONSIBLE_PARTY_LABELS: Record<ResponsibleParty, { label: string; bg: string; text: string }> = {
  COMPANY: { label: 'Company Absorption (Operational Overhead)', bg: 'bg-rose-50', text: 'text-rose-700' },
  EMPLOYEE_INDIVIDUAL: { label: 'Employee Individual (Coaching/Retraining)', bg: 'bg-amber-50', text: 'text-amber-700' },
  CREW_SHARED: { label: 'Crew Shared Responsibility', bg: 'bg-orange-50', text: 'text-orange-700' },
  CUSTOMER: { label: 'Customer (Pre-Existing / Scope Gap)', bg: 'bg-blue-50', text: 'text-blue-700' },
  THIRD_PARTY_VENDOR: { label: 'Third-Party Contractor / Vendor', bg: 'bg-purple-50', text: 'text-purple-700' },
  NO_FAULT_GOODWILL: { label: 'No-Fault Goodwill Decision', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const CORRECTIVE_ACTION_LABELS: Record<CorrectiveActionType, string> = {
  REWORK_SERVICE: 'Complimentary Rework Pass',
  APOLOGY_CALL_VISIT: 'Senior Lead Apology & Courtesy Visit',
  TRAINING_ASSIGNMENT: 'Targeted Skill / Chemical Coaching',
  SOP_PROCESS_UPDATE: 'SOP & Scope Policy Update',
  EQUIPMENT_OVERHAUL: 'Machinery Overhaul & Filter Replacement',
  SUPERVISION_AUDIT: 'Field Supervision Spot Audit',
  DOCUMENTATION_POLICY_MANDATE: 'Pre-Service Documentation Mandate',
  COACHING_COUNSELING: '1-on-1 Performance Counseling',
};

const ROOT_CAUSE_CATEGORIES = [
  { id: 'INDIVIDUAL_SKILL_GAP', label: 'Individual Skill / Technique Gap' },
  { id: 'INSUFFICIENT_TIME_ALLOCATION', label: 'Insufficient Time Allocation / Rushed Job' },
  { id: 'EQUIPMENT_MALFUNCTION', label: 'Equipment Malfunction / Debris Trap' },
  { id: 'CHEMICAL_MISAPPLICATION', label: 'Chemical Misapplication / Dilution Error' },
  { id: 'CUSTOMER_MISUNDERSTANDING', label: 'Customer Misunderstanding of Scope' },
  { id: 'SCOPE_NOT_IN_WORK_ORDER', label: 'Scope Not Included in Work Order' },
  { id: 'PRE_EXISTING_DEFECT_NOT_DOCUMENTED', label: 'Pre-Existing Defect (Missed on Pre-Check)' },
  { id: 'SUPERVISION_LAPSE', label: 'Supervision & Quality Check Lapse' },
  { id: 'LOGISTICAL_TRAFFIC_DELAY', label: 'Logistical / Transit Delay' },
  { id: 'FATIGUE_OVERBURDEN', label: 'Crew Fatigue / Overburden' },
  { id: 'COMPANY_GOODWILL', label: 'Company Goodwill Gesture' },
];

export default function ComplaintManagementApp({ onSwitchToEconomicCalculator }: ComplaintManagementAppProps) {
  // Navigation Section
  const [activeSubTab, setActiveSubTab] = useState<
    'Dashboard' | 'Register' | 'Evidence Centre' | 'Responsibility Review' | 'Approvals' | 'Employees' | 'Financial' | 'Reports' | 'Audit' | 'Rules'
  >('Dashboard');

  // Audit History State
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');

  // Quick Preset Filter for Register
  const [quickPreset, setQuickPreset] = useState<'all' | 'open' | 'critical' | 'approvals' | 'missing_evidence' | 'rework' | 'closed'>('all');

  // Complaints & Employees Data
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<ComplaintDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Evidence Centre Filters
  const [evidenceFilterComplaint, setEvidenceFilterComplaint] = useState<string>('ALL');
  const [evidenceFilterType, setEvidenceFilterType] = useState<string>('ALL');
  const [evidenceFilterVerified, setEvidenceFilterVerified] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [previewingEvidence, setPreviewingEvidence] = useState<ComplaintEvidence | null>(null);

  // Sorting State for Register
  const [sortField, setSortField] = useState<'reportingDate' | 'severity' | 'jobValue' | 'status'>('reportingDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Selected Complaint for Deep Inspection Drawer
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'overview' | 'crew' | 'evidence' | 'investigation' | 'assessment' | 'corrective' | 'financial' | 'approvals' | 'actions'>('overview');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Investigation Form State inside Drawer
  const [investigationData, setInvestigationData] = useState<Partial<InvestigationRecord>>({
    investigationStatus: 'IN_PROGRESS',
    customerStatement: '',
    supervisorStatement: '',
    technicianStatements: '',
    equipmentStatusCheck: '',
    materialsUsedCheck: '',
    arrivalDepartureVerification: '',
    rootCauseAnalysis: '',
    rootCauseCategory: 'EQUIPMENT_MALFUNCTION',
    isPreExistingDamage: false,
    findingsSummary: '',
  });
  const [savingInvestigation, setSavingInvestigation] = useState(false);

  // Responsibility Assessment State inside Drawer & Review
  const [assessmentsList, setAssessmentsList] = useState<ResponsibilityAssessment[]>([]);
  const [provisionalEvaluation, setProvisionalEvaluation] = useState<ResponsibilityEvaluationResult | null>(null);
  const [evaluatingResponsibility, setEvaluatingResponsibility] = useState(false);
  const [confirmingAssessment, setConfirmingAssessment] = useState(false);

  // Corrective Actions State inside Drawer
  const [correctiveActionsList, setCorrectiveActionsList] = useState<CorrectiveAction[]>([]);
  const [showAddCorrectiveModal, setShowAddCorrectiveModal] = useState(false);
  const [newCorrectiveForm, setNewCorrectiveForm] = useState<{
    actionType: CorrectiveActionType;
    title: string;
    description: string;
    assignedToEmployeeId: string;
    dueDate: string;
  }>({
    actionType: 'REWORK_SERVICE',
    title: '',
    description: '',
    assignedToEmployeeId: '',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
  });
  const [savingCorrective, setSavingCorrective] = useState(false);

  // Upload Evidence Modal State
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);
  const [targetComplaintForUpload, setTargetComplaintForUpload] = useState<string>('');
  const [uploadEvidenceForm, setUploadEvidenceForm] = useState<{
    evidenceType: EvidenceType;
    title: string;
    description: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    fileBase64: string;
    uploadedByName: string;
  }>({
    evidenceType: 'BEFORE_PHOTO',
    title: '',
    description: '',
    fileName: '',
    fileSizeBytes: 0,
    mimeType: 'image/jpeg',
    fileBase64: '',
    uploadedByName: 'Operations Lead',
  });
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Verify Evidence Note Modal State
  const [verifyingEvidenceItem, setVerifyingEvidenceItem] = useState<{ complaintId: string; evidenceId: string } | null>(null);
  const [verificationNotesInput, setVerificationNotesInput] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Participant Statement Modal State
  const [recordingStatementParticipant, setRecordingStatementParticipant] = useState<ComplaintParticipant | null>(null);
  const [statementText, setStatementText] = useState('');
  const [allegationStatusChoice, setAllegationStatusChoice] = useState<'PARTICIPANT' | 'NAMED_IN_COMPLAINT' | 'EXONERATED' | 'SUBSTANTIATED'>('PARTICIPANT');
  const [savingStatement, setSavingStatement] = useState(false);

  // Register Complaint Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState<{
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: KeralaCity;
    serviceType: ServiceType;
    jobDate: string;
    jobValue: number;
    category: ComplaintCategory;
    severity: ComplaintSeverity;
    title: string;
    description: string;
    assignedInvestigatorId: string;
    assignedInvestigatorName: string;
    supervisorId: string;
    leadTechnicianId: string;
    preServiceChecklistDone: boolean;
    postServiceSignoffDone: boolean;
    beforePhotosAvailable: boolean;
    afterPhotosAvailable: boolean;
    workOrderVerified: boolean;
  }>({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    city: 'Kochi',
    serviceType: 'DEEP_CLEANING',
    jobDate: new Date().toISOString().split('T')[0],
    jobValue: 8500,
    category: 'DAMAGE_ISSUE',
    severity: 'MODERATE',
    title: '',
    description: '',
    assignedInvestigatorId: '',
    assignedInvestigatorName: '',
    supervisorId: '',
    leadTechnicianId: '',
    preServiceChecklistDone: false,
    postServiceSignoffDone: false,
    beforePhotosAvailable: false,
    afterPhotosAvailable: false,
    workOrderVerified: true,
  });

  // ==========================================
  // PHASE 5: EXECUTIVE APPROVALS STATE
  // ==========================================
  const [complaintApprovalsList, setComplaintApprovalsList] = useState<ApprovalRecord[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [targetComplaintForApproval, setTargetComplaintForApproval] = useState<Complaint | null>(null);
  const [approvalDecisionForm, setApprovalDecisionForm] = useState<{
    approvalType: ApprovalType;
    approverRole: 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN';
    approverName: string;
    decision: ApprovalDecision;
    comments: string;
    conditions: string;
    financialAmountApproved: number;
  }>({
    approvalType: 'RESPONSIBILITY_ASSESSMENT',
    approverRole: 'OPERATIONS_MANAGER',
    approverName: 'Harikrishnan Menon (Operations Manager)',
    decision: 'APPROVED',
    comments: '',
    conditions: '',
    financialAmountApproved: 0,
  });
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [approvalsRoleFilter, setApprovalsRoleFilter] = useState<'ALL' | 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN'>('ALL');

  // ==========================================
  // PHASE 5: FINANCIAL LEDGER & EXPENSES STATE
  // ==========================================
  const [complaintCostsList, setComplaintCostsList] = useState<CostRecord[]>([]);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [targetComplaintForCost, setTargetComplaintForCost] = useState<string>('');
  const [costForm, setCostForm] = useState<{
    costType: CostType;
    description: string;
    amount: number;
    status: CostStatus;
    vendorName: string;
    invoiceReceiptRef: string;
    isCompanyAbsorption: boolean;
    proposedEmployeeShare: number;
  }>({
    costType: 'REWORK_LABOUR',
    description: '',
    amount: 1500,
    status: 'ESTIMATED',
    vendorName: '',
    invoiceReceiptRef: '',
    isCompanyAbsorption: true,
    proposedEmployeeShare: 0,
  });
  const [submittingCost, setSubmittingCost] = useState(false);
  const [costTypeFilter, setCostTypeFilter] = useState<string>('ALL');
  const [costStatusFilter, setCostStatusFilter] = useState<string>('ALL');

  // ==========================================
  // PHASE 5: EMPLOYEE COACHING & CAREER DOSSIER
  // ==========================================
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null);
  const [employeeTrainingList, setEmployeeTrainingList] = useState<TrainingRecord[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [showAssignTrainingModal, setShowAssignTrainingModal] = useState(false);
  const [assignTrainingForm, setAssignTrainingForm] = useState<{
    moduleCode: string;
    moduleTitle: string;
    category: string;
    trainerName: string;
    scheduledDate: string;
    notes: string;
  }>({
    moduleCode: 'SOP-DEL-01',
    moduleTitle: 'Natural Stone & Acid-Sensitive Surface Protection',
    category: 'DELICATE_SURFACES',
    trainerName: 'Govindan Nair (Master Trainer)',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submittingTraining, setSubmittingTraining] = useState(false);

  // Load Complaints & Employees
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [complaintsData, employeesData] = await Promise.all([
          fetchComplaints({
            city: selectedCity !== 'ALL' ? selectedCity : undefined,
            category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
            severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
            status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
            searchQuery: searchQuery || undefined,
          }),
          fetchEmployees(),
        ]);
        setComplaints(complaintsData);
        setEmployees(employeesData);
        const summ = await computeComplaintDashboardSummary(complaintsData);
        setSummary(summ);
      } catch (err) {
        console.error('Failed to load complaint data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCity, selectedCategory, selectedSeverity, selectedStatus, searchQuery]);

  // Load Investigation, Evidence, Assessments, Corrective Actions, Costs, and Approvals for Selected Complaint
  useEffect(() => {
    if (!selectedComplaint) return;
    async function loadDetails() {
      try {
        const [inv, evList, asList, caList, costList, appList] = await Promise.all([
          fetchInvestigationRecord(selectedComplaint!.id),
          fetchComplaintEvidence(selectedComplaint!.id),
          fetchComplaintAssessments(selectedComplaint!.id),
          fetchCorrectiveActions(selectedComplaint!.id),
          fetchComplaintCosts(selectedComplaint!.id),
          fetchComplaintApprovals(selectedComplaint!.id),
        ]);
        if (inv) {
          setInvestigationData(inv);
        } else {
          setInvestigationData({
            investigationStatus: 'IN_PROGRESS',
            customerStatement: '',
            supervisorStatement: '',
            technicianStatements: '',
            equipmentStatusCheck: '',
            materialsUsedCheck: '',
            arrivalDepartureVerification: '',
            rootCauseAnalysis: '',
            rootCauseCategory: 'EQUIPMENT_MALFUNCTION',
            isPreExistingDamage: false,
            findingsSummary: '',
          });
        }
        if (evList && evList.length > 0) {
          setSelectedComplaint(prev => prev ? { ...prev, evidence: evList } : null);
        }
        setAssessmentsList(asList || []);
        setCorrectiveActionsList(caList || []);
        setComplaintCostsList(costList || []);
        setComplaintApprovalsList(appList || []);
      } catch (err) {
        console.warn('Error loading complaint details:', err);
      }
    }
    loadDetails();
  }, [selectedComplaint?.id]);

  // Load Training Records when Employee Selected
  useEffect(() => {
    if (!selectedEmployeeForDetail) {
      setEmployeeTrainingList([]);
      return;
    }
    async function loadTraining() {
      setLoadingTraining(true);
      try {
        const records = await fetchEmployeeTrainingRecords(selectedEmployeeForDetail!.id);
        setEmployeeTrainingList(records);
      } catch (err) {
        console.warn('Error loading employee training records:', err);
      } finally {
        setLoadingTraining(false);
      }
    }
    loadTraining();
  }, [selectedEmployeeForDetail?.id]);

  // Load Audit Logs when Audit History Tab Selected
  useEffect(() => {
    if (activeSubTab === 'Audit') {
      setLoadingAuditLogs(true);
      fetchAuditLogs().then(logs => {
        setAuditLogsList(logs);
        setLoadingAuditLogs(false);
      });
    }
  }, [activeSubTab]);

  // City-filtered Employees for dropdowns
  const availableSupervisors = useMemo(() => {
    return employees.filter(e => e.city === newForm.city && e.designation === 'SUPERVISOR');
  }, [employees, newForm.city]);

  // Filtered and Sorted Complaints for Register
  const displayedComplaints = useMemo(() => {
    let result = [...complaints];

    if (quickPreset === 'open') {
      result = result.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED');
    } else if (quickPreset === 'critical') {
      result = result.filter(c => c.severity === 'CRITICAL' || c.severity === 'MAJOR');
    } else if (quickPreset === 'approvals') {
      result = result.filter(c => c.status === 'APPROVAL_PENDING');
    } else if (quickPreset === 'missing_evidence') {
      result = result.filter(c => !c.preServiceChecklistDone || !c.workOrderVerified || (!c.beforePhotosAvailable && !c.afterPhotosAvailable));
    } else if (quickPreset === 'rework') {
      result = result.filter(c => c.status === 'REWORK_IN_PROGRESS');
    } else if (quickPreset === 'closed') {
      result = result.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED');
    }

    if (dateRangePreset !== 'all') {
      const now = Date.now();
      if (dateRangePreset === '7d') {
        const cutoff = now - 7 * 86400000;
        result = result.filter(c => new Date(c.reportingDate).getTime() >= cutoff);
      } else if (dateRangePreset === '30d') {
        const cutoff = now - 30 * 86400000;
        result = result.filter(c => new Date(c.reportingDate).getTime() >= cutoff);
      } else if (dateRangePreset === 'this_month') {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        result = result.filter(c => new Date(c.reportingDate).getTime() >= firstDayOfMonth);
      }
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'reportingDate') {
        comparison = new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime();
      } else if (sortField === 'jobValue') {
        comparison = (b.jobValue || 0) - (a.jobValue || 0);
      } else if (sortField === 'severity') {
        const weight: Record<ComplaintSeverity, number> = { CRITICAL: 4, MAJOR: 3, MODERATE: 2, MINOR: 1 };
        comparison = weight[b.severity] - weight[a.severity];
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortAsc ? -comparison : comparison;
    });

    return result;
  }, [complaints, quickPreset, dateRangePreset, sortField, sortAsc]);

  // Aggregate Evidence for Evidence Centre
  const allEvidence = useMemo(() => {
    const list: Array<ComplaintEvidence & { complaintNumber: string; customerName: string; category: ComplaintCategory; city: KeralaCity }> = [];
    complaints.forEach(c => {
      (c.evidence || []).forEach(e => {
        list.push({
          ...e,
          complaintNumber: c.complaintNumber,
          customerName: c.customerName,
          category: c.category,
          city: c.city,
        });
      });
    });
    return list;
  }, [complaints]);

  // Filtered Evidence for Evidence Centre
  const displayedEvidence = useMemo(() => {
    return allEvidence.filter(e => {
      if (evidenceFilterComplaint !== 'ALL' && e.complaintId !== evidenceFilterComplaint) return false;
      if (evidenceFilterType !== 'ALL' && e.evidenceType !== evidenceFilterType) return false;
      if (evidenceFilterVerified === 'VERIFIED' && !e.isVerified) return false;
      if (evidenceFilterVerified === 'UNVERIFIED' && e.isVerified) return false;
      return true;
    });
  }, [allEvidence, evidenceFilterComplaint, evidenceFilterType, evidenceFilterVerified]);

  // Missing Evidence Analysis across complaints
  const missingEvidenceComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (c.status === 'RESOLVED' || c.status === 'CLOSED') return false;
      const rule = CATEGORY_EVIDENCE_RULES[c.category];
      if (!rule) return false;
      const uploadedTypes = new Set((c.evidence || []).map(e => e.evidenceType));
      return rule.mandatory.some(m => !uploadedTypes.has(m));
    });
  }, [complaints]);

  // SLA Ageing Calculator helper
  const getSLAInfo = (reportingDate: string, status: ComplaintStatus) => {
    const hours = Math.round((Date.now() - new Date(reportingDate).getTime()) / (1000 * 60 * 60));
    const isOverdue = (status !== 'RESOLVED' && status !== 'CLOSED') && hours > 48;
    if (hours < 24) {
      return { text: `${hours}h ago`, isOverdue: false, badge: 'New (<24h)' };
    }
    const days = Math.round(hours / 24);
    return {
      text: `${days}d ago`,
      isOverdue,
      badge: isOverdue ? 'Overdue (>48h)' : `${days} days open`,
    };
  };

  // Run Server-side Responsibility Engine
  const handleRunResponsibilityEngine = async (complaintId?: string) => {
    const targetId = complaintId || selectedComplaint?.id;
    if (!targetId) return;

    setEvaluatingResponsibility(true);
    try {
      const evaluation = await evaluateComplaintResponsibility(targetId);
      if (evaluation) {
        setProvisionalEvaluation(evaluation);
      }
    } catch (err) {
      console.error('Error running responsibility engine:', err);
    } finally {
      setEvaluatingResponsibility(false);
    }
  };

  // Confirm and Record Assessment to Database
  const handleConfirmAssessment = async () => {
    if (!selectedComplaint || !provisionalEvaluation) return;

    setConfirmingAssessment(true);
    try {
      const recorded = await confirmComplaintAssessment(selectedComplaint.id, {
        assessmentStatus: provisionalEvaluation.assessmentStatus,
        primaryResponsibleParty: provisionalEvaluation.primaryResponsibleParty,
        companySharePct: provisionalEvaluation.companySharePct,
        employeeSharePct: provisionalEvaluation.employeeSharePct,
        responsibleEmployeeId: provisionalEvaluation.responsibleEmployeeId,
        rationale: provisionalEvaluation.rationale,
        evidenceReviewedSummary: provisionalEvaluation.evidenceReviewedSummary,
        conflictingEvidenceNotes: provisionalEvaluation.conflictingEvidenceNotes,
        recommendedCorrectiveAction: provisionalEvaluation.recommendedCorrectiveAction,
        recommendedCorrectiveActionType: provisionalEvaluation.recommendedCorrectiveActionType,
        requiredApprovalAuthority: provisionalEvaluation.requiredApprovalAuthority,
        assessedByName: 'Operations Lead (Investigation Desk)',
      });

      if (recorded) {
        alert('Responsibility Assessment Confirmed & Submitted to Executive Approval Queue!');
        setAssessmentsList([recorded, ...assessmentsList]);
        setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, status: 'APPROVAL_PENDING' } : c));
        setSelectedComplaint(prev => prev ? { ...prev, status: 'APPROVAL_PENDING' } : null);
        setProvisionalEvaluation(null);

        // Refresh corrective actions
        const ca = await fetchCorrectiveActions(selectedComplaint.id);
        setCorrectiveActionsList(ca);
      }
    } catch (err) {
      console.error('Failed to confirm assessment:', err);
    } finally {
      setConfirmingAssessment(false);
    }
  };

  // Create Corrective Action
  const handleCreateCorrectiveActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSavingCorrective(true);
    try {
      const created = await createCorrectiveAction(selectedComplaint.id, newCorrectiveForm);
      if (created) {
        setCorrectiveActionsList([created, ...correctiveActionsList]);
        setShowAddCorrectiveModal(false);
        setNewCorrectiveForm({
          actionType: 'REWORK_SERVICE',
          title: '',
          description: '',
          assignedToEmployeeId: '',
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        });
        alert('Corrective Action assigned successfully!');
      }
    } catch (err) {
      console.error('Error creating corrective action:', err);
    } finally {
      setSavingCorrective(false);
    }
  };

  // Toggle Corrective Action Status
  const handleToggleCorrectiveActionStatus = async (actionId: string, nextStatus: CorrectiveActionStatus) => {
    if (!selectedComplaint) return;
    try {
      const ok = await updateCorrectiveActionStatus(
        selectedComplaint.id,
        actionId,
        nextStatus,
        nextStatus === 'VERIFIED_EFFECTIVE' ? 'Inspected and verified effective by Operations Lead' : undefined
      );
      if (ok) {
        setCorrectiveActionsList(prev => prev.map(ca => ca.id === actionId ? { ...ca, status: nextStatus } : ca));
      }
    } catch (err) {
      console.error('Error updating corrective action status:', err);
    }
  };

  // File Input Selection
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadEvidenceForm(prev => ({
        ...prev,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || 'image/jpeg',
        fileBase64: reader.result as string,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  // Evidence Upload Submit
  const handleEvidenceUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = targetComplaintForUpload || selectedComplaint?.id;
    if (!targetId) return;

    setUploadingEvidence(true);
    try {
      const newEv = await uploadComplaintEvidence(targetId, uploadEvidenceForm);
      if (newEv) {
        setComplaints(prev => prev.map(c => {
          if (c.id === targetId) {
            const updatedEv = [newEv, ...(c.evidence || [])];
            return {
              ...c,
              evidence: updatedEv,
              beforePhotosAvailable: c.beforePhotosAvailable || newEv.evidenceType === 'BEFORE_PHOTO',
              afterPhotosAvailable: c.afterPhotosAvailable || newEv.evidenceType === 'AFTER_PHOTO',
              preServiceChecklistDone: c.preServiceChecklistDone || newEv.evidenceType === 'CHECKLIST',
              postServiceSignoffDone: c.postServiceSignoffDone || newEv.evidenceType === 'COMPLETION_SIGNOFF',
              workOrderVerified: c.workOrderVerified || newEv.evidenceType === 'WORK_ORDER',
            };
          }
          return c;
        }));

        if (selectedComplaint && selectedComplaint.id === targetId) {
          setSelectedComplaint(prev => prev ? {
            ...prev,
            evidence: [newEv, ...(prev.evidence || [])],
            beforePhotosAvailable: prev.beforePhotosAvailable || newEv.evidenceType === 'BEFORE_PHOTO',
            afterPhotosAvailable: prev.afterPhotosAvailable || newEv.evidenceType === 'AFTER_PHOTO',
          } : null);
        }

        setShowUploadEvidenceModal(false);
        setUploadEvidenceForm({
          evidenceType: 'BEFORE_PHOTO',
          title: '',
          description: '',
          fileName: '',
          fileSizeBytes: 0,
          mimeType: 'image/jpeg',
          fileBase64: '',
          uploadedByName: 'Operations Lead',
        });
        alert('Evidence uploaded successfully to private storage vault!');
      }
    } catch (err) {
      console.error('Evidence upload failed:', err);
      alert('Upload failed. Check console.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Evidence Verification Submit
  const handleVerifyEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingEvidenceItem) return;

    setSubmittingVerification(true);
    try {
      const ok = await verifyComplaintEvidence(
        verifyingEvidenceItem.complaintId,
        verifyingEvidenceItem.evidenceId,
        true,
        verificationNotesInput.trim() || 'Verified against job work order'
      );
      if (ok) {
        setComplaints(prev => prev.map(c => {
          if (c.id === verifyingEvidenceItem.complaintId) {
            return {
              ...c,
              evidence: (c.evidence || []).map(ev => 
                ev.id === verifyingEvidenceItem.evidenceId ? { ...ev, isVerified: true, verificationNotes: verificationNotesInput } : ev
              ),
            };
          }
          return c;
        }));

        if (selectedComplaint && selectedComplaint.id === verifyingEvidenceItem.complaintId) {
          setSelectedComplaint(prev => prev ? {
            ...prev,
            evidence: (prev.evidence || []).map(ev => 
              ev.id === verifyingEvidenceItem.evidenceId ? { ...ev, isVerified: true, verificationNotes: verificationNotesInput } : ev
            ),
          } : null);
        }

        setVerifyingEvidenceItem(null);
        setVerificationNotesInput('');
      }
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Save Investigation Record
  const handleSaveInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSavingInvestigation(true);
    try {
      const saved = await saveInvestigationRecord(selectedComplaint.id, {
        ...investigationData,
        investigatorName: selectedComplaint.assignedInvestigatorName || 'Govindan Nair (Ops Lead)',
      });
      if (saved) {
        alert('Investigation findings & root cause analysis successfully recorded!');
        setComplaints(prev => prev.map(c => {
          if (c.id === selectedComplaint.id) {
            return {
              ...c,
              status: investigationData.investigationStatus === 'COMPLETED' ? 'ASSESSMENT_COMPLETED' : 'UNDER_INVESTIGATION',
            };
          }
          return c;
        }));
        setSelectedComplaint(prev => prev ? {
          ...prev,
          status: investigationData.investigationStatus === 'COMPLETED' ? 'ASSESSMENT_COMPLETED' : 'UNDER_INVESTIGATION',
        } : null);
      }
    } catch (err) {
      console.error('Failed to save investigation:', err);
    } finally {
      setSavingInvestigation(false);
    }
  };

  // Save Participant Statement
  const handleSaveParticipantStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !recordingStatementParticipant) return;

    setSavingStatement(true);
    try {
      const ok = await updateParticipantStatement(
        selectedComplaint.id,
        recordingStatementParticipant.id,
        statementText.trim(),
        allegationStatusChoice
      );
      if (ok) {
        const updatedParticipants = (selectedComplaint.participants || []).map(p => 
          p.id === recordingStatementParticipant.id ? { ...p, statement: statementText, allegationStatus: allegationStatusChoice } : p
        );
        setSelectedComplaint({ ...selectedComplaint, participants: updatedParticipants });
        setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, participants: updatedParticipants } : c));
        setRecordingStatementParticipant(null);
        setStatementText('');
        alert('Employee statement saved to case file!');
      }
    } finally {
      setSavingStatement(false);
    }
  };

  // Register Complaint Submission
  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const participantsPayload = [];
      if (newForm.supervisorId) {
        participantsPayload.push({ employeeId: newForm.supervisorId, roleOnJob: 'SUPERVISOR' });
      }
      if (newForm.leadTechnicianId) {
        participantsPayload.push({ employeeId: newForm.leadTechnicianId, roleOnJob: 'PRIMARY_TECHNICIAN' });
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          participants: participantsPayload,
        }),
      });
      const data = await res.json();
      if (data.complaint) {
        setComplaints([data.complaint, ...complaints]);
        setShowRegisterModal(false);
        setNewForm({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          city: 'Kochi',
          serviceType: 'DEEP_CLEANING',
          jobDate: new Date().toISOString().split('T')[0],
          jobValue: 8500,
          category: 'DAMAGE_ISSUE',
          severity: 'MODERATE',
          title: '',
          description: '',
          assignedInvestigatorId: '',
          assignedInvestigatorName: '',
          supervisorId: '',
          leadTechnicianId: '',
          preServiceChecklistDone: false,
          postServiceSignoffDone: false,
          beforePhotosAvailable: false,
          afterPhotosAvailable: false,
          workOrderVerified: true,
        });
        alert(`Complaint Registered Successfully! Ticket: ${data.complaint.complaintNumber}`);
      }
    } catch (err) {
      alert('Failed to register complaint. Check console.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change in Detail Drawer
  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
    setUpdatingStatus(true);
    try {
      const success = await updateComplaintStatus(selectedComplaint.id, newStatus);
      if (success) {
        const updated = { ...selectedComplaint, status: newStatus };
        setSelectedComplaint(updated);
        setComplaints(complaints.map(c => (c.id === updated.id ? updated : c)));
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Investigator Assignment
  const handleAssignInvestigator = async (empId: string, empName: string) => {
    if (!selectedComplaint) return;
    try {
      const ok = await assignComplaintInvestigator(selectedComplaint.id, empId, empName);
      if (ok) {
        const updated = {
          ...selectedComplaint,
          assignedInvestigatorId: empId,
          assignedInvestigatorName: empName,
          status: 'UNDER_INVESTIGATION' as ComplaintStatus,
        };
        setSelectedComplaint(updated);
        setComplaints(complaints.map(c => (c.id === updated.id ? updated : c)));
        alert(`Investigator ${empName} assigned! Ticket marked Under Investigation.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !newCommentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const success = await addComplaintComment(selectedComplaint.id, {
        authorName: 'Operations Lead (Investigation Desk)',
        authorRole: 'OPERATIONS_TEAM',
        commentText: newCommentText.trim(),
      });
      if (success) {
        alert('Internal investigation note logged to audit trail!');
        setNewCommentText('');
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ==========================================
  // PHASE 5: APPROVAL HANDLERS
  // ==========================================
  const handleOpenApprovalModal = (complaint: Complaint) => {
    setTargetComplaintForApproval(complaint);
    const totalCost = (complaint.costs || []).reduce((acc, c) => acc + c.amount, 0);
    let role: 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN' = 'OPERATIONS_MANAGER';
    if (totalCost > 15000) {
      role = 'MANAGEMENT_ADMIN';
    } else if (totalCost >= 5000) {
      role = 'COO';
    }

    setApprovalDecisionForm({
      approvalType: 'RESPONSIBILITY_ASSESSMENT',
      approverRole: role,
      approverName: role === 'OPERATIONS_MANAGER' 
        ? 'Harikrishnan Menon (Operations Manager)' 
        : role === 'COO' 
          ? 'Suresh Kurup (Chief Operating Officer)' 
          : 'Director of Operations (Management Admin)',
      decision: 'APPROVED',
      comments: `Executive review completed for ${complaint.complaintNumber}. Evidence and responsibility findings ratified.`,
      conditions: totalCost > 5000 ? 'Supervisor must verify client signoff post-rectification' : '',
      financialAmountApproved: totalCost,
    });
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetComplaintForApproval) return;
    setSubmittingApproval(true);
    try {
      const result = await submitApprovalDecision(targetComplaintForApproval.id, approvalDecisionForm);
      if (result && result.approval) {
        const nextStatus = (result.nextStatus as ComplaintStatus) || targetComplaintForApproval.status;
        const updated = {
          ...targetComplaintForApproval,
          status: nextStatus,
        };
        setComplaints(prev => prev.map(c => c.id === targetComplaintForApproval.id ? updated : c));
        if (selectedComplaint?.id === targetComplaintForApproval.id) {
          setSelectedComplaint(updated);
          setComplaintApprovalsList(prev => [result.approval, ...prev]);
        }
        setShowApprovalModal(false);
        const summ = await computeComplaintDashboardSummary(
          complaints.map(c => c.id === targetComplaintForApproval.id ? updated : c)
        );
        setSummary(summ);
        alert(`Approval decision [${approvalDecisionForm.decision}] recorded successfully! Ticket status updated to ${nextStatus}.`);
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
      alert('Failed to record approval decision.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // ==========================================
  // PHASE 5: COST & EXPENSE HANDLERS
  // ==========================================
  const handleOpenAddCostModal = (complaintId?: string) => {
    setTargetComplaintForCost(complaintId || selectedComplaint?.id || complaints[0]?.id || '');
    setCostForm({
      costType: 'REWORK_LABOUR',
      description: 'Secondary rework crew labour cost for rectification visit',
      amount: 1500,
      status: 'ESTIMATED',
      vendorName: 'Handy Squad Direct Ops',
      invoiceReceiptRef: `REC-${Date.now().toString().slice(-6)}`,
      isCompanyAbsorption: true,
      proposedEmployeeShare: 0,
    });
    setShowAddCostModal(true);
  };

  const handleSubmitCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetComplaintForCost) return;
    setSubmittingCost(true);
    try {
      const newCost = await addComplaintCost(targetComplaintForCost, costForm);
      if (newCost) {
        const updatedComplaints = complaints.map(c => {
          if (c.id === targetComplaintForCost) {
            return {
              ...c,
              costs: [newCost, ...(c.costs || [])],
            };
          }
          return c;
        });
        setComplaints(updatedComplaints);
        if (selectedComplaint?.id === targetComplaintForCost) {
          setSelectedComplaint(prev => prev ? { ...prev, costs: [newCost, ...(prev.costs || [])] } : null);
          setComplaintCostsList(prev => [newCost, ...prev]);
        }
        setShowAddCostModal(false);
        const summ = await computeComplaintDashboardSummary(updatedComplaints);
        setSummary(summ);
        alert('Expense record booked successfully into complaint financial ledger!');
      }
    } catch (err) {
      console.error('Error adding cost:', err);
      alert('Failed to add cost record.');
    } finally {
      setSubmittingCost(false);
    }
  };

  const handleVerifyCost = async (complaintId: string, costId: string) => {
    try {
      const ok = await verifyComplaintCost(complaintId, costId, 'VERIFIED_INCURRED', 0, 'Operations Manager');
      if (ok) {
        const updatedComplaints = complaints.map(c => {
          if (c.id === complaintId) {
            const updatedCosts = (c.costs || []).map(cost => 
              cost.id === costId ? { ...cost, status: 'VERIFIED_INCURRED' as CostStatus, verifiedAt: new Date().toISOString() } : cost
            );
            return { ...c, costs: updatedCosts };
          }
          return c;
        });
        setComplaints(updatedComplaints);
        if (selectedComplaint?.id === complaintId) {
          setSelectedComplaint(prev => prev ? {
            ...prev,
            costs: (prev.costs || []).map(cost => cost.id === costId ? { ...cost, status: 'VERIFIED_INCURRED' as CostStatus } : cost)
          } : null);
          setComplaintCostsList(prev => prev.map(c => c.id === costId ? { ...c, status: 'VERIFIED_INCURRED' as CostStatus } : c));
        }
        const summ = await computeComplaintDashboardSummary(updatedComplaints);
        setSummary(summ);
        alert('Cost verified and audited as Incurred Company Loss!');
      }
    } catch (err) {
      console.error('Error verifying cost:', err);
    }
  };

  // Aggregated Cost Records Across All Active Complaints
  const allCostRecords = useMemo(() => {
    const list: (CostRecord & { complaintNumber: string; complaintTitle: string; complaintCategory: ComplaintCategory; complaintCity: KeralaCity })[] = [];
    complaints.forEach(c => {
      (c.costs || []).forEach(cost => {
        list.push({
          ...cost,
          complaintNumber: c.complaintNumber,
          complaintTitle: c.title,
          complaintCategory: c.category,
          complaintCity: c.city,
        });
      });
    });
    return list;
  }, [complaints]);

  // ==========================================
  // PHASE 5: EMPLOYEE TRAINING HANDLERS
  // ==========================================
  const handleAssignTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForDetail) return;
    setSubmittingTraining(true);
    try {
      const record = await assignEmployeeTraining(selectedEmployeeForDetail.id, assignTrainingForm);
      if (record) {
        setEmployeeTrainingList(prev => [record, ...prev]);
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployeeForDetail.id ? { ...emp, trainingStatus: 'TRAINING_REQUIRED' } : emp
        ));
        setSelectedEmployeeForDetail(prev => prev ? { ...prev, trainingStatus: 'TRAINING_REQUIRED' } : null);
        setShowAssignTrainingModal(false);
        alert(`Training Module "${assignTrainingForm.moduleTitle}" assigned to ${selectedEmployeeForDetail.fullName}!`);
      }
    } catch (err) {
      console.error('Error assigning training:', err);
      alert('Failed to assign training module.');
    } finally {
      setSubmittingTraining(false);
    }
  };

  const handleCompleteTraining = async (trainingId: string) => {
    if (!selectedEmployeeForDetail) return;
    try {
      const ok = await completeEmployeeTraining(
        selectedEmployeeForDetail.id,
        trainingId,
        96.0,
        'Demonstrated 100% SOP adherence on natural surface chemical selection and pre-masking'
      );
      if (ok) {
        setEmployeeTrainingList(prev => prev.map(t => 
          t.id === trainingId ? { ...t, status: 'COMPLETED_PASSED', scorePct: 96.0, completionDate: new Date().toISOString().split('T')[0] } : t
        ));
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployeeForDetail.id ? { ...emp, trainingStatus: 'UP_TO_DATE' } : emp
        ));
        setSelectedEmployeeForDetail(prev => prev ? { ...prev, trainingStatus: 'UP_TO_DATE' } : null);
        alert(`Module verified as COMPLETED PASSED (Score: 96.0%). ${selectedEmployeeForDetail.fullName}'s career status restored to UP TO DATE!`);
      }
    } catch (err) {
      console.error('Error completing training:', err);
      alert('Failed to complete training.');
    }
  };

  const navSections = [
    { id: 'Dashboard', label: 'Management Dashboard', icon: BarChartIcon },
    { id: 'Register', label: 'Complaint Register', icon: TableIcon },
    { id: 'Evidence Centre', label: 'Evidence Centre', icon: ArchiveIcon },
    { id: 'Responsibility Review', label: 'Responsibility Review', icon: TargetIcon },
    { id: 'Approvals', label: 'Approval Centre', icon: CheckCircledIcon },
    { id: 'Employees', label: 'Employee Tracker', icon: PersonIcon },
    { id: 'Financial', label: 'Financial Impact', icon: MixerHorizontalIcon },
    { id: 'Reports', label: 'Reports & Analytics', icon: FileTextIcon },
    { id: 'Audit', label: 'Audit History', icon: ClockIcon },
    { id: 'Rules', label: 'Rules & Governance', icon: GearIcon },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Banner Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-extrabold text-slate-900 tracking-tight">Handy Squad Complaints Hub</span>
          </div>
          <span className="text-xs text-slate-400">· Kerala Operations (Kochi, TVM, Kozhikode, Thrissur)</span>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {navSections.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'Evidence Centre' && missingEvidenceComplaints.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                    {missingEvidenceComplaints.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportComplaintsToCSV(displayedComplaints)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-sm"
            title="Download CSV report of complaints"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Register Complaint</span>
          </button>
        </div>
      </div>

      {/* Main Sub-Tab Workspace */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* SUB-TAB 1: MANAGEMENT DASHBOARD */}
        {activeSubTab === 'Dashboard' && summary && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Top Period & Hub Filter Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analytics Timeline:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {[
                    { id: 'all', label: 'All-Time' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'this_month', label: 'This Month' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDateRangePreset(p.id as any)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        dateRangePreset === p.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hub Filter:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 outline-none bg-white"
                >
                  <option value="ALL">All Kerala Hubs</option>
                  <option value="Kochi">Kochi Hub</option>
                  <option value="Trivandrum">Trivandrum Hub</option>
                  <option value="Kozhikode">Kozhikode Hub</option>
                  <option value="Thrissur">Thrissur Hub</option>
                </select>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Complaints</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{summary.openComplaints}</span>
                  <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Active Cases
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Resolved / Closed:</span>
                  <span className="font-bold text-slate-700">{summary.totalComplaints - summary.openComplaints}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Loss Absorption</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-600">{formatINR(summary.totalVerifiedLoss)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Pending Estimated:</span>
                  <span className="font-bold text-amber-700">{formatINR(summary.totalEstimatedLoss)}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical SLA & Escalations</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-orange-600">{summary.criticalCases}</span>
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    High Priority
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Pending Approvals:</span>
                  <span className="font-bold text-slate-700">{summary.pendingApprovals} Cases</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documentation Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600">{summary.documentationCompliancePct}%</span>
                  <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    SOP Compliance
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Rework Orders:</span>
                  <span className="font-bold text-slate-700">{summary.reworkCount} Scheduled</span>
                </div>
              </div>
            </div>

            {/* City Distribution and Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Kerala Hub Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(summary.cityCounts).map(([city, count]) => {
                    const pct = summary.totalComplaints > 0 ? Math.round((count / summary.totalComplaints) * 100) : 0;
                    return (
                      <div key={city} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 font-bold">{city} Hub</span>
                          <span className="text-slate-500 font-mono">{count} tickets ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">10-Category Incident Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {Object.entries(summary.categoryCounts).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">{CATEGORY_LABELS[cat as ComplaintCategory]}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{cat}</span>
                      </div>
                      <span className="font-black text-sm px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-indigo-700 shadow-sm">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: COMPLAINT REGISTER */}
        {activeSubTab === 'Register' && (
          <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn">
            {/* Quick Filter Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All Cases' },
                  { id: 'open', label: 'Open / In-Progress' },
                  { id: 'critical', label: 'Critical & Major' },
                  { id: 'missing_evidence', label: 'Missing Evidence' },
                  { id: 'rework', label: 'Rework Active' },
                  { id: 'closed', label: 'Resolved / Closed' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setQuickPreset(pill.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      quickPreset === pill.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search ticket #, customer, issue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 w-60 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Complaints Master Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Ticket Number</th>
                      <th className="py-3 px-4">Customer & Location</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">SLA Ageing</th>
                      <th className="py-3 px-4">Assigned Investigator</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {displayedComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No complaint tickets match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      displayedComplaints.map((c) => {
                        const sla = getSLAInfo(c.reportingDate, c.status);
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => setSelectedComplaint(c)}
                            className="hover:bg-slate-50/80 cursor-pointer transition"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                              {c.complaintNumber}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{c.customerName}</span>
                              <span className="text-[10px] text-slate-400">{c.city} · {c.serviceType.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800">{CATEGORY_LABELS[c.category]}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[c.severity].bg} ${SEVERITY_COLORS[c.severity].text} ${SEVERITY_COLORS[c.severity].border}`}>
                                {c.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sla.isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                                {sla.badge}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-slate-700">{c.assignedInvestigatorName || <span className="text-amber-600 italic">Unassigned</span>}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGES[c.status].bg} ${STATUS_BADGES[c.status].text}`}>
                                {STATUS_BADGES[c.status].label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedComplaint(c);
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                              >
                                Inspect →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: EVIDENCE CENTRE */}
        {activeSubTab === 'Evidence Centre' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Evidence Centre Header & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Vault Files</span>
                <span className="text-2xl font-black text-slate-900">{allEvidence.length} Recorded</span>
                <span className="text-[10px] text-slate-500 block">Private Supabase Storage Bucket</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Compliance</span>
                <span className="text-2xl font-black text-emerald-700">
                  {allEvidence.length > 0 ? Math.round((allEvidence.filter(e => e.isVerified).length / allEvidence.length) * 100) : 0}%
                </span>
                <span className="text-[10px] text-emerald-600 block">Checked by Operations Lead</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Missing Evidence Warnings</span>
                <span className="text-2xl font-black text-amber-600">{missingEvidenceComplaints.length} Tickets</span>
                <span className="text-[10px] text-amber-600 block">Requires investigation follow-up</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Storage Access Policy</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block">Private Signed URLs (3600s)</span>
                </div>
                <button
                  onClick={() => {
                    setTargetComplaintForUpload(complaints[0]?.id || '');
                    setShowUploadEvidenceModal(true);
                  }}
                  className="mt-2 w-full text-xs font-bold py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Upload Evidence File</span>
                </button>
              </div>
            </div>

            {/* Evidence Filtering Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filter Files:</span>
                <select
                  value={evidenceFilterType}
                  onChange={(e) => setEvidenceFilterType(e.target.value)}
                  className="border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 bg-white"
                >
                  <option value="ALL">All Evidence Types</option>
                  {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>{lbl}</option>
                  ))}
                </select>

                <select
                  value={evidenceFilterVerified}
                  onChange={(e) => setEvidenceFilterVerified(e.target.value as any)}
                  className="border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 bg-white"
                >
                  <option value="ALL">All Verification States</option>
                  <option value="VERIFIED">Verified Only (✓)</option>
                  <option value="UNVERIFIED">Pending Verification</option>
                </select>
              </div>

              <span className="text-slate-400 font-mono text-[11px]">
                Showing {displayedEvidence.length} of {allEvidence.length} items
              </span>
            </div>

            {/* Evidence Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayedEvidence.length === 0 ? (
                <div className="col-span-3 bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 italic">
                  No evidence files match the selected filters.
                </div>
              ) : (
                displayedEvidence.map((ev) => (
                  <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <div className="relative bg-slate-100 aspect-video flex items-center justify-center overflow-hidden border-b border-slate-100">
                      {ev.mimeType.startsWith('image/') && ev.downloadUrl ? (
                        <img 
                          src={ev.downloadUrl} 
                          alt={ev.title} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewingEvidence(ev)}
                        />
                      ) : ev.mimeType.startsWith('audio/') ? (
                        <div className="text-center p-4">
                          <span className="text-3xl block">🎙️</span>
                          <span className="text-[11px] font-bold text-slate-600 mt-1 block">Audio / Voice Note</span>
                        </div>
                      ) : ev.mimeType === 'application/pdf' ? (
                        <div className="text-center p-4">
                          <span className="text-3xl block">📄</span>
                          <span className="text-[11px] font-bold text-slate-600 mt-1 block">PDF Work Order / Checklist</span>
                        </div>
                      ) : (
                        <FileTextIcon className="w-10 h-10 text-slate-400" />
                      )}

                      <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-sm">
                        {EVIDENCE_TYPE_LABELS[ev.evidenceType] || ev.evidenceType}
                      </span>

                      {ev.isVerified ? (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                          <CheckCircledIcon className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                          Unverified
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono font-bold text-indigo-700">{ev.complaintNumber}</span>
                          <span className="text-[10px] text-slate-400">{ev.city}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-1">{ev.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{ev.description || 'No description provided.'}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {ev.downloadUrl ? (
                          <button
                            onClick={() => setPreviewingEvidence(ev)}
                            className="flex-1 text-center font-bold py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                          >
                            Inspect File
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Private storage only</span>
                        )}

                        {!ev.isVerified && (
                          <button
                            onClick={() => setVerifyingEvidenceItem({ complaintId: ev.complaintId, evidenceId: ev.id })}
                            className="font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                          >
                            Verify ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: RESPONSIBILITY REVIEW (PHASE 4 DEDICATED VIEW) */}
        {activeSubTab === 'Responsibility Review' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Section 8 Legal and Policy Guardrails Banner */}
            <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    Governance Standard
                  </span>
                  <h3 className="text-sm font-bold">Handy Squad Evidence-Based Responsibility Engine</h3>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Automatic deduction of salary or incentives is strictly prohibited under Master Specification Section 8. 
                  Any financial adjustment proposal mandates documented evidence, employee statement review, and dual executive authorization.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-indigo-800/80 px-3 py-1.5 rounded-xl border border-indigo-700 text-indigo-200">
                  Engine Version 1.0 (Active)
                </span>
              </div>
            </div>

            {/* Complaints Evaluation Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complaints.map((c) => {
                const rule = CATEGORY_EVIDENCE_RULES[c.category];
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-indigo-200 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-700">{c.complaintNumber}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGES[c.status].bg} ${STATUS_BADGES[c.status].text}`}>
                            {STATUS_BADGES[c.status].label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{c.title}</h4>
                        <span className="text-xs text-slate-500">{c.customerName} · {c.city} ({CATEGORY_LABELS[c.category]})</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setDrawerActiveTab('assessment');
                          handleRunResponsibilityEngine(c.id);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1 transition"
                      >
                        <TargetIcon className="w-3.5 h-3.5" />
                        <span>Run Engine</span>
                      </button>
                    </div>

                    {/* Pre-conditions & Mandatory Evidence Status */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Mandatory SOP Criteria:</span>
                        <span>{rule?.mandatory.length || 0} Standards</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rule?.mandatory.map(req => {
                          const uploaded = new Set((c.evidence || []).map(e => e.evidenceType));
                          const hasIt = uploaded.has(req);
                          return (
                            <span 
                              key={req} 
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                hasIt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {hasIt ? '✓' : '⚠️ Missing'} {EVIDENCE_TYPE_LABELS[req].split(' ')[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Default Policy Absorption */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Standard Policy:</span>
                        <span className="font-bold text-slate-700">Company 100% Absorbed</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setDrawerActiveTab('assessment');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Assessment Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: APPROVALS (EXECUTIVE APPROVAL CENTRE) */}
        {activeSubTab === 'Approvals' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Executive Governance Policy Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    Master Spec Section 8
                  </span>
                  <h3 className="text-base font-bold text-white">Executive Dual-Authorization Centre</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tiered financial loss absorption and responsibility ratification matrix. Multi-level executive sanction ensures fair hearing, accurate root-cause ratification, and audit-proof financial governance.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Tier 1: Up to ₹5,000</span>
                  <span className="font-bold text-emerald-300">Operations Manager</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Tier 2: ₹5k – ₹15k</span>
                  <span className="font-bold text-amber-300">Ops Manager + COO</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Tier 3: Above ₹15k</span>
                  <span className="font-bold text-rose-300">COO + Management</span>
                </div>
              </div>
            </div>

            {/* Approval Queue & Role Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Cases Pending Executive Sanction & Responsibility Ratification</h4>
                  <p className="text-xs text-slate-500">Tickets awaiting formal executive sign-off before closure or financial disbursement</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  {(['ALL', 'OPERATIONS_MANAGER', 'COO', 'MANAGEMENT_ADMIN'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setApprovalsRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        approvalsRoleFilter === role
                          ? 'bg-white text-indigo-700 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {role === 'ALL' ? 'All Tiers' : role.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending Queue Items */}
              {(() => {
                const pendingCases = complaints.filter(c => {
                  if (c.status === 'CLOSED') return false;
                  const totalCost = (c.costs || []).reduce((acc, cost) => acc + cost.amount, 0);
                  const reqRole = totalCost > 15000 ? 'MANAGEMENT_ADMIN' : totalCost >= 5000 ? 'COO' : 'OPERATIONS_MANAGER';
                  if (approvalsRoleFilter !== 'ALL' && reqRole !== approvalsRoleFilter) return false;
                  return c.status === 'APPROVAL_PENDING' || totalCost > 0;
                });

                if (pendingCases.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <CheckCircledIcon className="w-10 h-10 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">All Executive Approvals Up to Date</p>
                      <p className="text-[11px] text-slate-500">No cases currently awaiting executive sanction in this tier.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {pendingCases.map(c => {
                      const totalCost = (c.costs || []).reduce((acc, cost) => acc + cost.amount, 0);
                      const verifiedLoss = (c.costs || []).reduce((acc, cost) => acc + (cost.status === 'VERIFIED_INCURRED' ? cost.amount : 0), 0);
                      const reqAuthority = totalCost > 15000 ? 'MANAGEMENT_ADMIN' : totalCost >= 5000 ? 'COO' : 'OPERATIONS_MANAGER';

                      return (
                        <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {c.complaintNumber}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                                  {c.city}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SEVERITY_COLORS[c.severity]?.bg} ${SEVERITY_COLORS[c.severity]?.text}`}>
                                  {c.severity}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_BADGES[c.status]?.bg} ${STATUS_BADGES[c.status]?.text}`}>
                                  {STATUS_BADGES[c.status]?.label || c.status}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900">{c.title}</h5>
                              <p className="text-xs text-slate-500">
                                Customer: <strong className="text-slate-700">{c.customerName}</strong> ({c.serviceType.replace(/_/g, ' ')}) · Job Value: {formatINR(c.jobValue)}
                              </p>
                            </div>

                            <div className="text-right space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Exposure / Incurred Loss</span>
                              <span className="text-lg font-black text-rose-600 block">{formatINR(totalCost || verifiedLoss)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                                Required: {reqAuthority.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 text-xs">
                            <div className="text-slate-600 text-[11px]">
                              <span>Reported: {new Date(c.reportingDate).toLocaleDateString('en-IN')}</span> · 
                              <span className="ml-1">Investigator: {c.assignedInvestigatorName || 'Unassigned'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setDrawerActiveTab('overview');
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700"
                              >
                                Inspect Full Ticket ↗
                              </button>
                              <button
                                onClick={() => handleOpenApprovalModal(c)}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-sm flex items-center gap-1.5"
                              >
                                <CheckCircledIcon className="w-3.5 h-3.5" />
                                Review & Record Sanction
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Historical Executive Decisions Stream */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Recent Executive Approvals & Sanction Audit Trail</h4>
              <p className="text-xs text-slate-500">Immutable record of ratified responsibility findings, financial absorption, and conditional covenants</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3">Approver</th>
                      <th className="p-3">Role & Authority</th>
                      <th className="p-3">Decision</th>
                      <th className="p-3">Financial Approved</th>
                      <th className="p-3">Executive Comments & Conditions</th>
                      <th className="p-3">Timestamp (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">Harikrishnan Menon</td>
                      <td className="p-3">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                          OPERATIONS_MANAGER
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          APPROVED
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600">₹4,800</td>
                      <td className="p-3 text-slate-600 max-w-xs">
                        Workmanship lapse verified on kitchen cabinet hinge. ₹4,800 third-party carpentry vendor approved for company absorption. Refresher coaching assigned.
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">2026-10-15 14:30</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">Suresh Kurup</td>
                      <td className="p-3">
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                          COO
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          APPROVED
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600">₹2,500</td>
                      <td className="p-3 text-slate-600 max-w-xs">
                        Free rework team dispatch approved under Company Goodwill Policy to protect client relationship. Senior supervisor must accompany crew.
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">2026-10-16 11:15</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 6: EMPLOYEE TRACKER & COACHING HUB */}
        {activeSubTab === 'Employees' && (
          <div className="max-w-7xl mx-auto space-y-5 animate-fadeIn">
            {/* Section 9 Guardrail Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase">
                    Master Spec Section 9
                  </span>
                  <h3 className="text-base font-bold text-white">Coaching-First Employee Career & Training Framework</h3>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Strict separation of customer allegations from verified findings. Repeat complaints trigger mandatory technical coaching, mentor pairing, and SOP reassessment rather than punitive deductions.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-slate-300 block text-[9px] uppercase font-bold">Active Staff</span>
                  <span className="font-bold text-white text-base">{employees.length}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-slate-300 block text-[9px] uppercase font-bold">Certifications Up to Date</span>
                  <span className="font-bold text-emerald-300 text-base">
                    {employees.filter(e => e.trainingStatus === 'UP_TO_DATE').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Directory */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Kerala Crew & Supervisor Roster</h4>
                  <p className="text-xs text-slate-500">Track complaints named in, substantiated findings, and skill certification status</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{employees.length} Staff Enrolled</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp) => {
                  // Compute stats from complaints
                  let namedCount = 0;
                  let substantiatedCount = 0;
                  let exoneratedCount = 0;

                  complaints.forEach(c => {
                    (c.participants || []).forEach(p => {
                      if (p.employeeId === emp.id || p.employee?.id === emp.id) {
                        namedCount++;
                        if (p.allegationStatus === 'SUBSTANTIATED') substantiatedCount++;
                        if (p.allegationStatus === 'EXONERATED') exoneratedCount++;
                      }
                    });
                  });

                  return (
                    <div key={emp.id} className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {emp.employeeCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {emp.city}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-900 mt-1">{emp.fullName}</h5>
                          <p className="text-xs text-slate-500 font-medium">{emp.designation.replace(/_/g, ' ')}</p>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.trainingStatus === 'UP_TO_DATE' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {emp.trainingStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Performance Counters: Allegations vs Findings */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200 text-center text-xs">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[9px] font-bold uppercase">Jobs In</span>
                          <span className="font-extrabold text-slate-800">{namedCount}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[9px] font-bold uppercase">Exonerated</span>
                          <span className="font-extrabold text-emerald-600">{exoneratedCount}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[9px] font-bold uppercase">Substantiated</span>
                          <span className={`font-extrabold ${substantiatedCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {substantiatedCount}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium text-[11px]">{emp.primaryPhone}</span>
                        <button
                          onClick={() => setSelectedEmployeeForDetail(emp)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 font-bold text-indigo-700 text-xs transition-colors"
                        >
                          Coaching Dossier →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 7: FINANCIAL IMPACT CENTRE */}
        {activeSubTab === 'Financial' && summary && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Section 8 Statutory Protection Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    Master Spec Section 8 Compliance
                  </span>
                  <h3 className="text-base font-bold text-white">Financial Loss Ledger & Employee Protection Protocol</h3>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Strict prohibition against automatic employee salary or incentive deductions. Company absorption is prioritized for operational goodwill. Any proposed adjustment requires documented evidence, formal employee hearing, and authorized executive signoff.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddCostModal()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                Book Expense / Invoice
              </button>
            </div>

            {/* High-Level Financial Impact KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Incurred Loss</span>
                <span className="text-2xl font-black text-rose-700 block">{formatINR(summary.totalVerifiedLoss)}</span>
                <span className="text-[11px] text-slate-500 font-medium">Audited & settled by Handy Squad</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Pending Rectification</span>
                <span className="text-2xl font-black text-amber-600 block">{formatINR(summary.totalEstimatedLoss)}</span>
                <span className="text-[11px] text-slate-500 font-medium">Under contractor quote or rework pass</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Absorption Ratio</span>
                <span className="text-2xl font-black text-emerald-700 block">100%</span>
                <span className="text-[11px] text-slate-500 font-medium">Zero unauthorized staff deductions</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Free Rework Services</span>
                <span className="text-2xl font-black text-indigo-700 block">{summary.reworkCount} Jobs</span>
                <span className="text-[11px] text-slate-500 font-medium">Customer satisfaction re-visits</span>
              </div>
            </div>

            {/* Granular Cost Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Itemized Financial Ledger & Expense Book</h4>
                  <p className="text-xs text-slate-500">Every rework cost, replacement part, third-party contractor invoice, and goodwill refund</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={costTypeFilter}
                    onChange={(e) => setCostTypeFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="ALL">All Cost Types</option>
                    <option value="REWORK_LABOUR">Rework Labour</option>
                    <option value="DAMAGE_REPAIR_VENDOR">Damage Repair Vendor</option>
                    <option value="CUSTOMER_REFUND">Customer Refund</option>
                    <option value="CUSTOMER_DISCOUNT_COUPON">Customer Goodwill Voucher</option>
                    <option value="MATERIALS_PARTS">Materials & Parts</option>
                    <option value="TRAVEL_LOGISTICS">Travel & Transit</option>
                  </select>

                  <select
                    value={costStatusFilter}
                    onChange={(e) => setCostStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ESTIMATED">Estimated / Pending</option>
                    <option value="VERIFIED_INCURRED">Verified Incurred Loss</option>
                    <option value="SETTLED">Settled</option>
                  </select>
                </div>
              </div>

              {/* Table of Costs */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3">Complaint #</th>
                      <th className="p-3">Cost Type</th>
                      <th className="p-3">Description & Invoice Ref</th>
                      <th className="p-3">Vendor / Service Provider</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Absorption Policy</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filteredCosts = allCostRecords.filter(c => {
                        if (costTypeFilter !== 'ALL' && c.costType !== costTypeFilter) return false;
                        if (costStatusFilter !== 'ALL' && c.status !== costStatusFilter) return false;
                        return true;
                      });

                      if (filteredCosts.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                              No expense records match the selected filter criteria.
                            </td>
                          </tr>
                        );
                      }

                      return filteredCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-700">
                            {cost.complaintNumber}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                              {cost.costType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <span className="text-slate-800 font-semibold block">{cost.description}</span>
                            {cost.invoiceReceiptRef && (
                              <span className="text-[10px] font-mono text-slate-400 block">Ref: {cost.invoiceReceiptRef}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 font-medium">
                            {cost.vendorName || 'Handy Squad Internal'}
                          </td>
                          <td className="p-3 text-right font-black font-mono text-rose-600 text-sm">
                            {formatINR(cost.amount)}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {cost.isCompanyAbsorption ? '✓ 100% Handy Squad Absorbed' : 'Proposed Shared'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              cost.status === 'VERIFIED_INCURRED' 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {cost.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {cost.status === 'ESTIMATED' && (
                                <button
                                  onClick={() => handleVerifyCost(cost.complaintId, cost.id)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                                >
                                  Verify Incurred Loss
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const comp = complaints.find(c => c.id === cost.complaintId);
                                  if (comp) {
                                    setSelectedComplaint(comp);
                                    setDrawerActiveTab('financial');
                                  }
                                }}
                                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 font-bold text-[10px] text-slate-700"
                              >
                                Ticket ↗
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 8: REPORTS & ANALYTICS CENTRE (PHASE 6) */}
        {activeSubTab === 'Reports' && summary && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase">
                    Master Spec Section 10 & 12
                  </span>
                  <h3 className="text-base font-bold text-white">Executive Operations & Incident Intelligence</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Consolidated reporting across Kerala hubs. Failure rates, regional risk concentrations, documentation compliance metrics, and corrective coaching ROI.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportComplaintsToCSV(complaints)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download Full Register (CSV)
                </button>
              </div>
            </div>

            {/* Compliance & SLA Operational Benchmarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Incident Rate</span>
                <span className="text-2xl font-black text-indigo-700 block">1.8%</span>
                <span className="text-[11px] text-slate-500 font-medium">98.2% clean delivery benchmark</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pre-Service Checklist Adherence</span>
                <span className="text-2xl font-black text-emerald-700 block">
                  {Math.round((complaints.filter(c => c.preServiceChecklistDone).length / (complaints.length || 1)) * 100)}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Pre-damage inspection compliance</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Signoff Rate</span>
                <span className="text-2xl font-black text-emerald-700 block">
                  {Math.round((complaints.filter(c => c.postServiceSignoffDone).length / (complaints.length || 1)) * 100)}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Post-service walk-through completed</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Investigation Speed</span>
                <span className="text-2xl font-black text-amber-700 block">18.4 hrs</span>
                <span className="text-[11px] text-slate-500 font-medium">Within 24-hr turnaround SLA</span>
              </div>
            </div>

            {/* Regional Hub Comparative Matrix */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Kerala Regional Hub Performance & Incident Exposure</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3">Kerala Hub</th>
                      <th className="p-3">Total Complaints</th>
                      <th className="p-3">Critical Cases</th>
                      <th className="p-3">Job Value at Risk</th>
                      <th className="p-3">Verified Company Loss</th>
                      <th className="p-3">Pre-Checklist %</th>
                      <th className="p-3">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(['Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur'] as KeralaCity[]).map(city => {
                      const cityComplaints = complaints.filter(c => c.city === city);
                      const criticalCount = cityComplaints.filter(c => c.severity === 'CRITICAL' || c.severity === 'MAJOR').length;
                      const totalJobVal = cityComplaints.reduce((acc, c) => acc + c.jobValue, 0);
                      const totalLoss = cityComplaints.reduce((acc, c) => 
                        acc + (c.costs || []).reduce((sum, cost) => sum + (cost.status === 'VERIFIED_INCURRED' ? cost.amount : 0), 0)
                      , 0);
                      const checklistPct = cityComplaints.length > 0
                        ? Math.round((cityComplaints.filter(c => c.preServiceChecklistDone).length / cityComplaints.length) * 100)
                        : 100;
                      const resolvedPct = cityComplaints.length > 0
                        ? Math.round((cityComplaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length / cityComplaints.length) * 100)
                        : 100;

                      return (
                        <tr key={city} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{city}</td>
                          <td className="p-3 font-semibold text-slate-700">{cityComplaints.length}</td>
                          <td className="p-3">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              criticalCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {criticalCount}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-700">{formatINR(totalJobVal)}</td>
                          <td className="p-3 font-mono font-bold text-rose-600">{formatINR(totalLoss)}</td>
                          <td className="p-3 font-semibold text-slate-700">{checklistPct}%</td>
                          <td className="p-3 font-bold text-emerald-700">{resolvedPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Pareto Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Complaint Category Distribution & Exposure Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3">Category</th>
                      <th className="p-3">Incident Count</th>
                      <th className="p-3">Verified Financial Loss</th>
                      <th className="p-3">Typical Root Cause</th>
                      <th className="p-3">Standard Corrective Prescription</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
                      const catComplaints = complaints.filter(c => c.category === catKey);
                      const catLoss = catComplaints.reduce((acc, c) => 
                        acc + (c.costs || []).reduce((sum, cost) => sum + (cost.status === 'VERIFIED_INCURRED' ? cost.amount : 0), 0)
                      , 0);

                      return (
                        <tr key={catKey} className="hover:bg-slate-50/60">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{label}</span>
                            <span className="text-[9px] font-mono text-slate-400">{catKey}</span>
                          </td>
                          <td className="p-3 font-bold text-indigo-700">{catComplaints.length}</td>
                          <td className="p-3 font-mono font-bold text-rose-600">{formatINR(catLoss)}</td>
                          <td className="p-3 text-slate-600 max-w-xs">
                            {catKey === 'DAMAGE_ISSUE' ? 'Abrasive grit friction / Acidic dilution error'
                              : catKey === 'SKILL_ISSUE' ? 'Technique deficit on sensitive materials'
                              : catKey === 'MACHINE_ISSUE' ? 'Overdue periodic machine servicing'
                              : catKey === 'SCOPE_CONFUSION' ? 'Work order mismatch during sales booking'
                              : 'Logistics / transit delays or protocol adherence'}
                          </td>
                          <td className="p-3 text-slate-700 font-medium">
                            {catKey === 'DAMAGE_ISSUE' ? 'Third-party specialist restoration + Coaching'
                              : catKey === 'SKILL_ISSUE' ? '4-hour coaching module + Mentor shadowing'
                              : catKey === 'MACHINE_ISSUE' ? 'Equipment overhaul + Tag-out protocol'
                              : 'Walk-through checklist verification + Free rework'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 9: AUDIT HISTORY CENTRE (PHASE 6) */}
        {activeSubTab === 'Audit' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 uppercase">
                    Master Spec Section 11 Compliance
                  </span>
                  <h3 className="text-base font-bold text-white">Immutable Tamper-Evident System Audit Trail</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cryptographically structured audit records capturing every creation, evidence upload, participant statement, responsibility finding, executive approval decision, and financial expense book.
                </p>
              </div>

              <div className="text-xs font-mono bg-white/10 px-3 py-2 rounded-xl border border-white/15">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Audit Records</span>
                <span className="font-bold text-cyan-300 text-base">{auditLogsList.length} Events</span>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Historical Operational Audit Stream</h4>
                  <p className="text-xs text-slate-500">Chronological history with actor attribution, entity ID, and state change snapshots</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={auditFilterAction}
                    onChange={(e) => setAuditFilterAction(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="COMPLAINT_REGISTERED">Complaint Registered</option>
                    <option value="INVESTIGATOR_ASSIGNED">Investigator Assigned</option>
                    <option value="EVIDENCE_UPLOADED">Evidence Uploaded</option>
                    <option value="RESPONSIBILITY_ASSESSED">Responsibility Assessed</option>
                    <option value="APPROVAL_DECISION_RECORDED">Executive Approval</option>
                    <option value="COST_RECORDED">Cost Recorded</option>
                    <option value="COST_VERIFIED">Cost Verified</option>
                    <option value="COACHING_MODULE_ASSIGNED">Coaching Assigned</option>
                  </select>
                </div>
              </div>

              {loadingAuditLogs ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading immutable audit stream...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="p-3">Timestamp (IST)</th>
                        <th className="p-3">Actor</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Target Entity</th>
                        <th className="p-3">Compliance Notes & Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = auditLogsList.filter(log => {
                          if (auditFilterAction !== 'ALL' && log.action !== auditFilterAction) return false;
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                No audit events matching the selected filter.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/60 font-medium">
                            <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </td>
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                              {log.actorName}
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-600 text-[11px]">
                              {log.entityName}
                            </td>
                            <td className="p-3 text-slate-700 max-w-md">
                              {log.notes || (log.afterState ? JSON.stringify(log.afterState) : '-')}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 10: RULES & GOVERNANCE */}
        {activeSubTab === 'Rules' && (
          <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900">Handy Squad Responsibility Governance Rules</h3>
              <p className="text-xs text-slate-500">Configured evaluation criteria and mandatory evidence standards across all 10 categories</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(CATEGORY_LABELS).map(([cat, title]) => {
                const rule = CATEGORY_EVIDENCE_RULES[cat as ComplaintCategory];
                return (
                  <div key={cat} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {cat}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {rule?.complianceWarning || 'Requires comprehensive work order alignment and SOP documentation.'}
                    </p>
                    <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                      <div className="flex justify-between text-rose-700 font-semibold">
                        <span>Mandatory Evidence:</span>
                        <span>{rule?.mandatory.map(m => EVIDENCE_TYPE_LABELS[m]).join(', ') || 'Work Order'}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Recommended:</span>
                        <span>{rule?.recommended.map(m => EVIDENCE_TYPE_LABELS[m]).join(', ') || 'Checklist'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER: SELECTED COMPLAINT INVESTIGATION & RESPONSIBILITY */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-indigo-700">{selectedComplaint.complaintNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGES[selectedComplaint.status].bg} ${STATUS_BADGES[selectedComplaint.status].text}`}>
                    {STATUS_BADGES[selectedComplaint.status].label}
                  </span>
                  <span className="text-xs text-slate-400">· {selectedComplaint.city}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedComplaint.title}</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Drawer Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
              {[
                { id: 'overview', label: 'Ticket Overview' },
                { id: 'crew', label: `Crew (${selectedComplaint.participants?.length || 0})` },
                { id: 'evidence', label: `Evidence Vault (${selectedComplaint.evidence?.length || 0})` },
                { id: 'investigation', label: 'Root Cause Findings' },
                { id: 'assessment', label: 'Responsibility Assessment' },
                { id: 'financial', label: `Financial Ledger (${(selectedComplaint.costs || []).length})` },
                { id: 'approvals', label: `Approvals (${complaintApprovalsList.length})` },
                { id: 'actions', label: 'Pipeline Actions' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerActiveTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    drawerActiveTab === t.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW */}
            {drawerActiveTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Customer:</span>
                    <span className="font-bold text-slate-900">{selectedComplaint.customerName}</span>
                    <span className="text-[10px] text-slate-500 block">{selectedComplaint.customerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Service & Job:</span>
                    <span className="font-semibold text-slate-800">{selectedComplaint.serviceType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-500 block">{selectedComplaint.jobId || 'No Job ID'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Job Value:</span>
                    <span className="font-bold text-indigo-900">{formatINR(selectedComplaint.jobValue)}</span>
                    <span className="text-[10px] text-slate-500 block">Date: {selectedComplaint.jobDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Investigator:</span>
                    <span className="font-semibold text-slate-800">{selectedComplaint.assignedInvestigatorName || 'Pending'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Complaint Description:</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">SOP Compliance Checks:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.preServiceChecklistDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {selectedComplaint.preServiceChecklistDone ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                      <span>Pre-Checklist</span>
                    </div>
                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.postServiceSignoffDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {selectedComplaint.postServiceSignoffDone ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                      <span>Post-Signoff</span>
                    </div>
                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.beforePhotosAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {selectedComplaint.beforePhotosAvailable ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                      <span>Before Photos</span>
                    </div>
                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.afterPhotosAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {selectedComplaint.afterPhotosAvailable ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                      <span>After Photos</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CREW & STATEMENTS */}
            {drawerActiveTab === 'crew' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Employees & Crew on Job:</span>
                  <span className="text-[11px] text-slate-400">Formal statements logged</span>
                </div>

                {(selectedComplaint.participants || []).length > 0 ? (
                  <div className="space-y-3">
                    {selectedComplaint.participants?.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block">{p.employee?.fullName || 'Crew Member'}</span>
                            <span className="text-[10px] text-slate-500">{p.roleOnJob} · {p.employee?.primaryPhone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.allegationStatus === 'NAMED_IN_COMPLAINT' ? 'bg-rose-100 text-rose-800' :
                              p.allegationStatus === 'SUBSTANTIATED' ? 'bg-orange-100 text-orange-800' :
                              p.allegationStatus === 'EXONERATED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {p.allegationStatus.replace(/_/g, ' ')}
                            </span>
                            <button
                              onClick={() => {
                                setRecordingStatementParticipant(p);
                                setStatementText(p.statement || '');
                                setAllegationStatusChoice(p.allegationStatus as any);
                              }}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            >
                              Edit Statement ✍️
                            </button>
                          </div>
                        </div>

                        {p.statement ? (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed font-serif italic">
                            "{p.statement}"
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">No formal statement recorded yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                    No crew members linked to this complaint yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EVIDENCE VAULT */}
            {drawerActiveTab === 'evidence' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Complaint Evidence Vault</h4>
                    <p className="text-[10px] text-slate-500">Secure private storage files for {selectedComplaint.complaintNumber}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTargetComplaintForUpload(selectedComplaint.id);
                      setShowUploadEvidenceModal(true);
                    }}
                    className="text-xs font-bold py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Upload New File</span>
                  </button>
                </div>

                {/* Evidence List */}
                {(selectedComplaint.evidence || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {(selectedComplaint.evidence || []).map((ev) => (
                      <div key={ev.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                              {EVIDENCE_TYPE_LABELS[ev.evidenceType]}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ev.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {ev.isVerified ? '✓ Verified' : 'Unverified'}
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-900 mt-1">{ev.title}</h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ev.description || 'Uploaded file'}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-400">{ev.uploadedByName}</span>
                          <div className="flex gap-1.5">
                            {ev.downloadUrl && (
                              <button
                                onClick={() => setPreviewingEvidence(ev)}
                                className="font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                              >
                                View
                              </button>
                            )}
                            {!ev.isVerified && (
                              <button
                                onClick={() => setVerifyingEvidenceItem({ complaintId: selectedComplaint.id, evidenceId: ev.id })}
                                className="font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded"
                              >
                                Verify ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                    No evidence files uploaded to this complaint yet.
                  </p>
                )}
              </div>
            )}

            {/* TAB 4: ROOT CAUSE FINDINGS */}
            {drawerActiveTab === 'investigation' && (
              <form onSubmit={handleSaveInvestigation} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Assigned Investigator:</span>
                    <select
                      value={selectedComplaint.assignedInvestigatorId || ''}
                      onChange={(e) => {
                        const emp = employees.find(em => em.id === e.target.value);
                        if (emp) handleAssignInvestigator(emp.id, emp.fullName);
                      }}
                      className="text-xs border border-slate-300 rounded-lg p-1.5 font-bold bg-white"
                    >
                      <option value="">Select Investigator</option>
                      {employees.filter(e => e.designation === 'SUPERVISOR' || e.designation === 'TEAM_LEAD' || e.designation === 'OPERATIONS_MANAGER').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.city})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block">Investigation Status *</label>
                      <select
                        value={investigationData.investigationStatus || 'IN_PROGRESS'}
                        onChange={(e) => setInvestigationData({ ...investigationData, investigationStatus: e.target.value as any })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold bg-white"
                      >
                        <option value="IN_PROGRESS">In Progress (Gathering Statements)</option>
                        <option value="EVIDENCE_INSUFFICIENT">Evidence Insufficient (More Proof Required)</option>
                        <option value="COMPLETED">Investigation Completed (Findings Finalized)</option>
                        <option value="ESCALATED">Escalated to Operations Manager / COO</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block">Root Cause Category *</label>
                      <select
                        value={investigationData.rootCauseCategory || 'EQUIPMENT_MALFUNCTION'}
                        onChange={(e) => setInvestigationData({ ...investigationData, rootCauseCategory: e.target.value })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold bg-white"
                      >
                        {ROOT_CAUSE_CATEGORIES.map(rc => (
                          <option key={rc.id} value={rc.id}>{rc.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="preExistingCheck"
                      checked={Boolean(investigationData.isPreExistingDamage)}
                      onChange={(e) => setInvestigationData({ ...investigationData, isPreExistingDamage: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <label htmlFor="preExistingCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Pre-Existing Damage Verified (Not caused by Handy Squad service crew)
                    </label>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block">Customer Statement Summary:</label>
                    <textarea
                      rows={2}
                      value={investigationData.customerStatement || ''}
                      onChange={(e) => setInvestigationData({ ...investigationData, customerStatement: e.target.value })}
                      placeholder="Summary of customer telephone interview or on-site statement..."
                      className="mt-1 w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block">Equipment & Materials Condition Check:</label>
                    <textarea
                      rows={2}
                      value={investigationData.equipmentStatusCheck || ''}
                      onChange={(e) => setInvestigationData({ ...investigationData, equipmentStatusCheck: e.target.value })}
                      placeholder="Inspection of machine pads, chemical dilution pH, vacuum suction, etc..."
                      className="mt-1 w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block">Final Investigation Findings & Root Cause Analysis *:</label>
                    <textarea
                      required
                      rows={3}
                      value={investigationData.findingsSummary || ''}
                      onChange={(e) => setInvestigationData({ ...investigationData, findingsSummary: e.target.value })}
                      placeholder="Conclusive analysis of facts, evidence alignment, and technical root cause..."
                      className="mt-1 w-full text-xs p-2.5 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingInvestigation}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {savingInvestigation ? 'Saving Findings...' : 'Save Investigation Findings'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: RESPONSIBILITY ASSESSMENT ENGINE (PHASE 4 CORE) */}
            {drawerActiveTab === 'assessment' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Engine Run Action */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Evaluate Responsibility Matrix</span>
                    <span className="text-[11px] text-slate-500">Cross-checks evidence sufficiency, technician statements, and equipment logs</span>
                  </div>
                  <button
                    onClick={() => handleRunResponsibilityEngine()}
                    disabled={evaluatingResponsibility}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition"
                  >
                    <TargetIcon className="w-3.5 h-3.5" />
                    <span>{evaluatingResponsibility ? 'Evaluating Rule Set...' : 'Run Automated Engine'}</span>
                  </button>
                </div>

                {/* Provisional Evaluation Result Card */}
                {provisionalEvaluation && (
                  <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4 shadow-sm animate-fadeIn text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Engine Output (Rule v{provisionalEvaluation.ruleVersion})</span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {RESPONSIBLE_PARTY_LABELS[provisionalEvaluation.primaryResponsibleParty]?.label || provisionalEvaluation.primaryResponsibleParty}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        provisionalEvaluation.assessmentStatus === 'RECOMMENDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        provisionalEvaluation.assessmentStatus === 'INVESTIGATION_REQUIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {provisionalEvaluation.assessmentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Responsibility & Cost Absorption Split Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-rose-700">Company Absorption: {provisionalEvaluation.companySharePct}%</span>
                        <span className="text-amber-700">Employee Share: {provisionalEvaluation.employeeSharePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                        <div className="bg-rose-500 h-3 transition-all duration-500" style={{ width: `${provisionalEvaluation.companySharePct}%` }} />
                        <div className="bg-amber-500 h-3 transition-all duration-500" style={{ width: `${provisionalEvaluation.employeeSharePct}%` }} />
                      </div>
                    </div>

                    {/* Section 8 Labor Policy Guardrail */}
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                      <InfoCircledIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                        <strong>Mandatory Policy Notice:</strong> Per Section 8 Master Specification, employee deductions are strictly prohibited without independent COO authorization, documented employee hearing, and evidence substantiation.
                      </p>
                    </div>

                    {/* Rationale & Evidence Reviewed */}
                    <div className="space-y-2">
                      <span className="font-bold text-slate-800 block">Responsibility Rationale:</span>
                      <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                        {provisionalEvaluation.rationale}
                      </p>
                    </div>

                    {/* Missing Evidence Warnings if any */}
                    {provisionalEvaluation.missingEvidenceFlags.length > 0 && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 space-y-1">
                        <span className="font-bold block text-[11px]">⚠️ Missing Critical Evidence Flags:</span>
                        <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                          {provisionalEvaluation.missingEvidenceFlags.map(f => (
                            <li key={f}>{f.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Remedy & Authority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Recommended Remedy:</span>
                        <span className="font-bold text-indigo-700">{provisionalEvaluation.recommendedCorrectiveAction}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Required Approval Level:</span>
                        <span className="font-black text-slate-900">{provisionalEvaluation.requiredApprovalAuthority}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={handleConfirmAssessment}
                        disabled={confirmingAssessment}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>{confirmingAssessment ? 'Confirming...' : 'Confirm & Route to Approver'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Historical Assessments for this complaint */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Assessment Audit History:</span>
                  {assessmentsList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      No responsibility determinations finalized yet. Click "Run Automated Engine" above.
                    </p>
                  ) : (
                    assessmentsList.map((as, idx) => (
                      <div key={as.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block">{as.primaryResponsibleParty}</span>
                            <span className="text-[10px] text-slate-500">Assessed by {as.assessedByName} · {as.createdAt ? new Date(as.createdAt).toLocaleDateString() : 'Active'}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            as.assessmentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                            as.assessmentStatus === 'RECOMMENDED' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {as.assessmentStatus}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{as.rationale}</p>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
                          <span>Company: {as.companySharePct}% / Employee: {as.employeeSharePct}%</span>
                          <span>Approval Authority: {as.requiredApprovalAuthority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: CORRECTIVE ACTIONS (PHASE 4 TRACKER) */}
            {drawerActiveTab === 'corrective' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Corrective Actions & Training Remedies</h4>
                    <p className="text-[10px] text-slate-500">Service rectifications, customer apologies, and technician coaching tasks</p>
                  </div>
                  <button
                    onClick={() => setShowAddCorrectiveModal(true)}
                    className="text-xs font-bold py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Assign Action</span>
                  </button>
                </div>

                {correctiveActionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                    No corrective actions assigned yet. Assessments automatically generate remedy tasks.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {correctiveActionsList.map((ca) => (
                      <div key={ca.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-wider font-mono">
                              {CORRECTIVE_ACTION_LABELS[ca.actionType] || ca.actionType}
                            </span>
                            <h5 className="font-bold text-slate-900 mt-1">{ca.title}</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5">{ca.description}</p>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            ca.status === 'COMPLETED' || ca.status === 'VERIFIED_EFFECTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            ca.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ca.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-500">
                            Due Date: <strong className="text-slate-700">{ca.dueDate}</strong>
                          </span>

                          <div className="flex items-center gap-2">
                            {ca.status === 'PENDING' && (
                              <button
                                onClick={() => handleToggleCorrectiveActionStatus(ca.id, 'IN_PROGRESS')}
                                className="font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              >
                                Start Action →
                              </button>
                            )}
                            {ca.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleToggleCorrectiveActionStatus(ca.id, 'COMPLETED')}
                                className="font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              >
                                Mark Completed ✓
                              </button>
                            )}
                            {ca.status === 'COMPLETED' && (
                              <button
                                onClick={() => handleToggleCorrectiveActionStatus(ca.id, 'VERIFIED_EFFECTIVE')}
                                className="font-bold px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Verify Effective (Ops Lead) ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: FINANCIAL LEDGER */}
            {drawerActiveTab === 'financial' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Financial Exposure Ledger:</span>
                    <span className="text-[10px] text-slate-500">Itemized losses, rework labour, vendor bills & refunds</span>
                  </div>
                  <button
                    onClick={() => handleOpenAddCostModal(selectedComplaint.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Book Expense / Invoice
                  </button>
                </div>

                {(selectedComplaint.costs || []).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedComplaint.costs || []).map((cost) => (
                      <div key={cost.id} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{cost.costType.replace(/_/g, ' ')}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                cost.status === 'VERIFIED_INCURRED' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {cost.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{cost.description}</p>
                            {cost.invoiceReceiptRef && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                Invoice Ref: {cost.invoiceReceiptRef} · Vendor: {cost.vendorName || 'Handy Squad Direct'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-black text-rose-600 text-base">{formatINR(cost.amount)}</span>
                            <span className="text-[9px] text-emerald-700 block font-semibold">
                              {cost.isCompanyAbsorption ? '✓ 100% Absorbed' : 'Shared Cost'}
                            </span>
                          </div>
                        </div>

                        {cost.status === 'ESTIMATED' && (
                          <div className="flex justify-end pt-2 border-t border-slate-200/60">
                            <button
                              onClick={() => handleVerifyCost(selectedComplaint.id, cost.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs"
                            >
                              Verify as Incurred Loss ✓
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-400 italic">No financial costs booked for this complaint yet.</p>
                    <button
                      onClick={() => handleOpenAddCostModal(selectedComplaint.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-indigo-700 hover:bg-slate-50"
                    >
                      + Book First Expense
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: EXECUTIVE APPROVALS */}
            {drawerActiveTab === 'approvals' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Executive Sanction History:</span>
                    <span className="text-[10px] text-slate-500">Multi-level authorization for responsibility & financial absorption</span>
                  </div>
                  <button
                    onClick={() => handleOpenApprovalModal(selectedComplaint)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircledIcon className="w-3.5 h-3.5" />
                    Record Executive Decision
                  </button>
                </div>

                {complaintApprovalsList.length > 0 ? (
                  <div className="space-y-2">
                    {complaintApprovalsList.map((app) => (
                      <div key={app.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{app.approverName}</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                {app.approverRole.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(app.createdAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            app.decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {app.decision}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100">{app.comments}</p>
                        {app.conditions && (
                          <p className="text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                            <strong>Conditions:</strong> {app.conditions}
                          </p>
                        )}
                        {app.financialAmountApproved !== undefined && (
                          <div className="text-right text-[11px] font-bold text-slate-600 pt-1">
                            Amount Approved: <span className="font-black text-rose-600">{formatINR(app.financialAmountApproved)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-400 italic">No formal executive approvals recorded for this case yet.</p>
                    <button
                      onClick={() => handleOpenApprovalModal(selectedComplaint)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-indigo-700 hover:bg-slate-50"
                    >
                      Record First Approval Decision
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: ACTIONS & PIPELINE */}
            {drawerActiveTab === 'actions' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">Update Ticket Status Pipeline:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'UNDER_INVESTIGATION',
                      'EVIDENCE_REVIEW',
                      'APPROVAL_PENDING',
                      'REWORK_IN_PROGRESS',
                      'RESOLVED',
                      'CLOSED'
                    ].map((st) => (
                      <button
                        key={st}
                        disabled={updatingStatus || selectedComplaint.status === st}
                        onClick={() => handleStatusChange(st as ComplaintStatus)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          selectedComplaint.status === st
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {STATUS_BADGES[st as ComplaintStatus]?.label || st}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddComment} className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">Add Investigation Log / Decision Note:</label>
                  <textarea
                    rows={2}
                    placeholder="Enter factual investigation finding or action taken..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={commentSubmitting || !newCommentText.trim()}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                    >
                      {commentSubmitting ? 'Saving Note...' : 'Log Internal Note'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CORRECTIVE ACTION */}
      {showAddCorrectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Assign Corrective Action</h3>
              <button onClick={() => setShowAddCorrectiveModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCorrectiveActionSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block">Action Type *</label>
                <select
                  value={newCorrectiveForm.actionType}
                  onChange={(e) => setNewCorrectiveForm({ ...newCorrectiveForm, actionType: e.target.value as CorrectiveActionType })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  {Object.entries(CORRECTIVE_ACTION_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>{lbl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Action Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule marble re-crystallization with vendor"
                  value={newCorrectiveForm.title}
                  onChange={(e) => setNewCorrectiveForm({ ...newCorrectiveForm, title: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Target Completion Date *</label>
                <input
                  type="date"
                  required
                  value={newCorrectiveForm.dueDate}
                  onChange={(e) => setNewCorrectiveForm({ ...newCorrectiveForm, dueDate: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Assignee Staff Member</label>
                <select
                  value={newCorrectiveForm.assignedToEmployeeId}
                  onChange={(e) => setNewCorrectiveForm({ ...newCorrectiveForm, assignedToEmployeeId: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">General Operations Team</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Action Description & Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Specific scope of rework or coaching guidelines..."
                  value={newCorrectiveForm.description}
                  onChange={(e) => setNewCorrectiveForm({ ...newCorrectiveForm, description: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCorrectiveModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorrective || !newCorrectiveForm.title}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {savingCorrective ? 'Assigning...' : 'Assign Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW COMPLAINT */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Customer Complaint</h3>
                <p className="text-xs text-slate-500">Record intake details, crew participants, and initialize case investigation</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterComplaint} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathew Varghese"
                    value={newForm.customerName}
                    onChange={(e) => setNewForm({ ...newForm, customerName: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98470 12345"
                    value={newForm.customerPhone}
                    onChange={(e) => setNewForm({ ...newForm, customerPhone: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Kerala City Hub *</label>
                  <select
                    value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value as KeralaCity })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                  >
                    <option value="Kochi">Kochi</option>
                    <option value="Trivandrum">Trivandrum</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Thrissur">Thrissur</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Service Type *</label>
                  <select
                    value={newForm.serviceType}
                    onChange={(e) => setNewForm({ ...newForm, serviceType: e.target.value as ServiceType })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                  >
                    <option value="DEEP_CLEANING">Deep Cleaning</option>
                    <option value="MOVE_IN_OUT_CLEANING">Move-In/Move-Out Cleaning</option>
                    <option value="SOFA_CARPET_SHAMPOO">Sofa/Carpet Shampooing</option>
                    <option value="KITCHEN_DEGREASING">Kitchen Degreasing</option>
                    <option value="BATHROOM_RESTORATION">Bathroom Restoration</option>
                    <option value="MARBLE_POLISHING">Marble Polishing</option>
                    <option value="POST_CONSTRUCTION_CLEANING">Post-Construction Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Job Value (₹)</label>
                  <input
                    type="number"
                    value={newForm.jobValue}
                    onChange={(e) => setNewForm({ ...newForm, jobValue: Number(e.target.value) })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Crew & Investigator Assignment Grid */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Crew & Investigator Assignment ({newForm.city} Hub)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block">Assign Investigator</label>
                    <select
                      value={newForm.assignedInvestigatorName}
                      onChange={(e) => {
                        const emp = employees.find(em => em.fullName === e.target.value);
                        setNewForm({
                          ...newForm,
                          assignedInvestigatorName: e.target.value,
                          assignedInvestigatorId: emp ? emp.id : '',
                        });
                      }}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                    >
                      <option value="">Pending Assignment</option>
                      {availableSupervisors.map(s => (
                        <option key={s.id} value={s.fullName}>{s.fullName} ({s.designation})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block">On-Job Supervisor</label>
                    <select
                      value={newForm.supervisorId}
                      onChange={(e) => setNewForm({ ...newForm, supervisorId: e.target.value })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                    >
                      <option value="">Select Supervisor</option>
                      {availableSupervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Complaint Category *</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value as ComplaintCategory })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-indigo-950 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Severity Level *</label>
                  <select
                    value={newForm.severity}
                    onChange={(e) => setNewForm({ ...newForm, severity: e.target.value as ComplaintSeverity })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold bg-white"
                  >
                    <option value="MINOR">Minor (Low impact)</option>
                    <option value="MODERATE">Moderate (Standard follow-up)</option>
                    <option value="MAJOR">Major (Physical damage / escalation)</option>
                    <option value="CRITICAL">Critical (Immediate leadership attention)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Complaint Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scratches observed on master bedroom marble floor"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record customer observations, statements, specific surfaces or items affected..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              {/* SOP Documentation Verification Checkbox Toggles */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SOP Documentation Verification</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.preServiceChecklistDone}
                      onChange={(e) => setNewForm({ ...newForm, preServiceChecklistDone: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Pre-Service Checklist Done</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.postServiceSignoffDone}
                      onChange={(e) => setNewForm({ ...newForm, postServiceSignoffDone: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Post-Service Signoff Signed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.beforePhotosAvailable}
                      onChange={(e) => setNewForm({ ...newForm, beforePhotosAvailable: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Before Photos Uploaded</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.afterPhotosAvailable}
                      onChange={(e) => setNewForm({ ...newForm, afterPhotosAvailable: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>After Photos Uploaded</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? 'Registering...' : 'Submit & Open Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD EVIDENCE FILE */}
      {showUploadEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Upload Evidence to Private Vault</h3>
              <button onClick={() => setShowUploadEvidenceModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleEvidenceUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block">Link to Complaint Ticket *</label>
                <select
                  value={targetComplaintForUpload}
                  onChange={(e) => setTargetComplaintForUpload(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  {complaints.map(c => (
                    <option key={c.id} value={c.id}>{c.complaintNumber} - {c.customerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Evidence Classification *</label>
                <select
                  value={uploadEvidenceForm.evidenceType}
                  onChange={(e) => setUploadEvidenceForm({ ...uploadEvidenceForm, evidenceType: e.target.value as EvidenceType })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom Floor Pre-Service Inspection"
                  value={uploadEvidenceForm.title}
                  onChange={(e) => setUploadEvidenceForm({ ...uploadEvidenceForm, title: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Select File (Image / PDF / Audio) *</label>
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf,audio/*"
                  onChange={handleFileInputChange}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-slate-600 bg-slate-50"
                />
                {uploadEvidenceForm.fileName && (
                  <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                    ✓ Selected: {uploadEvidenceForm.fileName} ({Math.round(uploadEvidenceForm.fileSizeBytes / 1024)} KB)
                  </span>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Investigation Context & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Describe lighting, angle, or customer statement context..."
                  value={uploadEvidenceForm.description}
                  onChange={(e) => setUploadEvidenceForm({ ...uploadEvidenceForm, description: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadEvidenceModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingEvidence || !uploadEvidenceForm.fileName}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  {uploadingEvidence ? 'Encrypting & Storing...' : 'Upload & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY EVIDENCE */}
      {verifyingEvidenceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 animate-fadeIn text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Verify Evidence Authenticity</h3>
            <p className="text-slate-500">Record verification findings to substantiate or validate this evidence.</p>
            <form onSubmit={handleVerifyEvidenceSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block">Verification Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Verified timestamp against GPS log and customer signed quote."
                  value={verificationNotesInput}
                  onChange={(e) => setVerificationNotesInput(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingEvidenceItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submittingVerification ? 'Verifying...' : 'Confirm Verification ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PARTICIPANT STATEMENT */}
      {recordingStatementParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Employee Statement</h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {recordingStatementParticipant.employee?.fullName} ({recordingStatementParticipant.roleOnJob})
                </span>
              </div>
              <button onClick={() => setRecordingStatementParticipant(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveParticipantStatement} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block">Allegation / Case Role Status</label>
                <select
                  value={allegationStatusChoice}
                  onChange={(e) => setAllegationStatusChoice(e.target.value as any)}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  <option value="PARTICIPANT">Participant (General on-site crew member)</option>
                  <option value="NAMED_IN_COMPLAINT">Named in Complaint (Direct customer allegation)</option>
                  <option value="EXONERATED">Exonerated (Evidence proves no fault / protocol followed)</option>
                  <option value="SUBSTANTIATED">Substantiated (Lapse or skill gap confirmed)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block">Formal Written Statement *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record employee's account of events, chemicals utilized, machinery settings, or pre-existing conditions..."
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordingStatementParticipant(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatement || !statementText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {savingStatement ? 'Saving...' : 'Save Statement to Case File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: EXECUTIVE SANCTION & APPROVAL */}
      {showApprovalModal && targetComplaintForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                  {targetComplaintForApproval.complaintNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Record Executive Sanction & Decision</h3>
                <p className="text-xs text-slate-500">
                  {targetComplaintForApproval.customerName} · {targetComplaintForApproval.city} · Value: {formatINR(targetComplaintForApproval.jobValue)}
                </p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitApproval} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600">Calculated Exposure / Cost:</span>
                  <span className="font-black text-rose-600 text-sm">
                    {formatINR((targetComplaintForApproval.costs || []).reduce((acc, c) => acc + c.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Required Governance Authority:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {((targetComplaintForApproval.costs || []).reduce((acc, c) => acc + c.amount, 0) > 15000)
                      ? 'MANAGEMENT_ADMIN'
                      : ((targetComplaintForApproval.costs || []).reduce((acc, c) => acc + c.amount, 0) >= 5000)
                        ? 'COO'
                        : 'OPERATIONS_MANAGER'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block">Approver Role Authority *</label>
                  <select
                    value={approvalDecisionForm.approverRole}
                    onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, approverRole: e.target.value as any })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                  >
                    <option value="OPERATIONS_MANAGER">Operations Manager (Up to ₹5k)</option>
                    <option value="COO">Chief Operating Officer (Up to ₹15k)</option>
                    <option value="MANAGEMENT_ADMIN">Management Admin / Director (&gt; ₹15k)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block">Approver Full Name *</label>
                  <input
                    type="text"
                    required
                    value={approvalDecisionForm.approverName}
                    onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, approverName: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block">Sanction Type *</label>
                  <select
                    value={approvalDecisionForm.approvalType}
                    onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, approvalType: e.target.value as any })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                  >
                    <option value="RESPONSIBILITY_ASSESSMENT">Responsibility Assessment Ratification</option>
                    <option value="FINANCIAL_EXPOSURE">Financial Loss / Absorption Sanction</option>
                    <option value="COMPLAINT_CLOSURE">Final Complaint Closure Sanction</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block">Financial Amount Approved (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={approvalDecisionForm.financialAmountApproved}
                    onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, financialAmountApproved: Number(e.target.value) })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Executive Decision *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { id: 'APPROVED', label: 'Approve & Sanction ✓', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { id: 'REJECTED', label: 'Reject Assessment ✕', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                    { id: 'ESCALATED', label: 'Escalate to Board ↗', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { id: 'RETURNED_FOR_INVESTIGATION', label: 'Return to Desk ↩', color: 'border-slate-500 bg-slate-50 text-slate-800' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-bold transition-all ${
                        approvalDecisionForm.decision === opt.id
                          ? opt.color + ' ring-2 ring-indigo-500/40'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="approvalDecision"
                        value={opt.id}
                        checked={approvalDecisionForm.decision === opt.id}
                        onChange={() => setApprovalDecisionForm({ ...approvalDecisionForm, decision: opt.id as any })}
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Executive Comments & Rationale *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Record formal executive rationale, findings validation, or rejection grounds..."
                  value={approvalDecisionForm.comments}
                  onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, comments: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Mandatory Directives / Conditions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Technician Anas Mohammed must complete Delicate Surface Coaching module..."
                  value={approvalDecisionForm.conditions}
                  onChange={(e) => setApprovalDecisionForm({ ...approvalDecisionForm, conditions: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval || !approvalDecisionForm.comments.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  {submittingApproval ? 'Submitting...' : 'Record Sanction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BOOK EXPENSE / INVOICE */}
      {showAddCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Book Complaint Expense / Vendor Invoice</h3>
                <p className="text-xs text-slate-500">Record itemized loss, third-party contractor bills, replacement parts, or customer compensation</p>
              </div>
              <button
                onClick={() => setShowAddCostModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCost} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block">Target Complaint Ticket *</label>
                <select
                  value={targetComplaintForCost}
                  onChange={(e) => setTargetComplaintForCost(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  {complaints.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.complaintNumber} - {c.customerName} ({c.city} · {c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block">Cost Category *</label>
                  <select
                    value={costForm.costType}
                    onChange={(e) => setCostForm({ ...costForm, costType: e.target.value as any })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                  >
                    <option value="REWORK_LABOUR">Rework Labour (Secondary Crew)</option>
                    <option value="DAMAGE_REPAIR_VENDOR">Damage Repair Vendor / Contractor</option>
                    <option value="CUSTOMER_REFUND">Direct Customer Refund</option>
                    <option value="CUSTOMER_DISCOUNT_COUPON">Customer Goodwill Voucher</option>
                    <option value="MATERIALS_PARTS">Materials & Replacement Parts</option>
                    <option value="TRAVEL_LOGISTICS">Travel & Emergency Transit</option>
                    <option value="EQUIPMENT_REPAIR_VENDOR">Machine Servicing / Repair</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block">Amount (INR) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={costForm.amount}
                    onChange={(e) => setCostForm({ ...costForm, amount: Number(e.target.value) })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block">Vendor / Contractor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Skyline Glass & Wood Specialists"
                    value={costForm.vendorName}
                    onChange={(e) => setCostForm({ ...costForm, vendorName: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block">Invoice / Receipt Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-8812"
                    value={costForm.invoiceReceiptRef}
                    onChange={(e) => setCostForm({ ...costForm, invoiceReceiptRef: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Expense Description & Justification *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail what was purchased, repaired, or compensated to resolve this complaint..."
                  value={costForm.description}
                  onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="companyAbsorptionCheck"
                    checked={costForm.isCompanyAbsorption}
                    onChange={(e) => setCostForm({ ...costForm, isCompanyAbsorption: e.target.checked })}
                    className="rounded border-emerald-400 text-emerald-600"
                  />
                  <label htmlFor="companyAbsorptionCheck" className="font-bold text-emerald-900 cursor-pointer">
                    100% Absorbed by Handy Squad (Company Goodwill Policy)
                  </label>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Per Section 8, Handy Squad absorbs operational lapses. Automated salary deduction is strictly forbidden.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCostModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCost || !costForm.description.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  {submittingCost ? 'Booking...' : 'Book Expense to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EMPLOYEE COACHING & CAREER DOSSIER */}
      {selectedEmployeeForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedEmployeeForDetail.employeeCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {selectedEmployeeForDetail.city}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedEmployeeForDetail.trainingStatus === 'UP_TO_DATE' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedEmployeeForDetail.trainingStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedEmployeeForDetail.fullName}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedEmployeeForDetail.designation.replace(/_/g, ' ')} · Hired: {selectedEmployeeForDetail.hireDate} · Phone: {selectedEmployeeForDetail.primaryPhone}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeForDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Section A: Complaint Participation & Allegation Segregation */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Case Participation History (Allegations vs Verified Findings)
                </h4>
              </div>

              {(() => {
                const involvedComplaints: { complaint: Complaint; participant: ComplaintParticipant }[] = [];
                complaints.forEach(c => {
                  (c.participants || []).forEach(p => {
                    if (p.employeeId === selectedEmployeeForDetail.id || p.employee?.id === selectedEmployeeForDetail.id) {
                      involvedComplaints.push({ complaint: c, participant: p });
                    }
                  });
                });

                if (involvedComplaints.length === 0) {
                  return (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                      ✓ Zero customer complaints on record. Flawless service delivery score!
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {involvedComplaints.map(({ complaint: c, participant: p }) => (
                      <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700">{c.complaintNumber}</span>
                              <span className="font-semibold text-slate-800">{c.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Role on Job: <strong>{p.roleOnJob.replace(/_/g, ' ')}</strong> · Customer: {c.customerName}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.allegationStatus === 'EXONERATED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.allegationStatus === 'SUBSTANTIATED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-200 text-slate-800'
                          }`}>
                            {p.allegationStatus}
                          </span>
                        </div>
                        {p.statement && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                            Statement: "{p.statement}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Section B: Training & Coaching Dossier */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Technical Coaching & SOP Certification Matrix
                  </h4>
                  <p className="text-[11px] text-slate-500">Coaching records restore employee career status upon completion</p>
                </div>
                <button
                  onClick={() => setShowAssignTrainingModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Assign Coaching Module
                </button>
              </div>

              {loadingTraining ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading coaching records...</div>
              ) : employeeTrainingList.length > 0 ? (
                <div className="space-y-2">
                  {employeeTrainingList.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-indigo-700 font-bold">{t.moduleCode}</span>
                            <span className="font-bold text-slate-900">{t.moduleTitle}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Trainer: {t.trainerName} · Scheduled: {t.scheduledDate} {t.completionDate ? `· Completed: ${t.completionDate}` : ''}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.status === 'COMPLETED_PASSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                          {t.scorePct !== undefined && t.scorePct > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 block font-mono">
                              Score: {t.scorePct}%
                            </span>
                          )}
                        </div>
                      </div>

                      {t.notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          {t.notes}
                        </p>
                      )}

                      {t.status !== 'COMPLETED_PASSED' && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleCompleteTraining(t.id)}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                          >
                            <CheckIcon className="w-3 h-3" />
                            Verify & Mark Module Passed (Score: 96%)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
                  No active coaching modules assigned. Employee is in good standing.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN TRAINING MODULE */}
      {showAssignTrainingModal && selectedEmployeeForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign Technical Coaching Module</h3>
                <p className="text-xs text-slate-500">Employee: {selectedEmployeeForDetail.fullName} ({selectedEmployeeForDetail.employeeCode})</p>
              </div>
              <button onClick={() => setShowAssignTrainingModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAssignTraining} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block">Coaching Category & Curriculum *</label>
                <select
                  value={assignTrainingForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    let code = 'SOP-GEN-01';
                    let title = 'Standard Operating Procedures Review';
                    if (cat === 'DELICATE_SURFACES') {
                      code = 'SOP-DEL-01';
                      title = 'Natural Stone & Acid-Sensitive Surface Protection';
                    } else if (cat === 'CHEMICAL_SAFETY') {
                      code = 'SOP-SAF-01';
                      title = 'Chemical Dilution, PPE & Ventilation Standards';
                    } else if (cat === 'CHECKLIST_DOCUMENTATION') {
                      code = 'SOP-CHK-01';
                      title = 'Pre-Service Pre-Existing Damage Video Sign-off';
                    } else if (cat === 'MACHINE_OPERATION') {
                      code = 'SOP-MCH-01';
                      title = 'Single Disc Scrubber & Jet Washer Maintenance';
                    } else if (cat === 'CUSTOMER_COMMUNICATION') {
                      code = 'SOP-COM-01';
                      title = 'Client Expectation Management & De-escalation';
                    } else if (cat === 'TIME_MANAGEMENT') {
                      code = 'SOP-TIM-01';
                      title = 'Transit Route Optimization & On-Time Arrival';
                    }
                    setAssignTrainingForm({ ...assignTrainingForm, category: cat, moduleCode: code, moduleTitle: title });
                  }}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                >
                  <option value="DELICATE_SURFACES">Natural Stone & Delicate Surfaces SOP</option>
                  <option value="CHEMICAL_SAFETY">Chemical Dilution & Flooring Safety</option>
                  <option value="CHECKLIST_DOCUMENTATION">Pre-Service Inspection Video Sign-off</option>
                  <option value="MACHINE_OPERATION">Single Disc Scrubber & Jet Operation</option>
                  <option value="CUSTOMER_COMMUNICATION">Customer Communication & De-escalation</option>
                  <option value="TIME_MANAGEMENT">Route Transit & On-Time Arrival</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Module Title</label>
                <input
                  type="text"
                  required
                  value={assignTrainingForm.moduleTitle}
                  onChange={(e) => setAssignTrainingForm({ ...assignTrainingForm, moduleTitle: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block">Master Trainer</label>
                  <input
                    type="text"
                    required
                    value={assignTrainingForm.trainerName}
                    onChange={(e) => setAssignTrainingForm({ ...assignTrainingForm, trainerName: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={assignTrainingForm.scheduledDate}
                    onChange={(e) => setAssignTrainingForm({ ...assignTrainingForm, scheduledDate: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block">Coaching Notes & Specific Focus Areas</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on pH-neutral cleaner application on Italian marble and corner tape masking..."
                  value={assignTrainingForm.notes}
                  onChange={(e) => setAssignTrainingForm({ ...assignTrainingForm, notes: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignTrainingModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTraining}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {submittingTraining ? 'Assigning...' : 'Assign Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW EVIDENCE */}
      {previewingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                  {EVIDENCE_TYPE_LABELS[previewingEvidence.evidenceType]}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{previewingEvidence.title}</h3>
              </div>
              <button onClick={() => setPreviewingEvidence(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[250px] max-h-[450px]">
              {previewingEvidence.mimeType.startsWith('image/') && previewingEvidence.downloadUrl ? (
                <img src={previewingEvidence.downloadUrl} alt={previewingEvidence.title} className="max-h-[450px] w-auto object-contain" />
              ) : previewingEvidence.mimeType.startsWith('audio/') && previewingEvidence.downloadUrl ? (
                <div className="p-6 text-center space-y-3">
                  <span className="text-4xl block">🎙️</span>
                  <audio controls className="w-full">
                    <source src={previewingEvidence.downloadUrl} type={previewingEvidence.mimeType} />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileTextIcon className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600">Document preview ({previewingEvidence.fileName})</p>
                  {previewingEvidence.downloadUrl && (
                    <a
                      href={previewingEvidence.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 text-white"
                    >
                      Open Private Document in Secure Tab ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 flex justify-between items-center pt-2 border-t border-slate-100">
              <span>Uploaded by {previewingEvidence.uploadedByName}</span>
              <button
                onClick={() => setPreviewingEvidence(null)}
                className="text-xs font-bold px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
