export interface Evaluation {
  passed: boolean;
  score: number;
  reason: string;
}

export interface EvaluationHistoryEntry {
  id: string;
  timestamp: number;
  recipe?: {
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
  };
  promptTitle: string;
  message: string;
  response: string;
  model: string;
  temperature?: number;
  evaluation?: Evaluation;
} 