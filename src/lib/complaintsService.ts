// src/lib/complaintsService.ts
// HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (SERVICE LAYER - PHASE 3 ENHANCED)

import { supabase } from './supabase';
import { 
  Complaint, 
  ComplaintFilters, 
  ComplaintDashboardSummary, 
  Employee, 
  RuleConfiguration, 
  ComplaintEvidence, 
  CostRecord, 
  ResponsibilityAssessment, 
  ApprovalRecord, 
  ComplaintComment,
  ComplaintParticipant,
  InvestigationRecord,
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
  EvidenceType
} from '../types/complaints';

// Category Mandatory & Recommended Evidence Rules per Engineering Spec (Section 6 & 7)
export interface CategoryEvidenceRule {
  mandatory: EvidenceType[];
  recommended: EvidenceType[];
  complianceWarning: string;
}

export const CATEGORY_EVIDENCE_RULES: Record<ComplaintCategory, CategoryEvidenceRule> = {
  DAMAGE_ISSUE: {
    mandatory: ['BEFORE_PHOTO', 'AFTER_PHOTO', 'CHECKLIST'],
    recommended: ['DAMAGE_ASSESSMENT', 'WORK_ORDER'],
    complianceWarning: 'Surface / Property Damage requires Pre-Service Checklist and Before Photos to determine pre-existing defects.',
  },
  SKILL_ISSUE: {
    mandatory: ['BEFORE_PHOTO', 'AFTER_PHOTO'],
    recommended: ['TRAINING_RECORD', 'WORK_ORDER'],
    complianceWarning: 'Workmanship issues require After Photos and technician training verification.',
  },
  SCOPE_CONFUSION: {
    mandatory: ['WORK_ORDER', 'CUSTOMER_COMMUNICATION'],
    recommended: ['SCOPE_CHANGE', 'CHECKLIST'],
    complianceWarning: 'Scope confusion requires original signed Work Order and Customer Chat/Communication records.',
  },
  SCOPE_MISSED: {
    mandatory: ['WORK_ORDER', 'CHECKLIST', 'AFTER_PHOTO'],
    recommended: ['COMPLETION_SIGNOFF'],
    complianceWarning: 'Missed areas require Checklist verification and completion signoff audit.',
  },
  MACHINE_ISSUE: {
    mandatory: ['MAINTENANCE_RECORD'],
    recommended: ['DAMAGE_ASSESSMENT', 'AFTER_PHOTO'],
    complianceWarning: 'Equipment failure requires machine maintenance log and servicing history.',
  },
  LATE_START: {
    mandatory: ['WORK_ORDER', 'CUSTOMER_COMMUNICATION'],
    recommended: ['OTHER_DOCUMENT'],
    complianceWarning: 'Late arrival requires customer arrival time notification and transit logs.',
  },
  LATE_COMPLETION: {
    mandatory: ['WORK_ORDER', 'COMPLETION_SIGNOFF'],
    recommended: ['CUSTOMER_COMMUNICATION'],
    complianceWarning: 'Overrun requires job departure signoff and technician log.',
  },
  PROCESS_ISSUE: {
    mandatory: ['CHECKLIST', 'COMPLETION_SIGNOFF'],
    recommended: ['WORK_ORDER'],
    complianceWarning: 'Protocol lapses require SOP checklist and supervisor signoff.',
  },
  CUSTOMER_EXPERIENCE: {
    mandatory: ['CUSTOMER_COMMUNICATION'],
    recommended: ['AUDIO_RECORDING', 'WORK_ORDER'],
    complianceWarning: 'Staff demeanor complaints require recorded customer audio or message transcript.',
  },
  COMPANY_GOODWILL_DECISION: {
    mandatory: ['CUSTOMER_COMMUNICATION', 'WORK_ORDER'],
    recommended: ['COMPLETION_SIGNOFF'],
    complianceWarning: 'Goodwill absorption requires documented rationale and work order confirmation.',
  },
};

