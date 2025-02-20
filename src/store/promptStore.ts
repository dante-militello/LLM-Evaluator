import { create } from 'zustand';
import * as db from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Recipe, 
  ApiLog, 
  ChatMessage, 
  ChatSession, 
  Prompt, 
  Message,
  ChatSettings,
  EditHistoryEntry,
  DeletedMessage
} from '../types/common';
import type {
  SplitTestSession,
  SplitTestMessage,
  SplitTestFeedback
} from '../types/splitTest';

const DEFAULT_EVALUATION_PROMPT = `Evalúa la respuesta del modelo basándote en las instrucciones proporcionadas y el mensaje del usuario.
Considera:
1. Adherencia a las instrucciones
2. Calidad y relevancia de la respuesta
3. Tono y estilo apropiados
4. Precisión y corrección
5. Claridad y coherencia`;

export interface Settings {
  openaiApiKey: string;
  deepseekApiKey: string;
  claudeApiKey: string;
  selectedModel: string;
  temperature: number;
  systemTemperature: number;
  evaluationTemperature: number;
  evaluationPrompt: string;
  chatOpenAIModel: string;
  chatClaudeModel: string;
  chatOpenAITemperature: number;
  chatClaudeTemperature: number;
  promptEvalModel: string;
  evaluatorModel: string;
  promptEvalTemperature: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface EvaluationHistoryEntry {
  id: string;
  timestamp: number;
  recipe?: Recipe;
  promptTitle: string;
  message: string;
  response: string;
  model: string;
  temperature?: number;
  evaluation?: {
    passed: boolean;
    reason: string;
    score: number;
  };
}

// Re-export types from common
export type {
  Recipe,
  ChatMessage,
  ChatSession,
  Prompt,
  Message,
  ChatSettings,
  EditHistoryEntry,
  DeletedMessage
};

export interface PromptStore {
  prompts: Prompt[];
  messages: Message[];
  recipes: Recipe[];
  selectedRecipe: string | null;
  isEvaluating: boolean;
  error: string | null;
  initialized: boolean;
  settings: Settings;
  history: EvaluationHistoryEntry[];
  apiLogs: ApiLog[];
  chatHistory: ChatSession[];
  currentChat: ChatSession | null;
  evaluationHistory: EvaluationHistoryEntry[];
  splitTestHistory: SplitTestSession[];
  currentSplitTest: SplitTestSession | null;
  handleRestoreChat: (chat: ChatSession) => Promise<void>;
  initializeStore: () => Promise<void>;
  addPrompt: (prompt: Omit<Prompt, 'id'>) => Promise<void>;
  addMessage: (content: string) => Promise<void>;
  updateMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => Promise<void>;
  removePromptFromRecipe: (recipeId: string, promptId: string) => Promise<void>;
  reorderPromptsInRecipe: (recipeId: string, newOrder: string[]) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  selectRecipe: (id: string | null) => void;
  setError: (error: string | null) => void;
  evaluateMessages: () => Promise<void>;
  updatePrompt: (id: string, prompt: Partial<Prompt>) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  addHistoryEntry: (entry: ChatSession | EvaluationHistoryEntry) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  addApiLog: (type: 'request' | 'response', content: unknown) => void;
  clearApiLogs: () => void;
  initializeChat: (recipe: Recipe, force?: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  saveChatToHistory: () => Promise<void>;
  loadChatHistory: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  loadChatsByRecipe: (recipeId: string) => Promise<ChatSession[]>;
  addEvaluationEntry: (entry: EvaluationHistoryEntry) => Promise<void>;
  deleteEvaluationEntry: (id: string) => Promise<void>;
  loadEvaluationHistory: () => Promise<void>;
  deleteAllChatsForRecipe: (recipeId: string) => Promise<void>;
  initializeSplitTest: (recipeA: Recipe, recipeB: Recipe) => void;
  addSplitTestMessage: (message: Omit<SplitTestMessage, 'id' | 'timestamp'>) => void;
  addSplitTestFeedback: (messageId: string, feedback: Omit<SplitTestFeedback, 'timestamp'>) => void;
  generateSplitTestSummary: (sessionId: string) => Promise<void>;
  saveSplitTestSession: () => Promise<void>;
  loadSplitTestHistory: () => Promise<void>;
  deleteSplitTestSession: (sessionId: string) => Promise<void>;
  setCurrentSplitTest: (session: SplitTestSession | null) => void;
}

const initialSettings: Settings = {
  openaiApiKey: '',
  deepseekApiKey: '',
  claudeApiKey: '',
  selectedModel: 'gpt-3.5-turbo',
  temperature: 0.7,
  systemTemperature: 0.7,
  evaluationTemperature: 0.3,
  evaluationPrompt: DEFAULT_EVALUATION_PROMPT,
  chatOpenAIModel: 'gpt-3.5-turbo',
  chatClaudeModel: 'claude-3-5-sonnet-20241022',
  chatOpenAITemperature: 0.7,
  chatClaudeTemperature: 0.7,
  promptEvalModel: 'gpt-3.5-turbo',
  evaluatorModel: 'gpt-3.5-turbo',
  promptEvalTemperature: 0.7,
  frequencyPenalty: 1.0,
  presencePenalty: 0.8
};

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  messages: [],
  recipes: [],
  selectedRecipe: null,
  isEvaluating: false,
  error: null,
  initialized: false,
  settings: initialSettings,
  history: [],
  apiLogs: [],
  chatHistory: [],
  currentChat: null,
  evaluationHistory: [],
  splitTestHistory: [],
  currentSplitTest: null,
  handleRestoreChat: async (chat: ChatSession) => {
    const { currentChat } = get();
    if (!currentChat) return;

    try {
      // Guardamos el chat actual como último chat, reutilizando el ID si era un chat restaurado
      const wasRestored = currentChat.wasRestored;
      const currentChatToSave = {
        ...currentChat,
        id: wasRestored ? currentChat.id : uuidv4(),
        chatState: 'last' as const,
        timestamp: Date.now()
      };

      // Filtrar el historial actual para mantener solo un chat 'last' por recipe
      const filteredHistory = get().chatHistory.filter(existingChat => 
        existingChat.id !== currentChatToSave.id && 
        !(existingChat.chatState === 'last' && existingChat.recipe?.id === currentChatToSave.recipe?.id)
      );
      
      // Restauramos el chat seleccionado como actual
      const restoredChat = {
        ...chat,
        id: uuidv4(), // Nuevo ID para el chat actual
        chatState: 'current' as const,
        timestamp: Date.now(),
        wasRestored: true // Marcamos que este chat fue restaurado
      };

      // Guardar en la base de datos
      await db.addChatEntry(currentChatToSave);
      
      // Actualizar el estado
      set({
        chatHistory: [...filteredHistory, currentChatToSave],
        currentChat: restoredChat
      });
    } catch (error) {
      console.error('Error al restaurar el chat:', error);
      set({ error: 'Error al restaurar el chat' });
    }
  },

