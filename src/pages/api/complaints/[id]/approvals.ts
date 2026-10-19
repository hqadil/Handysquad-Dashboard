// src/pages/api/complaints/[id]/approvals.ts
// HANDY SQUAD: MULTI-LEVEL EXECUTIVE APPROVALS API (PHASE 5)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

const FALLBACK_APPROVALS: Record<string, any[]> = {
  'a1b2c3d4-0001-4000-8000-000000000001': [
    {
      id: 'app-seed-1',
      complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
      approvalType: 'RESPONSIBILITY_ASSESSMENT',
      approverId: '00000000-0000-0000-0000-000000000001',
      approverName: 'Harikrishnan Menon',
      approverRole: 'OPERATIONS_MANAGER',
      decision: 'APPROVED',
      comments: 'Workmanship lapse verified on kitchen cabinet hinge. ₹4,800 third-party carpentry vendor approved for company absorption.',
      conditions: 'Conduct refresher coaching for technician Anas Mohammed on delicate furniture handling.',
      financialAmountApproved: 4800,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ],
  'a1b2c3d4-0002-4000-8000-000000000002': [
    {
      id: 'app-seed-2',
      complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
      approvalType: 'FINANCIAL_EXPOSURE',
      approverId: '00000000-0000-0000-0000-000000000002',
      approverName: 'Suresh Kurup',
      approverRole: 'COO',
      decision: 'APPROVED',
      comments: 'Free rework team dispatch approved under Company Goodwill Policy to protect client relationship.',
      conditions: 'Senior supervisor Jayan Varghese must accompany crew.',
      financialAmountApproved: 2500,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    }
  ]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch all approval records for this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('approval_records')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const approvals = data.map((a: any) => ({
            id: a.id,
            complaintId: a.complaint_id,
            assessmentId: a.assessment_id,
            approvalType: a.approval_type,
            approverId: a.approver_id,
            approverName: a.approver_name,
            approverRole: a.approver_role,
            decision: a.decision,
            comments: a.comments,
            conditions: a.conditions,
            financialAmountApproved: Number(a.financial_amount_approved) || 0,
            createdAt: a.created_at,
          }));

          return res.status(200).json({ approvals });
        }
      }

      return res.status(200).json({ approvals: FALLBACK_APPROVALS[id] || [] });
    } catch (err: any) {
      console.error('Approvals GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Record executive approval decision
  if (req.method === 'POST') {
    try {
      const {
        approvalType,
        assessmentId,
        approverName,
        approverRole,
        decision,
        comments,
        conditions,
        financialAmountApproved,
      } = req.body;

      if (!decision || !comments || !approverName) {
        return res.status(400).json({ error: 'decision, comments, and approverName are mandatory' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('approval_records')
          .insert({
            complaint_id: id,
            assessment_id: assessmentId || null,
            approval_type: approvalType || 'RESPONSIBILITY_ASSESSMENT',
            approver_id: '00000000-0000-0000-0000-000000000000',
            approver_name: approverName,
            approver_role: approverRole || 'OPERATIONS_MANAGER',
            decision,
            comments,
            conditions: conditions || null,
            financial_amount_approved: financialAmountApproved ? Number(financialAmountApproved) : null,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase approval_records insert warning (falling back gracefully):', error.message);
          return res.status(201).json({
            approval: {
              id: `appr-${Date.now()}`,
              complaintId: id,
              assessmentId,
              approvalType: approvalType || 'RESPONSIBILITY_ASSESSMENT',
              approverId: '00000000-0000-0000-0000-000000000000',
              approverName,
              approverRole: approverRole || 'OPERATIONS_MANAGER',
              decision,
              comments,
              conditions,
              financialAmountApproved: financialAmountApproved ? Number(financialAmountApproved) : null,
              createdAt: new Date().toISOString(),
            },
            warning: error.message,
          });
        }

        // Advance complaint lifecycle status based on decision
        let nextStatus: string | null = null;
        if (decision === 'APPROVED') {
          if (approvalType === 'COMPLAINT_CLOSURE') {
            nextStatus = 'CLOSED';
            await supabase.from('complaints').update({
              status: 'CLOSED',
              closed_at: new Date().toISOString(),
              closure_notes: comments,
            }).eq('id', id);
          } else {
            nextStatus = 'CORRECTIVE_ACTION_REQUIRED';
            await supabase.from('complaints').update({
              status: nextStatus,
              updated_at: new Date().toISOString(),
            }).eq('id', id);
          }
        } else if (decision === 'RETURNED_FOR_INVESTIGATION') {
          nextStatus = 'UNDER_INVESTIGATION';
          await supabase.from('complaints').update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        } else if (decision === 'REJECTED') {
          nextStatus = 'EVIDENCE_REVIEW';
          await supabase.from('complaints').update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        }

        // Immutable Audit Log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: approverName,
            action: 'APPROVAL_DECISION_RECORDED',
            entity_name: 'approval_records',
            entity_id: data.id,
            after_state: {
              decision,
              approverRole,
              financialAmountApproved,
              nextComplaintStatus: nextStatus,
            },
            notes: `Decision: ${decision} by ${approverName} (${approverRole}). Comments: ${comments}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(201).json({ approval: data, nextStatus });
      }

      return res.status(201).json({
        approval: {
          id: `app-${Date.now()}`,
          complaintId: id,
          approvalType: approvalType || 'RESPONSIBILITY_ASSESSMENT',
          approverName,
          approverRole: approverRole || 'OPERATIONS_MANAGER',
          decision,
          comments,
          conditions,
          financialAmountApproved: Number(financialAmountApproved) || 0,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Approvals POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
