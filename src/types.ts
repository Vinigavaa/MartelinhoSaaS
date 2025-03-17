/**
 * Interface principal para o serviço de martelinho de ouro
 */
export interface Service {
  id: string;
  client_name: string;
  service_date: string;
  car_plate: string;
  car_model: string;
  service_value: number;
  repaired_parts: string[];
  created_at: string;
  updated_at: string;
  auth_code?: string;
  observacoes?: string;
  tenant_id?: string; // ID do usuário proprietário do serviço
}

/**
 * Lista de peças que podem ser reparadas
 */
export const REPAIRED_PARTS = [
  'capo',
  'teto',
  'tampa traseira',
  'paralama dianteiro esquerdo',
  'paralama dianteiro direito',
  'porta dianteira esquerda',
  'porta dianteira direita',
  'porta traseira esquerda',
  'porta traseira direita',
  'lateral traseira esquerda',
  'lateral traseira direita',
  'parachoque dianteiro',
  'parachoque traseiro',
  'coluna lado esquerdo',
  'coluna lado direito',
  'polimento',
  'pintura',
  'outros'
] as const;

/**
 * Tipo para as peças reparadas, baseado na lista REPAIRED_PARTS
 */
export type RepairedPart = typeof REPAIRED_PARTS[number];

/**
 * Namespace para tipos relacionados à Nota Fiscal
 */
export namespace Invoice {
  /**
   * Dados do cliente para a nota fiscal
   */
  export interface Cliente {
    nome: string;
    telefone?: string;
  }
  
  /**
   * Dados do veículo para a nota fiscal
   */
  export interface Veiculo {
    modelo: string;
    placa: string;
  }
  
  /**
   * Dados de um serviço individual para a nota fiscal
   */
  export interface Servico {
    pecaReparada: string;
    valor: number;
  }
  
  /**
   * Estrutura completa da nota fiscal
   */
  export interface NotaFiscal {
    cliente: Cliente;
    veiculo: Veiculo;
    servicos: Servico[];
    data: string;
    valorTotal: number;
    codigoAutenticacao: string;
    numeroPedido?: string;
    observacoes?: string;
  }
}

// Tipos para compatibilidade com código existente
export type ClienteNF = Invoice.Cliente;
export type VeiculoNF = Invoice.Veiculo;
export type ServicoNF = Invoice.Servico;
export type NotaFiscal = Invoice.NotaFiscal;

/**
 * Interface para o perfil do usuário
 */
export interface UserProfile {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}