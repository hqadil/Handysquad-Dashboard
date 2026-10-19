// src/pages/api/employees/[id]/training.ts
// HANDY SQUAD: EMPLOYEE TRAINING & COACHING MODULES API (PHASE 5)

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

const FALLBACK_TRAINING_RECORDS: Record<string, any[]> = {
  'emp-103': [
    {
      id: 'tr-seed-1',
      employeeId: 'emp-103',
      complaintId: 'a1b2c3d4-0001-4000-8000-000000000001',
      moduleCode: 'SOP-DEL-01',
      moduleTitle: 'Delicate Surface & Cabinet Hardware Care',
      category: 'DELICATE_SURFACES',
      status: 'ASSIGNED',
      trainerName: 'Govindan Nair (Master Trainer)',
      scheduledDate: new Date().toISOString().split('T')[0],
      scorePct: 0,
      notes: 'Mandatory technical coaching following cabinet hinge review HS-CMP-202610-1001',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tr-seed-0',
      employeeId: 'emp-103',
      moduleCode: 'SOP-SAF-01',
      moduleTitle: 'Chemical Dilution & Acid-Sensitive Flooring Safety',
      category: 'CHEMICAL_SAFETY',
      status: 'COMPLETED_PASSED',
      trainerName: 'Govindan Nair',
      scheduledDate: '2023-07-10',
      completionDate: '2023-07-12',
      scorePct: 94.0,
      notes: 'Initial technical onboarding certification passed',
      createdAt: '2023-07-10T10:00:00Z',
    }
  ],
  'emp-101': [
    {
      id: 'tr-seed-101',
      employeeId: 'emp-101',
      moduleCode: 'SOP-CHK-01',
      moduleTitle: 'Pre-Service Pre-Existing Damage Video Documentation',
      category: 'CHECKLIST_DOCUMENTATION',
      status: 'COMPLETED_PASSED',
      trainerName: 'Operations Lead',
      scheduledDate: '2023-02-15',
      completionDate: '2023-02-16',
      scorePct: 98.0,
      notes: 'Supervisor master protocol certification',
      createdAt: '2023-02-15T10:00:00Z',
    }
  ]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid employee ID is required' });
  }

  // GET: Fetch employee's training history
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('training_records')
          .select('*')
          .eq('employee_id', id)
          .order('scheduled_date', { ascending: false });

        if (!error && data && data.length > 0) {
          const records = data.map((t: any) => ({
            id: t.id,
            employeeId: t.employee_id,
            complaintId: t.complaint_id,
            moduleCode: t.module_code,
            moduleTitle: t.module_title,
            category: t.category,
            status: t.status,
            trainerName: t.trainer_name,
            scheduledDate: t.scheduled_date,
            completionDate: t.completion_date,
            scorePct: Number(t.score_pct) || 0,
            reassessmentRequired: t.reassessment_required,
            notes: t.notes,
            createdAt: t.created_at,
          }));

          return res.status(200).json({ trainingRecords: records });
        }
      }

      return res.status(200).json({ trainingRecords: FALLBACK_TRAINING_RECORDS[id] || [] });
    } catch (err: any) {
      console.error('Training GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Assign a new training or coaching module
  if (req.method === 'POST') {
    try {
      const {
        moduleCode,
        moduleTitle,
        category,
        trainerName,
        scheduledDate,
        complaintId,
        notes,
      } = req.body;

      if (!moduleCode || !moduleTitle || !category || !trainerName) {
        return res.status(400).json({ error: 'moduleCode, moduleTitle, category, and trainerName are required' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('training_records')
          .insert({
            employee_id: id,
            complaint_id: complaintId || null,
            module_code: moduleCode,
            module_title: moduleTitle,
            category,
            status: 'ASSIGNED',
            trainer_name: trainerName,
            scheduled_date: scheduledDate || new Date().toISOString().split('T')[0],
            notes: notes || null,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase training_records insert warning (falling back gracefully):', error.message);
          return res.status(201).json({
            trainingRecord: {
              id: `tr-${Date.now()}`,
              employeeId: id,
              complaintId,
              moduleCode,
              moduleTitle,
              category,
              status: 'ASSIGNED',
              trainerName,
              scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
              scorePct: 0,
              reassessmentRequired: false,
              notes,
              createdAt: new Date().toISOString(),
            },
            warning: error.message,
          });
        }

        // Update employee training status to TRAINING_REQUIRED
        await supabase
          .from('employees')
          .update({
            training_status: 'TRAINING_REQUIRED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        return res.status(201).json({ trainingRecord: data });
      }

      return res.status(201).json({
        trainingRecord: {
          id: `tr-${Date.now()}`,
          employeeId: id,
          moduleCode,
          moduleTitle,
          category,
          status: 'ASSIGNED',
          trainerName,
          scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Training POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Complete module or update test score
  if (req.method === 'PATCH') {
    try {
      const { trainingId, status, scorePct, notes } = req.body;

      if (!trainingId || !status) {
        return res.status(400).json({ error: 'trainingId and status are required' });
      }

      if (supabase) {
        const updateData: Record<string, any> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'COMPLETED_PASSED') {
          updateData.completion_date = new Date().toISOString().split('T')[0];
          updateData.score_pct = scorePct ? Number(scorePct) : 95.0;
        }
        if (notes !== undefined) {
          updateData.notes = notes;
        }

        const { data, error } = await supabase
          .from('training_records')
          .update(updateData)
          .eq('id', trainingId)
          .select()
          .single();

        if (error) {
          console.warn('Update training record error:', error);
          return res.status(400).json({ error: error.message });
        }

        // If completed and passed, restore employee training status to UP_TO_DATE
        if (status === 'COMPLETED_PASSED') {
          await supabase
            .from('employees')
            .update({
              training_status: 'UP_TO_DATE',
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        }

        return res.status(200).json({ trainingRecord: data });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Training PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
