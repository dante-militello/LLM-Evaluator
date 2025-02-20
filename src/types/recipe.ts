export interface Prompt {
  id: string;
  title: string;
  content: string;
  model?: string;
  temperature?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prompts: string[];
  model: string;
  temperature: number;
  maxTokens?: number;
  stopSequences?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  topP?: number;
} 