// src/pages/api/complaints/[id]/investigation.ts
// HANDY SQUAD: INVESTIGATION RECORD & ROOT CAUSE ANALYSIS API

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch investigation record for this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('investigation_records')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Supabase fetch investigation error:', error);
        } else if (data) {
          return res.status(200).json({
            investigation: {
              id: data.id,
              complaintId: data.complaint_id,
              investigatorId: data.investigator_id,
              investigatorName: data.investigator_name,
              investigationStatus: data.investigation_status,
              customerStatement: data.customer_statement,
              supervisorStatement: data.supervisor_statement,
              technicianStatements: data.technician_statements,
              equipmentStatusCheck: data.equipment_status_check,
              materialsUsedCheck: data.materials_used_check,
              arrivalDepartureVerification: data.arrival_departure_verification,
              rootCauseAnalysis: data.root_cause_analysis,
              rootCauseCategory: data.root_cause_category,
              isPreExistingDamage: data.is_pre_existing_damage,
              missingEvidenceFlags: data.missing_evidence_flags || [],
              findingsSummary: data.findings_summary,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
          });
        }
      }

      return res.status(200).json({ investigation: null });
    } catch (err: any) {
      console.error('Investigation GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST / PUT: Create or update investigation record
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const {
        investigatorId,
        investigatorName,
        investigationStatus,
        customerStatement,
        supervisorStatement,
        technicianStatements,
        equipmentStatusCheck,
        materialsUsedCheck,
        arrivalDepartureVerification,
        rootCauseAnalysis,
        rootCauseCategory,
        isPreExistingDamage,
        missingEvidenceFlags,
        findingsSummary,
      } = req.body;

      if (!findingsSummary || !investigatorName) {
        return res.status(400).json({ error: 'investigatorName and findingsSummary are mandatory' });
      }

      if (supabase) {
        // Check if an investigation record already exists
        const { data: existing } = await supabase
          .from('investigation_records')
          .select('id')
          .eq('complaint_id', id)
          .limit(1)
          .single();

        let recordResult = null;

        const payload = {
          complaint_id: id,
          investigator_id: investigatorId || '00000000-0000-0000-0000-000000000000',
          investigator_name: investigatorName,
          investigation_status: investigationStatus || 'IN_PROGRESS',
          customer_statement: customerStatement || null,
          supervisor_statement: supervisorStatement || null,
          technician_statements: technicianStatements || null,
          equipment_status_check: equipmentStatusCheck || null,
          materials_used_check: materialsUsedCheck || null,
          arrival_departure_verification: arrivalDepartureVerification || null,
          root_cause_analysis: rootCauseAnalysis || null,
          root_cause_category: rootCauseCategory || null,
          is_pre_existing_damage: Boolean(isPreExistingDamage),
          missing_evidence_flags: missingEvidenceFlags || [],
          findings_summary: findingsSummary,
          updated_at: new Date().toISOString(),
        };

        if (existing && existing.id) {
          const { data, error } = await supabase
            .from('investigation_records')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) console.warn('Update investigation record error:', error);
          recordResult = data;
        } else {
          const { data, error } = await supabase
            .from('investigation_records')
            .insert(payload)
            .select()
            .single();

          if (error) console.warn('Insert investigation record error:', error);
          recordResult = data;
        }

        // Advance complaint status according to investigation outcome
        let nextComplaintStatus: string | null = null;
        if (investigationStatus === 'COMPLETED') {
          nextComplaintStatus = 'ASSESSMENT_COMPLETED';
        } else if (investigationStatus === 'EVIDENCE_INSUFFICIENT') {
          nextComplaintStatus = 'EVIDENCE_REVIEW';
        } else if (investigationStatus === 'IN_PROGRESS') {
          nextComplaintStatus = 'UNDER_INVESTIGATION';
        }

        if (nextComplaintStatus) {
          await supabase
            .from('complaints')
            .update({
              status: nextComplaintStatus,
              assigned_investigator_name: investigatorName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        }

        // Append to audit log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: investigatorName,
            action: 'INVESTIGATION_UPDATED',
            entity_name: 'investigation_records',
            entity_id: recordResult ? recordResult.id : null,
            after_state: {
              investigationStatus,
              rootCauseCategory,
              isPreExistingDamage,
              findingsSummary,
            },
            notes: `Investigation updated by ${investigatorName}. Status: ${investigationStatus}, Root cause: ${rootCauseCategory || 'Pending'}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(200).json({
          investigation: recordResult || payload,
        });
      }

      // Fallback synthetic response
      return res.status(200).json({
        investigation: {
          id: `inv-${Date.now()}`,
          complaintId: id,
          investigatorName,
          investigationStatus: investigationStatus || 'IN_PROGRESS',
          customerStatement,
          supervisorStatement,
          technicianStatements,
          equipmentStatusCheck,
          materialsUsedCheck,
          arrivalDepartureVerification,
          rootCauseAnalysis,
          rootCauseCategory,
          isPreExistingDamage: Boolean(isPreExistingDamage),
          missingEvidenceFlags: missingEvidenceFlags || [],
          findingsSummary,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Investigation POST/PUT error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
