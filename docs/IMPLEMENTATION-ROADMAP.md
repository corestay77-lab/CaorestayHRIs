# CoreStay People implementation contract

## Phase 1 — foundation (current starter)
- Separate Next.js application and separate Supabase project.
- Login via Supabase Auth; public self-registration intentionally disabled.
- Tenant → legal entity → hotel → department → position structure.
- User role assignments with hotel scope.
- Employee identity and effective-dated assignments.
- Dashboard uses em dashes/placeholders rather than fabricated live metrics.

## Phase 2 — Employee Master (next)
- Employee list, search, filters by legal entity/hotel/department/status.
- Employee detail tabs: identity, employment, assignments, documents, change history.
- Employee number unique per legal employer, never rely on name matching.
- Moving between hotels under same legal employer: new effective-dated assignment; preserve ID.
- Moving to a different legal employer: new employee record/ID; do not copy sensitive records automatically.
- Restrict NIK, tax ID, bank, and BPJS fields to explicitly authorized roles.

## Phase 3 — Compensation Master
- Standard CoreStay component definitions plus tenant/hotel-specific custom components.
- Each component has stable code, category, method, calculation basis, frequency, eligibility, tax/BPJS treatment, account mapping, bounds, version, effective dates.
- Compensation changes have requester, reason, old/new values, effective date, separate approval timestamp and audit record.
- Do not backdate a normal change into a closed payroll period. Route corrections to the separate correction module.
- Requester cannot approve their own change.

## Phase 4 — Attendance & Scheduling
- Shifts, schedules, hotel location settings, clock-in/out, breaks, exceptions and HR review.
- Support overnight shifts and explicit approval of overtime; long presence alone is not overtime approval.
- Close attendance periods before payroll calculation. Closed records are immutable; corrections are separate audited records.
- Attendance method (mobile GPS+selfie, shared kiosk/device, or both) remains a configurable business decision.

## Phase 5 — Payroll engine
- Snapshot employee, compensation, attendance and rule versions per payroll run.
- Separate earnings/gross, employee deductions, net pay, employer contributions, and total employer labor cost.
- Version Indonesian payroll/tax/BPJS rules and require compliance review before production use.
- Workflow: draft → calculated → HR review → management approval → locked.
- Locked payroll is immutable. Corrections are separately approved, calculated, locked, paid and reconciled.

## Phase 6 — CoreStay Sync
- Two-way controlled integration: Budget → People import, People → Budget approved/locked payroll results.
- Discover existing Budget schema and any API before deciding the connector. Do not assume an API exists.
- Stable source IDs, idempotency, mapping versions, duplicate detection, conflict holding, row-level validation and audit logs.
- Only fully valid rows auto-activate; incomplete/ambiguous rows are held. This never bypasses required business approvals.
- Reconcile counts and totals before marking a batch successful. Never silently overwrite conflicts or double-count payroll.

## Release gates
1. Unit tests for validation and calculations.
2. RLS cross-tenant tests (users cannot read/write another tenant or unauthorized hotel).
3. Role matrix tests and self-approval denial.
4. Payroll snapshot/lock immutability and correction reconciliation tests.
5. Sync idempotency, duplicate, partial failure and total reconciliation tests.
6. Independent review of Indonesian payroll/tax/BPJS logic.
7. Backup/restore drill and audit-log verification.
8. Production release only after staging approval; no real data before all gates pass.


> Catatan: penyimpanan data kini memakai Vercel Postgres (Neon) lewat /api; Supabase tidak dipakai lagi.
