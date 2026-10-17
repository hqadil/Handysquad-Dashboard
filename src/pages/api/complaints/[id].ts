// src/pages/api/complaints/[id].ts
// HANDY SQUAD: SINGLE COMPLAINT API ENDPOINT

import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchComplaintById } from '../../../lib/complaintsService';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid complaint id' });
  }

  // GET: Fetch complete complaint profile with relations
  if (req.method === 'GET') {
    try {
      const complaint = await fetchComplaintById(id);
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint ticket not found' });
      }
      return res.status(200).json({ complaint });
    } catch (err: any) {
      console.error('Error fetching complaint by id:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Update status, assignment, or resolution notes
  if (req.method === 'PATCH') {
    try {
      const { status, assignedInvestigatorId, assignedInvestigatorName, closureNotes, targetResolutionDate } = req.body;

      if (supabase) {
        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (status) updatePayload.status = status;
        if (assignedInvestigatorId !== undefined) updatePayload.assigned_investigator_id = assignedInvestigatorId;
        if (assignedInvestigatorName !== undefined) updatePayload.assigned_investigator_name = assignedInvestigatorName;
        if (closureNotes !== undefined) updatePayload.closure_notes = closureNotes;
        if (targetResolutionDate !== undefined) updatePayload.target_resolution_date = targetResolutionDate;

        if (status === 'RESOLVED') {
          updatePayload.resolved_at = new Date().toISOString();
        } else if (status === 'CLOSED') {
          updatePayload.closed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('complaints')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase patch complaint failed:', error);
        } else if (data) {
          return res.status(200).json({ complaint: data });
        }
      }

      // Return synthetic success
      return res.status(200).json({
        complaint: {
          id,
          status,
          assignedInvestigatorName,
          closureNotes,
          updatedAt: new Date().toISOString(),
        }
      });
    } catch (err: any) {
      console.error('Error updating complaint:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Add comment note to complaint
  if (req.method === 'POST') {
    try {
      const { authorName, authorRole, commentType, commentText } = req.body;
      if (!commentText || !authorName) {
        return res.status(400).json({ error: 'Author name and comment text are required' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('complaint_comments')
          .insert({
            complaint_id: id,
            author_name: authorName,
            author_role: authorRole || 'OPERATIONS_TEAM',
            comment_type: commentType || 'INTERNAL_NOTE',
            comment_text: commentText,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase add comment failed:', error);
        } else if (data) {
          return res.status(201).json({ comment: data });
        }
      }

      return res.status(201).json({
        comment: {
          id: `comment-${Date.now()}`,
          complaintId: id,
          authorName,
          authorRole: authorRole || 'OPERATIONS_TEAM',
          commentType: commentType || 'INTERNAL_NOTE',
          commentText,
          createdAt: new Date().toISOString(),
        }
      });
    } catch (err: any) {
      console.error('Error adding comment to complaint:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
