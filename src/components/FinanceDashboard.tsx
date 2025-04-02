import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { X, TrendingUp, TrendingDown, DollarSign, Calendar, Users, CreditCard } from 'lucide-react';
import { 
  formatCurrency, 
  formatDateForQuery, 
  formatLocalDate 
} from '../utils/formatters';
import { 
  getPeriods, 
  getPreviousMonths, 
  generateAvailableMonths 
} from '../utils/dateUtils';
import { 
  SummaryCard, 
  LoadingSpinner, 
  ErrorMessage, 
  MonthSelector,
  MetricCard,
  EmptyStateMessage 
} from './ui';
import { 
  FinanceSummary, 
  FinanceDashboardProps, 
  SelectedMonthData,
  AvailableMonth,
  ServiceData,
  Period
} from '../types/finance';

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
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && user) {
      fetchFinancialData();
      setAvailableMonths(generateAvailableMonths());
    }
  }, [isOpen, user]);
  
  useEffect(() => {
    if (selectedMonth && user) {
      fetchSelectedMonthData(selectedMonth);
    }
  }, [selectedMonth, user]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      const periods = getPeriods(now);
      const previousMonths = getPreviousMonths(now, 6);
      
      const summaryData = await fetchSummaryForPeriods(periods);
      const monthlyData = await fetchSummaryForPeriods(previousMonths);
      
      setSummaries(summaryData);
      setMonthlySummaries(monthlyData);
      
      fetchSelectedMonthData(selectedMonth);
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError('Não foi possível carregar os dados financeiros. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummaryForPeriods = async (periods: Period[]): Promise<FinanceSummary[]> => {
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

  const calculateGrowth = (index: number): number => {
    if (index >= monthlySummaries.length - 1) return 0;
    
    const currentTotal = monthlySummaries[index].total;
    const previousTotal = monthlySummaries[index + 1].total;
    
    if (previousTotal === 0) return 100;
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  };

  const handleMonthChange = (index: number) => {
    if (index >= 0 && index < availableMonths.length) {
      setSelectedMonth(availableMonths[index].value);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-800 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-lg">
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
        </header>

        <div className="p-6 bg-gray-50">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <div>
              <CurrentPeriodsSummary summaries={summaries} />
              <MonthlyHistorySummary 
                monthlySummaries={monthlySummaries} 
                calculateGrowth={calculateGrowth} 
              />
              <MonthlyDetailSection 
                selectedMonth={selectedMonth}
                selectedMonthData={selectedMonthData}
                availableMonths={availableMonths}
                onMonthChange={handleMonthChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentPeriodsSummary({ summaries }: { summaries: FinanceSummary[] }) {
  const CARD_COLORS = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600'
  ];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-blue-600" />
        Resumo por período
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {summaries.map((summary, index) => (
          <SummaryCard 
            key={index}
            summary={summary}
            colorClass={CARD_COLORS[index % CARD_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}

function MonthlyHistorySummary({ 
  monthlySummaries, 
  calculateGrowth 
}: { 
  monthlySummaries: FinanceSummary[], 
  calculateGrowth: (index: number) => number 
}) {
  return (
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
                    <GrowthIndicator growth={calculateGrowth(index)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GrowthIndicator({ growth }: { growth: number }) {
  const isPositive = growth >= 0;
  
  return (
    <div className={`flex items-center ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isPositive ? (
        <TrendingUp className="h-4 w-4 mr-1" />
      ) : (
        <TrendingDown className="h-4 w-4 mr-1" />
      )}
      <span className="text-sm font-medium">
        {isPositive ? '+' : ''}{growth.toFixed(1)}%
      </span>
    </div>
  );
}

function MonthlyDetailSection({ 
  selectedMonth,
  selectedMonthData,
  availableMonths,
  onMonthChange
}: { 
  selectedMonth: Date,
  selectedMonthData: SelectedMonthData,
  availableMonths: AvailableMonth[],
  onMonthChange: (index: number) => void
}) {
  const selectedMonthIndex = availableMonths.findIndex(month => 
    month.value.getMonth() === selectedMonth.getMonth() && 
    month.value.getFullYear() === selectedMonth.getFullYear()
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
          Detalhes por mês
        </h3>
        <MonthSelector 
          months={availableMonths}
          selectedIndex={selectedMonthIndex}
          onChange={onMonthChange}
        />
      </div>
      
      <MonthMetrics data={selectedMonthData} />
      
      {selectedMonthData.services.length > 0 ? (
        <ServicesTable services={selectedMonthData.services} />
      ) : (
        <EmptyStateMessage message="Nenhum serviço registrado para o mês selecionado." />
      )}
    </div>
  );
}

function MonthMetrics({ data }: { data: SelectedMonthData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <MetricCard 
        title="Faturamento total"
        value={formatCurrency(data.totalValue)}
        icon={<DollarSign className="h-4 w-4 text-white" />}
        colorClass="from-blue-500 to-blue-600"
      />
      <MetricCard 
        title="Total de serviços"
        value={data.services.length.toString()}
        icon={<Users className="h-4 w-4 text-white" />}
        colorClass="from-emerald-500 to-teal-600"
      />
      <MetricCard 
        title="Ticket médio"
        value={formatCurrency(data.averageValue)}
        icon={<CreditCard className="h-4 w-4 text-white" />}
        colorClass="from-purple-500 to-violet-600"
      />
    </div>
  );
}

function ServicesTable({ services }: { services: ServiceData[] }) {
  return (
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
            {services.map((service, index) => (
              <tr key={index} className="hover:bg-blue-50 transition-colors">
                <td className="py-3 px-4 text-sm text-gray-600">{formatLocalDate(service.service_date)}</td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{service.client_name}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{service.car_model} - {service.car_plate?.toUpperCase()}</td>
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
  );
} 