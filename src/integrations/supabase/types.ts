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
      access_profile_tables: {
        Row: {
          access_level: string
          created_at: string
          id: string
          profile_id: string
          table_name: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          profile_id: string
          table_name: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          profile_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profile_tables_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_profiles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      balanco: {
        Row: {
          ativo_circulante: number | null
          ativo_nao_circulante: number | null
          created_at: string
          empresa: string
          id: string
          passivo_circulante: number | null
          passivo_nao_circulante: number | null
          patrimonio_liquido: number | null
          safra: string | null
          user_id: string
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          ativo_circulante?: number | null
          ativo_nao_circulante?: number | null
          created_at?: string
          empresa: string
          id?: string
          passivo_circulante?: number | null
          passivo_nao_circulante?: number | null
          patrimonio_liquido?: number | null
          safra?: string | null
          user_id: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          ativo_circulante?: number | null
          ativo_nao_circulante?: number | null
          created_at?: string
          empresa?: string
          id?: string
          passivo_circulante?: number | null
          passivo_nao_circulante?: number | null
          patrimonio_liquido?: number | null
          safra?: string | null
          user_id?: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          owner_id: string
          permission: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          owner_id: string
          permission?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          permission?: string
          status?: string
        }
        Relationships: []
      }
      data_sharing: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          permission: string
          shared_with_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          permission?: string
          shared_with_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          permission?: string
          shared_with_id?: string
        }
        Relationships: []
      }
      dre: {
        Row: {
          created_at: string
          custos: number | null
          despesa: number | null
          ebitda: number | null
          empresa: string
          faturamento: number | null
          id: string
          impostos: number | null
          lucro_liquido: number | null
          safra: string | null
          user_id: string
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          created_at?: string
          custos?: number | null
          despesa?: number | null
          ebitda?: number | null
          empresa: string
          faturamento?: number | null
          id?: string
          impostos?: number | null
          lucro_liquido?: number | null
          safra?: string | null
          user_id: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          created_at?: string
          custos?: number | null
          despesa?: number | null
          ebitda?: number | null
          empresa?: string
          faturamento?: number | null
          id?: string
          impostos?: number | null
          lucro_liquido?: number | null
          safra?: string | null
          user_id?: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      fluxo_de_caixa: {
        Row: {
          created_at: string
          data: string | null
          empresa: string
          id: string
          saldo_conta_corrente: number | null
          total_entradas: number | null
          total_saidas: number | null
          user_id: string
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          created_at?: string
          data?: string | null
          empresa: string
          id?: string
          saldo_conta_corrente?: number | null
          total_entradas?: number | null
          total_saidas?: number | null
          user_id: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          created_at?: string
          data?: string | null
          empresa?: string
          id?: string
          saldo_conta_corrente?: number | null
          total_entradas?: number | null
          total_saidas?: number | null
          user_id?: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      folha_de_pagamento: {
        Row: {
          created_at: string
          empresa: string
          id: string
          nome_funcionario: string | null
          safra: string | null
          tipo_recebimento: string | null
          user_id: string
          valor: number | null
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          created_at?: string
          empresa: string
          id?: string
          nome_funcionario?: string | null
          safra?: string | null
          tipo_recebimento?: string | null
          user_id: string
          valor?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          created_at?: string
          empresa?: string
          id?: string
          nome_funcionario?: string | null
          safra?: string | null
          tipo_recebimento?: string | null
          user_id?: string
          valor?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          created_at: string
          data_fim_contrato: string | null
          data_inicio_contrato: string | null
          empresa: string
          id: string
          nome_fornecedor: string | null
          safra: string | null
          user_id: string
          valor_contrato: number | null
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          created_at?: string
          data_fim_contrato?: string | null
          data_inicio_contrato?: string | null
          empresa: string
          id?: string
          nome_fornecedor?: string | null
          safra?: string | null
          user_id: string
          valor_contrato?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          created_at?: string
          data_fim_contrato?: string | null
          data_inicio_contrato?: string | null
          empresa?: string
          id?: string
          nome_fornecedor?: string | null
          safra?: string | null
          user_id?: string
          valor_contrato?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      investimentos: {
        Row: {
          ativo: string | null
          aux1: string | null
          banco: string | null
          carencia: string | null
          created_at: string
          data: string | null
          empresa: string
          id: string
          id_lancamento: string | null
          imposto_renda: number | null
          receita_bruta_dia: number | null
          remuneracao_dia_cdi: number | null
          tipo_lancamento: string | null
          user_id: string
          valor_bruto: number | null
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          ativo?: string | null
          aux1?: string | null
          banco?: string | null
          carencia?: string | null
          created_at?: string
          data?: string | null
          empresa: string
          id?: string
          id_lancamento?: string | null
          imposto_renda?: number | null
          receita_bruta_dia?: number | null
          remuneracao_dia_cdi?: number | null
          tipo_lancamento?: string | null
          user_id: string
          valor_bruto?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          ativo?: string | null
          aux1?: string | null
          banco?: string | null
          carencia?: string | null
          created_at?: string
          data?: string | null
          empresa?: string
          id?: string
          id_lancamento?: string | null
          imposto_renda?: number | null
          receita_bruta_dia?: number | null
          remuneracao_dia_cdi?: number | null
          tipo_lancamento?: string | null
          user_id?: string
          valor_bruto?: number | null
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          created_at: string
          empresa: string
          id: string
          nome_projeto: string | null
          safra: string | null
          status: string | null
          user_id: string
          visao: Database["public"]["Enums"]["visao_tipo"]
        }
        Insert: {
          created_at?: string
          empresa: string
          id?: string
          nome_projeto?: string | null
          safra?: string | null
          status?: string | null
          user_id: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Update: {
          created_at?: string
          empresa?: string
          id?: string
          nome_projeto?: string | null
          safra?: string | null
          status?: string | null
          user_id?: string
          visao?: Database["public"]["Enums"]["visao_tipo"]
        }
        Relationships: []
      }
      user_access_profiles: {
        Row: {
          assigned_by: string
          created_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_email: { Args: never; Returns: string }
      has_data_access: { Args: { data_owner_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_upload_access: { Args: { data_owner_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      visao_tipo: "real" | "orçado" | "forecast"
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
      app_role: ["admin", "user"],
      visao_tipo: ["real", "orçado", "forecast"],
    },
  },
} as const
