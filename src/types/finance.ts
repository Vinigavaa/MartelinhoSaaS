/**
 * Resumo financeiro para um período específico
 */
export interface FinanceSummary {
  period: string;
  total: number;
  count: number;
}

/**
 * Props para o componente FinanceDashboard
 */
export interface FinanceDashboardProps {
  onClose: () => void;
  isOpen: boolean;
}

/**
 * Dados para o mês selecionado
 */
export interface SelectedMonthData {
  services: ServiceData[];
  totalValue: number;
  averageValue: number;
}

/**
 * Mês disponível para seleção
 */
export interface AvailableMonth {
  value: Date;
  label: string;
}

/**
 * Período para consultas
 */
export interface Period {
  name: string;
  start: string;
  end: string;
}

/**
 * Dados de um serviço
 */
export interface ServiceData {
  service_date: string;
  client_name: string;
  car_model: string;
  car_plate: string;
  repaired_parts: string[];
  service_value: number;
  [key: string]: any;
} 