// Fallback seed complaints for immediate UI verification & testing
export const FALLBACK_SEED_COMPLAINTS: Complaint[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    complaintNumber: 'HS-CMP-202610-1001',
    reportingDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    reportedByName: 'Ashish Roy (Operations Desk)',
    customerName: 'Mathew Varghese',
    customerPhone: '+91 98471 55660',
    customerAddress: 'Skyline Imperial Heights, Flat 7B, Panampilly Nagar',
    city: 'Kochi',
    serviceType: 'DEEP_CLEANING',
    jobId: 'JOB-KC-9012',
    jobDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    jobValue: 14500,
    category: 'DAMAGE_ISSUE',
    severity: 'MAJOR',
    status: 'UNDER_INVESTIGATION',
    assignedInvestigatorName: 'Govindan Nair (Ops Lead)',
    title: 'Micro-scratch marks reported on Italian marble floor in master bedroom',
    description: 'Customer observed circular buffing swirl marks and slight haziness on polished Italian beige marble after single-disc scrubbing. Believes incorrect floor pad or abrasive chemical was utilized.',
    preServiceChecklistDone: true,
    postServiceSignoffDone: false,
    beforePhotosAvailable: true,
    afterPhotosAvailable: true,
    workOrderVerified: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    participants: [
      {
        id: 'part-1',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        employeeId: 'emp-101',
        roleOnJob: 'SUPERVISOR',
        statement: 'Pre-inspection showed light etch marks near balcony threshold, but master bedroom centre was unblemished. White pad 3M was assigned; technician may have swapped for red pad without signoff.',
        allegationStatus: 'PARTICIPANT',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        employee: {
          id: 'emp-101',
          employeeCode: 'HS-EMP-101',
          fullName: 'Govindan Nair',
          designation: 'SUPERVISOR',
          city: 'Kochi',
          primaryPhone: '+91 98470 11223',
          hireDate: '2023-01-15',
          status: 'ACTIVE',
          trainingStatus: 'UP_TO_DATE',
          createdAt: '',
          updatedAt: ''
        }
      },
      {
        id: 'part-2',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        employeeId: 'emp-102',
        roleOnJob: 'PRIMARY_TECHNICIAN',
        statement: 'Floor had embedded grout dust. I utilized neutral cleaner Taski R2. Buffer was operated at standard RPM. Circular marks became visible once floor dried under downlights.',
        allegationStatus: 'NAMED_IN_COMPLAINT',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        employee: {
          id: 'emp-102',
          employeeCode: 'HS-EMP-102',
          fullName: 'Pradeep Kumar K.',
          designation: 'SENIOR_TECHNICIAN',
          city: 'Kochi',
          primaryPhone: '+91 94471 22334',
          hireDate: '2023-03-20',
          status: 'ACTIVE',
          trainingStatus: 'UP_TO_DATE',
          createdAt: '',
          updatedAt: ''
        }
      }
    ],
    evidence: [
      {
        id: 'ev-1',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        evidenceType: 'BEFORE_PHOTO',
        title: 'Master Bedroom Marble - Initial State',
        description: 'Captured at 09:15 AM before cleaning commenced. Shows surface reflection with minor dusting.',
        storagePath: 'complaints/HS-CMP-202610-1001/before_master_bedroom.jpg',
        fileName: 'before_master_bedroom.jpg',
        fileSizeBytes: 2450000,
        mimeType: 'image/jpeg',
        uploadedByName: 'Govindan Nair (Supervisor)',
        isVerified: true,
        verificationNotes: 'Verified time metadata matches work order start window.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        downloadUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'ev-2',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        evidenceType: 'AFTER_PHOTO',
        title: 'Master Bedroom Swirl Marks Under Downlight',
        description: 'Close-up photo under 3000K warm downlight displaying circular buffer swirls.',
        storagePath: 'complaints/HS-CMP-202610-1001/after_swirl_marks.jpg',
        fileName: 'after_swirl_marks.jpg',
        fileSizeBytes: 3120000,
        mimeType: 'image/jpeg',
        uploadedByName: 'Ashish Roy',
        isVerified: true,
        verificationNotes: 'High-resolution photo confirms surface swirl marks.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        downloadUrl: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'ev-3',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        evidenceType: 'CHECKLIST',
        title: 'Signed Pre-Service Checklist',
        description: 'Physical checklist with customer acknowledgement of pre-existing balcony floor marks.',
        storagePath: 'complaints/HS-CMP-202610-1001/preservice_checklist.pdf',
        fileName: 'preservice_checklist.pdf',
        fileSizeBytes: 820000,
        mimeType: 'application/pdf',
        uploadedByName: 'Govindan Nair',
        isVerified: true,
        verificationNotes: 'Customer initials present on page 2.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      }
    ],
    costs: [
      {
        id: 'cost-1',
        complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
        costType: 'DAMAGE_REPAIR_VENDOR',
        description: 'Estimated diamond crystallizer re-polishing cost by specialized marble restoration contractor',
        amount: 4500,
        status: 'ESTIMATED',
        isCompanyAbsorption: true,
        proposedEmployeeShare: 0,
        approvedEmployeeShare: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    complaintNumber: 'HS-CMP-202610-1002',
    reportingDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    reportedByName: 'Deepa Pillai (Scheduling Desk)',
    customerName: 'Amina Beevi',
    customerPhone: '+91 94472 88991',
    customerAddress: 'Kowdiar Heritage Villa, Golf Links Road',
    city: 'Trivandrum',
    serviceType: 'SOFA_CARPET_SHAMPOO',
    jobId: 'JOB-TV-4410',
    jobDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    jobValue: 6500,
    category: 'SKILL_ISSUE',
    severity: 'MODERATE',
    status: 'REWORK_IN_PROGRESS',
    assignedInvestigatorName: 'Jayan Varghese (Supervisor)',
    title: 'Damp smell and water ring on 7-seater fabric sofa after extraction',
    description: 'Client called stating 7-seater sectional sofa remained excessively damp 48 hours post-shampooing with faint musty odor. Moisture extraction appears incomplete.',
    preServiceChecklistDone: true,
    postServiceSignoffDone: true,
    beforePhotosAvailable: false,
    afterPhotosAvailable: true,
    workOrderVerified: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    participants: [
      {
        id: 'part-3',
        complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
        employeeId: 'emp-105',
        roleOnJob: 'SUPERVISOR',
        statement: 'Monsoon humidity was at 88% on job day. Extra vacuum pass was recommended but blower was packed up prematurely.',
        allegationStatus: 'PARTICIPANT',
        createdAt: new Date().toISOString(),
      }
    ],
    evidence: [
      {
        id: 'ev-4',
        complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
        evidenceType: 'AFTER_PHOTO',
        title: 'Sectional Sofa Finished State',
        description: 'Post-service photo showing fabric color uniformity.',
        storagePath: 'complaints/HS-CMP-202610-1002/sofa_finish.jpg',
        fileName: 'sofa_finish.jpg',
        fileSizeBytes: 1840000,
        mimeType: 'image/jpeg',
        uploadedByName: 'Jayan Varghese',
        isVerified: true,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        downloadUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'ev-5',
        complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
        evidenceType: 'CUSTOMER_COMMUNICATION',
        title: 'Customer Voice Note Regarding Odor',
        description: 'Audio message from Mrs. Amina explaining dampness on seat cushion.',
        storagePath: 'complaints/HS-CMP-202610-1002/customer_audio_rework.mp3',
        fileName: 'customer_audio_rework.mp3',
        fileSizeBytes: 950000,
        mimeType: 'audio/mpeg',
        uploadedByName: 'Deepa Pillai',
        isVerified: true,
        verificationNotes: 'Reviewed audio recording; customer polite and requesting second pass.',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      }
    ],
    costs: [
      {
        id: 'cost-2',
        complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
        costType: 'REWORK_LABOUR',
        description: 'Senior technician re-extraction and deodorization pass scheduled',
        amount: 1200,
        status: 'VERIFIED_INCURRED',
        isCompanyAbsorption: true,
        proposedEmployeeShare: 0,
        approvedEmployeeShare: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    complaintNumber: 'HS-CMP-202610-1003',
    reportingDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    reportedByName: 'Ramesh Nair (BDA)',
    customerName: 'Dr. Haridasan Nair',
    customerPhone: '+91 97451 22334',
    customerAddress: 'Hill View Meadows, Mavoor Road',
    city: 'Kozhikode',
    serviceType: 'MOVE_IN_OUT_CLEANING',
    jobId: 'JOB-KZ-1029',
    jobDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    jobValue: 18000,
    category: 'LATE_START',
    severity: 'MINOR',
    status: 'RESOLVED',
    assignedInvestigatorName: 'Faizal Rahman (Ops Lead)',
    title: 'Crew arrived 1 hour 45 minutes late due to bypass vehicle puncture',
    description: 'Team was booked for 09:00 AM start, but vehicle tire puncture near Ramanattukara delayed arrival to 10:45 AM. Customer had taken leave from clinic and was upset.',
    preServiceChecklistDone: false,
    postServiceSignoffDone: true,
    beforePhotosAvailable: false,
    afterPhotosAvailable: true,
    workOrderVerified: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-6',
        complaintId: 'a1b2c3d4-0003-4000-8000-000000000003',
        evidenceType: 'WORK_ORDER',
        title: 'Original Dispatch Booking Slip',
        description: 'Confirmed scheduled arrival 09:00 AM Kozhikode.',
        storagePath: 'complaints/HS-CMP-202610-1003/booking_order.pdf',
        fileName: 'booking_order.pdf',
        fileSizeBytes: 420000,
        mimeType: 'application/pdf',
        uploadedByName: 'Ramesh Nair',
        isVerified: true,
        createdAt: new Date().toISOString(),
      }
    ],
    costs: [
      {
        id: 'cost-3',
        complaintId: 'a1b2c3d4-0003-4000-8000-000000000003',
        costType: 'CUSTOMER_DISCOUNT_COUPON',
        description: '₹1,000 compensation voucher issued for next service due to puncture delay',
        amount: 1000,
        status: 'VERIFIED_INCURRED',
        isCompanyAbsorption: true,
        proposedEmployeeShare: 0,
        approvedEmployeeShare: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    complaintNumber: 'HS-CMP-202610-1004',
    reportingDate: new Date().toISOString(),
    reportedByName: 'Ananya Sen (Customer Support)',
    customerName: 'Nandakumar Menon',
    customerPhone: '+91 98473 33445',
    customerAddress: 'Sobha Silver Lake, Puzhakkal',
    city: 'Thrissur',
    serviceType: 'KITCHEN_DEGREASING',
    jobId: 'JOB-TS-8812',
    jobDate: new Date().toISOString().split('T')[0],
    jobValue: 7500,
    category: 'SCOPE_MISSED',
    severity: 'MODERATE',
    status: 'REGISTERED',
    assignedInvestigatorName: 'Naveen Rajan (Supervisor)',
    title: 'Interior of modular pantry cabinets and exhaust baffle filters not degreased',
    description: 'Client notes kitchen counter and hob were cleaned thoroughly, but modular pantry internal shelving and chimney baffle grease traps were left untouched despite being in booking quote.',
    preServiceChecklistDone: false,
    postServiceSignoffDone: false,
    beforePhotosAvailable: true,
    afterPhotosAvailable: false,
    workOrderVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-7',
        complaintId: 'a1b2c3d4-0004-4000-8000-000000000004',
        evidenceType: 'BEFORE_PHOTO',
        title: 'Initial Kitchen State Before Degreasing',
        description: 'Shows kitchen prep area and cabinets before work started.',
        storagePath: 'complaints/HS-CMP-202610-1004/before_kitchen.jpg',
        fileName: 'before_kitchen.jpg',
        fileSizeBytes: 2100000,
        mimeType: 'image/jpeg',
        uploadedByName: 'Naveen Rajan',
        isVerified: false,
        createdAt: new Date().toISOString(),
        downloadUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      }
    ],
    costs: []
  }
];

export const FALLBACK_SEED_EMPLOYEES: Employee[] = [
  { id: 'emp-101', employeeCode: 'HS-EMP-101', fullName: 'Govindan Nair', designation: 'SUPERVISOR', city: 'Kochi', primaryPhone: '+91 98470 11223', hireDate: '2023-01-15', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-102', employeeCode: 'HS-EMP-102', fullName: 'Pradeep Kumar K.', designation: 'SENIOR_TECHNICIAN', city: 'Kochi', primaryPhone: '+91 94471 22334', hireDate: '2023-03-20', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-103', employeeCode: 'HS-EMP-103', fullName: 'Anas Mohammed', designation: 'TECHNICIAN', city: 'Kochi', primaryPhone: '+91 97460 33445', hireDate: '2023-06-10', status: 'ACTIVE', trainingStatus: 'TRAINING_REQUIRED', createdAt: '', updatedAt: '' },
  { id: 'emp-104', employeeCode: 'HS-EMP-104', fullName: 'Suresh Babu', designation: 'DRIVER', city: 'Kochi', primaryPhone: '+91 98950 44556', hireDate: '2023-02-01', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-105', employeeCode: 'HS-EMP-105', fullName: 'Jayan Varghese', designation: 'SUPERVISOR', city: 'Trivandrum', primaryPhone: '+91 94460 55667', hireDate: '2023-04-12', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-106', employeeCode: 'HS-EMP-106', fullName: 'Manoj Pillai', designation: 'TECHNICIAN', city: 'Trivandrum', primaryPhone: '+91 98461 66778', hireDate: '2023-07-05', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-107', employeeCode: 'HS-EMP-107', fullName: 'Faizal Rahman', designation: 'SUPERVISOR', city: 'Kozhikode', primaryPhone: '+91 97450 77889', hireDate: '2023-02-28', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-108', employeeCode: 'HS-EMP-108', fullName: 'Biju Balakrishnan', designation: 'SENIOR_TECHNICIAN', city: 'Kozhikode', primaryPhone: '+91 94960 88990', hireDate: '2023-05-18', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-109', employeeCode: 'HS-EMP-109', fullName: 'Naveen Rajan', designation: 'SUPERVISOR', city: 'Thrissur', primaryPhone: '+91 98472 99001', hireDate: '2023-08-01', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
  { id: 'emp-110', employeeCode: 'HS-EMP-110', fullName: 'Rahul Menon', designation: 'TECHNICIAN', city: 'Thrissur', primaryPhone: '+91 94473 10112', hireDate: '2023-09-15', status: 'ACTIVE', trainingStatus: 'UP_TO_DATE', createdAt: '', updatedAt: '' },
];

export async function fetchComplaints(filters?: ComplaintFilters): Promise<Complaint[]> {
  if (supabase) {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          costs:cost_records(*),
          participants:complaint_participants(*, employee:employees(*)),
          evidence:complaint_evidence(*),
          assessments:responsibility_assessments(*)
        `)
        .order('reporting_date', { ascending: false });

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters?.category && filters.category !== 'ALL') {
        query = query.eq('category', filters.category);
      }
      if (filters?.city && filters.city !== 'ALL') {
        query = query.eq('city', filters.city);
      }
      if (filters?.severity && filters.severity !== 'ALL') {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapDbComplaintToFrontend);
      }
    } catch (err) {
      console.warn('Supabase fetchComplaints failed, falling back to verified seed:', err);
    }
  }

  // Filter fallback seed data
  let result = [...FALLBACK_SEED_COMPLAINTS];
  if (filters?.status && filters.status !== 'ALL') {
    result = result.filter(c => c.status === filters.status);
  }
  if (filters?.category && filters.category !== 'ALL') {
    result = result.filter(c => c.category === filters.category);
  }
  if (filters?.city && filters.city !== 'ALL') {
    result = result.filter(c => c.city === filters.city);
  }
  if (filters?.severity && filters.severity !== 'ALL') {
    result = result.filter(c => c.severity === filters.severity);
  }
  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(c => 
      c.complaintNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchComplaintById(id: string): Promise<Complaint | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          costs:cost_records(*),
          participants:complaint_participants(*, employee:employees(*)),
          evidence:complaint_evidence(*),
          investigation:investigation_records(*),
          assessments:responsibility_assessments(*),
          approvals:approval_records(*),
          correctiveActions:corrective_actions(*),
          comments:complaint_comments(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        return mapDbComplaintToFrontend(data);
      }
    } catch (err) {
      console.warn('Supabase fetchComplaintById error:', err);
    }
  }

  const found = FALLBACK_SEED_COMPLAINTS.find(c => c.id === id);
  return found || null;
}

export async function fetchEmployees(city?: string): Promise<Employee[]> {
  if (supabase) {
    try {
      let query = supabase.from('employees').select('*').order('full_name', { ascending: true });
      if (city && city !== 'All_Kerala' && city !== 'ALL') {
        query = query.eq('city', city);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((e: any) => ({
          id: e.id,
          employeeCode: e.employee_code,
          fullName: e.full_name,
          designation: e.designation,
          city: e.city,
          primaryPhone: e.primary_phone,
          hireDate: e.hire_date,
          status: e.status,
          trainingStatus: e.training_status,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchEmployees error:', err);
    }
  }
  let emps = [...FALLBACK_SEED_EMPLOYEES];
  if (city && city !== 'All_Kerala' && city !== 'ALL') {
    emps = emps.filter(e => e.city === city);
  }
  return emps;
}

export async function computeComplaintDashboardSummary(complaints: Complaint[]): Promise<ComplaintDashboardSummary> {
  const summary: ComplaintDashboardSummary = {
    totalComplaints: complaints.length,
    openComplaints: 0,
    criticalCases: 0,
    overdueCases: 0,
    pendingApprovals: 0,
    totalVerifiedLoss: 0,
    totalEstimatedLoss: 0,
    reworkCount: 0,
    documentationCompliancePct: 0,
    categoryCounts: {
      PROCESS_ISSUE: 0,
      DAMAGE_ISSUE: 0,
      SKILL_ISSUE: 0,
      SCOPE_CONFUSION: 0,
      MACHINE_ISSUE: 0,
      LATE_START: 0,
      LATE_COMPLETION: 0,
      SCOPE_MISSED: 0,
      CUSTOMER_EXPERIENCE: 0,
      COMPANY_GOODWILL_DECISION: 0,
    },
    cityCounts: {
      Kochi: 0,
      Trivandrum: 0,
      Kozhikode: 0,
      Thrissur: 0,
    },
    severityCounts: {
      MINOR: 0,
      MODERATE: 0,
      MAJOR: 0,
      CRITICAL: 0,
    },
  };

  let compliantDocsCount = 0;

  complaints.forEach((c) => {
    // Open vs Closed
    if (c.status !== 'CLOSED' && c.status !== 'RESOLVED') {
      summary.openComplaints++;
    }
    if (c.status === 'APPROVAL_PENDING') {
      summary.pendingApprovals++;
    }
    if (c.severity === 'CRITICAL') {
      summary.criticalCases++;
    }
    if (c.status === 'REWORK_IN_PROGRESS') {
      summary.reworkCount++;
    }

    // Counts by category & city
    if (summary.categoryCounts[c.category] !== undefined) {
      summary.categoryCounts[c.category]++;
    }
    if (summary.cityCounts[c.city] !== undefined) {
      summary.cityCounts[c.city]++;
    }
    if (summary.severityCounts[c.severity] !== undefined) {
      summary.severityCounts[c.severity]++;
    }

    // Documentation compliance check
    if (c.preServiceChecklistDone && c.workOrderVerified && (c.beforePhotosAvailable || c.afterPhotosAvailable)) {
      compliantDocsCount++;
    }

    // Costs
    (c.costs || []).forEach((cost) => {
      if (cost.status === 'VERIFIED_INCURRED') {
        summary.totalVerifiedLoss += Number(cost.amount) || 0;
      } else if (cost.status === 'ESTIMATED') {
        summary.totalEstimatedLoss += Number(cost.amount) || 0;
      }
    });
  });

  summary.documentationCompliancePct = complaints.length > 0 
    ? Math.round((compliantDocsCount / complaints.length) * 100) 
    : 0;

  return summary;
}

// Mapper from DB snake_case to Frontend camelCase
function mapDbComplaintToFrontend(c: any): Complaint {
  return {
    id: c.id,
    complaintNumber: c.complaint_number,
    reportingDate: c.reporting_date,
    reportedById: c.reported_by_id,
    reportedByName: c.reported_by_name,
    customerName: c.customer_name,
    customerPhone: c.customer_phone,
    customerAddress: c.customer_address,
    city: c.city,
    serviceType: c.service_type,
    jobId: c.job_id,
    jobDate: c.job_date,
    jobValue: Number(c.job_value) || 0,
    category: c.category,
    severity: c.severity,
    status: c.status,
    assignedInvestigatorId: c.assigned_investigator_id,
    assignedInvestigatorName: c.assigned_investigator_name,
    title: c.title,
    description: c.description,
    preServiceChecklistDone: c.pre_service_checklist_done,
    postServiceSignoffDone: c.post_service_signoff_done,
    beforePhotosAvailable: c.before_photos_available,
    afterPhotosAvailable: c.after_photos_available,
    workOrderVerified: c.work_order_verified,
    targetResolutionDate: c.target_resolution_date,
    resolvedAt: c.resolved_at,
    closedAt: c.closed_at,
    closedById: c.closed_by_id,
    closureNotes: c.closure_notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    costs: (c.costs || []).map((cost: any) => ({
      id: cost.id,
      complaintId: cost.complaint_id,
      costType: cost.cost_type,
      description: cost.description,
      amount: Number(cost.amount) || 0,
      status: cost.status,
      vendorName: cost.vendor_name,
      invoiceReceiptRef: cost.invoice_receipt_ref,
      verifiedById: cost.verified_by_id,
      verifiedAt: cost.verified_at,
      isCompanyAbsorption: cost.is_company_absorption,
      proposedEmployeeShare: Number(cost.proposed_employee_share) || 0,
      approvedEmployeeShare: Number(cost.approved_employee_share) || 0,
      createdAt: cost.created_at,
      updatedAt: cost.updated_at,
    })),
    participants: (c.participants || []).map((p: any) => ({
      id: p.id,
      complaintId: p.complaint_id,
      employeeId: p.employee_id,
      roleOnJob: p.role_on_job,
      statement: p.statement,
      allegationStatus: p.allegation_status,
      createdAt: p.created_at,
      employee: p.employee ? {
        id: p.employee.id,
        employeeCode: p.employee.employee_code,
        fullName: p.employee.full_name,
        designation: p.employee.designation,
        city: p.employee.city,
        primaryPhone: p.employee.primary_phone,
        hireDate: p.employee.hire_date,
        status: p.employee.status,
        trainingStatus: p.employee.training_status,
        createdAt: p.employee.created_at,
        updatedAt: p.employee.updated_at,
      } : undefined,
    })),
    evidence: (c.evidence || []).map((e: any) => ({
      id: e.id,
      complaintId: e.complaint_id,
      evidenceType: e.evidence_type,
      title: e.title,
      description: e.description,
      storagePath: e.storage_path,
      fileName: e.file_name,
      fileSizeBytes: Number(e.file_size_bytes) || 0,
      mimeType: e.mime_type,
      uploadedById: e.uploaded_by_id,
      uploadedByName: e.uploaded_by_name,
      isVerified: e.is_verified,
      verifiedById: e.verified_by_id,
      verificationNotes: e.verification_notes,
      createdAt: e.created_at,
    })),
  };
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus, closureNotes?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, closureNotes }),
    });
    return res.ok;
  } catch (err) {
    console.error('updateComplaintStatus error:', err);
    return false;
  }
}

export async function assignComplaintInvestigator(id: string, investigatorId: string, investigatorName: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedInvestigatorId: investigatorId,
        assignedInvestigatorName: investigatorName,
        status: 'UNDER_INVESTIGATION'
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('assignComplaintInvestigator error:', err);
    return false;
  }
}

export async function addComplaintComment(id: string, comment: { authorName: string; authorRole: string; commentText: string }): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    return res.ok;
  } catch (err) {
    console.error('addComplaintComment error:', err);
    return false;
  }
}

// Fetch Evidence for specific complaint
export async function fetchComplaintEvidence(complaintId: string): Promise<ComplaintEvidence[]> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/evidence`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        return data.evidence;
      }
    }
  } catch (err) {
    console.warn('fetchComplaintEvidence api error:', err);
  }

  // Fallback to seed complaint evidence
  const seed = FALLBACK_SEED_COMPLAINTS.find(c => c.id === complaintId);
  return seed?.evidence || [];
}

// Upload Evidence file
export async function uploadComplaintEvidence(
  complaintId: string,
  payload: {
    evidenceType: EvidenceType;
    title: string;
    description?: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    uploadedByName: string;
    fileBase64?: string;
  }
): Promise<ComplaintEvidence | null> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.evidence || null;
    }
  } catch (err) {
    console.error('uploadComplaintEvidence error:', err);
  }
  return null;
}

