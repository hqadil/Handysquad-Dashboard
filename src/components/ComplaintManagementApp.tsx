// src/components/ComplaintManagementApp.tsx
// HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 1 & 2 APPLICATION CORE)

import React, { useState, useEffect, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TargetIcon,
  LayersIcon,
  CalendarIcon,
  BarChartIcon,
  TableIcon,
  GearIcon,
  FileTextIcon,
  MixerHorizontalIcon,
  InfoCircledIcon,
  PersonIcon,
  ArchiveIcon,
  ClockIcon
} from '@radix-ui/react-icons';
import { 
  Complaint, 
  ComplaintCategory, 
  ComplaintSeverity, 
  ComplaintStatus, 
  KeralaCity, 
  ServiceType,
  ComplaintDashboardSummary,
  Employee
} from '../types/complaints';
import { fetchComplaints, computeComplaintDashboardSummary, fetchEmployees } from '../lib/complaintsService';
import { formatINR } from '../lib/finance';

interface ComplaintManagementAppProps {
  onSwitchToEconomicCalculator: () => void;
}

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  PROCESS_ISSUE: 'Process & Protocol Issue',
  DAMAGE_ISSUE: 'Surface / Property Damage',
  SKILL_ISSUE: 'Workmanship / Skill Gap',
  SCOPE_CONFUSION: 'Scope & Booking Confusion',
  MACHINE_ISSUE: 'Equipment / Machine Failure',
  LATE_START: 'Late Arrival / Delayed Start',
  LATE_COMPLETION: 'Late Completion / Overrun',
  SCOPE_MISSED: 'Missed Cleaning Areas',
  CUSTOMER_EXPERIENCE: 'Staff Demeanor & Experience',
  COMPANY_GOODWILL_DECISION: 'Company Goodwill Decision',
};

const SEVERITY_COLORS: Record<ComplaintSeverity, { text: string; bg: string; border: string }> = {
  MINOR: { text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  MODERATE: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  MAJOR: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  CRITICAL: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const STATUS_BADGES: Record<ComplaintStatus, { label: string; bg: string; text: string }> = {
  REGISTERED: { label: 'Registered', bg: 'bg-blue-50', text: 'text-blue-700' },
  INVESTIGATION_PENDING: { label: 'Investigation Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  EVIDENCE_REVIEW: { label: 'Evidence Review', bg: 'bg-purple-50', text: 'text-purple-700' },
  ASSESSMENT_COMPLETED: { label: 'Assessed', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  APPROVAL_PENDING: { label: 'Approval Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
  CORRECTIVE_ACTION_REQUIRED: { label: 'Action Required', bg: 'bg-orange-50', text: 'text-orange-700' },
  REWORK_IN_PROGRESS: { label: 'Rework In Progress', bg: 'bg-rose-50', text: 'text-rose-700' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-600' },
};

export default function ComplaintManagementApp({ onSwitchToEconomicCalculator }: ComplaintManagementAppProps) {
  // Navigation Section
  const [activeSubTab, setActiveSubTab] = useState<
    'Dashboard' | 'Register' | 'Detail' | 'Evidence' | 'Approvals' | 'Employees' | 'Financial' | 'Rules'
  >('Dashboard');

  // Complaints Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<ComplaintDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Complaint for Deep Inspection Drawer
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Register Complaint Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState<{
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: KeralaCity;
    serviceType: ServiceType;
    jobDate: string;
    jobValue: number;
    category: ComplaintCategory;
    severity: ComplaintSeverity;
    title: string;
    description: string;
    preServiceChecklistDone: boolean;
    postServiceSignoffDone: boolean;
    beforePhotosAvailable: boolean;
    afterPhotosAvailable: boolean;
    workOrderVerified: boolean;
  }>({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    city: 'Kochi',
    serviceType: 'DEEP_CLEANING',
    jobDate: new Date().toISOString().split('T')[0],
    jobValue: 8500,
    category: 'DAMAGE_ISSUE',
    severity: 'MODERATE',
    title: '',
    description: '',
    preServiceChecklistDone: false,
    postServiceSignoffDone: false,
    beforePhotosAvailable: false,
    afterPhotosAvailable: false,
    workOrderVerified: true,
  });

  // Load Complaints & Employees
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [complaintsData, employeesData] = await Promise.all([
          fetchComplaints({
            city: selectedCity !== 'ALL' ? selectedCity : undefined,
            category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
            severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
            status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
            searchQuery: searchQuery || undefined,
          }),
          fetchEmployees(),
        ]);
        setComplaints(complaintsData);
        setEmployees(employeesData);
        const summ = await computeComplaintDashboardSummary(complaintsData);
        setSummary(summ);
      } catch (err) {
        console.error('Failed to load complaint data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCity, selectedCategory, selectedSeverity, selectedStatus, searchQuery]);

  // Handle Register Complaint Submission
  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (data.complaint) {
        setComplaints([data.complaint, ...complaints]);
        setShowRegisterModal(false);
        setNewForm({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          city: 'Kochi',
          serviceType: 'DEEP_CLEANING',
          jobDate: new Date().toISOString().split('T')[0],
          jobValue: 8500,
          category: 'DAMAGE_ISSUE',
          severity: 'MODERATE',
          title: '',
          description: '',
          preServiceChecklistDone: false,
          postServiceSignoffDone: false,
          beforePhotosAvailable: false,
          afterPhotosAvailable: false,
          workOrderVerified: true,
        });
        alert(`Complaint Registered Successfully! Ticket: ${data.complaint.complaintNumber}`);
      }
    } catch (err) {
      alert('Failed to register complaint. Check console.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const navSections = [
    { id: 'Dashboard', label: 'Management Dashboard', icon: BarChartIcon },
    { id: 'Register', label: 'Complaint Register', icon: TableIcon },
    { id: 'Approvals', label: 'Approval Centre', icon: TargetIcon },
    { id: 'Employees', label: 'Employee Tracker', icon: PersonIcon },
    { id: 'Financial', label: 'Financial Impact', icon: MixerHorizontalIcon },
    { id: 'Rules', label: 'Rules & Governance', icon: GearIcon },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Banner Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-extrabold text-slate-900 tracking-tight">Handy Squad Complaints Hub</span>
          </div>
          <span className="text-xs text-slate-400">· Kerala Operations (Kochi, TVM, Kozhikode, Thrissur)</span>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {navSections.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Register Complaint</span>
          </button>
        </div>
      </div>

      {/* Main Sub-Tab Workspace */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* SUB-TAB 1: MANAGEMENT DASHBOARD */}
        {activeSubTab === 'Dashboard' && summary && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Top KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {/* Card 1: Total & Open Complaints */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint Volume</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{summary.openComplaints}</span>
                  <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Open / Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Lifetime Registered:</span>
                  <span className="font-bold text-slate-700">{summary.totalComplaints} total</span>
                </div>
              </div>

              {/* Card 2: Financial Loss & Rework */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Loss & Rework</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-600">{formatINR(summary.totalVerifiedLoss)}</span>
                  <span className="text-[10px] text-slate-400">Verified Loss</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Estimated Pending:</span>
                  <span className="font-bold text-amber-600">{formatINR(summary.totalEstimatedLoss)}</span>
                </div>
              </div>

              {/* Card 3: Pending Approvals & Critical */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical & Overdue</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600">{summary.criticalCases}</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    High / Critical
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Pending Approvals:</span>
                  <span className="font-bold text-slate-800">{summary.pendingApprovals} cases</span>
                </div>
              </div>

              {/* Card 4: Documentation Compliance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documentation Check</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600">{summary.documentationCompliancePct}%</span>
                  <span className="text-[10px] text-slate-400">SOP Compliance</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${summary.documentationCompliancePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Before/After photos & work orders verified</p>
              </div>
            </div>

            {/* City & Category Distribution Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kerala City Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900">Complaints by Kerala Hub City</h3>
                  <span className="text-xs text-slate-400">Active regional breakdown</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(summary.cityCounts).map(([city, count]) => {
                    const pct = summary.totalComplaints > 0 ? Math.round((count / summary.totalComplaints) * 100) : 0;
                    return (
                      <div key={city} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700">{city}</span>
                          <span className="text-slate-900 font-bold">{count} cases ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 10 Complaint Categories Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900">Category Distribution (10 Core Types)</h3>
                  <span className="text-xs text-slate-400">Root-cause clustering</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(summary.categoryCounts).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-medium text-slate-700">{CATEGORY_LABELS[cat as ComplaintCategory] || cat}</span>
                      <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Critical Complaints Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Priority Complaints</h3>
                  <p className="text-xs text-slate-500">Live operational queue requiring investigation or action</p>
                </div>
                <button
                  onClick={() => setActiveSubTab('Register')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View Full Register ({complaints.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {complaints.slice(0, 4).map((c) => {
                  const sev = SEVERITY_COLORS[c.severity];
                  const st = STATUS_BADGES[c.status];
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedComplaint(c)}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-700">{c.complaintNumber}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                            {c.severity}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                          <span className="text-[10px] text-slate-400">· {c.city}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{c.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 block">{c.customerName}</span>
                        <span className="text-[10px] text-slate-400 block">{c.customerPhone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: COMPLAINT REGISTER (TABLE & FILTERS) */}
        {activeSubTab === 'Register' && (
          <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ticket, client, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl w-full outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* City Filter */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 outline-none bg-white"
                >
                  <option value="ALL">All Kerala Cities</option>
                  <option value="Kochi">Kochi</option>
                  <option value="Trivandrum">Trivandrum</option>
                  <option value="Kozhikode">Kozhikode</option>
                  <option value="Thrissur">Thrissur</option>
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 outline-none bg-white"
                >
                  <option value="ALL">All 10 Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                    <option key={cat} value={cat}>{label}</option>
                  ))}
                </select>

                {/* Severity Filter */}
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 outline-none bg-white"
                >
                  <option value="ALL">All Severities</option>
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 outline-none bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  {Object.entries(STATUS_BADGES).map(([st, badge]) => (
                    <option key={st} value={st}>{badge.label}</option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-slate-500">{complaints.length} Complaints Displayed</span>
            </div>

            {/* Complaints Master Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Ticket #</th>
                      <th className="px-4 py-3">Customer & Location</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Severity</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Investigator</th>
                      <th className="px-4 py-3 text-right">Job Value</th>
                      <th className="px-4 py-3 text-center">SOP Docs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                    {complaints.map((c) => {
                      const sev = SEVERITY_COLORS[c.severity];
                      const st = STATUS_BADGES[c.status];
                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => setSelectedComplaint(c)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-mono font-bold text-indigo-700">
                            {c.complaintNumber}
                            <span className="text-[10px] text-slate-400 block font-normal font-sans">
                              {new Date(c.reportingDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">{c.customerName}</span>
                            <span className="text-[10px] text-slate-400 block">{c.city} · {c.customerPhone}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                              {CATEGORY_LABELS[c.category] || c.category}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{c.serviceType.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                              {c.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {c.assignedInvestigatorName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatINR(c.jobValue)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.preServiceChecklistDone && c.workOrderVerified ? (
                              <span className="text-emerald-600 font-bold text-[10px] flex items-center justify-center gap-1">
                                <CheckCircledIcon className="w-3.5 h-3.5" /> Complete
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold text-[10px] flex items-center justify-center gap-1">
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Gaps
                              </span>
                            )}
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

        {/* SUB-TAB 4: EMPLOYEES & TRAINING */}
        {activeSubTab === 'Employees' && (
          <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kerala Technicians & Supervisors Directory</h3>
                <p className="text-xs text-slate-500">Track substantiated complaint findings vs allegations, and training certifications</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{employees.length} Staff Enrolled</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-700">{emp.employeeCode}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {emp.city}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{emp.fullName}</h4>
                      <p className="text-xs text-slate-500">{emp.designation.replace(/_/g, ' ')} · {emp.primaryPhone}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      emp.trainingStatus === 'UP_TO_DATE' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {emp.trainingStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Hire Date:</span>
                      <span className="font-semibold text-slate-700">{emp.hireDate}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Status:</span>
                      <span className="font-bold text-emerald-700">{emp.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 6: RULES & GOVERNANCE */}
        {activeSubTab === 'Rules' && (
          <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900">Handy Squad Responsibility Governance Rules</h3>
              <p className="text-xs text-slate-500">Configured evaluation criteria and mandatory evidence standards across all 10 categories</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(CATEGORY_LABELS).map(([cat, title]) => (
                <div key={cat} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {cat}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Standard protocol requires strict before/after photographic documentation, pre-service inspection checklist, and work order alignment.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                    <span>Default Absorption: Company 100%</span>
                    <span>Approval Authority: Operations Manager / COO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: FINANCIAL IMPACT */}
        {activeSubTab === 'Financial' && summary && (
          <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Complaint Cost & Financial Exposure Ledger</h3>
              <p className="text-xs text-slate-500">Segregation of verified company loss, rework expenses, client compensation vouchers, and employee adjustments</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 block">Verified Company Absorption</span>
                  <span className="text-2xl font-black text-rose-800 mt-1 block">{formatINR(summary.totalVerifiedLoss)}</span>
                  <span className="text-[10px] text-rose-600 block mt-1">Paid directly by Handy Squad</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-amber-700 block">Estimated Pending Rectification</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">{formatINR(summary.totalEstimatedLoss)}</span>
                  <span className="text-[10px] text-amber-600 block mt-1">Under investigation or vendor quote</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 block">Rework & Rectifications</span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">{summary.reworkCount} Jobs</span>
                  <span className="text-[10px] text-emerald-600 block mt-1">Free rework passes to ensure client delight</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTER NEW COMPLAINT */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Customer Complaint</h3>
                <p className="text-xs text-slate-500">Record complaint details for investigation and root cause analysis</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterComplaint} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathew Varghese"
                    value={newForm.customerName}
                    onChange={(e) => setNewForm({ ...newForm, customerName: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98470 12345"
                    value={newForm.customerPhone}
                    onChange={(e) => setNewForm({ ...newForm, customerPhone: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Kerala City *</label>
                  <select
                    value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value as KeralaCity })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                  >
                    <option value="Kochi">Kochi</option>
                    <option value="Trivandrum">Trivandrum</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Thrissur">Thrissur</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Service Type *</label>
                  <select
                    value={newForm.serviceType}
                    onChange={(e) => setNewForm({ ...newForm, serviceType: e.target.value as ServiceType })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium bg-white"
                  >
                    <option value="DEEP_CLEANING">Deep Cleaning</option>
                    <option value="MOVE_IN_OUT_CLEANING">Move-In/Move-Out Cleaning</option>
                    <option value="SOFA_CARPET_SHAMPOO">Sofa/Carpet Shampooing</option>
                    <option value="KITCHEN_DEGREASING">Kitchen Degreasing</option>
                    <option value="BATHROOM_RESTORATION">Bathroom Restoration</option>
                    <option value="MARBLE_POLISHING">Marble Polishing</option>
                    <option value="POST_CONSTRUCTION_CLEANING">Post-Construction Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Job Value (₹)</label>
                  <input
                    type="number"
                    value={newForm.jobValue}
                    onChange={(e) => setNewForm({ ...newForm, jobValue: Number(e.target.value) })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Complaint Category *</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value as ComplaintCategory })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-indigo-950 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Severity Level *</label>
                  <select
                    value={newForm.severity}
                    onChange={(e) => setNewForm({ ...newForm, severity: e.target.value as ComplaintSeverity })}
                    className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold bg-white"
                  >
                    <option value="MINOR">Minor (Low impact)</option>
                    <option value="MODERATE">Moderate (Standard follow-up)</option>
                    <option value="MAJOR">Major (Physical damage / escalation)</option>
                    <option value="CRITICAL">Critical (Immediate leadership attention)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Complaint Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scratches observed on master bedroom marble floor"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record customer observations, statements, specific surfaces or items affected..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              {/* Documentation & Evidence Checkbox Toggles */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SOP Documentation Verification</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.preServiceChecklistDone}
                      onChange={(e) => setNewForm({ ...newForm, preServiceChecklistDone: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Pre-Service Checklist Done</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.postServiceSignoffDone}
                      onChange={(e) => setNewForm({ ...newForm, postServiceSignoffDone: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Post-Service Signoff Signed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.beforePhotosAvailable}
                      onChange={(e) => setNewForm({ ...newForm, beforePhotosAvailable: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Before Photos Uploaded</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.afterPhotosAvailable}
                      onChange={(e) => setNewForm({ ...newForm, afterPhotosAvailable: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>After Photos Uploaded</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? 'Registering...' : 'Submit & Open Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL: SELECTED COMPLAINT INVESTIGATION */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-indigo-700">{selectedComplaint.complaintNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGES[selectedComplaint.status].bg} ${STATUS_BADGES[selectedComplaint.status].text}`}>
                    {STATUS_BADGES[selectedComplaint.status].label}
                  </span>
                  <span className="text-xs text-slate-400">· {selectedComplaint.city}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedComplaint.title}</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Customer & Job Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Customer:</span>
                <span className="font-bold text-slate-900">{selectedComplaint.customerName}</span>
                <span className="text-[10px] text-slate-500 block">{selectedComplaint.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Service & Job:</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.serviceType.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-slate-500 block">{selectedComplaint.jobId || 'No Job ID'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Job Value:</span>
                <span className="font-bold text-indigo-900">{formatINR(selectedComplaint.jobValue)}</span>
                <span className="text-[10px] text-slate-500 block">Date: {selectedComplaint.jobDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Investigator:</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.assignedInvestigatorName || 'Pending'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700">Complaint Description:</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {/* SOP Compliance Badges */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">SOP Compliance Checks:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.preServiceChecklistDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {selectedComplaint.preServiceChecklistDone ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                  <span>Pre-Checklist</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.postServiceSignoffDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {selectedComplaint.postServiceSignoffDone ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                  <span>Post-Signoff</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.beforePhotosAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {selectedComplaint.beforePhotosAvailable ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                  <span>Before Photos</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${selectedComplaint.afterPhotosAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {selectedComplaint.afterPhotosAvailable ? <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CrossCircledIcon className="w-3.5 h-3.5 text-rose-600" />}
                  <span>After Photos</span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Records on this Ticket */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">Financial Ledger Records:</span>
              {(selectedComplaint.costs || []).length > 0 ? (
                <div className="space-y-1.5">
                  {(selectedComplaint.costs || []).map((cost) => (
                    <div key={cost.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{cost.costType.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-500">{cost.description}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-600 text-sm">{formatINR(cost.amount)}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">{cost.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No financial loss or rework expenses recorded yet.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
