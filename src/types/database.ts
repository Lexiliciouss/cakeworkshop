export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          skills: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          skills?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          skills?: string;
          created_at?: string;
        };
      };
      work_logs: {
        Row: {
          id: string;
          product_id: string;
          employee_id: string;
          start_time: string;
          end_time: string;
          partner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          employee_id: string;
          start_time: string;
          end_time: string;
          partner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          employee_id?: string;
          start_time?: string;
          end_time?: string;
          partner_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Product = Database['public']['Tables']['products']['Row'];
export type Employee = Database['public']['Tables']['employees']['Row'];
export type WorkLog = Database['public']['Tables']['work_logs']['Row'];

export type WorkLogWithRelations = WorkLog & {
  products?: { name: string; category: string } | null;
  employees?: { name: string } | null;
  partner?: { name: string } | null;
};