  initializeStore: async () => {
    if (get().initialized) return;

    try {
      const [prompts, messages, recipes, settings, evaluationHistory, chatHistory] = await Promise.all([
        db.getAllPrompts(),
        db.getAllMessages(),
        db.getAllRecipes(),
        db.getSettings(),
        db.getAllEvaluationHistory(),
        db.getAllChatHistory()
      ]);

      set({ 
        prompts, 
        messages, 
        recipes, 
        settings: { ...initialSettings, ...settings },
        evaluationHistory,
        chatHistory,
        initialized: true 
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ error: 'Failed to load data from database' });
    }
  },

  addPrompt: async (prompt) => {
    const newPrompt = { ...prompt, id: Date.now().toString() };
    try {
      await db.addPrompt(newPrompt);
      set(state => ({ prompts: [...state.prompts, newPrompt] }));
    } catch (error) {
      console.error('Failed to add prompt:', error);
      set({ error: 'Failed to save prompt' });
    }
  },

  addMessage: async (content: string) => {
    const newMessage = { id: Date.now().toString(), content };
    try {
      await db.addMessage(newMessage);
      set(state => ({ messages: [...state.messages, newMessage] }));
    } catch (error) {
      console.error('Failed to add message:', error);
      set({ error: 'Failed to save message' });
    }
  },

