import type { Recipe } from './recipe';

export interface MemoryEntry {
  id: string;
  content: string;
  importance: number;
  reason: string;
  timestamp: number;
}

export interface SplitTestMemory {
  entries: MemoryEntry[];
  lastAnalyzed: number;
}

export interface SplitTestMessage {
  id: string;
  userMessage: string;
  recipeA: {
    recipe: Recipe;
    response: string;
  };
  recipeB: {
    recipe: Recipe;
    response: string;
  };
  feedback?: SplitTestFeedback;
  timestamp: number;
  model: string;
  temperature: number;
}

export interface SplitTestFeedback {
  selectedOption: 'A' | 'B';
  feedback: string;
  reaction: 'like' | 'dislike';
  deleted?: boolean;
  timestamp: number;
}

export interface SplitTestSummary {
  content: string;
  improvedPrompt: string;
  timestamp: number;
}

export interface SplitTestSession {
  id: string;
  recipeA: Recipe;
  recipeB: Recipe;
  messages: SplitTestMessage[];
  summary?: SplitTestSummary;
  memory?: SplitTestMemory;
  timestamp: number;
  model: string;
  temperature: number;
}