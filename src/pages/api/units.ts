// src/pages/api/units.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUnits, createUnit, updateUnit, deactivateUnit } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { all } = req.query;
      const units = await getUnits(all === 'true');
      return res.status(200).json(units);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, type, defaultHeadcount, dailyCapacityHr, dailyRevenueTarget, standardDailyOperatingCost } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const unit = await createUnit({
        name,
        type,
        defaultHeadcount,
        dailyCapacityHr,
        dailyRevenueTarget,
        standardDailyOperatingCost,
      });
      return res.status(201).json(unit);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, active, dailyRevenueTarget, standardDailyOperatingCost, defaultHeadcount, dailyCapacityHr } = req.body;
      if (!id) return res.status(400).json({ error: 'Unit ID is required' });

      const updated = await updateUnit(id, {
        name,
        active,
        dailyRevenueTarget,
        standardDailyOperatingCost,
        defaultHeadcount,
        dailyCapacityHr,
      });
      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Unit ID is required' });

      await deactivateUnit(String(id));
      return res.status(200).json({ success: true, message: 'Unit deactivated and historical records preserved.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
