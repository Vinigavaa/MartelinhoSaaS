import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata valor como moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata uma data para o formato padrão yyyy-MM-dd para consultas no banco
 */
export const formatDateForQuery = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Formata a data para exibição no formato local (dd/MM/yyyy)
 */
export const formatLocalDate = (dateString: string): string => {
  try {
    const datePart = dateString.split('T')[0];
    const date = new Date(`${datePart}T12:00:00Z`);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (e) {
    return 'Data inválida';
  }
}; 