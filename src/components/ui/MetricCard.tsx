import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  colorClass: string;
}

export function MetricCard({ title, value, icon, colorClass }: MetricCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} p-4 rounded-lg shadow-md`}>
      <h4 className="text-sm font-medium text-white opacity-90">{title}</h4>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center justify-center bg-white bg-opacity-25 rounded-full h-8 w-8">
          {icon}
        </span>
      </div>
    </div>
  );
} 