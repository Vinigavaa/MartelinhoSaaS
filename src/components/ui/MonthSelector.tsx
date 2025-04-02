import { AvailableMonth } from '../../types/finance';

interface MonthSelectorProps {
  months: AvailableMonth[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function MonthSelector({ months, selectedIndex, onChange }: MonthSelectorProps) {
  return (
    <select 
      className="mt-2 sm:mt-0 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      value={selectedIndex}
      onChange={(e) => onChange(parseInt(e.target.value))}
    >
      {months.map((month, index) => (
        <option key={index} value={index}>{month.label}</option>
      ))}
    </select>
  );
} 