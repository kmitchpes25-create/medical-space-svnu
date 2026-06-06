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
          id: string
          name: string
          name_ar: string | null
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
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
      lectures: {
        Row: {
          chapter_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_ar: string | null
          order_index: number
          updated_at: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          order_index?: number
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
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
          id: string
          name: string
          name_ar: string | null
          order_index: number
          updated_at: string
          year_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          order_index?: number
          updated_at?: string
          year_id: string
        }
        Update: {
          created_at?: string
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
      subjects: {
        Row: {
          color: string | null
          created_at: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
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
