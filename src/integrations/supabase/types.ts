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
      academic_years: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          name_ar: string | null
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ar: string | null
          order_index: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
          subject_id?: string
          updated_at?: string
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
      choices: {
        Row: {
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_choice_ids: string[]
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_choice_ids?: string[]
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_choice_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          correct_count: number
          created_at: string
          duration_seconds: number | null
          finished_at: string | null
          id: string
          scope: Json | null
          score_percent: number
          title: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          scope?: Json | null
          score_percent?: number
          title?: string | null
          total_questions?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          scope?: Json | null
          score_percent?: number
          title?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          question_id: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          question_id: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          question_id?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_scores: {
        Row: {
          correct_answers: number
          current_streak: number
          last_event_at: string
          season_id: string
          total_points: number
          user_id: string
          year_id: string
        }
        Insert: {
          correct_answers?: number
          current_streak?: number
          last_event_at?: string
          season_id: string
          total_points?: number
          user_id: string
          year_id: string
        }
        Update: {
          correct_answers?: number
          current_streak?: number
          last_event_at?: string
          season_id?: string
          total_points?: number
          user_id?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_scores_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_scores_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_seasons: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_current: boolean
          name: string
          started_at: string
          year_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name?: string
          started_at?: string
          year_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name?: string
          started_at?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_seasons_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          chapter_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          lecture_summary_link: string | null
          lecture_transcript_link: string | null
          name: string
          name_ar: string | null
          order_index: number
          section_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lecture_summary_link?: string | null
          lecture_transcript_link?: string | null
          name: string
          name_ar?: string | null
          order_index?: number
          section_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lecture_summary_link?: string | null
          lecture_transcript_link?: string | null
          name?: string
          name_ar?: string | null
          order_index?: number
          section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mistakes: {
        Row: {
          chapter_id: string | null
          correct_answer: string
          created_at: string
          id: string
          question_id: string
          question_text: string
          subject_id: string | null
          user_id: string
          wrong_answer: string
        }
        Insert: {
          chapter_id?: string | null
          correct_answer: string
          created_at?: string
          id?: string
          question_id: string
          question_text: string
          subject_id?: string | null
          user_id: string
          wrong_answer: string
        }
        Update: {
          chapter_id?: string | null
          correct_answer?: string
          created_at?: string
          id?: string
          question_id?: string
          question_text?: string
          subject_id?: string | null
          user_id?: string
          wrong_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          meta: Json | null
          points: number
          season_id: string
          user_id: string
          year_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          meta?: Json | null
          points: number
          season_id: string
          user_id: string
          year_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          meta?: Json | null
          points?: number
          season_id?: string
          user_id?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          primary_year_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          primary_year_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          primary_year_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_year_id_fkey"
            columns: ["primary_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      question_lectures: {
        Row: {
          created_at: string
          lecture_id: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          lecture_id: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string
          lecture_id?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_lectures_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_lectures_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          difficulty: number | null
          exam_year: number | null
          explanation: string | null
          hash: string | null
          id: string
          lecture_id: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          section_id: string | null
          source_kind: Database["public"]["Enums"]["section_kind"]
          subject_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difficulty?: number | null
          exam_year?: number | null
          explanation?: string | null
          hash?: string | null
          id?: string
          lecture_id?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          source_kind?: Database["public"]["Enums"]["section_kind"]
          subject_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difficulty?: number | null
          exam_year?: number | null
          explanation?: string | null
          hash?: string | null
          id?: string
          lecture_id?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          source_kind?: Database["public"]["Enums"]["section_kind"]
          subject_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["section_kind"]
          name: string
          name_ar: string | null
          order_index: number
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["section_kind"]
          name: string
          name_ar?: string | null
          order_index?: number
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["section_kind"]
          name?: string
          name_ar?: string | null
          order_index?: number
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          name_ar: string | null
          order_index: number
          updated_at: string
          year_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
          year_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      study_minutes: {
        Row: {
          day: string
          minutes: number
          user_id: string
          year_id: string
        }
        Insert: {
          day: string
          minutes?: number
          user_id: string
          year_id: string
        }
        Update: {
          day?: string
          minutes?: number
          user_id?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_minutes_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          name_ar: string | null
          order_index: number
          semester_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          semester_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
          semester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_login_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_login_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_login_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_hard_delete: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      admin_move_node: {
        Args: { _id: string; _new_parent: string; _table: string }
        Returns: undefined
      }
      admin_reorder: {
        Args: { _ids: string[]; _table: string }
        Returns: undefined
      }
      admin_reset_leaderboard: { Args: { _year: string }; Returns: string }
      admin_restore: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      admin_soft_delete: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      award_points: {
        Args: {
          _dedupe: string
          _increment_correct?: number
          _kind: string
          _meta?: Json
          _points: number
          _user: string
          _year: string
        }
        Returns: boolean
      }
      award_quiz_submit: { Args: { _attempt_id: string }; Returns: undefined }
      bump_streak: {
        Args: never
        Returns: {
          current_streak: number
          last_login_date: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_current_season: { Args: { _year_id: string }; Returns: string }
      get_choices_admin: {
        Args: { _qids: string[] }
        Returns: {
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }[]
      }
      get_leaderboard: {
        Args: { _year: string }
        Returns: {
          avatar_url: string
          correct_answers: number
          current_streak: number
          full_name: string
          is_me: boolean
          last_event_at: string
          rank: number
          total_points: number
          user_id: string
        }[]
      }
      grade_questions: {
        Args: { _answers: Json }
        Returns: {
          correct_choice_ids: string[]
          correct_text: string
          explanation: string
          is_correct: boolean
          question_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      record_study_heartbeat: { Args: { _year?: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "student"
      question_type:
        | "mcq"
        | "true_false"
        | "multiple_answers"
        | "clinical_case"
        | "written"
      section_kind:
        | "question_bank"
        | "formative"
        | "previous_years"
        | "mock_exam"
        | "revision"
        | "practical"
        | "spotters"
        | "assignments"
        | "ospe"
        | "custom"
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
    Enums: {
      app_role: ["admin", "student"],
      question_type: [
        "mcq",
        "true_false",
        "multiple_answers",
        "clinical_case",
        "written",
      ],
      section_kind: [
        "question_bank",
        "formative",
        "previous_years",
        "mock_exam",
        "revision",
        "practical",
        "spotters",
        "assignments",
        "ospe",
        "custom",
      ],
    },
  },
} as const
