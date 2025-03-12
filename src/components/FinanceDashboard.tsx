import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinanceSummary {
  period: string;
  total: number;
  count: number;
}

interface FinanceDashboardProps {
  onClose: () => void;
}

interface SelectedMonthData {
  services: any[];
  totalValue: number;
  averageValue: number;
}

/**
 * Dashboard financeiro que exibe resumo de faturamento por períodos.
 */
export function FinanceDashboard({ onClose }: FinanceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<FinanceSummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<FinanceSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<SelectedMonthData>({ 
    services: [], 
    totalValue: 0, 
    averageValue: 0 
  });
  const [availableMonths, setAvailableMonths] = useState<{value: Date, label: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Inicializar dados ao carregar o componente
  useEffect(() => {
    fetchFinancialData();
    generateAvailableMonths();
  }, []);
  
  // Buscar dados do mês selecionado quando ele mudar
  useEffect(() => {
    if (selectedMonth) {
      fetchSelectedMonthData(selectedMonth);
    }
  }, [selectedMonth]);
  
  /**
   * Gera a lista de meses disponíveis para seleção (mês atual + 24 meses anteriores)
   */
  const generateAvailableMonths = () => {
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
    
    setAvailableMonths(months);
  };

  /**
   * Formata uma data para o formato padrão yyyy-MM-dd para consultas no banco
   */
  const formatDateForQuery = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  /**
   * Busca todos os dados financeiros para preencher o dashboard
   */
  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      
      // Definir os períodos de tempo para os dados atuais 
      const periods = [
        {
          name: 'Hoje',
          start: formatDateForQuery(startOfDay(now)),
          end: formatDateForQuery(endOfDay(now))
        },
        {
          name: 'Esta Semana',
          start: formatDateForQuery(startOfWeek(now, { locale: ptBR, weekStartsOn: 0 })),
          end: formatDateForQuery(endOfWeek(now, { locale: ptBR, weekStartsOn: 0 }))
        },
        {
          name: 'Este Mês',
          start: formatDateForQuery(startOfMonth(now)),
          end: formatDateForQuery(endOfMonth(now))
        },
        {
          name: 'Este Ano',
          start: formatDateForQuery(startOfYear(now)),
          end: formatDateForQuery(endOfYear(now))
        },
        {
          name: 'Últimos 30 dias',
          start: formatDateForQuery(startOfDay(subDays(now, 30))),
          end: formatDateForQuery(endOfDay(now))
        }
      ];
      
      // Definir períodos para os últimos meses
      const previousMonths = [];
      for (let i = 1; i <= 6; i++) {
        const monthDate = subMonths(now, i);
        previousMonths.push({
          name: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
          start: formatDateForQuery(startOfMonth(monthDate)),
          end: formatDateForQuery(endOfMonth(monthDate))
        });
      }
      
      // Buscar dados para os períodos atuais
      const summaryData = await fetchSummaryForPeriods(periods);
      
      // Buscar dados para os meses anteriores
      const monthlyData = await fetchSummaryForPeriods(previousMonths);
      
      setSummaries(summaryData);
      setMonthlySummaries(monthlyData);
      
      // Fetch data for currently selected month
      fetchSelectedMonthData(selectedMonth);
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError('Não foi possível carregar os dados financeiros. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Busca resumo financeiro para um array de períodos
   */
  const fetchSummaryForPeriods = async (periods: { name: string, start: string, end: string }[]) => {
    return Promise.all(
      periods.map(async (period) => {
        const { data, error } = await supabase
          .from('services')
          .select('service_value')
          .gte('service_date', period.start)
          .lte('service_date', period.end);
          
        if (error) throw new Error(`Erro ao buscar dados para ${period.name}: ${error.message}`);
        
        const total = data?.reduce((sum, service) => sum + (parseFloat(service.service_value) || 0), 0) || 0;
        
        return {
          period: period.name,
          total,
          count: data?.length || 0
        };
      })
    );
  };
  
  /**
   * Busca dados detalhados para o mês selecionado
   */
  const fetchSelectedMonthData = async (date: Date) => {
    setIsLoading(true);
    try {
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);
      
      const start = formatDateForQuery(startDate);
      const end = formatDateForQuery(endDate);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .gte('service_date', start)
        .lte('service_date', end)
        .order('service_date', { ascending: false });
        
      if (error) throw error;
      
      // Calcular valores totais
      const totalValue = data?.reduce((sum, service) => sum + (parseFloat(service.service_value) || 0), 0) || 0;
      const averageValue = data?.length ? totalValue / data.length : 0;
      
      setSelectedMonthData({
        services: data || [],
        totalValue,
        averageValue
      });
    } catch (err) {
      console.error('Erro ao buscar dados do mês selecionado:', err);
      setError('Não foi possível carregar os dados do mês selecionado.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Calcula o crescimento percentual em relação ao mês anterior
   */
  const calculateGrowth = (index: number) => {
    if (index >= monthlySummaries.length - 1) return 0;
    
    const currentTotal = monthlySummaries[index].total;
    const previousTotal = monthlySummaries[index + 1].total;
    
    if (previousTotal === 0) return 100; // Se o mês anterior foi zero, crescimento é de 100%
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  };

  /**
   * Formata a data para exibição no formato local (dd/MM/yyyy)
   */
  const formatLocalDate = (dateString: string) => {
    try {
      const datePart = dateString.split('T')[0];
      const date = new Date(`${datePart}T12:00:00Z`);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fechar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Erro!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : (
          <>
            {/* Resumo Financeiro */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Resumo Financeiro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaries.map((summary) => (
                  <div key={summary.period} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">{summary.period}</h3>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(summary.total)}</p>
                    <p className="text-sm text-gray-500 mt-2">{summary.count} serviço(s)</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Análise Mensal */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Análise Mensal</h3>
              <div className="bg-white border rounded-lg p-4 sm:p-6 shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <div className="mb-2 sm:mb-0">
                    <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Selecione o mês:
                    </label>
                    <select
                      id="month-select"
                      value={selectedMonth.toISOString()}
                      onChange={(e) => {
                        const dateString = e.target.value;
                        const newDate = new Date(dateString);
                        newDate.setHours(12, 0, 0, 0);
                        setSelectedMonth(newDate);
                      }}
                      className="select-enhanced"
                    >
                      {availableMonths.map((month) => (
                        <option key={month.value.toISOString()} value={month.value.toISOString()}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-700 mb-1">Total Faturado</h4>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(selectedMonthData.totalValue)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-700 mb-1">Serviços Realizados</h4>
                    <p className="text-2xl font-bold text-green-800">{selectedMonthData.services.length}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-700 mb-1">Valor Médio</h4>
                    <p className="text-2xl font-bold text-purple-800">{formatCurrency(selectedMonthData.averageValue)}</p>
                  </div>
                </div>
                
                {selectedMonthData.services.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Serviços do Período</h4>
                    
                    {/* Tabela para desktop */}
                    <div className="hidden sm:block">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículo</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedMonthData.services.map((service) => (
                            <tr key={service.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatLocalDate(service.service_date)}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {service.client_name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {service.car_model} - {service.car_plate}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(service.service_value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Cards para mobile */}
                    <div className="sm:hidden space-y-3">
                      {selectedMonthData.services.map((service) => (
                        <div key={service.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <div className="font-medium">{service.client_name}</div>
                            <div className="font-semibold text-blue-600">{formatCurrency(service.service_value)}</div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatLocalDate(service.service_date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {service.car_model} - {service.car_plate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-gray-50 rounded text-center text-gray-500">
                    Nenhum serviço registrado neste mês
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Meses Anteriores */}
            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Histórico Mensal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlySummaries.slice(0, 6).map((summary, index) => {
                  const growth = calculateGrowth(index);
                  const isPositive = growth >= 0;
                  
                  return (
                    <div key={summary.period} className="bg-white border rounded-lg p-4 shadow">
                      <h4 className="text-md font-semibold text-gray-700 capitalize">{summary.period}</h4>
                      <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(summary.total)}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">{summary.count} serviço(s)</span>
                        {index < monthlySummaries.length - 1 && (
                          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{growth.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela Completa - Apenas para desktop */}
            <div className="hidden md:block mb-8">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Resumo de Faturamento</h3>
              <div className="bg-white border rounded-lg shadow overflow-hidden">
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
                    {/* Períodos Atuais */}
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
                    
                    {/* Separador */}
                    <tr>
                      <td colSpan={4} className="px-6 py-2 bg-gray-100">
                        <div className="text-xs font-medium text-gray-500 uppercase">Meses Anteriores</div>
                      </td>
                    </tr>
                    
                    {/* Meses Anteriores */}
                    {monthlySummaries.map((summary) => (
                      <tr key={summary.period}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 w-full sm:w-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
} 