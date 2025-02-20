import React from 'react';
import { TimelineEvent } from '../../types/history';
import { MessageCircle, Scale, GitCompare } from 'lucide-react';

interface Props {
  events: TimelineEvent[];
  onSelectEvent: (event: TimelineEvent) => void;
  selectedEventId?: string;
}

export function HistoryTimeline({ events, onSelectEvent, selectedEventId }: Props) {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'chat':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'evaluation':
        return <Scale className="w-5 h-5 text-green-500" />;
      case 'splitTest':
        return <GitCompare className="w-5 h-5 text-purple-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar eventos por fecha
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.timestamp);
    const dateKey = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, TimelineEvent[]>);

  const getEventSummary = (event: TimelineEvent) => {
    switch (event.type) {
      case 'chat':
        return `${event.details.messages.length} mensajes`;
      case 'evaluation':
        return event.details.evaluation?.passed ? (
          <span className="text-green-400">Aprobado</span>
        ) : (
          <span className="text-red-400">No aprobado</span>
        );
      case 'splitTest': {
        const preference = event.details.summary?.preference;
        const aCount = preference === 'A' ? 1 : 0;
        const bCount = preference === 'B' ? 1 : 0;
        return `A: ${aCount} vs B: ${bCount}`;
      }
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'chat':
        return event.details.recipe?.title || 'Chat Session';
      case 'evaluation':
        return 'Evaluación';
      case 'splitTest':
        return 'Split Test';
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 sticky top-0 bg-gray-900/95 py-2">
            {date}
          </h3>
          <div className="space-y-2">
            {dateEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  selectedEventId === event.id
                    ? 'bg-gray-700/50 ring-2 ring-blue-500'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-medium text-gray-200 truncate">
                        {getEventTitle(event)}
                      </h4>
                      <time className="text-sm text-gray-400 whitespace-nowrap">
                        {formatDate(new Date(event.timestamp))}
                      </time>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-400">{getEventSummary(event)}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 