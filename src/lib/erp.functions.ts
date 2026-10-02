import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = any;

const hasRole = async (s: Sb, userId: string, role: string) => {
  const { data } = await s.from("user_roles").select("role").eq("user_id", userId).eq("role", role).maybeSingle();
  return !!data;
};

const isAdmin = async (s: Sb, userId: string) => hasRole(s, userId, "admin");

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Bootstrap ----------

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const uid = context.userId as string;
    const [sessions, settings, profile, roles, modules, staffRow] = await Promise.all([
      s.from("academic_sessions").select("*").order("name", { ascending: false }),
      s.from("school_settings").select("*").limit(1).maybeSingle(),
      s.from("profiles").select("*").eq("id", uid).maybeSingle(),
      s.from("user_roles").select("role").eq("user_id", uid),
      s.from("user_modules").select("module").eq("user_id", uid),
      s.from("staff").select("id, name, designation, monthly_salary").eq("user_id", uid).maybeSingle(),
    ]);
    if (sessions.error) throw sessions.error;
    return {
      userId: uid,
      sessions: sessions.data ?? [],
      settings: settings.data,
      profile: profile.data,
      roles: (roles.data ?? []).map((r: any) => r.role),
      modules: (modules.data ?? []).map((m: any) => m.module),
      myStaff: staffRow.data,
      email: (profile.data as any)?.username ?? "",
    };
  });

// ---------- Dashboard ----------

const rangeSchema = z.object({
  sessionId: z.string().uuid().optional(),
  from: z.string(),
  to: z.string(),
});

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rangeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const uid = context.userId as string;

    let feeQ = s
      .from("fee_payments")
      .select("amount, payment_date, category, payment_mode, voided")
      .eq("voided", false)
      .gte("payment_date", data.from)
      .lte("payment_date", data.to);
    let txnQ = s
      .from("transactions")
      .select("txn_date, type, category, amount, description, payment_mode, voided, source")
      .eq("voided", false)
      .gte("txn_date", data.from)
      .lte("txn_date", data.to);
    let chargeQ = s.from("student_charges").select("student_id, amount");
    let allPayQ = s.from("fee_payments").select("student_id, amount").eq("voided", false);
    let payrollQ = s.from("payroll_periods").select("computed_salary, staff_id");
    let salPayQ = s.from("staff_payments").select("staff_id, amount").eq("voided", false);
    if (data.sessionId) {
      feeQ = feeQ.eq("session_id", data.sessionId);
      txnQ = txnQ.eq("session_id", data.sessionId);
      chargeQ = chargeQ.eq("session_id", data.sessionId);
      allPayQ = allPayQ.eq("session_id", data.sessionId);
      payrollQ = payrollQ.eq("session_id", data.sessionId);
      salPayQ = salPayQ.eq("session_id", data.sessionId);
    }

    const [fees, txns, charges, allPays, payrolls, salPays, recent, staffCount] = await Promise.all([
      feeQ,
      txnQ.order("txn_date", { ascending: false }).limit(2000),
      chargeQ,
      allPayQ,
      payrollQ,
      salPayQ,
      s
        .from("transactions")
        .select("*")
        .eq("voided", false)
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8),
      s.from("students").select("id", { count: "exact", head: true }).eq("archived", false),
    ]);

    const sum = (rows: any[], f: (r: any) => number) => rows.reduce((a, r) => a + Number(f(r) ?? 0), 0);
    const feeRows = fees.data ?? [];
    const txnRows = txns.data ?? [];
    const todayStr = new Date().toISOString().slice(0, 10);

    const collectionTotal = sum(feeRows, (r) => r.amount);
    const collectionToday = sum(feeRows.filter((r: any) => r.payment_date === todayStr), (r) => r.amount);
    const incomeOther = sum(txnRows.filter((r: any) => r.type === "income" && r.source === "manual"), (r) => r.amount);
    const expenseTotal = sum(txnRows.filter((r: any) => r.type === "expense"), (r) => r.amount);
    const expenseToday = sum(
      txnRows.filter((r: any) => r.type === "expense" && r.txn_date === todayStr),
      (r) => r.amount
    );

    // Pending fees per student (charges - payments, within session scope)
    const chargesBy = new Map<string, number>();
    for (const c of charges.data ?? []) chargesBy.set(c.student_id, (chargesBy.get(c.student_id) ?? 0) + Number(c.amount));
    const paysBy = new Map<string, number>();
    for (const p of allPays.data ?? []) paysBy.set(p.student_id, (paysBy.get(p.student_id) ?? 0) + Number(p.amount));
    let pendingFees = 0;
    let pendingStudents = 0;
    chargesBy.forEach((ch, sid) => {
      const bal = ch - (paysBy.get(sid) ?? 0);
      if (bal > 0.009) {
        pendingFees += bal;
        pendingStudents += 1;
      }
    });

    const salaryComputed = sum(payrolls.data ?? [], (r) => r.computed_salary);
    const salaryPaid = sum(salPays.data ?? [], (r) => r.amount);

    // expense breakdown by category
    const byCat = new Map<string, number>();
    for (const t of txnRows.filter((r: any) => r.type === "expense")) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + Number(t.amount));
    }

    return {
      collectionTotal,
      collectionToday,
      incomeOther,
      incomeTotal: collectionTotal + incomeOther,
      expenseTotal,
      expenseToday,
      net: collectionTotal + incomeOther - expenseTotal,
      pendingFees,
      pendingStudents,
      salaryDue: Math.max(0, salaryComputed - salaryPaid),
      salaryComputed,
      salaryPaid,
      students: staffCount.count ?? 0,
      byCategory: [...byCat.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      recent: recent.data ?? [],
    };
  });

