import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { X, TrendingUp, TrendingDown, DollarSign, Calendar, Users, CreditCard } from 'lucide-react';

interface FinanceSummary {
  period: string;
  total: number;
  count: number;
}

interface FinanceDashboardProps {
  onClose: () => void;
  isOpen: boolean;
}

interface SelectedMonthData {
  services: any[];
  totalValue: number;
  averageValue: number;
}

/**
 * Dashboard financeiro que exibe resumo de faturamento por períodos.
 */
export function FinanceDashboard({ onClose, isOpen }: FinanceDashboardProps) {
  const { user } = useAuth();
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
    if (isOpen && user) {
      fetchFinancialData();
      generateAvailableMonths();
    }
  }, [isOpen, user]);
  
  // Buscar dados do mês selecionado quando ele mudar
  useEffect(() => {
    if (selectedMonth && user) {
      fetchSelectedMonthData(selectedMonth);
    }
  }, [selectedMonth, user]);
  
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
    if (!user) return [];
    
    return Promise.all(
      periods.map(async (period) => {
        const { data, error } = await supabase
          .from('services')
          .select('service_value')
          .eq('tenant_id', user.id)
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
    if (!user) return;
    
    setIsLoading(true);
    try {
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);
      
      const start = formatDateForQuery(startDate);
      const end = formatDateForQuery(endDate);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', user.id)
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
      return 'Data inválida';
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-800 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-lg">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <DollarSign className="h-6 w-6 mr-2" />
            Dashboard Financeiro
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none transition-colors"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 bg-gray-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md shadow">
              <div className="flex">
                <div className="py-1"><svg className="h-6 w-6 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <div>
                  <p className="font-bold">Erro ao carregar dados</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Resumo dos períodos atuais */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Resumo por período
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {summaries.map((summary, index) => {
                    // Definir cores diferentes para cada card
                    const colors = [
                      'from-blue-500 to-blue-600',
                      'from-emerald-500 to-teal-600',
                      'from-violet-500 to-purple-600',
                      'from-amber-500 to-orange-600',
                      'from-pink-500 to-rose-600'
                    ];
                    
                    return (
                      <div 
                        key={index} 
                        className={`bg-gradient-to-br ${colors[index % colors.length]} p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 transition-transform duration-300`}
                      >
                        <h4 className="text-sm font-medium text-white opacity-90">{summary.period}</h4>
                        <p className="text-2xl font-bold text-white mt-2">{formatCurrency(summary.total)}</p>
                        <div className="flex justify-between items-center mt-3">
                          <p className="text-sm text-white opacity-90">{summary.count} serviços</p>
                          {summary.count > 0 && (
                            <span className="inline-flex items-center justify-center bg-white bg-opacity-25 rounded-full h-8 w-8">
                              <DollarSign className="h-4 w-4 text-white" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Faturamento mensal histórico */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Faturamento mensal histórico
                </h3>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Mês</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Faturamento</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Serviços</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ticket Médio</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Crescimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlySummaries.map((summary, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{summary.period}</td>
                          <td className="py-3 px-4 text-sm text-gray-700 font-medium">{formatCurrency(summary.total)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{summary.count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {summary.count > 0 ? formatCurrency(summary.total / summary.count) : formatCurrency(0)}
                          </td>
                          <td className="py-3 px-4">
                            {index < monthlySummaries.length - 1 && (
                              <div className={`flex items-center ${calculateGrowth(index) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {calculateGrowth(index) >= 0 ? (
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                <span className="text-sm font-medium">
                                  {calculateGrowth(index) >= 0 ? '+' : ''}{calculateGrowth(index).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Detalhes do mês selecionado */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                    Detalhes por mês
                  </h3>
                  <select 
                    className="mt-2 sm:mt-0 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                    value={availableMonths.findIndex(month => 
                      month.value.getMonth() === selectedMonth.getMonth() && 
                      month.value.getFullYear() === selectedMonth.getFullYear()
                    )}
                    onChange={(e) => {
                      const index = parseInt(e.target.value);
                      if (index >= 0 && index < availableMonths.length) {
                        setSelectedMonth(availableMonths[index].value);
                      }
                    }}
                  >
                    {availableMonths.map((month, index) => (
                      <option key={index} value={index}>{month.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg shadow-md">
                    <h4 className="text-sm font-medium text-white opacity-90">Faturamento total</h4>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(selectedMonthData.totalValue)}</p>
                    <div className="mt-2 flex justify-end">
                      <span className="inline-flex items-center justify-center bg-white bg-opacity-25 rounded-full h-8 w-8">
                        <DollarSign className="h-4 w-4 text-white" />
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-lg shadow-md">
                    <h4 className="text-sm font-medium text-white opacity-90">Total de serviços</h4>
                    <p className="text-2xl font-bold text-white mt-1">{selectedMonthData.services.length}</p>
                    <div className="mt-2 flex justify-end">
                      <span className="inline-flex items-center justify-center bg-white bg-opacity-25 rounded-full h-8 w-8">
                        <Users className="h-4 w-4 text-white" />
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-lg shadow-md">
                    <h4 className="text-sm font-medium text-white opacity-90">Ticket médio</h4>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(selectedMonthData.averageValue)}</p>
                    <div className="mt-2 flex justify-end">
                      <span className="inline-flex items-center justify-center bg-white bg-opacity-25 rounded-full h-8 w-8">
                        <CreditCard className="h-4 w-4 text-white" />
                      </span>
                    </div>
                  </div>
                </div>
                
                {selectedMonthData.services.length > 0 ? (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Data</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Veículo</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Serviços</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedMonthData.services.map((service, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-600">{formatLocalDate(service.service_date)}</td>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{service.client_name}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{service.car_model} - {service.car_plate}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {Array.isArray(service.repaired_parts) && service.repaired_parts.length > 0
                                  ? service.repaired_parts.join(', ')
                                  : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatCurrency(service.service_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md shadow-sm">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">Nenhum serviço registrado para o mês selecionado.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 