-- supabase/migrations/20261017000003_complaint_management_seed.sql
-- HANDY SQUAD: COMPLAINT MANAGEMENT PLATFORM (PHASE 1 - SEED DATA)
-- Initial configurations for 10 complaint categories, Kerala employees, and initial complaints

-- -------------------------------------------------------------
-- 1. SEED RULE CONFIGURATIONS (All 10 Complaint Categories)
-- -------------------------------------------------------------
INSERT INTO public.rule_configuration (
    category,
    category_title,
    description,
    default_severity,
    mandatory_evidence_required,
    investigation_checklist,
    default_responsibility,
    approval_threshold_minor,
    approval_threshold_moderate,
    approval_threshold_major
) VALUES 
(
    'PROCESS_ISSUE',
    'Process & Protocol Non-Compliance',
    'Deviation from standard operating cleaning procedures, safety rules, or chemical usage guidelines.',
    'MODERATE',
    ARRAY['CHECKLIST', 'BEFORE_PHOTO', 'AFTER_PHOTO'],
    '[
        "Did supervisor review the standard SOP checklist before starting?",
        "Were dilution ratios followed as per Handy Squad chemical guide?",
        "Was pre-inspection signoff obtained from client prior to deep-clean?"
    ]'::jsonb,
    'COMPANY',
    2000.00,
    5000.00,
    15000.00
),
(
    'DAMAGE_ISSUE',
    'Physical Surface or Property Damage',
    'Accidental chipping, scratching, chemical burn on Italian marble/varnish, or appliance breakage.',
    'MAJOR',
    ARRAY['BEFORE_PHOTO', 'AFTER_PHOTO', 'DAMAGE_ASSESSMENT'],
    '[
        "Were pre-existing surface cracks documented in pre-service checklist?",
        "Was appropriate pH-neutral chemical used on delicate stone/varnish?",
        "Did technician notify supervisor immediately when incident occurred?",
        "Has a verified repair quotation been obtained from approved third-party vendor?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    5000.00,
    25000.00
),
(
    'SKILL_ISSUE',
    'Workmanship & Technical Quality Gap',
    'Sub-standard finishing, streak marks on glass, residue in tile grout, or incomplete sofa extraction.',
    'MODERATE',
    ARRAY['AFTER_PHOTO', 'CHECKLIST'],
    '[
        "Has the primary technician completed module HS-SKILL-02 (Machine Operation)?",
        "Was the extraction machine vacuum head maintained and suction adequate?",
        "Did the supervisor personally conduct quality walk-through before handoff?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    4000.00,
    10000.00
),
(
    'SCOPE_CONFUSION',
    'Scope & Booking Expectation Misalignment',
    'Discrepancy between sales quote / customer expectations and operational work order delivered.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CUSTOMER_COMMUNICATION', 'SCOPE_CHANGE'],
    '[
        "Does the initial CRM booking quotation explicitly list the disputed area?",
        "Did the sales/BDA rep communicate attic, loft, or balcony exclusions?",
        "Was an on-site scope variation signed before additional work commenced?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    8000.00
),
(
    'MACHINE_ISSUE',
    'Equipment Failure or Tool Breakdown',
    'Single-disc scrubber motor trip, wet vacuum leakage, high-pressure washer malfunction on site.',
    'MODERATE',
    ARRAY['MAINTENANCE_RECORD', 'WORK_ORDER'],
    '[
        "Was machine electrical cord and carbon brush inspected on weekly audit?",
        "Was a backup machine dispatched within 45 minutes to prevent job delay?",
        "Did the power outlet or voltage surge at customer premises contribute?"
    ]'::jsonb,
    'COMPANY',
    2000.00,
    5000.00,
    12000.00
),
(
    'LATE_START',
    'Delayed Crew Arrival on Job',
    'Team arrived past scheduled booking time without prior customer notification.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CUSTOMER_COMMUNICATION'],
    '[
        "Was customer proactively notified by scheduling desk 30 min in advance?",
        "Was delay caused by traffic congestion, preceding job overrun, or vehicle fault?",
        "Was arrival timestamp accurately verified by supervisor GPS check-in?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    2500.00,
    5000.00
),
(
    'LATE_COMPLETION',
    'Delayed Service Handoff',
    'Job exceeded estimated duration significantly, causing inconvenience to the client.',
    'MINOR',
    ARRAY['WORK_ORDER', 'CHECKLIST'],
    '[
        "Was the initial property estimation undersized relative to square footage?",
        "Did customer add scope mid-service without duration adjustment?",
        "Were sufficient staff allocated for the contracted scope?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    6000.00
),
(
    'SCOPE_MISSED',
    'Overlooked Areas or Incomplete Deliverables',
    'Agreed work items omitted (e.g., inside kitchen cabinets, exhaust fan, balcony railing).',
    'MODERATE',
    ARRAY['CHECKLIST', 'AFTER_PHOTO', 'WORK_ORDER'],
    '[
        "Did the customer sign off on the 24-point completion handover checklist?",
        "Were missed items explicitly enumerated in the contracted work order?",
        "Is quick rework dispatch scheduled to rectify within 24 hours?"
    ]'::jsonb,
    'COMPANY',
    1500.00,
    4000.00,
    10000.00
),
(
    'CUSTOMER_EXPERIENCE',
    'Behavioral, Demeanor or Communication Grievance',
    'Customer dissatisfaction regarding staff demeanor, uniform cleanliness, noise, or attitude.',
    'MODERATE',
    ARRAY['CUSTOMER_COMMUNICATION'],
    '[
        "Was supervisor present during the interaction in question?",
        "Did the customer receive a courteous apology from Operations Lead?",
        "Is soft-skills customer etiquette coaching recommended for the crew?"
    ]'::jsonb,
    'COMPANY',
    1000.00,
    3000.00,
    7500.00
),
(
    'COMPANY_GOODWILL_DECISION',
    'Executive Discretionary Resolution',
    'Commercial gesture or compensation provided for client retention where fault is ambiguous.',
    'MINOR',
    ARRAY['CUSTOMER_COMMUNICATION', 'WORK_ORDER'],
    '[
        "Is the customer a high-value recurring or AMC client?",
        "Is the cost absorbed as customer acquisition/retention marketing expense?",
        "Has COO / Management approval been obtained?"
    ]'::jsonb,
    'NO_FAULT_GOODWILL',
    1000.00,
    5000.00,
    20000.00
)
ON CONFLICT (category) DO NOTHING;

