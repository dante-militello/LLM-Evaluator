import React from 'react';
import { usePromptStore } from '../store/promptStore';
import { Terminal, Trash2 } from 'lucide-react';

interface MemoryEntry {
  content: string;
  importance: number;
  reason: string;
  timestamp: number;
}

interface LogContent {
  recipe?: {
    title: string;
    description?: string;
  };
  message?: string;
  settings?: {
    model: string;
    temperature: number;
    systemPrompt?: string;
    previousMessages?: Array<{
      role: 'user';
      content: string;
      response: string;
    }>;
  };
  response?: string;
  memory?: {
    entries?: MemoryEntry[];
  };
}

export function ConsoleView() {
  const { apiLogs } = usePromptStore();

  const formatLogContent = (content: unknown) => {
    const logContent = content as LogContent;
    const formattedContent: LogContent = {};

    if (logContent.recipe) {
      formattedContent.recipe = {
        title: logContent.recipe.title,
        description: logContent.recipe.description
      };
      formattedContent.message = logContent.message;
      
      if (logContent.settings) {
        formattedContent.settings = {
          model: logContent.settings.model,
          temperature: logContent.settings.temperature,
          systemPrompt: logContent.settings.systemPrompt,
          previousMessages: logContent.settings.previousMessages?.map(msg => ({
            role: msg.role,
            content: msg.content,
            response: msg.response
          }))
        };
      }

      if (logContent.response) {
        formattedContent.response = logContent.response;
      }

      if (logContent.memory?.entries) {
        formattedContent.memory = {
          entries: logContent.memory.entries.map(entry => ({
            content: entry.content,
            importance: entry.importance,
            reason: entry.reason,
            timestamp: entry.timestamp
          }))
        };
      }

      return formattedContent;
    }

    return content;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-200">Consola de API</h2>
        </div>
        <button
          onClick={() => usePromptStore.getState().clearApiLogs()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 
                     hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Limpiar consola
        </button>
      </div>

      <div className="space-y-4">
        {[...apiLogs]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((log) => (
          <div
            key={log.timestamp}
            className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 bg-gray-700/30">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  log.type === 'request' ? 'bg-blue-500/20 text-blue-400' : 
                  'bg-green-500/20 text-green-400'
                }`}>
                  {log.type === 'request' ? 'Request' : 'Response'}
                </span>
              </div>
            </div>
            <div className="p-4 font-mono text-sm text-gray-300 overflow-x-auto">
              {log.type === 'request' && (() => {
                const logContent = log.content as LogContent;
                return logContent?.settings?.previousMessages && (
                  <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Mensajes Anteriores:</h4>
                    <div className="space-y-2">
                      {logContent.settings.previousMessages.map((msg, idx) => (
                        <div key={idx} className="pl-2 border-l-2 border-gray-600">
                          <p className="text-gray-300">Usuario: {msg.content}</p>
                          <p className="text-gray-400">Respuesta: {msg.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <pre>{JSON.stringify(formatLogContent(log.content), null, 2)}</pre>
            </div>
          </div>
        ))}

        {apiLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay registros de API disponibles
          </div>
        )}
      </div>
    </div>
  );
} 