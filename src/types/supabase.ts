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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_costs: {
        Row: {
          agent: string
          created_at: string | null
          exa_calls: number | null
          gemini_image_calls: number | null
          haiku_input_tokens: number | null
          haiku_output_tokens: number | null
          id: string
          resend_email_calls: number | null
          run_id: string | null
          run_type: string
          serpapi_calls: number | null
          sonnet_input_tokens: number | null
          sonnet_output_tokens: number | null
          tavily_calls: number | null
          total_cost_cents: number | null
          user_id: string | null
        }
        Insert: {
          agent: string
          created_at?: string | null
          exa_calls?: number | null
          gemini_image_calls?: number | null
          haiku_input_tokens?: number | null
          haiku_output_tokens?: number | null
          id?: string
          resend_email_calls?: number | null
          run_id?: string | null
          run_type: string
          serpapi_calls?: number | null
          sonnet_input_tokens?: number | null
          sonnet_output_tokens?: number | null
          tavily_calls?: number | null
          total_cost_cents?: number | null
          user_id?: string | null
        }
        Update: {
          agent?: string
          created_at?: string | null
          exa_calls?: number | null
          gemini_image_calls?: number | null
          haiku_input_tokens?: number | null
          haiku_output_tokens?: number | null
          id?: string
          resend_email_calls?: number | null
          run_id?: string | null
          run_type?: string
          serpapi_calls?: number | null
          sonnet_input_tokens?: number | null
          sonnet_output_tokens?: number | null
          tavily_calls?: number | null
          total_cost_cents?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean | null
          read: boolean | null
          retry_count: number | null
          source_agent: string | null
          target_agent: string | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          read?: boolean | null
          retry_count?: number | null
          source_agent?: string | null
          target_agent?: string | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          read?: boolean | null
          retry_count?: number | null
          source_agent?: string | null
          target_agent?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "decision_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_log: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          insight_id: string
          opened_at: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          id?: string
          insight_id: string
          opened_at?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          insight_id?: string
          opened_at?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_topics: {
        Row: {
          created_at: string | null
          decision_thread_id: string | null
          id: string
          last_signal_at: string | null
          level: string | null
          topic: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          decision_thread_id?: string | null
          id?: string
          last_signal_at?: string | null
          level?: string | null
          topic: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          decision_thread_id?: string | null
          id?: string
          last_signal_at?: string | null
          level?: string | null
          topic?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attention_topics_decision_thread_id_fkey"
            columns: ["decision_thread_id"]
            isOneToOne: false
            referencedRelation: "decision_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_context: {
        Row: {
          company_name: string
          consumer: Json | null
          created_at: string | null
          id: string
          innovation: Json | null
          macroeconomics: Json | null
          market_dynamics: Json | null
          product_categories: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name: string
          consumer?: Json | null
          created_at?: string | null
          id?: string
          innovation?: Json | null
          macroeconomics?: Json | null
          market_dynamics?: Json | null
          product_categories?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string
          consumer?: Json | null
          created_at?: string | null
          id?: string
          innovation?: Json | null
          macroeconomics?: Json | null
          market_dynamics?: Json | null
          product_categories?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_context_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          active_commitments: string[] | null
          brand_constraints: string[] | null
          brand_name: string
          confirmed_by_user_at: string | null
          created_at: string | null
          id: string
          key_sources: Json | null
          last_researched_at: string | null
          strategic_bets: string[] | null
          updated_at: string | null
          user_corrections: Json | null
          user_id: string | null
        }
        Insert: {
          active_commitments?: string[] | null
          brand_constraints?: string[] | null
          brand_name: string
          confirmed_by_user_at?: string | null
          created_at?: string | null
          id?: string
          key_sources?: Json | null
          last_researched_at?: string | null
          strategic_bets?: string[] | null
          updated_at?: string | null
          user_corrections?: Json | null
          user_id?: string | null
        }
        Update: {
          active_commitments?: string[] | null
          brand_constraints?: string[] | null
          brand_name?: string
          confirmed_by_user_at?: string | null
          created_at?: string | null
          id?: string
          key_sources?: Json | null
          last_researched_at?: string | null
          strategic_bets?: string[] | null
          updated_at?: string | null
          user_corrections?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          context_json: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          context_json: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          context_json?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      clusters: {
        Row: {
          color_node: string
          color_text: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color_node: string
          color_text: string
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          color_node?: string
          color_text?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          context_signal_ids: string[] | null
          created_at: string | null
          id: string
          query_type: string | null
          response_insight_id: string | null
          response_text: string | null
          user_id: string | null
          user_query: string
        }
        Insert: {
          context_signal_ids?: string[] | null
          created_at?: string | null
          id: string
          query_type?: string | null
          response_insight_id?: string | null
          response_text?: string | null
          user_id?: string | null
          user_query: string
        }
        Update: {
          context_signal_ids?: string[] | null
          created_at?: string | null
          id?: string
          query_type?: string | null
          response_insight_id?: string | null
          response_text?: string | null
          user_id?: string | null
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefings: {
        Row: {
          category_summaries: Json | null
          created_at: string | null
          frothier_topics: Json | null
          id: string
          summary: string
          user_id: string
        }
        Insert: {
          category_summaries?: Json | null
          created_at?: string | null
          frothier_topics?: Json | null
          id?: string
          summary: string
          user_id: string
        }
        Update: {
          category_summaries?: Json | null
          created_at?: string | null
          frothier_topics?: Json | null
          id?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      decision_signals: {
        Row: {
          actionability_score: number | null
          added_at: string | null
          added_by: string | null
          decision_thread_id: string | null
          id: string
          relevance_reason: string | null
          relevance_score: number | null
          signal_id: string | null
        }
        Insert: {
          actionability_score?: number | null
          added_at?: string | null
          added_by?: string | null
          decision_thread_id?: string | null
          id?: string
          relevance_reason?: string | null
          relevance_score?: number | null
          signal_id?: string | null
        }
        Update: {
          actionability_score?: number | null
          added_at?: string | null
          added_by?: string | null
          decision_thread_id?: string | null
          id?: string
          relevance_reason?: string | null
          relevance_score?: number | null
          signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_signals_decision_thread_id_fkey"
            columns: ["decision_thread_id"]
            isOneToOne: false
            referencedRelation: "decision_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_threads: {
        Row: {
          cover_image_generated_at: string | null
          cover_image_prompt: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          decided_at: string | null
          decided_position_id: string | null
          decision_rationale: string | null
          decision_summary: string | null
          direction_confidence: number | null
          direction_reasoning: string | null
          direction_updated_at: string | null
          dominant_direction: string | null
          id: string
          key_question: string | null
          key_questions: Json | null
          lens: string | null
          level: string | null
          monitor_level: string
          monitoring_subjects: Json | null
          started_at: string | null
          status: string | null
          title: string
          topic_cluster: string | null
          topic_options: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cover_image_generated_at?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          decided_position_id?: string | null
          decision_rationale?: string | null
          decision_summary?: string | null
          direction_confidence?: number | null
          direction_reasoning?: string | null
          direction_updated_at?: string | null
          dominant_direction?: string | null
          id?: string
          key_question?: string | null
          key_questions?: Json | null
          lens?: string | null
          level?: string | null
          monitor_level?: string
          monitoring_subjects?: Json | null
          started_at?: string | null
          status?: string | null
          title: string
          topic_cluster?: string | null
          topic_options?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cover_image_generated_at?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          decided_position_id?: string | null
          decision_rationale?: string | null
          decision_summary?: string | null
          direction_confidence?: number | null
          direction_reasoning?: string | null
          direction_updated_at?: string | null
          dominant_direction?: string | null
          id?: string
          key_question?: string | null
          key_questions?: Json | null
          lens?: string | null
          level?: string | null
          monitor_level?: string
          monitoring_subjects?: Json | null
          started_at?: string | null
          status?: string | null
          title?: string
          topic_cluster?: string | null
          topic_options?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          affected_decisions: string[] | null
          confirmed_at: string
          conversation_id: string | null
          created_at: string | null
          id: string
          insight_ids: string[] | null
          reasoning: string | null
          signal_ids: string[] | null
          status: string
          summary: string
          superseded_by: string | null
          tactical_updates: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affected_decisions?: string[] | null
          confirmed_at?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          insight_ids?: string[] | null
          reasoning?: string | null
          signal_ids?: string[] | null
          status?: string
          summary: string
          superseded_by?: string | null
          tactical_updates?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affected_decisions?: string[] | null
          confirmed_at?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          insight_ids?: string[] | null
          reasoning?: string | null
          signal_ids?: string[] | null
          status?: string
          summary?: string
          superseded_by?: string | null
          tactical_updates?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          archived_at: string | null
          body_segments: Json
          category: string | null
          cluster_name: string | null
          color: string
          convergence_reasoning: string | null
          created_at: string | null
          cross_signal_ids: string[] | null
          decision_question: string | null
          edge_pairs: Json
          evidence_refs: Json | null
          id: string
          insight_type: string | null
          momentum_score: number | null
          reference_count: number | null
          signal_count: number
          signal_ids: string[]
          sort_order: number
          source_conversation_id: string | null
          tier: string | null
          tier_reasoning: string | null
          title: string
          urgency: string
          user_relevance: string | null
        }
        Insert: {
          archived_at?: string | null
          body_segments?: Json
          category?: string | null
          cluster_name?: string | null
          color: string
          convergence_reasoning?: string | null
          created_at?: string | null
          cross_signal_ids?: string[] | null
          decision_question?: string | null
          edge_pairs?: Json
          evidence_refs?: Json | null
          id: string
          insight_type?: string | null
          momentum_score?: number | null
          reference_count?: number | null
          signal_count?: number
          signal_ids?: string[]
          sort_order?: number
          source_conversation_id?: string | null
          tier?: string | null
          tier_reasoning?: string | null
          title: string
          urgency: string
          user_relevance?: string | null
        }
        Update: {
          archived_at?: string | null
          body_segments?: Json
          category?: string | null
          cluster_name?: string | null
          color?: string
          convergence_reasoning?: string | null
          created_at?: string | null
          cross_signal_ids?: string[] | null
          decision_question?: string | null
          edge_pairs?: Json
          evidence_refs?: Json | null
          id?: string
          insight_type?: string | null
          momentum_score?: number | null
          reference_count?: number | null
          signal_count?: number
          signal_ids?: string[]
          sort_order?: number
          source_conversation_id?: string | null
          tier?: string | null
          tier_reasoning?: string | null
          title?: string
          urgency?: string
          user_relevance?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_topics: {
        Row: {
          category: string | null
          created_at: string | null
          hook: string | null
          id: string
          selected: boolean | null
          signal_ids: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          hook?: string | null
          id?: string
          selected?: boolean | null
          signal_ids?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          hook?: string | null
          id?: string
          selected?: boolean | null
          signal_ids?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      position_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          position_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          position_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          position_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_notes_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          accepted_at: string | null
          archived_reason: string | null
          conversation_id: string | null
          cover_image_url: string | null
          created_at: string | null
          decision_thread_id: string | null
          deferred_at: string | null
          direction_alignment: string | null
          fact_confidence: number | null
          id: string
          is_monitored: boolean | null
          is_pinned: boolean
          last_emailed_at: string | null
          last_monitored_at: string | null
          monitor_alert_threshold: string | null
          monitor_last_signal_count: number | null
          monitor_set_at: string | null
          owner_quote: string | null
          position_essence: string | null
          reactivation_condition: string | null
          reasoning: string | null
          rejected_at: string | null
          rejected_reason: string | null
          sections: Json | null
          shared_with: Json | null
          signal_basis: Json | null
          signal_refs: Json | null
          source_insight_id: string | null
          status: string | null
          title: string
          tone: string | null
          updated_at: string | null
          user_id: string | null
          validated_at: string | null
          validation_issues: Json | null
          validation_pending: boolean | null
          why_now: string | null
        }
        Insert: {
          accepted_at?: string | null
          archived_reason?: string | null
          conversation_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          decision_thread_id?: string | null
          deferred_at?: string | null
          direction_alignment?: string | null
          fact_confidence?: number | null
          id?: string
          is_monitored?: boolean | null
          is_pinned?: boolean
          last_emailed_at?: string | null
          last_monitored_at?: string | null
          monitor_alert_threshold?: string | null
          monitor_last_signal_count?: number | null
          monitor_set_at?: string | null
          owner_quote?: string | null
          position_essence?: string | null
          reactivation_condition?: string | null
          reasoning?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          sections?: Json | null
          shared_with?: Json | null
          signal_basis?: Json | null
          signal_refs?: Json | null
          source_insight_id?: string | null
          status?: string | null
          title: string
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validation_issues?: Json | null
          validation_pending?: boolean | null
          why_now?: string | null
        }
        Update: {
          accepted_at?: string | null
          archived_reason?: string | null
          conversation_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          decision_thread_id?: string | null
          deferred_at?: string | null
          direction_alignment?: string | null
          fact_confidence?: number | null
          id?: string
          is_monitored?: boolean | null
          is_pinned?: boolean
          last_emailed_at?: string | null
          last_monitored_at?: string | null
          monitor_alert_threshold?: string | null
          monitor_last_signal_count?: number | null
          monitor_set_at?: string | null
          owner_quote?: string | null
          position_essence?: string | null
          reactivation_condition?: string | null
          reasoning?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          sections?: Json | null
          shared_with?: Json | null
          signal_basis?: Json | null
          signal_refs?: Json | null
          source_insight_id?: string | null
          status?: string | null
          title?: string
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validation_issues?: Json | null
          validation_pending?: boolean | null
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_decision_thread_id_fkey"
            columns: ["decision_thread_id"]
            isOneToOne: false
            referencedRelation: "decision_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_context: {
        Row: {
          company_name: string
          created_at: string | null
          current_focus: Json | null
          function: string
          id: string
          last_pulse_check: string | null
          level: string
          preferences: Json | null
          updated_at: string | null
          user_name: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          current_focus?: Json | null
          function: string
          id?: string
          last_pulse_check?: string | null
          level: string
          preferences?: Json | null
          updated_at?: string | null
          user_name: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          current_focus?: Json | null
          function?: string
          id?: string
          last_pulse_check?: string | null
          level?: string
          preferences?: Json | null
          updated_at?: string | null
          user_name?: string
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          content_snippet: string | null
          embedding: string | null
          id: string
          quality_score: number | null
          scan_pass: number | null
          scanned_at: string | null
          source_date: string | null
          source_title: string | null
          source_url: string
          sub_topic_id: string
        }
        Insert: {
          content_snippet?: string | null
          embedding?: string | null
          id?: string
          quality_score?: number | null
          scan_pass?: number | null
          scanned_at?: string | null
          source_date?: string | null
          source_title?: string | null
          source_url: string
          sub_topic_id: string
        }
        Update: {
          content_snippet?: string | null
          embedding?: string | null
          id?: string
          quality_score?: number | null
          scan_pass?: number | null
          scanned_at?: string | null
          source_date?: string | null
          source_title?: string | null
          source_url?: string
          sub_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_sub_topic_id_fkey"
            columns: ["sub_topic_id"]
            isOneToOne: false
            referencedRelation: "sub_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_clusters: {
        Row: {
          avg_confidence: string | null
          created_at: string | null
          description: string
          id: string
          name: string
          signal_count: number
          signal_ids: string[]
          top_urgency: string | null
          user_id: string
        }
        Insert: {
          avg_confidence?: string | null
          created_at?: string | null
          description: string
          id?: string
          name: string
          signal_count: number
          signal_ids: string[]
          top_urgency?: string | null
          user_id: string
        }
        Update: {
          avg_confidence?: string | null
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          signal_count?: number
          signal_ids?: string[]
          top_urgency?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signal_edges: {
        Row: {
          created_at: string | null
          id: number
          reason: string | null
          semantic_label: string | null
          similarity: number
          source_id: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          reason?: string | null
          semantic_label?: string | null
          similarity?: number
          source_id: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: number
          reason?: string | null
          semantic_label?: string | null
          similarity?: number
          source_id?: string
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_feedback: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          signal_id: string
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          signal_id: string
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          signal_id?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          adjacent_layer: string | null
          analysis_context: string | null
          analyzed_at: string | null
          archived_at: string | null
          bridge_reason: string | null
          category: string | null
          cluster_id: string | null
          created_at: string | null
          credibility: number | null
          days_active: number | null
          decision_question: string | null
          discovery_type: string | null
          domain: string | null
          entities: Json | null
          entity_tags: Json | null
          fact_confidence: number | null
          first_seen: string | null
          id: string
          last_scanned_at: string | null
          last_source_count: number | null
          layer: number | null
          momentum: number | null
          nb_impact: string | null
          nb_relevance: string | null
          perspective: string | null
          priority_score: number | null
          query_origin: string | null
          raw_sources: Json | null
          reference_count: number | null
          reference_velocity: number | null
          role_in_insight: string | null
          scan_source: string | null
          source_count_history: Json | null
          source_date: string | null
          sources: number
          summary: string | null
          title: string
          topic_cluster: string | null
          updated_at: string | null
          urgency: string
          url: string | null
          user_id: string
          watch_topic_match: string | null
        }
        Insert: {
          adjacent_layer?: string | null
          analysis_context?: string | null
          analyzed_at?: string | null
          archived_at?: string | null
          bridge_reason?: string | null
          category?: string | null
          cluster_id?: string | null
          created_at?: string | null
          credibility?: number | null
          days_active?: number | null
          decision_question?: string | null
          discovery_type?: string | null
          domain?: string | null
          entities?: Json | null
          entity_tags?: Json | null
          fact_confidence?: number | null
          first_seen?: string | null
          id: string
          last_scanned_at?: string | null
          last_source_count?: number | null
          layer?: number | null
          momentum?: number | null
          nb_impact?: string | null
          nb_relevance?: string | null
          perspective?: string | null
          priority_score?: number | null
          query_origin?: string | null
          raw_sources?: Json | null
          reference_count?: number | null
          reference_velocity?: number | null
          role_in_insight?: string | null
          scan_source?: string | null
          source_count_history?: Json | null
          source_date?: string | null
          sources?: number
          summary?: string | null
          title: string
          topic_cluster?: string | null
          updated_at?: string | null
          urgency: string
          url?: string | null
          user_id: string
          watch_topic_match?: string | null
        }
        Update: {
          adjacent_layer?: string | null
          analysis_context?: string | null
          analyzed_at?: string | null
          archived_at?: string | null
          bridge_reason?: string | null
          category?: string | null
          cluster_id?: string | null
          created_at?: string | null
          credibility?: number | null
          days_active?: number | null
          decision_question?: string | null
          discovery_type?: string | null
          domain?: string | null
          entities?: Json | null
          entity_tags?: Json | null
          fact_confidence?: number | null
          first_seen?: string | null
          id?: string
          last_scanned_at?: string | null
          last_source_count?: number | null
          layer?: number | null
          momentum?: number | null
          nb_impact?: string | null
          nb_relevance?: string | null
          perspective?: string | null
          priority_score?: number | null
          query_origin?: string | null
          raw_sources?: Json | null
          reference_count?: number | null
          reference_velocity?: number | null
          role_in_insight?: string | null
          scan_source?: string | null
          source_count_history?: Json | null
          source_date?: string | null
          sources?: number
          summary?: string | null
          title?: string
          topic_cluster?: string | null
          updated_at?: string | null
          urgency?: string
          url?: string | null
          user_id?: string
          watch_topic_match?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      source_registry: {
        Row: {
          added_by: string | null
          approved_at: string | null
          category: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string | null
          last_scanned_at: string | null
          notes: string | null
          scan_tier: string | null
          signal_count: number | null
          suggested_reason: string | null
          tier: number
          user_id: string | null
          weight: number
        }
        Insert: {
          added_by?: string | null
          approved_at?: string | null
          category: string
          created_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          last_scanned_at?: string | null
          notes?: string | null
          scan_tier?: string | null
          signal_count?: number | null
          suggested_reason?: string | null
          tier: number
          user_id?: string | null
          weight: number
        }
        Update: {
          added_by?: string | null
          approved_at?: string | null
          category?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          last_scanned_at?: string | null
          notes?: string | null
          scan_tier?: string | null
          signal_count?: number | null
          suggested_reason?: string | null
          tier?: number
          user_id?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_registry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_topics: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          search_queries: Json
          source: string | null
          topic: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          search_queries: Json
          source?: string | null
          topic: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          search_queries?: Json
          source?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      suggested_topics: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          signal_count: number | null
          signal_ids: Json | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          signal_count?: number | null
          signal_ids?: Json | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          signal_count?: number | null
          signal_ids?: Json | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tactical_contexts: {
        Row: {
          collected_via: string | null
          created_at: string | null
          focus_items: Json
          id: string
          user_id: string
        }
        Insert: {
          collected_via?: string | null
          created_at?: string | null
          focus_items: Json
          id?: string
          user_id: string
        }
        Update: {
          collected_via?: string | null
          created_at?: string | null
          focus_items?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tactical_layer: {
        Row: {
          created_at: string | null
          current_work: Json | null
          id: string
          recent_topics: Json | null
          updated_at: string | null
          user_id: string | null
          user_name: string
          watch_topics: Json | null
        }
        Insert: {
          created_at?: string | null
          current_work?: Json | null
          id?: string
          recent_topics?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_name: string
          watch_topics?: Json | null
        }
        Update: {
          created_at?: string | null
          current_work?: Json | null
          id?: string
          recent_topics?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string
          watch_topics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tactical_layer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          role_context_json: Json | null
          role_group: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id: string
          role_context_json?: Json | null
          role_group?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role_context_json?: Json | null
          role_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          decisions_logged: string[] | null
          ended_at: string | null
          id: string
          insights_briefed: string[] | null
          insights_discussed: string[] | null
          started_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          decisions_logged?: string[] | null
          ended_at?: string | null
          id?: string
          insights_briefed?: string[] | null
          insights_discussed?: string[] | null
          started_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          decisions_logged?: string[] | null
          ended_at?: string | null
          id?: string
          insights_briefed?: string[] | null
          insights_discussed?: string[] | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company: string | null
          competitors: string[] | null
          created_at: string | null
          current_priorities: string | null
          current_work: Json | null
          focus_areas: string[] | null
          function: string | null
          id: string
          is_admin: boolean | null
          key_products: string[] | null
          level: string | null
          name: string | null
          preferences: Json | null
          role: string | null
          scan_paused: boolean | null
          updated_at: string | null
          watch_topics: Json | null
        }
        Insert: {
          company?: string | null
          competitors?: string[] | null
          created_at?: string | null
          current_priorities?: string | null
          current_work?: Json | null
          focus_areas?: string[] | null
          function?: string | null
          id?: string
          is_admin?: boolean | null
          key_products?: string[] | null
          level?: string | null
          name?: string | null
          preferences?: Json | null
          role?: string | null
          scan_paused?: boolean | null
          updated_at?: string | null
          watch_topics?: Json | null
        }
        Update: {
          company?: string | null
          competitors?: string[] | null
          created_at?: string | null
          current_priorities?: string | null
          current_work?: Json | null
          focus_areas?: string[] | null
          function?: string | null
          id?: string
          is_admin?: boolean | null
          key_products?: string[] | null
          level?: string | null
          name?: string | null
          preferences?: Json | null
          role?: string | null
          scan_paused?: boolean | null
          updated_at?: string | null
          watch_topics?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
