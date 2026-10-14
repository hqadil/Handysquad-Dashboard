import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  DashboardIcon, 
  BarChartIcon, 
  TableIcon, 
  CalendarIcon, 
  LayersIcon, 
  GearIcon, 
  TargetIcon,
  MixerHorizontalIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  MagicWandIcon,
} from '@radix-ui/react-icons';
import { formatINR } from '../lib/finance';
import TimelineLineChart from '../components/TimelineLineChart';
import WhatIfCalculator from '../components/WhatIfCalculator';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [units, setUnits] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any>({ records: [], shared: [] });
  const [loading, setLoading] = useState(true);

  // Timeframe and Date controls
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'day' | 'week' | 'custom'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });

  // Local editable state for instantaneous table & card calculation
  const [rowInputs, setRowInputs] = useState<Record<string, { earnedRevenue: number; additionalDirectExpenses: number; usedHours: number }>>({});

  // Analytics Dashboard State (Weekly / Monthly / Custom)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [analyticsUnitId, setAnalyticsUnitId] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [timelineChartType, setTimelineChartType] = useState<'line' | 'cards'>('line');

  // Unit Management Modal State
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitForm, setNewUnitForm] = useState({
    name: '',
    type: 'MAIN_TEAM',
    defaultHeadcount: 5,
    dailyCapacityHr: 9,
    dailyRevenueTarget: 15000,
    standardDailyOperatingCost: 8000,
  });
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitError, setUnitError] = useState('');

  // Simulator Form State
  const [simForm, setSimForm] = useState({
    unitId: '',
    title: 'New Deep Clean Job',
    customerRef: 'Walk-in Client',
    expectedRevenue: 6000,
    durationHr: 4,
    travelHr: 0,
    outsideManpowerCount: 1,
    outsideManpowerRate: 1000,
    overtimeHeadcount: 0,
    overtimeHoursPerPerson: 0,
    overtimeRate: 100,
    materialsCost: 200,
    otherExpenses: 0,
    bookingStatus: 'TENTATIVE',
  });

  const [simResult, setSimResult] = useState<any>(null);
  const [simMessage, setSimMessage] = useState('');

  // Scenario Planner State
  const [scenarioDays, setScenarioDays] = useState(26);
  const [scenarioTargetMod, setScenarioTargetMod] = useState(1.0); // 100%
  const [scenarioCostMod, setScenarioCostMod] = useState(1.0); // 100%

  // Fetch initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [unitsRes, jobsRes, dailyRes] = await Promise.all([
        fetch('/api/units').then(r => r.json()),
        fetch('/api/jobs').then(r => r.json()),
        fetch(`/api/daily?date=${selectedDate}`).then(r => r.json()),
      ]);

      if (Array.isArray(unitsRes)) {
        setUnits(unitsRes);
        if (unitsRes.length > 0 && !simForm.unitId) {
          setSimForm(prev => ({ ...prev, unitId: unitsRes[0].id }));
        }
      }
      if (Array.isArray(jobsRes)) setJobs(jobsRes);
      if (dailyRes && dailyRes.records) {
        setDailyData(dailyRes);
        // Initialize rowInputs from fetched daily records
        const inputs: Record<string, any> = {};
        unitsRes.forEach((u: any) => {
          const rec = dailyRes.records.find((r: any) => r.unitId === u.id);
          inputs[u.id] = {
            earnedRevenue: rec ? rec.earnedRevenue : 0,
            additionalDirectExpenses: rec ? rec.additionalDirectExpenses : 0,
            usedHours: rec ? rec.usedHours : 0,
          };
        });
        setRowInputs(inputs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Fetch Analytics (Weekly, Monthly, or Period for Dashboard)
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      let url = '';
      if (dashboardTimeframe === 'week') {
        url = `/api/analytics?period=weekly&referenceDate=${selectedDate}&unitId=all`;
      } else if (dashboardTimeframe === 'custom') {
        url = `/api/analytics?period=custom&fromDate=${selectedDate}&toDate=${customEndDate}&unitId=all`;
      } else {
        url = `/api/analytics?period=${analyticsPeriod}&unitId=${analyticsUnitId}&referenceDate=${selectedDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dashboardTimeframe, selectedDate, customEndDate, analyticsPeriod, analyticsUnitId]);

  // Run calculation when simulator form changes
  const runSimulation = async () => {
    if (!simForm.unitId) return;
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simForm),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [simForm]);

  // Handle Unit Type Selection & Auto-fill Defaults
  const handleTypeChange = (newType: string) => {
    if (newType === 'MAIN_TEAM') {
      setNewUnitForm({
        ...newUnitForm,
        type: newType,
        defaultHeadcount: 5,
        dailyRevenueTarget: 15000,
        standardDailyOperatingCost: 8000,
        dailyCapacityHr: 9,
      });
    } else {
      setNewUnitForm({
        ...newUnitForm,
        type: newType,
        defaultHeadcount: 3,
        dailyRevenueTarget: 10000,
        standardDailyOperatingCost: 5500,
        dailyCapacityHr: 9,
      });
    }
  };

  // Handle creating a new Operating Unit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitForm.name.trim()) {
      setUnitError('Please enter a team name');
      return;
    }
    setUnitSaving(true);
    setUnitError('');
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnitForm),
      });
      if (res.ok) {
        setShowAddUnitModal(false);
        setNewUnitForm({
          name: '',
          type: 'MAIN_TEAM',
          defaultHeadcount: 5,
          dailyCapacityHr: 9,
          dailyRevenueTarget: 15000,
          standardDailyOperatingCost: 8000,
        });
        await loadData();
        await loadAnalytics();
      } else {
        const data = await res.json();
        setUnitError(data.error || 'Failed to create team');
      }
    } catch (err: any) {
      setUnitError(err.message);
    } finally {
      setUnitSaving(false);
    }
  };

  // Handle Deactivating a Unit (Preserves historical data)
  const handleDeactivateUnit = async (unitId: string, unitName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${unitName}? Historical job and revenue records will be preserved.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/units?id=${unitId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        await loadAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle saving simulator job to real DB
  const handleSaveJob = async () => {
    try {
      setSimMessage('Saving job...');
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: simForm.title,
          customerRef: simForm.customerRef,
          unitId: simForm.unitId,
          scheduledDate: selectedDate,
          status: simForm.bookingStatus,
          bookingStatus: simForm.bookingStatus,
          probabilityWeight: simForm.bookingStatus === 'CONFIRMED' ? 1.0 : 0.6,
          expectedRevenue: simForm.expectedRevenue,
          finalRevenue: simForm.expectedRevenue,
          earnedRevenue: simForm.bookingStatus === 'COMPLETED' ? simForm.expectedRevenue : 0,
          estimatedDurationHr: simForm.durationHr,
          estimatedTravelHr: simForm.travelHr,
          costs: [
            ...(simForm.outsideManpowerCount > 0 ? [{
              category: 'OUTSIDE_MANPOWER',
              estimated: simForm.outsideManpowerCount * simForm.outsideManpowerRate,
              quantity: simForm.outsideManpowerCount,
              rate: simForm.outsideManpowerRate,
            }] : []),
            ...(simForm.materialsCost > 0 ? [{
              category: 'MATERIALS',
              estimated: simForm.materialsCost,
            }] : []),
            ...(simForm.otherExpenses > 0 ? [{
              category: 'OTHER',
              estimated: simForm.otherExpenses,
            }] : []),
          ],
        }),
      });
      if (res.ok) {
        setSimMessage('Job saved successfully to database!');
        loadData();
        loadAnalytics();
        setTimeout(() => setSimMessage(''), 3000);
      }
    } catch (err: any) {
      setSimMessage('Error saving job: ' + err.message);
    }
  };

  // Quick update job status
  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const job = jobs.find(j => j.id === jobId);
    await fetch('/api/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: jobId,
        status: newStatus,
        earnedRevenue: newStatus === 'COMPLETED' ? job.expectedRevenue : 0,
      }),
    });
    loadData();
    loadAnalytics();
  };

  // Delete Job
  const deleteJob = async (jobId: string) => {
    await fetch(`/api/jobs?id=${jobId}`, { method: 'DELETE' });
    loadData();
    loadAnalytics();
  };

  // Update input locally for immediate calculation
  const handleInputChange = (unitId: string, field: 'earnedRevenue' | 'additionalDirectExpenses' | 'usedHours', value: number) => {
    setRowInputs((prev) => ({
      ...prev,
      [unitId]: {
        earnedRevenue: field === 'earnedRevenue' ? value : (prev[unitId]?.earnedRevenue || 0),
        additionalDirectExpenses: field === 'additionalDirectExpenses' ? value : (prev[unitId]?.additionalDirectExpenses || 0),
        usedHours: field === 'usedHours' ? value : (prev[unitId]?.usedHours || 0),
      },
    }));
  };

  // Save to database on blur
  const saveDailyRecord = async (unitId: string) => {
    const current = rowInputs[unitId] || { earnedRevenue: 0, additionalDirectExpenses: 0, usedHours: 0 };
    const existingRec = dailyData.records.find((r: any) => r.unitId === unitId);

    const body = {
      unitId,
      date: selectedDate,
      earnedRevenue: current.earnedRevenue,
      additionalDirectExpenses: current.additionalDirectExpenses,
      usedHours: current.usedHours,
      finalized: existingRec?.finalized || false,
    };

    await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const dailyRes = await fetch(`/api/daily?date=${selectedDate}`).then(r => r.json());
    if (dailyRes && dailyRes.records) setDailyData(dailyRes);
    loadAnalytics();
  };

  // Toggle finalize day
  const toggleFinalize = async (unitId: string) => {
    const current = rowInputs[unitId] || { earnedRevenue: 0, additionalDirectExpenses: 0, usedHours: 0 };
    const existingRec = dailyData.records.find((r: any) => r.unitId === unitId);
    const finalized = !existingRec?.finalized;

    await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId,
        date: selectedDate,
        earnedRevenue: current.earnedRevenue,
        additionalDirectExpenses: current.additionalDirectExpenses,
        usedHours: current.usedHours,
        finalized,
      }),
    });

    const dailyRes = await fetch(`/api/daily?date=${selectedDate}`).then(r => r.json());
    if (dailyRes && dailyRes.records) setDailyData(dailyRes);
    loadAnalytics();
  };

  // Export Analytics Report to CSV
  const exportAnalyticsCSV = () => {
    if (!analyticsData) return;
    const { summary, unitBreakdown, trendData, period, startDate, endDate } = analyticsData;

    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `HANDY SQUAD HOUSEKEEPING ECONOMICS - ${period.toUpperCase()} REPORT\n`;
    csvContent += `Period: ${startDate} to ${endDate} (${analyticsData.daysCount} days)\n`;
    csvContent += `Scope: ${analyticsUnitId === 'all' ? 'Overall Operation (All Units)' : units.find(u => u.id === analyticsUnitId)?.name || 'Unit'}\n\n`;

    csvContent += `EXECUTIVE SUMMARY\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Target Revenue,${summary.totalTargetRevenue}\n`;
    csvContent += `Actual Earned Revenue,${summary.totalEarnedRevenue}\n`;
    csvContent += `Revenue Variance,${summary.revenueVariance}\n`;
    csvContent += `Target Achievement %,${summary.targetAchievementPct}%\n`;
    csvContent += `Standard Fixed Costs,${summary.totalStandardCost}\n`;
    csvContent += `Additional Direct Expenses,${summary.totalAdditionalCost}\n`;
    csvContent += `Operational Contribution,${summary.operationalContribution}\n`;
    if (analyticsUnitId === 'all') {
      csvContent += `Shared Expenses,${summary.totalSharedExpenses}\n`;
      csvContent += `Net Overall Contribution,${summary.netOverallContribution}\n`;
    }
    csvContent += `Capacity Hours,${summary.totalCapacityHours}\n`;
    csvContent += `Hours Utilized,${summary.totalHoursUtilized}\n`;
    csvContent += `Capacity Utilization %,${summary.capacityUtilizationPct}%\n`;
    csvContent += `Revenue Per Hour,${summary.revenuePerHour}\n\n`;

    if (unitBreakdown && unitBreakdown.length > 0) {
      csvContent += `TEAM PERFORMANCE BREAKDOWN\n`;
      csvContent += `Team Name,Type,Target Revenue,Earned Revenue,Variance,Achievement %,Standard Cost,Additional Cost,Contribution,Capacity Hrs,Hours Utilized,Utilization %\n`;
      unitBreakdown.forEach((u: any) => {
        csvContent += `"${u.unitName}","${u.unitType}",${u.targetRevenue},${u.earnedRevenue},${u.revenueVariance},${u.achievementPct}%,${u.standardCost},${u.additionalCost},${u.contribution},${u.capacityHours},${u.hoursUtilized},${u.utilizationPct}%\n`;
      });
      csvContent += `\n`;
    }

    if (trendData && trendData.length > 0) {
      csvContent += `DAILY TIMELINE LEDGER\n`;
      csvContent += `Date,Day,Target Revenue,Earned Revenue,Standard Cost,Additional Cost,Daily Contribution,Hours Utilized\n`;
      trendData.forEach((d: any) => {
        csvContent += `"${d.date}","${d.dayName}",${d.targetRevenue},${d.earnedRevenue},${d.standardCost},${d.additionalCost},${d.contribution},${d.usedHours}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Handy_Squad_${period}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dashboard Aggregates (Day vs Week / Custom Period)
  const isPeriodMode = dashboardTimeframe !== 'day';

  // Day-mode live computations from rowInputs
  const dayEarnedRevenue = units.reduce((acc, u) => acc + (rowInputs[u.id]?.earnedRevenue || 0), 0);
  const dayTargetRevenue = units.reduce((acc, u) => acc + (u.standards?.[0]?.dailyRevenueTarget || 0), 0);
  const dayStdCost = units.reduce((acc, u) => acc + (u.standards?.[0]?.standardDailyOperatingCost || 0), 0);
  const dayAddCost = units.reduce((acc, u) => acc + (rowInputs[u.id]?.additionalDirectExpenses || 0), 0);
  const dayContribution = dayEarnedRevenue - dayStdCost - dayAddCost;
  const sharedCost = dailyData.shared.reduce((acc: number, s: any) => acc + (s.amount || 0), 0);
  const dayOverallAfterShared = dayContribution - sharedCost;
  const dayUsedHrs = units.reduce((acc, u) => acc + (rowInputs[u.id]?.usedHours || 0), 0);
  const dayCapacityHrs = units.reduce((acc, u) => acc + (u.dailyCapacityHr || 9), 0);
  const dayCapacityPct = dayCapacityHrs > 0 ? Math.round((dayUsedHrs / dayCapacityHrs) * 100) : 0;

  // Final cards data depending on dashboardTimeframe
  const cardEarnedRevenue = isPeriodMode ? (analyticsData?.summary?.totalEarnedRevenue || 0) : dayEarnedRevenue;
  const cardTargetRevenue = isPeriodMode ? (analyticsData?.summary?.totalTargetRevenue || 0) : dayTargetRevenue;
  const cardContribution = isPeriodMode ? (analyticsData?.summary?.operationalContribution || 0) : dayContribution;
  const cardStdCost = isPeriodMode ? (analyticsData?.summary?.totalStandardCost || 0) : dayStdCost;
  const cardPostShared = isPeriodMode ? (analyticsData?.summary?.netOverallContribution || 0) : dayOverallAfterShared;
  const cardCapacityPct = isPeriodMode ? (analyticsData?.summary?.capacityUtilizationPct || 0) : dayCapacityPct;
  const cardUsedHrs = isPeriodMode ? (analyticsData?.summary?.totalHoursUtilized || 0) : dayUsedHrs;
  const cardCapacityHrs = isPeriodMode ? (analyticsData?.summary?.totalCapacityHours || 0) : dayCapacityHrs;

  const navItems = [
    { name: 'Dashboard', icon: DashboardIcon },
    { name: 'Weekly & Monthly Analysis', icon: TargetIcon },
    { name: 'What-If Calculator', icon: MagicWandIcon },
    { name: 'Job Profitability', icon: BarChartIcon },
    { name: 'Jobs and Forecast', icon: CalendarIcon },
    { name: 'Daily Actuals', icon: TableIcon },
    { name: 'Scenario Planner', icon: MixerHorizontalIcon },
    { name: 'Operating Units', icon: LayersIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      <Head>
        <title>Handy Squad | Housekeeping Economics</title>
      </Head>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-tight text-lg">
            <LayersIcon className="w-6 h-6" />
            <span>Handy Squad</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === item.name 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm font-semibold' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${activeTab === item.name ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">Adil (Admin)</p>
              <p className="text-[10px] text-slate-500">Live SQLite Database</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">{activeTab}</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-100">
              {units.length} Units Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddUnitModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" /> Add Team
            </button>
            <button
              onClick={() => setActiveTab('Job Profitability')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" /> Simulator
            </button>
          </div>
        </header>

        {/* Modal: Add New Team */}
        {showAddUnitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add Operating Team / Crew</h3>
                <button 
                  onClick={() => setShowAddUnitModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {unitError && (
                <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-lg border border-rose-200">
                  {unitError}
                </div>
              )}

              <form onSubmit={handleCreateUnit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Unit Type</label>
                  <select
                    value={newUnitForm.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="MAIN_TEAM">Main Deep-Cleaning Team (5 Staff)</option>
                    <option value="SMALL_CREW">Small-Job Crew (3 Staff / Sofa Shampoo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder={newUnitForm.type === 'MAIN_TEAM' ? 'Deep Cleaning Team 4' : 'Small Jobs Crew 3'}
                    value={newUnitForm.name}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, name: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Daily Target (₹)</label>
                    <input
                      type="number"
                      required
                      value={newUnitForm.dailyRevenueTarget}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, dailyRevenueTarget: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-indigo-950"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Standard Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={newUnitForm.standardDailyOperatingCost}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, standardDailyOperatingCost: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Staff Headcount</label>
                    <input
                      type="number"
                      required
                      value={newUnitForm.defaultHeadcount}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, defaultHeadcount: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Daily Capacity (Hrs)</label>
                    <input
                      type="number"
                      required
                      value={newUnitForm.dailyCapacityHr}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, dailyCapacityHr: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddUnitModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={unitSaving}
                    className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    {unitSaving ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dynamic Content Views */}
        <div className="flex-1 overflow-auto p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'Dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* TIMEFRAME SELECTOR & DATE CONTROLS BAR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Period:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setDashboardTimeframe('day')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        dashboardTimeframe === 'day'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      onClick={() => setDashboardTimeframe('week')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        dashboardTimeframe === 'week'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Week (7 Days)
                    </button>
                    <button
                      onClick={() => setDashboardTimeframe('custom')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        dashboardTimeframe === 'custom'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Selected Period (Range)
                    </button>
                  </div>
                </div>

                {/* Followed by Date Controls */}
                <div className="flex items-center gap-3">
                  {dashboardTimeframe === 'day' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600">Operating Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  )}

                  {dashboardTimeframe === 'week' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600">Week of Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                      <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                        {analyticsData ? `${analyticsData.startDate} → ${analyticsData.endDate} (7 Days)` : 'Week view'}
                      </span>
                    </div>
                  )}

                  {dashboardTimeframe === 'custom' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600">From:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                      />
                      <label className="text-xs font-semibold text-slate-600">To:</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                      />
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                        {analyticsData ? `${analyticsData.daysCount} Days Period` : 'Period view'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {isPeriodMode ? 'Period Earned vs Target' : 'Earned vs Target'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{formatINR(cardEarnedRevenue)}</span>
                    <span className="text-xs text-slate-400">/ {formatINR(cardTargetRevenue)}</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min((cardEarnedRevenue / (cardTargetRevenue || 1)) * 100, 100)}%` }} 
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {cardTargetRevenue > 0 ? Math.round((cardEarnedRevenue / cardTargetRevenue) * 100) : 0}% Target Realized
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {isPeriodMode ? 'Period Contribution' : 'Unit Operating Contribution'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${cardContribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatINR(cardContribution)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Net after {formatINR(cardStdCost)} fixed cost
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Post-Shared</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${cardPostShared >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatINR(cardPostShared)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Shared expenses: {formatINR(sharedCost)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity Utilization</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{cardCapacityPct}%</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {cardUsedHrs} / {cardCapacityHrs} capacity hours
                  </p>
                </div>
              </div>

              {/* In Period Mode (Week or Custom), Show the Interactive Line Chart right on Dashboard */}
              {isPeriodMode && analyticsData?.trendData && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Period Economic Trend (Line Chart)</h3>
                      <p className="text-xs text-slate-500">Track Earned Revenue, Daily Target benchmark, and Net Operational Contribution</p>
                    </div>
                  </div>
                  <TimelineLineChart data={analyticsData.trendData} />
                </div>
              )}

              {/* Units Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {isPeriodMode ? `Operating Units Economics (${dashboardTimeframe === 'week' ? 'Week View' : 'Selected Period'})` : 'Daily Operating Units Economics'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isPeriodMode 
                        ? `Aggregated metrics across ${analyticsData?.daysCount || 7} days (${analyticsData?.startDate || ''} to ${analyticsData?.endDate || ''})` 
                        : 'Editable daily actuals with instant contribution calculation'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddUnitModal(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> Add Team
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Operating Unit</th>
                        <th className="px-4 py-3 text-right">{isPeriodMode ? 'Period Target' : 'Daily Target'}</th>
                        <th className="px-4 py-3 text-right">{isPeriodMode ? 'Period Fixed Cost' : 'Fixed Cost'}</th>
                        <th className="px-4 py-3 text-right">{isPeriodMode ? 'Period Earned Revenue' : 'Earned Revenue (Edit)'}</th>
                        <th className="px-4 py-3 text-right">{isPeriodMode ? 'Period Addl Cost' : 'Addl Direct Cost'}</th>
                        <th className="px-4 py-3 text-right">Contribution</th>
                        <th className="px-4 py-3 text-center">{isPeriodMode ? 'Period Hours' : 'Hours (Cap)'}</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                      {units.map((unit) => {
                        if (isPeriodMode) {
                          // PERIOD MODE (WEEK / CUSTOM): Read from analytics breakdown
                          const uData = analyticsData?.unitBreakdown?.find((b: any) => b.unitId === unit.id);
                          const target = uData ? uData.targetRevenue : 0;
                          const fixedCost = uData ? uData.standardCost : 0;
                          const earned = uData ? uData.earnedRevenue : 0;
                          const addExp = uData ? uData.additionalCost : 0;
                          const contribution = uData ? uData.contribution : (earned - fixedCost - addExp);
                          const hours = uData ? uData.hoursUtilized : 0;
                          const capHrs = uData ? uData.capacityHours : 0;
                          const achPct = uData ? uData.achievementPct : 0;

                          return (
                            <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-900">{unit.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {unit.type === 'MAIN_TEAM' ? `Main Team (${unit.defaultHeadcount} pax)` : `Small Crew (${unit.defaultHeadcount} pax)`}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold text-slate-500">{formatINR(target)}</td>
                              <td className="px-4 py-3.5 text-right text-slate-500">{formatINR(fixedCost)}</td>
                              <td className="px-4 py-3.5 text-right font-bold text-slate-900">{formatINR(earned)}</td>
                              <td className="px-4 py-3.5 text-right text-slate-600">{formatINR(addExp)}</td>
                              <td className={`px-4 py-3.5 text-right font-bold ${contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatINR(contribution)}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="font-semibold text-slate-800">{hours} / {capHrs} hrs</span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  achPct >= 100 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : achPct >= 80 
                                      ? 'bg-indigo-100 text-indigo-800' 
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {achPct}% Achieved
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        // SINGLE DAY MODE: Live editable actuals
                        const currentInputs = rowInputs[unit.id] || { earnedRevenue: 0, additionalDirectExpenses: 0, usedHours: 0 };
                        const target = unit.standards?.[0]?.dailyRevenueTarget || (unit.type === 'MAIN_TEAM' ? 15000 : 10000);
                        const fixedCost = unit.standards?.[0]?.standardDailyOperatingCost || (unit.type === 'MAIN_TEAM' ? 8000 : 5500);
                        const earned = currentInputs.earnedRevenue;
                        const addExp = currentInputs.additionalDirectExpenses;
                        const hours = currentInputs.usedHours;
                        const contribution = earned - fixedCost - addExp;
                        const rec = dailyData.records.find((r: any) => r.unitId === unit.id);

                        return (
                          <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-900">{unit.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {unit.type === 'MAIN_TEAM' ? `Main Team (${unit.defaultHeadcount} pax)` : `Small Crew (${unit.defaultHeadcount} pax)`}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-500">{formatINR(target)}</td>
                            <td className="px-4 py-3.5 text-right text-slate-500">{formatINR(fixedCost)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <input
                                type="number"
                                value={earned}
                                onChange={(e) => handleInputChange(unit.id, 'earnedRevenue', Number(e.target.value))}
                                onBlur={() => saveDailyRecord(unit.id)}
                                className="w-24 text-right border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 text-xs bg-white"
                              />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <input
                                type="number"
                                value={addExp}
                                onChange={(e) => handleInputChange(unit.id, 'additionalDirectExpenses', Number(e.target.value))}
                                onBlur={() => saveDailyRecord(unit.id)}
                                className="w-20 text-right border border-slate-300 rounded px-2 py-1 text-slate-700 focus:ring-1 focus:ring-indigo-500 text-xs bg-white"
                              />
                            </td>
                            <td className={`px-4 py-3.5 text-right font-bold ${contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatINR(contribution)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="number"
                                value={hours}
                                onChange={(e) => handleInputChange(unit.id, 'usedHours', Number(e.target.value))}
                                onBlur={() => saveDailyRecord(unit.id)}
                                className="w-14 text-center border border-slate-300 rounded px-1.5 py-1 text-slate-700 text-xs bg-white"
                              />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => toggleFinalize(unit.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded ${
                                  rec?.finalized 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                              >
                                {rec?.finalized ? 'Finalized' : 'Provisional'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WEEKLY & MONTHLY ANALYSIS DASHBOARD */}
          {activeTab === 'Weekly & Monthly Analysis' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header Filter Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  {/* Period Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setAnalyticsPeriod('weekly')}
                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                        analyticsPeriod === 'weekly'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Weekly Analysis (7 Days)
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('monthly')}
                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                        analyticsPeriod === 'monthly'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly Analysis (Calendar Month)
                    </button>
                  </div>

                  {/* Scope / Team Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Scope:</label>
                    <select
                      value={analyticsUnitId}
                      onChange={(e) => setAnalyticsUnitId(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Overall Operation (All {units.length} Units)</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.type === 'MAIN_TEAM' ? 'Main Team' : 'Small Crew'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Reference & CSV Export */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Date Window</span>
                    <span className="text-xs font-bold text-slate-900">
                      {analyticsData ? `${analyticsData.startDate} → ${analyticsData.endDate}` : 'Loading...'}
                    </span>
                  </div>
                  <button
                    onClick={exportAnalyticsCSV}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <DownloadIcon className="w-4 h-4" /> Export CSV Report
                  </button>
                </div>
              </div>

              {/* Executive Summary Cards */}
              {analyticsData && analyticsData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  {/* Revenue vs Target */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Earned vs Target</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analyticsData.summary.revenueVariance >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {analyticsData.summary.targetAchievementPct}% Target
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900">{formatINR(analyticsData.summary.totalEarnedRevenue)}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">Target: {formatINR(analyticsData.summary.totalTargetRevenue)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          analyticsData.summary.targetAchievementPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(analyticsData.summary.targetAchievementPct, 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Variance:</span>
                      <span className={`font-bold ${analyticsData.summary.revenueVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {analyticsData.summary.revenueVariance >= 0 ? '+' : ''}{formatINR(analyticsData.summary.revenueVariance)}
                      </span>
                    </div>
                  </div>

                  {/* Operational Contribution */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Contribution</span>
                    <div>
                      <span className={`text-2xl font-black ${analyticsData.summary.operationalContribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatINR(analyticsData.summary.operationalContribution)}
                      </span>
                      {analyticsUnitId === 'all' && (
                        <span className="text-xs text-slate-500 block mt-0.5">
                          Post-Shared: <span className="font-bold text-slate-800">{formatINR(analyticsData.summary.netOverallContribution)}</span>
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Standard Fixed Cost:</span>
                        <span className="font-semibold text-slate-800">{formatINR(analyticsData.summary.totalStandardCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Direct Expenses:</span>
                        <span className="font-semibold text-slate-800">{formatINR(analyticsData.summary.totalAdditionalCost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Utilization */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity Utilization</span>
                    <div>
                      <span className="text-2xl font-black text-slate-900">{analyticsData.summary.capacityUtilizationPct}%</span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {analyticsData.summary.totalHoursUtilized} / {analyticsData.summary.totalCapacityHours} total hours
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          analyticsData.summary.capacityUtilizationPct > 90 
                            ? 'bg-rose-500' 
                            : analyticsData.summary.capacityUtilizationPct > 70 
                              ? 'bg-emerald-500' 
                              : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(analyticsData.summary.capacityUtilizationPct, 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Unused Capacity:</span>
                      <span className="font-bold text-slate-700">
                        {Math.max(0, analyticsData.summary.totalCapacityHours - analyticsData.summary.totalHoursUtilized)} hrs
                      </span>
                    </div>
                  </div>

                  {/* Revenue / Hour & Collections */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hourly Realization</span>
                    <div>
                      <span className="text-2xl font-black text-indigo-600">{formatINR(analyticsData.summary.revenuePerHour)}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">per utilized working hour</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Contribution / Hr:</span>
                        <span className="font-bold text-slate-800">{formatINR(analyticsData.summary.contributionPerHour)}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash Collected:</span>
                        <span className="font-semibold text-emerald-600">{formatINR(analyticsData.summary.totalCollections)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding:</span>
                        <span className="font-semibold text-rose-600">{formatINR(analyticsData.summary.totalOutstanding)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TIMELINE PERFORMANCE SECTION: LINE CHART WITH TOGGLE */}
              {analyticsData && analyticsData.trendData && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Timeline Performance (Day by Day)</h3>
                      <p className="text-xs text-slate-500">Interactive trend tracking: Earned Revenue, Daily Target benchmark, and Net Contribution</p>
                    </div>

                    {/* Chart Style Toggle: Line Chart vs Cards Grid */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setTimelineChartType('line')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          timelineChartType === 'line'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📈 Line Chart
                      </button>
                      <button
                        onClick={() => setTimelineChartType('cards')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          timelineChartType === 'cards'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📊 Daily Cards
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Interactive Line Chart */}
                  {timelineChartType === 'line' ? (
                    <TimelineLineChart data={analyticsData.trendData} />
                  ) : (
                    /* Mode 2: Daily Cards Grid */
                    <div className="grid grid-cols-7 gap-3 pt-2">
                      {analyticsData.trendData.map((d: any, idx: number) => {
                        const maxVal = Math.max(d.targetRevenue, d.earnedRevenue, 1);
                        const earnHeight = Math.min(Math.round((d.earnedRevenue / maxVal) * 100), 100);
                        const targetHeight = Math.min(Math.round((d.targetRevenue / maxVal) * 100), 100);

                        return (
                          <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                            <div className="text-center">
                              <span className="text-[11px] font-bold text-slate-800 block">{d.dayName}</span>
                              <span className="text-[10px] text-slate-400 block">{d.date}</span>
                            </div>

                            <div className="h-28 flex items-end justify-center gap-2 pt-2">
                              <div className="w-4 bg-slate-200 rounded-t transition-all" style={{ height: `${targetHeight}%` }} title={`Target: ${formatINR(d.targetRevenue)}`} />
                              <div className="w-4 bg-indigo-600 rounded-t transition-all" style={{ height: `${earnHeight}%` }} title={`Earned: ${formatINR(d.earnedRevenue)}`} />
                            </div>

                            <div className="text-center border-t border-slate-200 pt-1.5">
                              <span className="text-[10px] text-slate-500 block">Earned: <span className="font-bold text-slate-800">{formatINR(d.earnedRevenue)}</span></span>
                              <span className={`text-[10px] font-bold block ${d.contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                Contrib: {formatINR(d.contribution)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Team-by-Team Comparison Table (When viewing Overall) */}
              {analyticsUnitId === 'all' && analyticsData && analyticsData.unitBreakdown && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Operating Units Performance Comparison</h3>
                      <p className="text-xs text-slate-500">Side-by-side economics for all teams over this {analyticsPeriod}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Operating Unit</th>
                          <th className="px-4 py-3 text-right">Target Revenue</th>
                          <th className="px-4 py-3 text-right">Earned Revenue</th>
                          <th className="px-4 py-3 text-center">Achievement</th>
                          <th className="px-4 py-3 text-right">Fixed Cost</th>
                          <th className="px-4 py-3 text-right">Direct Costs</th>
                          <th className="px-4 py-3 text-right">Contribution</th>
                          <th className="px-4 py-3 text-center">Capacity Util</th>
                          <th className="px-4 py-3 text-right">Rev / Hour</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                        {analyticsData.unitBreakdown.map((u: any) => (
                          <tr key={u.unitId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-900">{u.unitName}</div>
                              <div className="text-[10px] text-slate-400">
                                {u.unitType === 'MAIN_TEAM' ? 'Main Team (5 staff)' : 'Small Crew (3 staff)'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-500">{formatINR(u.targetRevenue)}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-slate-900">{formatINR(u.earnedRevenue)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.achievementPct >= 100 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : u.achievementPct >= 80 
                                    ? 'bg-indigo-100 text-indigo-800' 
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {u.achievementPct}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-500">{formatINR(u.standardCost)}</td>
                            <td className="px-4 py-3.5 text-right text-slate-600">{formatINR(u.additionalCost)}</td>
                            <td className={`px-4 py-3.5 text-right font-bold ${u.contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatINR(u.contribution)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-bold">{u.utilizationPct}%</span>
                                <div className="w-12 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                                  <div 
                                    className={`h-1.5 rounded-full ${u.utilizationPct > 80 ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                    style={{ width: `${Math.min(u.utilizationPct, 100)}%` }} 
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 block">{u.hoursUtilized}/{u.capacityHours} hrs</span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-indigo-600">
                              {formatINR(Math.round(u.revenuePerHour))}/hr
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: WHAT-IF CALCULATOR */}
          {activeTab === 'What-If Calculator' && (
            <WhatIfCalculator units={units} />
          )}

          {/* TAB 2: JOB PROFITABILITY SIMULATOR */}
          {activeTab === 'Job Profitability' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Input Column */}
              <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Job Profitability Simulator</h2>
                    <p className="text-xs text-slate-500">Model revenue, costs, fixed allocation, and manpower</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded">
                    Decision Support
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Assigned Operating Unit</label>
                    <select
                      value={simForm.unitId}
                      onChange={(e) => setSimForm({ ...simForm, unitId: e.target.value })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.type === 'MAIN_TEAM' ? '₹8,000 std' : '₹5,500 std'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Job Reference / Title</label>
                    <input
                      type="text"
                      value={simForm.title}
                      onChange={(e) => setSimForm({ ...simForm, title: e.target.value })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Proposed Revenue (₹)</label>
                    <input
                      type="number"
                      value={simForm.expectedRevenue}
                      onChange={(e) => setSimForm({ ...simForm, expectedRevenue: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={simForm.durationHr}
                      onChange={(e) => setSimForm({ ...simForm, durationHr: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Travel/Setup (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={simForm.travelHr}
                      onChange={(e) => setSimForm({ ...simForm, travelHr: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Additional Manpower & Overtime</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Outside Helpers (Count)</label>
                      <input
                        type="number"
                        value={simForm.outsideManpowerCount}
                        onChange={(e) => setSimForm({ ...simForm, outsideManpowerCount: Number(e.target.value) })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Rate per Helper (₹1,000 std)</label>
                      <input
                        type="number"
                        value={simForm.outsideManpowerRate}
                        onChange={(e) => setSimForm({ ...simForm, outsideManpowerRate: Number(e.target.value) })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded p-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Overtime Staff</label>
                      <input
                        type="number"
                        value={simForm.overtimeHeadcount}
                        onChange={(e) => setSimForm({ ...simForm, overtimeHeadcount: Number(e.target.value) })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">OT Hours/Pax</label>
                      <input
                        type="number"
                        value={simForm.overtimeHoursPerPerson}
                        onChange={(e) => setSimForm({ ...simForm, overtimeHoursPerPerson: Number(e.target.value) })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">OT Rate/Hour (₹100)</label>
                      <input
                        type="number"
                        value={simForm.overtimeRate}
                        onChange={(e) => setSimForm({ ...simForm, overtimeRate: Number(e.target.value) })}
                        className="mt-1 w-full text-xs border border-slate-300 rounded p-1.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Estimated Materials (₹)</label>
                    <input
                      type="number"
                      value={simForm.materialsCost}
                      onChange={(e) => setSimForm({ ...simForm, materialsCost: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Other Direct Expenses (₹)</label>
                    <input
                      type="number"
                      value={simForm.otherExpenses}
                      onChange={(e) => setSimForm({ ...simForm, otherExpenses: Number(e.target.value) })}
                      className="mt-1 w-full text-xs border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleSaveJob}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition"
                  >
                    Save as Proposed Job in Schedule
                  </button>
                  {simMessage && <span className="text-xs font-semibold text-emerald-600">{simMessage}</span>}
                </div>
              </div>

              {/* Real-time Economic Results Card */}
              <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-xl shadow-lg space-y-6 flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Economic Breakdown</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      simResult?.jobContribution >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {simResult?.jobContribution >= 0 ? 'Profitable' : 'Loss Warning'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-4 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Proposed Revenue:</span>
                      <span className="text-sm font-bold text-white">{formatINR(simResult?.expectedRevenue || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-t border-slate-800">
                      <span className="text-slate-400">Allocated Fixed Cost:</span>
                      <span className="text-slate-200">{formatINR(simResult?.allocatedFixedCost || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Additional Costs:</span>
                      <span className="text-slate-200">{formatINR(simResult?.additionalCostsBreakdown?.totalAdditional || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 text-slate-400 text-[11px] pl-3">
                      <span>• Manpower: {formatINR(simResult?.additionalCostsBreakdown?.outsideManpower || 0)}</span>
                      <span>• Overtime: {formatINR(simResult?.additionalCostsBreakdown?.overtime || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-slate-800 font-bold text-slate-300">
                      <span>Total Modeled Cost:</span>
                      <span>{formatINR(simResult?.totalModeledCost || 0)}</span>
                    </div>

                    {/* Contribution Highlight */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-semibold uppercase">Job Contribution</span>
                        <span className={`text-xl font-black ${simResult?.jobContribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatINR(simResult?.jobContribution || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-semibold uppercase">Margin</span>
                        <span className="text-sm font-bold text-slate-200">
                          {Math.round(simResult?.contributionMarginPct || 0)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-800/60 p-3 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Contribution / Hr</span>
                        <span className="text-sm font-bold text-indigo-300">
                          {formatINR(simResult?.contributionPerHour || 0)} / hr
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Break-even Price</span>
                        <span className="text-sm font-bold text-amber-300">
                          {formatINR(simResult?.breakEvenPrice || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Over-Capacity and Benchmark Warnings */}
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  {simResult?.capacityMetrics?.hasCapacityWarning && (
                    <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs p-2.5 rounded flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-400" />
                      <span>Capacity warning: Exceeds 9h standard workday by {simResult?.capacityMetrics?.overCapacityHours} hrs.</span>
                    </div>
                  )}

                  {simForm.outsideManpowerCount > 0 && (
                    <div className={`p-2.5 rounded text-xs border ${
                      simResult?.additionalTechnicianBenchmark?.meetsBenchmark 
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                        : 'bg-amber-950/80 border-amber-800 text-amber-300'
                    }`}>
                      <span className="font-bold">Technician Benchmark (₹2,000/helper):</span>{' '}
                      {simResult?.additionalTechnicianBenchmark?.meetsBenchmark
                        ? 'Meets expectation threshold.'
                        : `Shortfall against benchmark expectation.`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: JOBS AND FORECAST */}
          {activeTab === 'Jobs and Forecast' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Job Schedule & Forecast Register</h2>
                  <p className="text-xs text-slate-500">Live persistence with SQLite. Change status or remove jobs.</p>
                </div>
                <button
                  onClick={() => setActiveTab('Job Profitability')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  + Add Job via Simulator
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Job Reference</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3 text-right">Expected Rev</th>
                      <th className="px-4 py-3 text-right">Earned Rev</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                    {jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{j.title}</div>
                          <div className="text-[10px] text-slate-400">{j.customerRef || 'No Client Ref'}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{j.unit?.name || 'Unassigned'}</td>
                        <td className="px-4 py-3.5 text-right font-semibold">{formatINR(j.expectedRevenue)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-indigo-600">{formatINR(j.earnedRevenue || 0)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <select
                            value={j.status}
                            onChange={(e) => updateJobStatus(j.id, e.target.value)}
                            className="text-xs font-bold border border-slate-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="TENTATIVE">TENTATIVE</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => deleteJob(j.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded"
                            title="Delete Job"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                          No jobs scheduled. Use the Job Simulator to add one!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DAILY ACTUALS */}
          {activeTab === 'Daily Actuals' && (
            <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Daily Closeout & Reconciliation</h2>
                  <p className="text-xs text-slate-500">Record final earned figures and finalize the day for records.</p>
                </div>
                <span className="text-xs font-bold text-slate-600">Selected: {selectedDate}</span>
              </div>

              <div className="space-y-4">
                {units.map((unit) => {
                  const rec = dailyData.records.find((r: any) => r.unitId === unit.id);
                  const fixedCost = unit.standards?.[0]?.standardDailyOperatingCost || (unit.type === 'MAIN_TEAM' ? 8000 : 5500);
                  const currentInputs = rowInputs[unit.id] || { earnedRevenue: 0, additionalDirectExpenses: 0, usedHours: 0 };

                  return (
                    <div key={unit.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{unit.name}</h4>
                        <span className="text-[10px] text-slate-500">Fixed Cost: {formatINR(fixedCost)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Earned Rev (₹)</label>
                          <input
                            type="number"
                            value={currentInputs.earnedRevenue}
                            onChange={(e) => handleInputChange(unit.id, 'earnedRevenue', Number(e.target.value))}
                            onBlur={() => saveDailyRecord(unit.id)}
                            className="w-24 border border-slate-300 rounded px-2 py-1 font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Direct Expenses (₹)</label>
                          <input
                            type="number"
                            value={currentInputs.additionalDirectExpenses}
                            onChange={(e) => handleInputChange(unit.id, 'additionalDirectExpenses', Number(e.target.value))}
                            onBlur={() => saveDailyRecord(unit.id)}
                            className="w-24 border border-slate-300 rounded px-2 py-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Hours</label>
                          <input
                            type="number"
                            value={currentInputs.usedHours}
                            onChange={(e) => handleInputChange(unit.id, 'usedHours', Number(e.target.value))}
                            onBlur={() => saveDailyRecord(unit.id)}
                            className="w-16 border border-slate-300 rounded px-2 py-1 text-center bg-white"
                          />
                        </div>
                        <button
                          onClick={() => toggleFinalize(unit.id)}
                          className={`mt-3 text-xs font-bold px-3 py-1.5 rounded ${
                            rec?.finalized ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {rec?.finalized ? 'Finalized ✓' : 'Mark Final'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: SCENARIO PLANNER */}
          {activeTab === 'Scenario Planner' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Monthly Financial Scenario Planner</h2>
                  <p className="text-xs text-slate-500">Test different operating days and target variations without touching real data.</p>
                </div>

                <div className="grid grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Operating Days / Month: {scenarioDays}</label>
                    <input
                      type="range"
                      min="20"
                      max="30"
                      value={scenarioDays}
                      onChange={(e) => setScenarioDays(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Revenue Target Multiplier: {(scenarioTargetMod * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.05"
                      value={scenarioTargetMod}
                      onChange={(e) => setScenarioTargetMod(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">Cost Inflation Multiplier: {(scenarioCostMod * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.05"
                      value={scenarioCostMod}
                      onChange={(e) => setScenarioCostMod(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                </div>

                {/* Scenario Outputs vs Baseline */}
                {(() => {
                  const baseTarget = 65000 * scenarioDays;
                  const baseCost = 35000 * scenarioDays;
                  const baseContrib = baseTarget - baseCost;

                  const scenTarget = 65000 * scenarioTargetMod * scenarioDays;
                  const scenCost = 35000 * scenarioCostMod * scenarioDays;
                  const scenContrib = scenTarget - scenCost;

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[11px] text-slate-500 block font-semibold uppercase">Projected Monthly Revenue</span>
                        <span className="text-xl font-bold text-slate-900">{formatINR(scenTarget)}</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Baseline: {formatINR(baseTarget)}</span>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[11px] text-slate-500 block font-semibold uppercase">Projected Monthly Costs</span>
                        <span className="text-xl font-bold text-slate-900">{formatINR(scenCost)}</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Baseline: {formatINR(baseCost)}</span>
                      </div>

                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <span className="text-[11px] text-indigo-700 block font-semibold uppercase">Projected Monthly Contribution</span>
                        <span className="text-xl font-black text-indigo-900">{formatINR(scenContrib)}</span>
                        <span className="text-[10px] text-indigo-600 block mt-1">Variance: {formatINR(scenContrib - baseContrib)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 6: OPERATING UNITS */}
          {activeTab === 'Operating Units' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Operating Units Standards ({units.length} Units Active)</h2>
                  <p className="text-xs text-slate-500">Configure targets, daily operating costs, headcounts, or create new teams.</p>
                </div>
                <button
                  onClick={() => setShowAddUnitModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" /> Add New Team / Crew
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {units.map((u) => (
                  <div key={u.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{u.name}</h3>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                          {u.type === 'MAIN_TEAM' ? 'Main Deep-Cleaning Team' : 'Small-Job Crew'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeactivateUnit(u.id, u.name)}
                        className="text-slate-400 hover:text-rose-600 text-xs p-1"
                        title="Deactivate Team"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-medium">Daily Revenue Target</span>
                        <span className="text-sm font-bold text-indigo-950">
                          {formatINR(u.standards?.[0]?.dailyRevenueTarget || (u.type === 'MAIN_TEAM' ? 15000 : 10000))}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-medium">Standard Daily Cost</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatINR(u.standards?.[0]?.standardDailyOperatingCost || (u.type === 'MAIN_TEAM' ? 8000 : 5500))}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-medium">Staff Headcount</span>
                        <span className="text-sm font-bold text-slate-800">{u.defaultHeadcount} staff</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-medium">Daily Capacity</span>
                        <span className="text-sm font-bold text-slate-800">{u.dailyCapacityHr} hours</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
