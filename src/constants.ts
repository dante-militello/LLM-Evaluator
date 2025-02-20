export const DEFAULT_EVALUATION_PROMPT = `INSTRUCCIONES PARA LA EVALUACIÓN:
1. Verifica que la respuesta siga todas las instrucciones de la receta
2. Evalúa la coherencia y relevancia de la respuesta
3. Asegúrate que no se violen las restricciones establecidas`;

export const OPENAI_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
] as const;

export const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'Deepseek Chat' }
] as const;

export const ALL_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'deepseek-chat', label: 'Deepseek Chat', provider: 'deepseek' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'claude' }
] as const;

export const CLAUDE_MODELS = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
] as const;

export const DEFAULT_SETTINGS = {
  openaiApiKey: '',
  claudeApiKey: '',
  promptEvalModel: 'gpt-4o',
  evaluatorModel: 'gpt-4o',
  promptEvalTemperature: 0.7,
  evaluationTemperature: 0.7,
  evaluationPrompt: '',
  chatOpenAIModel: 'gpt-4o',
  chatClaudeModel: 'claude-3-5-sonnet-20241022',
  chatOpenAITemperature: 0.7,
  chatClaudeTemperature: 0.7,
  selectedOpenAIModel: 'gpt-4o',
  selectedClaudeModel: 'claude-3-5-sonnet-20241022',
  temperature: 0.7
}; 