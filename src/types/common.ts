export interface Recipe {
  id: string;
  title: string;
  description?: string;
  prompts: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  topP?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  temperature?: number;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  recipe: Recipe | null;
  messages: ChatMessage[];
  timestamp: number;
  settings: ChatSettings;
  editHistory?: EditHistoryEntry[];
  deletedMessages?: DeletedMessage[];
  wasReset?: boolean;
  wasRestored?: boolean;
  chatState: 'current' | 'last' | 'reset';
}

export interface ChatSettings {
  temperature: number;
  model: string;
}

export interface EditHistoryEntry {
  timestamp: number;
  previousContent: string;
  newContent: string;
  model: string;
}

export interface DeletedMessage {
  timestamp: number;
  content: string;
  model: string;
  role: 'user' | 'assistant' | 'system';
  temperature?: number;
}

export interface ApiLog {
  type: 'request' | 'response';
  content: unknown;
  timestamp: number;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  evaluation?: {
    response: string;
    evaluation: {
      score: number;
      passed: boolean;
      reason: string;
    };
  };
} 