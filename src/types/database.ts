export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          exam_targets: string[] | null;
          daily_target_hours: number;
          day_boundary_offset_minutes: number;
          timezone: string;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          exam_targets?: string[] | null;
          daily_target_hours?: number;
          day_boundary_offset_minutes?: number;
          timezone?: string;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          exam_targets?: string[] | null;
          daily_target_hours?: number;
          day_boundary_offset_minutes?: number;
          timezone?: string;
          onboarding_complete?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          exam_type: "banking" | "ssc" | "both";
          color: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          exam_type?: "banking" | "ssc" | "both";
          color?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          exam_type?: "banking" | "ssc" | "both";
          color?: string | null;
          sort_order?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          name: string;
          status:
            | "not_started"
            | "learning"
            | "learned"
            | "revising"
            | "strong"
            | "weak";
          pyq_frequency_weight: number | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          name: string;
          status?: "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";
          pyq_frequency_weight?: number | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          name?: string;
          status?: "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";
          pyq_frequency_weight?: number | null;
          archived_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      topic_aliases: {
        Row: {
          id: string;
          user_id: string;
          archived_topic_id: string;
          merged_into_topic_id: string;
          merged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          archived_topic_id: string;
          merged_into_topic_id: string;
          merged_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          topic_id: string | null;
          chapter_id: string | null;
          activity_type: "lecture" | "practice" | "revision" | "mock" | "reading" | "other";
          start_timestamp: string;
          end_timestamp: string | null;
          pause_duration_seconds: number;
          notes: string | null;
          task_id: string | null;
          client_generated_id: string | null;
          source_client: "web" | "extension" | "android" | "import";
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          topic_id?: string | null;
          chapter_id?: string | null;
          activity_type?: "lecture" | "practice" | "revision" | "mock" | "reading" | "other";
          start_timestamp?: string;
          end_timestamp?: string | null;
          pause_duration_seconds?: number;
          notes?: string | null;
          task_id?: string | null;
          client_generated_id?: string | null;
          source_client?: "web" | "extension" | "android" | "import";
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          topic_id?: string | null;
          chapter_id?: string | null;
          activity_type?: "lecture" | "practice" | "revision" | "mock" | "reading" | "other";
          end_timestamp?: string | null;
          pause_duration_seconds?: number;
          notes?: string | null;
          task_id?: string | null;
          source_client?: "web" | "extension" | "android" | "import";
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          topic_id: string | null;
          title: string;
          status: "pending" | "in_progress" | "completed" | "postponed" | "cancelled";
          planned_date: string;
          due_date: string | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          failure_reason: string | null;
          postpone_count: number;
          is_recurring: boolean;
          recurrence_pattern: string | null;
          parent_task_id: string | null;
          client_generated_id: string | null;
          source_client: "web" | "extension" | "android" | "import";
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          topic_id?: string | null;
          title: string;
          status?: "pending" | "in_progress" | "completed" | "postponed" | "cancelled";
          planned_date: string;
          due_date?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          failure_reason?: string | null;
          postpone_count?: number;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          parent_task_id?: string | null;
          client_generated_id?: string | null;
          source_client?: "web" | "extension" | "android" | "import";
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          topic_id?: string | null;
          title?: string;
          status?: "pending" | "in_progress" | "completed" | "postponed" | "cancelled";
          planned_date?: string;
          due_date?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          failure_reason?: string | null;
          postpone_count?: number;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          parent_task_id?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_batches: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          subject_id: string | null;
          topic_id: string | null;
          chapter_id: string | null;
          source: string | null;
          attempted: number;
          correct: number;
          wrong: number;
          skipped: number;
          duration_minutes: number | null;
          notes: string | null;
          logged_at: string;
          client_generated_id: string | null;
          source_client: "web" | "extension" | "android" | "import";
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          subject_id?: string | null;
          topic_id?: string | null;
          chapter_id?: string | null;
          source?: string | null;
          attempted: number;
          correct: number;
          wrong: number;
          skipped: number;
          duration_minutes?: number | null;
          notes?: string | null;
          logged_at?: string;
          client_generated_id?: string | null;
          source_client?: "web" | "extension" | "android" | "import";
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string | null;
          subject_id?: string | null;
          topic_id?: string | null;
          chapter_id?: string | null;
          source?: string | null;
          attempted?: number;
          correct?: number;
          wrong?: number;
          skipped?: number;
          duration_minutes?: number | null;
          notes?: string | null;
          logged_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      revisions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          source_session_id: string | null;
          cycle_type: "daily" | "weekly" | "monthly";
          due_date: string;
          completed_at: string | null;
          recall_score: number | null;
          is_adaptive: boolean;
          adaptive_interval_days: number | null;
          grace_window_days: number;
          client_generated_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          source_session_id?: string | null;
          cycle_type: "daily" | "weekly" | "monthly";
          due_date: string;
          completed_at?: string | null;
          recall_score?: number | null;
          is_adaptive?: boolean;
          adaptive_interval_days?: number | null;
          grace_window_days?: number;
          client_generated_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          completed_at?: string | null;
          recall_score?: number | null;
          is_adaptive?: boolean;
          adaptive_interval_days?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      mocks: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          exam_type: "banking" | "ssc" | "other";
          stage: string | null;
          name: string;
          mock_date: string;
          maximum_marks: number;
          score: number;
          attempted: number;
          correct: number;
          wrong: number;
          unattempted: number;
          actual_duration_minutes: number;
          recommended_duration_minutes: number | null;
          percentile: number | null;
          rank: number | null;
          notes: string | null;
          client_generated_id: string | null;
          source_client: "web" | "extension" | "android" | "import";
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          exam_type?: "banking" | "ssc" | "other";
          stage?: string | null;
          name: string;
          mock_date: string;
          maximum_marks: number;
          score: number;
          attempted: number;
          correct: number;
          wrong: number;
          unattempted: number;
          actual_duration_minutes: number;
          recommended_duration_minutes?: number | null;
          percentile?: number | null;
          rank?: number | null;
          notes?: string | null;
          client_generated_id?: string | null;
          source_client?: "web" | "extension" | "android" | "import";
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          exam_type?: "banking" | "ssc" | "other";
          stage?: string | null;
          name?: string;
          mock_date?: string;
          maximum_marks?: number;
          score?: number;
          attempted?: number;
          correct?: number;
          wrong?: number;
          unattempted?: number;
          actual_duration_minutes?: number;
          recommended_duration_minutes?: number | null;
          percentile?: number | null;
          rank?: number | null;
          notes?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cutoffs: {
        Row: {
          id: string;
          user_id: string;
          exam_type: "banking" | "ssc" | "other";
          stage: string;
          year: number;
          category: string;
          maximum_marks: number;
          cutoff: number;
          reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exam_type: "banking" | "ssc" | "other";
          stage: string;
          year: number;
          category: string;
          maximum_marks: number;
          cutoff: number;
          reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exam_type?: "banking" | "ssc" | "other";
          stage?: string;
          year?: number;
          category?: string;
          maximum_marks?: number;
          cutoff?: number;
          reference?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      targets: {
        Row: {
          id: string;
          user_id: string;
          metric: string;
          period_type: "daily" | "weekly" | "monthly";
          target_value: number;
          start_date: string;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          metric: string;
          period_type: "daily" | "weekly" | "monthly";
          target_value: number;
          start_date: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          metric?: string;
          period_type?: "daily" | "weekly" | "monthly";
          target_value?: number;
          start_date?: string;
          end_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      day_annotations: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          tag: "sick" | "travel" | "family" | "exam_day" | "holiday" | "custom";
          note: string | null;
          exclude_from_trends: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          tag: "sick" | "travel" | "family" | "exam_day" | "holiday" | "custom";
          note?: string | null;
          exclude_from_trends?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tag?: "sick" | "travel" | "family" | "exam_day" | "holiday" | "custom";
          note?: string | null;
          exclude_from_trends?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      exams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          exam_type: "banking" | "ssc" | "other";
          stage: string | null;
          exam_date: string | null;
          safety_target_score: number | null;
          maximum_marks: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          exam_type?: "banking" | "ssc" | "other";
          stage?: string | null;
          exam_date?: string | null;
          safety_target_score?: number | null;
          maximum_marks?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          exam_type?: "banking" | "ssc" | "other";
          stage?: string | null;
          exam_date?: string | null;
          safety_target_score?: number | null;
          maximum_marks?: number | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          total_distraction_seconds: number;
          interruption_count: number;
          source_client: "web" | "extension" | "android" | "import";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          total_distraction_seconds?: number;
          interruption_count?: number;
          source_client?: "web" | "extension" | "android" | "import";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          total_distraction_seconds?: number;
          interruption_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      browser_events: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          focus_session_id: string | null;
          domain: string;
          title: string | null;
          event_type: "tab_switch" | "distraction_start" | "distraction_end" | "return_to_study";
          timestamp: string;
          duration_seconds: number | null;
          source_client: "web" | "extension" | "android" | "import";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          focus_session_id?: string | null;
          domain: string;
          title?: string | null;
          event_type: "tab_switch" | "distraction_start" | "distraction_end" | "return_to_study";
          timestamp?: string;
          duration_seconds?: number | null;
          source_client?: "web" | "extension" | "android" | "import";
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      phone_events: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          app_package: string;
          app_name: string | null;
          event_type: "app_open" | "app_close" | "distraction_start" | "distraction_end";
          timestamp: string;
          duration_seconds: number | null;
          source_client: "web" | "extension" | "android" | "import";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          app_package: string;
          app_name?: string | null;
          event_type: "app_open" | "app_close" | "distraction_start" | "distraction_end";
          timestamp?: string;
          duration_seconds?: number | null;
          source_client?: "web" | "extension" | "android" | "import";
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      saved_questions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          topic_id: string | null;
          source: string | null;
          exam_type: "banking" | "ssc" | "other" | null;
          error_category: "concept" | "calculation" | "reading" | "silly" | "time" | "other" | null;
          explanation: string | null;
          image_path: string | null;
          review_count: number;
          next_review_date: string | null;
          linked_revision_id: string | null;
          client_generated_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          topic_id?: string | null;
          source?: string | null;
          exam_type?: "banking" | "ssc" | "other" | null;
          error_category?: "concept" | "calculation" | "reading" | "silly" | "time" | "other" | null;
          explanation?: string | null;
          image_path?: string | null;
          review_count?: number;
          next_review_date?: string | null;
          linked_revision_id?: string | null;
          client_generated_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string | null;
          topic_id?: string | null;
          source?: string | null;
          exam_type?: "banking" | "ssc" | "other" | null;
          error_category?: "concept" | "calculation" | "reading" | "silly" | "time" | "other" | null;
          explanation?: string | null;
          image_path?: string | null;
          review_count?: number;
          next_review_date?: string | null;
          linked_revision_id?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      mock_sections: {
        Row: {
          id: string;
          user_id: string;
          mock_id: string;
          name: string;
          maximum_marks: number;
          score: number;
          attempted: number;
          correct: number;
          wrong: number;
          unattempted: number;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mock_id: string;
          name: string;
          maximum_marks: number;
          score: number;
          attempted: number;
          correct: number;
          wrong: number;
          unattempted: number;
          duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          score?: number;
          attempted?: number;
          correct?: number;
          wrong?: number;
          unattempted?: number;
          duration_minutes?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mock_sections_mock_id_fkey";
            columns: ["mock_id"];
            referencedRelation: "mocks";
            referencedColumns: ["id"];
          }
        ];
      };
      mock_topic_results: {
        Row: {
          id: string;
          user_id: string;
          mock_id: string;
          topic_id: string;
          attempted: number;
          correct: number;
          wrong: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mock_id: string;
          topic_id: string;
          attempted: number;
          correct: number;
          wrong: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          attempted?: number;
          correct?: number;
          wrong?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_events: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          event_type: string;
          notes: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          event_type: string;
          notes?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      error_category_enum:
        | "concept"
        | "calculation"
        | "reading"
        | "silly"
        | "time"
        | "other";
      exam_type_enum: "banking" | "ssc" | "other";
      source_client_enum: "web" | "extension" | "android" | "import";
      activity_type_enum: "lecture" | "practice" | "revision" | "mock" | "reading" | "other";
      task_status_enum: "pending" | "in_progress" | "completed" | "postponed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
