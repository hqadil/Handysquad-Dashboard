// src/lib/db.ts
// Unified database service: Supabase PostgreSQL (primary) with SQLite Prisma (fallback for local dev)

import { supabase } from './supabase';
import prisma from './prisma';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const isSupabaseConfigured = () => Boolean(supabase);

// --- UNITS ---
export async function getUnits(all = false) {
  if (supabase) {
    try {
      let query = supabase
        .from('Unit')
        .select('*, standards:FinancialStandard(*)')
        .order('createdAt', { ascending: true });
      if (!all) query = query.eq('active', true);

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        // Sort standards by effectiveStartDate desc
        return data.map((u: any) => ({
          ...u,
          standards: (u.standards || []).sort(
            (a: any, b: any) => new Date(b.effectiveStartDate).getTime() - new Date(a.effectiveStartDate).getTime()
          ),
        }));
      }
    } catch (err: any) {
      console.warn('Supabase getUnits failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to fetch units from Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  return prisma.unit.findMany({
    where: all ? {} : { active: true },
    include: {
      standards: {
        orderBy: { effectiveStartDate: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createUnit(data: {
  name: string;
  type?: string;
  defaultHeadcount?: number;
  dailyCapacityHr?: number;
  dailyRevenueTarget?: number;
  standardDailyOperatingCost?: number;
}) {
  const { name, type = 'MAIN_TEAM', defaultHeadcount, dailyCapacityHr, dailyRevenueTarget, standardDailyOperatingCost } = data;
  const headcount = Number(defaultHeadcount) || (type === 'MAIN_TEAM' ? 5 : 3);
  const capacity = Number(dailyCapacityHr) || 9;
  const target = Number(dailyRevenueTarget) || (type === 'MAIN_TEAM' ? 15000 : 10000);
  const cost = Number(standardDailyOperatingCost) || (type === 'MAIN_TEAM' ? 8000 : 5500);

  if (supabase) {
    try {
      const { data: unit, error: unitErr } = await supabase
        .from('Unit')
        .insert([{ name, type, defaultHeadcount: headcount, dailyCapacityHr: capacity, active: true }])
        .select()
        .single();
      if (unitErr) throw unitErr;

      const { data: std, error: stdErr } = await supabase
        .from('FinancialStandard')
        .insert([{
          unitId: unit.id,
          dailyRevenueTarget: target,
          standardDailyOperatingCost: cost,
          dailyCapacityHours: capacity,
          outsideManpowerRate: 1000,
          minRevenuePerAdditionalTech: 2000,
          overtimeRatePerHour: 100,
        }])
        .select()
        .single();
      if (stdErr) throw stdErr;

      return { ...unit, standards: [std] };
    } catch (err: any) {
      console.warn('Supabase createUnit failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to create team in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  return prisma.unit.create({
    data: {
      name,
      type,
      defaultHeadcount: headcount,
      dailyCapacityHr: capacity,
      active: true,
      standards: {
        create: {
          effectiveStartDate: new Date(),
          dailyRevenueTarget: target,
          standardDailyOperatingCost: cost,
          dailyCapacityHours: capacity,
          outsideManpowerRate: 1000,
          minRevenuePerAdditionalTech: 2000,
          overtimeRatePerHour: 100,
        },
      },
    },
    include: { standards: true },
  });
}

export async function updateUnit(id: string, updates: any) {
  if (supabase) {
    try {
      const payload: any = { updatedAt: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.active !== undefined) payload.active = updates.active;
      if (updates.defaultHeadcount !== undefined) payload.defaultHeadcount = Number(updates.defaultHeadcount);
      if (updates.dailyCapacityHr !== undefined) payload.dailyCapacityHr = Number(updates.dailyCapacityHr);

      const { data: updated, error: unitErr } = await supabase
        .from('Unit')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (unitErr) throw unitErr;

      if (updates.dailyRevenueTarget !== undefined || updates.standardDailyOperatingCost !== undefined) {
        await supabase.from('FinancialStandard').insert([{
          unitId: id,
          dailyRevenueTarget: Number(updates.dailyRevenueTarget),
          standardDailyOperatingCost: Number(updates.standardDailyOperatingCost),
          dailyCapacityHours: Number(updates.dailyCapacityHr) || updated.dailyCapacityHr,
          outsideManpowerRate: 1000,
          minRevenuePerAdditionalTech: 2000,
          overtimeRatePerHour: 100,
        }]);
      }

      return updated;
    } catch (err: any) {
      console.warn('Supabase updateUnit failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to update team in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  const updated = await prisma.unit.update({
    where: { id },
    data: {
      name: updates.name !== undefined ? updates.name : undefined,
      active: updates.active !== undefined ? updates.active : undefined,
      defaultHeadcount: updates.defaultHeadcount !== undefined ? Number(updates.defaultHeadcount) : undefined,
      dailyCapacityHr: updates.dailyCapacityHr !== undefined ? Number(updates.dailyCapacityHr) : undefined,
    },
  });

  if (updates.dailyRevenueTarget !== undefined || updates.standardDailyOperatingCost !== undefined) {
    await prisma.financialStandard.create({
      data: {
        unitId: id,
        effectiveStartDate: new Date(),
        dailyRevenueTarget: Number(updates.dailyRevenueTarget),
        standardDailyOperatingCost: Number(updates.standardDailyOperatingCost),
        dailyCapacityHours: Number(updates.dailyCapacityHr) || updated.dailyCapacityHr,
        outsideManpowerRate: 1000,
        minRevenuePerAdditionalTech: 2000,
        overtimeRatePerHour: 100,
      },
    });
  }

  return updated;
}

export async function deactivateUnit(id: string) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('Unit')
        .update({ active: false, updatedAt: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase deactivateUnit failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to deactivate team in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  await prisma.unit.update({
    where: { id },
    data: { active: false },
  });
  return { success: true };
}

// --- JOBS ---
export async function getJobs(filters: { unitId?: string; date?: string }) {
  if (supabase) {
    try {
      let query = supabase
        .from('Job')
        .select('*, unit:Unit(*), costs:JobCost(*), payments:Payment(*)')
        .order('scheduledDate', { ascending: false });

      if (filters.unitId) query = query.eq('unitId', filters.unitId);
      if (filters.date) {
        query = query
          .gte('scheduledDate', `${filters.date}T00:00:00`)
          .lt('scheduledDate', `${filters.date}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) return data;
    } catch (err: any) {
      console.warn('Supabase getJobs failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to fetch jobs from Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  const where: any = {};
  if (filters.unitId) where.unitId = String(filters.unitId);
  if (filters.date) {
    const d = new Date(String(filters.date));
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    where.scheduledDate = { gte: d, lt: nextD };
  }

  return prisma.job.findMany({
    where,
    include: {
      unit: true,
      costs: true,
      payments: true,
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

export async function createJob(data: any) {
  if (supabase) {
    try {
      const { data: job, error: jobErr } = await supabase
        .from('Job')
        .insert([{
          title: data.title,
          customerRef: data.customerRef,
          unitId: data.unitId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : new Date().toISOString(),
          status: data.status || 'TENTATIVE',
          bookingStatus: data.bookingStatus || 'TENTATIVE',
          probabilityWeight: Number(data.probabilityWeight) || 0.6,
          expectedRevenue: Number(data.expectedRevenue) || 0,
          finalRevenue: data.finalRevenue !== undefined ? Number(data.finalRevenue) : Number(data.expectedRevenue) || 0,
          earnedRevenue: Number(data.earnedRevenue) || 0,
          estimatedDurationHr: Number(data.estimatedDurationHr) || 0,
          actualDurationHr: data.actualDurationHr !== undefined ? Number(data.actualDurationHr) : null,
          estimatedTravelHr: Number(data.estimatedTravelHr) || 0,
          actualTravelHr: data.actualTravelHr !== undefined ? Number(data.actualTravelHr) : null,
          notes: data.notes || null,
        }])
        .select()
        .single();
      if (jobErr) throw jobErr;

      if (data.costs && data.costs.length > 0) {
        const costsPayload = data.costs.map((c: any) => ({
          jobId: job.id,
          category: c.category,
          estimated: Number(c.estimated) || 0,
          actual: c.actual !== undefined ? Number(c.actual) : null,
          quantity: c.quantity !== undefined ? Number(c.quantity) : null,
          rate: c.rate !== undefined ? Number(c.rate) : null,
          description: c.description || null,
        }));
        await supabase.from('JobCost').insert(costsPayload);
      }

      return job;
    } catch (err: any) {
      console.warn('Supabase createJob failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to create job in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  return prisma.job.create({
    data: {
      title: data.title,
      customerRef: data.customerRef,
      unitId: data.unitId,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      status: data.status || 'TENTATIVE',
      bookingStatus: data.bookingStatus || 'TENTATIVE',
      probabilityWeight: Number(data.probabilityWeight) || 0.6,
      expectedRevenue: Number(data.expectedRevenue) || 0,
      finalRevenue: data.finalRevenue !== undefined ? Number(data.finalRevenue) : Number(data.expectedRevenue) || 0,
      earnedRevenue: Number(data.earnedRevenue) || 0,
      estimatedDurationHr: Number(data.estimatedDurationHr) || 0,
      actualDurationHr: data.actualDurationHr !== undefined ? Number(data.actualDurationHr) : null,
      estimatedTravelHr: Number(data.estimatedTravelHr) || 0,
      actualTravelHr: data.actualTravelHr !== undefined ? Number(data.actualTravelHr) : null,
      notes: data.notes || null,
      costs: {
        create: (data.costs || []).map((c: any) => ({
          category: c.category,
          estimated: Number(c.estimated) || 0,
          actual: c.actual !== undefined ? Number(c.actual) : null,
          quantity: c.quantity !== undefined ? Number(c.quantity) : null,
          rate: c.rate !== undefined ? Number(c.rate) : null,
          description: c.description,
        })),
      },
    },
    include: { costs: true },
  });
}

export async function updateJob(id: string, updates: any) {
  if (supabase) {
    try {
      const payload: any = { updatedAt: new Date().toISOString() };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.bookingStatus !== undefined) payload.bookingStatus = updates.bookingStatus;
      if (updates.earnedRevenue !== undefined) payload.earnedRevenue = Number(updates.earnedRevenue);
      if (updates.finalRevenue !== undefined) payload.finalRevenue = Number(updates.finalRevenue);
      if (updates.actualDurationHr !== undefined) payload.actualDurationHr = Number(updates.actualDurationHr);
      if (updates.actualTravelHr !== undefined) payload.actualTravelHr = Number(updates.actualTravelHr);
      if (updates.notes !== undefined) payload.notes = updates.notes;

      const { data, error } = await supabase
        .from('Job')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (data) return data;
    } catch (err: any) {
      console.warn('Supabase updateJob failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to update job in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  return prisma.job.update({
    where: { id },
    data: {
      status: updates.status,
      bookingStatus: updates.bookingStatus,
      earnedRevenue: updates.earnedRevenue !== undefined ? Number(updates.earnedRevenue) : undefined,
      finalRevenue: updates.finalRevenue !== undefined ? Number(updates.finalRevenue) : undefined,
      actualDurationHr: updates.actualDurationHr !== undefined ? Number(updates.actualDurationHr) : undefined,
      actualTravelHr: updates.actualTravelHr !== undefined ? Number(updates.actualTravelHr) : undefined,
      notes: updates.notes,
    },
  });
}

export async function deleteJob(id: string) {
  if (supabase) {
    try {
      const { error } = await supabase.from('Job').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase deleteJob failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to delete job in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  await prisma.job.delete({ where: { id } });
  return { success: true };
}

// --- DAILY RECORDS & SHARED EXPENSES ---
export async function getDailyData(targetDate: Date) {
  const dateStr = targetDate.toISOString().split('T')[0];

  if (supabase) {
    try {
      const [recordsRes, sharedRes] = await Promise.all([
        supabase
          .from('DailyRecord')
          .select('*, unit:Unit(*, standards:FinancialStandard(*))')
          .gte('date', `${dateStr}T00:00:00`)
          .lt('date', `${dateStr}T23:59:59.999Z`),
        supabase
          .from('SharedExpense')
          .select('*')
          .gte('date', `${dateStr}T00:00:00`)
          .lt('date', `${dateStr}T23:59:59.999Z`),
      ]);

      if (!recordsRes.error && recordsRes.data) {
        return {
          records: recordsRes.data,
          shared: sharedRes.data || [],
        };
      }
      if (recordsRes.error) throw recordsRes.error;
    } catch (err: any) {
      console.warn('Supabase getDailyData failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to fetch daily records from Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  const records = await prisma.dailyRecord.findMany({
    where: { date: targetDate },
    include: {
      unit: {
        include: {
          standards: {
            orderBy: { effectiveStartDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const shared = await prisma.sharedExpense.findMany({
    where: { date: targetDate },
  });

  return { records, shared };
}

export async function upsertDailyRecord(data: {
  unitId: string;
  date: Date;
  earnedRevenue?: number;
  additionalDirectExpenses?: number;
  usedHours?: number;
  finalized?: boolean;
  notes?: string;
}) {
  const { unitId, date, earnedRevenue = 0, additionalDirectExpenses = 0, usedHours = 0, finalized = false, notes } = data;
  const dateStr = date.toISOString().split('T')[0];

  if (supabase) {
    try {
      // Find unit's standard fixed cost
      const { data: unitData, error: unitErr } = await supabase
        .from('Unit')
        .select('*, standards:FinancialStandard(*)')
        .eq('id', unitId)
        .single();
      if (unitErr) throw unitErr;

      const standardFixedCost = unitData?.standards?.[0]?.standardDailyOperatingCost || (unitData?.type === 'MAIN_TEAM' ? 8000 : 5500);

      // Check existing
      const { data: existing } = await supabase
        .from('DailyRecord')
        .select('id')
        .eq('unitId', unitId)
        .gte('date', `${dateStr}T00:00:00`)
        .lt('date', `${dateStr}T23:59:59.999Z`)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabase
          .from('DailyRecord')
          .update({
            earnedRevenue: Number(earnedRevenue),
            standardFixedCost,
            additionalDirectExpenses: Number(additionalDirectExpenses),
            usedHours: Number(usedHours),
            finalized: Boolean(finalized),
            notes,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        if (updated) return updated;
      } else {
        const { data: created, error } = await supabase
          .from('DailyRecord')
          .insert([{
            unitId,
            date: `${dateStr}T00:00:00Z`,
            earnedRevenue: Number(earnedRevenue),
            standardFixedCost,
            additionalDirectExpenses: Number(additionalDirectExpenses),
            usedHours: Number(usedHours),
            finalized: Boolean(finalized),
            notes,
          }])
          .select()
          .single();
        if (error) throw error;
        if (created) return created;
      }
    } catch (err: any) {
      console.warn('Supabase upsertDailyRecord failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to save daily record in Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { standards: { orderBy: { effectiveStartDate: 'desc' }, take: 1 } },
  });
  const standardFixedCost = unit?.standards[0]?.standardDailyOperatingCost || (unit?.type === 'MAIN_TEAM' ? 8000 : 5500);

  return prisma.dailyRecord.upsert({
    where: { date_unitId: { date, unitId } },
    update: {
      earnedRevenue: Number(earnedRevenue),
      additionalDirectExpenses: Number(additionalDirectExpenses),
      usedHours: Number(usedHours),
      finalized: Boolean(finalized),
      notes,
    },
    create: {
      date,
      unitId,
      earnedRevenue: Number(earnedRevenue),
      standardFixedCost,
      additionalDirectExpenses: Number(additionalDirectExpenses),
      usedHours: Number(usedHours),
      finalized: Boolean(finalized),
      notes,
    },
  });
}

// --- ANALYTICS ---
export async function getAnalyticsRawData(startDate: Date, endDate: Date, unitId: string) {
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  if (supabase) {
    try {
      let unitQuery = supabase.from('Unit').select('*, standards:FinancialStandard(*)').eq('active', true);
      if (unitId !== 'all') unitQuery = unitQuery.eq('id', unitId);

      let recordQuery = supabase
        .from('DailyRecord')
        .select('*, unit:Unit(*)')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });
      if (unitId !== 'all') recordQuery = recordQuery.eq('unitId', unitId);

      let jobQuery = supabase
        .from('Job')
        .select('*, unit:Unit(*), costs:JobCost(*), payments:Payment(*)')
        .gte('scheduledDate', startStr)
        .lte('scheduledDate', endStr)
        .order('scheduledDate', { ascending: true });
      if (unitId !== 'all') jobQuery = jobQuery.eq('unitId', unitId);

      let sharedQuery = supabase
        .from('SharedExpense')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);

      const [uRes, rRes, jRes, sRes] = await Promise.all([unitQuery, recordQuery, jobQuery, sharedQuery]);

      if (!uRes.error && uRes.data) {
        return {
          units: uRes.data.map((u: any) => ({
            ...u,
            standards: (u.standards || []).sort(
              (a: any, b: any) => new Date(b.effectiveStartDate).getTime() - new Date(a.effectiveStartDate).getTime()
            ),
          })),
          dailyRecords: rRes.data || [],
          jobs: jRes.data || [],
          sharedExpenses: sRes.data || [],
        };
      }
      if (uRes.error) throw uRes.error;
    } catch (err: any) {
      console.warn('Supabase getAnalyticsRawData failed:', err);
      if (isServerless) throw new Error(err.message || 'Failed to fetch analytics from Supabase');
    }
  }

  if (isServerless) {
    throw new Error('Database connection failed: Supabase is required in production.');
  }

  const units = await prisma.unit.findMany({
    where: unitId === 'all' ? { active: true } : { id: String(unitId), active: true },
    include: {
      standards: {
        orderBy: { effectiveStartDate: 'desc' },
        take: 1,
      },
    },
  });

  const dailyRecords = await prisma.dailyRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      ...(unitId !== 'all' ? { unitId: String(unitId) } : {}),
    },
    include: { unit: true },
    orderBy: { date: 'asc' },
  });

  const jobs = await prisma.job.findMany({
    where: {
      scheduledDate: { gte: startDate, lte: endDate },
      ...(unitId !== 'all' ? { unitId: String(unitId) } : {}),
    },
    include: {
      unit: true,
      costs: true,
      payments: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  const sharedExpenses = await prisma.sharedExpense.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  return { units, dailyRecords, jobs, sharedExpenses };
}
