# Wisdom School Suite

Build a completely new, production-ready School ERP & Accounts Management System for Wisdom Public School – Doomra.



IMPORTANT DATABASE MIGRATION:

I have provided a PostgreSQL custom database backup file:

wpsaccounts_261002.backup



Use this backup as the source of truth for the existing school database.



Before making any schema or application changes:

1. Inspect the PostgreSQL backup/database structure.

2. Restore/import the existing database safely into the new project environment.

3. Preserve all existing tables, relationships, records, IDs, timestamps and historical data.

4. DO NOT truncate, reset, overwrite, delete, duplicate, or seed existing data.

5. DO NOT create a second copy of the existing school data.

6. Do not add demo students, demo staff, demo payments or fake transactions.

7. Existing students, fees, payments, balances, academic sessions, staff, payroll and all historical records must remain intact.

8. If any new table/column is required, make only additive and backward-compatible changes.

9. Never silently change existing financial records.

10. If the backup cannot be safely restored directly, STOP and report the exact issue instead of creating a new conflicting database.



The existing database includes important data such as:

- academic_sessions

- fee_payments

- payroll_periods

- profiles

- staff

- fee_categories

- expense_categories

- driver_km_logs

- leave_requests

- maintenance_expenses

- payment_date_changes

and other existing school ERP tables.



APPLICATION GOAL:

Create a simple, modern, fast and highly mobile-friendly School ERP + Accounts system.



DESIGN:

- Blue and white school theme.

- Clean professional UI.

- Mobile-first responsive design.

- Must work comfortably on Android phones.

- No horizontal page overflow.

- Large touch-friendly buttons.

- Simple cards instead of unnecessarily complex tables on mobile.

- Bottom navigation or compact mobile navigation.

- Desktop/tablet responsive layout.

- Use consistent typography, spacing and components.

- Keep the interface much simpler than a typical complicated ERP.



MAIN MODULES:



1. DASHBOARD

Show:

- Today's collection

- Today's expenses

- Total income

- Total expenses

- Net balance

- Pending student fees

- Staff salary due

- Transport expenses

- Maintenance expenses

- Other expenses

- Recent transactions



Filters:

- Today

- Last 7 days

- This month

- This year

- Custom date range

- Academic session



Dashboard must calculate data from real database records.



2. ACADEMIC SESSIONS

Support separate sessions such as:

- 2025-26

- 2026-27



Financial/payroll/attendance/transport/maintenance records must remain correctly associated with their academic session where applicable.



Do not mix financial records between sessions.



3. STUDENTS

Provide:

- Student list

- Search

- Class filter

- Section filter

- Student profile

- Admission/SR number

- Parent details

- Contact/WhatsApp number

- Fee structure

- Paid amount

- Balance

- Payment history

- Receipt

- Books/stationery/other charges

- Transport charges where applicable



Existing student and fee data must remain unchanged.



4. FEE MANAGEMENT

Support:

- Full payment

- Partial payment

- Payment date

- Payment mode

- Received by

- Receipt generation

- Automatic paid/balance calculation

- Payment history

- Pending fee report

- Class-wise collection



Never allow accidental overpayment unless explicitly allowed for Admin.



Do not duplicate existing fee payments during migration.



5. STAFF MANAGEMENT

Create a complete staff profile.



Each staff profile should show:

- Personal information

- Joining date

- Designation

- Monthly salary

- Academic session

- Attendance

- Monthly payroll

- Salary paid

- Salary balance

- Payment history

- Leave requests



6. SALARY / PAYROLL



IMPORTANT SALARY RULE:



Every month MUST be calculated on a fixed 30-day basis.



Formula:

Daily Salary = Monthly Salary / 30



The daily salary must NOT depend on whether the calendar month has 28, 29, 30 or 31 days.



Example:

Monthly salary ₹15,000

Daily salary = ₹15,000 / 30 = ₹500



Payroll must show:

- Monthly salary

- Fixed 30-day basis

- Present days

- Absent days

- Half days

- Approved leave

- Paid amount

- Salary balance

- Payment history



Attendance and payroll calculations must be transparent and explainable.



Do NOT automatically deduct salary merely because an employee has more than 4 absent days.



If absent days exceed 4 in a month:

show a clear WARNING only:

"Absent days exceed 4"



No automatic deduction unless an explicit Admin-configured payroll rule exists.



Salary payment:

- Amount becomes locked after saving.

- Normal users cannot edit/delete a saved salary payment amount.

- Admin can reverse/correct a payment through a controlled process.

