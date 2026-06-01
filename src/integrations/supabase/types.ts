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
      elora_clientes: {
        Row: {
          agentes_ia: boolean | null
          apps: number | null
          asaas: boolean | null
          canais: number | null
          canais_insta: number | null
          canais_messenger: number | null
          canais_whats: number | null
          canais_zapi: number | null
          contatos_ativos: number | null
          created_at: string
          data_churn: string | null
          data_inicio: string | null
          data_vencimento: string | null
          extras: Json | null
          id: string
          mau: number | null
          nome: string
          observacao: string | null
          parceiro_id: string | null
          plano_id: string | null
          transcricao_ia: boolean | null
          user_id: string
          usuarios_ativos: number | null
          valor_acompanhamento: number | null
          valor_setup_pago: number | null
          zapi: boolean | null
        }
        Insert: {
          agentes_ia?: boolean | null
          apps?: number | null
          asaas?: boolean | null
          canais?: number | null
          canais_insta?: number | null
          canais_messenger?: number | null
          canais_whats?: number | null
          canais_zapi?: number | null
          contatos_ativos?: number | null
          created_at?: string
          data_churn?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          extras?: Json | null
          id: string
          mau?: number | null
          nome: string
          observacao?: string | null
          parceiro_id?: string | null
          plano_id?: string | null
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_acompanhamento?: number | null
          valor_setup_pago?: number | null
          zapi?: boolean | null
        }
        Update: {
          agentes_ia?: boolean | null
          apps?: number | null
          asaas?: boolean | null
          canais?: number | null
          canais_insta?: number | null
          canais_messenger?: number | null
          canais_whats?: number | null
          canais_zapi?: number | null
          contatos_ativos?: number | null
          created_at?: string
          data_churn?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          extras?: Json | null
          id?: string
          mau?: number | null
          nome?: string
          observacao?: string | null
          parceiro_id?: string | null
          plano_id?: string | null
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_acompanhamento?: number | null
          valor_setup_pago?: number | null
          zapi?: boolean | null
        }
        Relationships: []
      }
      elora_custos: {
        Row: {
          created_at: string
          custo_unitario: number
          id: string
          nome: string
          preco_cliente: number
          tipo: string
          unidade: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          id: string
          nome: string
          preco_cliente?: number
          tipo: string
          unidade?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          id?: string
          nome?: string
          preco_cliente?: number
          tipo?: string
          unidade?: string | null
          user_id?: string
        }
        Relationships: []
      }
      elora_kanban_cards: {
        Row: {
          cliente: string | null
          created_at: string
          data_criacao: string
          id: string
          observacao: string | null
          status: string
          titulo: string
          user_id: string
          valor: number | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          data_criacao?: string
          id: string
          observacao?: string | null
          status?: string
          titulo: string
          user_id?: string
          valor?: number | null
        }
        Update: {
          cliente?: string | null
          created_at?: string
          data_criacao?: string
          id?: string
          observacao?: string | null
          status?: string
          titulo?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      elora_movimentos: {
        Row: {
          agentes_ia: boolean | null
          apps: number | null
          asaas: boolean | null
          canais: number | null
          canais_insta: number | null
          canais_messenger: number | null
          canais_whats: number | null
          cliente_id: string
          contatos_ativos: number | null
          created_at: string
          data: string
          extras: Json | null
          id: string
          mau: number | null
          observacao: string | null
          plano_id: string | null
          tipo: string
          transcricao_ia: boolean | null
          user_id: string
          usuarios_ativos: number | null
          valor_servico: number | null
          zapi: boolean | null
        }
        Insert: {
          agentes_ia?: boolean | null
          apps?: number | null
          asaas?: boolean | null
          canais?: number | null
          canais_insta?: number | null
          canais_messenger?: number | null
          canais_whats?: number | null
          cliente_id: string
          contatos_ativos?: number | null
          created_at?: string
          data: string
          extras?: Json | null
          id: string
          mau?: number | null
          observacao?: string | null
          plano_id?: string | null
          tipo: string
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_servico?: number | null
          zapi?: boolean | null
        }
        Update: {
          agentes_ia?: boolean | null
          apps?: number | null
          asaas?: boolean | null
          canais?: number | null
          canais_insta?: number | null
          canais_messenger?: number | null
          canais_whats?: number | null
          cliente_id?: string
          contatos_ativos?: number | null
          created_at?: string
          data?: string
          extras?: Json | null
          id?: string
          mau?: number | null
          observacao?: string | null
          plano_id?: string | null
          tipo?: string
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_servico?: number | null
          zapi?: boolean | null
        }
        Relationships: []
      }
      elora_parceiros: {
        Row: {
          celular: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          observacao: string | null
          planos_vinculados: Json | null
          user_id: string
        }
        Insert: {
          celular?: string | null
          criado_em?: string
          email?: string | null
          id: string
          nome: string
          observacao?: string | null
          planos_vinculados?: Json | null
          user_id?: string
        }
        Update: {
          celular?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          planos_vinculados?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      elora_planos: {
        Row: {
          canais_inclusos: number | null
          canais_insta_inclusos: number
          canais_messenger_inclusos: number
          canais_whats_inclusos: number
          contatos_inclusos: number | null
          created_at: string
          id: string
          inclui_asaas: boolean | null
          inclui_ia: boolean | null
          inclui_transcricao: boolean | null
          inclui_zapi: number | null
          licenca_base: number | null
          nome: string
          observacao: string | null
          parceiro_ids: Json | null
          preco_asaas: number | null
          preco_canais_exc: number | null
          preco_canal_insta_exc: number
          preco_canal_messenger_exc: number
          preco_canal_whats_exc: number
          preco_contatos_exc: number | null
          preco_ia: number | null
          preco_transcricao_user: number | null
          preco_usuarios_exc: number | null
          preco_zapi: number | null
          user_id: string
          usuarios_inclusos: number | null
          valor_asaas: number | null
          valor_canais_exc: number | null
          valor_canal_insta_exc: number
          valor_canal_messenger_exc: number
          valor_canal_whats_exc: number
          valor_contatos_exc: number | null
          valor_ia: number | null
          valor_mensal: number | null
          valor_setup: number | null
          valor_transcricao_user: number | null
          valor_usuarios_exc: number | null
          valor_zapi: number | null
        }
        Insert: {
          canais_inclusos?: number | null
          canais_insta_inclusos?: number
          canais_messenger_inclusos?: number
          canais_whats_inclusos?: number
          contatos_inclusos?: number | null
          created_at?: string
          id: string
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          licenca_base?: number | null
          nome: string
          observacao?: string | null
          parceiro_ids?: Json | null
          preco_asaas?: number | null
          preco_canais_exc?: number | null
          preco_canal_insta_exc?: number
          preco_canal_messenger_exc?: number
          preco_canal_whats_exc?: number
          preco_contatos_exc?: number | null
          preco_ia?: number | null
          preco_transcricao_user?: number | null
          preco_usuarios_exc?: number | null
          preco_zapi?: number | null
          user_id?: string
          usuarios_inclusos?: number | null
          valor_asaas?: number | null
          valor_canais_exc?: number | null
          valor_canal_insta_exc?: number
          valor_canal_messenger_exc?: number
          valor_canal_whats_exc?: number
          valor_contatos_exc?: number | null
          valor_ia?: number | null
          valor_mensal?: number | null
          valor_setup?: number | null
          valor_transcricao_user?: number | null
          valor_usuarios_exc?: number | null
          valor_zapi?: number | null
        }
        Update: {
          canais_inclusos?: number | null
          canais_insta_inclusos?: number
          canais_messenger_inclusos?: number
          canais_whats_inclusos?: number
          contatos_inclusos?: number | null
          created_at?: string
          id?: string
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          licenca_base?: number | null
          nome?: string
          observacao?: string | null
          parceiro_ids?: Json | null
          preco_asaas?: number | null
          preco_canais_exc?: number | null
          preco_canal_insta_exc?: number
          preco_canal_messenger_exc?: number
          preco_canal_whats_exc?: number
          preco_contatos_exc?: number | null
          preco_ia?: number | null
          preco_transcricao_user?: number | null
          preco_usuarios_exc?: number | null
          preco_zapi?: number | null
          user_id?: string
          usuarios_inclusos?: number | null
          valor_asaas?: number | null
          valor_canais_exc?: number | null
          valor_canal_insta_exc?: number
          valor_canal_messenger_exc?: number
          valor_canal_whats_exc?: number
          valor_contatos_exc?: number | null
          valor_ia?: number | null
          valor_mensal?: number | null
          valor_setup?: number | null
          valor_transcricao_user?: number | null
          valor_usuarios_exc?: number | null
          valor_zapi?: number | null
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
