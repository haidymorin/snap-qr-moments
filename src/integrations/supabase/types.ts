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
      events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          expire_le: string | null
          id: string
          name: string
          paye_le: string | null
          plan: string
          statut: string
          stripe_session_id: string | null
          unique_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          expire_le?: string | null
          id?: string
          name: string
          paye_le?: string | null
          plan?: string
          statut?: string
          stripe_session_id?: string | null
          unique_code?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          expire_le?: string | null
          id?: string
          name?: string
          paye_le?: string | null
          plan?: string
          statut?: string
          stripe_session_id?: string | null
          unique_code?: string
          user_id?: string
        }
        Relationships: []
      }
      face_consents: {
        Row: {
          allow_hosts: boolean
          browser_token: string
          created_at: string
          event_id: string
          expires_at: string
          first_name: string
          id: string
          last_used_at: string
          rekognition_face_id: string | null
        }
        Insert: {
          allow_hosts?: boolean
          browser_token: string
          created_at?: string
          event_id: string
          expires_at: string
          first_name: string
          id?: string
          last_used_at?: string
          rekognition_face_id?: string | null
        }
        Update: {
          allow_hosts?: boolean
          browser_token?: string
          created_at?: string
          event_id?: string
          expires_at?: string
          first_name?: string
          id?: string
          last_used_at?: string
          rekognition_face_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "face_consents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      face_events: {
        Row: {
          activated_at: string | null
          collection_id: string | null
          event_id: string
          indexed_photos: number
          last_error: string | null
          status: string
          total_photos: number
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          collection_id?: string | null
          event_id: string
          indexed_photos?: number
          last_error?: string | null
          status?: string
          total_photos?: number
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          collection_id?: string | null
          event_id?: string
          indexed_photos?: number
          last_error?: string | null
          status?: string
          total_photos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_contacts: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          last_reminded_at: string | null
          phone: string | null
          source: string
          uploaded: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          last_reminded_at?: string | null
          phone?: string | null
          source?: string
          uploaded?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          last_reminded_at?: string | null
          phone?: string | null
          source?: string
          uploaded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guest_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          acces_delivre_le: string | null
          charge_utile: Json | null
          devise: string
          email: string | null
          event_id: string | null
          montant_centimes: number | null
          plan: string | null
          recu_le: string
          statut: string
          stripe_session_id: string
        }
        Insert: {
          acces_delivre_le?: string | null
          charge_utile?: Json | null
          devise?: string
          email?: string | null
          event_id?: string | null
          montant_centimes?: number | null
          plan?: string | null
          recu_le?: string
          statut?: string
          stripe_session_id: string
        }
        Update: {
          acces_delivre_le?: string | null
          charge_utile?: Json | null
          devise?: string
          email?: string | null
          event_id?: string | null
          montant_centimes?: number | null
          plan?: string | null
          recu_le?: string
          statut?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_faces: {
        Row: {
          created_at: string
          event_id: string
          id: string
          photo_id: string
          rekognition_face_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          photo_id: string
          rekognition_face_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          photo_id?: string
          rekognition_face_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_faces_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_faces_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          event_id: string
          faces_indexed_at: string | null
          file_name: string
          id: string
          media_type: string
          storage_path: string
          thumbnail_url: string | null
          uploaded_at: string
          url: string
        }
        Insert: {
          event_id: string
          faces_indexed_at?: string | null
          file_name: string
          id?: string
          media_type?: string
          storage_path: string
          thumbnail_url?: string | null
          uploaded_at?: string
          url: string
        }
        Update: {
          event_id?: string
          faces_indexed_at?: string | null
          file_name?: string
          id?: string
          media_type?: string
          storage_path?: string
          thumbnail_url?: string | null
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      est_admin: { Args: { p_user?: string }; Returns: boolean }
      evenement_actif: { Args: { p_event_id: string }; Returns: boolean }
      event_exists: { Args: { p_event_id: string }; Returns: boolean }
      guest_count_media: {
        Args: { p_event_id: string; p_media?: string }
        Returns: number
      }
      guest_get_event: {
        Args: { p_event_id: string }
        Returns: {
          event_date: string
          event_type: string
          id: string
          name: string
          plan: string
        }[]
      }
      guest_list_by_ids: {
        Args: { p_event_id: string; p_ids: string[] }
        Returns: {
          event_id: string
          faces_indexed_at: string | null
          file_name: string
          id: string
          media_type: string
          storage_path: string
          thumbnail_url: string | null
          uploaded_at: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "photos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      guest_list_media: {
        Args: {
          p_event_id: string
          p_limit?: number
          p_media?: string
          p_offset?: number
        }
        Returns: {
          file_name: string
          id: string
          media_type: string
          thumbnail_url: string
          uploaded_at: string
          url: string
        }[]
      }
      guest_self_register: {
        Args: { p_email?: string; p_event_id: string; p_phone?: string }
        Returns: undefined
      }
      host_list_consenting_guests: {
        Args: { p_event_id: string }
        Returns: {
          consent_id: string
          created_at: string
          first_name: string
        }[]
      }
      purge_expired_face_consents: {
        Args: never
        Returns: {
          collection_id: string
          event_id: string
          rekognition_face_id: string
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
  public: {
    Enums: {},
  },
} as const
