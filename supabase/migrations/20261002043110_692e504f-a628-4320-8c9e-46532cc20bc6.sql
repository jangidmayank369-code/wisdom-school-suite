ALTER TABLE ONLY public.academic_sessions
    ADD CONSTRAINT academic_sessions_name_key UNIQUE (name);

ALTER TABLE ONLY public.academic_sessions
    ADD CONSTRAINT academic_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_km_logs
    ADD CONSTRAINT driver_km_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT fee_categories_name_key UNIQUE (name);

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT fee_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.maintenance_expenses
    ADD CONSTRAINT maintenance_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_date_changes
    ADD CONSTRAINT payment_date_changes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_staff_id_period_month_key UNIQUE (staff_id, period_month);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_att_date_key UNIQUE (staff_id, att_date);

ALTER TABLE ONLY public.staff_payments
    ADD CONSTRAINT staff_payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_staff_code_key UNIQUE (staff_code);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.student_charges
    ADD CONSTRAINT student_charges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_session_id_admission_no_key UNIQUE (session_id, admission_no);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_modules
    ADD CONSTRAINT user_modules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_modules
    ADD CONSTRAINT user_modules_user_id_module_key UNIQUE (user_id, module);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);

CREATE INDEX fee_payments_student_id_idx ON public.fee_payments USING btree (student_id);

CREATE INDEX student_charges_student_id_idx ON public.student_charges USING btree (student_id);

CREATE INDEX students_session_id_idx ON public.students USING btree (session_id);

CREATE INDEX transactions_session_id_idx ON public.transactions USING btree (session_id);

CREATE UNIQUE INDEX transactions_source_uniq ON public.transactions USING btree (source, source_id) WHERE (source <> 'manual'::text);

CREATE INDEX transactions_txn_date_idx ON public.transactions USING btree (txn_date);

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.maintenance_expenses FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.staff_payments FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.student_charges FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_audit BEFORE INSERT OR UPDATE ON public.transport_expenses FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_fee_txn AFTER INSERT OR DELETE OR UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.sync_fee_payment_txn();

CREATE TRIGGER trg_leave_review BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.stamp_leave_review();

CREATE TRIGGER trg_maint_txn AFTER INSERT OR DELETE OR UPDATE ON public.maintenance_expenses FOR EACH ROW EXECUTE FUNCTION public.sync_maintenance_txn();

CREATE TRIGGER trg_marked_by BEFORE INSERT OR UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION public.stamp_marked_by();

CREATE TRIGGER trg_paid_by_lock BEFORE INSERT OR DELETE OR UPDATE ON public.staff_payments FOR EACH ROW EXECUTE FUNCTION public.payment_paid_by_lock();

CREATE TRIGGER trg_paid_by_lock BEFORE INSERT OR DELETE OR UPDATE ON public.transport_expenses FOR EACH ROW EXECUTE FUNCTION public.payment_paid_by_lock();

CREATE TRIGGER trg_salary_txn AFTER INSERT OR DELETE OR UPDATE ON public.staff_payments FOR EACH ROW EXECUTE FUNCTION public.sync_staff_payment_txn();

CREATE TRIGGER trg_single_active AFTER INSERT OR UPDATE OF is_active ON public.academic_sessions FOR EACH ROW WHEN (new.is_active) EXECUTE FUNCTION public.single_active_session();

CREATE TRIGGER trg_transport_txn AFTER INSERT OR DELETE OR UPDATE ON public.transport_expenses FOR EACH ROW EXECUTE FUNCTION public.sync_transport_txn();

ALTER TABLE ONLY public.driver_km_logs
    ADD CONSTRAINT driver_km_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id);

ALTER TABLE ONLY public.driver_km_logs
    ADD CONSTRAINT driver_km_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_km_logs
    ADD CONSTRAINT driver_km_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.maintenance_expenses
    ADD CONSTRAINT maintenance_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.maintenance_expenses
    ADD CONSTRAINT maintenance_expenses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.staff_payments
    ADD CONSTRAINT staff_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.staff_payments
    ADD CONSTRAINT staff_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.staff_payments
    ADD CONSTRAINT staff_payments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.student_charges
    ADD CONSTRAINT student_charges_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.fee_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.student_charges
    ADD CONSTRAINT student_charges_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.student_charges
    ADD CONSTRAINT student_charges_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.student_charges
    ADD CONSTRAINT student_charges_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_modules
    ADD CONSTRAINT user_modules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_driver_staff_id_fkey FOREIGN KEY (driver_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (id = auth.uid())));

CREATE POLICY "admin manage attendance" ON public.staff_attendance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin manage leave" ON public.leave_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin settings" ON public.school_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.driver_km_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance read date changes" ON public.payment_date_changes FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text, 'transport'::text]));

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage charges" ON public.student_charges TO authenticated USING (public.can_access(auth.uid(), ARRAY['fees'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['fees'::text]));

