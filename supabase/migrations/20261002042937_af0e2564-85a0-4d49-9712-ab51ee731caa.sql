SET check_function_bodies = false;

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'accountant',
    'staff',
    'teacher',
    'viewer'
);

CREATE FUNCTION public.can_access(_user_id uuid, _modules text[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.profiles where id = _user_id and active) and (
    exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin')
    or (exists (select 1 from public.user_roles where user_id = _user_id and role = 'accountant')
        and _modules && array['dashboard','sessions','students','fees','staff','payroll','transport','maintenance','accounts','reports'])
    or (exists (select 1 from public.user_roles where user_id = _user_id and role = 'staff')
        and exists (select 1 from public.user_modules where user_id = _user_id and module = any(_modules)))
  )
$$;

CREATE FUNCTION public.can_finance(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','accountant'))
$$;

CREATE FUNCTION public.can_manage_students(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','accountant','staff'))
$$;

CREATE FUNCTION public.current_user_name() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(nullif(full_name,''), username, 'Unknown') from public.profiles where id = auth.uid()
$$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'username', new.email));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    update public.profiles set is_primary = true where id = new.id;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'staff');
  end if;
  return new;
end; $$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

CREATE FUNCTION public.my_staff_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select s.id from public.staff s join public.profiles p on p.id = s.user_id
  where s.user_id = auth.uid() and p.active limit 1
$$;

CREATE FUNCTION public.payment_paid_by_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare d_old date; d_new date;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_by_name := public.current_user_name();
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.amount is distinct from old.amount then
      raise exception 'Payment amount is locked and cannot be changed';
    end if;
    new.created_by_name := old.created_by_name;
    if tg_table_name = 'staff_payments' and new.staff_id is distinct from old.staff_id then
      raise exception 'Payment staff cannot be changed';
    end if;
    if new.voided is distinct from old.voided and auth.uid() is not null
       and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Only Admin can reverse a payment';
    end if;
    if tg_table_name = 'staff_payments' then d_old := old.payment_date; d_new := new.payment_date;
    else d_old := old.expense_date; d_new := new.expense_date; end if;
    if d_new is distinct from d_old then
      if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
        raise exception 'Only Admin can change a payment date';
      end if;
      insert into public.payment_date_changes (table_name, payment_id, old_date, new_date, changed_by, changed_by_name)
      values (tg_table_name, old.id, d_old, d_new, auth.uid(), public.current_user_name());
    end if;
    return new;
  else
    if auth.uid() is not null then
      raise exception 'Payments cannot be deleted; Admin can reverse them instead';
    end if;
    return old;
  end if;
end; $$;

CREATE FUNCTION public.set_audit_fields() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end; $$;

CREATE FUNCTION public.single_active_session() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.is_active then
    update public.academic_sessions set is_active = false where id <> new.id and is_active;
  end if;
  return new;
end; $$;

CREATE FUNCTION public.stamp_leave_review() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.status is distinct from old.status and auth.uid() is not null then
    new.reviewed_by := auth.uid();
    new.reviewed_by_name := public.current_user_name();
    new.reviewed_at := now();
  end if;
  new.staff_id := old.staff_id;
  return new;
end; $$;

CREATE FUNCTION public.stamp_marked_by() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is not null then
    new.marked_by := auth.uid();
    new.marked_by_name := public.current_user_name();
  end if;
  if tg_op = 'UPDATE' then new.created_at := old.created_at; new.updated_at := now(); end if;
  return new;
end; $$;

CREATE FUNCTION public.sync_fee_payment_txn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'DELETE') then
    delete from public.transactions where source = 'fee' and source_id = old.id;
    return old;
  end if;
  insert into public.transactions (session_id, txn_date, type, category, amount, payment_mode,
    description, reference, source, source_id, voided, created_by)
  values (new.session_id, new.payment_date, 'income', new.category, new.amount, new.payment_mode,
    coalesce(new.remarks,''), coalesce(new.receipt_no,''), 'fee', new.id, new.voided, new.created_by)
  on conflict (source, source_id) where source <> 'manual' do update set
    session_id = excluded.session_id, txn_date = excluded.txn_date, category = excluded.category,
    amount = excluded.amount, payment_mode = excluded.payment_mode,
    description = excluded.description, reference = excluded.reference, voided = excluded.voided;
  return new;
end; $$;

