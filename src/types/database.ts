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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          created_at: string | null
          hourly_rate: number | null
          id: number
          name: string
          role: string | null
          skills: string[] | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: never
          name: string
          role?: string | null
          skills?: string[] | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: never
          name?: string
          role?: string | null
          skills?: string[] | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          name: string
          standard_minutes: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: never
          name: string
          standard_minutes?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: never
          name?: string
          standard_minutes?: number | null
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          created_at: string | null
          employee_id: number
          end_time: string | null
          id: number
          notes: string | null
          partner_employee_id: number | null
          product_id: number
          quantity: number | null
          start_time: string
          work_date: string
        }
        Insert: {
          created_at?: string | null
          employee_id: number
          end_time?: string | null
          id?: never
          notes?: string | null
          partner_employee_id?: number | null
          product_id: number
          quantity?: number | null
          start_time: string
          work_date?: string
        }
        Update: {
          created_at?: string | null
          employee_id?: number
          end_time?: string | null
          id?: never
          notes?: string | null
          partner_employee_id?: number | null
          product_id?: number
          quantity?: number | null
          start_time?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_partner_employee_id_fkey"
            columns: ["partner_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_management_summary: {
        Row: {
          active_employees: number | null
          total_hours: number | null
          total_labor_cost: number | null
          total_minutes: number | null
          total_sessions: number | null
          work_date: string | null
        }
        Relationships: []
      }
      employee_daily_costs: {
        Row: {
          employee_name: string | null
          hourly_rate: number | null
          labor_cost: number | null
          total_hours: number | null
          total_minutes: number | null
          work_date: string | null
        }
        Relationships: []
      }
      employee_daily_hours: {
        Row: {
          employee_name: string | null
          total_hours: number | null
          work_date: string | null
        }
        Relationships: []
      }
      employee_productivity: {
        Row: {
          actual_minutes: number | null
          employee_name: string | null
          expected_minutes: number | null
          productivity_ratio: number | null
          work_date: string | null
        }
        Relationships: []
      }
      product_labor_summary: {
        Row: {
          avg_minutes_per_item: number | null
          avg_minutes_per_session: number | null
          avg_variance: number | null
          product_name: string | null
          work_date: string | null
          work_sessions: number | null
        }
        Relationships: []
      }
      work_log_summary: {
        Row: {
          actual_minutes: number | null
          employee_name: string | null
          end_time: string | null
          id: number | null
          product_name: string | null
          quantity: number | null
          standard_minutes: number | null
          start_time: string | null
          variance_minutes: number | null
          work_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
