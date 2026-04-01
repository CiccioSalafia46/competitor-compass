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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          analysis_type: string
          completed_at: string | null
          confidence: string | null
          created_at: string
          error_message: string | null
          id: string
          model_used: string | null
          newsletter_entry_id: string
          result: Json | null
          status: string
          workspace_id: string
        }
        Insert: {
          analysis_type: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          newsletter_entry_id: string
          result?: Json | null
          status?: string
          workspace_id: string
        }
        Update: {
          analysis_type?: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          newsletter_entry_id?: string
          result?: Json | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_newsletter_entry_id_fkey"
            columns: ["newsletter_entry_id"]
            isOneToOne: false
            referencedRelation: "newsletter_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          description: string | null
          domains: string[] | null
          id: string
          is_monitored: boolean
          meta_page_ids: string[] | null
          name: string
          tags: string[] | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domains?: string[] | null
          id?: string
          is_monitored?: boolean
          meta_page_ids?: string[] | null
          name: string
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domains?: string[] | null
          id?: string
          is_monitored?: boolean
          meta_page_ids?: string[] | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_connections: {
        Row: {
          connected_at: string
          created_at: string
          email_address: string
          id: string
          last_history_id: string | null
          last_sync_at: string | null
          sync_error: string | null
          sync_status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          email_address: string
          id?: string
          last_history_id?: string | null
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          email_address?: string
          id?: string
          last_history_id?: string | null
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          gmail_connection_id: string
          id: string
          refresh_token: string
          scopes: string[] | null
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          gmail_connection_id: string
          id?: string
          refresh_token: string
          scopes?: string[] | null
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          gmail_connection_id?: string
          id?: string
          refresh_token?: string
          scopes?: string[] | null
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_tokens_gmail_connection_id_fkey"
            columns: ["gmail_connection_id"]
            isOneToOne: true
            referencedRelation: "gmail_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_analyses: {
        Row: {
          audience_clues: string[] | null
          confidence_scores: Json | null
          created_at: string
          creative_pattern: string | null
          funnel_intent: string | null
          id: string
          message_angle: string | null
          meta_ad_id: string
          model_used: string | null
          offer_angle: string | null
          overall_confidence: number | null
          product_category: string | null
          promo_language: string | null
          raw_analysis: Json | null
          strategy_takeaways: string[] | null
          urgency_style: string | null
          workspace_id: string
        }
        Insert: {
          audience_clues?: string[] | null
          confidence_scores?: Json | null
          created_at?: string
          creative_pattern?: string | null
          funnel_intent?: string | null
          id?: string
          message_angle?: string | null
          meta_ad_id: string
          model_used?: string | null
          offer_angle?: string | null
          overall_confidence?: number | null
          product_category?: string | null
          promo_language?: string | null
          raw_analysis?: Json | null
          strategy_takeaways?: string[] | null
          urgency_style?: string | null
          workspace_id: string
        }
        Update: {
          audience_clues?: string[] | null
          confidence_scores?: Json | null
          created_at?: string
          creative_pattern?: string | null
          funnel_intent?: string | null
          id?: string
          message_angle?: string | null
          meta_ad_id?: string
          model_used?: string | null
          offer_angle?: string | null
          overall_confidence?: number | null
          product_category?: string | null
          promo_language?: string | null
          raw_analysis?: Json | null
          strategy_takeaways?: string[] | null
          urgency_style?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_analyses_meta_ad_id_fkey"
            columns: ["meta_ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ad_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_creative_bodies: string[] | null
          ad_creative_link_captions: string[] | null
          ad_creative_link_descriptions: string[] | null
          ad_creative_link_titles: string[] | null
          ad_delivery_start_time: string | null
          ad_delivery_stop_time: string | null
          ad_snapshot_url: string | null
          competitor_id: string | null
          created_at: string
          cta_type: string | null
          currency: string | null
          estimated_audience_size: Json | null
          first_seen_at: string | null
          id: string
          impressions_range: Json | null
          is_active: boolean | null
          languages: string[] | null
          last_seen_at: string | null
          media_type: string | null
          media_url: string | null
          meta_ad_id: string | null
          page_id: string | null
          page_name: string | null
          platforms: string[] | null
          publisher_platforms: string[] | null
          raw_data: Json | null
          spend_range: Json | null
          thumbnail_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ad_creative_bodies?: string[] | null
          ad_creative_link_captions?: string[] | null
          ad_creative_link_descriptions?: string[] | null
          ad_creative_link_titles?: string[] | null
          ad_delivery_start_time?: string | null
          ad_delivery_stop_time?: string | null
          ad_snapshot_url?: string | null
          competitor_id?: string | null
          created_at?: string
          cta_type?: string | null
          currency?: string | null
          estimated_audience_size?: Json | null
          first_seen_at?: string | null
          id?: string
          impressions_range?: Json | null
          is_active?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          media_type?: string | null
          media_url?: string | null
          meta_ad_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platforms?: string[] | null
          publisher_platforms?: string[] | null
          raw_data?: Json | null
          spend_range?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ad_creative_bodies?: string[] | null
          ad_creative_link_captions?: string[] | null
          ad_creative_link_descriptions?: string[] | null
          ad_creative_link_titles?: string[] | null
          ad_delivery_start_time?: string | null
          ad_delivery_stop_time?: string | null
          ad_snapshot_url?: string | null
          competitor_id?: string | null
          created_at?: string
          cta_type?: string | null
          currency?: string | null
          estimated_audience_size?: Json | null
          first_seen_at?: string | null
          id?: string
          impressions_range?: Json | null
          is_active?: boolean | null
          languages?: string[] | null
          last_seen_at?: string | null
          media_type?: string | null
          media_url?: string | null
          meta_ad_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platforms?: string[] | null
          publisher_platforms?: string[] | null
          raw_data?: Json | null
          spend_range?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_entries: {
        Row: {
          competitor_id: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          received_at: string | null
          sender_email: string | null
          source: string
          subject: string | null
          workspace_id: string
        }
        Insert: {
          competitor_id?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          received_at?: string | null
          sender_email?: string | null
          source?: string
          subject?: string | null
          workspace_id: string
        }
        Update: {
          competitor_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          received_at?: string | null
          sender_email?: string | null
          source?: string
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_entries_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_extractions: {
        Row: {
          calls_to_action: Json | null
          campaign_type: string | null
          confidence_scores: Json | null
          coupon_code: string | null
          created_at: string
          discount_percentage: number | null
          event_mentions: Json | null
          expiry_date: string | null
          extracted_at: string
          extraction_method: string | null
          free_shipping: boolean | null
          id: string
          is_valid: boolean
          main_message: string | null
          model_used: string | null
          newsletter_inbox_id: string
          offers: Json | null
          overall_confidence: number | null
          product_categories: string[] | null
          raw_extraction: Json | null
          strategy_takeaways: Json | null
          urgency_signals: Json | null
          workspace_id: string
        }
        Insert: {
          calls_to_action?: Json | null
          campaign_type?: string | null
          confidence_scores?: Json | null
          coupon_code?: string | null
          created_at?: string
          discount_percentage?: number | null
          event_mentions?: Json | null
          expiry_date?: string | null
          extracted_at?: string
          extraction_method?: string | null
          free_shipping?: boolean | null
          id?: string
          is_valid?: boolean
          main_message?: string | null
          model_used?: string | null
          newsletter_inbox_id: string
          offers?: Json | null
          overall_confidence?: number | null
          product_categories?: string[] | null
          raw_extraction?: Json | null
          strategy_takeaways?: Json | null
          urgency_signals?: Json | null
          workspace_id: string
        }
        Update: {
          calls_to_action?: Json | null
          campaign_type?: string | null
          confidence_scores?: Json | null
          coupon_code?: string | null
          created_at?: string
          discount_percentage?: number | null
          event_mentions?: Json | null
          expiry_date?: string | null
          extracted_at?: string
          extraction_method?: string | null
          free_shipping?: boolean | null
          id?: string
          is_valid?: boolean
          main_message?: string | null
          model_used?: string | null
          newsletter_inbox_id?: string
          offers?: Json | null
          overall_confidence?: number | null
          product_categories?: string[] | null
          raw_extraction?: Json | null
          strategy_takeaways?: Json | null
          urgency_signals?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_extractions_newsletter_inbox_id_fkey"
            columns: ["newsletter_inbox_id"]
            isOneToOne: false
            referencedRelation: "newsletter_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_extractions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_inbox: {
        Row: {
          classification_method: string | null
          competitor_id: string | null
          created_at: string
          from_email: string | null
          from_name: string | null
          gmail_connection_id: string | null
          gmail_message_id: string | null
          headers_json: Json | null
          html_content: string | null
          id: string
          imported_at: string
          is_archived: boolean
          is_demo: boolean
          is_newsletter: boolean
          is_read: boolean
          is_starred: boolean
          newsletter_score: number | null
          received_at: string | null
          subject: string | null
          tags: string[] | null
          text_content: string | null
          workspace_id: string
        }
        Insert: {
          classification_method?: string | null
          competitor_id?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          gmail_connection_id?: string | null
          gmail_message_id?: string | null
          headers_json?: Json | null
          html_content?: string | null
          id?: string
          imported_at?: string
          is_archived?: boolean
          is_demo?: boolean
          is_newsletter?: boolean
          is_read?: boolean
          is_starred?: boolean
          newsletter_score?: number | null
          received_at?: string | null
          subject?: string | null
          tags?: string[] | null
          text_content?: string | null
          workspace_id: string
        }
        Update: {
          classification_method?: string | null
          competitor_id?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          gmail_connection_id?: string | null
          gmail_message_id?: string | null
          headers_json?: Json | null
          html_content?: string | null
          id?: string
          imported_at?: string
          is_archived?: boolean
          is_demo?: boolean
          is_newsletter?: boolean
          is_read?: boolean
          is_starred?: boolean
          newsletter_score?: number | null
          received_at?: string | null
          subject?: string | null
          tags?: string[] | null
          text_content?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_inbox_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_inbox_gmail_connection_id_fkey"
            columns: ["gmail_connection_id"]
            isOneToOne: false
            referencedRelation: "gmail_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_inbox_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          quantity: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          quantity?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          quantity?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
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
      app_role: ["admin", "analyst", "viewer"],
    },
  },
} as const
