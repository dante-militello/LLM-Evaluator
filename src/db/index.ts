import { openDB, IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from '../constants';
import type { Message, Prompt, Recipe, Settings, ChatSession, SplitTestSession, EvaluationHistoryEntry } from '../store/promptStore';

const DB_NAME = 'promptEvaluatorDB';
const DB_VERSION = 8;

let db: IDBPDatabase | null = null;
let dbInitPromise: Promise<IDBPDatabase> | null = null;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('prompts')) {
        db.createObjectStore('prompts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
        await settingsStore.put({
          ...DEFAULT_SETTINGS,
          id: 'current'
        });
      }
      if (!db.objectStoreNames.contains('evaluationHistory')) {
        db.createObjectStore('evaluationHistory', { keyPath: 'id' })
          .createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('chatHistory')) {
        db.createObjectStore('chatHistory', { keyPath: 'id' })
          .createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('splitTestHistory')) {
        const splitTestStore = db.createObjectStore('splitTestHistory', { keyPath: 'id' });
        splitTestStore.createIndex('timestamp', 'timestamp');
      }

      // Migración segura
      if (oldVersion < 7) {
        try {
          // Eliminar las tiendas antiguas si existen
          if (db.objectStoreNames.contains('evaluationHistory')) {
            db.deleteObjectStore('evaluationHistory');
          }
          if (db.objectStoreNames.contains('chatHistory')) {
            db.deleteObjectStore('chatHistory');
          }

          // Crear nuevas tiendas
          const evaluationStore = db.createObjectStore('evaluationHistory', { keyPath: 'id' });
          evaluationStore.createIndex('timestamp', 'timestamp');

          const chatStore = db.createObjectStore('chatHistory', { keyPath: 'id' });
          chatStore.createIndex('timestamp', 'timestamp');
          chatStore.createIndex('recipeId', 'recipe.id');
        } catch (error) {
          console.error('Error during migration:', error);
        }
      }
    },
  });
};

export const getDB = async () => {
  if (db) return db;
  
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const database = await initDB();
        db = database;
        return database;
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
      } finally {
        dbInitPromise = null;
      }
    })();
  }
  
  return dbInitPromise;
};

