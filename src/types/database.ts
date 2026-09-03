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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      browser_events: {
        Row: {
          created_at: string
          domain: string
          duration_seconds: number | null
          event_type: Database["public"]["Enums"]["browser_event_type_enum"]
          focus_session_id: string | null
          id: string
          occurred_at: string
          session_id: string
          source_client: Database["public"]["Enums"]["source_client_enum"]
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          duration_seconds?: number | null
          event_type: Database["public"]["Enums"]["browser_event_type_enum"]
          focus_session_id?: string | null
          id?: string
          occurred_at?: string
          session_id: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          duration_seconds?: number | null
          event_type?: Database["public"]["Enums"]["browser_event_type_enum"]
          focus_session_id?: string | null
          id?: string
          occurred_at?: string
          session_id?: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_events_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "browser_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_events: {
        Row: {
          created_at: string
          error_message: string | null
          google_event_id: string | null
          id: string
          source_id: string
          source_type: string
          sync_status: string
          synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          source_id: string
          source_type: string
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          source_id?: string
          source_type?: string
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      cutoffs: {
        Row: {
          category: string
          created_at: string
          cutoff: number
          exam_type: Database["public"]["Enums"]["exam_type_enum"]
          id: string
          maximum_marks: number
          reference: string | null
          stage: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          category?: string
          created_at?: string
          cutoff: number
          exam_type: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks: number
          reference?: string | null
          stage: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          cutoff?: number
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks?: number
          reference?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      day_annotations: {
        Row: {
          created_at: string
          date: string
          exclude_from_trends: boolean
          id: string
          note: string | null
          tag: Database["public"]["Enums"]["annotation_tag_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          exclude_from_trends?: boolean
          id?: string
          note?: string | null
          tag: Database["public"]["Enums"]["annotation_tag_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          exclude_from_trends?: boolean
          id?: string
          note?: string | null
          tag?: Database["public"]["Enums"]["annotation_tag_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          deleted_at: string | null
          exam_date: string | null
          exam_type: Database["public"]["Enums"]["exam_type_enum"]
          id: string
          maximum_marks: number | null
          name: string
          safety_target_score: number | null
          stage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          exam_date?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks?: number | null
          name: string
          safety_target_score?: number | null
          stage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          exam_date?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks?: number | null
          name?: string
          safety_target_score?: number | null
          stage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          created_at: string
          id: string
          interruption_count: number
          session_id: string
          source_client: Database["public"]["Enums"]["source_client_enum"]
          total_distraction_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interruption_count?: number
          session_id: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          total_distraction_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interruption_count?: number
          session_id?: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          total_distraction_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_sections: {
        Row: {
          attempted: number
          correct: number
          created_at: string
          duration_minutes: number | null
          id: string
          maximum_marks: number
          mock_id: string
          name: string
          score: number
          unattempted: number
          updated_at: string
          user_id: string
          wrong: number
        }
        Insert: {
          attempted: number
          correct: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          maximum_marks: number
          mock_id: string
          name: string
          score: number
          unattempted: number
          updated_at?: string
          user_id: string
          wrong: number
        }
        Update: {
          attempted?: number
          correct?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          maximum_marks?: number
          mock_id?: string
          name?: string
          score?: number
          unattempted?: number
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_sections_mock_id_fkey"
            columns: ["mock_id"]
            isOneToOne: false
            referencedRelation: "mocks"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_topic_results: {
        Row: {
          attempted: number
          correct: number
          created_at: string
          id: string
          mock_id: string
          topic_id: string
          updated_at: string
          user_id: string
          wrong: number
        }
        Insert: {
          attempted: number
          correct: number
          created_at?: string
          id?: string
          mock_id: string
          topic_id: string
          updated_at?: string
          user_id: string
          wrong: number
        }
        Update: {
          attempted?: number
          correct?: number
          created_at?: string
          id?: string
          mock_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_topic_results_mock_id_fkey"
            columns: ["mock_id"]
            isOneToOne: false
            referencedRelation: "mocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_topic_results_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mocks: {
        Row: {
          actual_duration_minutes: number
          attempted: number
          client_generated_id: string | null
          correct: number
          created_at: string
          deleted_at: string | null
          exam_type: Database["public"]["Enums"]["exam_type_enum"]
          id: string
          maximum_marks: number
          mock_date: string
          name: string
          notes: string | null
          percentile: number | null
          rank: number | null
          recommended_duration_minutes: number | null
          score: number
          source: string
          source_client: Database["public"]["Enums"]["source_client_enum"]
          stage: string | null
          unattempted: number
          updated_at: string
          user_id: string
          wrong: number
        }
        Insert: {
          actual_duration_minutes: number
          attempted: number
          client_generated_id?: string | null
          correct: number
          created_at?: string
          deleted_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks: number
          mock_date: string
          name: string
          notes?: string | null
          percentile?: number | null
          rank?: number | null
          recommended_duration_minutes?: number | null
          score: number
          source: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          stage?: string | null
          unattempted: number
          updated_at?: string
          user_id: string
          wrong: number
        }
        Update: {
          actual_duration_minutes?: number
          attempted?: number
          client_generated_id?: string | null
          correct?: number
          created_at?: string
          deleted_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          maximum_marks?: number
          mock_date?: string
          name?: string
          notes?: string | null
          percentile?: number | null
          rank?: number | null
          recommended_duration_minutes?: number | null
          score?: number
          source?: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          stage?: string | null
          unattempted?: number
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Relationships: []
      }
      phone_events: {
        Row: {
          app_name: string | null
          app_package: string
          created_at: string
          duration_seconds: number | null
          event_type: Database["public"]["Enums"]["phone_event_type_enum"]
          id: string
          occurred_at: string
          session_id: string
          source_client: Database["public"]["Enums"]["source_client_enum"]
          user_id: string
        }
        Insert: {
          app_name?: string | null
          app_package: string
          created_at?: string
          duration_seconds?: number | null
          event_type: Database["public"]["Enums"]["phone_event_type_enum"]
          id?: string
          occurred_at?: string
          session_id: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          user_id: string
        }
        Update: {
          app_name?: string | null
          app_package?: string
          created_at?: string
          duration_seconds?: number | null
          event_type?: Database["public"]["Enums"]["phone_event_type_enum"]
          id?: string
          occurred_at?: string
          session_id?: string
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          daily_target_hours: number
          day_boundary_offset_minutes: number
          exam_targets: string[] | null
          full_name: string | null
          google_last_synced_at: string | null
          google_refresh_token: string | null
          id: string
          onboarding_complete: boolean
          timezone: string
          tutorial_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_target_hours?: number
          day_boundary_offset_minutes?: number
          exam_targets?: string[] | null
          full_name?: string | null
          google_last_synced_at?: string | null
          google_refresh_token?: string | null
          id?: string
          onboarding_complete?: boolean
          timezone?: string
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_target_hours?: number
          day_boundary_offset_minutes?: number
          exam_targets?: string[] | null
          full_name?: string | null
          google_last_synced_at?: string | null
          google_refresh_token?: string | null
          id?: string
          onboarding_complete?: boolean
          timezone?: string
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_batches: {
        Row: {
          attempted: number
          chapter_id: string | null
          client_generated_id: string | null
          correct: number
          created_at: string
          deleted_at: string | null
          duration_minutes: number | null
          id: string
          logged_at: string
          notes: string | null
          session_id: string | null
          skipped: number
          source: string | null
          source_client: Database["public"]["Enums"]["source_client_enum"]
          subject_id: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
          wrong: number
        }
        Insert: {
          attempted: number
          chapter_id?: string | null
          client_generated_id?: string | null
          correct?: number
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          session_id?: string | null
          skipped?: number
          source?: string | null
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
          wrong?: number
        }
        Update: {
          attempted?: number
          chapter_id?: string | null
          client_generated_id?: string | null
          correct?: number
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          session_id?: string | null
          skipped?: number
          source?: string | null
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_batches_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_batches_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      real_exam_results: {
        Row: {
          client_generated_id: string | null
          created_at: string
          cutoff_used: number | null
          exam_date: string
          exam_name: string
          exam_type: string
          id: string
          notes: string | null
          stage: string | null
          subject_breakdown: Json | null
          total_max: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          cutoff_used?: number | null
          exam_date: string
          exam_name: string
          exam_type?: string
          id?: string
          notes?: string | null
          stage?: string | null
          subject_breakdown?: Json | null
          total_max: number
          total_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          cutoff_used?: number | null
          exam_date?: string
          exam_name?: string
          exam_type?: string
          id?: string
          notes?: string | null
          stage?: string | null
          subject_breakdown?: Json | null
          total_max?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          adaptive_interval_days: number | null
          client_generated_id: string | null
          completed_at: string | null
          created_at: string
          cycle_type: Database["public"]["Enums"]["revision_cycle_enum"]
          due_date: string
          grace_window_days: number
          id: string
          is_adaptive: boolean
          recall_score: number | null
          source_session_id: string | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adaptive_interval_days?: number | null
          client_generated_id?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_type: Database["public"]["Enums"]["revision_cycle_enum"]
          due_date: string
          grace_window_days?: number
          id?: string
          is_adaptive?: boolean
          recall_score?: number | null
          source_session_id?: string | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adaptive_interval_days?: number | null
          client_generated_id?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_type?: Database["public"]["Enums"]["revision_cycle_enum"]
          due_date?: string
          grace_window_days?: number
          id?: string
          is_adaptive?: boolean
          recall_score?: number | null
          source_session_id?: string | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_questions: {
        Row: {
          client_generated_id: string | null
          created_at: string
          deleted_at: string | null
          error_category:
            | Database["public"]["Enums"]["error_category_enum"]
            | null
          exam_type: Database["public"]["Enums"]["exam_type_enum"] | null
          explanation: string | null
          id: string
          image_path: string | null
          linked_revision_id: string | null
          next_review_date: string | null
          review_count: number
          source: string | null
          subject_id: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_category?:
            | Database["public"]["Enums"]["error_category_enum"]
            | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"] | null
          explanation?: string | null
          id?: string
          image_path?: string | null
          linked_revision_id?: string | null
          next_review_date?: string | null
          review_count?: number
          source?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_category?:
            | Database["public"]["Enums"]["error_category_enum"]
            | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"] | null
          explanation?: string | null
          id?: string
          image_path?: string | null
          linked_revision_id?: string | null
          next_review_date?: string | null
          review_count?: number
          source?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_questions_linked_revision_id_fkey"
            columns: ["linked_revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type_enum"]
          chapter_id: string | null
          client_generated_id: string | null
          created_at: string
          deleted_at: string | null
          end_timestamp: string | null
          google_event_id: string | null
          id: string
          notes: string | null
          pause_duration_seconds: number
          source_client: Database["public"]["Enums"]["source_client_enum"]
          start_timestamp: string
          subject_id: string | null
          task_id: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type_enum"]
          chapter_id?: string | null
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          end_timestamp?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          pause_duration_seconds?: number
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          start_timestamp?: string
          subject_id?: string | null
          task_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type_enum"]
          chapter_id?: string | null
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          end_timestamp?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          pause_duration_seconds?: number
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          start_timestamp?: string
          subject_id?: string | null
          task_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          exam_type: Database["public"]["Enums"]["exam_type_enum"]
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type_enum"]
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          metric: string
          period_type: string
          start_date: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          metric: string
          period_type: string
          start_date: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          metric?: string
          period_type?: string
          start_date?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          occurred_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          occurred_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          client_generated_id: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          estimated_minutes: number | null
          failure_reason: string | null
          google_event_id: string | null
          google_task_id: string | null
          id: string
          is_recurring: boolean
          parent_task_id: string | null
          planned_date: string
          postpone_count: number
          recurrence_pattern: string | null
          source_client: Database["public"]["Enums"]["source_client_enum"]
          status: Database["public"]["Enums"]["task_status_enum"]
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          failure_reason?: string | null
          google_event_id?: string | null
          google_task_id?: string | null
          id?: string
          is_recurring?: boolean
          parent_task_id?: string | null
          planned_date: string
          postpone_count?: number
          recurrence_pattern?: string | null
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          status?: Database["public"]["Enums"]["task_status_enum"]
          subject_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          client_generated_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          failure_reason?: string | null
          google_event_id?: string | null
          google_task_id?: string | null
          id?: string
          is_recurring?: boolean
          parent_task_id?: string | null
          planned_date?: string
          postpone_count?: number
          recurrence_pattern?: string | null
          source_client?: Database["public"]["Enums"]["source_client_enum"]
          status?: Database["public"]["Enums"]["task_status_enum"]
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_aliases: {
        Row: {
          archived_topic_id: string
          created_at: string
          id: string
          merged_at: string
          merged_into_topic_id: string
          user_id: string
        }
        Insert: {
          archived_topic_id: string
          created_at?: string
          id?: string
          merged_at?: string
          merged_into_topic_id: string
          user_id: string
        }
        Update: {
          archived_topic_id?: string
          created_at?: string
          id?: string
          merged_at?: string
          merged_into_topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_aliases_archived_topic_id_fkey"
            columns: ["archived_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_aliases_merged_into_topic_id_fkey"
            columns: ["merged_into_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_exam_map: {
        Row: {
          created_at: string
          difficulty: number
          exam_type: string
          id: string
          priority: number
          pyq_weight: number | null
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number
          exam_type: string
          id?: string
          priority?: number
          pyq_weight?: number | null
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          exam_type?: string
          id?: string
          priority?: number
          pyq_weight?: number | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_exam_map_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_lifecycle: {
        Row: {
          book_practice_done: boolean
          confidence_level: number | null
          created_at: string
          dpp_done: boolean
          id: string
          last_revised_at: string | null
          learning_completed_at: string | null
          notes: string | null
          pyq_done: boolean
          revision_count: number
          tests_attempted_count: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_practice_done?: boolean
          confidence_level?: number | null
          created_at?: string
          dpp_done?: boolean
          id?: string
          last_revised_at?: string | null
          learning_completed_at?: string | null
          notes?: string | null
          pyq_done?: boolean
          revision_count?: number
          tests_attempted_count?: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_practice_done?: boolean
          confidence_level?: number | null
          created_at?: string
          dpp_done?: boolean
          id?: string
          last_revised_at?: string | null
          learning_completed_at?: string | null
          notes?: string | null
          pyq_done?: boolean
          revision_count?: number
          tests_attempted_count?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_lifecycle_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          archived_at: string | null
          chapter_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          pyq_frequency_weight: number | null
          status: Database["public"]["Enums"]["topic_status_enum"]
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          pyq_frequency_weight?: number | null
          status?: Database["public"]["Enums"]["topic_status_enum"]
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          pyq_frequency_weight?: number | null
          status?: Database["public"]["Enums"]["topic_status_enum"]
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_type_enum:
        | "lecture"
        | "practice"
        | "revision"
        | "mock"
        | "reading"
        | "other"
      annotation_tag_enum:
        | "sick"
        | "travel"
        | "family"
        | "exam_day"
        | "holiday"
        | "custom"
      browser_event_type_enum:
        | "tab_switch"
        | "distraction_start"
        | "distraction_end"
        | "return_to_study"
      error_category_enum:
        | "concept"
        | "calculation"
        | "reading"
        | "silly"
        | "time"
        | "other"
      exam_type_enum: "banking" | "ssc" | "both" | "other"
      phone_event_type_enum:
        | "app_open"
        | "app_close"
        | "distraction_start"
        | "distraction_end"
      revision_cycle_enum: "daily" | "weekly" | "monthly"
      source_client_enum: "web" | "extension" | "android" | "import"
      task_status_enum:
        | "pending"
        | "in_progress"
        | "completed"
        | "postponed"
        | "cancelled"
      topic_status_enum:
        | "not_started"
        | "learning"
        | "learned"
        | "revising"
        | "strong"
        | "weak"
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
      activity_type_enum: [
        "lecture",
        "practice",
        "revision",
        "mock",
        "reading",
        "other",
      ],
      annotation_tag_enum: [
        "sick",
        "travel",
        "family",
        "exam_day",
        "holiday",
        "custom",
      ],
      browser_event_type_enum: [
        "tab_switch",
        "distraction_start",
        "distraction_end",
        "return_to_study",
      ],
      error_category_enum: [
        "concept",
        "calculation",
        "reading",
        "silly",
        "time",
        "other",
      ],
      exam_type_enum: ["banking", "ssc", "both", "other"],
      phone_event_type_enum: [
        "app_open",
        "app_close",
        "distraction_start",
        "distraction_end",
      ],
      revision_cycle_enum: ["daily", "weekly", "monthly"],
      source_client_enum: ["web", "extension", "android", "import"],
      task_status_enum: [
        "pending",
        "in_progress",
        "completed",
        "postponed",
        "cancelled",
      ],
      topic_status_enum: [
        "not_started",
        "learning",
        "learned",
        "revising",
        "strong",
        "weak",
      ],
    },
  },
} as const
