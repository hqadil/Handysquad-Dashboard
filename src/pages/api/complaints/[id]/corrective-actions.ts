// src/pages/api/complaints/[id]/corrective-actions.ts
// HANDY SQUAD: CORRECTIVE ACTIONS & TRAINING REMEDIES API (PHASE 4)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch all corrective actions for this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('corrective_actions')
          .select('*, assigned_to_employee:employees(*)')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const actions = data.map((ca: any) => ({
            id: ca.id,
            complaintId: ca.complaint_id,
            actionType: ca.action_type,
            title: ca.title,
            description: ca.description,
            assignedToEmployeeId: ca.assigned_to_employee_id,
            assignedToEmployee: ca.assigned_to_employee ? {
              id: ca.assigned_to_employee.id,
              employeeCode: ca.assigned_to_employee.employee_code,
              fullName: ca.assigned_to_employee.full_name,
              designation: ca.assigned_to_employee.designation,
              city: ca.assigned_to_employee.city,
            } : undefined,
            dueDate: ca.due_date,
            status: ca.status,
            completionDate: ca.completion_date,
            verificationNotes: ca.verification_notes,
            verifiedById: ca.verified_by_id,
            createdAt: ca.created_at,
            updatedAt: ca.updated_at,
          }));

          return res.status(200).json({ correctiveActions: actions });
        }
      }

      return res.status(200).json({ correctiveActions: [] });
    } catch (err: any) {
      console.error('Corrective actions GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Create a new corrective action
  if (req.method === 'POST') {
    try {
      const {
        actionType,
        title,
        description,
        assignedToEmployeeId,
        dueDate,
      } = req.body;

      if (!actionType || !title || !dueDate) {
        return res.status(400).json({ error: 'actionType, title, and dueDate are mandatory' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('corrective_actions')
          .insert({
            complaint_id: id,
            action_type: actionType,
            title,
            description: description || '',
            assigned_to_employee_id: assignedToEmployeeId || null,
            due_date: dueDate,
            status: 'PENDING',
          })
          .select('*, assigned_to_employee:employees(*)')
          .single();

        if (error) {
          console.warn('Insert corrective action error:', error);
          return res.status(400).json({ error: error.message });
        }

        // If action type is TRAINING_ASSIGNMENT, also generate entry in training_records table
        if (actionType === 'TRAINING_ASSIGNMENT' && assignedToEmployeeId) {
          await supabase.from('training_records').insert({
            employee_id: assignedToEmployeeId,
            complaint_id: id,
            module_code: 'MOD-TECH-SOP-01',
            module_title: title,
            category: 'DELICATE_SURFACES',
            status: 'ASSIGNED',
            assigned_date: new Date().toISOString(),
          });
        }

        // Audit Log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: 'Operations Lead',
            action: 'CORRECTIVE_ACTION_CREATED',
            entity_name: 'corrective_actions',
            entity_id: data.id,
            after_state: { actionType, title, dueDate },
            notes: `Corrective action assigned: ${title} (${actionType})`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(201).json({ correctiveAction: data });
      }

      return res.status(201).json({
        correctiveAction: {
          id: `ca-${Date.now()}`,
          complaintId: id,
          actionType,
          title,
          description,
          assignedToEmployeeId,
          dueDate,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Corrective action POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Update status, completion, and verification notes
  if (req.method === 'PATCH') {
    try {
      const { actionId, status, completionDate, verificationNotes, verifiedByName } = req.body;

      if (!actionId || !status) {
        return res.status(400).json({ error: 'actionId and status are required' });
      }

      if (supabase) {
        const updatePayload: Record<string, any> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'COMPLETED' || status === 'VERIFIED_EFFECTIVE') {
          updatePayload.completion_date = completionDate || new Date().toISOString();
        }
        if (verificationNotes !== undefined) {
          updatePayload.verification_notes = verificationNotes;
        }

        const { data, error } = await supabase
          .from('corrective_actions')
          .update(updatePayload)
          .eq('id', actionId)
          .select('*, assigned_to_employee:employees(*)')
          .single();

        if (error) {
          console.warn('Update corrective action error:', error);
          return res.status(400).json({ error: error.message });
        }

        // Audit log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: verifiedByName || 'Operations Lead',
            action: 'CORRECTIVE_ACTION_UPDATED',
            entity_name: 'corrective_actions',
            entity_id: actionId,
            after_state: { status, verificationNotes },
            notes: `Corrective action status updated to ${status}. Verification: ${verificationNotes || 'None'}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(200).json({ correctiveAction: data });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Corrective action PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
