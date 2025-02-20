import React, { useState, useEffect, useCallback } from 'react';
import { usePromptStore } from '../store/promptStore';
import { Send, Edit2, Trash, RefreshCw, Check } from 'lucide-react';
import type { Recipe, Prompt, ChatMessage, ChatSession } from '../types/common';
import { OPENAI_MODELS, CLAUDE_MODELS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export function ChatTest() {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const settings = usePromptStore(state => state.settings);
  const updateSettings = usePromptStore(state => state.updateSettings);
  const recipes = usePromptStore(state => state.recipes);
  const prompts = usePromptStore(state => state.prompts);
  const selectedRecipeId = usePromptStore(state => state.selectedRecipe);
  const selectRecipe = usePromptStore(state => state.selectRecipe);
  const initialized = usePromptStore(state => state.initialized);
  const currentChat = usePromptStore(state => state.currentChat);
  const initializeChat = usePromptStore(state => state.initializeChat);
  const addChatMessage = usePromptStore(state => state.addChatMessage);
  const saveChatToHistory = usePromptStore(state => state.saveChatToHistory);

  // Obtener la receta seleccionada
  const selectedRecipeData = selectedRecipeId ? recipes.find(r => r.id === selectedRecipeId) : null;

  // Usar los valores de settings directamente
  const [openAIModel, setOpenAIModel] = useState(settings.chatOpenAIModel);
  const [claudeModel, setClaudeModel] = useState(settings.chatClaudeModel);
  const [openAITemp, setOpenAITemp] = useState(settings.chatOpenAITemperature);
  const [claudeTemp, setClaudeTemp] = useState(settings.chatClaudeTemperature);

  // Sincronizar con settings cuando cambien
  useEffect(() => {
    setOpenAIModel(settings.chatOpenAIModel);
    setClaudeModel(settings.chatClaudeModel);
    setOpenAITemp(settings.chatOpenAITemperature);
    setClaudeTemp(settings.chatClaudeTemperature);
  }, [settings]);

  // Actualizar settings cuando cambien los valores locales
  const handleModelChange = (model: string, isOpenAI: boolean) => {
    if (isOpenAI) {
      setOpenAIModel(model);
      updateSettings({ chatOpenAIModel: model });
    } else {
      setClaudeModel(model);
      updateSettings({ chatClaudeModel: model });
    }
  };

  const handleTempChange = (temp: number, isOpenAI: boolean) => {
    if (isOpenAI) {
      setOpenAITemp(temp);
      updateSettings({ chatOpenAITemperature: temp });
    } else {
      setClaudeTemp(temp);
      updateSettings({ chatClaudeTemperature: temp });
    }
  };

  useEffect(() => {
    if (!initialized) {
      usePromptStore.getState().initializeStore();
    }
  }, [initialized]);

  useEffect(() => {
    if (selectedRecipeId) {
      const loadRecipeChats = async () => {
        const recipeChats = await usePromptStore.getState().loadChatsByRecipe(selectedRecipeId);
        // Solo cargar si no hay un chat actual
        if (!currentChat) {
          const currentChats = recipeChats.filter(chat => chat.chatState === 'current');
          if (currentChats.length > 0) {
            const lastCurrentChat = currentChats[currentChats.length - 1];
            usePromptStore.setState({ currentChat: lastCurrentChat });
          } else {
            const recipe = recipes.find(r => r.id === selectedRecipeId);
            if (recipe) {
              initializeChat(recipe, true);
            }
          }
        }
      };
      loadRecipeChats();
    }
  }, [selectedRecipeId, recipes, initializeChat, currentChat]);

  const validateRecipe = (recipe: Recipe | null) => {
    if (!recipe) return null;
    
    if (!Array.isArray(recipe.prompts)) {
      console.error('Recipe prompts is not an array');
      return null;
    }

    const fullPrompts = recipe.prompts
      .map((promptId: string) => prompts.find((p: Prompt) => p.id === promptId))
      .filter((p): p is Prompt => !!p);

    const validPrompts = fullPrompts.filter((p: Prompt) => {
      if (!p || !p.title || !p.content) {
        return false;
      }

      return true;
    });

    if (validPrompts.length === 0) {
      console.error('No hay prompts válidos en la receta');
      return null;
    }

    return {
      ...recipe,
      prompts: validPrompts
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setInput('');

    const validatedRecipe = validateRecipe(selectedRecipeData || null);
    if (!validatedRecipe || !currentChat) {
      console.error('No hay una receta válida seleccionada o chat inicializado');
      setIsLoading(false);
      return;
    }

    try {
      // Si estamos editando, actualizar el último registro de editHistory
      const editHistory = currentChat.editHistory || [];
      if (isEditing && editHistory.length > 0) {
        const lastEditIndex = editHistory.length - 1;
        const updatedEditHistory = [...editHistory];
        updatedEditHistory[lastEditIndex] = {
          ...updatedEditHistory[lastEditIndex],
          newContent: input
        };
        usePromptStore.setState({
          currentChat: {
            ...currentChat,
            editHistory: updatedEditHistory
          }
        });
      }

      const systemPrompt = validatedRecipe.prompts
        .map(prompt => `${prompt.title}:\n${prompt.content}`)
        .join('\n\n');

      // Agregar el mensaje del usuario a los chats correspondientes con timestamps únicos
      const baseTimestamp = Date.now();
      
      if (settings.openaiApiKey) {
        addChatMessage({
          role: 'user',
          content: input,
          model: openAIModel,
          temperature: openAITemp,
          timestamp: baseTimestamp
        });
      }

      if (settings.claudeApiKey) {
        addChatMessage({
          role: 'user',
          content: input,
          model: settings.chatClaudeModel,
          temperature: claudeTemp,
          timestamp: baseTimestamp + 1
        });
      }

      // Obtener los últimos 10 mensajes del chat actual
      const lastMessages = currentChat.messages.slice(-10);
      
      // Separar el historial por tipo de IA
      const openAIHistory = lastMessages
        .filter(msg => OPENAI_MODELS.some(m => msg.model === m.value))
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const claudeHistory = lastMessages
        .filter(msg => msg.model?.toLowerCase().includes('claude'))
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log('Historial de mensajes para OpenAI:', openAIHistory);
      console.log('Historial de mensajes para Claude:', claudeHistory);

      // Agregar el mensaje actual a los historiales correspondientes
      if (settings.openaiApiKey) {
        openAIHistory.push({
          role: 'user',
          content: input
        });
      }

      if (settings.claudeApiKey) {
        claudeHistory.push({
          role: 'user',
          content: input
        });
      }

      const handleOpenAISend = async () => {
        const temperature = openAITemp;
        console.log('Enviando mensaje a OpenAI con temperatura:', temperature);
        
        return fetch('http://localhost:3000/api/chat/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            model: openAIModel,
            temperature,
            apiKey: settings.openaiApiKey,
            systemPrompt,
            previousMessages: openAIHistory
          })
        });
      };

      const handleClaudeSend = async () => {
        const temperature = claudeTemp;
        console.log('Enviando mensaje a Claude con temperatura:', temperature);
        console.log('Modelo de Claude:', claudeModel);
        console.log('Historial de mensajes enviados a Claude:', claudeHistory);
        
        return fetch('http://localhost:3000/api/chat/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            model: claudeModel,
            temperature,
            apiKey: settings.claudeApiKey,
            systemPrompt,
            previousMessages: claudeHistory
          })
        });
      };

      const responses = await Promise.all(
        [
          settings.openaiApiKey && handleOpenAISend(),
          settings.claudeApiKey && handleClaudeSend()
        ].filter((p): p is Promise<Response> => p instanceof Promise)
      );

      if (responses.some(response => !response.ok)) {
        throw new Error('Error en la comunicación con las APIs');
      }

      const responseData = await Promise.all(responses.map(r => r.json()));

      // Add responses to chat with unique timestamps
      responseData.forEach((data, index) => {
        const isOpenAI = index === 0 && settings.openaiApiKey;
        addChatMessage({
          role: 'assistant',
          content: data.response,
          model: isOpenAI ? openAIModel : claudeModel,
          temperature: isOpenAI ? openAITemp : claudeTemp,
          timestamp: baseTimestamp + 2 + index // Aseguramos timestamps únicos para las respuestas
        });
      });

      // Save chat to history
      await saveChatToHistory();

    } catch (error) {
      console.error('Error en la comunicación con las IAs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLastMessage = () => {
    if (!currentChat || currentChat.messages.length === 0) return;
    
    // Encontrar el último mensaje del usuario
    const lastUserMessageIndex = [...currentChat.messages]
      .reverse()
      .findIndex(msg => msg.role === 'user');
      
    if (lastUserMessageIndex === -1) return;
    
    // Convertir el índice reverso a índice real
    const actualIndex = currentChat.messages.length - 1 - lastUserMessageIndex;
    
    // Obtener el timestamp del último mensaje del usuario
    const userMessageTimestamp = currentChat.messages[actualIndex].timestamp;
    
    // Guardar el mensaje original en el historial de ediciones
    const editHistoryEntry = {
      timestamp: Date.now(),
      previousContent: currentChat.messages[actualIndex].content,
      newContent: '', // Se actualizará cuando se envíe el nuevo mensaje
      model: currentChat.messages[actualIndex].model
    };
    
    // Establecer el mensaje en el input y activar modo edición
    setInput(currentChat.messages[actualIndex].content);
    setIsEditing(true);
    
    // Filtrar los mensajes a mantener (anteriores al timestamp del mensaje editado)
    const newMessages = currentChat.messages.filter(msg => msg.timestamp < userMessageTimestamp);
    
    usePromptStore.setState({
      currentChat: {
        ...currentChat,
        messages: newMessages,
        editHistory: [
          ...(currentChat.editHistory || []),
          editHistoryEntry
        ]
      }
    });

    // Guardar el estado actual en el historial
    saveChatToHistory();
  };

  const handleDeleteLastMessage = () => {
    if (!currentChat || currentChat.messages.length === 0) return;
    
    // Encontrar el último mensaje del usuario
    const lastUserMessageIndex = [...currentChat.messages]
      .reverse()
      .findIndex(msg => msg.role === 'user');
      
    if (lastUserMessageIndex === -1) return;
    
    // Convertir el índice reverso a índice real
    const actualIndex = currentChat.messages.length - 1 - lastUserMessageIndex;
    
    // Obtener el timestamp del último mensaje del usuario
    const userMessageTimestamp = currentChat.messages[actualIndex].timestamp;
    
    // Filtrar los mensajes a mantener
    const newMessages = currentChat.messages.filter(msg => {
      // Mantener todos los mensajes anteriores al timestamp del último mensaje del usuario
      return msg.timestamp < userMessageTimestamp;
    });
    
    // Guardar los mensajes eliminados
    const deletedMessages = currentChat.messages
      .filter(msg => msg.timestamp >= userMessageTimestamp)
      .map(msg => ({
        timestamp: msg.timestamp,
        content: msg.content,
        model: msg.model,
        role: msg.role,
        temperature: msg.temperature
      }));
    
    usePromptStore.setState({
      currentChat: {
        ...currentChat,
        messages: newMessages,
        deletedMessages: [
          ...(currentChat.deletedMessages || []),
          ...deletedMessages
        ]
      }
    });

    // Guardar el estado actual en el historial
    saveChatToHistory();
  };

  const handleResetChat = async () => {
    if (!selectedRecipeData || !currentChat) return;
    
    try {
      // Marcar el chat actual como último y guardarlo
      const lastChat = {
        ...currentChat,
        id: uuidv4(),
        wasReset: true,
        timestamp: Date.now(),
        chatState: 'last' as const
      };

      // Guardar el last chat usando el store
      await usePromptStore.getState().addHistoryEntry(lastChat);

      // Crear y establecer el nuevo chat current
      const newChat: ChatSession = {
        id: uuidv4(),
        recipe: selectedRecipeData,
        messages: [],
        timestamp: Date.now(),
        chatState: 'current' as const,
        settings: {
          model: settings.chatOpenAIModel || settings.chatClaudeModel,
          temperature: settings.chatOpenAITemperature || settings.chatClaudeTemperature
        }
      };

      // Actualizar el estado y la base de datos
      usePromptStore.setState({ currentChat: newChat });
      await usePromptStore.getState().saveChatToHistory();
    } catch (error) {
      console.error('Error al reiniciar el chat:', error);
      alert('Error al reiniciar el chat');
    }
  };

  const handleRestoreChat = useCallback(async (chatToRestore: ChatSession) => {
    if (!currentChat) return;
    
    try {
      // Guardamos el chat actual como último chat
      const currentChatToSave = {
        ...currentChat,
        chatState: 'last' as const,
        timestamp: Date.now()
      };

      // Guardamos el chat actual en el historial
      usePromptStore.setState({
        currentChat: currentChatToSave
      });
      await saveChatToHistory();

      // Restauramos el chat seleccionado como actual
      const restoredChat = {
        ...chatToRestore,
        chatState: 'current' as const,
        timestamp: Date.now()
      };

      // Actualizamos al chat restaurado
      usePromptStore.setState({ currentChat: restoredChat });
      console.log('Chat restaurado exitosamente');
    } catch (error) {
      console.error('Error al restaurar el chat:', error);
      alert('Error al restaurar el chat');
    }
  }, [currentChat, saveChatToHistory]);

  // Exportamos la función para que pueda ser usada desde HistoryView
  useEffect(() => {
    usePromptStore.setState({ handleRestoreChat });
  }, [handleRestoreChat]);

  const ChatWindow = ({ title, hasApiKey = true }: { 
    messages: ChatMessage[], 
    title: string, 
    hasApiKey?: boolean
  }) => {
    const isOpenAI = title.includes('OpenAI');
    const models = isOpenAI ? OPENAI_MODELS : CLAUDE_MODELS;
    const [model, setModel] = isOpenAI 
      ? [openAIModel, (m: string) => handleModelChange(m, true)]
      : [claudeModel, (m: string) => handleModelChange(m, false)];
    const [temp, setTemp] = isOpenAI
      ? [openAITemp, (t: number) => handleTempChange(t, true)]
      : [claudeTemp, (t: number) => handleTempChange(t, false)];

    // Filtrar mensajes por tipo de IA (OpenAI o Claude)
    const filteredMessages = currentChat?.messages
      .filter(msg => {
        if (isOpenAI) {
          // Para OpenAI, incluir mensajes de cualquier modelo de OpenAI
          return OPENAI_MODELS.some(m => msg.model === m.value);
        } else {
          // Para Claude, incluir mensajes del modelo específico
          return msg.model === claudeModel;
        }
      }) || [];

    console.log(`Modelo de Claude actual:`, claudeModel);
    console.log(`Mensajes filtrados para ${title}:`, filteredMessages);

    // Referencia para el contenedor de mensajes
    const messagesContainerRef = React.useRef<HTMLDivElement>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    // Función para scroll al último mensaje
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    // Efecto para scroll cuando hay nuevos mensajes
    React.useEffect(() => {
      const scrollTimeout = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(scrollTimeout);
    }, [filteredMessages, currentChat?.messages?.length]);

    // Forzar scroll después de que se complete la animación de carga
    React.useEffect(() => {
      if (!isLoading) {
        const loadingTimeout = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(loadingTimeout);
      }
    }, [isLoading]);

    // Cleanup function para los event listeners
    React.useEffect(() => {
      return () => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const clone = container.cloneNode(true);
          container.parentNode?.replaceChild(clone, container);
        }
      };
    }, []);

    return (
      <div className="flex-1 flex flex-col h-[600px] bg-gray-800/30 rounded-lg">
        <div className="flex-none bg-gray-800/50 p-3 rounded-t-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-200">
              {title}
              {!hasApiKey && <span className="text-sm text-gray-400 ml-2">(API Key no configurada)</span>}
            </h3>
          </div>
          
          {hasApiKey && (
            <div className="flex gap-4 items-center">
              <div className="flex-1 max-w-[200px]">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2 py-1 bg-gray-700/50 border border-gray-600 rounded-md 
                           text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <span className="text-xs text-gray-400 whitespace-nowrap">Temp:</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-300 w-8 text-right">
                  {temp.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
          {hasApiKey ? (
            <>
              <div className="space-y-4">
                {filteredMessages.map((message, index) => {
                  const isLastUserMessage = 
                    message.role === 'user' && 
                    index === filteredMessages.map(m => m.role).lastIndexOf('user');

                  return (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div
                        className={`relative group max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">{message.content}</p>
                        <div className="text-xs opacity-75 mt-1 flex justify-between items-center">
                          <span>{message.model}</span>
                          <span>temp: {message.temperature?.toFixed(1)}</span>
                        </div>

                        {isLastUserMessage && (
                          <div className="absolute -top-8 right-0 hidden group-hover:flex gap-2 bg-gray-800/90 p-1 rounded-md shadow-lg">
                            <button
                              onClick={handleEditLastMessage}
                              disabled={isLoading}
                              className="p-1 hover:bg-yellow-600/20 rounded transition-colors"
                              title="Editar mensaje"
                            >
                              <Edit2 className="w-4 h-4 text-yellow-500" />
                            </button>
                            <button
                              onClick={handleDeleteLastMessage}
                              disabled={isLoading}
                              className="p-1 hover:bg-red-600/20 rounded transition-colors"
                              title="Borrar mensaje"
                            >
                              <Trash className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Configura la API Key en Settings para usar este modelo
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex-none flex justify-between items-center">
        <select
          value={selectedRecipeId || ''}
          onChange={(e) => selectRecipe(e.target.value || null)}
          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                   text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar Recipe</option>
          {recipes.map(recipe => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => handleResetChat().catch(console.error)}
          disabled={!selectedRecipeData || isLoading}
          className="ml-4 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 
                   transition-colors duration-200 disabled:opacity-50 
                   disabled:cursor-not-allowed"
          title="Reiniciar chat"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex space-x-4 min-h-0">
        <ChatWindow
          messages={currentChat?.messages || []}
          title={`OpenAI (${openAIModel})`}
          hasApiKey={!!settings.openaiApiKey}
        />
        <ChatWindow
          messages={currentChat?.messages || []}
          title={`Claude (${claudeModel})`}
          hasApiKey={!!settings.claudeApiKey}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex-none">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isEditing ? "Editando último mensaje..." : "Escribe tu mensaje..."}
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                     text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent"
            disabled={isLoading || !selectedRecipeData || !currentChat}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !selectedRecipeData || !currentChat}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 
                     transition-colors duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            {isEditing ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
} 