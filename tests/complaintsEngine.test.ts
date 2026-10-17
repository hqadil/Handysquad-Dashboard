// tests/complaintsEngine.test.ts
// HANDY SQUAD: COMPREHENSIVE RESPONSIBILITY ENGINE, FINANCIAL GOVERNANCE & APPROVAL TESTS (PHASE 6)

import { 
  evaluateResponsibility, 
  determineRequiredApprovalAuthority 
} from '../src/lib/responsibilityEngine';
import { 
  Complaint, 
  InvestigationRecord, 
  ComplaintEvidence, 
  ComplaintParticipant,
  Employee 
} from '../src/types/complaints';

describe('Handy Squad Master Specification: Responsibility Engine Verification', () => {

  const mockTechnician: Employee = {
    id: 'emp-tech-1',
    employeeCode: 'HS-EMP-102',
    fullName: 'Pradeep Kumar K.',
    designation: 'SENIOR_TECHNICIAN',
    city: 'Kochi',
    primaryPhone: '+91 94471 22334',
    hireDate: '2023-03-20',
    status: 'ACTIVE',
    trainingStatus: 'UP_TO_DATE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseComplaint: Complaint = {
    id: 'test-cmp-01',
    complaintNumber: 'HS-CMP-TEST-001',
    reportingDate: new Date().toISOString(),
    reportedByName: 'Customer Care Desk',
    customerName: 'Anitha Rajan',
    customerPhone: '+91 98470 99887',
    customerAddress: 'Kakkanad, Kochi',
    city: 'Kochi',
    serviceType: 'DEEP_CLEANING',
    jobId: 'JOB-KC-9901',
    jobDate: '2026-10-15',
    jobValue: 12000,
    category: 'DAMAGE_ISSUE',
    severity: 'MAJOR',
    status: 'UNDER_INVESTIGATION',
    title: 'Acid burn marks on Italian marble flooring in master foyer',
    description: 'Customer claims chemical used for bathroom floor tile cleaning was placed on foyer marble, causing severe discoloration.',
    preServiceChecklistDone: true,
    postServiceSignoffDone: true,
    beforePhotosAvailable: true,
    afterPhotosAvailable: true,
    workOrderVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participants: [
      {
        id: 'part-1',
        complaintId: 'test-cmp-01',
        employeeId: 'emp-tech-1',
        employee: mockTechnician,
        roleOnJob: 'PRIMARY_TECHNICIAN',
        statement: 'Used diluted descaling chemical in master bath, may have placed container on marble threshold.',
        allegationStatus: 'SUBSTANTIATED',
        createdAt: new Date().toISOString(),
      }
    ],
    evidence: [
      {
        id: 'ev-1',
        complaintId: 'test-cmp-01',
        evidenceType: 'BEFORE_PHOTO',
        title: 'Pre-service Foyer Marble Photo',
        storagePath: 'complaints/test/before.jpg',
        fileName: 'before.jpg',
        fileSizeBytes: 204800,
        mimeType: 'image/jpeg',
        uploadedByName: 'Supervisor',
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ev-2',
        complaintId: 'test-cmp-01',
        evidenceType: 'AFTER_PHOTO',
        title: 'Post-service Etched Discoloration',
        storagePath: 'complaints/test/after.jpg',
        fileName: 'after.jpg',
        fileSizeBytes: 204800,
        mimeType: 'image/jpeg',
        uploadedByName: 'Supervisor',
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ev-3',
        complaintId: 'test-cmp-01',
        evidenceType: 'CHECKLIST',
        title: 'Signed Pre-service Inspection Checklist',
        storagePath: 'complaints/test/checklist.pdf',
        fileName: 'checklist.pdf',
        fileSizeBytes: 102400,
        mimeType: 'application/pdf',
        uploadedByName: 'Supervisor',
        isVerified: true,
        createdAt: new Date().toISOString(),
      }
    ],
    costs: [
      {
        id: 'cost-1',
        complaintId: 'test-cmp-01',
        costType: 'DAMAGE_REPAIR_VENDOR',
        description: 'Diamond crystallization and marble polishing vendor quote',
        amount: 8500,
        status: 'ESTIMATED',
        isCompanyAbsorption: true,
        proposedEmployeeShare: 0,
        approvedEmployeeShare: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  };

  test('Category 1: DAMAGE_ISSUE with substantiated chemical handling lapse', () => {
    const investigation: InvestigationRecord = {
      id: 'inv-1',
      complaintId: 'test-cmp-01',
      investigatorId: 'inv-lead-1',
      investigatorName: 'Faizal Rahman',
      investigationStatus: 'COMPLETED',
      rootCauseCategory: 'SOP_VIOLATION',
      isPreExistingDamage: false,
      missingEvidenceFlags: [],
      findingsSummary: 'Acidic chemical container placed directly on unmasked Italian marble without protective drip tray.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateResponsibility(baseComplaint, investigation);

    expect(result.assessmentStatus).toBe('RECOMMENDED');
    expect(result.primaryResponsibleParty).toBe('COMPANY');
    expect(result.companySharePct).toBe(100);
    expect(result.employeeSharePct).toBe(0);
  });

  test('Pre-Existing Damage Exoneration: Exonerates employee when pre-service checklist confirms pre-existing defect', () => {
    const preExistingInvestigation: InvestigationRecord = {
      id: 'inv-2',
      complaintId: 'test-cmp-01',
      investigatorId: 'inv-lead-1',
      investigatorName: 'Faizal Rahman',
      investigationStatus: 'COMPLETED',
      rootCauseCategory: 'PRE_EXISTING_DEFECT',
      isPreExistingDamage: true,
      missingEvidenceFlags: [],
      findingsSummary: 'Pre-service video shows yellow stain and chip mark on kitchen counter prior to crew arrival.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateResponsibility(baseComplaint, preExistingInvestigation);

    expect(result.primaryResponsibleParty).toBe('CUSTOMER');
    expect(result.employeeSharePct).toBe(0);
    expect(result.rationale).toContain('pre-existing');
  });

  test('Missing Mandatory Evidence: Returns INVESTIGATION_REQUIRED if required evidence is absent', () => {
    // Missing BEFORE_PHOTO and CHECKLIST for DAMAGE_ISSUE
    const strippedEvidence = baseComplaint.evidence!.filter(e => e.evidenceType === 'AFTER_PHOTO');
    const strippedComplaint = { ...baseComplaint, evidence: strippedEvidence };
    
    const investigation: InvestigationRecord = {
      id: 'inv-3',
      complaintId: 'test-cmp-01',
      investigatorId: 'inv-lead-1',
      investigatorName: 'Faizal Rahman',
      investigationStatus: 'IN_PROGRESS',
      isPreExistingDamage: false,
      missingEvidenceFlags: [],
      findingsSummary: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateResponsibility(strippedComplaint, investigation);

    expect(result.assessmentStatus).toBe('INVESTIGATION_REQUIRED');
    expect(result.missingEvidenceFlags.length).toBeGreaterThan(0);
  });

  test('Category 5: MACHINE_ISSUE allocates fault to COMPANY if maintenance record is missing', () => {
    const machineComplaint: Complaint = {
      ...baseComplaint,
      category: 'MACHINE_ISSUE',
      title: 'Scrubber motor tripped building circuit breaker and left dirty water ring',
      evidence: [],
    };

    const investigation: InvestigationRecord = {
      id: 'inv-4',
      complaintId: machineComplaint.id,
      investigatorId: 'inv-lead-1',
      investigatorName: 'Faizal Rahman',
      investigationStatus: 'COMPLETED',
      rootCauseCategory: 'EQUIPMENT_MALFUNCTION',
      isPreExistingDamage: false,
      missingEvidenceFlags: [],
      findingsSummary: 'Single disc machine carbon brush worn out; last periodic servicing was overdue by 45 days.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateResponsibility(machineComplaint, investigation);

    expect(result.primaryResponsibleParty).toBe('COMPANY');
    expect(result.companySharePct).toBe(100);
    expect(result.employeeSharePct).toBe(0);
  });

  test('Category 10: COMPANY_GOODWILL_DECISION allocates 100% absorption to Company with 0% staff penalty', () => {
    const goodwillComplaint: Complaint = {
      ...baseComplaint,
      category: 'COMPANY_GOODWILL_DECISION',
      title: 'High-value repeat client requested full complimentary recleaning of guest bedroom',
    };

    const investigation: InvestigationRecord = {
      id: 'inv-5',
      complaintId: goodwillComplaint.id,
      investigatorId: 'inv-lead-1',
      investigatorName: 'Faizal Rahman',
      investigationStatus: 'COMPLETED',
      rootCauseCategory: 'CUSTOMER_PREFERENCE',
      isPreExistingDamage: false,
      missingEvidenceFlags: [],
      findingsSummary: 'Service performed to standard; client has high aesthetic standards. Approved as VIP goodwill retention gesture.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateResponsibility(goodwillComplaint, investigation);

    expect(result.primaryResponsibleParty).toBe('COMPANY');
    expect(result.companySharePct).toBe(100);
    expect(result.employeeSharePct).toBe(0);
  });

  test('Section 8 Executive Approval Routing Tiers', () => {
    // Under ₹5,000 -> OPERATIONS_MANAGER
    expect(determineRequiredApprovalAuthority('MINOR', 2500)).toBe('OPERATIONS_MANAGER');
    expect(determineRequiredApprovalAuthority('MODERATE', 4900)).toBe('OPERATIONS_MANAGER');

    // ₹5,000 to ₹15,000 -> COO
    expect(determineRequiredApprovalAuthority('MODERATE', 5000)).toBe('COO');
    expect(determineRequiredApprovalAuthority('MAJOR', 12500)).toBe('COO');
    expect(determineRequiredApprovalAuthority('MAJOR', 15000)).toBe('COO');

    // Above ₹15,000 or CRITICAL severity -> MANAGEMENT_ADMIN
    expect(determineRequiredApprovalAuthority('MAJOR', 18000)).toBe('MANAGEMENT_ADMIN');
    expect(determineRequiredApprovalAuthority('CRITICAL', 3000)).toBe('MANAGEMENT_ADMIN');
  });

});
