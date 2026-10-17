# HANDY SQUAD COMPLAINT MANAGEMENT PLATFORM
## Operational Handover & Standard Operating Procedures (SOP) Manual

This standard operating procedure manual defines the day-to-day governance, investigation workflows, financial approval routing, and employee coaching policies for Handy Squad Kerala operations.

---

### 1. Incident Lifecycle & Departmental Workflows

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  1. INTAKE       │ ──> │ 2. INVESTIGATION │ ──> │ 3. RESPONSIBILITY│
│  (BDA / Care)    │     │  (Field Lead)    │     │  (Engine Audit)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                            │
                                                            ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  6. CLOSURE      │ <── │ 5. COACHING /    │ <── │ 4. EXECUTIVE    │
│  (Client Signoff)│     │    RECTIFICATION │     │    SANCTION      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

#### Step 1: Customer Complaint Intake (BDA / Customer Care)
- Immediately capture customer phone number, city hub, service type, and booked job ID.
- Flag category (`DAMAGE_ISSUE`, `SKILL_ISSUE`, `SCOPE_CONFUSION`, etc.) and severity (`MINOR`, `MODERATE`, `MAJOR`, `CRITICAL`).
- Assign initial investigation lead. Ticket status initializes as `REGISTERED` or `UNDER_INVESTIGATION`.

#### Step 2: Evidence Collection & Verification (Field Investigator)
- Review pre-service inspection checklist and pre-service timestamped walkthrough photos.
- Interview supervisor and primary technician to capture formal statements.
- Upload damage photos, video walkthroughs, and customer WhatsApp chat transcripts to the **Evidence Centre**.
- Verify documents. The system validates required mandatory evidence per category.

#### Step 3: Responsibility Evaluation (Server-Side Engine)
- Run the **Responsibility Engine** in the ticket drawer.
- The engine checks for pre-existing defect exoneration, missing mandatory evidence guardrails, and allocates fault across:
  - `COMPANY`
  - `CUSTOMER`
  - `EMPLOYEE_INDIVIDUAL`
  - `CREW_SHARED`
  - `THIRD_PARTY_VENDOR`
  - `NO_FAULT_GOODWILL`
- If evidence is incomplete, ticket transitions to `INVESTIGATION_REQUIRED`.

#### Step 4: Executive Approval & Financial Sanction (Ops Manager / COO)
- All financial absorptions, vendor rework invoices, and customer refunds must be reviewed in the **Approval Centre**.
- **Tier 1 (Up to ₹5,000)**: Approved by Operations Manager.
- **Tier 2 (₹5,000 – ₹15,000)**: Approved jointly by Operations Manager and Chief Operating Officer (COO).
- **Tier 3 (Above ₹15,000)**: Requires Chief Operating Officer + Director / Board Approval.

#### Step 5: Coaching Assignment & Free Rework Dispatch (HR & Operations)
- If a skill gap or SOP lapse is substantiated, HR assigns an interactive technical coaching module (e.g. Delicate Surfaces, Chemical Safety).
- Field team schedules a free rework pass with senior supervisor accompaniment.
- Technician completes re-test ($\ge 80\%$ score) to restore career status to `UP_TO_DATE`.

#### Step 6: Customer Resolution & Case Closure
- Customer satisfaction confirmed via phone call or inspection visit.
- Signed completion walkthrough uploaded.
- Executive records final closure decision. Ticket moves to `CLOSED`.

---

### 2. Section 8 Statutory Compliance: Employee Protection Protocol

> **CRITICAL DIRECTIVE**: Under Kerala Labor Regulations and Handy Squad Company Policy, **automated deductions from technician salary or daily incentives are strictly forbidden**.

1. **Company Goodwill Absorption**:
   - Handy Squad absorbs operational damages and rework expenses as a business cost to maintain brand goodwill.
2. **Mandatory Due Process for Proposed Staff Cost-Sharing**:
   - In rare cases involving gross intentional misconduct, no financial adjustment can be applied without:
     - Documented physical evidence and video audit.
     - Written employee response hearing.
     - Formal HR legal review.
     - Dual-executive authorization by COO and Director.

---

### 3. Section 9 Employee Coaching-First Framework

1. **Allegation vs Finding Segregation**:
   - Customer complaints are treated as allegations until verified.
   - When a complaint is determined to be a pre-existing defect or booking mismatch, participating crew members are marked **`EXONERATED`**.
   - Exonerated cases are never counted against technician performance records or bonus qualification.
2. **Standard Technical Coaching Curriculum**:
   - `SOP-DEL-01`: Natural Stone & Acid-Sensitive Surface Protection.
   - `SOP-SAF-01`: Chemical Dilution, PPE & Floor Safety Standards.
   - `SOP-CHK-01`: Pre-Service Pre-Existing Damage Video Sign-off.
   - `SOP-MCH-01`: Single Disc Scrubber & High-Pressure Jet Maintenance.
   - `SOP-COM-01`: Customer Expectation Management & De-escalation.
   - `SOP-TIM-01`: Transit Route Optimization & On-Time Arrival Protocols.

---

### 4. Operational SLAs & Escalation Timeframes

| Severity | First Response SLA | Investigation SLA | Resolution SLA | Executive Authority |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** (e.g. Fire, Major Property Loss > ₹15k) | $< 15$ mins | $< 4$ hours | $< 24$ hours | COO + Management Admin |
| **MAJOR** (e.g. Surface Etching, Cabinet Damage) | $< 1$ hour | $< 12$ hours | $< 48$ hours | Operations Manager + COO |
| **MODERATE** (e.g. Missed Room, Machine Leak) | $< 2$ hours | $< 24$ hours | $< 48$ hours | Operations Manager |
| **MINOR** (e.g. 30-min Late Arrival, Demeanor) | $< 4$ hours | $< 24$ hours | $< 72$ hours | Operations Lead / Supervisor |

---

### 5. Contact & Escalation Roster

- **Operations Manager (Kerala)**: Harikrishnan Menon (`ops.manager@handysquad.com`)
- **Chief Operating Officer**: Suresh Kurup (`coo@handysquad.com`)
- **HR & Training Lead**: Divya Pillai (`hr@handysquad.com`)
- **Central Dispatch Control**: `+91 98470 00111` (Kochi Hub)
