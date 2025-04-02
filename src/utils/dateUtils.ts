import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Period, AvailableMonth } from '../types/finance';
import { formatDateForQuery } from './formatters';

/**
 * Retorna períodos padrão para o dashboard (hoje, semana, mês, ano, últimos 30 dias)
 */
export const getPeriods = (date: Date): Period[] => {
  return [
    {
      name: 'Hoje',
      start: formatDateForQuery(startOfDay(date)),
      end: formatDateForQuery(endOfDay(date))
    },
    {
      name: 'Esta Semana',
      start: formatDateForQuery(startOfWeek(date, { locale: ptBR, weekStartsOn: 0 })),
      end: formatDateForQuery(endOfWeek(date, { locale: ptBR, weekStartsOn: 0 }))
    },
    {
      name: 'Este Mês',
      start: formatDateForQuery(startOfMonth(date)),
      end: formatDateForQuery(endOfMonth(date))
    },
    {
      name: 'Este Ano',
      start: formatDateForQuery(startOfYear(date)),
      end: formatDateForQuery(endOfYear(date))
    },
    {
      name: 'Últimos 30 dias',
      start: formatDateForQuery(startOfDay(subDays(date, 30))),
      end: formatDateForQuery(endOfDay(date))
    }
  ];
};

/**
 * Retorna períodos para meses anteriores
 */
export const getPreviousMonths = (date: Date, count: number): Period[] => {
  const months = [];
  
  for (let i = 1; i <= count; i++) {
    const monthDate = subMonths(date, i);
    months.push({
      name: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
      start: formatDateForQuery(startOfMonth(monthDate)),
      end: formatDateForQuery(endOfMonth(monthDate))
    });
  }
  
  return months;
};

/**
 * Gera a lista de meses disponíveis para seleção (mês atual + 24 meses anteriores)
 */
export const generateAvailableMonths = (): AvailableMonth[] => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  
  const months = [];
  
  // Mês atual
  months.push({
    value: now,
    label: format(now, 'MMMM yyyy', { locale: ptBR })
  });
  
  // 24 meses anteriores
  for (let i = 1; i <= 24; i++) {
    const monthDate = subMonths(now, i);
    monthDate.setHours(12, 0, 0, 0);
    
    months.push({
      value: monthDate,
      label: format(monthDate, 'MMMM yyyy', { locale: ptBR })
    });
  }
  
  return months;
}; 