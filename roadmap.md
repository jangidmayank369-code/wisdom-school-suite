# Roadmap

1. ~~Enable Supabase (Lovable Cloud) for the project.~~ (done)
2. ~~Restore wpsaccounts_261002.backup into the new database; verify record counts.~~ (done — counts match exactly, integrity checks pass, receipt counter restored, stray test row removed)
3. Build ERP app on restored data: blue & white, mobile-first, roles admin/accountant/staff, RLS, no public signup. (in progress)
   - [ ] Blue/white theme + app shell (bottom nav, mobile-first)
   - [ ] Auth (email/password, no signup)
   - [ ] Dashboard with real DB aggregates + date-range filters
   - [ ] Students (list, filters, profile with charges/payments/balance)
   - [ ] Fees (collect payment, receipt, history, pending report)
   - [ ] Staff & Payroll (monthly/30 daily rate, >4 absents warning, locked amounts)
   - [ ] Attendance + Leave
   - [ ] Transport (vehicles, expenses, KM logs) + Maintenance
   - [ ] Accounts ledger + Reports (CSV export)
   - [ ] Sessions + User management (admin creates users)
