// src/pages/api/complaints/[id]/assessment.ts
// HANDY SQUAD: RESPONSIBILITY ASSESSMENT API (PHASE 4)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';
import { fetchComplaintById, fetchInvestigationRecord } from '../../../../lib/complaintsService';
import { evaluateResponsibility } from '../../../../lib/responsibilityEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch assessments history for this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('responsibility_assessments')
          .select('*, responsible_employee:employees(*)')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const assessments = data.map((a: any) => ({
            id: a.id,
            complaintId: a.complaint_id,
            ruleVersionId: a.rule_version_id,
            assessmentNumber: a.assessment_number,
            isLatest: a.is_latest,
            assessedById: a.assessed_by_id,
            assessedByName: a.assessed_by_name,
            assessmentStatus: a.assessment_status,
            primaryResponsibleParty: a.primary_responsible_party,
            companySharePct: Number(a.company_share_pct) || 0,
            employeeSharePct: Number(a.employee_share_pct) || 0,
            responsibleEmployeeId: a.responsible_employee_id,
            responsibleEmployee: a.responsible_employee ? {
              id: a.responsible_employee.id,
              employeeCode: a.responsible_employee.employee_code,
              fullName: a.responsible_employee.full_name,
              designation: a.responsible_employee.designation,
              city: a.responsible_employee.city,
            } : undefined,
            rationale: a.rationale,
            evidenceReviewedSummary: a.evidence_reviewed_summary,
            conflictingEvidenceNotes: a.conflicting_evidence_notes,
            recommendedCorrectiveAction: a.recommended_corrective_action,
            requiredApprovalAuthority: a.required_approval_authority,
            createdAt: a.created_at,
          }));

          return res.status(200).json({ assessments });
        }
      }

      return res.status(200).json({ assessments: [] });
    } catch (err: any) {
      console.error('Assessment GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Evaluate or Confirm Assessment
  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      // 1. Action: Evaluate (runs automated rule engine without persisting)
      if (action === 'evaluate') {
        const [complaint, investigation] = await Promise.all([
          fetchComplaintById(id),
          fetchInvestigationRecord(id),
        ]);

        if (!complaint) {
          return res.status(404).json({ error: 'Complaint ticket not found' });
        }

        const evaluation = evaluateResponsibility(complaint, investigation);
        return res.status(200).json({ evaluation });
      }

      // 2. Action: Confirm & Record Assessment
      const {
        assessedByName,
        assessmentStatus,
        primaryResponsibleParty,
        companySharePct,
        employeeSharePct,
        responsibleEmployeeId,
        rationale,
        evidenceReviewedSummary,
        conflictingEvidenceNotes,
        recommendedCorrectiveAction,
        recommendedCorrectiveActionType,
        requiredApprovalAuthority,
      } = req.body;

      if (!primaryResponsibleParty || !rationale) {
        return res.status(400).json({ error: 'primaryResponsibleParty and rationale are required' });
      }

      if (supabase) {
        // Mark previous assessments as not latest
        await supabase
          .from('responsibility_assessments')
          .update({ is_latest: false })
          .eq('complaint_id', id);

        // Insert new assessment determination
        const { data: newAssessment, error: insertError } = await supabase
          .from('responsibility_assessments')
          .insert({
            complaint_id: id,
            assessment_number: 1,
            is_latest: true,
            assessed_by_name: assessedByName || 'Operations Lead',
            assessment_status: assessmentStatus || 'RECOMMENDED',
            primary_responsible_party: primaryResponsibleParty,
            company_share_pct: companySharePct ?? 100,
            employee_share_pct: employeeSharePct ?? 0,
            responsible_employee_id: responsibleEmployeeId || null,
            rationale,
            evidence_reviewed_summary: evidenceReviewedSummary || 'Comprehensive evidence review',
            conflicting_evidence_notes: conflictingEvidenceNotes || null,
            recommended_corrective_action: recommendedCorrectiveAction,
            required_approval_authority: requiredApprovalAuthority || 'OPERATIONS_MANAGER',
          })
          .select('*, responsible_employee:employees(*)')
          .single();

        if (insertError) {
          console.warn('Supabase assessment insert failed:', insertError);
        }

        // Advance complaint status to APPROVAL_PENDING
        await supabase
          .from('complaints')
          .update({
            status: 'APPROVAL_PENDING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        // Automatically spawn recommended corrective action item if specified
        if (recommendedCorrectiveAction) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 5); // 5-day SLA
          await supabase.from('corrective_actions').insert({
            complaint_id: id,
            action_type: recommendedCorrectiveActionType || 'SOP_PROCESS_UPDATE',
            title: `Remedy: ${recommendedCorrectiveAction.substring(0, 50)}...`,
            description: recommendedCorrectiveAction,
            assigned_to_employee_id: responsibleEmployeeId || null,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'PENDING',
          });
        }

        // Immutable Audit Log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: assessedByName || 'Operations Lead',
            action: 'RESPONSIBILITY_ASSESSED',
            entity_name: 'responsibility_assessments',
            entity_id: newAssessment ? newAssessment.id : null,
            after_state: {
              primaryResponsibleParty,
              companySharePct,
              employeeSharePct,
              requiredApprovalAuthority,
              status: assessmentStatus || 'RECOMMENDED',
            },
            notes: `Responsibility assessed: ${primaryResponsibleParty}. Company Share: ${companySharePct}%, Employee Share: ${employeeSharePct}%. Submitted for ${requiredApprovalAuthority} approval.`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(201).json({ assessment: newAssessment });
      }

      // Fallback synthetic response
      const syntheticAssessment = {
        id: `as-${Date.now()}`,
        complaintId: id,
        assessmentNumber: 1,
        isLatest: true,
        assessedByName: assessedByName || 'Operations Lead',
        assessmentStatus: assessmentStatus || 'RECOMMENDED',
        primaryResponsibleParty,
        companySharePct: companySharePct ?? 100,
        employeeSharePct: employeeSharePct ?? 0,
        responsibleEmployeeId,
        rationale,
        evidenceReviewedSummary: evidenceReviewedSummary || '',
        conflictingEvidenceNotes,
        recommendedCorrectiveAction,
        requiredApprovalAuthority: requiredApprovalAuthority || 'OPERATIONS_MANAGER',
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({ assessment: syntheticAssessment });
    } catch (err: any) {
      console.error('Assessment POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
