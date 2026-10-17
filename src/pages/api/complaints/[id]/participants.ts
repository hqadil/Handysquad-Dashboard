// src/pages/api/complaints/[id]/participants.ts
// HANDY SQUAD: COMPLAINT PARTICIPANTS & CREW STATEMENTS API

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch all crew participants linked to this complaint
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('complaint_participants')
          .select('*, employee:employees(*)')
          .eq('complaint_id', id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return res.status(200).json({ participants: data });
        }
      }
      return res.status(200).json({ participants: [] });
    } catch (err: any) {
      console.error('Participants GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Assign crew member to complaint
  if (req.method === 'POST') {
    try {
      const { employeeId, roleOnJob, statement, allegationStatus } = req.body;

      if (!employeeId || !roleOnJob) {
        return res.status(400).json({ error: 'employeeId and roleOnJob are mandatory' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('complaint_participants')
          .insert({
            complaint_id: id,
            employee_id: employeeId,
            role_on_job: roleOnJob,
            statement: statement || null,
            allegation_status: allegationStatus || 'PARTICIPANT',
            interviewed_at: statement ? new Date().toISOString() : null,
          })
          .select('*, employee:employees(*)')
          .single();

        if (error) {
          console.warn('Supabase insert participant failed:', error);
          return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({ participant: data });
      }

      return res.status(201).json({
        participant: {
          id: `cp-${Date.now()}`,
          complaintId: id,
          employeeId,
          roleOnJob,
          statement,
          allegationStatus: allegationStatus || 'PARTICIPANT',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Participants POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Update participant statement or allegation status (Exonerated / Substantiated / Named)
  if (req.method === 'PATCH') {
    try {
      const { participantId, statement, allegationStatus, interviewerName } = req.body;

      if (!participantId) {
        return res.status(400).json({ error: 'participantId is mandatory' });
      }

      if (supabase) {
        const updateData: Record<string, any> = {};
        if (statement !== undefined) {
          updateData.statement = statement;
          updateData.interviewed_at = new Date().toISOString();
        }
        if (allegationStatus !== undefined) {
          updateData.allegation_status = allegationStatus;
        }

        const { data, error } = await supabase
          .from('complaint_participants')
          .update(updateData)
          .eq('id', participantId)
          .select('*, employee:employees(*)')
          .single();

        if (error) {
          console.warn('Update participant error:', error);
        }

        // Audit log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: interviewerName || 'Investigator',
            action: 'CREW_STATEMENT_RECORDED',
            entity_name: 'complaint_participants',
            entity_id: participantId,
            notes: `Participant statement updated. Allegation status: ${allegationStatus || 'Unchanged'}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(200).json({ success: true, participant: data });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Participants PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