// Verify Evidence Item
export async function verifyComplaintEvidence(
  complaintId: string,
  evidenceId: string,
  isVerified: boolean,
  notes?: string,
  verifiedByName?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/evidence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId,
        isVerified,
        verificationNotes: notes,
        verifiedByName: verifiedByName || 'Operations Manager',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('verifyComplaintEvidence error:', err);
    return false;
  }
}

// Fetch Investigation Record
export async function fetchInvestigationRecord(complaintId: string): Promise<InvestigationRecord | null> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/investigation`);
    if (res.ok) {
      const data = await res.json();
      if (data.investigation) return data.investigation;
    }
  } catch (err) {
    console.warn('fetchInvestigationRecord error:', err);
  }

  // Fallback mock investigation for first seed complaint
  if (complaintId === 'a1b2c3d4-0001-4000-8000-000000000001') {
    return {
      id: 'inv-101',
      complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
      investigatorId: 'emp-101',
      investigatorName: 'Govindan Nair (Ops Lead)',
      investigationStatus: 'IN_PROGRESS',
      customerStatement: 'Customer observed haze and circular swirl marks after floor scrubbing dried in master bedroom. States floor had high gloss prior to service.',
      supervisorStatement: 'Pre-service walkthrough was conducted. Balcony threshold had prior stains, but master bedroom floor had no documented circular abrasive swirls.',
      technicianStatements: 'Senior technician Pradeep used Taski R2 and single-disc machine. States standard white pad was requested, but buffer machine pad holder may have had trapped grit.',
      equipmentStatusCheck: 'Single disc machine #4 inspected. Driver disc rubber grip had debris particles embedded.',
      materialsUsedCheck: 'Taski R2 (Neutral cleaner) verified pH 7.2. Chemical is safe for marble; damage is mechanical abrasion, not acid burn.',
      arrivalDepartureVerification: 'Arrived 09:12 AM, departed 05:40 PM. Verified via GPS tracking.',
      rootCauseAnalysis: 'Mechanical abrasive friction from trapped grit on scrubbing disc holder caused micro-scratching on Italian marble surface layer.',
      rootCauseCategory: 'EQUIPMENT_MALFUNCTION',
      isPreExistingDamage: false,
      missingEvidenceFlags: [],
      findingsSummary: 'Physical damage confirmed caused during single-disc scrubbing due to grit accumulation on machine head. Diamond pad crystallization required to restore gloss.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

// Save or Update Investigation Record
export async function saveInvestigationRecord(
  complaintId: string,
  record: Partial<InvestigationRecord>
): Promise<InvestigationRecord | null> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/investigation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) {
      const data = await res.json();
      return data.investigation || null;
    }
  } catch (err) {
    console.error('saveInvestigationRecord error:', err);
  }
  return null;
}

// Add Crew Participant
export async function addComplaintParticipant(
  complaintId: string,
  participant: { employeeId: string; roleOnJob: string; statement?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
    return res.ok;
  } catch (err) {
    console.error('addComplaintParticipant error:', err);
    return false;
  }
}

// Update Participant Statement
export async function updateParticipantStatement(
  complaintId: string,
  participantId: string,
  statement: string,
  allegationStatus?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/participants`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, statement, allegationStatus }),
    });
    return res.ok;
  } catch (err) {
    console.error('updateParticipantStatement error:', err);
    return false;
  }
}

