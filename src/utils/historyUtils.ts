import { ChatSession } from '../types/chat';
import { EvaluationHistoryEntry } from '../types/evaluation';
import { SplitTestSession } from '../types/splitTest';
import { Analytics, AdvancedMetrics, TimelineEvent, HistoryFilters } from '../types/history';

export const getAnalytics = (
  chatHistory: ChatSession[],
  evaluationHistory: EvaluationHistoryEntry[],
  splitTestHistory: SplitTestSession[]
): Analytics => {
  return {
    chats: {
      total: chatHistory.length,
      byModel: chatHistory.reduce((acc, chat) => {
        const model = chat.messages[0]?.model || 'unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageMessagesPerChat: chatHistory.length > 0 
        ? chatHistory.reduce((acc, chat) => acc + chat.messages.length, 0) / chatHistory.length
        : 0
    },
    evaluations: {
      total: evaluationHistory.length,
      passRate: evaluationHistory.length > 0
        ? (evaluationHistory.filter(e => e.evaluation?.passed).length / evaluationHistory.length) * 100
        : 0,
      averageScore: evaluationHistory.length > 0
        ? evaluationHistory.reduce((acc, e) => acc + (e.evaluation?.score || 0), 0) / evaluationHistory.length
        : 0
    },
    splitTests: {
      total: splitTestHistory.length,
      preferenceDistribution: {
        A: splitTestHistory.reduce((acc, test) => 
          acc + test.messages.filter((m: any) => m.feedback?.selectedOption === 'A').length, 0),
        B: splitTestHistory.reduce((acc, test) => 
          acc + test.messages.filter((m: any) => m.feedback?.selectedOption === 'B').length, 0)
      }
    }
  };
};

export const getAdvancedMetrics = (
  chatHistory: ChatSession[],
  evaluationHistory: EvaluationHistoryEntry[]
): AdvancedMetrics => {
  return {
    responseTimeAnalysis: chatHistory.map(chat => ({
      id: chat.id,
      averageResponseTime: chat.messages.reduce((acc, msg) => acc + (msg.responseTime || 0), 0) / chat.messages.length
    })),
    modelPerformance: evaluationHistory.reduce((acc, evaluation) => {
      const model = evaluation.model;
      if (!acc[model]) {
        acc[model] = { total: 0, passed: 0, avgScore: 0 };
      }
      acc[model].total++;
      if (evaluation.evaluation?.passed) acc[model].passed++;
      acc[model].avgScore += evaluation.evaluation?.score || 0;
      return acc;
    }, {} as Record<string, { total: number; passed: number; avgScore: number }>)
  };
};

export const getTimelineEvents = (
  chatHistory: ChatSession[],
  evaluationHistory: EvaluationHistoryEntry[],
  splitTestHistory: SplitTestSession[]
): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    ...chatHistory.map(chat => ({
      id: chat.id,
      type: 'chat' as const,
      timestamp: new Date(chat.timestamp),
      title: chat.recipe?.title || 'Chat sin receta',
      details: chat
    })),
    ...evaluationHistory.map(evaluation => ({
      id: evaluation.id,
      type: 'evaluation' as const,
      timestamp: new Date(evaluation.timestamp),
      title: evaluation.promptTitle,
      details: evaluation
    })),
    ...splitTestHistory.map(test => ({
      id: test.id,
      type: 'splitTest' as const,
      timestamp: new Date(test.timestamp),
      title: `${test.recipeA.title} vs ${test.recipeB.title}`,
      details: test
    }))
  ];
  
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const filterHistory = (
  items: any[],
  filters: HistoryFilters
): any[] => {
  return items.filter(item => {
    // Filtro por término de búsqueda
    if (filters.searchTerm && !JSON.stringify(item).toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro por rango de fechas
    const itemDate = new Date(item.timestamp);
    if (filters.dateRange.start && itemDate < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && itemDate > filters.dateRange.end) {
      return false;
    }

    // Filtro por modelo
    if (filters.models.length > 0) {
      const itemModel = item.model || item.messages?.[0]?.model;
      if (!itemModel || !filters.models.includes(itemModel)) {
        return false;
      }
    }

    // Filtro por estado (solo para evaluaciones)
    if (filters.status !== 'all' && item.evaluation) {
      if (filters.status === 'passed' && !item.evaluation.passed) {
        return false;
      }
      if (filters.status === 'failed' && item.evaluation.passed) {
        return false;
      }
    }

    return true;
  });
};

export const exportToJson = (data: any, type: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-history-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}; 