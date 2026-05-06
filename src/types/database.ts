// =============================================================================
// SuperGurú — Tipos de base de datos
//
// Este archivo representa la forma que tendrá el output de:
//   npm run supabase:types
//
// Una vez conectado el proyecto a Supabase, regenerar con ese comando.
// No editar manualmente — editar el schema SQL y regenerar.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'extra_time' | 'penalties' | 'finished'
export type ScoringTier = 'exact' | 'partial_win' | 'winner' | 'partial'
export type SpecialPredictionType = 'champion' | 'top_scorer'

// ---------------------------------------------------------------------------
// Tablas — Row (lo que devuelve la DB), Insert (lo que se envía), Update
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          is_superadmin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          is_superadmin?: boolean
          created_at?: string
        }
        Update: {
          full_name?: string
          // is_superadmin NO se incluye — no editable desde UI
        }
      }

      pools: {
        Row: {
          id: string
          name: string
          welcome_message: string | null
          includes_champion_guess: boolean
          includes_top_scorer_guess: boolean
          starts_at: string
          ends_at: string
          member_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          welcome_message?: string | null
          includes_champion_guess?: boolean
          includes_top_scorer_guess?: boolean
          starts_at: string
          ends_at: string
          member_count?: number
          created_at?: string
        }
        Update: {
          name?: string
          welcome_message?: string | null
          includes_champion_guess?: boolean
          includes_top_scorer_guess?: boolean
          starts_at?: string
          ends_at?: string
        }
      }

      pool_admins: {
        Row: {
          id: string
          pool_id: string
          user_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          user_id: string
          assigned_at?: string
        }
        Update: never
      }

      pool_members: {
        Row: {
          id: string
          pool_id: string
          user_id: string
          display_name: string
          joined_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          user_id: string
          display_name: string
          joined_at?: string
        }
        Update: {
          display_name?: string
        }
      }

      pool_messages: {
        Row: {
          id: string
          pool_id: string
          author_id: string
          content: string
          is_pinned: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          author_id: string
          content: string
          is_pinned?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          is_pinned?: boolean
          expires_at?: string | null
        }
      }

      system_messages: {
        Row: {
          id: string
          author_id: string
          content: string
          is_pinned: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          is_pinned?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          is_pinned?: boolean
          expires_at?: string | null
        }
      }

      matches: {
        Row: {
          id: string
          home_team: string
          away_team: string
          stage: MatchStage
          group_name: string | null
          kickoff_at: string          // UTC — convertir a COT en el frontend
          home_score: number | null
          away_score: number | null
          went_to_extra_time: boolean
          went_to_penalties: boolean
          status: MatchStatus
          score_updated_by: string | null
          score_updated_at: string | null
        }
        Insert: {
          id?: string
          home_team: string
          away_team: string
          stage: MatchStage
          group_name?: string | null
          kickoff_at: string
          home_score?: number | null
          away_score?: number | null
          went_to_extra_time?: boolean
          went_to_penalties?: boolean
          status?: MatchStatus
          score_updated_by?: string | null
          score_updated_at?: string | null
        }
        Update: {
          home_score?: number | null
          away_score?: number | null
          went_to_extra_time?: boolean
          went_to_penalties?: boolean
          status?: MatchStatus
          score_updated_by?: string | null
          score_updated_at?: string | null
        }
      }

      pool_matches: {
        Row: {
          id: string
          pool_id: string
          match_id: string
        }
        Insert: {
          id?: string
          pool_id: string
          match_id: string
        }
        Update: never
      }

      predictions: {
        Row: {
          id: string
          pool_member_id: string
          match_id: string
          predicted_home: number
          predicted_away: number
          submitted_at: string
          locked_at: string | null
        }
        Insert: {
          id?: string
          pool_member_id: string
          match_id: string
          predicted_home: number
          predicted_away: number
          submitted_at?: string
          locked_at?: string | null
        }
        Update: {
          predicted_home?: number
          predicted_away?: number
          submitted_at?: string
          locked_at?: string | null
        }
      }

      special_predictions: {
        Row: {
          id: string
          pool_member_id: string
          prediction_type: SpecialPredictionType
          predicted_value: string
          locked_at: string | null
        }
        Insert: {
          id?: string
          pool_member_id: string
          prediction_type: SpecialPredictionType
          predicted_value: string
          locked_at?: string | null
        }
        Update: {
          predicted_value?: string
          locked_at?: string | null
        }
      }

      scoring_config: {
        Row: {
          id: string
          stage: MatchStage
          tier: ScoringTier
          points: number
          updated_at: string
        }
        Insert: {
          id?: string
          stage: MatchStage
          tier: ScoringTier
          points: number
          updated_at?: string
        }
        Update: {
          points?: number
          updated_at?: string
        }
      }

      scores: {
        Row: {
          id: string
          pool_member_id: string
          match_id: string
          points_earned: number
          breakdown: Json
          calculated_at: string
        }
        Insert: {
          id?: string
          pool_member_id: string
          match_id: string
          points_earned?: number
          breakdown?: Json
          calculated_at?: string
        }
        Update: {
          points_earned?: number
          breakdown?: Json
          calculated_at?: string
        }
      }

      special_scores: {
        Row: {
          id: string
          pool_member_id: string
          prediction_type: SpecialPredictionType
          points_earned: number
          calculated_at: string
        }
        Insert: {
          id?: string
          pool_member_id: string
          prediction_type: SpecialPredictionType
          points_earned?: number
          calculated_at?: string
        }
        Update: {
          points_earned?: number
          calculated_at?: string
        }
      }

      admin_notifications: {
        Row: {
          id: string
          pool_id: string
          created_by: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          created_by: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
    }

    Views: {
      leaderboard_by_pool: {
        Row: {
          pool_id: string
          pool_member_id: string
          display_name: string
          total_points: number
          match_points: number
          special_points: number
          matches_scored: number
        }
      }
    }

    Functions: {
      create_pool: {
        Args: {
          p_name: string
          p_welcome_message?: string
          p_starts_at: string
          p_ends_at: string
          p_includes_champion_guess?: boolean
          p_includes_top_scorer_guess?: boolean
        }
        Returns: string  // uuid de la nueva Polla
      }
      add_pool_matches_by_range: {
        Args: { p_pool_id: string }
        Returns: number  // partidos agregados
      }
      lock_predictions_for_match: {
        Args: Record<never, never>
        Returns: number
      }
      lock_special_predictions: {
        Args: Record<never, never>
        Returns: number
      }
      update_match_score: {
        Args: {
          p_match_id: string
          p_home_score: number
          p_away_score: number
          p_status?: MatchStatus
          p_went_to_extra_time?: boolean
          p_went_to_penalties?: boolean
        }
        Returns: void
      }
      replicate_prediction: {
        Args: {
          p_source_pool_member_id: string
          p_match_id: string
          p_predicted_home: number
          p_predicted_away: number
        }
        Returns: number
      }
      is_superadmin: {
        Args: Record<never, never>
        Returns: boolean
      }
      is_pool_admin: {
        Args: { p_pool_id: string }
        Returns: boolean
      }
      is_pool_member: {
        Args: { p_pool_id: string }
        Returns: boolean
      }
    }

    Enums: {
      match_stage: MatchStage
      match_status: MatchStatus
      scoring_tier: ScoringTier
      special_prediction_type: SpecialPredictionType
    }
  }
}

