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
      equipe_excursoes: {
        Row: {
          convite_email: string | null
          created_at: string
          excursao_id: string
          id: string
          papel: string
          staff_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          convite_email?: string | null
          created_at?: string
          excursao_id: string
          id?: string
          papel?: string
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          convite_email?: string | null
          created_at?: string
          excursao_id?: string
          id?: string
          papel?: string
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_excursoes_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
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
      invitations: {
        Row: {
          created_at: string
          created_by: string
          excursao_id: string
          expires_at: string
          id: string
          papel: string
          token: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          excursao_id: string
          expires_at?: string
          id?: string
          papel?: string
          token?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          excursao_id?: string
          expires_at?: string
          id?: string
          papel?: string
          token?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
        ]
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
          parcelas: number
          passageiro_id: string | null
          reserva_id: string | null
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
          parcelas?: number
          passageiro_id?: string | null
          reserva_id?: string | null
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
          parcelas?: number
          passageiro_id?: string | null
          reserva_id?: string | null
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
          {
            foreignKeyName: "pagamentos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      passageiros: {
        Row: {
          amount_paid: number
          assento: string | null
          comprador_id: string | null
          convite_token: string | null
          created_at: string
          documento: string | null
          email: string | null
          embarcado_em: string | null
          excursao_id: string
          id: string
          nome: string
          observacao_interna: string | null
          payment_status: string
          ponto_embarque_id: string | null
          qr_code: string
          reserva_id: string | null
          seat_id: string | null
          status: string
          telefone: string | null
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number
          assento?: string | null
          comprador_id?: string | null
          convite_token?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          embarcado_em?: string | null
          excursao_id: string
          id?: string
          nome: string
          observacao_interna?: string | null
          payment_status?: string
          ponto_embarque_id?: string | null
          qr_code?: string
          reserva_id?: string | null
          seat_id?: string | null
          status?: string
          telefone?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          assento?: string | null
          comprador_id?: string | null
          convite_token?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          embarcado_em?: string | null
          excursao_id?: string
          id?: string
          nome?: string
          observacao_interna?: string | null
          payment_status?: string
          ponto_embarque_id?: string | null
          qr_code?: string
          reserva_id?: string | null
          seat_id?: string | null
          status?: string
          telefone?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passageiros_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passageiros_ponto_embarque_id_fkey"
            columns: ["ponto_embarque_id"]
            isOneToOne: false
            referencedRelation: "pontos_embarque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passageiros_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_embarque: {
        Row: {
          created_at: string
          endereco: string | null
          excursao_id: string
          horario: string | null
          id: string
          nome: string
          ordem: number
          referencia: string | null
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          excursao_id: string
          horario?: string | null
          id?: string
          nome: string
          ordem?: number
          referencia?: string | null
        }
        Update: {
          created_at?: string
          endereco?: string | null
          excursao_id?: string
          horario?: string | null
          id?: string
          nome?: string
          ordem?: number
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pontos_embarque_excursao_id_fkey"
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
          birth_date: string | null
          created_at: string
          document: string | null
          document_type: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          amount_paid: number
          comprador_id: string
          created_at: string
          excursao_id: string
          id: string
          payment_status: string
          quantidade: number
          total_price: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          comprador_id: string
          created_at?: string
          excursao_id: string
          id?: string
          payment_status?: string
          quantidade?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          comprador_id?: string
          created_at?: string
          excursao_id?: string
          id?: string
          payment_status?: string
          quantidade?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string
          excursao_id: string
          id: string
          occupied: boolean
          passageiro_id: string | null
          reserved_by: string | null
          seat_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          excursao_id: string
          id?: string
          occupied?: boolean
          passageiro_id?: string | null
          reserved_by?: string | null
          seat_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          excursao_id?: string
          id?: string
          occupied?: boolean
          passageiro_id?: string | null
          reserved_by?: string | null
          seat_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seats_excursao_id_fkey"
            columns: ["excursao_id"]
            isOneToOne: false
            referencedRelation: "excursoes"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invitation: { Args: { p_token: string }; Returns: string }
      claim_passageiro_invite: { Args: { p_token: string }; Returns: string }
      criar_reserva_grupo: {
        Args: { p_excursao_id: string; p_passageiros: Json }
        Returns: string
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_passageiro_invite: {
        Args: { p_token: string }
        Returns: {
          excursao_data: string
          excursao_destino: string
          excursao_id: string
          excursao_titulo: string
          ja_usado: boolean
          nome: string
          reserva_id: string
        }[]
      }
      get_staff_invitation: {
        Args: { p_token: string }
        Returns: {
          excursao_data_evento: string
          excursao_destino: string
          excursao_id: string
          excursao_titulo: string
          expires_at: string
          id: string
          papel: string
          used: boolean
        }[]
      }
      has_booking_for_excursao: {
        Args: { _excursao_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_staff: {
        Args: { _excursao_id: string; _user_id: string }
        Returns: boolean
      }
      is_reserva_comprador: {
        Args: { _reserva_id: string; _user_id: string }
        Returns: boolean
      }
      is_reserva_passageiro: {
        Args: { _reserva_id: string; _user_id: string }
        Returns: boolean
      }
      organizer_create_manual_passageiro: {
        Args: {
          p_amount_paid?: number
          p_documento?: string
          p_email?: string
          p_excursao_id: string
          p_nome: string
          p_observacao_interna?: string
          p_payment_status?: string
          p_ponto_embarque_id?: string
          p_seat_id?: string
          p_status?: string
          p_telefone?: string
          p_total_price?: number
        }
        Returns: {
          amount_paid: number
          assento: string | null
          comprador_id: string | null
          convite_token: string | null
          created_at: string
          documento: string | null
          email: string | null
          embarcado_em: string | null
          excursao_id: string
          id: string
          nome: string
          observacao_interna: string | null
          payment_status: string
          ponto_embarque_id: string | null
          qr_code: string
          reserva_id: string | null
          seat_id: string | null
          status: string
          telefone: string | null
          total_price: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "passageiros"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      organizer_update_passageiro_trip_choices: {
        Args: {
          p_passageiro_id: string
          p_ponto_embarque_id?: string
          p_seat_id?: string
          p_update_ponto?: boolean
          p_update_seat?: boolean
        }
        Returns: {
          amount_paid: number
          assento: string | null
          comprador_id: string | null
          convite_token: string | null
          created_at: string
          documento: string | null
          email: string | null
          embarcado_em: string | null
          excursao_id: string
          id: string
          nome: string
          observacao_interna: string | null
          payment_status: string
          ponto_embarque_id: string | null
          qr_code: string
          reserva_id: string | null
          seat_id: string | null
          status: string
          telefone: string | null
          total_price: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "passageiros"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalc_passageiro_payments: {
        Args: { _passageiro_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "excursionista" | "staff" | "passageiro"
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
      app_role: ["excursionista", "staff", "passageiro"],
    },
  },
} as const