CREATE POLICY "manage exp cats" ON public.expense_categories TO authenticated USING (public.can_finance(auth.uid())) WITH CHECK (public.can_finance(auth.uid()));

CREATE POLICY "manage fee cats" ON public.fee_categories TO authenticated USING (public.can_finance(auth.uid())) WITH CHECK (public.can_finance(auth.uid()));

CREATE POLICY "manage fee payments" ON public.fee_payments TO authenticated USING (public.can_access(auth.uid(), ARRAY['fees'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['fees'::text]));

CREATE POLICY "manage maint" ON public.maintenance_expenses TO authenticated USING (public.can_access(auth.uid(), ARRAY['maintenance'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['maintenance'::text]));

CREATE POLICY "manage payroll" ON public.payroll_periods TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['payroll'::text]));

CREATE POLICY "manage sessions" ON public.academic_sessions TO authenticated USING (public.can_access(auth.uid(), ARRAY['sessions'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['sessions'::text]));

CREATE POLICY "manage staff" ON public.staff TO authenticated USING (public.can_access(auth.uid(), ARRAY['staff'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['staff'::text]));

CREATE POLICY "manage staff payments" ON public.staff_payments TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['payroll'::text]));

CREATE POLICY "manage students" ON public.students TO authenticated USING (public.can_access(auth.uid(), ARRAY['students'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['students'::text]));

CREATE POLICY "manage transport exp" ON public.transport_expenses TO authenticated USING (public.can_access(auth.uid(), ARRAY['transport'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['transport'::text]));

CREATE POLICY "manage txns" ON public.transactions TO authenticated USING (public.can_access(auth.uid(), ARRAY['accounts'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['accounts'::text]));

CREATE POLICY "manage vehicles" ON public.vehicles TO authenticated USING (public.can_access(auth.uid(), ARRAY['transport'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['transport'::text]));

ALTER TABLE public.payment_date_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll read attendance" ON public.staff_attendance FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text]));

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read charges" ON public.student_charges FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['fees'::text, 'transport'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read exp cats" ON public.expense_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "read fee cats" ON public.fee_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "read fee payments" ON public.fee_payments FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['fees'::text, 'transport'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read maint" ON public.maintenance_expenses FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['maintenance'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read own or admin modules" ON public.user_modules FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "read payroll" ON public.payroll_periods FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text, 'reports'::text]));

CREATE POLICY "read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "read sessions" ON public.academic_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "read settings" ON public.school_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "read staff" ON public.staff FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['staff'::text, 'payroll'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read staff payments" ON public.staff_payments FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['payroll'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read students" ON public.students FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['students'::text, 'fees'::text, 'transport'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read transport exp" ON public.transport_expenses FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['transport'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read txns" ON public.transactions FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['accounts'::text, 'reports'::text, 'dashboard'::text]));

CREATE POLICY "read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.can_access(auth.uid(), ARRAY['students'::text, 'transport'::text, 'reports'::text]));

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read own attendance" ON public.staff_attendance FOR SELECT TO authenticated USING ((staff_id = public.my_staff_id()));

CREATE POLICY "staff read own leave" ON public.leave_requests FOR SELECT TO authenticated USING ((staff_id = public.my_staff_id()));

CREATE POLICY "staff read own payments" ON public.staff_payments FOR SELECT TO authenticated USING ((staff_id = public.my_staff_id()));

CREATE POLICY "staff read own payroll" ON public.payroll_periods FOR SELECT TO authenticated USING ((staff_id = public.my_staff_id()));

CREATE POLICY "staff read own profile" ON public.staff FOR SELECT TO authenticated USING ((id = public.my_staff_id()));

CREATE POLICY "staff request leave" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (((staff_id = public.my_staff_id()) AND (status = 'pending'::text) AND (reviewed_by IS NULL)));

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.student_charges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transport manage km" ON public.driver_km_logs TO authenticated USING (public.can_access(auth.uid(), ARRAY['transport'::text, 'staff'::text])) WITH CHECK (public.can_access(auth.uid(), ARRAY['transport'::text, 'staff'::text]));

ALTER TABLE public.transport_expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Lock rule-checking helpers away from anonymous callers (security linter fix)
REVOKE EXECUTE ON FUNCTION public.can_access(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_finance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_students(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_name() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_staff_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.payment_paid_by_lock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_audit_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.single_active_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.stamp_leave_review() FROM anon;
REVOKE EXECUTE ON FUNCTION public.stamp_marked_by() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_fee_payment_txn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_maintenance_txn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_staff_payment_txn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_transport_txn() FROM anon;