// ---------------------------------------------------------------------------
// Tipos de conveniencia — usar estos en el código de la app
// ---------------------------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// Tipos concretos de cada entidad
export type User              = Tables<'users'>
export type Pool              = Tables<'pools'>
export type PoolAdmin         = Tables<'pool_admins'>
export type PoolMember        = Tables<'pool_members'>
export type PoolMessage       = Tables<'pool_messages'>
export type SystemMessage     = Tables<'system_messages'>
export type Match             = Tables<'matches'>
export type PoolMatch         = Tables<'pool_matches'>
export type Prediction        = Tables<'predictions'>
export type SpecialPrediction = Tables<'special_predictions'>
export type ScoringConfig     = Tables<'scoring_config'>
export type Score             = Tables<'scores'>
export type SpecialScore      = Tables<'special_scores'>
export type AdminNotification = Tables<'admin_notifications'>
export type LeaderboardEntry  = Views<'leaderboard_by_pool'>

// Tipos compuestos de uso frecuente
export type MatchWithPrediction = Match & {
  prediction?: Pick<Prediction, 'predicted_home' | 'predicted_away' | 'locked_at'>
}

export type ScoreBreakdown = {
  tier: ScoringTier | 'none'
  stage: MatchStage
  points: number
  real: { home: number; away: number }
  pred: { home: number; away: number }
}