-- -------------------------------------------------------------
-- 2. SEED KERALA EMPLOYEES (Technicians & Supervisors)
-- -------------------------------------------------------------
INSERT INTO public.employees (
    employee_code,
    full_name,
    designation,
    city,
    primary_phone,
    hire_date,
    status,
    training_status
) VALUES 
('HS-EMP-101', 'Govindan Nair', 'SUPERVISOR', 'Kochi', '+91 98470 11223', '2023-01-15', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-102', 'Pradeep Kumar K.', 'SENIOR_TECHNICIAN', 'Kochi', '+91 94471 22334', '2023-03-20', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-103', 'Anas Mohammed', 'TECHNICIAN', 'Kochi', '+91 97460 33445', '2023-06-10', 'ACTIVE', 'TRAINING_REQUIRED'),
('HS-EMP-104', 'Suresh Babu', 'DRIVER', 'Kochi', '+91 98950 44556', '2023-02-01', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-105', 'Jayan Varghese', 'SUPERVISOR', 'Trivandrum', '+91 94460 55667', '2023-04-12', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-106', 'Manoj Pillai', 'TECHNICIAN', 'Trivandrum', '+91 98461 66778', '2023-07-05', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-107', 'Faizal Rahman', 'SUPERVISOR', 'Kozhikode', '+91 97450 77889', '2023-02-28', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-108', 'Biju Balakrishnan', 'SENIOR_TECHNICIAN', 'Kozhikode', '+91 94960 88990', '2023-05-18', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-109', 'Naveen Rajan', 'SUPERVISOR', 'Thrissur', '+91 98472 99001', '2023-08-01', 'ACTIVE', 'UP_TO_DATE'),
('HS-EMP-110', 'Rahul Menon', 'TECHNICIAN', 'Thrissur', '+91 94473 10112', '2023-09-15', 'ACTIVE', 'UP_TO_DATE')
ON CONFLICT (employee_code) DO NOTHING;

-- -------------------------------------------------------------
-- 3. SEED SAMPLE REALISTIC COMPLAINTS
-- -------------------------------------------------------------
INSERT INTO public.complaints (
    id,
    complaint_number,
    reporting_date,
    reported_by_name,
    customer_name,
    customer_phone,
    customer_address,
    city,
    service_type,
    job_id,
    job_date,
    job_value,
    category,
    severity,
    status,
    assigned_investigator_name,
    title,
    description,
    pre_service_checklist_done,
    post_service_signoff_done,
    before_photos_available,
    after_photos_available,
    work_order_verified
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'HS-CMP-202610-1001',
    NOW() - INTERVAL '3 days',
    'Ashish Roy (Operations Desk)',
    'Mathew Varghese',
    '+91 98471 55660',
    'Skyline Imperial Heights, Flat 7B, Panampilly Nagar',
    'Kochi',
    'DEEP_CLEANING',
    'JOB-KC-9012',
    (CURRENT_DATE - INTERVAL '3 days')::DATE,
    14500.00,
    'DAMAGE_ISSUE',
    'MAJOR',
    'UNDER_INVESTIGATION',
    'Govindan Nair (Ops Lead)',
    'Micro-scratch marks reported on Italian marble floor in master bedroom',
    'Customer observed circular buffing swirl marks and slight haziness on polished Italian beige marble after single-disc scrubbing. Believes incorrect floor pad or abrasive chemical was utilized.',
    true,
    false,
    true,
    true,
    true
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    'HS-CMP-202610-1002',
    NOW() - INTERVAL '2 days',
    'Deepa Pillai (Scheduling Desk)',
    'Amina Beevi',
    '+91 94472 88991',
    'Kowdiar Heritage Villa, Golf Links Road',
    'Trivandrum',
    'SOFA_CARPET_SHAMPOO',
    'JOB-TV-4410',
    (CURRENT_DATE - INTERVAL '2 days')::DATE,
    6500.00,
    'SKILL_ISSUE',
    'MODERATE',
    'REWORK_IN_PROGRESS',
    'Jayan Varghese (Supervisor)',
    'Damp smell and water ring on 7-seater fabric sofa after extraction',
    'Client called stating 7-seater sectional sofa remained excessively damp 48 hours post-shampooing with faint musty odor. Moisture extraction appears incomplete.',
    true,
    true,
    false,
    true,
    true
),
(
    'a1b2c3d4-0003-4000-8000-000000000003',
    'HS-CMP-202610-1003',
    NOW() - INTERVAL '1 day',
    'Ramesh Nair (BDA)',
    'Dr. Haridasan Nair',
    '+91 97451 22334',
    'Hill View Meadows, Mavoor Road',
    'Kozhikode',
    'MOVE_IN_OUT_CLEANING',
    'JOB-KZ-1029',
    (CURRENT_DATE - INTERVAL '1 day')::DATE,
    18000.00,
    'LATE_START',
    'MINOR',
    'RESOLVED',
    'Faizal Rahman (Ops Lead)',
    'Crew arrived 1 hour 45 minutes late due to bypass vehicle puncture',
    'Team was booked for 09:00 AM start, but vehicle tire puncture near Ramanattukara delayed arrival to 10:45 AM. Customer had taken leave from clinic and was upset.',
    false,
    true,
    false,
    true,
    true
),
(
    'a1b2c3d4-0004-4000-8000-000000000004',
    'HS-CMP-202610-1004',
    NOW() - INTERVAL '12 hours',
    'Ananya Sen (Customer Support)',
    'Nandakumar Menon',
    '+91 98473 33445',
    'Sobha Silver Lake, Puzhakkal',
    'Thrissur',
    'KITCHEN_DEGREASING',
    'JOB-TS-8812',
    CURRENT_DATE,
    7500.00,
    'SCOPE_MISSED',
    'MODERATE',
    'REGISTERED',
    'Naveen Rajan (Supervisor)',
    'Interior of modular pantry cabinets and exhaust baffle filters not degreased',
    'Client notes kitchen counter and hob were cleaned thoroughly, but modular pantry internal shelving and chimney baffle grease traps were left untouched despite being in booking quote.',
    false,
    false,
    true,
    false,
    true
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 4. SEED SAMPLE PARTICIPANTS & INITIAL COSTS
-- -------------------------------------------------------------
INSERT INTO public.complaint_participants (
    complaint_id,
    employee_id,
    role_on_job,
    allegation_status
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-101'),
    'SUPERVISOR',
    'PARTICIPANT'
),
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-102'),
    'PRIMARY_TECHNICIAN',
    'NAMED_IN_COMPLAINT'
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-105'),
    'SUPERVISOR',
    'PARTICIPANT'
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    (SELECT id FROM public.employees WHERE employee_code = 'HS-EMP-106'),
    'PRIMARY_TECHNICIAN',
    'PARTICIPANT'
)
ON CONFLICT (complaint_id, employee_id) DO NOTHING;

-- Initial Cost Records
INSERT INTO public.cost_records (
    complaint_id,
    cost_type,
    description,
    amount,
    status,
    is_company_absorption
) VALUES 
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'DAMAGE_REPAIR_VENDOR',
    'Estimated diamond crystallizer re-polishing cost by specialized marble restoration contractor',
    4500.00,
    'ESTIMATED',
    true
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    'REWORK_LABOUR',
    'Senior technician re-extraction and deodorization pass scheduled',
    1200.00,
    'VERIFIED_INCURRED',
    true
),
(
    'a1b2c3d4-0003-4000-8000-000000000003',
    'CUSTOMER_DISCOUNT_COUPON',
    '₹1,000 compensation voucher issued for next service due to puncture delay',
    1000.00,
    'VERIFIED_INCURRED',
    true
);
