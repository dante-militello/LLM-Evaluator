import type { ChatSession } from '../store/promptStore';
import type { EvaluationHistoryEntry } from './evaluation';
import type { SplitTestSession } from './splitTest';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  content: string;
  timestamp: number;
  eventId: string;
}

export type TimelineEventType = 'chat' | 'evaluation' | 'splitTest';

export interface BaseTimelineEvent {
  id: string;
  timestamp: number;
}

export interface ChatTimelineEvent extends BaseTimelineEvent {
  type: 'chat';
  details: ChatSession;
}

export interface EvaluationTimelineEvent extends BaseTimelineEvent {
  type: 'evaluation';
  details: EvaluationHistoryEntry;
}

export interface SplitTestTimelineEvent extends BaseTimelineEvent {
  type: 'splitTest';
  details: SplitTestSession;
}

export type TimelineEvent = ChatTimelineEvent | EvaluationTimelineEvent | SplitTestTimelineEvent;

export interface HistoryFilters {
  searchTerm: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  typeFilter: ('chat' | 'evaluation' | 'splitTest')[];
  statusFilter: ('passed' | 'failed' | 'pending')[];
}

export interface Analytics {
  totalChats: number;
  avgMessagesPerChat: number;
  evaluationPassRate: number;
  splitTestPreferences: {
    recipeA: number;
    recipeB: number;
    neutral: number;
  };
}

export interface AdvancedMetrics {
  responseTimesByModel: {
    [model: string]: {
      avg: number;
      min: number;
      max: number;
    };
  };
  evaluationsByModel: {
    [model: string]: {
      total: number;
      passed: number;
      failed: number;
    };
  };
  splitTestScores: {
    recipeA: {
      avg: number;
      wins: number;
    };
    recipeB: {
      avg: number;
      wins: number;
    };
  };
} 