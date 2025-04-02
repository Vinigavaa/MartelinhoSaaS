import { DollarSign } from 'lucide-react';
import { FinanceSummary } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';

interface SummaryCardProps {
  summary: FinanceSummary;
  colorClass: string;
}

export function SummaryCard({ summary, colorClass }: SummaryCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 transition-transform duration-300`}>
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
} 