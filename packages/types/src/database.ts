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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          body_fat_pct: number | null
          body_weight_kg: number | null
          created_at: string
          id: string
          measured_on: string
          notes: string | null
          user_id: string
        }
        Insert: {
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          created_at?: string
          id?: string
          measured_on?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          created_at?: string
          id?: string
          measured_on?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          action: string
          created_at: string
          document_id: string
          id: string
          platform: string | null
          source: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          id?: string
          platform?: string | null
          source: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          id?: string
          platform?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          plan: string
          source: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          plan?: string
          source?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          plan?: string
          source?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          equipment: string
          id: string
          muscle_group: string
          name: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          equipment?: string
          id?: string
          muscle_group: string
          name: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          equipment?: string
          id?: string
          muscle_group?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_hash: string
          doc_type: string
          id: string
          published_at: string
          requires_reaccept: boolean
          summary_hash: string | null
          url: string
          version: string
        }
        Insert: {
          content_hash: string
          doc_type: string
          id?: string
          published_at?: string
          requires_reaccept?: boolean
          summary_hash?: string | null
          url: string
          version: string
        }
        Update: {
          content_hash?: string
          doc_type?: string
          id?: string
          published_at?: string
          requires_reaccept?: boolean
          summary_hash?: string | null
          url?: string
          version?: string
        }
        Relationships: []
      }
      measurement_values: {
        Row: {
          id: string
          measurement_id: string
          site: string
          user_id: string
          value_cm: number
        }
        Insert: {
          id?: string
          measurement_id: string
          site: string
          user_id: string
          value_cm: number
        }
        Update: {
          id?: string
          measurement_id?: string
          site?: string
          user_id?: string
          value_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_values_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "body_measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          onboarded_at: string | null
          timezone: string
          updated_at: string
          weekly_goal: number
          weight_unit: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          weekly_goal?: number
          weight_unit?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
          weekly_goal?: number
          weight_unit?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_favorites: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_favorites?: boolean
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_favorites?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_seconds: number | null
          routine_id: string
          target_reps: string | null
          target_sets: number | null
          user_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          routine_id: string
          target_reps?: string | null
          target_sets?: number | null
          user_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          routine_id?: string
          target_reps?: string | null
          target_sets?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          position: number
          project_id: string | null
          updated_at: string
          user_id: string
          weekdays: number[]
          average_duration_seconds: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          position?: number
          project_id?: string | null
          updated_at?: string
          user_id: string
          weekdays?: number[]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          position?: number
          project_id?: string | null
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "routines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          session_id: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          session_id: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_id: string
          id: string
          is_completed: boolean
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
          set_type: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
          set_type?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          session_id?: string
          set_number?: number
          set_type?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_active_periods: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          session_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_active_periods_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          active_seconds: number | null
          created_at: string
          finished_at: string | null
          id: string
          name: string | null
          notes: string | null
          performed_on: string
          routine_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          performed_on?: string
          routine_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          performed_on?: string
          routine_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_documents: {
        Args: {
          p_document_ids: string[]
          p_platform?: string
          p_source: string
        }
        Returns: undefined
      }
      activate_project: { Args: { p_project_id: string }; Returns: undefined }
      average_duration_seconds: {
        Args: { "": Database["public"]["Tables"]["routines"]["Row"] }
        Returns: {
          error: true
        } & "the function public.average_duration_seconds with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      current_legal_document: {
        Args: { p_doc_type: string }
        Returns: {
          content_hash: string
          doc_type: string
          id: string
          published_at: string
          requires_reaccept: boolean
          summary_hash: string | null
          url: string
          version: string
        }
        SetofOptions: {
          from: "*"
          to: "legal_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      export_my_data: { Args: never; Returns: Json }
      finish_workout: { Args: { p_session_id: string }; Returns: Json }
      get_exercise_history: {
        Args: { p_exercise_id: string; p_from?: string }
        Returns: {
          best_e1rm_kg: number
          max_weight_kg: number
          performed_on: string
          session_id: string
          total_reps: number
          total_sets: number
          total_volume_kg: number
        }[]
      }
      get_exercise_records: { Args: { p_exercise_id: string }; Returns: Json }
      get_last_performance: {
        Args: { p_exercise_ids: string[] }
        Returns: {
          exercise_id: string
          performed_on: string
          reps: number
          set_number: number
          set_type: string
          weight_kg: number
        }[]
      }
      get_streak: {
        Args: never
        Returns: {
          best_streak: number
          current_streak: number
          current_week_count: number
          streak_at_risk: boolean
          week_secured: boolean
        }[]
      }
      get_training_days: {
        Args: { p_from: string; p_to: string }
        Returns: {
          performed_on: string
          sessions: number
          total_volume_kg: number
        }[]
      }
      grant_health_consent: {
        Args: { p_platform?: string }
        Returns: undefined
      }
      has_health_consent: { Args: never; Returns: boolean }
      is_premium: { Args: never; Returns: boolean }
      pause_workout: {
        Args: { p_at?: string; p_session_id: string }
        Returns: undefined
      }
      pending_documents: {
        Args: never
        Returns: {
          content_hash: string
          doc_type: string
          id: string
          published_at: string
          requires_reaccept: boolean
          summary_hash: string | null
          url: string
          version: string
        }[]
        SetofOptions: {
          from: "*"
          to: "legal_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resume_workout: {
        Args: { p_at?: string; p_session_id: string }
        Returns: undefined
      }
      revoke_health_consent: {
        Args: { p_platform?: string }
        Returns: undefined
      }
      save_routine: {
        Args: {
          p_exercises: Json
          p_name: string
          p_project_id: string
          p_routine_id: string
          p_weekdays: number[]
        }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
