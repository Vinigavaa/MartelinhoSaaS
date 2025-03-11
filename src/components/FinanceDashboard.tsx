import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, getYear, getMonth } from 'date-fns';
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
  const [monthlySummaries, setMonthlySummaries] = useState<FinanceSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<{
    services: any[];
    totalValue: number;
    averageValue: number;
  }>({ services: [], totalValue: 0, averageValue: 0 });
  const [availableMonths, setAvailableMonths] = useState<{value: Date, label: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchFinancialData();
    generateAvailableMonths();
  }, []);
  
  useEffect(() => {
    if (selectedMonth) {
      fetchSelectedMonthData(selectedMonth);
    }
  }, [selectedMonth]);
  
  // Gerar os meses disponíveis para seleção (12 meses anteriores + mês atual)
  const generateAvailableMonths = () => {
    const now = new Date();
    const months = [];
    
    // Mês atual
    months.push({
      value: now,
      label: format(now, 'MMMM yyyy', { locale: ptBR })
    });
    
    // 24 meses anteriores
    for (let i = 1; i <= 24; i++) {
      const monthDate = subMonths(now, i);
      months.push({
        value: monthDate,
        label: format(monthDate, 'MMMM yyyy', { locale: ptBR })
      });
    }
    
    setAvailableMonths(months);
  };

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      
      // Definir os períodos de tempo para os dados atuais
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
      
      // Definir períodos para os últimos meses
      const previousMonths = [];
      for (let i = 1; i <= 6; i++) {
        const monthDate = subMonths(now, i);
        previousMonths.push({
          name: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
          start: startOfMonth(monthDate).toISOString(),
          end: endOfMonth(monthDate).toISOString()
        });
      }
      
      // Buscar dados para os períodos atuais
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
      
      // Buscar dados para os meses anteriores
      const monthlyData = await Promise.all(
        previousMonths.map(async (period) => {
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
      setMonthlySummaries(monthlyData);
      
      // Fetch data for currently selected month (defaults to current month)
      fetchSelectedMonthData(selectedMonth);
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError('Não foi possível carregar os dados financeiros. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar dados detalhados para o mês selecionado
  const fetchSelectedMonthData = async (date: Date) => {
    setIsLoading(true);
    try {
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .gte('service_date', start.split('T')[0])
        .lte('service_date', end.split('T')[0])
        .order('service_date', { ascending: false });
        
      if (error) throw error;
      
      // Calcular valores totais
      const totalValue = data?.reduce((sum, service) => sum + (parseFloat(service.service_value) || 0), 0) || 0;
      const averageValue = data && data.length > 0 ? totalValue / data.length : 0;
      
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
  
  // Handler para mudança do mês selecionado
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [month, year] = e.target.value.split('-').map(Number);
    const newDate = new Date();
    newDate.setFullYear(year);
    newDate.setMonth(month);
    setSelectedMonth(newDate);
  };

  // Formatar valor como moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para calcular o crescimento em relação ao mês anterior
  const calculateGrowth = (index: number) => {
    if (index >= monthlySummaries.length - 1) return 0;
    
    const currentTotal = monthlySummaries[index].total;
    const previousTotal = monthlySummaries[index + 1].total;
    
    if (previousTotal === 0) return 100; // Se o mês anterior foi zero, crescimento é de 100%
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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

            {/* Seletor de Mês Específico */}
            <div className="mb-8">
              <div className="bg-white border rounded-lg p-6 shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Dados por Mês Específico</h3>
                  <div className="w-full md:w-auto">
                    <select 
                      className="select-enhanced w-full md:w-64"
                      value={`${getMonth(selectedMonth)}-${getYear(selectedMonth)}`}
                      onChange={handleMonthChange}
                    >
                      {availableMonths.map((month, index) => (
                        <option 
                          key={index} 
                          value={`${getMonth(month.value)}-${getYear(month.value)}`}
                          className="capitalize"
                        >
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
                              {format(new Date(service.service_date), 'dd/MM/yyyy')}
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
                ) : (
                  <div className="mt-4 p-4 bg-gray-50 rounded text-center text-gray-500">
                    Nenhum serviço registrado neste mês
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Meses Anteriores */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Histórico Mensal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
} 