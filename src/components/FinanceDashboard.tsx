import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinanceSummary {
  period: string;
  total: number;
  count: number;
}

interface FinanceDashboardProps {
  onClose: () => void;
}

export function FinanceDashboard({ onClose }: FinanceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<FinanceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      
      // Definir os períodos de tempo
      const periods = [
        {
          name: 'Hoje',
          start: startOfDay(now).toISOString(),
          end: endOfDay(now).toISOString()
        },
        {
          name: 'Esta Semana',
          start: startOfWeek(now, { locale: ptBR, weekStartsOn: 0 }).toISOString(),
          end: endOfWeek(now, { locale: ptBR, weekStartsOn: 0 }).toISOString()
        },
        {
          name: 'Este Mês',
          start: startOfMonth(now).toISOString(),
          end: endOfMonth(now).toISOString()
        },
        {
          name: 'Este Ano',
          start: startOfYear(now).toISOString(),
          end: endOfYear(now).toISOString()
        },
        {
          name: 'Últimos 30 dias',
          start: startOfDay(subDays(now, 30)).toISOString(),
          end: endOfDay(now).toISOString()
        }
      ];
      
      // Buscar dados para cada período
      const summaryData = await Promise.all(
        periods.map(async (period) => {
          const { data, error } = await supabase
            .from('services')
            .select('service_value')
            .gte('service_date', period.start.split('T')[0])
            .lte('service_date', period.end.split('T')[0]);
            
          if (error) throw new Error(`Erro ao buscar dados para ${period.name}: ${error.message}`);
          
          const total = data?.reduce((sum, service) => sum + (parseFloat(service.service_value) || 0), 0) || 0;
          
          return {
            period: period.name,
            total,
            count: data?.length || 0
          };
        })
      );
      
      setSummaries(summaryData);
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError('Não foi possível carregar os dados financeiros. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatar valor como moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {summaries.slice(0, 3).map((summary) => (
                <div key={summary.period} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{summary.period}</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.total)}</p>
                  <p className="text-sm text-gray-500 mt-2">{summary.count} serviço(s)</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Resumo de Faturamento</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Serviços</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média por Serviço</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaries.map((summary) => (
                      <tr key={summary.period}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {summary.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(summary.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {summary.count > 0 
                            ? formatCurrency(summary.total / summary.count)
                            : formatCurrency(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <h3 className="text-md font-semibold text-blue-800 mb-2">Dicas para aumentar seu faturamento:</h3>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Ofereça pacotes de serviços com desconto para fidelizar clientes</li>
                <li>Implemente um programa de indicação com descontos para quem trouxer novos clientes</li>
                <li>Crie promoções sazonais para períodos de menor movimento</li>
                <li>Mantenha contato com clientes antigos oferecendo revisões</li>
              </ul>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
} 