- Any correction must create an audit record.

- Payment date can only be corrected by Admin.

- Store original date, corrected date, changed by and changed time.

- "Paid By" must automatically use the currently logged-in user.

- Do not allow users to manually select another user as Paid By.



7. STAFF ATTENDANCE

Admin can mark:

- Present

- Absent

- Half Day

- Leave



Store:

- Date

- Status

- Remarks

- Marked By

- Timestamp



Staff users can view only their own attendance.



8. LEAVE MANAGEMENT

Staff can submit:

- From date

- To date

- Reason

- Remarks



Status:

- Pending

- Approved

- Rejected



Admin can approve/reject.



9. TRANSPORT

Support:

- Vehicles

- Drivers

- Routes

- Academic session

- Driver salary

- Daily KM

- Monthly KM

- Fuel rate per KM

- Estimated fuel cost

- Actual fuel payments



10. DRIVER PROFILE

Driver must have one complete profile similar to Staff/Student.



Show:

- Driver details

- Vehicle

- Route

- Joining date

- Monthly salary

- Salary due

- Salary paid

- Salary balance

- Payment history

- Daily KM

- Monthly KM

- Fuel rate

- Estimated fuel cost

- Actual fuel payments



11. MAINTENANCE

Separate maintenance from normal expenses.



Fields:

- Date

- Academic session

- Location

- Work

- Category

- Vendor

- Amount

- Payment mode

- Paid By

- Bill/receipt

- Remarks



12. ACCOUNTS

Create centralized accounts management.



Income:

- Student fees

- Other income

- Transport income where applicable



Expenses:

- Staff salary

- Driver salary

- Fuel

- Maintenance

- Other expenses



Every financial transaction should have:

- Date

- Session where applicable

- Amount

- Category

- Payment mode

- Paid/received by

- Reference/remarks



Avoid duplicate transactions.



13. USER MANAGEMENT



No public signup.



Only Admin can create users.



Roles:

- Admin

- Accountant

- Staff



Staff users must NOT be able to see:

- Other staff salary

- Other staff payments

- Student fee accounts

- School profit

- School-wide accounts

- Transport finances

- Maintenance finances

- Other users' payments



These restrictions MUST be enforced at backend/database/RLS level, not only by hiding menu items.



14. STAFF DASHBOARD



Staff user should only see:

- Own attendance

- Own monthly attendance

- Own salary

- Own paid amount

- Own balance

- Own salary payment history

- Own leave requests



15. REPORTS



Provide:

- Student fee report

- Pending fee report

- Collection report

- Staff salary report

- Payroll report

- Attendance report

- Leave report

- Driver salary report

- Transport report

- KM report

- Fuel report

- Maintenance report

- Income report

- Expense report

- Profit/balance report



Support CSV/Excel export wherever practical.



16. RECEIPTS

Create clean printable receipts for:

- Student fee payment

- Staff salary payment

- Driver salary payment

- Other financial transactions where applicable



17. SECURITY

Implement:

- Secure authentication

- Role-based access

- Database-level authorization/RLS

- Audit logs for sensitive financial changes

- No public signup

- No unauthorized direct API/database access

- Prevent duplicate financial submissions

- Prevent accidental destructive operations



18. MOBILE EXPERIENCE



This is very important.



Optimize every major screen for Android mobile:

- Dashboard

- Students

- Student profile

- Fees

- Staff

- Staff profile

- Payroll

- Attendance

- Leave

- Drivers

- Vehicles

- Transport

- Maintenance

- Accounts

- Reports



Use:

- Responsive cards

- Bottom navigation where useful

- Collapsible sections

- Mobile-friendly forms

- Sticky important actions

- Touch-friendly controls

- Minimal scrolling

- No horizontal overflow



19. DATA SAFETY



Existing database is the most important part.



Do not:

- delete existing records

- reset database

- truncate tables

- replace existing IDs

- duplicate imported records

- create demo data

- modify historical financial transactions automatically

- recalculate historical balances incorrectly



First establish the database and verify existing data.



Only after successful database verification should the application UI and modules be connected.



20. FINAL REQUIREMENT



Build this as a simple production-ready school ERP, not a complicated generic ERP.



Prioritize:

DATA SAFETY > DATABASE CORRECTNESS > FINANCIAL ACCURACY > SECURITY > MOBILE UX > DESIGN.



Do not rebuild or duplicate existing functionality unnecessarily.

Reuse existing database structures wherever possible.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a3cf4789-13ac-435d-8641-60403c962185).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
