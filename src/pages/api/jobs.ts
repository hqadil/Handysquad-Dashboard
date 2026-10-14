// src/pages/api/jobs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { unitId, date } = req.query;
      const where: any = {};
      if (unitId) where.unitId = String(unitId);
      if (date) {
        const d = new Date(String(date));
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        where.scheduledDate = { gte: d, lt: nextD };
      }

      const jobs = await prisma.job.findMany({
        where,
        include: {
          unit: true,
          costs: true,
          payments: true,
        },
        orderBy: { scheduledDate: 'desc' },
      });
      return res.status(200).json(jobs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        customerRef,
        unitId,
        scheduledDate,
        status = 'TENTATIVE',
        bookingStatus = 'TENTATIVE',
        probabilityWeight = 0.6,
        expectedRevenue = 0,
        finalRevenue,
        earnedRevenue,
        estimatedDurationHr = 0,
        actualDurationHr,
        estimatedTravelHr = 0,
        actualTravelHr,
        notes,
        costs = [],
      } = req.body;

      const job = await prisma.job.create({
        data: {
          title,
          customerRef,
          unitId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          status,
          bookingStatus,
          probabilityWeight: Number(probabilityWeight) || 0.6,
          expectedRevenue: Number(expectedRevenue) || 0,
          finalRevenue: finalRevenue !== undefined ? Number(finalRevenue) : null,
          earnedRevenue: earnedRevenue !== undefined ? Number(earnedRevenue) : null,
          estimatedDurationHr: Number(estimatedDurationHr) || 0,
          actualDurationHr: actualDurationHr !== undefined ? Number(actualDurationHr) : null,
          estimatedTravelHr: Number(estimatedTravelHr) || 0,
          actualTravelHr: actualTravelHr !== undefined ? Number(actualTravelHr) : null,
          notes,
          costs: {
            create: costs.map((c: any) => ({
              category: c.category || 'OTHER',
              estimated: Number(c.estimated) || 0,
              actual: c.actual !== undefined ? Number(c.actual) : null,
              quantity: c.quantity ? Number(c.quantity) : null,
              rate: c.rate ? Number(c.rate) : null,
              description: c.description || null,
            })),
          },
        },
        include: {
          unit: true,
          costs: true,
          payments: true,
        },
      });

      return res.status(201).json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'Job ID is required' });

      const updated = await prisma.job.update({
        where: { id },
        data: {
          ...data,
          expectedRevenue: data.expectedRevenue !== undefined ? Number(data.expectedRevenue) : undefined,
          finalRevenue: data.finalRevenue !== undefined ? Number(data.finalRevenue) : undefined,
          earnedRevenue: data.earnedRevenue !== undefined ? Number(data.earnedRevenue) : undefined,
          estimatedDurationHr: data.estimatedDurationHr !== undefined ? Number(data.estimatedDurationHr) : undefined,
          actualDurationHr: data.actualDurationHr !== undefined ? Number(data.actualDurationHr) : undefined,
        },
        include: {
          unit: true,
          costs: true,
          payments: true,
        },
      });

      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Job ID is required' });
      await prisma.job.delete({ where: { id: String(id) } });
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
