// src/pages/api/jobs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getJobs, createJob, updateJob, deleteJob } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { unitId, date } = req.query;
      const jobs = await getJobs({
        unitId: unitId ? String(unitId) : undefined,
        date: date ? String(date) : undefined,
      });
      return res.status(200).json(jobs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const job = await createJob(req.body);
      return res.status(201).json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'Job ID is required' });

      const updated = await updateJob(id, updates);
      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Job ID is required' });

      await deleteJob(String(id));
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