  updateMessage: async (id, content) => {
    try {
      const message = get().messages.find(m => m.id === id);
      if (!message) return;

      const updatedMessage = { ...message, content };
      await db.updateMessage(updatedMessage);
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === id ? updatedMessage : msg
        )
      }));
    } catch (error) {
      console.error('Failed to update message:', error);
      set({ error: 'Failed to update message' });
    }
  },

  deleteMessage: async (id) => {
    try {
      await db.deleteMessage(id);
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete message:', error);
      set({ error: 'Failed to delete message' });
    }
  },

  addRecipe: async (recipe) => {
    const newRecipe = { ...recipe, id: Date.now().toString() };
    try {
      await db.addRecipe(newRecipe);
      set(state => ({ recipes: [...state.recipes, newRecipe] }));
    } catch (error) {
      console.error('Failed to add recipe:', error);
      set({ error: 'Failed to save recipe' });
    }
  },

  updateRecipe: async (id, recipe) => {
    const updatedRecipe = { ...recipe, id };
    try {
      await db.updateRecipe(updatedRecipe);
      set(state => ({
        recipes: state.recipes.map(r => r.id === id ? updatedRecipe : r)
      }));
    } catch (error) {
      console.error('Failed to update recipe:', error);
      set({ error: 'Failed to update recipe' });
    }
  },

  removePromptFromRecipe: async (recipeId, promptId) => {
    const recipe = get().recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const updatedRecipe = {
      ...recipe,
      prompts: recipe.prompts.filter(id => id !== promptId)
    };

    try {
      await db.updateRecipe(updatedRecipe);
      set(state => ({
        recipes: state.recipes.map(r => 
          r.id === recipeId ? updatedRecipe : r
        )
      }));
    } catch (error) {
      console.error('Failed to remove prompt from recipe:', error);
      set({ error: 'Failed to update recipe' });
    }
  },

  reorderPromptsInRecipe: async (recipeId: string, newOrder: string[]) => {
    try {
      const recipe = get().recipes.find(r => r.id === recipeId);
      if (!recipe) return;

      const updatedRecipe = { ...recipe, prompts: newOrder };
      await db.updateRecipe(updatedRecipe);
      
      set(state => ({
        recipes: state.recipes.map(r => 
          r.id === recipeId ? updatedRecipe : r
        )
      }));
    } catch (error) {
      console.error('Failed to reorder prompts:', error);
      set({ error: 'Failed to reorder prompts' });
    }
  },

  deletePrompt: async (id) => {
    try {
      await db.deletePrompt(id);
      set(state => ({
        prompts: state.prompts.filter(prompt => prompt.id !== id),
        recipes: state.recipes.map(recipe => ({
          ...recipe,
          prompts: recipe.prompts.filter(promptId => promptId !== id)
        }))
      }));
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      set({ error: 'Failed to delete prompt' });
    }
  },

  deleteRecipe: async (id) => {
    try {
      await db.deleteRecipe(id);
      set(state => ({
        recipes: state.recipes.filter(recipe => recipe.id !== id),
        selectedRecipe: state.selectedRecipe === id ? null : state.selectedRecipe
      }));
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      set({ error: 'Failed to delete recipe' });
    }
  },

  selectRecipe: (id) => set({ selectedRecipe: id }),

  setError: (error) => set({ error }),

  evaluateMessages: async () => {
    try {
      set({ isEvaluating: true, error: null });
      const settings = get().settings;
      const selectedRecipeId = get().selectedRecipe;
      const addApiLog = get().addApiLog;
      
      if (!selectedRecipeId) return;

      const recipe = get().recipes.find(r => r.id === selectedRecipeId);
      if (!recipe) return;

      // Obtener los prompts completos
      const selectedPrompts = recipe.prompts
        .map(promptId => get().prompts.find(p => p.id === promptId))
        .filter(Boolean);

      const recipeData = {
        ...recipe,
        prompts: selectedPrompts
      };

      // Iterar sobre cada prompt y sus mensajes
      for (const prompt of selectedPrompts) {
        if (!prompt?.messages) continue;
        const updatedMessages = [...prompt.messages];

        for (let i = 0; i < updatedMessages.length; i++) {
          const message = updatedMessages[i];
          
          try {
            const requestData = {
              recipe: recipeData,
              message: message.content,
              settings
            };

            addApiLog('request', requestData);

            const response = await fetch('http://localhost:3000/api/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData)
            });

            const data = await response.json();
            addApiLog('response', data);

            if (!response.ok) throw new Error('Error en la evaluación');

            // Actualizar el mensaje con su evaluación
            updatedMessages[i] = {
              ...message,
              evaluation: {
                response: data.response,
                evaluation: data.evaluation
              }
            };

            // Crear entrada de historial
            const historyEntry = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              recipe: {
                id: recipe.id,
                title: recipe.title,
                description: recipe.description || '',
                prompts: recipe.prompts,
                model: settings.selectedModel,
                temperature: settings.temperature
              },
              promptTitle: prompt.title,
              message: message.content,
              response: data.response,
              model: settings.selectedModel,
              temperature: settings.temperature,
              evaluation: data.evaluation
            };

            // Guardar en el historial
            await get().addHistoryEntry(historyEntry);

          } catch (error) {
            console.error(`Error evaluando mensaje ${message.id}:`, error);
            set({ error: `Error al evaluar mensaje: ${error instanceof Error ? error.message : String(error)}` });
          }
        }

        // Actualizar el prompt con los mensajes evaluados
        const updatedPrompt = {
          ...prompt,
          messages: updatedMessages
        };

        // Actualizar en la base de datos y el estado
        await db.updatePrompt(updatedPrompt);
        set(state => ({
          prompts: state.prompts.map(p => 
            p.id === prompt.id ? updatedPrompt : p
          )
        }));
      }

      set({ isEvaluating: false });
    } catch (error) {
      console.error('Error en evaluateMessages:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al evaluar los mensajes',
        isEvaluating: false 
      });
    }
  },

  updatePrompt: async (id: string, updates: Partial<Prompt>) => {
    try {
      const prompt = get().prompts.find(p => p.id === id);
      if (!prompt) return;

      const updatedPrompt = { ...prompt, ...updates };
      await db.updatePrompt(updatedPrompt);
      
      set(state => ({
        prompts: state.prompts.map(p => 
          p.id === id ? updatedPrompt : p
        )
      }));
    } catch (error) {
      console.error('Failed to update prompt:', error);
      set({ error: 'Failed to update prompt' });
    }
  },

  updateSettings: async (updates: Partial<Settings>) => {
    try {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...updates };
      
      // Actualizar el estado primero
      set({ settings: newSettings });
      
      // Luego intentar guardar en la base de datos
      await db.updateSettings(newSettings).catch(error => {
        console.error('Failed to persist settings:', error);
        // No revertir el estado UI, solo registrar el error
        set({ error: 'Los cambios se aplicaron pero podrían no persistir al recargar' });
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      set({ error: 'Error al actualizar la configuración' });
    }
  },

  addHistoryEntry: async (entry: ChatSession | EvaluationHistoryEntry) => {
    try {
      const isChatSession = (entry: ChatSession | EvaluationHistoryEntry): entry is ChatSession => {
        return 'messages' in entry && 'settings' in entry && 'chatState' in entry;
      };

      if (isChatSession(entry)) {
        // Filtrar duplicados antes de agregar
        const filteredHistory = get().chatHistory.filter(existingChat => 
          existingChat.id !== entry.id && 
          !(existingChat.chatState === entry.chatState && existingChat.recipe?.id === entry.recipe?.id)
        );

        await db.addChatEntry(entry);
        set({
          chatHistory: [...filteredHistory, entry]
        });
      } else {
        await db.addEvaluationEntry(entry);
        set(state => ({
          evaluationHistory: [...state.evaluationHistory, entry]
        }));
      }
    } catch (error) {
      console.error('Failed to add history entry:', error);
      set({ error: 'Failed to save history entry' });
    }
  },

  deleteHistoryEntry: async (id) => {
    try {
      await db.deleteHistoryEntry(id);
      set(state => ({
        history: state.history.filter(entry => entry.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      set({ error: 'Failed to delete history entry' });
    }
  },

  loadHistory: async () => {
    try {
      const [evaluationHistory, chatHistory] = await Promise.all([
        db.getAllEvaluationHistory(),
        db.getAllChatHistory()
      ]);
      set({ 
        evaluationHistory,
        chatHistory
      });
    } catch (error) {
      console.error('Failed to load history:', error);
      set({ error: 'Failed to load history' });
    }
  },

  addApiLog: (type, content) => {
    set(state => ({
      apiLogs: [...state.apiLogs, {
        type,
        content,
        timestamp: Date.now()
      }]
    }));
  },

  clearApiLogs: () => {
    set({ apiLogs: [] });
  },

  initializeChat: (recipe: Recipe, force?: boolean) => {
    const currentChat = get().currentChat;
    
    // Si hay un chat activo para otra recipe, guardarlo como 'last' antes de inicializar el nuevo
    if (currentChat && currentChat.recipe?.id !== recipe.id) {
      const chatToSave = {
        ...currentChat,
        chatState: 'last' as const,
        timestamp: Date.now()
      };
      get().addHistoryEntry(chatToSave);
    }

    // Solo inicializar si no hay chat activo, si es una recipe diferente, o si se fuerza
    if (!currentChat || currentChat.recipe?.id !== recipe.id || force) {
      const newChat: ChatSession = {
        id: uuidv4(),
        messages: [],
        recipe: recipe,
        settings: {
          model: get().settings.selectedModel,
          temperature: get().settings.temperature,
        },
        timestamp: Date.now(),
        chatState: 'current'
      };
      set({ currentChat: newChat });
    }
  },

  addChatMessage: (message: ChatMessage) => {
    set(state => {
      if (!state.currentChat) return state;
      
      const updatedChat = {
        ...state.currentChat,
        messages: [
          ...state.currentChat.messages, 
          { 
            ...message, 
            id: uuidv4(), // Asegurar ID único para cada mensaje
            timestamp: message.timestamp || Date.now() 
          }
        ]
      };
      
      return { currentChat: updatedChat };
    });
  },

  saveChatToHistory: async () => {
    const { currentChat } = get();
    if (!currentChat) return;

    try {
      // Filtrar el historial actual para eliminar cualquier versión anterior del mismo chat
      const filteredHistory = get().chatHistory.filter(chat => 
        chat.id !== currentChat.id && 
        !(chat.chatState === currentChat.chatState && chat.recipe?.id === currentChat.recipe?.id)
      );

      // Actualizar el estado con el historial filtrado más el chat actual
      set({
        chatHistory: [...filteredHistory, currentChat]
      });

      // Intentar actualizar primero, si falla entonces agregar
      const database = await db.getDB();
      try {
        await database.put('chatHistory', currentChat);
      } catch (error) {
        // Si falla la actualización, intentar agregar
        try {
          await database.add('chatHistory', currentChat);
        } catch (addError) {
          if (addError instanceof Error && addError.name === 'ConstraintError') {
            // Si ya existe, intentar actualizar una vez más
            await database.put('chatHistory', currentChat);
          } else {
            throw addError;
          }
        }
      }
    } catch (error) {
      console.error('Failed to save chat to history:', error);
      set({ error: 'Failed to save chat history' });
    }
  },

  loadChatHistory: async () => {
    try {
      const history = await db.getAllChatHistory();
      
      // Eliminar duplicados manteniendo la versión más reciente de cada estado por receta
      const uniqueChats = history.reduce((acc: ChatSession[], chat) => {
        const key = `${chat.recipe?.id}-${chat.chatState}`;
        const existingIndex = acc.findIndex(
          c => `${c.recipe?.id}-${c.chatState}` === key
        );
        
        if (existingIndex >= 0) {
          if (chat.timestamp > acc[existingIndex].timestamp) {
            acc[existingIndex] = chat;
          }
        } else {
          acc.push(chat);
        }
        return acc;
      }, []);

      set({ chatHistory: uniqueChats });
    } catch (error) {
      console.error('Failed to load chat history:', error);
      set({ error: 'Failed to load chat history' });
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      // Eliminar solo el chat específico
      await db.deleteChatEntry(chatId);

      // Actualizar el estado eliminando solo el chat seleccionado
      set(state => ({
        chatHistory: state.chatHistory.filter(chat => chat.id !== chatId)
      }));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      set({ error: 'Failed to delete chat' });
    }
  },

  loadChatsByRecipe: async (recipeId: string) => {
    try {
      const allChats = await db.getAllChatHistory();
      
      // Filtrar chats por receta y eliminar duplicados
      const recipeChats = allChats
        .filter(chat => chat.recipe?.id === recipeId)
        .reduce((unique: ChatSession[], chat) => {
          // Buscar si ya existe un chat con el mismo estado para esta receta
          const existingIndex = unique.findIndex(
            c => c.chatState === chat.chatState && c.recipe?.id === chat.recipe?.id
          );
          
          if (existingIndex >= 0) {
            // Si existe y el nuevo es más reciente, reemplazarlo
            if (chat.timestamp > unique[existingIndex].timestamp) {
              unique[existingIndex] = chat;
            }
          } else {
            unique.push(chat);
          }
          return unique;
        }, []);

      // Actualizar el estado global
      set(state => ({
        chatHistory: state.chatHistory
          .filter(chat => chat.recipe?.id !== recipeId)
          .concat(recipeChats)
      }));

      return recipeChats;
    } catch (error) {
      console.error('Failed to load chats by recipe:', error);
      return [];
    }
  },

  addEvaluationEntry: async (entry) => {
    try {
      await db.addEvaluationEntry(entry);
      set(state => ({
        evaluationHistory: [...state.evaluationHistory, entry]
      }));
    } catch (error) {
      console.error('Failed to add evaluation entry:', error);
      set({ error: 'Failed to save evaluation entry' });
    }
  },

  deleteEvaluationEntry: async (id) => {
    try {
      await db.deleteEvaluationEntry(id);
      set(state => ({
        evaluationHistory: state.evaluationHistory.filter(entry => entry.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete evaluation entry:', error);
      set({ error: 'Failed to delete evaluation entry' });
    }
  },

  loadEvaluationHistory: async () => {
    try {
      const history = await db.getAllEvaluationHistory();
      set({ evaluationHistory: history });
    } catch (error) {
      console.error('Failed to load evaluation history:', error);
      set({ error: 'Failed to load evaluation history' });
    }
  },

  deleteAllChatsForRecipe: async (recipeId: string) => {
    try {
      const chatsToDelete = get().chatHistory.filter(chat => chat.recipe?.id === recipeId);
      
      // Eliminar todos los chats de la recipe de la base de datos
      await Promise.all(chatsToDelete.map(chat => db.deleteChatEntry(chat.id)));

      // Actualizar el estado eliminando los chats de esta recipe
      set(state => ({
        chatHistory: state.chatHistory.filter(chat => chat.recipe?.id !== recipeId)
      }));
    } catch (error) {
      console.error('Failed to delete recipe chats:', error);
      set({ error: 'Failed to delete recipe chats' });
    }
  },

  initializeSplitTest: (recipeA: Recipe, recipeB: Recipe) => {
    const newSession: SplitTestSession = {
      id: uuidv4(),
      recipeA,
      recipeB,
      messages: [],
      timestamp: Date.now(),
      model: get().settings.selectedModel,
      temperature: get().settings.temperature
    };
    set({ currentSplitTest: newSession });
  },

  addSplitTestMessage: (message: Omit<SplitTestMessage, 'id' | 'timestamp'>) => {
    const currentTest = get().currentSplitTest;
    if (!currentTest) return;

    const newMessage: SplitTestMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    set({
      currentSplitTest: {
        ...currentTest,
        messages: [...currentTest.messages, newMessage]
      }
    });
  },

  addSplitTestFeedback: (messageId: string, feedback: Omit<SplitTestFeedback, 'timestamp'>) => {
    const currentTest = get().currentSplitTest;
    if (!currentTest) return;

    const updatedMessages = currentTest.messages.map(msg => 
      msg.id === messageId
        ? feedback.deleted 
          ? { ...msg, feedback: undefined } // Si deleted es true, eliminamos el feedback
          : { ...msg, feedback: { ...feedback, timestamp: Date.now() } }
        : msg
    );

    set({
      currentSplitTest: {
        ...currentTest,
        messages: updatedMessages
      }
    });
  },

  generateSplitTestSummary: async (sessionId: string) => {
    const session = get().splitTestHistory.find(s => s.id === sessionId) || get().currentSplitTest;
    if (!session) return;

    try {
      const messagesWithFeedback = session.messages
        .filter(msg => msg.feedback)
        .map(msg => ({
          userMessage: msg.userMessage,
          selectedResponse: msg.feedback?.selectedOption === 'A' ? msg.recipeA.response : msg.recipeB.response,
          feedback: msg.feedback?.feedback,
          recipe: msg.feedback?.selectedOption === 'A' ? session.recipeA : session.recipeB
        }));

      const promptForSummary = `Analiza la siguiente conversación de prueba A/B de prompts:

Receta A:
${session.recipeA.prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Receta B:
${session.recipeB.prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Mensajes y Feedback:
${messagesWithFeedback.map(m => `
Usuario: ${m.userMessage}
Respuesta Seleccionada: ${m.selectedResponse}
Feedback: ${m.feedback}
`).join('\n')}

Por favor:
1. Resume los principales hallazgos de la prueba
2. Identifica patrones en las respuestas preferidas
3. Genera una nueva prompt mejorada basada en el feedback
4. Explica las mejoras realizadas

Responde en formato JSON con esta estructura:
{
  "summary": "resumen detallado de los hallazgos",
  "improvedPrompt": "nueva prompt mejorada"
}`;

      const response = await fetch('http://localhost:3000/api/chat/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptForSummary,
          model: 'gpt-4o-mini',
          temperature: session.temperature,
          apiKey: get().settings.openaiApiKey
        })
      });

      if (!response.ok) throw new Error('Error al generar el resumen');

      const data = await response.json();
      const result = JSON.parse(data.response);

      const updatedSession = {
        ...session,
        summary: {
          content: result.summary,
          improvedPrompt: result.improvedPrompt,
          timestamp: Date.now()
        }
      };

      set({ currentSplitTest: updatedSession });
      await get().saveSplitTestSession();

    } catch (error) {
      console.error('Error al generar el resumen:', error);
      set({ error: 'Error al generar el resumen del split test' });
    }
  },

  saveSplitTestSession: async () => {
    const session = get().currentSplitTest;
    if (!session) return;

    try {
      await db.addSplitTestSession(session);
      set(state => ({
        splitTestHistory: [
          ...state.splitTestHistory.filter(s => s.id !== session.id),
          session
        ]
      }));
    } catch (error) {
      console.error('Error al guardar la sesión de split test:', error);
      set({ error: 'Error al guardar la sesión de split test' });
    }
  },

  loadSplitTestHistory: async () => {
    try {
      const history = await db.getAllSplitTestHistory();
      set({ splitTestHistory: history });
    } catch (error) {
      console.error('Error al cargar el historial de split tests:', error);
      set({ error: 'Error al cargar el historial de split tests' });
    }
  },

  deleteSplitTestSession: async (sessionId) => {
    try {
      await db.deleteSplitTestSession(sessionId);
      set(state => ({
        splitTestHistory: state.splitTestHistory.filter(session => session.id !== sessionId)
      }));
    } catch (error) {
      console.error('Error al eliminar la sesión de split test:', error);
      set({ error: 'Error al eliminar la sesión de split test' });
    }
  },

  setCurrentSplitTest: (session) => {
    set({ currentSplitTest: session });
  },
}));