CREATE FUNCTION public.sync_maintenance_txn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'DELETE') then
    delete from public.transactions where source = 'maintenance' and source_id = old.id;
    return old;
  end if;
  insert into public.transactions (session_id, txn_date, type, category, amount, payment_mode,
    description, reference, source, source_id, voided, created_by)
  values (new.session_id, new.expense_date, 'expense', 'Maintenance', new.amount, new.payment_mode,
    new.title || ' - ' || coalesce(new.location,''), coalesce(new.bill_no,''),
    'maintenance', new.id, new.voided, new.created_by)
  on conflict (source, source_id) where source <> 'manual' do update set
    session_id = excluded.session_id, txn_date = excluded.txn_date, amount = excluded.amount,
    payment_mode = excluded.payment_mode, description = excluded.description,
    reference = excluded.reference, voided = excluded.voided;
  return new;
end; $$;

CREATE FUNCTION public.sync_staff_payment_txn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'DELETE') then
    delete from public.transactions where source = 'salary' and source_id = old.id;
    return old;
  end if;
  insert into public.transactions (session_id, txn_date, type, category, amount, payment_mode,
    description, reference, source, source_id, voided, created_by)
  values (new.session_id, new.payment_date, 'expense', 'Staff Salary', new.amount, new.payment_mode,
    coalesce(new.remarks,''), new.staff_id::text, 'salary', new.id, new.voided, new.created_by)
  on conflict (source, source_id) where source <> 'manual' do update set
    session_id = excluded.session_id, txn_date = excluded.txn_date, amount = excluded.amount,
    payment_mode = excluded.payment_mode, description = excluded.description, voided = excluded.voided;
  return new;
end; $$;

CREATE FUNCTION public.sync_transport_txn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'DELETE') then
    delete from public.transactions where source = 'transport' and source_id = old.id;
    return old;
  end if;
  insert into public.transactions (session_id, txn_date, type, category, amount, payment_mode,
    description, reference, source, source_id, voided, created_by)
  values (new.session_id, new.expense_date, 'expense', 'Transport', new.amount, new.payment_mode,
    coalesce(new.category,'') || ' ' || coalesce(new.remarks,''), coalesce(new.bill_no,''),
    'transport', new.id, new.voided, new.created_by)
  on conflict (source, source_id) where source <> 'manual' do update set
    session_id = excluded.session_id, txn_date = excluded.txn_date, amount = excluded.amount,
    payment_mode = excluded.payment_mode, description = excluded.description,
    reference = excluded.reference, voided = excluded.voided;
  return new;
end; $$;

CREATE TABLE public.academic_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.driver_km_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    vehicle_id uuid,
    session_id uuid,
    log_date date NOT NULL,
    km numeric NOT NULL,
    rate_per_km numeric DEFAULT 0 NOT NULL,
    remarks text,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT driver_km_logs_km_check CHECK ((km >= (0)::numeric))
);

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.fee_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_transport boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.fee_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    session_id uuid NOT NULL,
    receipt_no text,
    amount numeric(12,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_mode text DEFAULT 'Cash'::text NOT NULL,
    category text DEFAULT 'Student Fees'::text NOT NULL,
    remarks text DEFAULT ''::text,
    voided boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    CONSTRAINT fee_payments_amount_check CHECK ((amount > (0)::numeric))
);

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text NOT NULL,
    remarks text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_remarks text,
    reviewed_by uuid,
    reviewed_by_name text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_requests_check CHECK ((to_date >= from_date)),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE public.maintenance_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'Repair'::text NOT NULL,
    location text DEFAULT ''::text,
    description text DEFAULT ''::text,
    vendor text DEFAULT ''::text,
    amount numeric(12,2) NOT NULL,
    payment_mode text DEFAULT 'Cash'::text NOT NULL,
    bill_no text DEFAULT ''::text,
    attachment_url text DEFAULT ''::text,
    remarks text DEFAULT ''::text,
    voided boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    CONSTRAINT maintenance_expenses_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE public.payment_date_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    payment_id uuid NOT NULL,
    old_date date NOT NULL,
    new_date date NOT NULL,
    changed_by uuid,
    changed_by_name text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payroll_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    session_id uuid,
    period_month date NOT NULL,
    working_days integer DEFAULT 30 NOT NULL,
    paid_days integer DEFAULT 30 NOT NULL,
    gross_salary numeric(12,2) DEFAULT 0 NOT NULL,
    computed_salary numeric(12,2) DEFAULT 0 NOT NULL,
    remarks text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    username text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_primary boolean DEFAULT false NOT NULL
);

