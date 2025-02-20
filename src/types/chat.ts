import { Recipe } from './recipe';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  temperature?: number;
  responseTime?: number;
  feedback?: {
    selectedOption?: 'A' | 'B';
    reason?: string;
  };
}

export interface ChatSession {
  id: string;
  timestamp: number;
  recipe?: Recipe;
  messages: ChatMessage[];
} 