import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Formata uma data no formato local brasileiro (dd/MM/yyyy)
 */
export const formatLocalDate = (dateString: string): string => {
  try {
    const date = new Date(`${dateString.split('T')[0]}T12:00:00Z`);
    return format(date, 'dd/MM/yyyy', { locale: pt });
  } catch (e) {
    console.error('Erro ao formatar data:', e);
    return 'Data inválida';
  }
};

/**
 * Formata uma lista de peças reparadas para exibição
 */
export const formatRepairedParts = (parts: any): string => {
  if (!parts) return '-';
  
  let partsArray: string[] = [];
  
  if (Array.isArray(parts)) {
    partsArray = parts;
  } else if (typeof parts === 'string') {
    partsArray = [parts];
  } else if (typeof parts === 'object') {
    try {
      const values = Object.values(parts).filter(Boolean);
      partsArray = values.map(val => String(val));
    } catch (e) {
      return '-';
    }
  } else {
    return '-';
  }
  
  const formattedParts = partsArray
    .filter(part => part !== null && part !== undefined)
    .map(part => {
      const partStr = String(part).trim();
      if (!partStr) return '';
      return partStr.charAt(0).toUpperCase() + partStr.slice(1).toLowerCase();
    })
    .filter(part => part !== '');
  
  return formattedParts.length > 0 ? formattedParts.join(', ') : '-';
};

/**
 * Formata um valor para moeda brasileira (R$)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Gera um código de autenticação aleatório para serviços
 */
export const generateAuthCode = (): string => {
  return `AC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}; 