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
      account_bans: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          lifted_at: string | null
          lifted_by: string | null
          note: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          note?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          note?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      account_deletion_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          last_error: string | null
          note: string | null
          reason: string
          scheduled_for: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          last_error?: string | null
          note?: string | null
          reason: string
          scheduled_for: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          last_error?: string | null
          note?: string | null
          reason?: string
          scheduled_for?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          feedback: number | null
          id: string
          role: string
          used_history: boolean
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          feedback?: number | null
          id: string
          role: string
          used_history?: boolean
          user_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          feedback?: number | null
          id?: string
          role?: string
          used_history?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_plan_imports: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      announcement_receipts: {
        Row: {
          announcement_id: string
          cta_at: string | null
          dismissed_at: string | null
          seen_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          cta_at?: string | null
          dismissed_at?: string | null
          seen_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          cta_at?: string | null
          dismissed_at?: string | null
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_receipts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_targets: {
        Row: {
          announcement_id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_path: string | null
          ended_at: string | null
          ended_by: string | null
          ends_at: string | null
          format: string
          frequency: string
          id: string
          is_account_notice: boolean
          priority: number
          published_at: string | null
          published_by: string | null
          purpose: string
          reach_estimate: number | null
          starts_at: string | null
          status: string
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_path?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ends_at?: string | null
          format?: string
          frequency?: string
          id?: string
          is_account_notice?: boolean
          priority?: number
          published_at?: string | null
          published_by?: string | null
          purpose?: string
          reach_estimate?: number | null
          starts_at?: string | null
          status?: string
          title?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_path?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ends_at?: string | null
          format?: string
          frequency?: string
          id?: string
          is_account_notice?: boolean
          priority?: number
          published_at?: string | null
          published_by?: string | null
          purpose?: string
          reach_estimate?: number | null
          starts_at?: string | null
          status?: string
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          constancy_points_per_day: number
          created_at: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points: number
          records_max: number | null
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
          constancy_points_per_day?: number
          created_at?: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points?: number
          records_max?: number | null
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
          constancy_points_per_day?: number
          created_at?: string
          effective_from?: string
          effort_max?: number
          max_minutes?: number
          min_minutes?: number
          record_points?: number
          records_max?: number | null
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
      features: {
        Row: {
          code: string
          description: string
          kind: string
        }
        Insert: {
          code: string
          description: string
          kind: string
        }
        Update: {
          code?: string
          description?: string
          kind?: string
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
      plan_features: {
        Row: {
          feature_code: string
          limit_value: number | null
          plan_code: string
        }
        Insert: {
          feature_code: string
          limit_value?: number | null
          plan_code: string
        }
        Update: {
          feature_code?: string
          limit_value?: number | null
          plan_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "plan_features_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      plan_grants: {
        Row: {
          created_at: string
          id: string
          plan_code: string
          revoked_at: string | null
          source: string
          subscription_id: string | null
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plan_code: string
          revoked_at?: string | null
          source: string
          subscription_id?: string | null
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plan_code?: string
          revoked_at?: string | null
          source?: string
          subscription_id?: string | null
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_grants_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "plan_grants_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          is_default: boolean
          is_purchasable: boolean
          name: string
          rank: number
        }
        Insert: {
          code: string
          created_at?: string
          is_default?: boolean
          is_purchasable?: boolean
          name: string
          rank: number
        }
        Update: {
          code?: string
          created_at?: string
          is_default?: boolean
          is_purchasable?: boolean
          name?: string
          rank?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_finish_workout: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_level: string | null
          id: string
          name: string | null
          onboarded_at: string | null
          product_announcements_opt_out: boolean
          profile_setup_completed_at: string | null
          timezone: string
          tour_completed_version: number | null
          training_goals: string[]
          updated_at: string
          weekly_goal: number
          weight_unit: string
        }
        Insert: {
          auto_finish_workout?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_level?: string | null
          id: string
          name?: string | null
          onboarded_at?: string | null
          product_announcements_opt_out?: boolean
          profile_setup_completed_at?: string | null
          timezone?: string
          tour_completed_version?: number | null
          training_goals?: string[]
          updated_at?: string
          weekly_goal?: number
          weight_unit?: string
        }
        Update: {
          auto_finish_workout?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          name?: string | null
          onboarded_at?: string | null
          product_announcements_opt_out?: boolean
          profile_setup_completed_at?: string | null
          timezone?: string
          tour_completed_version?: number | null
          training_goals?: string[]
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
          distance_km: number | null
          duration_seconds: number | null
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
          distance_km?: number | null
          duration_seconds?: number | null
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
          distance_km?: number | null
          duration_seconds?: number | null
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
      staff_members: {
        Row: {
          created_at: string
          disabled_at: string | null
          display_name: string
          invited_by: string | null
          last_seen_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          display_name: string
          invited_by?: string | null
          last_seen_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          display_name?: string
          invited_by?: string | null
          last_seen_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_code: string
          provider: string
          provider_ref: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_code: string
          provider: string
          provider_ref: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_code?: string
          provider?: string
          provider_ref?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
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
      account_has_storage_files: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      activate_project: { Args: { p_project_id: string }; Returns: undefined }
      active_ban_of: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          lifted_at: string | null
          lifted_by: string | null
          note: string | null
          reason: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_bans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_assert_role: { Args: { p_role: string }; Returns: undefined }
      admin_audience_count: {
        Args: { p_audience: Json; p_target_ids?: string[] }
        Returns: number
      }
      admin_ban_user: {
        Args: {
          p_ends_at: string
          p_note?: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_cancel_deletion: {
        Args: { p_note?: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_check_handle: {
        Args: { p_handle: string; p_user_id: string }
        Returns: string
      }
      admin_create_exercises: {
        Args: { p_exercises: Json; p_source?: string }
        Returns: {
          name: string
          status: string
        }[]
      }
      admin_delete_exercise: { Args: { p_id: string }; Returns: string }
      admin_delete_user: {
        Args: { p_note?: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_duplicate_announcement: { Args: { p_id: string }; Returns: string }
      admin_end_announcement: { Args: { p_id: string }; Returns: undefined }
      admin_exercise_usage: {
        Args: { p_id: string }
        Returns: {
          routines: number
          workouts: number
        }[]
      }
      admin_existing_exercise_names: {
        Args: { p_names: string[] }
        Returns: string[]
      }
      admin_get_announcement: { Args: { p_id: string }; Returns: Json }
      admin_get_user: { Args: { p_user_id: string }; Returns: Json }
      admin_list_announcements: {
        Args: never
        Returns: {
          audience: Json
          cta_count: number
          dismissed_count: number
          ends_at: string
          format: string
          id: string
          purpose: string
          reach_estimate: number
          seen_count: number
          starts_at: string
          state: string
          targets_count: number
          title: string
          tone: string
          updated_at: string
        }[]
      }
      admin_list_audit: {
        Args: {
          p_action?: string
          p_actor_id?: string
          p_before_id?: number
          p_from?: string
          p_limit?: number
          p_subject?: string
        }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          details: Json
          id: number
          occurred_at: string
          subject_id: string
          subject_label: string
        }[]
      }
      admin_list_exercises: {
        Args: {
          p_limit?: number
          p_muscle_groups?: string[]
          p_offset?: number
          p_query?: string
        }
        Returns: {
          created_at: string
          equipment: string
          id: string
          muscle_group: string
          name: string
          total_count: number
        }[]
      }
      admin_list_staff: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          has_verified_factor: boolean
          is_me: boolean
          last_seen_at: string
          role: string
          status: string
          user_id: string
        }[]
      }
      admin_me: {
        Args: never
        Returns: {
          aal: string
          display_name: string
          email: string
          has_verified_factor: boolean
          role: string
          user_id: string
        }[]
      }
      admin_publish_announcement: { Args: { p_id: string }; Returns: undefined }
      admin_request_password_reset: {
        Args: { p_note?: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_reveal_email: { Args: { p_user_id: string }; Returns: string }
      admin_save_announcement: {
        Args: { p_draft: Json; p_id: string; p_target_ids?: string[] }
        Returns: Json
      }
      admin_schedule_deletion: {
        Args: {
          p_at: string
          p_note?: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          ban_ends_at: string
          created_at: string
          deletion_scheduled_for: string
          handle: string
          is_banned: boolean
          masked_email: string
          name: string
          plan_code: string
          plan_is_default: boolean
          plan_name: string
          user_id: string
          visibility: string
        }[]
      }
      admin_set_plan: {
        Args: {
          p_note?: string
          p_notify?: boolean
          p_plan_code: string
          p_reason: string
          p_user_id: string
          p_valid_until: string
        }
        Returns: undefined
      }
      admin_set_staff_disabled: {
        Args: { p_disabled: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_set_staff_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_unban_user: {
        Args: { p_note?: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_unlink_identity: {
        Args: { p_note?: string; p_provider: string; p_user_id: string }
        Returns: undefined
      }
      admin_unlink_social_identities: {
        Args: { p_note?: string; p_user_id: string }
        Returns: number
      }
      admin_update_exercise: {
        Args: {
          p_equipment: string
          p_id: string
          p_muscle_group: string
          p_name: string
        }
        Returns: undefined
      }
      admin_update_handle: {
        Args: {
          p_handle: string
          p_note?: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_update_name: {
        Args: {
          p_name: string
          p_note?: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      announcement_allowed_for: {
        Args: { p_purpose: string; p_user_id: string }
        Returns: boolean
      }
      announcement_state: {
        Args: { p_ann: Database["public"]["Tables"]["announcements"]["Row"] }
        Returns: string
      }
      apply_subscription_event: {
        Args: {
          p_current_period_end: string
          p_plan_code: string
          p_provider: string
          p_provider_ref: string
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      assert_account_actionable: {
        Args: { p_user_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_announcement_valid: {
        Args: { p_ann: Database["public"]["Tables"]["announcements"]["Row"] }
        Returns: undefined
      }
      assert_staff_change_allowed: {
        Args: { p_losing_admin: boolean; p_user_id: string }
        Returns: {
          created_at: string
          disabled_at: string | null
          display_name: string
          invited_by: string | null
          last_seen_at: string | null
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "staff_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      audience_has_rule: {
        Args: { p_audience: Json; p_type: string }
        Returns: boolean
      }
      audience_match_created: {
        Args: { p_rule: Json; p_user_id: string }
        Returns: boolean
      }
      audience_match_plans: {
        Args: { p_rule: Json; p_user_id: string }
        Returns: boolean
      }
      audience_match_visibility: {
        Args: { p_rule: Json; p_user_id: string }
        Returns: boolean
      }
      audience_matches: {
        Args: { p_audience: Json; p_in_targets: boolean; p_user_id: string }
        Returns: boolean
      }
      audience_rule_valid: { Args: { p_rule: Json }; Returns: boolean }
      audience_valid: { Args: { p_audience: Json }; Returns: boolean }
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
      catalog_exercise_or_fail: {
        Args: { p_id: string }
        Returns: {
          archived_at: string | null
          created_at: string
          equipment: string
          id: string
          muscle_group: string
          name: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chart_visible_from: { Args: never; Returns: string }
      chart_visible_from_of: { Args: { p_user_id: string }; Returns: string }
      clear_uploaded_avatar: { Args: never; Returns: undefined }
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
          constancy_points_per_day: number
          created_at: string
          effective_from: string
          effort_max: number
          max_minutes: number
          min_minutes: number
          record_points: number
          records_max: number | null
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
      competition_standings: {
        Args: { p_from: string; p_metric: string; p_to: string }
        Returns: {
          avatar_url: string
          current_streak: number
          fulfilled_weeks: number
          handle: string
          is_me: boolean
          name: string
          points: number
          position: number
          previous_rank: number
          rank: number
          records: number
          total_count: number
          user_id: string
          valid_sessions: number
          value: number
          volume_kg: number
          workouts: number
        }[]
      }
      competition_visible_from: { Args: { p_from: string }; Returns: string }
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
      current_season_start_of: { Args: { p_user_id: string }; Returns: string }
      delete_account_now: { Args: { p_user_id: string }; Returns: undefined }
      effective_plan: { Args: never; Returns: string }
      ensure_social_profile: { Args: { p_user_id: string }; Returns: undefined }
      execute_scheduled_account_deletions: { Args: never; Returns: undefined }
      exercise_name_key: { Args: { p_name: string }; Returns: string }
      export_my_data: { Args: never; Returns: Json }
      feature_limit: { Args: { p_feature: string }; Returns: number }
      feature_limit_of: {
        Args: { p_feature: string; p_user_id: string }
        Returns: number
      }
      find_social_profile: { Args: { p_handle: string }; Returns: string }
      finish_workout: { Args: { p_session_id: string }; Returns: Json }
      get_best_e1rm: {
        Args: { p_exercise_ids: string[] }
        Returns: {
          best_e1rm_kg: number
          exercise_id: string
        }[]
      }
      get_cardio_bests: {
        Args: { p_before_session_id?: string; p_exercise_ids: string[] }
        Returns: {
          best_distance_km: number
          best_seconds_per_km: number
          exercise_id: string
        }[]
      }
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
      get_competition_days_unrestricted: {
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
      get_competition_season_podium: {
        Args: never
        Returns: {
          avatar_url: string
          handle: string
          is_me: boolean
          name: string
          points: number
          rank: number
          season: string
          user_id: string
        }[]
      }
      get_competition_series: {
        Args: { p_from: string; p_to: string; p_user_ids: string[] }
        Returns: Json
      }
      get_competition_standings: {
        Args: {
          p_from: string
          p_limit?: number
          p_metric: string
          p_offset?: number
          p_to: string
        }
        Returns: {
          avatar_url: string
          current_streak: number
          fulfilled_weeks: number
          handle: string
          is_me: boolean
          name: string
          points: number
          position: number
          previous_rank: number
          rank: number
          records: number
          total_count: number
          user_id: string
          valid_sessions: number
          value: number
          volume_kg: number
          workouts: number
        }[]
      }
      get_competition_standings_near_me: {
        Args: {
          p_from: string
          p_metric: string
          p_radius?: number
          p_to: string
        }
        Returns: {
          avatar_url: string
          current_streak: number
          fulfilled_weeks: number
          handle: string
          is_me: boolean
          name: string
          points: number
          position: number
          previous_rank: number
          rank: number
          records: number
          total_count: number
          user_id: string
          valid_sessions: number
          value: number
          volume_kg: number
          workouts: number
        }[]
      }
      get_competition_standings_of: {
        Args: {
          p_from: string
          p_metric: string
          p_to: string
          p_user_ids: string[]
        }
        Returns: {
          avatar_url: string
          current_streak: number
          fulfilled_weeks: number
          handle: string
          is_me: boolean
          name: string
          points: number
          position: number
          previous_rank: number
          rank: number
          records: number
          total_count: number
          user_id: string
          valid_sessions: number
          value: number
          volume_kg: number
          workouts: number
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
      get_competition_weeks_unrestricted: {
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
          distance_km: number
          duration_seconds: number
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
      get_member_evolution_unrestricted: {
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
          bio: string
          current_streak: number
          experience_level: string
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
          training_goals: string[]
          unlocked: boolean
          user_id: string
          visibility: string
          workouts_count: number
        }[]
      }
      get_member_workout: { Args: { p_session_id: string }; Returns: Json }
      get_member_workout_unrestricted: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_my_points_statement: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
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
      get_training_totals: {
        Args: { p_until?: string }
        Returns: {
          completed_sessions: number
          first_trained_on: string
          last_routine_id: string
          last_routine_on: string
        }[]
      }
      grant_health_consent: {
        Args: { p_platform?: string }
        Returns: undefined
      }
      grant_plan: {
        Args: {
          p_plan_code: string
          p_source?: string
          p_user_id: string
          p_valid_until?: string
        }
        Returns: string
      }
      guard_suspended_account: { Args: never; Returns: undefined }
      has_feature: { Args: { p_feature: string }; Returns: boolean }
      has_feature_of: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      has_health_consent: { Args: never; Returns: boolean }
      has_health_consent_of: { Args: { p_user_id: string }; Returns: boolean }
      import_training_plan: {
        Args: {
          p_activate: boolean
          p_new_exercises: Json
          p_project_id: string
          p_project_name: string
          p_routines: Json
        }
        Returns: string
      }
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
      list_member_workout_feed: {
        Args: { p_before?: string; p_limit?: number; p_user_id?: string }
        Returns: {
          duration_seconds: number
          edited_at: string
          exercises: Json
          finished_at: string
          name: string
          note: string
          performed_on: string
          points: number
          records: number
          session_id: string
          sets: number
          volume_kg: number
        }[]
      }
      list_member_workouts_unrestricted: {
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
      mark_announcement: {
        Args: { p_event: string; p_id: string }
        Returns: undefined
      }
      mask_email: { Args: { p_email: string }; Returns: string }
      member_history_from: { Args: { p_owner: string }; Returns: string }
      my_announcements: {
        Args: never
        Returns: {
          body: string
          cta_label: string
          cta_path: string
          format: string
          frequency: string
          id: string
          priority: number
          published_at: string
          title: string
          tone: string
        }[]
      }
      my_entitlements: { Args: never; Returns: Json }
      normalize_handle: { Args: { p_handle: string }; Returns: string }
      notify_account_change: {
        Args: { p_body: string; p_title: string; p_user_id: string }
        Returns: undefined
      }
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
      pending_documents_of: {
        Args: { p_doc_types: string[] }
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
      pending_subscription_documents: {
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
      plan_import_append_to_routine: {
        Args: {
          p_exercises: Json
          p_new_ids: Json
          p_project_id: string
          p_routine_id: string
        }
        Returns: undefined
      }
      plan_import_exercise_id: {
        Args: { p_item: Json; p_new_ids: Json }
        Returns: string
      }
      plan_of: { Args: { p_user_id: string }; Returns: string }
      post_push_alert: { Args: { p_body: Json }; Returns: undefined }
      purge_expired_ai_conversations: { Args: never; Returns: number }
      purge_expired_ai_plan_imports: { Args: never; Returns: number }
      purge_expired_announcements: { Args: never; Returns: undefined }
      purge_expired_audit_log: { Args: never; Returns: number }
      purge_expired_consent_proofs: { Args: never; Returns: number }
      random_social_handle: { Args: never; Returns: string }
      register_staff_member: {
        Args: {
          p_display_name: string
          p_invited_by?: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      remove_follower: { Args: { p_user_id: string }; Returns: undefined }
      request_follow: { Args: { p_user_id: string }; Returns: string }
      require_staff: {
        Args: { p_min_role: string }
        Returns: {
          created_at: string
          disabled_at: string | null
          display_name: string
          invited_by: string | null
          last_seen_at: string | null
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "staff_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      revoke_plan_grant: { Args: { p_grant_id: string }; Returns: undefined }
      save_body_measurement: {
        Args: { p_measured_on: string; p_values: Json }
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
      search_competition_rivals: {
        Args: {
          p_from: string
          p_limit?: number
          p_metric: string
          p_offset?: number
          p_query?: string
          p_to: string
        }
        Returns: {
          avatar_url: string
          current_streak: number
          fulfilled_weeks: number
          handle: string
          is_me: boolean
          name: string
          points: number
          position: number
          previous_rank: number
          rank: number
          records: number
          total_count: number
          user_id: string
          valid_sessions: number
          value: number
          volume_kg: number
          workouts: number
        }[]
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
      search_text_key: { Args: { p_text: string }; Returns: string }
      session_cardio_records: {
        Args: { p_user_id: string }
        Returns: {
          performed_on: string
          records: number
          session_id: string
        }[]
      }
      session_competition_records: {
        Args: { p_user_id: string }
        Returns: {
          performed_on: string
          records: number
          session_id: string
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
      staff_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_note: string
          p_reason: string
          p_subject_id: string
        }
        Returns: undefined
      }
      staff_role_rank: { Args: { p_role: string }; Returns: number }
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
