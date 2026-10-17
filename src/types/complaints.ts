// src/types/complaints.ts
// HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (TYPESCRIPT DATA MODELS)

export type UserRole = 
  | 'BDA_SALES'
  | 'HR'
  | 'SCHEDULING_TEAM'
  | 'OPERATIONS_TEAM'
  | 'OPERATIONS_MANAGER'
  | 'COO'
  | 'MANAGEMENT_ADMIN';

export type KeralaCity = 'Kochi' | 'Trivandrum' | 'Kozhikode' | 'Thrissur' | 'All_Kerala';

export type ServiceType = 
  | 'DEEP_CLEANING'
  | 'MOVE_IN_OUT_CLEANING'
  | 'SOFA_CARPET_SHAMPOO'
  | 'KITCHEN_DEGREASING'
  | 'BATHROOM_RESTORATION'
  | 'MARBLE_POLISHING'
  | 'GENERAL_HOUSEKEEPING'
  | 'POST_CONSTRUCTION_CLEANING';

export type ComplaintCategory = 
  | 'PROCESS_ISSUE'
  | 'DAMAGE_ISSUE'
  | 'SKILL_ISSUE'
  | 'SCOPE_CONFUSION'
  | 'MACHINE_ISSUE'
  | 'LATE_START'
  | 'LATE_COMPLETION'
  | 'SCOPE_MISSED'
  | 'CUSTOMER_EXPERIENCE'
  | 'COMPANY_GOODWILL_DECISION';

export type ComplaintSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

export type ComplaintStatus = 
  | 'REGISTERED'
  | 'INVESTIGATION_PENDING'
  | 'UNDER_INVESTIGATION'
  | 'EVIDENCE_REVIEW'
  | 'ASSESSMENT_COMPLETED'
  | 'APPROVAL_PENDING'
  | 'CORRECTIVE_ACTION_REQUIRED'
  | 'REWORK_IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type EmployeeDesignation = 
  | 'TECHNICIAN'
  | 'SENIOR_TECHNICIAN'
  | 'SUPERVISOR'
  | 'TEAM_LEAD'
  | 'OPERATIONS_EXECUTIVE'
  | 'OPERATIONS_MANAGER'
  | 'DRIVER';

export type EvidenceType = 
  | 'BEFORE_PHOTO'
  | 'AFTER_PHOTO'
  | 'WORK_ORDER'
  | 'CHECKLIST'
  | 'CUSTOMER_COMMUNICATION'
  | 'SCOPE_CHANGE'
  | 'MAINTENANCE_RECORD'
  | 'TRAINING_RECORD'
  | 'COMPLETION_SIGNOFF'
  | 'DAMAGE_ASSESSMENT'
  | 'REWORK_PHOTO'
  | 'AUDIO_RECORDING'
  | 'OTHER_DOCUMENT';

export type CostType = 
  | 'REWORK_LABOUR'
  | 'REWORK_MATERIALS'
  | 'REWORK_TRAVEL'
  | 'DAMAGE_REPAIR_VENDOR'
  | 'REPLACEMENT_ITEM'
  | 'CUSTOMER_REFUND'
  | 'CUSTOMER_DISCOUNT_COUPON'
  | 'EXECUTIVE_GOODWILL_GESTURE'
  | 'EQUIPMENT_REPAIR';

export type CostStatus = 'ESTIMATED' | 'VERIFIED_INCURRED' | 'REJECTED' | 'WAIVED';

export type AssessmentStatus = 
  | 'PROVISIONAL'
  | 'INVESTIGATION_REQUIRED'
  | 'RECOMMENDED'
  | 'CONFIRMED'
  | 'OVERRULED';

export type ResponsibleParty = 
  | 'COMPANY'
  | 'EMPLOYEE_INDIVIDUAL'
  | 'CREW_SHARED'
  | 'CUSTOMER'
  | 'THIRD_PARTY_VENDOR'
  | 'NO_FAULT_GOODWILL';

export type ApprovalType = 
  | 'RESPONSIBILITY_ASSESSMENT'
  | 'FINANCIAL_LOSS_APPROVAL'
  | 'CUSTOMER_COMPENSATION'
  | 'EMPLOYEE_ADJUSTMENT'
  | 'COMPLAINT_CLOSURE';

export type ApprovalDecision = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'RETURNED_FOR_INVESTIGATION';

export type CorrectiveActionType = 
  | 'REWORK_SERVICE'
  | 'APOLOGY_CALL_VISIT'
  | 'TRAINING_ASSIGNMENT'
  | 'SOP_PROCESS_UPDATE'
  | 'EQUIPMENT_OVERHAUL'
  | 'SUPERVISION_AUDIT'
  | 'DOCUMENTATION_POLICY_MANDATE'
  | 'COACHING_COUNSELING';

export type CorrectiveActionStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFIED_EFFECTIVE'
  | 'OVERDUE';

// --- TABLE INTERFACES ---

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  city: KeralaCity;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: EmployeeDesignation;
  city: KeralaCity;
  primaryPhone: string;
  hireDate: string;
  unitId?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  trainingStatus: 'UP_TO_DATE' | 'TRAINING_REQUIRED' | 'REASSESSMENT_PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintParticipant {
  id: string;
  complaintId: string;
  employeeId: string;
  employee?: Employee;
  roleOnJob: 'SUPERVISOR' | 'PRIMARY_TECHNICIAN' | 'ASSISTANT_TECHNICIAN' | 'DRIVER' | 'OPERATIONS_LEAD';
  statement?: string;
  interviewedAt?: string;
  interviewedById?: string;
  allegationStatus: 'PARTICIPANT' | 'NAMED_IN_COMPLAINT' | 'EXONERATED' | 'SUBSTANTIATED';
  createdAt: string;
}

