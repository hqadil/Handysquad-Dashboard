// src/pages/api/audit.ts
// HANDY SQUAD: IMMUTABLE AUDIT LOG & COMPLIANCE HISTORY API (PHASE 6)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export interface AuditRecord {
  id: string;
  complaintId?: string;
  actorId?: string;
  actorName: string;
  action: string;
  entityName: string;
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt: string;
}

// Fallback seed audit records for verification & demonstration
const FALLBACK_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'audit-001',
    complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
    actorName: 'Ashish Roy (Operations Desk)',
    action: 'COMPLAINT_REGISTERED',
    entityName: 'complaints',
    entityId: 'a1b2c3d4-0001-4000-8000-000000000001',
    afterState: { category: 'DAMAGE_ISSUE', severity: 'MAJOR', status: 'REGISTERED' },
    notes: 'Initial customer intake logged from Panampilly Nagar, Kochi.',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'audit-002',
    complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
    actorName: 'Operations Lead',
    action: 'INVESTIGATOR_ASSIGNED',
    entityName: 'complaints',
    entityId: 'a1b2c3d4-0001-4000-8000-000000000001',
    afterState: { investigatorName: 'Govindan Nair (Senior Supervisor)' },
    notes: 'Assigned senior supervisor for on-site damage assessment.',
    createdAt: new Date(Date.now() - 3 * 86400000 + 3600000).toISOString(),
  },
  {
    id: 'audit-003',
    complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
    actorName: 'Govindan Nair',
    action: 'EVIDENCE_UPLOADED',
    entityName: 'complaint_evidence',
    entityId: 'ev-1',
    afterState: { evidenceType: 'BEFORE_PHOTO', fileName: 'pre_service_cabinet.jpg' },
    notes: 'Pre-service walkthrough photograph uploaded to secure vault.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'audit-004',
    complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
    actorName: 'Harikrishnan Menon',
    action: 'RESPONSIBILITY_ASSESSED',
    entityName: 'responsibility_assessments',
    entityId: 'as-001',
    afterState: { party: 'EMPLOYEE_INDIVIDUAL', companyShare: 100, employeeShare: 0 },
    notes: 'Technician workmanship gap confirmed. 100% absorbed by Handy Squad under Section 8.',
    createdAt: new Date(Date.now() - 2 * 86400000 + 7200000).toISOString(),
  },
  {
    id: 'audit-005',
    complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
    actorName: 'Harikrishnan Menon (Operations Manager)',
    action: 'APPROVAL_DECISION_RECORDED',
    entityName: 'approval_records',
    entityId: 'app-seed-1',
    afterState: { decision: 'APPROVED', amountApproved: 4800 },
    notes: 'Approved ₹4,800 third-party carpentry vendor invoice for kitchen cabinet hinge replacement.',
    createdAt: new Date(Date.now() - 2 * 86400000 + 9000000).toISOString(),
  },
  {
    id: 'audit-006',
    complaintId: 'a1b2c3d4-0002-4000-8000-000000000002',
    actorName: 'Suresh Kurup (COO)',
    action: 'APPROVAL_DECISION_RECORDED',
    entityName: 'approval_records',
    entityId: 'app-seed-2',
    afterState: { decision: 'APPROVED', amountApproved: 2500 },
    notes: 'Executive sanction granted for free rework dispatch under Company Goodwill Policy.',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'audit-007',
    actorName: 'Govindan Nair (Master Trainer)',
    action: 'COACHING_MODULE_ASSIGNED',
    entityName: 'training_records',
    entityId: 'tr-seed-1',
    afterState: { employeeCode: 'HS-EMP-103', moduleCode: 'SOP-DEL-01' },
    notes: 'Assigned Natural Stone & Delicate Surfaces Care module to Anas Mohammed.',
    createdAt: new Date(Date.now() - 1 * 86400000 + 1800000).toISOString(),
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { complaintId, limit = 50 } = req.query;

  try {
    if (supabase) {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit) || 50);

      if (typeof complaintId === 'string' && complaintId) {
        query = query.eq('complaint_id', complaintId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const auditRecords: AuditRecord[] = data.map((a: any) => ({
          id: a.id,
          complaintId: a.complaint_id,
          actorId: a.actor_id,
          actorName: a.actor_name,
          action: a.action,
          entityName: a.entity_name,
          entityId: a.entity_id,
          beforeState: a.before_state,
          afterState: a.after_state,
          ipAddress: a.ip_address,
          notes: a.notes,
          createdAt: a.created_at,
        }));

        return res.status(200).json({ auditRecords });
      }
    }

    // Fallback records
    let logs = [...FALLBACK_AUDIT_LOGS];
    if (typeof complaintId === 'string' && complaintId) {
      logs = logs.filter(l => l.complaintId === complaintId);
    }

    return res.status(200).json({ auditRecords: logs });
  } catch (err: any) {
    console.error('Audit GET error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
