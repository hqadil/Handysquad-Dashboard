// src/lib/responsibilityEngine.ts
// HANDY SQUAD: RESPONSIBILITY ENGINE & EVALUATION SERVICE (SECTION 7 SPECIFICATION)

import { 
  Complaint, 
  InvestigationRecord, 
  ResponsibleParty, 
  AssessmentStatus, 
  CorrectiveActionType,
  ComplaintCategory,
  EvidenceType
} from '../types/complaints';
import { CATEGORY_EVIDENCE_RULES } from './complaintsService';

export interface ResponsibilityEvaluationResult {
  assessmentStatus: AssessmentStatus;
  primaryResponsibleParty: ResponsibleParty;
  companySharePct: number;
  employeeSharePct: number;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  rationale: string;
  evidenceReviewedSummary: string;
  missingEvidenceFlags: string[];
  conflictingEvidenceNotes?: string;
  potentialRootCause: string;
  recommendedCorrectiveAction: string;
  recommendedCorrectiveActionType: CorrectiveActionType;
  requiredApprovalAuthority: 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN';
  ruleVersion: number;
}

/**
 * Server-side Complaint Responsibility Evaluation Engine
 * Evaluates facts, SOP compliance, evidence sufficiency, and root causes without presuming employee negligence.
 */
export function evaluateResponsibility(
  complaint: Complaint,
  investigation?: InvestigationRecord | null
): ResponsibilityEvaluationResult {
  const categoryRule = CATEGORY_EVIDENCE_RULES[complaint.category];
  const uploadedEvidence = complaint.evidence || [];
  const uploadedTypes = new Set(uploadedEvidence.map(e => e.evidenceType));
  const participants = complaint.participants || [];

  // 1. Evidence Completeness Audit
  const missingMandatoryEvidence: EvidenceType[] = [];
  if (categoryRule) {
    categoryRule.mandatory.forEach(req => {
      if (!uploadedTypes.has(req)) {
        missingMandatoryEvidence.push(req);
      }
    });
  }

  // Calculate total verified financial exposure
  const totalVerifiedCost = (complaint.costs || []).reduce((sum, c) => {
    return c.status === 'VERIFIED_INCURRED' ? sum + c.amount : sum;
  }, 0);

  const totalEstimatedCost = (complaint.costs || []).reduce((sum, c) => {
    return c.status === 'ESTIMATED' ? sum + c.amount : sum;
  }, 0);

  const totalExposure = Math.max(totalVerifiedCost, totalEstimatedCost, complaint.jobValue * 0.5);

  // Determine Approval Authority based on financial exposure & category severity
  let requiredApprovalAuthority: 'OPERATIONS_MANAGER' | 'COO' | 'MANAGEMENT_ADMIN' = 'OPERATIONS_MANAGER';
  if (complaint.severity === 'CRITICAL' || totalExposure > 15000) {
    requiredApprovalAuthority = 'MANAGEMENT_ADMIN';
  } else if (complaint.severity === 'MAJOR' || totalExposure > 5000) {
    requiredApprovalAuthority = 'COO';
  }

  // Summary of Evidence Reviewed
  const evidenceReviewedSummary = [
    `Category: ${complaint.category}`,
    `Total Evidence Records: ${uploadedEvidence.length}`,
    `Pre-Service Checklist: ${complaint.preServiceChecklistDone ? 'Completed' : 'Missing'}`,
    `Post-Service Signoff: ${complaint.postServiceSignoffDone ? 'Signed' : 'Unsigned'}`,
    `Before Photos: ${complaint.beforePhotosAvailable ? 'Available' : 'Missing'}`,
    `After Photos: ${complaint.afterPhotosAvailable ? 'Available' : 'Missing'}`,
    `Work Order Verified: ${complaint.workOrderVerified ? 'Confirmed' : 'Pending'}`,
  ].join(' | ');

  const missingEvidenceFlags = missingMandatoryEvidence.map(m => `MISSING_${m}`);

  // 2. CHECK RULE: Missing Mandatory Evidence Check (Pre-requisite for liability)
  // Per Specification Section 6 & 7: Missing evidence should trigger warnings & further investigation,
  // it must not automatically prove employee negligence.
  if (missingMandatoryEvidence.length > 0 && !investigation?.findingsSummary) {
    return {
      assessmentStatus: 'INVESTIGATION_REQUIRED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: `Mandatory evidence [${missingMandatoryEvidence.join(', ')}] is missing for ${complaint.category}. Under Handy Squad standard procedure, liability cannot be established without objective pre-service documentation. Physical inspection and investigator statements are required before determining responsibility.`,
      evidenceReviewedSummary,
      missingEvidenceFlags,
      conflictingEvidenceNotes: 'No pre-service photographic or signed baseline available to corroborate origin of defect.',
      potentialRootCause: 'Documentation Gap / Unverified Job State',
      recommendedCorrectiveAction: 'Dispatch Operations Lead to re-inspect client property and retrieve dispatch records.',
      recommendedCorrectiveActionType: 'DOCUMENTATION_POLICY_MANDATE',
      requiredApprovalAuthority,
      ruleVersion: 1,
    };
  }

  // 3. CHECK RULE: Pre-Existing Damage Exoneration
  if (investigation?.isPreExistingDamage) {
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'CUSTOMER',
      companySharePct: 0,
      employeeSharePct: 0,
      rationale: 'Physical investigation and pre-service inspection confirmed the defect was pre-existing and existed prior to crew arrival. The cleaning service did not induce or aggravate the condition. Service crew is fully exonerated.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      conflictingEvidenceNotes: undefined,
      potentialRootCause: 'Pre-existing surface defect / environmental wear',
      recommendedCorrectiveAction: 'Issue polite technical advisory letter to customer detailing surface age, material fragility, and manufacturer recommendations.',
      recommendedCorrectiveActionType: 'APOLOGY_CALL_VISIT',
      requiredApprovalAuthority: 'OPERATIONS_MANAGER',
      ruleVersion: 1,
    };
  }

  // 4. CHECK RULE: Equipment Malfunction / Machine Debris Failure
  if (investigation?.rootCauseCategory === 'EQUIPMENT_MALFUNCTION' || complaint.category === 'MACHINE_ISSUE') {
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: 'Failure was caused by mechanical breakdown or equipment defect (e.g. driver disc rubber grit or motor failure) rather than intentional technician misconduct. Handy Squad absorbs 100% of rectification costs as company operational overhead.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Machinery wear and tear / preventative maintenance deficit',
      recommendedCorrectiveAction: 'Send machine to authorized service center for complete overhaul and audit warehouse equipment maintenance logs.',
      recommendedCorrectiveActionType: 'EQUIPMENT_OVERHAUL',
      requiredApprovalAuthority,
      ruleVersion: 1,
    };
  }

  // 5. CHECK RULE: Scope Confusion / Customer Booking Misunderstanding
  if (complaint.category === 'SCOPE_CONFUSION' || investigation?.rootCauseCategory === 'CUSTOMER_MISUNDERSTANDING' || investigation?.rootCauseCategory === 'SCOPE_NOT_IN_WORK_ORDER') {
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'NO_FAULT_GOODWILL',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: 'Discrepancy originated from booking expectation misalignment rather than technician omission. The work order did not specify the disputed area. Handy Squad provides courtesy goodwill resolution without attribution of fault.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Pre-service booking description ambiguity',
      recommendedCorrectiveAction: 'Update booking portal description to explicitly delineate standard vs addon service inclusions.',
      recommendedCorrectiveActionType: 'SOP_PROCESS_UPDATE',
      requiredApprovalAuthority,
      ruleVersion: 1,
    };
  }

  // 6. CHECK RULE: Logistical & Traffic Delays
  if (complaint.category === 'LATE_START' || investigation?.rootCauseCategory === 'LOGISTICAL_TRAFFIC_DELAY') {
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: 'Delay occurred due to transit disruption, vehicle breakdown, or road logistics. Dispatch and customer compensation vouchers are absorbed by company operations.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Transit bottleneck / vehicular emergency',
      recommendedCorrectiveAction: 'Issue courtesy discount coupon to customer and adjust dispatch departure buffer by 30 minutes for the sector.',
      recommendedCorrectiveActionType: 'APOLOGY_CALL_VISIT',
      requiredApprovalAuthority: 'OPERATIONS_MANAGER',
      ruleVersion: 1,
    };
  }

  // 7. CHECK RULE: Missed Scope Areas (Requires Free Rework)
  if (complaint.category === 'SCOPE_MISSED') {
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: 'Identified areas were included in the confirmed booking but omitted during final walkthrough. Company schedules prompt rework pass at no charge to customer.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Checklist walkthrough omission during job completion',
      recommendedCorrectiveAction: 'Schedule free senior technician rework pass to complete omitted areas and verify customer signoff.',
      recommendedCorrectiveActionType: 'REWORK_SERVICE',
      requiredApprovalAuthority: 'OPERATIONS_MANAGER',
      ruleVersion: 1,
    };
  }

  // 8. CHECK RULE: Workmanship & Skill Gap
  if (complaint.category === 'SKILL_ISSUE' || investigation?.rootCauseCategory === 'INDIVIDUAL_SKILL_GAP') {
    const namedTech = participants.find(p => p.roleOnJob === 'PRIMARY_TECHNICIAN');
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      responsibleEmployeeId: namedTech?.employeeId,
      responsibleEmployeeName: namedTech?.employee?.fullName,
      rationale: 'Technician demonstrated technical execution deficit in delicate extraction/polishing. Per Handy Squad coaching policy, skill gaps trigger targeted training modules rather than monetary penalties.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Technique gap in specialized fabric extraction / machine handling',
      recommendedCorrectiveAction: 'Assign 4-hour specialized refresher coaching module and pair technician with senior lead on next 5 jobs.',
      recommendedCorrectiveActionType: 'TRAINING_ASSIGNMENT',
      requiredApprovalAuthority,
      ruleVersion: 1,
    };
  }

  // 9. CHECK RULE: Property Damage with Verified Negligence vs Standard Company Absorption
  if (complaint.category === 'DAMAGE_ISSUE') {
    // If chemical misapplication occurred contrary to explicit label
    if (investigation?.rootCauseCategory === 'CHEMICAL_MISAPPLICATION') {
      const namedTech = participants.find(p => p.roleOnJob === 'PRIMARY_TECHNICIAN');
      return {
        assessmentStatus: 'PROVISIONAL',
        primaryResponsibleParty: 'COMPANY',
        companySharePct: 100,
        employeeSharePct: 0,
        responsibleEmployeeId: namedTech?.employeeId,
        responsibleEmployeeName: namedTech?.employee?.fullName,
        rationale: 'Incorrect chemical concentration or acidic agent was utilized on sensitive surface. In accordance with Section 8 legal guidelines, company absorbs initial restoration cost while mandatory chemical safety retraining is enforced.',
        evidenceReviewedSummary,
        missingEvidenceFlags,
        potentialRootCause: 'Chemical dilution error / improper bottle labelling',
        recommendedCorrectiveAction: 'Enroll technician in mandatory Chemical Safety & Surface Compatibility Certification.',
        recommendedCorrectiveActionType: 'TRAINING_ASSIGNMENT',
        requiredApprovalAuthority: 'COO',
        ruleVersion: 1,
      };
    }

    // Default Surface Damage: Trapped grit / mechanical friction
    return {
      assessmentStatus: 'RECOMMENDED',
      primaryResponsibleParty: 'COMPANY',
      companySharePct: 100,
      employeeSharePct: 0,
      rationale: 'Surface damage confirmed during scrubbing operations. Trapped abrasive particles on machine pad created swirl marks. Company absorbs restoration cost via approved restoration vendor.',
      evidenceReviewedSummary,
      missingEvidenceFlags,
      potentialRootCause: 'Abrasive grit friction under buffer pad',
      recommendedCorrectiveAction: 'Authorize third-party specialized marble crystallizer contractor to restore floor gloss.',
      recommendedCorrectiveActionType: 'REWORK_SERVICE',
      requiredApprovalAuthority: 'COO',
      ruleVersion: 1,
    };
  }

  // 10. Default Fallback Evaluation (Goodwill absorption)
  return {
    assessmentStatus: 'PROVISIONAL',
    primaryResponsibleParty: 'COMPANY',
    companySharePct: 100,
    employeeSharePct: 0,
    rationale: 'Case evaluated under general company operational policy. Resolution prioritized to maintain customer goodwill and brand reputation in Kerala territory.',
    evidenceReviewedSummary,
    missingEvidenceFlags,
    potentialRootCause: complaint.description.substring(0, 80),
    recommendedCorrectiveAction: 'Follow up with customer to confirm resolution satisfaction.',
    recommendedCorrectiveActionType: 'APOLOGY_CALL_VISIT',
    requiredApprovalAuthority,
    ruleVersion: 1,
  };
}