export function exportComplaintsToCSV(complaints: Complaint[]) {
  const headers = [
    'Complaint Number',
    'Date Reported',
    'Customer Name',
    'Customer Phone',
    'City',
    'Service Type',
    'Category',
    'Severity',
    'Status',
    'Job Value (INR)',
    'Investigator',
    'Title',
    'Pre-Checklist',
    'Post-Signoff',
    'Verified Loss (INR)',
  ];

  const rows = complaints.map(c => {
    const totalLoss = (c.costs || []).reduce((acc, cost) => acc + (cost.status === 'VERIFIED_INCURRED' ? cost.amount : 0), 0);
    return [
      `"${c.complaintNumber}"`,
      `"${new Date(c.reportingDate).toISOString().split('T')[0]}"`,
      `"${c.customerName.replace(/"/g, '""')}"`,
      `"${c.customerPhone}"`,
      `"${c.city}"`,
      `"${c.serviceType}"`,
      `"${c.category}"`,
      `"${c.severity}"`,
      `"${c.status}"`,
      c.jobValue,
      `"${(c.assignedInvestigatorName || '').replace(/"/g, '""')}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      c.preServiceChecklistDone ? 'YES' : 'NO',
      c.postServiceSignoffDone ? 'YES' : 'NO',
      totalLoss,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Handy_Squad_Complaints_Register_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
