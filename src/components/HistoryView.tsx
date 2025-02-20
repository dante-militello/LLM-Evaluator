import React from 'react';
import { usePromptStore } from '../store/promptStore';
import { HistoryTimeline } from './history/HistoryTimeline';
import { HistoryAnalytics } from './history/HistoryAnalytics';
import { HistoryDetailView } from './history/HistoryDetailView';
import { HistoryFilters } from './history/HistoryFilters';
import { TimelineEvent, HistoryFilters as FiltersType } from '../types/history';
import { LayoutGrid, LineChart, Download } from 'lucide-react';

export function HistoryView() {
  const [view, setView] = React.useState<'timeline' | 'analytics'>('timeline');
  const [selectedEvent, setSelectedEvent] = React.useState<TimelineEvent | null>(null);
  const [filters, setFilters] = React.useState<FiltersType>({
    searchTerm: '',
    dateRange: { start: null, end: null },
    typeFilter: [],
    statusFilter: []
  });

  const chatHistory = usePromptStore(state => state.chatHistory);
  const evaluationHistory = usePromptStore(state => state.evaluationHistory);
  const splitTestHistory = usePromptStore(state => state.splitTestHistory);
  // Convertir el historial a eventos de línea de tiempo
  const events: TimelineEvent[] = React.useMemo(() => {
    return [
      ...chatHistory.map(chat => ({
        id: chat.id,
        type: 'chat' as const,
        timestamp: new Date(chat.timestamp).getTime(),
        details: chat
      })),
      ...evaluationHistory
        .filter(evaluation => evaluation.evaluation)
        .map(evaluation => ({
          id: evaluation.id,
          type: 'evaluation' as const,
          timestamp: new Date(evaluation.timestamp).getTime(),
          details: evaluation
        })),
      ...splitTestHistory.map(test => ({
        id: test.id,
        type: 'splitTest' as const,
        timestamp: new Date(test.timestamp).getTime(),
        details: test
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);
  }, [chatHistory, evaluationHistory, splitTestHistory]);

  // Filtrar eventos
  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      // Filtro de búsqueda
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          (event.type === 'chat' && event.details.messages.some(m => 
            m.content.toLowerCase().includes(searchLower)
          )) ||
          (event.type === 'evaluation' && (
            event.details.message.toLowerCase().includes(searchLower) ||
            event.details.response.toLowerCase().includes(searchLower)
          )) ||
          (event.type === 'splitTest' && (
            event.details.messages[0]?.userMessage.toLowerCase().includes(searchLower) ||
            event.details.messages[0]?.recipeA.response.toLowerCase().includes(searchLower) ||
            event.details.messages[0]?.recipeB.response.toLowerCase().includes(searchLower)
          ));
        if (!matchesSearch) return false;
      }

      // Filtro de fecha
      if (filters.dateRange.start && new Date(event.timestamp) < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(event.timestamp) > endDate) return false;
      }

      // Filtro por tipo
      if (filters.typeFilter.length > 0) {
        if (!filters.typeFilter.includes(event.type)) return false;
      }

      // Filtro de estado
      if (filters.statusFilter.length > 0 && event.type === 'evaluation') {
        const passed = event.details.evaluation?.passed;
        if (!filters.statusFilter.includes(passed ? 'passed' : 'failed')) return false;
      }

      return true;
    });
  }, [events, filters]);

  // Exportar datos
  const handleExport = (type: 'chat' | 'evaluation' | 'splitTest') => {
    let data;
    let filename;

    switch (type) {
      case 'chat':
        data = chatHistory;
        filename = 'chat-history.json';
        break;
      case 'evaluation':
        data = evaluationHistory;
        filename = 'evaluation-history.json';
        break;
      case 'splitTest':
        data = splitTestHistory;
        filename = 'split-test-history.json';
        break;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none space-y-4 p-6 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-200">Historial</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('timeline')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'timeline'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('analytics')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'analytics'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <LineChart className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('chat')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 
                         hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Chats
              </button>
              <button
                onClick={() => handleExport('evaluation')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 
                         hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Evaluaciones
              </button>
              <button
                onClick={() => handleExport('splitTest')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 
                         hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Split Tests
              </button>
            </div>
          </div>
        </div>

        <HistoryFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === 'timeline' ? (
          <div className="h-full grid grid-cols-[400px,1fr] gap-6 p-6">
            {/* Lista de eventos */}
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
              <HistoryTimeline
                events={filteredEvents}
                onSelectEvent={setSelectedEvent}
                selectedEventId={selectedEvent?.id}
              />
            </div>

            {/* Vista detallada */}
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto bg-gray-800/30 rounded-lg">
              {selectedEvent ? (
                <HistoryDetailView
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Selecciona un evento para ver los detalles
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <HistoryAnalytics events={filteredEvents} />
          </div>
        )}
      </div>
    </div>
  );
}