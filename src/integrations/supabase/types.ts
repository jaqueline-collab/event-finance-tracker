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
      app_user_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          email: string
          id: string
          module: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          email: string
          id?: string
          module: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          email?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by: string | null
          is_admin: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by?: string | null
          is_admin?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          is_admin?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      elora_classificacoes_descobertas: {
        Row: {
          cliente_id: string
          id: string
          sincronizado_em: string
          valor_bruto: string
        }
        Insert: {
          cliente_id: string
          id?: string
          sincronizado_em?: string
          valor_bruto: string
        }
        Update: {
          cliente_id?: string
          id?: string
          sincronizado_em?: string
          valor_bruto?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_classificacoes_descobertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_classificacoes_rotulo_valores: {
        Row: {
          rotulo_id: string
          valor_bruto: string
        }
        Insert: {
          rotulo_id: string
          valor_bruto: string
        }
        Update: {
          rotulo_id?: string
          valor_bruto?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_classificacoes_rotulo_valores_rotulo_id_fkey"
            columns: ["rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_classificacoes_rotulos: {
        Row: {
          cliente_id: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_classificacoes_rotulos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_cliente_usuarios: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          criado_por: string | null
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_cliente_usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
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
          ciclo_dia_final: number | null
          ciclo_dia_inicial: number | null
          ciclo_personalizado: boolean
          contatos_ativos: number | null
          created_at: string
          data_churn: string | null
          data_inicio: string | null
          data_vencimento: string | null
          extras: Json | null
          id: string
          mau: number | null
          nome: string
          nome_financeiro: string | null
          observacao: string | null
          parceiro_id: string | null
          plano_id: string | null
          status_comercial: string
          transcricao_ia: boolean | null
          updated_at: string
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
          ciclo_dia_final?: number | null
          ciclo_dia_inicial?: number | null
          ciclo_personalizado?: boolean
          contatos_ativos?: number | null
          created_at?: string
          data_churn?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          extras?: Json | null
          id: string
          mau?: number | null
          nome: string
          nome_financeiro?: string | null
          observacao?: string | null
          parceiro_id?: string | null
          plano_id?: string | null
          status_comercial?: string
          transcricao_ia?: boolean | null
          updated_at?: string
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
          ciclo_dia_final?: number | null
          ciclo_dia_inicial?: number | null
          ciclo_personalizado?: boolean
          contatos_ativos?: number | null
          created_at?: string
          data_churn?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          extras?: Json | null
          id?: string
          mau?: number | null
          nome?: string
          nome_financeiro?: string | null
          observacao?: string | null
          parceiro_id?: string | null
          plano_id?: string | null
          status_comercial?: string
          transcricao_ia?: boolean | null
          updated_at?: string
          user_id?: string
          usuarios_ativos?: number | null
          valor_acompanhamento?: number | null
          valor_setup_pago?: number | null
          zapi?: boolean | null
        }
        Relationships: []
      }
      elora_contatos_sincronizados: {
        Row: {
          campos_personalizados: Json
          cliente_id: string
          contact_id: string
          criado_em: string | null
          data_consulta: string | null
          id: string
          nome: string | null
          procedimento_interesse: string | null
          sincronizado_em: string
          telefone: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          campos_personalizados?: Json
          cliente_id: string
          contact_id: string
          criado_em?: string | null
          data_consulta?: string | null
          id?: string
          nome?: string | null
          procedimento_interesse?: string | null
          sincronizado_em?: string
          telefone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          campos_personalizados?: Json
          cliente_id?: string
          contact_id?: string
          criado_em?: string | null
          data_consulta?: string | null
          id?: string
          nome?: string | null
          procedimento_interesse?: string | null
          sincronizado_em?: string
          telefone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_contatos_sincronizados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_conversas_classificadas: {
        Row: {
          atualizado_em: string | null
          category: string | null
          category_name: string | null
          cliente_id: string
          contato_id: string | null
          criado_em: string | null
          first_response_at: string | null
          id: string
          sessao_id: string
          sincronizado_em: string
          teve_resposta: boolean
          time_service_segundos: number | null
          time_wait_segundos: number | null
        }
        Insert: {
          atualizado_em?: string | null
          category?: string | null
          category_name?: string | null
          cliente_id: string
          contato_id?: string | null
          criado_em?: string | null
          first_response_at?: string | null
          id?: string
          sessao_id: string
          sincronizado_em?: string
          teve_resposta?: boolean
          time_service_segundos?: number | null
          time_wait_segundos?: number | null
        }
        Update: {
          atualizado_em?: string | null
          category?: string | null
          category_name?: string | null
          cliente_id?: string
          contato_id?: string | null
          criado_em?: string | null
          first_response_at?: string | null
          id?: string
          sessao_id?: string
          sincronizado_em?: string
          teve_resposta?: boolean
          time_service_segundos?: number | null
          time_wait_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_conversas_classificadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
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
      elora_custos_wts: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          faixa_max: number | null
          faixa_min: number
          id: string
          item_key: string
          preco_unit: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          item_key: string
          preco_unit?: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          item_key?: string
          preco_unit?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      elora_dashboard_widgets: {
        Row: {
          atualizado_em: string
          cliente_id: string
          configuracao: Json
          criado_em: string
          id: string
          ordem: number
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          configuracao?: Json
          criado_em?: string
          id?: string
          ordem?: number
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          configuracao?: Json
          criado_em?: string
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_dashboard_widgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_descontos: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          competencia_fim: string | null
          competencia_inicio: string
          criado_em: string
          escopo: string
          id: string
          motivo: string | null
          recorrente: boolean
          tipo: string
          user_id: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          competencia_fim?: string | null
          competencia_inicio: string
          criado_em?: string
          escopo: string
          id?: string
          motivo?: string | null
          recorrente?: boolean
          tipo: string
          user_id?: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          competencia_fim?: string | null
          competencia_inicio?: string
          criado_em?: string
          escopo?: string
          id?: string
          motivo?: string | null
          recorrente?: boolean
          tipo?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_descontos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_fechamento_itens: {
        Row: {
          ciclo_fim: string | null
          ciclo_inicio: string | null
          cliente_id: string
          criado_em: string
          fechamento_id: string
          id: string
          lancamento_financeiro_id: string | null
          payload_snapshot: Json | null
          plano_id: string | null
          valor_bruto: number
          valor_desconto: number
          valor_liquido: number
          vencimento: string | null
        }
        Insert: {
          ciclo_fim?: string | null
          ciclo_inicio?: string | null
          cliente_id: string
          criado_em?: string
          fechamento_id: string
          id?: string
          lancamento_financeiro_id?: string | null
          payload_snapshot?: Json | null
          plano_id?: string | null
          valor_bruto?: number
          valor_desconto?: number
          valor_liquido?: number
          vencimento?: string | null
        }
        Update: {
          ciclo_fim?: string | null
          ciclo_inicio?: string | null
          cliente_id?: string
          criado_em?: string
          fechamento_id?: string
          id?: string
          lancamento_financeiro_id?: string | null
          payload_snapshot?: Json | null
          plano_id?: string | null
          valor_bruto?: number
          valor_desconto?: number
          valor_liquido?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_fechamento_itens_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "elora_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_fechamentos: {
        Row: {
          atualizado_em: string
          competencia: string
          criado_em: string
          criado_por: string | null
          deletado_em: string | null
          descricao: string | null
          enviado_parceiro_em: string | null
          enviado_parceiro_por: string | null
          id: string
          observacao: string | null
          status: string
          titulo: string
          total_bruto: number
          total_desconto: number
          total_liquido: number
        }
        Insert: {
          atualizado_em?: string
          competencia: string
          criado_em?: string
          criado_por?: string | null
          deletado_em?: string | null
          descricao?: string | null
          enviado_parceiro_em?: string | null
          enviado_parceiro_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          titulo: string
          total_bruto?: number
          total_desconto?: number
          total_liquido?: number
        }
        Update: {
          atualizado_em?: string
          competencia?: string
          criado_em?: string
          criado_por?: string | null
          deletado_em?: string | null
          descricao?: string | null
          enviado_parceiro_em?: string | null
          enviado_parceiro_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          titulo?: string
          total_bruto?: number
          total_desconto?: number
          total_liquido?: number
        }
        Relationships: []
      }
      elora_financeiro: {
        Row: {
          categoria: string | null
          competencia: string | null
          created_at: string
          descricao: string
          id: string
          nf_emitida: boolean
          nf_numero: string | null
          observacao: string | null
          status: string
          tipo: string
          user_id: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          descricao: string
          id: string
          nf_emitida?: boolean
          nf_numero?: string | null
          observacao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string
          id?: string
          nf_emitida?: boolean
          nf_numero?: string | null
          observacao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      elora_integracao_contas: {
        Row: {
          api_key: string
          ativo: boolean
          base_url: string
          bloco2_rotulo_id: string | null
          bloco3_rotulo_id: string | null
          campo_data_consulta_key: string | null
          campo_procedimento_key: string | null
          classificacao_consulta_agendada: string | null
          classificacao_procedimento_vendido: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          filtro_campanha: string | null
          filtro_campo_personalizado: Json | null
          filtro_etapas_funil: Json | null
          filtro_etiquetas: Json | null
          filtro_usuarios: Json | null
          grafico1_serie1_rotulo_id: string | null
          grafico1_serie2_rotulo_id: string | null
          grafico2_serie1_rotulo_id: string | null
          grafico2_serie2_rotulo_id: string | null
          id: string
          sync_conversas_ultima: string | null
          sync_janela_inicio: string | null
          sync_paginas_ok: number
          ultima_sync: string | null
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          ativo?: boolean
          base_url: string
          bloco2_rotulo_id?: string | null
          bloco3_rotulo_id?: string | null
          campo_data_consulta_key?: string | null
          campo_procedimento_key?: string | null
          classificacao_consulta_agendada?: string | null
          classificacao_procedimento_vendido?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          filtro_campanha?: string | null
          filtro_campo_personalizado?: Json | null
          filtro_etapas_funil?: Json | null
          filtro_etiquetas?: Json | null
          filtro_usuarios?: Json | null
          grafico1_serie1_rotulo_id?: string | null
          grafico1_serie2_rotulo_id?: string | null
          grafico2_serie1_rotulo_id?: string | null
          grafico2_serie2_rotulo_id?: string | null
          id?: string
          sync_conversas_ultima?: string | null
          sync_janela_inicio?: string | null
          sync_paginas_ok?: number
          ultima_sync?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          ativo?: boolean
          base_url?: string
          bloco2_rotulo_id?: string | null
          bloco3_rotulo_id?: string | null
          campo_data_consulta_key?: string | null
          campo_procedimento_key?: string | null
          classificacao_consulta_agendada?: string | null
          classificacao_procedimento_vendido?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          filtro_campanha?: string | null
          filtro_campo_personalizado?: Json | null
          filtro_etapas_funil?: Json | null
          filtro_etiquetas?: Json | null
          filtro_usuarios?: Json | null
          grafico1_serie1_rotulo_id?: string | null
          grafico1_serie2_rotulo_id?: string | null
          grafico2_serie1_rotulo_id?: string | null
          grafico2_serie2_rotulo_id?: string | null
          id?: string
          sync_conversas_ultima?: string | null
          sync_janela_inicio?: string | null
          sync_paginas_ok?: number
          ultima_sync?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_integracao_contas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_int_bloco2_rotulo"
            columns: ["cliente_id", "bloco2_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
          {
            foreignKeyName: "fk_int_bloco3_rotulo"
            columns: ["cliente_id", "bloco3_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
          {
            foreignKeyName: "fk_int_g1s1_rotulo"
            columns: ["cliente_id", "grafico1_serie1_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
          {
            foreignKeyName: "fk_int_g1s2_rotulo"
            columns: ["cliente_id", "grafico1_serie2_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
          {
            foreignKeyName: "fk_int_g2s1_rotulo"
            columns: ["cliente_id", "grafico2_serie1_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
          {
            foreignKeyName: "fk_int_g2s2_rotulo"
            columns: ["cliente_id", "grafico2_serie2_rotulo_id"]
            isOneToOne: false
            referencedRelation: "elora_classificacoes_rotulos"
            referencedColumns: ["cliente_id", "id"]
          },
        ]
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
          canais_zapi: number | null
          cliente_id: string
          cobranca_troca: string | null
          contatos_ativos: number | null
          created_at: string
          data: string
          extras: Json | null
          id: string
          mau: number | null
          observacao: string | null
          parceiro_anterior_id: string | null
          parceiro_novo_id: string | null
          plano_id: string | null
          tipo: string
          transcricao_ia: boolean | null
          user_id: string
          usuarios_ativos: number | null
          valor_acompanhamento: number | null
          valor_servico: number | null
          vigencia_plano: string | null
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
          cliente_id: string
          cobranca_troca?: string | null
          contatos_ativos?: number | null
          created_at?: string
          data: string
          extras?: Json | null
          id: string
          mau?: number | null
          observacao?: string | null
          parceiro_anterior_id?: string | null
          parceiro_novo_id?: string | null
          plano_id?: string | null
          tipo: string
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_acompanhamento?: number | null
          valor_servico?: number | null
          vigencia_plano?: string | null
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
          cliente_id?: string
          cobranca_troca?: string | null
          contatos_ativos?: number | null
          created_at?: string
          data?: string
          extras?: Json | null
          id?: string
          mau?: number | null
          observacao?: string | null
          parceiro_anterior_id?: string | null
          parceiro_novo_id?: string | null
          plano_id?: string | null
          tipo?: string
          transcricao_ia?: boolean | null
          user_id?: string
          usuarios_ativos?: number | null
          valor_acompanhamento?: number | null
          valor_servico?: number | null
          vigencia_plano?: string | null
          zapi?: boolean | null
        }
        Relationships: []
      }
      elora_notificacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          criado_por: string | null
          id: string
          link: string | null
          para_todos: boolean
          parceiro_id: string | null
          texto: string | null
          titulo: string
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          link?: string | null
          para_todos?: boolean
          parceiro_id?: string | null
          texto?: string | null
          titulo: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          link?: string | null
          para_todos?: boolean
          parceiro_id?: string | null
          texto?: string | null
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_notificacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elora_notificacoes_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "elora_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_notificacoes_lidas: {
        Row: {
          lida_em: string
          notificacao_id: string
          user_id: string
        }
        Insert: {
          lida_em?: string
          notificacao_id: string
          user_id: string
        }
        Update: {
          lida_em?: string
          notificacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_notificacoes_lidas_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "elora_notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_paineis_sincronizados: {
        Row: {
          campos_personalizados: Json
          cliente_id: string
          etapas: Json
          id: string
          painel_id: string
          sincronizado_em: string
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          campos_personalizados?: Json
          cliente_id: string
          etapas?: Json
          id?: string
          painel_id: string
          sincronizado_em?: string
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          campos_personalizados?: Json
          cliente_id?: string
          etapas?: Json
          id?: string
          painel_id?: string
          sincronizado_em?: string
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_paineis_sincronizados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_parceiro_usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          email: string
          id: string
          nome: string
          parceiro_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          email: string
          id?: string
          nome: string
          parceiro_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          email?: string
          id?: string
          nome?: string
          parceiro_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elora_parceiro_usuarios_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "elora_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_parceiros: {
        Row: {
          acesso_painel_clientes: boolean
          celular: string | null
          criado_em: string
          email: string | null
          id: string
          mostrar_valores_cliente: boolean
          nome: string
          observacao: string | null
          planos_vinculados: Json | null
          pode_ver_fechamentos: boolean
          site_url: string | null
          user_id: string
        }
        Insert: {
          acesso_painel_clientes?: boolean
          celular?: string | null
          criado_em?: string
          email?: string | null
          id: string
          mostrar_valores_cliente?: boolean
          nome: string
          observacao?: string | null
          planos_vinculados?: Json | null
          pode_ver_fechamentos?: boolean
          site_url?: string | null
          user_id?: string
        }
        Update: {
          acesso_painel_clientes?: boolean
          celular?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          mostrar_valores_cliente?: boolean
          nome?: string
          observacao?: string | null
          planos_vinculados?: Json | null
          pode_ver_fechamentos?: boolean
          site_url?: string | null
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
          categoria: string
          ciclo_dia_final: number
          ciclo_dia_inicial: number
          cobranca: string
          cobranca_proporcional: boolean
          contatos_inclusos: number | null
          created_at: string
          dia_vencimento: number | null
          duracao_unidade: string | null
          duracao_valor: number | null
          id: string
          inclui_asaas: boolean | null
          inclui_ia: boolean | null
          inclui_transcricao: boolean | null
          inclui_zapi: number | null
          licenca_base: number | null
          nome: string
          observacao: string | null
          parceiro_ids: Json | null
          permite_modulos_opcionais: boolean
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
          valor_acompanhamento: number
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
          categoria?: string
          ciclo_dia_final?: number
          ciclo_dia_inicial?: number
          cobranca?: string
          cobranca_proporcional?: boolean
          contatos_inclusos?: number | null
          created_at?: string
          dia_vencimento?: number | null
          duracao_unidade?: string | null
          duracao_valor?: number | null
          id: string
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          licenca_base?: number | null
          nome: string
          observacao?: string | null
          parceiro_ids?: Json | null
          permite_modulos_opcionais?: boolean
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
          valor_acompanhamento?: number
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
          categoria?: string
          ciclo_dia_final?: number
          ciclo_dia_inicial?: number
          cobranca?: string
          cobranca_proporcional?: boolean
          contatos_inclusos?: number | null
          created_at?: string
          dia_vencimento?: number | null
          duracao_unidade?: string | null
          duracao_valor?: number | null
          id?: string
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          licenca_base?: number | null
          nome?: string
          observacao?: string | null
          parceiro_ids?: Json | null
          permite_modulos_opcionais?: boolean
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
          valor_acompanhamento?: number
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
      elora_release_destinos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          release_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          release_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_release_destinos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elora_release_destinos_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "elora_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_releases: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string | null
          id: string
          para_todos: boolean
          publicado: boolean
          publicado_em: string | null
          resumo: string | null
          tag: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          para_todos?: boolean
          publicado?: boolean
          publicado_em?: string | null
          resumo?: string | null
          tag?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          para_todos?: boolean
          publicado?: boolean
          publicado_em?: string | null
          resumo?: string | null
          tag?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      elora_sequencias_sincronizadas: {
        Row: {
          cliente_id: string
          id: string
          nome: string | null
          sequencia_id: string
          sincronizado_em: string
        }
        Insert: {
          cliente_id: string
          id?: string
          nome?: string | null
          sequencia_id: string
          sincronizado_em?: string
        }
        Update: {
          cliente_id?: string
          id?: string
          nome?: string | null
          sequencia_id?: string
          sincronizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "elora_sequencias_sincronizadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      elora_uso_snapshots: {
        Row: {
          cliente_id: string
          created_at: string
          data: string
          id: string
          indicadores: Json
          uso: Json
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data: string
          id?: string
          indicadores?: Json
          uso?: Json
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data?: string
          id?: string
          indicadores?: Json
          uso?: Json
        }
        Relationships: [
          {
            foreignKeyName: "elora_uso_snapshots_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "elora_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          avatar_path: string | null
          created_at: string
          nome: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      elora_planos_parceiro: {
        Row: {
          canais_inclusos: number | null
          canais_insta_inclusos: number | null
          canais_messenger_inclusos: number | null
          canais_whats_inclusos: number | null
          categoria: string | null
          ciclo_dia_final: number | null
          ciclo_dia_inicial: number | null
          cobranca: string | null
          contatos_inclusos: number | null
          dia_vencimento: number | null
          id: string | null
          inclui_asaas: boolean | null
          inclui_ia: boolean | null
          inclui_transcricao: boolean | null
          inclui_zapi: number | null
          nome: string | null
          usuarios_inclusos: number | null
        }
        Insert: {
          canais_inclusos?: number | null
          canais_insta_inclusos?: number | null
          canais_messenger_inclusos?: number | null
          canais_whats_inclusos?: number | null
          categoria?: string | null
          ciclo_dia_final?: number | null
          ciclo_dia_inicial?: number | null
          cobranca?: string | null
          contatos_inclusos?: number | null
          dia_vencimento?: number | null
          id?: string | null
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          nome?: string | null
          usuarios_inclusos?: number | null
        }
        Update: {
          canais_inclusos?: number | null
          canais_insta_inclusos?: number | null
          canais_messenger_inclusos?: number | null
          canais_whats_inclusos?: number | null
          categoria?: string | null
          ciclo_dia_final?: number | null
          ciclo_dia_inicial?: number | null
          cobranca?: string | null
          contatos_inclusos?: number | null
          dia_vencimento?: number | null
          id?: string | null
          inclui_asaas?: boolean | null
          inclui_ia?: boolean | null
          inclui_transcricao?: boolean | null
          inclui_zapi?: number | null
          nome?: string | null
          usuarios_inclusos?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_admin_if_empty: { Args: never; Returns: undefined }
      cliente_do_usuario: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_equipe_interna: { Args: never; Returns: boolean }
      link_app_user: { Args: never; Returns: undefined }
      link_cliente_usuario: { Args: never; Returns: undefined }
      link_parceiro_usuario: { Args: never; Returns: undefined }
      painel_cliente_dados: { Args: { _cliente_id: string }; Returns: Json }
      parceiro_do_usuario: { Args: never; Returns: string }
      parceiro_pode_ver_painel: {
        Args: { _cliente_id: string }
        Returns: boolean
      }
      parceiro_ve_valores: { Args: never; Returns: boolean }
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