// ---------- Students ----------

export const getStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid().optional(),
        q: z.string().optional(),
        className: z.string().optional(),
        section: z.string().optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let q = s
      .from("students")
      .select("id, admission_no, sr_number, name, father_name, class_name, section, contact, whatsapp, transport_required, status, vehicle_id, session_id")
      .eq("archived", false)
      .order("class_name")
      .order("name")
      .limit(500);
    if (data.sessionId) q = q.eq("session_id", data.sessionId);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,admission_no.ilike.%${data.q}%,father_name.ilike.%${data.q}%`);
    if (data.className) q = q.eq("class_name", data.className);
    if (data.section) q = q.eq("section", data.section);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getStudentDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const [student, charges, payments, vehicles] = await Promise.all([
      s.from("students").select("*, vehicles(vehicle_number, route_name)").eq("id", data.id).maybeSingle(),
      s
        .from("student_charges")
        .select("id, amount, remarks, created_at, session_id, fee_categories(name)")
        .eq("student_id", data.id)
        .order("created_at"),
      s
        .from("fee_payments")
        .select("*")
        .eq("student_id", data.id)
        .order("payment_date", { ascending: false }),
      s.from("vehicles").select("id, vehicle_number, route_name").eq("active", true),
    ]);
    if (student.error) throw student.error;
    if (charges.error) throw charges.error;
    if (payments.error) throw payments.error;
    const totalCharges = (charges.data ?? []).reduce((a, c) => a + Number(c.amount), 0);
    const totalPaid = (payments.data ?? []).filter((p) => !p.voided).reduce((a, p) => a + Number(p.amount), 0);
    return {
      student: student.data,
      charges: charges.data ?? [],
      payments: payments.data ?? [],
      vehicles: vehicles.data ?? [],
      totalCharges,
      totalPaid,
      balance: totalCharges - totalPaid,
    };
  });

export const collectFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        student_id: z.string().uuid(),
        session_id: z.string().uuid(),
        amount: z.number().positive(),
        payment_date: z.string(),
        payment_mode: z.string().min(1),
        category: z.string().min(1),
        remarks: z.string().optional().nullable(),
        allow_overpay: z.boolean().optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const uid = context.userId as string;
    const admin = await isAdmin(s, uid);

    const [charges, pays] = await Promise.all([
      s.from("student_charges").select("amount").eq("student_id", data.student_id).eq("session_id", data.session_id),
      s.from("fee_payments").select("amount").eq("student_id", data.student_id).eq("session_id", data.session_id).eq("voided", false),
    ]);
    const bal =
      (charges.data ?? []).reduce((a, c) => a + Number(c.amount), 0) -
      (pays.data ?? []).reduce((a, p) => a + Number(p.amount), 0);
    if (data.amount > bal + 0.009 && !data.allow_overpay) {
      throw new Error(`Amount ₹${data.amount} exceeds the pending balance of ₹${round2(bal)}. Tick "allow extra amount" (Admin only) to continue.`);
    }
    if (data.amount > bal + 0.009 && data.allow_overpay && !admin) {
      throw new Error("Only an Admin can allow an amount above the pending balance.");
    }

    const { data: rc, error: rcErr } = await s.rpc("next_receipt_no");
    if (rcErr) throw rcErr;
    const { data: row, error } = await s
      .from("fee_payments")
      .insert({
        student_id: data.student_id,
        session_id: data.session_id,
        receipt_no: rc as string,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_mode: data.payment_mode,
        category: data.category,
        remarks: data.remarks ?? null,
      })
      .select("id, receipt_no")
      .single();
    if (error) throw error;
    return row;
  });

export const voidFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can reverse a fee payment.");
    const { error } = await s.from("fee_payments").update({ voided: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addStudentCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        student_id: z.string().uuid(),
        session_id: z.string().uuid(),
        category_id: z.string().uuid(),
        amount: z.number().positive(),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("student_charges").insert(data as any);
    if (error) throw error;
    return { ok: true };
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        session_id: z.string().uuid(),
        admission_no: z.string().min(1),
        sr_number: z.string().optional().nullable(),
        name: z.string().min(1),
        father_name: z.string().optional().nullable(),
        mother_name: z.string().optional().nullable(),
        dob: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        class_name: z.string().min(1),
        section: z.string().optional().nullable(),
        contact: z.string().optional().nullable(),
        whatsapp: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        admission_date: z.string().optional().nullable(),
        transport_required: z.boolean(),
        vehicle_id: z.string().uuid().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("students").insert(data as any).select("id").single();
    if (error) throw error;
    return row;
  });

// ---------- Staff & Payroll ----------

export const getStaffList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const { data, error } = await s
      .from("staff")
      .select("id, staff_code, name, designation, department, contact, joining_date, monthly_salary, payment_type, status")
      .eq("archived", false)
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const getStaffDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const [staff, payments, periods, attendance, leaves] = await Promise.all([
      s.from("staff").select("*").eq("id", data.id).maybeSingle(),
      s.from("staff_payments").select("*").eq("staff_id", data.id).order("payment_date", { ascending: false }),
      s.from("payroll_periods").select("*").eq("staff_id", data.id).order("period_month", { ascending: false }),
      s.from("staff_attendance").select("*").eq("staff_id", data.id).order("att_date", { ascending: false }).limit(120),
      s.from("leave_requests").select("*").eq("staff_id", data.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (staff.error) throw staff.error;
    const paid = (payments.data ?? []).filter((p) => !p.voided).reduce((a, p) => a + Number(p.amount), 0);
    const computed = (periods.data ?? []).reduce((a, p) => a + Number(p.computed_salary), 0);
    return {
      staff: staff.data,
      payments: payments.data ?? [],
      periods: periods.data ?? [],
      attendance: attendance.data ?? [],
      leaves: leaves.data ?? [],
      computedTotal: computed,
      paidTotal: paid,
      balance: computed - paid,
    };
  });

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_code: z.string().min(1),
        name: z.string().min(1),
        designation: z.string().optional().nullable(),
        department: z.string().optional().nullable(),
        contact: z.string().optional().nullable(),
        joining_date: z.string().optional().nullable(),
        monthly_salary: z.number().nonnegative(),
        payment_type: z.string().min(1),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("staff").insert(data as any).select("id").single();
    if (error) throw error;
    return row;
  });

export const payStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_id: z.string().uuid(),
        session_id: z.string().uuid().optional().nullable(),
        period_month: z.string().optional().nullable(),
        amount: z.number().positive(),
        payment_date: z.string(),
        payment_mode: z.string().min(1),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const uid = context.userId as string;
    if (!(await hasRole(s, uid, "admin")) && !(await hasRole(s, uid, "accountant")))
      throw new Error("You do not have permission to record salary payments.");
    const { data: row, error } = await s
      .from("staff_payments")
      .insert({
        staff_id: data.staff_id,
        session_id: data.session_id ?? null,
        period_month: data.period_month ?? null,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_mode: data.payment_mode,
        remarks: data.remarks ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

const DAYS_PER_MONTH = 30; // Payroll rule: daily rate is ALWAYS monthly salary / 30.

export const getPayrollMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ month: z.string().regex(/^\d{4}-\d{2}-01$/), sessionId: z.string().uuid().optional() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const from = data.month;
    const dt = new Date(from + "T00:00:00Z");
    dt.setUTCMonth(dt.getUTCMonth() + 1);
    dt.setUTCDate(0);
    const to = dt.toISOString().slice(0, 10);

    const [staffRows, attRows, saved, pays] = await Promise.all([
      s.from("staff").select("id, staff_code, name, designation, monthly_salary, status").eq("archived", false).eq("status", "active").order("name"),
      s.from("staff_attendance").select("staff_id, status").gte("att_date", from).lte("att_date", to),
      s.from("payroll_periods").select("*").eq("period_month", from),
      s.from("staff_payments").select("staff_id, amount, voided").gte("payment_date", from).lte("payment_date", to).eq("voided", false),
    ]);
    if (staffRows.error) throw staffRows.error;

    const attBy = new Map<string, { present: number; absent: number; half: number; leave: number }>();
    for (const a of attRows.data ?? []) {
      const e = attBy.get(a.staff_id) ?? { present: 0, absent: 0, half: 0, leave: 0 };
      if (a.status === "present") e.present += 1;
      else if (a.status === "absent") e.absent += 1;
      else if (a.status === "half_day") e.half += 1;
      else if (a.status === "leave") e.leave += 1;
      attBy.set(a.staff_id, e);
    }
    const savedBy = new Map<string, any>();
    for (const p of saved.data ?? []) savedBy.set(p.staff_id, p);
    const paidBy = new Map<string, number>();
    for (const p of pays.data ?? []) paidBy.set(p.staff_id, (paidBy.get(p.staff_id) ?? 0) + Number(p.amount));

    const rows = (staffRows.data ?? []).map((st: any) => {
      const att = attBy.get(st.id) ?? { present: 0, absent: 0, half: 0, leave: 0 };
      const marked = att.present + att.absent + att.half + att.leave;
      const workingDays = marked;
      const paidDays = att.present + att.half * 0.5 + att.leave;
      const daily = Number(st.monthly_salary) / DAYS_PER_MONTH;
      const computed = round2(daily * paidDays);
      const existing = savedBy.get(st.id) ?? null;
      const paidMonth = paidBy.get(st.id) ?? 0;
      return {
        staff: st,
        ...att,
        workingDays,
        paidDays,
        daily: round2(daily),
        computed,
        saved: existing
          ? {
              id: existing.id,
              computed_salary: Number(existing.computed_salary),
              working_days: existing.working_days,
              paid_days: Number(existing.paid_days),
              remarks: existing.remarks,
            }
          : null,
        paidMonth,
        warning: att.absent > 4,
      };
    });
    return rows;
  });

export const savePayroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_id: z.string().uuid(),
        session_id: z.string().uuid().optional().nullable(),
        period_month: z.string().regex(/^\d{4}-\d{2}-01$/),
        working_days: z.number().int().nonnegative(),
        paid_days: z.number(),
        computed_salary: z.number().nonnegative(),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const uid = context.userId as string;
    const admin = await isAdmin(s, uid);
    if (!admin && !(await hasRole(s, uid, "accountant")))
      throw new Error("You do not have permission to save payroll.");
    const { data: existing } = await s
      .from("payroll_periods")
      .select("id")
      .eq("staff_id", data.staff_id)
      .eq("period_month", data.period_month)
      .maybeSingle();
    if (existing && !admin)
      throw new Error("This payroll is already saved and locked. Only an Admin can change a saved payroll.");
    const { error } = await s.from("payroll_periods").upsert(
      {
        staff_id: data.staff_id,
        session_id: data.session_id ?? null,
        period_month: data.period_month,
        working_days: data.working_days,
        paid_days: data.paid_days,
        gross_salary: 0,
        computed_salary: data.computed_salary,
        remarks: data.remarks ?? null,
      },
      { onConflict: "staff_id,period_month" }
    );
    if (error) throw error;
    return { ok: true };
  });

// ---------- Attendance ----------

export const getAttendanceDay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const [staff, att] = await Promise.all([
      s.from("staff").select("id, staff_code, name, designation").eq("archived", false).eq("status", "active").order("name"),
      s.from("staff_attendance").select("*").eq("att_date", data.date),
    ]);
    if (staff.error) throw staff.error;
    const by = new Map<string, any>();
    for (const a of att.data ?? []) by.set(a.staff_id, a);
    return {
      staff: staff.data ?? [],
      records: (staff.data ?? []).map((st: any) => ({ staff: st, record: by.get(st.id) ?? null })),
    };
  });

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_id: z.string().uuid(),
        att_date: z.string(),
        status: z.enum(["present", "absent", "half_day", "leave"]),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string)))
      throw new Error("Only an Admin can mark staff attendance.");
    const { error } = await s.from("staff_attendance").upsert(
      { staff_id: data.staff_id, att_date: data.att_date, status: data.status, remarks: data.remarks ?? null },
      { onConflict: "staff_id,att_date" }
    );
    if (error) throw error;
    return { ok: true };
  });

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const { data: me } = await s.from("staff").select("id").eq("user_id", context.userId).maybeSingle();
    if (!me) return { staffId: null, records: [] };
    const from = `${data.month}-01`;
    const dt = new Date(from + "T00:00:00Z");
    dt.setUTCMonth(dt.getUTCMonth() + 1);
    dt.setUTCDate(0);
    const { data: rows, error } = await s
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", me.id)
      .gte("att_date", from)
      .lte("att_date", dt.toISOString().slice(0, 10))
      .order("att_date");
    if (error) throw error;
    return { staffId: me.id, records: rows ?? [] };
  });

// ---------- Leave ----------

export const getLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leave_requests")
      .select("*, staff(name, designation)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const submitLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_id: z.string().uuid().optional(),
        from_date: z.string(),
        to_date: z.string(),
        reason: z.string().min(1),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let staffId = data.staff_id ?? null;
    if (!staffId) {
      const { data: me } = await s.from("staff").select("id").eq("user_id", context.userId).maybeSingle();
      if (!me) throw new Error("No staff profile is linked to your account.");
      staffId = me.id;
    }
    const { error } = await s.from("leave_requests").insert({
      staff_id: staffId,
      from_date: data.from_date,
      to_date: data.to_date,
      reason: data.reason,
      remarks: data.remarks ?? null,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  });

export const reviewLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]), admin_remarks: z.string().optional().nullable() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can approve or reject leave.");
    const { error } = await s
      .from("leave_requests")
      .update({ status: data.status, admin_remarks: data.admin_remarks ?? null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Transport ----------

export const getTransport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [vehicles, expenses, km, drivers] = await Promise.all([
      s.from("vehicles").select("*").order("vehicle_number"),
      s.from("transport_expenses").select("*, vehicles(vehicle_number)").order("expense_date", { ascending: false }).limit(200),
      s.from("driver_km_logs").select("*, staff(name), vehicles(vehicle_number, route_name)").order("log_date", { ascending: false }).limit(200),
      s.from("staff").select("id, name, designation, monthly_salary").eq("status", "active").ilike("designation", "%driver%"),
    ]);
    if (vehicles.error) throw vehicles.error;
    if (expenses.error) throw expenses.error;
    if (km.error) throw km.error;
    return {
      vehicles: vehicles.data ?? [],
      expenses: expenses.data ?? [],
      kmLogs: km.data ?? [],
      drivers: drivers.data ?? [],
    };
  });

export const addTransportExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        session_id: z.string().uuid().optional().nullable(),
        vehicle_id: z.string().uuid().optional().nullable(),
        expense_date: z.string(),
        category: z.string().min(1),
        amount: z.number().positive(),
        payment_mode: z.string().min(1),
        vendor: z.string().optional().nullable(),
        bill_no: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("transport_expenses").insert({ ...data, voided: false } as any);
    if (error) throw error;
    return { ok: true };
  });

export const addKmLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        staff_id: z.string().uuid(),
        vehicle_id: z.string().uuid().optional().nullable(),
        session_id: z.string().uuid().optional().nullable(),
        log_date: z.string(),
        km: z.number().nonnegative(),
        rate_per_km: z.number().nonnegative(),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("driver_km_logs").insert(data as any);
    if (error) throw error;
    return { ok: true };
  });

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        vehicle_number: z.string().min(1),
        route_name: z.string().min(1),
        driver_name: z.string().optional().nullable(),
        driver_contact: z.string().optional().nullable(),
        helper_name: z.string().optional().nullable(),
        capacity: z.number().int().optional().nullable(),
        driver_staff_id: z.string().uuid().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("vehicles").insert({ ...data, active: true } as any);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Maintenance ----------

export const getMaintenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("maintenance_expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(300);
    if (error) throw error;
    return data ?? [];
  });

export const addMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        session_id: z.string().uuid().optional().nullable(),
        expense_date: z.string(),
        title: z.string().min(1),
        category: z.string().min(1),
        location: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        vendor: z.string().optional().nullable(),
        amount: z.number().positive(),
        payment_mode: z.string().min(1),
        bill_no: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("maintenance_expenses").insert({ ...data, voided: false } as any);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Accounts ----------

export const getTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        type: z.enum(["income", "expense"]).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let q = s
      .from("transactions")
      .select("*")
      .eq("voided", false)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data.sessionId) q = q.eq("session_id", data.sessionId);
    if (data.from) q = q.gte("txn_date", data.from);
    if (data.to) q = q.lte("txn_date", data.to);
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw error;
    const income = (rows ?? []).filter((r: any) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
    const expense = (rows ?? []).filter((r: any) => r.type === "expense").reduce((a, r) => a + Number(r.amount), 0);
    return { rows: rows ?? [], income, expense, net: income - expense };
  });

export const addManualTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        session_id: z.string().uuid().optional().nullable(),
        txn_date: z.string(),
        type: z.enum(["income", "expense"]),
        category: z.string().min(1),
        amount: z.number().positive(),
        payment_mode: z.string().min(1),
        description: z.string().optional().nullable(),
        reference: z.string().optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("transactions").insert({ ...data, source: "manual", voided: false } as any);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Sessions ----------

export const getSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academic_sessions")
      .select("*")
      .order("name", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().min(1), start_date: z.string(), end_date: z.string() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can create sessions.");
    const { error } = await s.from("academic_sessions").insert({ ...data, is_active: false, archived: false } as any);
    if (error) throw error;
    return { ok: true };
  });

export const activateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can switch the active session.");
    const { error } = await s.from("academic_sessions").update({ is_active: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Users (Admin) ----------

export const getUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can manage users.");
    const [profiles, roles, modules] = await Promise.all([
      s.from("profiles").select("*").order("created_at"),
      s.from("user_roles").select("*"),
      s.from("user_modules").select("*"),
    ]);
    if (profiles.error) throw profiles.error;
    return {
      users: (profiles.data ?? []).map((p: any) => ({
        ...p,
        roles: (roles.data ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
        modules: (modules.data ?? []).filter((m: any) => m.user_id === p.id).map((m: any) => m.module),
      })),
    };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        full_name: z.string().min(1),
        role: z.enum(["admin", "accountant", "staff"]),
        modules: z.array(z.string()).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can create users.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.email },
    });
    if (createErr) throw createErr;
    const uid = created.user!.id;
    const [pErr, rErr] = await Promise.all([
      supabaseAdmin.from("profiles").upsert({ id: uid, full_name: data.full_name, username: data.email, active: true }),
      supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role }),
    ]);
    if (pErr.error) throw pErr.error;
    if (rErr.error) throw rErr.error;
    if (data.modules?.length) {
      const { error } = await supabaseAdmin.from("user_modules").insert(data.modules.map((m) => ({ user_id: uid, module: m })));
      if (error) throw error;
    }
    return { id: uid };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can manage users.");
    const { error } = await s.from("profiles").update({ active: data.active }).eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setUserModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), modules: z.array(z.string()) }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    if (!(await isAdmin(s, context.userId as string))) throw new Error("Only an Admin can manage users.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.from("user_modules").delete().eq("user_id", data.userId);
    if (delErr) throw delErr;
    if (data.modules.length) {
      const { error } = await supabaseAdmin.from("user_modules").insert(data.modules.map((m) => ({ user_id: data.userId, module: m })));
      if (error) throw error;
    }
    return { ok: true };
  });

// ---------- Fee categories ----------

export const getFeeCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("fee_categories").select("*").eq("active", true).order("name");
    if (error) throw error;
    return data ?? [];
  });

// ---------- Fee reports ----------

export const getPendingFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let studentQ = s
      .from("students")
      .select("id, admission_no, sr_number, name, class_name, section")
      .eq("archived", false)
      .order("class_name")
      .order("name");
    let chargeQ = s.from("student_charges").select("student_id, amount");
    let payQ = s.from("fee_payments").select("student_id, amount").eq("voided", false);
    if (data.sessionId) {
      studentQ = studentQ.eq("session_id", data.sessionId);
      chargeQ = chargeQ.eq("session_id", data.sessionId);
      payQ = payQ.eq("session_id", data.sessionId);
    }
    const [students, charges, pays] = await Promise.all([studentQ, chargeQ, payQ]);
    if (students.error) throw students.error;
    const chBy = new Map<string, number>();
    for (const c of charges.data ?? []) chBy.set(c.student_id, (chBy.get(c.student_id) ?? 0) + Number(c.amount));
    const payBy = new Map<string, number>();
    for (const p of pays.data ?? []) payBy.set(p.student_id, (payBy.get(p.student_id) ?? 0) + Number(p.amount));
    const rows = (students.data ?? [])
      .map((st: any) => {
        const charges = chBy.get(st.id) ?? 0;
        const paid = payBy.get(st.id) ?? 0;
        return { ...st, charges, paid, balance: charges - paid };
      })
      .filter((r) => r.balance > 0.009);
    return {
      rows,
      totalCharges: rows.reduce((a, r) => a + r.charges, 0),
      totalPaid: rows.reduce((a, r) => a + r.paid, 0),
      totalPending: rows.reduce((a, r) => a + r.balance, 0),
    };
  });

export const getFeePaymentsList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ sessionId: z.string().uuid().optional(), from: z.string().optional(), to: z.string().optional() })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let q = s
      .from("fee_payments")
      .select("*, students(name, admission_no, class_name, section)")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(400);
    if (data.sessionId) q = q.eq("session_id", data.sessionId);
    if (data.from) q = q.gte("payment_date", data.from);
    if (data.to) q = q.lte("payment_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });
