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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          details: Json
          id: number
          occurred_at: string
          payload_hash: string
          prev_hash: string | null
          self_hash: string
          subject_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          details?: Json
          id?: never
          occurred_at?: string
          payload_hash: string
          prev_hash?: string | null
          self_hash: string
          subject_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          details?: Json
          id?: never
          occurred_at?: string
          payload_hash?: string
          prev_hash?: string | null
          self_hash?: string
          subject_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
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
      competition_alert_states: {
        Row: {
          rival_id: string
          season: string
          state: string
          updated_at: string
          watcher_id: string
        }
        Insert: {
          rival_id: string
          season: string
          state: string
          updated_at?: string
          watcher_id: string
        }
        Update: {
          rival_id?: string
          season?: string
          state?: string
          updated_at?: string
          watcher_id?: string
        }
        Relationships: []
      }
      competition_parameters: {
        Row: {
          bonus_max: number
          bonus_per_week: number
          constancy_max: number
          created_at: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points: number
          records_max: number
          reference_load: number
          rpe_gap: number
          rpe_high_cap: number
          rpe_high_share: number
          rpe_high_value: number
          rpe_window_days: number
          sessions_for_max_constancy: number
          volume_max: number
          volume_window_weeks: number
        }
        Insert: {
          bonus_max: number
          bonus_per_week: number
          constancy_max: number
          created_at?: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points?: number
          records_max?: number
          reference_load: number
          rpe_gap: number
          rpe_high_cap: number
          rpe_high_share: number
          rpe_high_value: number
          rpe_window_days: number
          sessions_for_max_constancy: number
          volume_max?: number
          volume_window_weeks?: number
        }
        Update: {
          bonus_max?: number
          bonus_per_week?: number
          constancy_max?: number
          created_at?: string
          effective_from?: string
          effort_max?: number
          max_minutes?: number
          min_minutes?: number
          record_points?: number
          records_max?: number
          reference_load?: number
          rpe_gap?: number
          rpe_high_cap?: number
          rpe_high_share?: number
          rpe_high_value?: number
          rpe_window_days?: number
          sessions_for_max_constancy?: number
          volume_max?: number
          volume_window_weeks?: number
        }
        Relationships: []
      }
      consent_proofs: {
        Row: {
          account_deleted_at: string
          action: string
          consented_at: string
          content_hash: string
          doc_type: string
          doc_version: string
          document_id: string
          email_sha256: string | null
          former_user_id: string
          id: string
          original_record_id: string
          platform: string | null
          purge_after: string
          source: string
          summary_hash: string | null
        }
        Insert: {
          account_deleted_at?: string
          action: string
          consented_at: string
          content_hash: string
          doc_type: string
          doc_version: string
          document_id: string
          email_sha256?: string | null
          former_user_id: string
          id?: string
          original_record_id: string
          platform?: string | null
          purge_after?: string
          source: string
          summary_hash?: string | null
        }
        Update: {
          account_deleted_at?: string
          action?: string
          consented_at?: string
          content_hash?: string
          doc_type?: string
          doc_version?: string
          document_id?: string
          email_sha256?: string | null
          former_user_id?: string
          id?: string
          original_record_id?: string
          platform?: string | null
          purge_after?: string
          source?: string
          summary_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_proofs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
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
      follow_alerts_sent: {
        Row: {
          actor_id: string
          kind: string
          recipient_id: string
          sent_at: string
        }
        Insert: {
          actor_id: string
          kind: string
          recipient_id: string
          sent_at?: string
        }
        Update: {
          actor_id?: string
          kind?: string
          recipient_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          followee_id: string
          follower_id: string
          status: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
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
          auto_finish_workout: boolean
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          onboarded_at: string | null
          timezone: string
          tour_completed_version: number | null
          updated_at: string
          weekly_goal: number
          weight_unit: string
        }
        Insert: {
          auto_finish_workout?: boolean
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          onboarded_at?: string | null
          timezone?: string
          tour_completed_version?: number | null
          updated_at?: string
          weekly_goal?: number
          weight_unit?: string
        }
        Update: {
          auto_finish_workout?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          onboarded_at?: string | null
          timezone?: string
          tour_completed_version?: number | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_sent_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_sent_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_sent_at?: string | null
          p256dh?: string
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
          target_weight_kg: number | null
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
          target_weight_kg?: number | null
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
          target_weight_kg?: number | null
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
          auto_progress: boolean
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
          auto_progress?: boolean
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
          auto_progress?: boolean
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
      social_profiles: {
        Row: {
          created_at: string
          handle: string
          history_hidden: boolean
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          handle: string
          history_hidden?: boolean
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          handle?: string
          history_hidden?: boolean
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
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
          auto_finished: boolean
          created_at: string
          edited_at: string | null
          finished_at: string | null
          id: string
          measured_active_seconds: number | null
          name: string | null
          notes: string | null
          performed_on: string
          routine_id: string | null
          session_rpe: number | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          auto_finished?: boolean
          created_at?: string
          edited_at?: string | null
          finished_at?: string | null
          id?: string
          measured_active_seconds?: number | null
          name?: string | null
          notes?: string | null
          performed_on?: string
          routine_id?: string | null
          session_rpe?: number | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          auto_finished?: boolean
          created_at?: string
          edited_at?: string | null
          finished_at?: string | null
          id?: string
          measured_active_seconds?: number | null
          name?: string | null
          notes?: string | null
          performed_on?: string
          routine_id?: string | null
          session_rpe?: number | null
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
      audit_log_append: {
        Args: { p_action: string; p_details?: Json; p_subject_id: string }
        Returns: undefined
      }
      audit_log_hash: {
        Args: {
          p_action: string
          p_actor_id: string
          p_occurred_at: string
          p_payload_hash: string
          p_prev_hash: string
          p_subject_id: string
        }
        Returns: string
      }
      auto_finish_idle_workouts: { Args: { p_idle?: string }; Returns: number }
      average_duration_seconds: {
        Args: { "": Database["public"]["Tables"]["routines"]["Row"] }
        Returns: {
          error: true
        } & "the function public.average_duration_seconds with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      block_user: { Args: { p_user_id: string }; Returns: undefined }
      build_follow_alert: {
        Args: { p_followee_id: string; p_follower_id: string; p_kind: string }
        Returns: {
          actor_handle: string
          actor_id: string
          actor_name: string
          kind: string
          recipient_id: string
        }[]
      }
      can_view_member: {
        Args: { p_owner: string; p_viewer: string }
        Returns: boolean
      }
      can_view_member_history: {
        Args: { p_owner: string; p_viewer: string }
        Returns: boolean
      }
      competition_alert_state: {
        Args: { p_rival_points: number; p_watcher_points: number }
        Returns: string
      }
      competition_params_for: {
        Args: { p_season: string }
        Returns: {
          bonus_max: number
          bonus_per_week: number
          constancy_max: number
          created_at: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points: number
          records_max: number
          reference_load: number
          rpe_gap: number
          rpe_high_cap: number
          rpe_high_share: number
          rpe_high_value: number
          rpe_window_days: number
          sessions_for_max_constancy: number
          volume_max: number
          volume_window_weeks: number
        }
        SetofOptions: {
          from: "*"
          to: "competition_parameters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      competition_season_of: { Args: { p_week_start: string }; Returns: string }
      competition_season_points: {
        Args: { p_season: string; p_user_id: string }
        Returns: number
      }
      competition_session_scores: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          counted: boolean
          is_valid: boolean
          minutes_considered: number
          records: number
          session_id: string
          training_day: string
          volume: number
          week_start: string
        }[]
      }
      competition_week_scores: {
        Args: { p_to: string; p_user_id: string }
        Returns: {
          bonus_points: number
          consecutive_weeks: number
          constancy_points: number
          fulfilled: boolean
          points: number
          record_points: number
          records: number
          valid_sessions: number
          volume_points: number
          week_start: string
          weekly_volume: number
        }[]
      }
      competitors_of: {
        Args: { p_user_id: string }
        Returns: {
          competitor_id: string
        }[]
      }
      compute_competition_alerts: {
        Args: { p_user_id: string }
        Returns: {
          gap: number
          kind: string
          recipient_id: string
          rival_id: string
          rival_name: string
        }[]
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
      ensure_social_profile: { Args: { p_user_id: string }; Returns: undefined }
      export_my_data: { Args: never; Returns: Json }
      find_social_profile: { Args: { p_handle: string }; Returns: string }
      finish_workout: { Args: { p_session_id: string }; Returns: Json }
      get_competition_days: {
        Args: { p_from: string; p_to: string }
        Returns: {
          day: string
          records: number
          user_id: string
          volume_kg: number
          workouts: number
        }[]
      }
      get_competition_participants: {
        Args: never
        Returns: {
          avatar_url: string
          current_streak: number
          handle: string
          is_me: boolean
          name: string
          user_id: string
        }[]
      }
      get_competition_weeks: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bonus_points: number
          constancy_points: number
          fulfilled: boolean
          points: number
          record_points: number
          records: number
          user_id: string
          valid_sessions: number
          volume_points: number
          week_start: string
          weekly_volume: number
        }[]
      }
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
      get_member_evolution: {
        Args: { p_user_id?: string; p_weeks?: number }
        Returns: {
          active_seconds: number
          max_weight_kg: number
          sessions: number
          volume_kg: number
          week_start: string
        }[]
      }
      get_member_profile: {
        Args: { p_user_id?: string }
        Returns: {
          avatar_url: string
          best_streak: number
          current_streak: number
          first_workout_on: string
          followers_count: number
          following_count: number
          follows_you: boolean
          handle: string
          history_hidden: boolean
          history_visible: boolean
          is_competitor: boolean
          is_self: boolean
          name: string
          recent_weeks: boolean[]
          relationship: string
          unlocked: boolean
          user_id: string
          visibility: string
          workouts_count: number
        }[]
      }
      get_member_workout: { Args: { p_session_id: string }; Returns: Json }
      get_my_social: {
        Args: never
        Returns: {
          followers_count: number
          following_count: number
          handle: string
          history_hidden: boolean
          pending_requests_count: number
          user_id: string
          visibility: string
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
      is_blocked_between: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      is_premium: { Args: never; Returns: boolean }
      list_member_workouts: {
        Args: { p_before?: string; p_limit?: number; p_user_id?: string }
        Returns: {
          duration_seconds: number
          finished_at: string
          name: string
          performed_on: string
          records: number
          session_id: string
          sets: number
          volume_kg: number
        }[]
      }
      list_social_connections: {
        Args: { p_kind: string; p_user_id?: string }
        Returns: {
          avatar_url: string
          handle: string
          is_mutual: boolean
          name: string
          since: string
          status: string
          user_id: string
        }[]
      }
      local_today: { Args: { p_user_id: string }; Returns: string }
      normalize_handle: { Args: { p_handle: string }; Returns: string }
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
      post_push_alert: { Args: { p_body: Json }; Returns: undefined }
      purge_expired_audit_log: { Args: never; Returns: number }
      purge_expired_consent_proofs: { Args: never; Returns: number }
      random_social_handle: { Args: never; Returns: string }
      remove_follower: { Args: { p_user_id: string }; Returns: undefined }
      request_follow: { Args: { p_user_id: string }; Returns: string }
      respond_follow_request: {
        Args: { p_accept: boolean; p_user_id: string }
        Returns: undefined
      }
      resume_workout: {
        Args: { p_at?: string; p_session_id: string }
        Returns: undefined
      }
      revoke_health_consent: {
        Args: { p_platform?: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      save_routine: {
        Args: {
          p_auto_progress?: boolean
          p_exercises: Json
          p_name: string
          p_project_id: string
          p_routine_id: string
          p_weekdays: number[]
        }
        Returns: string
      }
      save_workout_edit: {
        Args: {
          p_active_seconds: number
          p_exercises: Json
          p_note: string
          p_session_id: string
        }
        Returns: undefined
      }
      search_social_profiles: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          follows_you: boolean
          handle: string
          name: string
          relationship: string
          user_id: string
          visibility: string
        }[]
      }
      session_load_records: {
        Args: { p_user_id: string }
        Returns: {
          performed_on: string
          records: number
          session_id: string
        }[]
      }
      social_relationship: {
        Args: { p_other: string; p_viewer: string }
        Returns: string
      }
      streak_for: {
        Args: { p_user_id: string }
        Returns: {
          best_streak: number
          current_streak: number
          current_week_count: number
          streak_at_risk: boolean
          week_secured: boolean
        }[]
      }
      unblock_user: { Args: { p_user_id: string }; Returns: undefined }
      unfollow: { Args: { p_user_id: string }; Returns: undefined }
      update_routine_from_workout: {
        Args: { p_session_id: string }
        Returns: string
      }
      update_social_handle: { Args: { p_handle: string }; Returns: undefined }
      update_social_settings: {
        Args: { p_history_hidden: boolean; p_visibility: string }
        Returns: undefined
      }
      verify_audit_log: {
        Args: never
        Returns: {
          checked: number
          first_broken_id: number
        }[]
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
