export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          archived: boolean
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      driver_km_logs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          km: number
          log_date: string
          rate_per_km: number
          remarks: string | null
          session_id: string | null
          staff_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          km: number
          log_date: string
          rate_per_km?: number
          remarks?: string | null
          session_id?: string | null
          staff_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          km?: number
          log_date?: string
          rate_per_km?: number
          remarks?: string | null
          session_id?: string | null
          staff_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_km_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_km_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_km_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          active: boolean
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      fee_categories: {
        Row: {
          active: boolean
          id: string
          is_transport: boolean
          name: string
        }
        Insert: {
          active?: boolean
          id?: string
          is_transport?: boolean
          name: string
        }
        Update: {
          active?: boolean
          id?: string
          is_transport?: boolean
          name?: string
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          id: string
          payment_date: string
          payment_mode: string
          receipt_no: string | null
          remarks: string | null
          session_id: string
          student_id: string
          updated_at: string | null
          updated_by: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          payment_mode?: string
          receipt_no?: string | null
          remarks?: string | null
          session_id: string
          student_id: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          payment_mode?: string
          receipt_no?: string | null
          remarks?: string | null
          session_id?: string
          student_id?: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          admin_remarks: string | null
          created_at: string
          from_date: string
          id: string
          reason: string
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          staff_id: string
          status: string
          to_date: string
        }
        Insert: {
          admin_remarks?: string | null
          created_at?: string
          from_date: string
          id?: string
          reason: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          staff_id: string
          status?: string
          to_date: string
        }
        Update: {
          admin_remarks?: string | null
          created_at?: string
          from_date?: string
          id?: string
          reason?: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          staff_id?: string
          status?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          bill_no: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          location: string | null
          payment_mode: string
          remarks: string | null
          session_id: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
          vendor: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bill_no?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          location?: string | null
          payment_mode?: string
          remarks?: string | null
          session_id?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          vendor?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bill_no?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          location?: string | null
          payment_mode?: string
          remarks?: string | null
          session_id?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          vendor?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_date_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          id: string
          new_date: string
          old_date: string
          payment_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_date: string
          old_date: string
          payment_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_date?: string
          old_date?: string
          payment_id?: string
          table_name?: string
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          computed_salary: number
          created_at: string
          created_by: string | null
          gross_salary: number
          id: string
          paid_days: number
          period_month: string
          remarks: string | null
          session_id: string | null
          staff_id: string
          updated_at: string | null
          updated_by: string | null
          working_days: number
        }
        Insert: {
          computed_salary?: number
          created_at?: string
          created_by?: string | null
          gross_salary?: number
          id?: string
          paid_days?: number
          period_month: string
          remarks?: string | null
          session_id?: string | null
          staff_id: string
          updated_at?: string | null
          updated_by?: string | null
          working_days?: number
        }
        Update: {
          computed_salary?: number
          created_at?: string
          created_by?: string | null
          gross_salary?: number
          id?: string
          paid_days?: number
          period_month?: string
          remarks?: string | null
          session_id?: string | null
          staff_id?: string
          updated_at?: string | null
          updated_by?: string | null
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          is_primary: boolean
          username: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string
          id: string
          is_primary?: boolean
          username?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          username?: string | null
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          address: string | null
          currency: string
          email: string | null
          id: boolean
          phone: string | null
          salary_day_rule: string
          school_name: string
          setup_complete: boolean
          updated_at: string
        }
        Insert: {
          address?: string | null
          currency?: string
          email?: string | null
          id?: boolean
          phone?: string | null
          salary_day_rule?: string
          school_name?: string
          setup_complete?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          currency?: string
          email?: string | null
          id?: boolean
          phone?: string | null
          salary_day_rule?: string
          school_name?: string
          setup_complete?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          archived: boolean
          contact: string | null
          created_at: string
          department: string | null
          designation: string | null
          id: string
          joining_date: string | null
          monthly_salary: number
          name: string
          payment_type: string
          staff_code: string
          status: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          contact?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          id?: string
          joining_date?: string | null
          monthly_salary?: number
          name: string
          payment_type?: string
          staff_code: string
          status?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          contact?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          id?: string
          joining_date?: string | null
          monthly_salary?: number
          name?: string
          payment_type?: string
          staff_code?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          att_date: string
          created_at: string
          id: string
          marked_by: string | null
          marked_by_name: string | null
          remarks: string | null
          staff_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          att_date: string
          created_at?: string
          id?: string
          marked_by?: string | null
          marked_by_name?: string | null
          remarks?: string | null
          staff_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          att_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          marked_by_name?: string | null
          remarks?: string | null
          staff_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          payment_date: string
          payment_mode: string
          period_month: string | null
          remarks: string | null
          session_id: string | null
          staff_id: string
          updated_at: string | null
          updated_by: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          payment_date?: string
          payment_mode?: string
          period_month?: string | null
          remarks?: string | null
          session_id?: string | null
          staff_id: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          payment_date?: string
          payment_mode?: string
          period_month?: string | null
          remarks?: string | null
          session_id?: string | null
          staff_id?: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_charges: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          remarks: string | null
          session_id: string
          student_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          remarks?: string | null
          session_id: string
          student_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          remarks?: string | null
          session_id?: string
          student_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_charges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balances"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_charges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          admission_no: string
          archived: boolean
          class_name: string
          contact: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          father_name: string | null
          gender: string | null
          id: string
          mother_name: string | null
          name: string
          section: string | null
          session_id: string
          sr_number: string | null
          status: string
          transport_required: boolean
          vehicle_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          admission_no: string
          archived?: boolean
          class_name?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          father_name?: string | null
          gender?: string | null
          id?: string
          mother_name?: string | null
          name: string
          section?: string | null
          session_id: string
          sr_number?: string | null
          status?: string
          transport_required?: boolean
          vehicle_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          admission_no?: string
          archived?: boolean
          class_name?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          father_name?: string | null
          gender?: string | null
          id?: string
          mother_name?: string | null
          name?: string
          section?: string | null
          session_id?: string
          sr_number?: string | null
          status?: string
          transport_required?: boolean
          vehicle_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_mode: string
          reference: string | null
          session_id: string | null
          source: string
          source_id: string | null
          txn_date: string
          type: string
          updated_at: string | null
          updated_by: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_mode?: string
          reference?: string | null
          session_id?: string | null
          source?: string
          source_id?: string | null
          txn_date?: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_mode?: string
          reference?: string | null
          session_id?: string | null
          source?: string
          source_id?: string | null
          txn_date?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_expenses: {
        Row: {
          amount: number
          bill_no: string | null
          category: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          expense_date: string
          id: string
          payment_mode: string
          remarks: string | null
          session_id: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string | null
          vendor: string | null
          voided: boolean
        }
        Insert: {
          amount: number
          bill_no?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          expense_date?: string
          id?: string
          payment_mode?: string
          remarks?: string | null
          session_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
          vendor?: string | null
          voided?: boolean
        }
        Update: {
          amount?: number
          bill_no?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          expense_date?: string
          id?: string
          payment_mode?: string
          remarks?: string | null
          session_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
          vendor?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transport_expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          id: string
          module: string
          user_id: string
        }
        Insert: {
          id?: string
          module: string
          user_id: string
        }
        Update: {
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          driver_contact: string | null
          driver_name: string | null
          driver_staff_id: string | null
          helper_name: string | null
          id: string
          route_name: string
          vehicle_number: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          driver_contact?: string | null
          driver_name?: string | null
          driver_staff_id?: string | null
          helper_name?: string | null
          id?: string
          route_name?: string
          vehicle_number: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          driver_contact?: string | null
          driver_name?: string | null
          driver_staff_id?: string | null
          helper_name?: string | null
          id?: string
          route_name?: string
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_staff_id_fkey"
            columns: ["driver_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_balances: {
        Row: {
          balance: number | null
          session_id: string | null
          student_id: string | null
          total_paid: number | null
          total_payable: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access: {
        Args: { _modules: string[]; _user_id: string }
        Returns: boolean
      }
      can_finance: { Args: { _user_id: string }; Returns: boolean }
      can_manage_students: { Args: { _user_id: string }; Returns: boolean }
      current_user_name: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_staff_id: { Args: never; Returns: string }
      next_receipt_no: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "accountant" | "staff" | "teacher" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "accountant", "staff", "teacher", "viewer"],
    },
  },
} as const
