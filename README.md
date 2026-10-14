# Handysquad-Dashboard

Interactive Housekeeping Economics Engine & Operational Decision Dashboard for Handy Squad.

## Overview
- **Housekeeping Economics Engine:** Real-time unit economics, daily capacity utilization, variable and fixed cost allocations.
- **Weekly & Monthly Analytics:** Detailed timeline trends, custom period filtering, and interactive SVG trend charts.
- **What-If Calculator:** Interactive simulation for target shortfalls, outside helper benchmarks (₹2,000 threshold), overtime rush, traffic delays, and fixed overhead adjustments.
- **Job Profitability Simulator:** Pre-job feasibility modeling, gross contribution, and technician capacity checks.
- **Daily Operations Ledger:** Instant input calculation, job scheduling, and daily status finalization.
- **Prisma & SQLite / Supabase:** Multi-environment database configuration with Prisma ORM.

## Tech Stack
- Next.js (Pages Router)
- React 18 & TypeScript
- Tailwind CSS
- Prisma ORM & SQLite / Supabase
- Jest unit test suite (100% passing core finance formulas)

## Getting Started
```bash
npm install
npx prisma generate
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
