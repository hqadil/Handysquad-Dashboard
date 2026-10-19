// src/pages/api/complaints/[id]/costs.ts
// HANDY SQUAD: FINANCIAL COST LEDGER & EXPENSE API (PHASE 5)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

import { FALLBACK_SEED_COMPLAINTS } from '../../../../lib/complaintsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch granular cost records for this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('cost_records')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const costs = data.map((c: any) => ({
            id: c.id,
            complaintId: c.complaint_id,
            costType: c.cost_type,
            description: c.description,
            amount: Number(c.amount) || 0,
            status: c.status,
            vendorName: c.vendor_name,
            invoiceReceiptRef: c.invoice_receipt_ref,
            verifiedById: c.verified_by_id,
            verifiedAt: c.verified_at,
            isCompanyAbsorption: c.is_company_absorption,
            proposedEmployeeShare: Number(c.proposed_employee_share) || 0,
            approvedEmployeeShare: Number(c.approved_employee_share) || 0,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));

          return res.status(200).json({ costs });
        }
      }

      const seedComplaint = FALLBACK_SEED_COMPLAINTS.find(c => c.id === id);
      return res.status(200).json({ costs: seedComplaint?.costs || [] });
    } catch (err: any) {
      console.error('Costs GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Add new cost item or estimate to complaint ledger
  if (req.method === 'POST') {
    try {
      const {
        costType,
        description,
        amount,
        status,
        vendorName,
        invoiceReceiptRef,
        isCompanyAbsorption,
        proposedEmployeeShare,
        recordedByName,
      } = req.body;

      if (!costType || !description || amount === undefined || amount === null) {
        return res.status(400).json({ error: 'costType, description, and amount are mandatory' });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('cost_records')
          .insert({
            complaint_id: id,
            cost_type: costType,
            description,
            amount: numAmount,
            status: status || 'ESTIMATED',
            vendor_name: vendorName || null,
            invoice_receipt_ref: invoiceReceiptRef || null,
            is_company_absorption: isCompanyAbsorption ?? true,
            proposed_employee_share: Number(proposedEmployeeShare) || 0,
            approved_employee_share: 0,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase cost_records insert warning (falling back gracefully):', error.message);
          return res.status(201).json({
            cost: {
              id: `cost-${Date.now()}`,
              complaintId: id,
              costType,
              description,
              amount: numAmount,
              status: status || 'ESTIMATED',
              vendorName: vendorName || null,
              invoiceReceiptRef: invoiceReceiptRef || null,
              isCompanyAbsorption: isCompanyAbsorption ?? true,
              proposedEmployeeShare: Number(proposedEmployeeShare) || 0,
              approvedEmployeeShare: 0,
              createdAt: new Date().toISOString(),
            },
            warning: error.message,
          });
        }

        // Audit Log (silent attempt)
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: recordedByName || 'Finance Team',
            action: 'COST_RECORDED',
            entity_name: 'cost_records',
            entity_id: data?.id || id,
            after_state: { costType, amount: numAmount, status },
            notes: `Expense item booked: ${costType} - ₹${numAmount} (${description})`,
          });
        } catch (auditErr) {
          // ignore audit logging error on server
        }

        return res.status(201).json({ cost: data });
      }

      return res.status(201).json({
        cost: {
          id: `cost-${Date.now()}`,
          complaintId: id,
          costType,
          description,
          amount: numAmount,
          status: status || 'ESTIMATED',
          vendorName,
          invoiceReceiptRef,
          isCompanyAbsorption: isCompanyAbsorption ?? true,
          proposedEmployeeShare: Number(proposedEmployeeShare) || 0,
          approvedEmployeeShare: 0,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Costs POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Verify expense or confirm financial settlement
  if (req.method === 'PATCH') {
    try {
      const { costId, status, approvedEmployeeShare, verifiedByName } = req.body;

      if (!costId || !status) {
        return res.status(400).json({ error: 'costId and status are required' });
      }

      if (supabase) {
        const updateData: Record<string, any> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'VERIFIED_INCURRED') {
          updateData.verified_at = new Date().toISOString();
        }
        if (approvedEmployeeShare !== undefined) {
          updateData.approved_employee_share = Number(approvedEmployeeShare);
        }

        const { data, error } = await supabase
          .from('cost_records')
          .update(updateData)
          .eq('id', costId)
          .select()
          .single();

        if (error) {
          console.warn('Update cost record error:', error);
          return res.status(400).json({ error: error.message });
        }

        // Audit Log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: verifiedByName || 'Operations Manager',
            action: 'COST_VERIFIED',
            entity_name: 'cost_records',
            entity_id: costId,
            after_state: { status, approvedEmployeeShare },
            notes: `Cost verified: ₹${data.amount} marked as ${status}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(200).json({ cost: data });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Costs PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
