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
      checkins: {
        Row: {
          created_at: string
          excursao_id: string
          feito_por: string | null
          id: string
          passageiro_id: string
        }
        Insert: {
          created_at?: string
          excursao_id: string
          feito_por?: string | null
          id?: string
          passageiro_id: string
        }
        Update: {
          created_at?: string
          excursao_id?: string
          feito_por?: string | null
          id?: string
          passageiro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "passageiros"
            referencedColumns: ["id"]
          },
        ]
      }
      excursoes: {
        Row: {
          banner_url: string | null
          cor: string | null
          created_at: string
          custo_onibus: number
          data_evento: string
          descricao: string | null
          destino: string
          horario_retorno: string | null
          horario_saida: string | null
          id: string
          organizer_id: string
          ponto_embarque: string | null
          preco: number
          status: string
          titulo: string
          total_vagas: number
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          cor?: string | null
          created_at?: string
          custo_onibus?: number
          data_evento: string
          descricao?: string | null
          destino: string
          horario_retorno?: string | null
          horario_saida?: string | null
          id?: string
          organizer_id: string
          ponto_embarque?: string | null
          preco?: number
          status?: string
          titulo: string
          total_vagas?: number
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          cor?: string | null
          created_at?: string
          custo_onibus?: number
          data_evento?: string
          descricao?: string | null
          destino?: string
          horario_retorno?: string | null
          horario_saida?: string | null
          id?: string
          organizer_id?: string
          ponto_embarque?: string | null
          preco?: number
          status?: string
          titulo?: string
          total_vagas?: number
          updated_at?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          autor_id: string
          autor_nome: string | null
          conteudo: string
          created_at: string
          excursao_id: string
          id: string
        }
        Insert: {
          autor_id: string
          autor_nome?: string | null
          conteudo: string
          created_at?: string
          excursao_id: string
          id?: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string | null
          conteudo?: string
          created_at?: string
          excursao_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          comprovante_url: string | null
          created_at: string
          excursao_id: string
          id: string
          metodo: string
          observacao: string | null
          pago_em: string | null
          passageiro_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          excursao_id: string
          id?: string
          metodo?: string
          observacao?: string | null
          pago_em?: string | null
          passageiro_id: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          excursao_id?: string
          id?: string
          metodo?: string
          observacao?: string | null
          pago_em?: string | null
          passageiro_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "passageiros"
            referencedColumns: ["id"]
          },
        ]
      }
      passageiros: {
        Row: {
          assento: string | null
          created_at: string
          documento: string | null
          embarcado_em: string | null
          excursao_id: string
          id: string
          nome: string
          qr_code: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          assento?: string | null
          created_at?: string
          documento?: string | null
          embarcado_em?: string | null
          excursao_id: string
          id?: string
          nome: string
          qr_code?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          assento?: string | null
          created_at?: string
          documento?: string | null
          embarcado_em?: string | null
          excursao_id?: string
          id?: string
          nome?: string
          qr_code?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passageiros_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
