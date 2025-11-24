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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliate_analytics: {
        Row: {
          created_at: string
          drop_id: string
          event_type: string
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          drop_id: string
          event_type: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          drop_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_analytics_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "affiliate_analytics_summary"
            referencedColumns: ["drop_id"]
          },
          {
            foreignKeyName: "affiliate_analytics_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          banner_url: string | null
          category: Database["public"]["Enums"]["category_type"] | null
          country: string | null
          created_at: string | null
          description: string | null
          history: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          official_website: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          history?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          official_website?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          history?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          official_website?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      drops: {
        Row: {
          affiliate_link: string | null
          brand_id: string | null
          created_at: string | null
          description: string | null
          discount_code: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_pro_exclusive: boolean | null
          product_images: string[] | null
          release_date: string
          shop_id: string | null
          slug: string
          status: Database["public"]["Enums"]["drop_status"] | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          affiliate_link?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_code?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pro_exclusive?: boolean | null
          product_images?: string[] | null
          release_date: string
          shop_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["drop_status"] | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          affiliate_link?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_code?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pro_exclusive?: boolean | null
          product_images?: string[] | null
          release_date?: string
          shop_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["drop_status"] | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drops_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drops_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drops_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics: {
        Row: {
          created_at: string
          email_type: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ip_login_attempts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          ip_address: string
          last_attempt: string
          locked_until: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          ip_address: string
          last_attempt?: string
          locked_until?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          ip_address?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempts: number
          created_at: string
          email: string
          id: string
          last_attempt: string
          locked_until: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_pro: boolean | null
          notification_preferences: Json | null
          pro_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_pro?: boolean | null
          notification_preferences?: Json | null
          pro_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_pro?: boolean | null
          notification_preferences?: Json | null
          pro_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_audit_exports: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string
          export_format: string
          filters: Json | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string
          export_format: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          schedule_type: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string
          export_format?: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          performed_by: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shops: {
        Row: {
          address: string
          brand_id: string | null
          category: Database["public"]["Enums"]["category_type"] | null
          city: string
          country: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_unique_shop: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          official_site: string | null
          opening_hours: Json | null
          phone: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          address: string
          brand_id?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          city: string
          country: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_unique_shop?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          official_site?: string | null
          opening_hours?: Json | null
          phone?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          brand_id?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          city?: string
          country?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_unique_shop?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          official_site?: string | null
          opening_hours?: Json | null
          phone?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drop_reminders: {
        Row: {
          created_at: string | null
          drop_id: string
          id: string
          is_notified: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drop_id: string
          id?: string
          is_notified?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          drop_id?: string
          id?: string
          is_notified?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drop_reminders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "affiliate_analytics_summary"
            referencedColumns: ["drop_id"]
          },
          {
            foreignKeyName: "user_drop_reminders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_drop_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_brands: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_shops: {
        Row: {
          created_at: string | null
          id: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_shops_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_shops_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_shops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_analytics_summary: {
        Row: {
          affiliate_clicks: number | null
          discount_code_copies: number | null
          drop_id: string | null
          drop_title: string | null
          last_event_at: string | null
          total_events: number | null
        }
        Relationships: []
      }
      shops_public: {
        Row: {
          address: string | null
          brand_id: string | null
          category: Database["public"]["Enums"]["category_type"] | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_unique_shop: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          official_site: string | null
          opening_hours: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_unique_shop?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          official_site?: string | null
          opening_hours?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_unique_shop?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          official_site?: string | null
          opening_hours?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_ip_attempts: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      category_type:
        | "streetwear"
        | "sneakers"
        | "accessories"
        | "luxury"
        | "vintage"
        | "sportswear"
      drop_status: "upcoming" | "live" | "ended"
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
      app_role: ["admin", "moderator", "user"],
      category_type: [
        "streetwear",
        "sneakers",
        "accessories",
        "luxury",
        "vintage",
        "sportswear",
      ],
      drop_status: ["upcoming", "live", "ended"],
    },
  },
} as const