export interface ComplaintEvidence {
  id: string;
  complaintId: string;
  evidenceType: EvidenceType;
  title: string;
  description?: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedById?: string;
  uploadedByName: string;
  isVerified: boolean;
  verifiedById?: string;
  verificationNotes?: string;
  createdAt: string;
  downloadUrl?: string; // signed URL generated dynamically
}

export interface InvestigationRecord {
  id: string;
  complaintId: string;
  investigatorId: string;
  investigatorName: string;
  investigationStatus: 'IN_PROGRESS' | 'EVIDENCE_INSUFFICIENT' | 'COMPLETED' | 'ESCALATED';
  customerStatement?: string;
  supervisorStatement?: string;
  technicianStatements?: string;
  equipmentStatusCheck?: string;
  materialsUsedCheck?: string;
  arrivalDepartureVerification?: string;
  rootCauseAnalysis?: string;
  rootCauseCategory?: string;
  isPreExistingDamage: boolean;
  missingEvidenceFlags: string[];
  findingsSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibilityAssessment {
  id: string;
  complaintId: string;
  ruleVersionId?: string;
  assessmentNumber: number;
  isLatest: boolean;
  assessedById?: string;
  assessedByName: string;
  assessmentStatus: AssessmentStatus;
  primaryResponsibleParty: ResponsibleParty;
  companySharePct: number;
  employeeSharePct: number;
  responsibleEmployeeId?: string;
  responsibleEmployee?: Employee;
  rationale: string;
  evidenceReviewedSummary: string;
  conflictingEvidenceNotes?: string;
  recommendedCorrectiveAction: string;
  requiredApprovalAuthority: 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN';
  createdAt: string;
}

export interface CostRecord {
  id: string;
  complaintId: string;
  costType: CostType;
  description: string;
  amount: number;
  status: CostStatus;
  vendorName?: string;
  invoiceReceiptRef?: string;
  verifiedById?: string;
  verifiedAt?: string;
  isCompanyAbsorption: boolean;
  proposedEmployeeShare: number;
  approvedEmployeeShare: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  complaintId: string;
  assessmentId?: string;
  approvalType: ApprovalType;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: ApprovalDecision;
  comments: string;
  conditions?: string;
  financialAmountApproved?: number;
  createdAt: string;
}

export interface CorrectiveAction {
  id: string;
  complaintId: string;
  actionType: CorrectiveActionType;
  title: string;
  description: string;
  assignedToEmployeeId?: string;
  assignedToEmployee?: Employee;
  assignedToProfileId?: string;
  dueDate: string;
  status: CorrectiveActionStatus;
  completionDate?: string;
  verificationNotes?: string;
  verifiedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  complaintId?: string;
  moduleCode: string;
  moduleTitle: string;
  category: string;
  status: 'ASSIGNED' | 'IN_TRAINING' | 'COMPLETED_PASSED' | 'FAILED_RETEST_REQUIRED';
  trainerName: string;
  scheduledDate: string;
  completionDate?: string;
  scorePct?: number;
  reassessmentRequired: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  commentType: 'INTERNAL_NOTE' | 'CUSTOMER_UPDATE' | 'INVESTIGATION_LOG' | 'DECISION_JUSTIFICATION' | 'SYSTEM_GENERATED';
  commentText: string;
  createdAt: string;
}

export interface RuleConfiguration {
  id: string;
  category: ComplaintCategory;
  categoryTitle: string;
  description: string;
  defaultSeverity: ComplaintSeverity;
  mandatoryEvidenceRequired: EvidenceType[];
  investigationChecklist: string[];
  defaultResponsibility: ResponsibleParty;
  approvalThresholdMinor: number;
  approvalThresholdModerate: number;
  approvalThresholdMajor: number;
  isActive: boolean;
  versionNumber: number;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  complaintId?: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  reason?: string;
  beforeValues?: any;
  afterValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  reportingDate: string;
  reportedById?: string;
  reportedByName: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  city: KeralaCity;
  serviceType: ServiceType;
  jobId?: string;
  jobDate: string;
  jobValue: number;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  assignedInvestigatorId?: string;
  assignedInvestigatorName?: string;
  title: string;
  description: string;
  preServiceChecklistDone: boolean;
  postServiceSignoffDone: boolean;
  beforePhotosAvailable: boolean;
  afterPhotosAvailable: boolean;
  workOrderVerified: boolean;
  targetResolutionDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  closedById?: string;
  closureNotes?: string;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  participants?: ComplaintParticipant[];
  evidence?: ComplaintEvidence[];
  costs?: CostRecord[];
  investigation?: InvestigationRecord;
  assessments?: ResponsibilityAssessment[];
  approvals?: ApprovalRecord[];
  correctiveActions?: CorrectiveAction[];
  comments?: ComplaintComment[];
}

export interface ComplaintFilters {
  status?: string;
  category?: string;
  city?: string;
  severity?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface ComplaintDashboardSummary {
  totalComplaints: number;
  openComplaints: number;
  criticalCases: number;
  overdueCases: number;
  pendingApprovals: number;
  totalVerifiedLoss: number;
  totalEstimatedLoss: number;
  reworkCount: number;
  documentationCompliancePct: number;
  categoryCounts: Record<ComplaintCategory, number>;
  cityCounts: Record<string, number>;
  severityCounts: Record<ComplaintSeverity, number>;
}