export async function updateSettings(settings: Settings): Promise<void> {
  const database = await getDB();
  try {
    // Asegurarse de que la base de datos está lista
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tx = database.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    await store.put({ ...settings, id: 'current' });
    await tx.done;
    
    console.log('Settings updated successfully');
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

export async function getSettings(): Promise<Settings> {
  const database = await getDB();
  try {
    const settings = await database.get('settings', 'current');
    if (!settings) {
      const defaultSettings = { ...DEFAULT_SETTINGS, id: 'current' };
      await updateSettings(defaultSettings);
      return defaultSettings;
    }
    return settings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function getAllPrompts(): Promise<Prompt[]> {
  const database = await getDB();
  return database.getAll('prompts');
}

export async function getAllMessages(): Promise<Message[]> {
  const database = await getDB();
  return database.getAll('messages');
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const database = await getDB();
  return database.getAll('recipes');
}

export async function addPrompt(prompt: Prompt): Promise<void> {
  const database = await getDB();
  await database.add('prompts', prompt);
}

export async function addMessage(message: Message): Promise<void> {
  const database = await getDB();
  await database.add('messages', message);
}

export async function addRecipe(recipe: Recipe): Promise<void> {
  const database = await getDB();
  await database.add('recipes', recipe);
}

export async function updateMessage(message: Message): Promise<void> {
  const database = await getDB();
  try {
    const tx = database.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    await store.put(message);
    await tx.done;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

export async function updateRecipe(recipe: Recipe): Promise<void> {
  const database = await getDB();
  await database.put('recipes', recipe);
}

export async function deletePrompt(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('prompts', id);
}

export async function deleteMessage(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('messages', id);
}

export async function deleteRecipe(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('recipes', id);
}

export async function updatePrompt(prompt: Prompt): Promise<void> {
  const database = await getDB();
  await database.put('prompts', prompt);
}

export async function addHistoryEntry(entry: ChatSession | EvaluationHistoryEntry): Promise<void> {
  const database = await getDB();
  const historyEntry = {
    ...entry,
    id: entry.id || Date.now().toString(),
    timestamp: entry.timestamp || Date.now()
  };
  
  try {
    await database.add('evaluationHistory', historyEntry);
    console.log('Chat history entry saved successfully:', historyEntry.id);
  } catch (error) {
    console.error('Error saving chat history entry:', error);
    throw error;
  }
}

export async function getAllHistory(): Promise<(ChatSession | EvaluationHistoryEntry)[]> {
  const database = await getDB();
  try {
    const history = await database.getAllFromIndex('evaluationHistory', 'timestamp');
    console.log(`Loaded ${history.length} chat history entries`);
    return history;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const database = await getDB();
  try {
    await database.delete('evaluationHistory', id);
    console.log('Chat history entry deleted:', id);
  } catch (error) {
    console.error('Error deleting chat history entry:', error);
    throw error;
  }
}

export async function addEvaluationEntry(entry: EvaluationHistoryEntry): Promise<void> {
  const database = await getDB();
  const historyEntry = {
    ...entry,
    id: entry.id || Date.now().toString(),
    timestamp: entry.timestamp || Date.now()
  };
  
  try {
    await database.add('evaluationHistory', historyEntry);
    console.log('Evaluation history entry saved successfully:', historyEntry.id);
  } catch (error) {
    console.error('Error saving evaluation history entry:', error);
    throw error;
  }
}

export async function getAllEvaluationHistory(): Promise<EvaluationHistoryEntry[]> {
  const database = await getDB();
  try {
    const history = await database.getAllFromIndex('evaluationHistory', 'timestamp');
    console.log(`Loaded ${history.length} evaluation history entries`);
    return history;
  } catch (error) {
    console.error('Error loading evaluation history:', error);
    return [];
  }
}

export async function deleteEvaluationEntry(id: string): Promise<void> {
  const database = await getDB();
  try {
    await database.delete('evaluationHistory', id);
    console.log('Evaluation history entry deleted:', id);
  } catch (error) {
    console.error('Error deleting evaluation history entry:', error);
    throw error;
  }
}

export async function addChatEntry(entry: ChatSession): Promise<void> {
  const database = await getDB();
  const chatEntry = {
    ...entry,
    id: entry.id || Date.now().toString(),
    timestamp: entry.timestamp || Date.now()
  };
  
  try {
    await database.add('chatHistory', chatEntry);
    console.log('Chat history entry saved successfully:', chatEntry.id);
  } catch (error) {
    console.error('Error saving chat history entry:', error);
    throw error;
  }
}

export async function getAllChatHistory(): Promise<ChatSession[]> {
  const database = await getDB();
  try {
    const history = await database.getAllFromIndex('chatHistory', 'timestamp');
    console.log(`Loaded ${history.length} chat history entries`);
    return history;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export async function deleteChatEntry(id: string): Promise<void> {
  const database = await getDB();
  try {
    await database.delete('chatHistory', id);
    console.log('Chat history entry deleted:', id);
  } catch (error) {
    console.error('Error deleting chat history entry:', error);
    throw error;
  }
}

export async function getChatsByRecipe(recipeId: string): Promise<ChatSession[]> {
  const database = await getDB();
  try {
    const tx = database.transaction('chatHistory', 'readonly');
    const store = tx.objectStore('chatHistory');
    const index = store.index('recipeId');
    const chats = await index.getAll(recipeId);
    console.log(`Loaded ${chats.length} chats for recipe ${recipeId}`);
    return chats;
  } catch (error) {
    console.error('Error loading chats by recipe:', error);
    return [];
  }
}

export async function addSplitTestSession(session: SplitTestSession): Promise<void> {
  const database = await getDB();
  try {
    await database.add('splitTestHistory', session);
    console.log('Split test session saved successfully:', session.id);
  } catch (error) {
    console.error('Error saving split test session:', error);
    throw error;
  }
}

export async function getAllSplitTestHistory(): Promise<SplitTestSession[]> {
  const database = await getDB();
  try {
    const history = await database.getAllFromIndex('splitTestHistory', 'timestamp');
    console.log(`Loaded ${history.length} split test sessions`);
    return history;
  } catch (error) {
    console.error('Error loading split test history:', error);
    return [];
  }
}

export async function deleteSplitTestSession(id: string): Promise<void> {
  const database = await getDB();
  try {
    await database.delete('splitTestHistory', id);
    console.log('Split test session deleted:', id);
  } catch (error) {
    console.error('Error deleting split test session:', error);
    throw error;
  }
}