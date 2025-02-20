import React from 'react';
import { Search, Calendar, Filter, MessageCircle } from 'lucide-react';
import { HistoryFilters as FiltersType } from '../../types/history';

interface Props {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
}

export function HistoryFilters({ filters, onFilterChange }: Props) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchTerm: e.target.value });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value ? new Date(value) : null
      }
    });
  };

  const handleTypeChange = (type: 'chat' | 'evaluation' | 'splitTest') => {
    const newTypes = filters.typeFilter.includes(type)
      ? filters.typeFilter.filter(t => t !== type)
      : [...filters.typeFilter, type];
    onFilterChange({ ...filters, typeFilter: newTypes });
  };

  const handleStatusChange = (status: 'passed' | 'failed' | 'pending') => {
    const newStatus = filters.statusFilter.includes(status)
      ? filters.statusFilter.filter(s => s !== status)
      : [...filters.statusFilter, status];
    onFilterChange({ ...filters, statusFilter: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={filters.searchTerm}
          onChange={handleSearchChange}
          placeholder="Buscar en el historial..."
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 
                   rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-3 gap-4">
        {/* Rango de fechas */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Rango de fechas
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="px-2 py-1 bg-gray-800/50 border border-gray-700 rounded-md text-sm text-gray-200"
            />
            <input
              type="date"
              value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="px-2 py-1 bg-gray-800/50 border border-gray-700 rounded-md text-sm text-gray-200"
            />
          </div>
        </div>

        {/* Tipos */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <MessageCircle className="w-4 h-4" />
            Tipos
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'chat', label: 'Chat' },
              { value: 'evaluation', label: 'Evaluación' },
              { value: 'splitTest', label: 'Split Test' }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => handleTypeChange(type.value as 'chat' | 'evaluation' | 'splitTest')}
                className={`px-2 py-1 text-sm rounded-md transition-colors ${
                  filters.typeFilter.includes(type.value)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="w-4 h-4" />
            Estado
          </label>
          <div className="flex gap-2">
            {[
              { value: 'passed', label: 'Aprobados' },
              { value: 'failed', label: 'No aprobados' },
              { value: 'pending', label: 'Pendientes' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value as 'passed' | 'failed' | 'pending')}
                className={`px-2 py-1 text-sm rounded-md transition-colors ${
                  filters.statusFilter.includes(option.value as 'passed' | 'failed' | 'pending')
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 