CREATE SEQUENCE public.receipt_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.school_settings (
    id boolean DEFAULT true NOT NULL,
    school_name text DEFAULT 'My School'::text NOT NULL,
    address text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    email text DEFAULT ''::text,
    currency text DEFAULT '₹'::text NOT NULL,
    salary_day_rule text DEFAULT 'month_days'::text NOT NULL,
    setup_complete boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT school_settings_id_check CHECK (id)
);

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_code text NOT NULL,
    name text NOT NULL,
    designation text DEFAULT ''::text,
    department text DEFAULT ''::text,
    contact text DEFAULT ''::text,
    joining_date date,
    monthly_salary numeric(12,2) DEFAULT 0 NOT NULL,
    payment_type text DEFAULT 'Monthly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid
);

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    att_date date NOT NULL,
    status text NOT NULL,
    remarks text,
    marked_by uuid,
    marked_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT staff_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'half_day'::text, 'leave'::text])))
);

CREATE TABLE public.staff_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    session_id uuid,
    period_month date,
    amount numeric(12,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_mode text DEFAULT 'Cash'::text NOT NULL,
    remarks text DEFAULT ''::text,
    voided boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    created_by_name text,
    CONSTRAINT staff_payments_amount_check CHECK ((amount > (0)::numeric))
);

CREATE TABLE public.student_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    session_id uuid NOT NULL,
    category_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    remarks text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    CONSTRAINT student_charges_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    admission_no text NOT NULL,
    sr_number text DEFAULT ''::text,
    name text NOT NULL,
    father_name text DEFAULT ''::text,
    mother_name text DEFAULT ''::text,
    dob date,
    gender text DEFAULT ''::text,
    class_name text DEFAULT ''::text NOT NULL,
    section text DEFAULT ''::text,
    contact text DEFAULT ''::text,
    whatsapp text DEFAULT ''::text,
    address text DEFAULT ''::text,
    admission_date date,
    transport_required boolean DEFAULT false NOT NULL,
    vehicle_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE VIEW public.student_balances WITH (security_invoker='true') AS
 SELECT s.id AS student_id,
    s.session_id,
    COALESCE(c.total_charges, (0)::numeric) AS total_payable,
    COALESCE(p.total_paid, (0)::numeric) AS total_paid,
    (COALESCE(c.total_charges, (0)::numeric) - COALESCE(p.total_paid, (0)::numeric)) AS balance
   FROM ((public.students s
     LEFT JOIN ( SELECT student_charges.student_id,
            sum(student_charges.amount) AS total_charges
           FROM public.student_charges
          GROUP BY student_charges.student_id) c ON ((c.student_id = s.id)))
     LEFT JOIN ( SELECT fee_payments.student_id,
            sum(fee_payments.amount) AS total_paid
           FROM public.fee_payments
           WHERE (NOT fee_payments.voided)
           GROUP BY fee_payments.student_id) p ON ((p.student_id = s.id)));

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    txn_date date DEFAULT CURRENT_DATE NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_mode text DEFAULT 'Cash'::text NOT NULL,
    description text DEFAULT ''::text,
    reference text DEFAULT ''::text,
    source text DEFAULT 'manual'::text NOT NULL,
    source_id uuid,
    voided boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    CONSTRAINT transactions_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);

CREATE TABLE public.transport_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    vehicle_id uuid,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    category text DEFAULT 'Fuel'::text NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_mode text DEFAULT 'Cash'::text NOT NULL,
    vendor text DEFAULT ''::text,
    bill_no text DEFAULT ''::text,
    remarks text DEFAULT ''::text,
    voided boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone,
    created_by_name text,
    CONSTRAINT transport_expenses_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE public.user_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module text NOT NULL
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_number text NOT NULL,
    route_name text DEFAULT ''::text NOT NULL,
    driver_name text DEFAULT ''::text,
    driver_contact text DEFAULT ''::text,
    helper_name text DEFAULT ''::text,
    capacity integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_staff_id uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_km_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_date_changes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_charges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.academic_sessions, public.driver_km_logs, public.expense_categories, public.fee_categories, public.fee_payments, public.leave_requests, public.maintenance_expenses, public.payment_date_changes, public.payroll_periods, public.profiles, public.school_settings, public.staff, public.staff_attendance, public.staff_payments, public.student_charges, public.students, public.transactions, public.transport_expenses, public.user_modules, public.user_roles, public.vehicles TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;