export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      user_accounts: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          preferences: Json;
          is_anonymized: boolean;
          analytics_opt_in: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          preferences?: Json;
          is_anonymized?: boolean;
          analytics_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          preferences?: Json;
          is_anonymized?: boolean;
          analytics_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          cycle_length_days: number;
          period_length_days: number;
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cycle_length_days?: number;
          period_length_days?: number;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cycle_length_days?: number;
          period_length_days?: number;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cycle_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          flow_intensity: 'light' | 'medium' | 'heavy' | 'spotting' | 'none' | null;
          notes: string | null;
          symptoms: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date: string;
          flow_intensity?: 'light' | 'medium' | 'heavy' | 'spotting' | 'none' | null;
          notes?: string | null;
          symptoms?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          flow_intensity?: 'light' | 'medium' | 'heavy' | 'spotting' | 'none' | null;
          notes?: string | null;
          symptoms?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          prediction_date: string;
          cycle_start_date: string | null;
          cycle_end_date: string | null;
          confidence: number | null;
          source: 'historical' | 'ai' | 'user_input' | 'hybrid' | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prediction_date: string;
          cycle_start_date?: string | null;
          cycle_end_date?: string | null;
          confidence?: number | null;
          source?: 'historical' | 'ai' | 'user_input' | 'hybrid' | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prediction_date?: string;
          cycle_start_date?: string | null;
          cycle_end_date?: string | null;
          confidence?: number | null;
          source?: 'historical' | 'ai' | 'user_input' | 'hybrid' | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
