import React, { useState, useRef, useEffect } from "react";
import { usePromptStore } from "../store/promptStore";
import { Send, ThumbsUp, Check, Brain, ChevronDown, Star, ThumbsDown, Download } from "lucide-react";
import type { Recipe, Prompt } from "../store/promptStore";
import { ALL_MODELS } from "../constants";
import type {
  MemoryEntry,
  SplitTestSession,
  SplitTestMessage,
} from "../types/splitTest";
import html2canvas from 'html2canvas';

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

interface PromptChange {
  promptTitle: string;
  action: 'MANTENER' | 'MODIFICAR' | 'ELIMINAR';
  currentContent: string | null;
  suggestedContent: string | null;
  changes: SpecificChange[];
  explanation: string;
}

interface NewPromptSuggestion {
  title: string;
  content: string;
  purpose: string;
  implementation: 'A' | 'B' | 'AMBAS';
}

interface Analysis {
  analysis: {
    summary: string;
    patternsFavoredResponses: string;
    recipeAAnalysis: string;
    recipeBAnalysis: string;
  };
  promptChanges: {
    recipeA: PromptChange[];
    recipeB: PromptChange[];
  };
  newPrompts: {
    suggested: NewPromptSuggestion[];
  };
}

interface SpecificChange {
  type: 'AGREGAR' | 'MODIFICAR' | 'ELIMINAR';
  before: string | null;
  after: string | null;
  explanation: string;
}

const MEMORY_ANALYSIS_PROMPT = `Analiza el siguiente mensaje del usuario y determina si contiene información relevante sobre una problemática personal, emocional o crítica que podría ser importante para un contexto de terapia o análisis psicológico. 
Considera:
1. Situaciones emocionales complejas o conflictos internos.
2. Dificultades personales que requieran seguimiento o reflexión a futuro.
3. Experiencias significativas o eventos traumáticos.
4. Metas o deseos profundos relacionados con el bienestar emocional.
5. Temas que puedan ayudar a entender mejor las necesidades del usuario en terapia.

Ignora:
1. Detalles triviales o de bajo impacto emocional (como preferencias sobre comidas o lugares).
2. Información no relacionada con el bienestar emocional o mental.

Responde en formato JSON con esta estructura:
{
  "isRelevant": boolean,
  "importance": number (1-10),
  "reason": "explicación de por qué es relevante o no",
  "content": "el contenido específico a recordar (si es relevante)"
}`;

// Función para procesar las respuestas y extraer THINK y RESPONSE
const processResponse = (response: string) => {
  // Primero, limpiar cualquier etiqueta incompleta o mal formada
  const cleanedResponse = response
    // Eliminar todas las etiquetas RESPONSE y THINK
    .replace(/<\/?RESPONSE>/g, '')
    .replace(/<\/?THINK>/g, '');

  // Extraer el primer THINK y RESPONSE encontrados
  const thinkMatch = response.match(/<THINK>([\s\S]*?)<\/THINK>/);
  const responseMatch = response.match(/<RESPONSE>([\s\S]*?)<\/RESPONSE>/);
  
  // Si no hay etiquetas, devolver el texto original limpio como respuesta
  if (!thinkMatch && !responseMatch) {
    return {
      think: null,
      response: cleanedResponse.trim()
    };
  }
  
  // Extraer el contenido de las etiquetas
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
  const responseContent = responseMatch ? responseMatch[1].trim() : null;
  
  // Si hay ambas etiquetas, usar sus contenidos
  if (thinkContent && responseContent) {
    return {
      think: thinkContent,
      response: responseContent
    };
  }
  
  // Si solo hay una etiqueta THINK, usar el resto como respuesta
  if (thinkContent && !responseContent) {
    // Eliminar la parte de THINK del texto original para obtener la respuesta
    const remainingText = response.replace(/<THINK>[\s\S]*?<\/THINK>/g, '').trim();
    // Eliminar cualquier etiqueta RESPONSE que pueda estar en el texto restante
    const cleanedText = remainingText.replace(/<\/?RESPONSE>/g, '').trim();
    return {
      think: thinkContent,
      response: cleanedText || cleanedResponse.trim()
    };
  }
  
  // Si solo hay una etiqueta RESPONSE, usar el resto como think
  if (!thinkContent && responseContent) {
    // Eliminar la parte de RESPONSE del texto original para obtener el think
    const remainingText = response.replace(/<RESPONSE>[\s\S]*?<\/RESPONSE>/g, '').trim();
    // Eliminar cualquier etiqueta THINK que pueda estar en el texto restante
    const cleanedText = remainingText.replace(/<\/?THINK>/g, '').trim();
    return {
      think: cleanedText || null,
      response: responseContent
    };
  }
  
  // Caso por defecto (no debería llegar aquí)
  return {
    think: thinkContent,
    response: responseContent || cleanedResponse.trim()
  };
};

// Componente para mostrar una respuesta procesada
const FormattedResponse = ({ content, showThinks }: { content: string, showThinks: boolean }) => {
  const processed = processResponse(content);
  
  if (!processed.think) {
    // Asegurarse de que no haya etiquetas en el texto
    const cleanedContent = content.replace(/<\/?(?:THINK|RESPONSE)>/g, '').trim();
    return <p className="text-sm text-gray-200">{cleanedContent}</p>;
  }
  
  return (
    <div className="space-y-3">
      {processed.think && showThinks && (
        <div className="bg-gray-800/70 p-3 rounded-md border-l-2 border-yellow-500">
          <h4 className="text-xs font-medium text-yellow-400 mb-1">THINK</h4>
          <p className="text-sm text-gray-300">{processed.think}</p>
        </div>
      )}
      {processed.response && (
        <div className={`${showThinks ? "bg-gray-700 p-3 rounded-md border-l-2 border-blue-500" : ""}`}>
          {showThinks && <h4 className="text-xs font-medium text-blue-400 mb-1">RESPONSE</h4>}
          <p className="text-sm text-gray-200">{processed.response}</p>
        </div>
      )}
    </div>
  );
};

export function SplitTest() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);
  const [showThinks, setShowThinks] = useState(true);
  const [messageStates, setMessageStates] = useState<{
    [messageId: string]: {
      selectedResponse: "A" | "B" | null;
      feedbackMessage: string;
      reaction: 'like' | 'dislike' | null;
      dislikeReason?: string;
    };
  }>({});
  const currentSplitTest: SplitTestSession | null = usePromptStore(
    (state) => state.currentSplitTest
  );
  const messages: SplitTestMessage[] = currentSplitTest?.messages || [];

  const [isMemoryExpanded, setIsMemoryExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const settings = usePromptStore((state) => state.settings);
  const recipes = usePromptStore((state) => state.recipes);
  const prompts = usePromptStore((state) => state.prompts);
  const initializeSplitTest = usePromptStore(
    (state) => state.initializeSplitTest
  );
  const addSplitTestMessage = usePromptStore(
    (state) => state.addSplitTestMessage
  );
  const addSplitTestFeedback = usePromptStore(
    (state) => state.addSplitTestFeedback
  );
  const saveSplitTestSession = usePromptStore(
    (state) => state.saveSplitTestSession
  );
  const addApiLog = usePromptStore((state) => state.addApiLog);
  const setCurrentSplitTest = usePromptStore(
    (state) => state.setCurrentSplitTest
  );

  const isPrompt = (p: unknown): p is Prompt =>
    Boolean(p) &&
    typeof p === "object" &&
    p !== null &&
    "content" in p &&
    "title" in p;

  const getFullPrompts = (recipe: Recipe) => {
    const recipePrompts = recipe.prompts
      .map((promptId) => prompts.find((p: Prompt) => p.id === promptId))
      .filter(
        (prompt): prompt is Prompt => prompt !== undefined && isPrompt(prompt)
      );

    if (recipePrompts.length === 0) {
      console.warn("No se encontraron prompts para la recipe:", recipe.title);
      return "";
    }

    return recipePrompts
      .map((prompt) => `${prompt.title}:\n${prompt.content}`)
      .join("\n\n");
  };

  const getModelConfig = (modelValue: string): ModelConfig => {
    const modelInfo = ALL_MODELS.find((m) => m.value === modelValue);
    if (!modelInfo) throw new Error("Modelo no válido");

    const config: ModelConfig = {
      provider: modelInfo.provider,
      model: modelInfo.value,
      apiKey:
        modelInfo.provider === "openai"
          ? settings.openaiApiKey
          : settings.deepseekApiKey,
    };

    return config;
  };

  const makeModelRequest = async (
    message: string,
    systemPrompt: string,
    modelConfig: ModelConfig,
    isRecipeA: boolean
  ) => {
    const endpoint = `http://localhost:3000/api/chat/${modelConfig.provider}`;
    console.log('=== Iniciando solicitud al servidor ===');
    console.log('Endpoint:', endpoint);
    console.log('Provider:', modelConfig.provider);
    console.log('Model:', modelConfig.model);
    console.log('Recipe:', isRecipeA ? 'A' : 'B');

    // Obtener los últimos 15 mensajes para contexto
    const previousMessages = currentSplitTest?.messages.slice(-15).flatMap(msg => [
      {
        role: 'user',
        content: msg.userMessage
      },
      {
        role: 'assistant',
        content: isRecipeA ? msg.recipeA.response : msg.recipeB.response
      }
    ]);

    console.log(`=== Mensajes Anteriores para Recipe ${isRecipeA ? 'A' : 'B'} ===`);
    console.log('Cantidad de mensajes:', previousMessages?.length || 0);
    console.log('Mensajes:', JSON.stringify(previousMessages, null, 2));

    const requestBody = {
      message,
      model: modelConfig.model,
      apiKey: modelConfig.apiKey,
      systemPrompt,
      temperature: settings.temperature,
      frequencyPenalty: settings.frequencyPenalty,
      presencePenalty: settings.presencePenalty,
      previousMessages: previousMessages || []
    };

    console.log('=== Request Body ===');
    console.log(JSON.stringify(requestBody, null, 2));

    try {
      console.log('=== Enviando solicitud ===');
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody),
      });

      console.log('=== Respuesta recibida ===');
      console.log('Status:', response.status);
      console.log('OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', errorText);
        throw new Error(
          "Error en la comunicación con la API: " + errorText
        );
      }

      const responseData = await response.json();
      console.log('=== Datos de respuesta ===');
      console.log(JSON.stringify(responseData, null, 2));

      return responseData;
    } catch (error) {
      console.error('=== Error en la solicitud ===');
      console.error(error);
      throw error;
    }
  };

  const analyzeForMemory = async (message: string) => {
    try {
      const response = await fetch("http://localhost:3000/api/chat/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${MEMORY_ANALYSIS_PROMPT}\n\nMensaje del usuario: "${message}"`,
          model: "gpt-3.5-turbo",
          temperature: 0.3,
          apiKey: settings.openaiApiKey,
        }),
      });

      if (!response.ok) throw new Error("Error al analizar la memoria");

      const data = await response.json();
      const analysis = JSON.parse(data.response);

      if (analysis.isRelevant) {
        const memoryEntry: MemoryEntry = {
          id: crypto.randomUUID(),
          content: analysis.content,
          importance: analysis.importance,
          reason: analysis.reason,
          timestamp: Date.now(),
        };

        // Actualizar la memoria en el split test actual
        if (currentSplitTest) {
          const updatedTest = {
            ...currentSplitTest,
            memory: {
              entries: [
                ...(currentSplitTest.memory?.entries || []),
                memoryEntry,
              ],
              lastAnalyzed: Date.now(),
            },
          };
          setCurrentSplitTest(updatedTest);
        }
      }

      return analysis;
    } catch (error) {
      console.error("Error al analizar la memoria:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentSplitTest) return;

    setIsLoading(true);
    setInput("");
    setMessageStates({});
    setLocalError(null);

    try {
      console.log('=== Iniciando nuevo mensaje ===');
      console.log('Input:', input);
      console.log('Current Split Test:', currentSplitTest);

      // Analizar el mensaje para memoria
      const memoryAnalysis = await analyzeForMemory(input);
      console.log('Memory Analysis:', memoryAnalysis);

      const { recipeA, recipeB } = currentSplitTest;
      console.log('Recipe A:', recipeA.title);
      console.log('Recipe B:', recipeB.title);

      const systemPromptA = getFullPrompts(recipeA);
      const systemPromptB = getFullPrompts(recipeB);

      if (!systemPromptA || !systemPromptB) {
        throw new Error(
          "No se pudieron obtener los prompts completos para ambas recipes"
        );
      }

      const modelConfig = getModelConfig(settings.selectedModel);
      console.log('Model Config:', modelConfig);

      // Agregar el contexto de memoria a los prompts
      const memoryContext =
        currentSplitTest?.memory?.entries
          ?.sort(
            (a: MemoryEntry, b: MemoryEntry) => b.importance - a.importance
          )
          ?.map(
            (entry: MemoryEntry) =>
              `Información relevante del usuario: ${entry.content}`
          )
          ?.join("\n") || "";

      console.log('=== Memory Context ===');
      console.log(memoryContext || 'No memory context available');

      const systemPromptWithMemoryA = memoryContext
        ? `${memoryContext}\n\n${systemPromptA}`
        : systemPromptA;

      const systemPromptWithMemoryB = memoryContext
        ? `${memoryContext}\n\n${systemPromptB}`
        : systemPromptB;

      // Realizar ambas llamadas en paralelo
      console.log('=== Making API Calls ===');
      const [dataA, dataB] = await Promise.all([
        makeModelRequest(input, systemPromptWithMemoryA, modelConfig, true),
        makeModelRequest(input, systemPromptWithMemoryB, modelConfig, false),
      ]);

      console.log('=== API Responses ===');
      console.log('Response A:', dataA);
      console.log('Response B:', dataB);

      // Registrar las responses en la consola
      addApiLog("response", {
        recipe: recipeA,
        response: dataA.response,
      });

      addApiLog("response", {
        recipe: recipeB,
        response: dataB.response,
      });

      // Agregar el mensaje y las respuestas al test actual
      addSplitTestMessage({
        userMessage: input,
        recipeA: {
          recipe: recipeA,
          response: dataA.response,
        },
        recipeB: {
          recipe: recipeB,
          response: dataB.response,
        },
        model: modelConfig.model,
        temperature: settings.temperature,
      });

    } catch (error) {
      console.error("Error en el split test:", error);
      setLocalError(
        "Error al procesar el mensaje: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
      setInput(input);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = (messageId: string, response: "A" | "B", reaction: 'like' | 'dislike') => {
    setMessageStates((prev) => {
      const currentState = prev[messageId] || {
        selectedResponse: null,
        feedbackMessage: "",
        reaction: null
      };
      
      return {
        ...prev,
        [messageId]: {
          ...currentState,
          selectedResponse: response,
          reaction,
        }
      };
    });
  };

  const handleFeedbackChange = (messageId: string, feedback: string) => {
    setMessageStates((prev) => {
      const currentState = prev[messageId] || {
        selectedResponse: null,
        feedbackMessage: "",
        reaction: null
      };
      
      return {
        ...prev,
        [messageId]: {
          ...currentState,
          feedbackMessage: feedback,
        }
      };
    });
  };

  const handleFeedbackSubmit = (messageId: string) => {
    const messageState = messageStates[messageId];
    if (!messageState?.selectedResponse || !messageState.feedbackMessage.trim() || !messageState.reaction)
      return;

    addSplitTestFeedback(messageId, {
      selectedOption: messageState.selectedResponse,
      feedback: messageState.feedbackMessage,
      reaction: messageState.reaction
    });

    setMessageStates((prev) => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });
  };

  const handleFinishTest = async () => {
    if (!currentSplitTest) return;

    try {
      setIsLoading(true);
      console.log('=== Iniciando análisis final ===');

      try {
        const response = await fetch("http://localhost:3000/api/analyze/split-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: currentSplitTest.messages,
            recipeA: currentSplitTest.recipeA,
            recipeB: currentSplitTest.recipeB,
            memory: currentSplitTest.memory,
            settings: {
              openaiApiKey: settings.openaiApiKey
            }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error en la respuesta:', errorData);
          throw new Error(`Error del servidor: ${errorData.error}`);
        }

        const { analysis } = await response.json();
        console.log('Respuesta del análisis:', analysis);

        const updatedSession = {
          ...currentSplitTest,
          summary: {
            content: JSON.stringify(analysis as Analysis, null, 2),
            improvedPrompt: JSON.stringify((analysis as Analysis).newPrompts, null, 2),
            timestamp: Date.now(),
          },
        };

        setCurrentSplitTest(updatedSession);
        await saveSplitTestSession();
      } catch (error) {
        console.error('Error detallado:', error);
        throw new Error('Error al generar el análisis');
      }
    } catch (error) {
      console.error('Error al finalizar el test:', error);
      setLocalError(
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetTest = () => {
    if (!currentSplitTest) return;

    const { recipeA, recipeB } = currentSplitTest;
    initializeSplitTest(recipeA, recipeB);
    setMessageStates({}); // Limpiar todos los estados de mensajes
  };

  // Función para exportar el chat como texto (markup)
  const exportChatAsMarkup = () => {
    if (!currentSplitTest || !messages.length) return;

    // Crear un elemento modal para mostrar la tabla HTML
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '9999';
    
    // Crear el contenedor del modal
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#1f2937';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '20px';
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '1200px';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
    modalContent.style.position = 'relative';
    modalContent.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    // Crear el botón de cerrar
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = '#9ca3af';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modalOverlay);
    
    // Crear el título
    const title = document.createElement('h2');
    title.textContent = `Split Test: ${currentSplitTest.recipeA.title} vs ${currentSplitTest.recipeB.title}`;
    title.style.color = '#e5e7eb';
    title.style.marginBottom = '16px';
    title.style.fontSize = '18px';
    
    // Crear la fecha
    const date = document.createElement('p');
    date.textContent = `Fecha: ${new Date().toLocaleDateString()}`;
    date.style.color = '#9ca3af';
    date.style.marginBottom = '20px';
    date.style.fontSize = '14px';
    
    // Crear instrucciones
    const instructions = document.createElement('div');
    instructions.style.backgroundColor = '#374151';
    instructions.style.padding = '12px';
    instructions.style.borderRadius = '6px';
    instructions.style.marginBottom = '20px';
    instructions.style.fontSize = '14px';
    instructions.style.color = '#e5e7eb';
    instructions.innerHTML = '<strong>Instrucciones:</strong> Selecciona toda la tabla (Ctrl+A) y cópiala (Ctrl+C). Luego pégala en Google Docs u otro editor que soporte tablas.';
    
    // Crear la tabla
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.border = '1px solid #000000';
    table.style.fontSize = '14px';
    
    // Crear encabezado de la tabla
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Estilos para las celdas de encabezado - FONDO NEGRO Y LETRAS BLANCAS
    const headerCellStyle = 'background-color: #000000; color: #ffffff; padding: 10px; text-align: center; font-weight: bold; border: 1px solid #000000;';
    
    // Crear celdas de encabezado con formato A - B
    const headerCellA = document.createElement('th');
    headerCellA.textContent = `Respuesta A (${currentSplitTest.recipeA.title})`;
    headerCellA.style.cssText = headerCellStyle;
    headerCellA.style.width = '50%';
    
    const headerCellB = document.createElement('th');
    headerCellB.textContent = `Respuesta B (${currentSplitTest.recipeB.title})`;
    headerCellB.style.cssText = headerCellStyle;
    headerCellB.style.width = '50%';
    
    headerRow.appendChild(headerCellA);
    headerRow.appendChild(headerCellB);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Crear cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    // Estilos para las celdas normales - FONDO BLANCO Y LETRAS NEGRAS
    const cellStyle = 'background-color: #ffffff; color: #000000; padding: 10px; border: 1px solid #000000; vertical-align: top;';
    const userMessageStyle = 'background-color: #f0f0f0; color: #000000; padding: 10px; border: 1px solid #000000; font-weight: bold; text-align: center;';
    
    // Agregar filas con datos
    messages.forEach((message) => {
      // Fila para el mensaje del usuario (abarca ambas columnas)
      const userMessageRow = document.createElement('tr');
      const userMessageCell = document.createElement('td');
      userMessageCell.textContent = message.userMessage;
      userMessageCell.style.cssText = userMessageStyle;
      userMessageCell.colSpan = 2; // Abarca ambas columnas
      userMessageRow.appendChild(userMessageCell);
      tbody.appendChild(userMessageRow);
      
      // Fila para las respuestas A y B
      const responsesRow = document.createElement('tr');
      
      // Celda para la respuesta A
      const responseACell = document.createElement('td');
      responseACell.style.cssText = cellStyle;
      
      const processedA = processResponse(message.recipeA.response);
      let responseAContent = '';
      
      if (processedA.think && showThinks) {
        responseAContent += `<div style="margin-bottom: 8px;"><strong style="color: #8B6914;">THINK:</strong><div style="margin-top: 4px;">${processedA.think}</div></div>`;
      }
      
      if (processedA.response) {
        if (showThinks) {
          responseAContent += `<div><strong style="color: #0000FF;">RESPONSE:</strong><div style="margin-top: 4px;">${processedA.response}</div></div>`;
        } else {
          responseAContent += processedA.response;
        }
      }
      
      responseACell.innerHTML = responseAContent;
      responsesRow.appendChild(responseACell);
      
      // Celda para la respuesta B
      const responseBCell = document.createElement('td');
      responseBCell.style.cssText = cellStyle;
      
      const processedB = processResponse(message.recipeB.response);
      let responseBContent = '';
      
      if (processedB.think && showThinks) {
        responseBContent += `<div style="margin-bottom: 8px;"><strong style="color: #8B6914;">THINK:</strong><div style="margin-top: 4px;">${processedB.think}</div></div>`;
      }
      
      if (processedB.response) {
        if (showThinks) {
          responseBContent += `<div><strong style="color: #0000FF;">RESPONSE:</strong><div style="margin-top: 4px;">${processedB.response}</div></div>`;
        } else {
          responseBContent += processedB.response;
        }
      }
      
      responseBCell.innerHTML = responseBContent;
      responsesRow.appendChild(responseBCell);
      
      tbody.appendChild(responsesRow);
      
      // Agregar una fila vacía como separador entre mensajes
      const separatorRow = document.createElement('tr');
      const separatorCell = document.createElement('td');
      separatorCell.colSpan = 2;
      separatorCell.style.height = '20px';
      separatorCell.style.borderLeft = '1px solid #000000';
      separatorCell.style.borderRight = '1px solid #000000';
      separatorRow.appendChild(separatorCell);
      tbody.appendChild(separatorRow);
    });
    
    // Eliminar el último separador
    if (tbody.lastChild && tbody.childNodes.length > 1) {
      tbody.removeChild(tbody.lastChild);
    }
    
    table.appendChild(tbody);
    
    // Agregar elementos al modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(date);
    modalContent.appendChild(instructions);
    modalContent.appendChild(table);
    
    // Agregar el modal al DOM
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Seleccionar automáticamente la tabla para facilitar la copia
    const range = document.createRange();
    range.selectNode(table);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Función para exportar el chat como imagen
  const exportChatAsImage = () => {
    if (!currentSplitTest || !messages.length) return;

    // Crear un contenedor temporal para renderizar el chat
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '600px';
    container.style.background = '#1a1a1a';
    container.style.padding = '12px';
    container.style.color = '#fff';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.zIndex = '-1000';

    // Agregar título
    const title = document.createElement('h2');
    title.style.color = '#fff';
    title.style.marginBottom = '16px';
    title.style.fontSize = '20px';
    title.textContent = `Split Test: ${currentSplitTest.recipeA.title} vs ${currentSplitTest.recipeB.title}`;
    container.appendChild(title);

    // Agregar cada mensaje
    messages.forEach((message) => {
      // Usuario
      const userDiv = document.createElement('div');
      userDiv.style.marginBottom = '16px';
      userDiv.style.textAlign = 'right';
      
      const userMessage = document.createElement('div');
      userMessage.style.display = 'inline-block';
      userMessage.style.background = '#2563eb';
      userMessage.style.padding = '8px 12px';
      userMessage.style.borderRadius = '8px';
      userMessage.style.maxWidth = '80%';
      userMessage.style.marginLeft = '20%';
      userMessage.style.fontSize = '14px';
      userMessage.textContent = message.userMessage;
      userDiv.appendChild(userMessage);
      container.appendChild(userDiv);

      // Respuestas
      const responsesDiv = document.createElement('div');
      responsesDiv.style.display = 'grid';
      responsesDiv.style.gridTemplateColumns = '1fr 1fr';
      responsesDiv.style.gap = '16px';
      responsesDiv.style.marginBottom = '16px';

      // Respuesta A
      const responseADiv = document.createElement('div');
      responseADiv.style.background = message.feedback?.selectedOption === 'A' 
        ? (message.feedback.reaction === 'like' ? '#15803d33' : '#dc262633')
        : '#374151';
      responseADiv.style.padding = '12px';
      responseADiv.style.borderRadius = '8px';
      responseADiv.style.fontSize = '14px';
      responseADiv.style.border = message.feedback?.selectedOption === 'A'
        ? `2px solid ${message.feedback.reaction === 'like' ? '#15803d' : '#dc2626'}`
        : 'none';

      const responseATitle = document.createElement('div');
      responseATitle.style.marginBottom = '8px';
      responseATitle.style.fontSize = '12px';
      responseATitle.innerHTML = `<strong>Respuesta A</strong><br><small>Recipe: ${currentSplitTest.recipeA.title}</small>`;
      responseADiv.appendChild(responseATitle);

      // Procesar la respuesta A para THINK y RESPONSE
      const processedA = processResponse(message.recipeA.response);
      
      if (processedA.think && showThinks) {
        const thinkDiv = document.createElement('div');
        thinkDiv.style.backgroundColor = '#1f2937';
        thinkDiv.style.padding = '8px';
        thinkDiv.style.borderRadius = '6px';
        thinkDiv.style.marginBottom = '8px';
        thinkDiv.style.borderLeft = '2px solid #eab308';
        
        const thinkTitle = document.createElement('div');
        thinkTitle.style.fontSize = '11px';
        thinkTitle.style.fontWeight = 'bold';
        thinkTitle.style.color = '#eab308';
        thinkTitle.style.marginBottom = '4px';
        thinkTitle.textContent = 'THINK';
        thinkDiv.appendChild(thinkTitle);
        
        const thinkContent = document.createElement('div');
        thinkContent.style.whiteSpace = 'pre-wrap';
        thinkContent.style.fontSize = '13px';
        thinkContent.textContent = processedA.think;
        thinkDiv.appendChild(thinkContent);
        
        responseADiv.appendChild(thinkDiv);
      }
      
      if (processedA.response) {
        const responseDiv = document.createElement('div');
        responseDiv.style.backgroundColor = processedA.think && showThinks ? '#374151' : 'transparent';
        responseDiv.style.padding = processedA.think && showThinks ? '8px' : '0';
        responseDiv.style.borderRadius = '6px';
        responseDiv.style.borderLeft = processedA.think && showThinks ? '2px solid #3b82f6' : 'none';
        
        if (processedA.think && showThinks) {
          const responseTitle = document.createElement('div');
          responseTitle.style.fontSize = '11px';
          responseTitle.style.fontWeight = 'bold';
          responseTitle.style.color = '#3b82f6';
          responseTitle.style.marginBottom = '4px';
          responseTitle.textContent = 'RESPONSE';
          responseDiv.appendChild(responseTitle);
        }
        
        const responseContent = document.createElement('div');
        responseContent.style.whiteSpace = 'pre-wrap';
        responseContent.style.fontSize = '13px';
        responseContent.textContent = processedA.response;
        responseDiv.appendChild(responseContent);
        
        responseADiv.appendChild(responseDiv);
      }

      // Respuesta B
      const responseBDiv = document.createElement('div');
      responseBDiv.style.background = message.feedback?.selectedOption === 'B'
        ? (message.feedback.reaction === 'like' ? '#15803d33' : '#dc262633')
        : '#374151';
      responseBDiv.style.padding = '12px';
      responseBDiv.style.borderRadius = '8px';
      responseBDiv.style.fontSize = '14px';
      responseBDiv.style.border = message.feedback?.selectedOption === 'B'
        ? `2px solid ${message.feedback.reaction === 'like' ? '#15803d' : '#dc2626'}`
        : 'none';

      const responseBTitle = document.createElement('div');
      responseBTitle.style.marginBottom = '8px';
      responseBTitle.style.fontSize = '12px';
      responseBTitle.innerHTML = `<strong>Respuesta B</strong><br><small>Recipe: ${currentSplitTest.recipeB.title}</small>`;
      responseBDiv.appendChild(responseBTitle);

      // Procesar la respuesta B para THINK y RESPONSE
      const processedB = processResponse(message.recipeB.response);
      
      if (processedB.think && showThinks) {
        const thinkDiv = document.createElement('div');
        thinkDiv.style.backgroundColor = '#1f2937';
        thinkDiv.style.padding = '8px';
        thinkDiv.style.borderRadius = '6px';
        thinkDiv.style.marginBottom = '8px';
        thinkDiv.style.borderLeft = '2px solid #eab308';
        
        const thinkTitle = document.createElement('div');
        thinkTitle.style.fontSize = '11px';
        thinkTitle.style.fontWeight = 'bold';
        thinkTitle.style.color = '#eab308';
        thinkTitle.style.marginBottom = '4px';
        thinkTitle.textContent = 'THINK';
        thinkDiv.appendChild(thinkTitle);
        
        const thinkContent = document.createElement('div');
        thinkContent.style.whiteSpace = 'pre-wrap';
        thinkContent.style.fontSize = '13px';
        thinkContent.textContent = processedB.think;
        thinkDiv.appendChild(thinkContent);
        
        responseBDiv.appendChild(thinkDiv);
      }
      
      if (processedB.response) {
        const responseDiv = document.createElement('div');
        responseDiv.style.backgroundColor = processedB.think && showThinks ? '#374151' : 'transparent';
        responseDiv.style.padding = processedB.think && showThinks ? '8px' : '0';
        responseDiv.style.borderRadius = '6px';
        responseDiv.style.borderLeft = processedB.think && showThinks ? '2px solid #3b82f6' : 'none';
        
        if (processedB.think && showThinks) {
          const responseTitle = document.createElement('div');
          responseTitle.style.fontSize = '11px';
          responseTitle.style.fontWeight = 'bold';
          responseTitle.style.color = '#3b82f6';
          responseTitle.style.marginBottom = '4px';
          responseTitle.textContent = 'RESPONSE';
          responseDiv.appendChild(responseTitle);
        }
        
        const responseContent = document.createElement('div');
        responseContent.style.whiteSpace = 'pre-wrap';
        responseContent.style.fontSize = '13px';
        responseContent.textContent = processedB.response;
        responseDiv.appendChild(responseContent);
        
        responseBDiv.appendChild(responseDiv);
      }

      responsesDiv.appendChild(responseADiv);
      responsesDiv.appendChild(responseBDiv);
      container.appendChild(responsesDiv);

      // Feedback si existe
      if (message.feedback) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.style.background = '#1f2937';
        feedbackDiv.style.padding = '8px 12px';
        feedbackDiv.style.borderRadius = '8px';
        feedbackDiv.style.marginBottom = '16px';
        feedbackDiv.style.fontSize = '14px';
        feedbackDiv.innerHTML = `<strong>Feedback:</strong> ${message.feedback.feedback}`;
        container.appendChild(feedbackDiv);
      }
    });

    // Agregar al DOM temporalmente
    document.body.appendChild(container);

    // Calcular altura total
    const height = container.offsetHeight;
    container.style.height = height + 'px';

    // Usar html2canvas
    html2canvas(container, {
      backgroundColor: '#1a1a1a',
      scale: 1.5,
      logging: false,
      width: 600,
      height: height,
      windowWidth: 600,
      windowHeight: height
    }).then((canvas) => {
      // Descargar la imagen
      const link = document.createElement('a');
      link.download = `split_test_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Limpiar
      document.body.removeChild(container);
    });
  };

  // Mostrar menú de exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  const handleExportClick = () => {
    setShowExportMenu(!showExportMenu);
  };

  // Efecto para cerrar el menú cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Recipe Selection */}
      <div className="flex-none flex flex-wrap items-center gap-4">
        <div className="flex flex-1 min-w-[600px] gap-4">
          <select
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                     text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={(e) => {
              const recipeA = recipes.find((r) => r.id === e.target.value);
              if (recipeA) {
                setMessageStates({});
                initializeSplitTest(
                  recipeA,
                  currentSplitTest?.recipeB || recipeA
                );
              }
            }}
            value={currentSplitTest?.recipeA.id || ""}
          >
            <option value="">Seleccionar Recipe A</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>

          <select
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                     text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={(e) => {
              const recipeB = recipes.find((r) => r.id === e.target.value);
              if (recipeB) {
                setMessageStates({});
                initializeSplitTest(
                  currentSplitTest?.recipeA || recipeB,
                  recipeB
                );
              }
            }}
            value={currentSplitTest?.recipeB.id || ""}
          >
            <option value="">Seleccionar Recipe B</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Checkbox para mostrar/ocultar THINKS */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md">
            <input
              type="checkbox"
              id="showThinks"
              checked={showThinks}
              onChange={(e) => setShowThinks(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="showThinks" className="flex items-center gap-1 text-sm text-gray-300 cursor-pointer">
              <Brain className="w-4 h-4 text-yellow-400" />
              Mostrar THINKS
            </label>
          </div>

          <select
            className="w-48 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                     text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={settings.selectedModel}
            onChange={(e) =>
              usePromptStore.setState({
                settings: { ...settings, selectedModel: e.target.value },
              })
            }
          >
            {ALL_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md min-w-[200px]">
            <span className="text-sm text-gray-300">Temp:</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) =>
                usePromptStore.setState({
                  settings: {
                    ...settings,
                    temperature: parseFloat(e.target.value),
                  },
                })
              }
              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-300 w-8">
              {settings.temperature.toFixed(1)}
            </span>
          </div>

          <button
            onClick={handleResetTest}
            disabled={!currentSplitTest || isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-500 
                     transition-colors duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed whitespace-nowrap"
          >
            Reiniciar Test
          </button>

          <button
            onClick={handleFinishTest}
            disabled={
              !currentSplitTest ||
              isLoading ||
              !currentSplitTest?.messages.some((m) => m.feedback)
            }
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 
                     transition-colors duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed whitespace-nowrap"
          >
            Finalizar Test
          </button>

          <div className="relative">
            <button
              onClick={handleExportClick}
              disabled={!currentSplitTest || !messages.length}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 
                       transition-colors duration-200 disabled:opacity-50 
                       disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Chat
            </button>
            
            {showExportMenu && (
              <div ref={exportMenuRef} className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700 overflow-hidden">
                <div className="bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 border-b border-gray-600">
                  Opciones de exportación
                </div>
                <ul className="py-1">
                  <li>
                    <button 
                      onClick={() => {
                        exportChatAsImage();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <div>
                        <div>Exportar como imagen</div>
                        <div className="text-xs text-gray-400">Descarga una imagen PNG</div>
                      </div>
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => {
                        exportChatAsMarkup();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <div>
                        <div>Exportar como texto</div>
                        <div className="text-xs text-gray-400">Copia al portapapeles</div>
                      </div>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 max-h-[calc(100vh-350px)] overflow-y-auto space-y-8">
        {messages.map((message) => {
          const messageState = messageStates[message.id] || {
            selectedResponse: null,
            feedbackMessage: "",
            reaction: null,
          };

          return (
            <div key={message.id} className="space-y-4">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 text-white p-4 rounded-lg">
                  <p className="text-sm">{message.userMessage}</p>
                </div>
              </div>

              {/* Response Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Response A */}
                <div className="relative group">
                  <div
                    className={`p-4 rounded-lg ${
                      message.feedback?.selectedOption === "A"
                        ? message.feedback.reaction === 'like'
                          ? "bg-green-600/20 border-2 border-green-500"
                          : "bg-red-600/20 border-2 border-red-500"
                        : "bg-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">
                          Respuesta A
                        </h3>
                        <p className="text-xs text-gray-400">
                          Recipe: {currentSplitTest?.recipeA.title}
                        </p>
                      </div>
                      {!message.feedback && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReaction(message.id, "A", "like")}
                            className={`p-1 rounded transition-colors ${
                              messageState.selectedResponse === "A" && messageState.reaction === "like"
                                ? "bg-green-600/20 text-green-400"
                                : "hover:bg-gray-600"
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReaction(message.id, "A", "dislike")}
                            className={`p-1 rounded transition-colors ${
                              messageState.selectedResponse === "A" && messageState.reaction === "dislike"
                                ? "bg-red-600/20 text-red-400"
                                : "hover:bg-gray-600"
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <FormattedResponse content={message.recipeA.response} showThinks={showThinks} />
                  </div>
                </div>

                {/* Response B */}
                <div className="relative group">
                  <div
                    className={`p-4 rounded-lg ${
                      message.feedback?.selectedOption === "B"
                        ? message.feedback.reaction === 'like'
                          ? "bg-green-600/20 border-2 border-green-500"
                          : "bg-red-600/20 border-2 border-red-500"
                        : "bg-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">
                          Respuesta B
                        </h3>
                        <p className="text-xs text-gray-400">
                          Recipe: {currentSplitTest?.recipeB.title}
                        </p>
                      </div>
                      {!message.feedback && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReaction(message.id, "B", "like")}
                            className={`p-1 rounded transition-colors ${
                              messageState.selectedResponse === "B" && messageState.reaction === "like"
                                ? "bg-green-600/20 text-green-400"
                                : "hover:bg-gray-600"
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReaction(message.id, "B", "dislike")}
                            className={`p-1 rounded transition-colors ${
                              messageState.selectedResponse === "B" && messageState.reaction === "dislike"
                                ? "bg-red-600/20 text-red-400"
                                : "hover:bg-gray-600"
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <FormattedResponse content={message.recipeB.response} showThinks={showThinks} />
                  </div>
                </div>
              </div>

              {/* Feedback Input Area */}
              {messageState.selectedResponse && !message.feedback && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={messageState.feedbackMessage}
                    onChange={(e) => handleFeedbackChange(message.id, e.target.value)}
                    placeholder={messageState.reaction === 'like' ? "¿Por qué prefieres esta respuesta?" : "¿Por qué no te gusta esta respuesta?"}
                    className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                             text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent"
                  />
                  <button
                    onClick={() => handleFeedbackSubmit(message.id)}
                    disabled={!messageState.feedbackMessage.trim()}
                    className={`px-4 py-2 ${
                      messageState.reaction === 'like' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                    } text-white rounded-md transition-colors duration-200 disabled:opacity-50 
                    disabled:cursor-not-allowed`}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Existing Feedback with Edit/Delete */}
              {message.feedback && (
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium">Feedback:</span>{" "}
                        {message.feedback.feedback}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {/* Botón Editar */}
                      <button
                        onClick={() => {
                          const feedback = message.feedback;
                          if (!feedback) return;
                          
                          // Restaurar el estado para edición
                          setMessageStates((prev) => ({
                            ...prev,
                            [message.id]: {
                              selectedResponse: feedback.selectedOption,
                              feedbackMessage: feedback.feedback,
                              reaction: feedback.reaction
                            },
                          }));
                          
                          // Eliminar el feedback actual
                          addSplitTestFeedback(message.id, {
                            selectedOption: feedback.selectedOption,
                            feedback: feedback.feedback,
                            reaction: feedback.reaction,
                            deleted: true
                          });
                        }}
                        className="p-1 rounded hover:bg-gray-600 transition-colors"
                        title="Editar feedback"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Botón Eliminar */}
                      <button
                        onClick={() => {
                          const feedback = message.feedback;
                          if (!feedback) return;
                          
                          // Eliminar el feedback
                          addSplitTestFeedback(message.id, {
                            selectedOption: feedback.selectedOption,
                            feedback: feedback.feedback,
                            reaction: feedback.reaction,
                            deleted: true
                          });
                        }}
                        className="p-1 rounded hover:bg-gray-600 transition-colors"
                        title="Eliminar feedback"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Test Summary */}
      {currentSplitTest?.summary && (
        <div className="bg-gray-700/50 p-6 rounded-lg space-y-4 mt-8">
          <h3 className="text-lg font-medium text-gray-200">
            Resumen del Test
          </h3>
          <div className="space-y-6">
            {(() => {
              try {
                const analysis = JSON.parse(currentSplitTest.summary.content);
                return (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Análisis General
                      </h4>
                      <div className="space-y-3 text-sm text-gray-400">
                        <p className="whitespace-pre-wrap">
                          {analysis.analysis.summary}
                        </p>
                        <div>
                          <h5 className="text-gray-300 mt-2 mb-1">
                            Patrones en Respuestas Efectivas:
                          </h5>
                          <p className="whitespace-pre-wrap">
                            {analysis.analysis.patternsFavoredResponses}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Análisis Recipe A
                        </h4>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">
                          {analysis.analysis.recipeAAnalysis}
                        </p>
                        
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-2">
                            Cambios Sugeridos en Prompts
                          </h5>
                          {analysis.promptChanges.recipeA.map((change: PromptChange, i: number) => (
                            <div key={i} className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                              <h6 className="font-medium text-blue-400">{change.promptTitle}</h6>
                              <div className="mt-2 space-y-2">
                                <p className="text-gray-400">
                                  <span className="text-gray-300">Acción: </span>
                                  <span className={
                                    change.action === 'MANTENER' ? 'text-green-400' :
                                    change.action === 'MODIFICAR' ? 'text-yellow-400' :
                                    'text-red-400'
                                  }>
                                    {change.action}
                                  </span>
                                </p>

                                {change.currentContent && (
                                  <div className="mt-3">
                                    <p className="text-gray-300 mb-1">Contenido Actual:</p>
                                    <pre className="whitespace-pre-wrap bg-gray-900/50 p-2 rounded text-gray-400 text-sm">
                                      {change.currentContent}
                                    </pre>
                                  </div>
                                )}

                                {change.suggestedContent && (
                                  <div className="mt-3">
                                    <p className="text-gray-300 mb-1">Contenido Propuesto:</p>
                                    <pre className="whitespace-pre-wrap bg-gray-900/50 p-2 rounded text-gray-400 text-sm">
                                      {change.suggestedContent}
                                    </pre>
                                  </div>
                                )}

                                <div className="mt-3">
                                  <p className="text-gray-300 mb-1">Cambios Específicos:</p>
                                  {change.changes.map((specificChange: SpecificChange, j: number) => (
                                    <div key={j} className="mb-2 bg-gray-900/30 p-2 rounded">
                                      <p className="text-sm">
                                        <span className={
                                          specificChange.type === 'AGREGAR' ? 'text-green-400' :
                                          specificChange.type === 'MODIFICAR' ? 'text-yellow-400' :
                                          'text-red-400'
                                        }>
                                          {specificChange.type}
                                        </span>
                                      </p>
                                      {specificChange.before && (
                                        <div className="mt-1">
                                          <p className="text-gray-300 text-xs">Antes:</p>
                                          <pre className="whitespace-pre-wrap text-gray-400 text-sm">
                                            {specificChange.before}
                                          </pre>
                                        </div>
                                      )}
                                      {specificChange.after && (
                                        <div className="mt-1">
                                          <p className="text-gray-300 text-xs">Después:</p>
                                          <pre className="whitespace-pre-wrap text-gray-400 text-sm">
                                            {specificChange.after}
                                          </pre>
                                        </div>
                                      )}
                                      <p className="text-gray-400 mt-1">
                                        {specificChange.explanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <p className="text-gray-400 mt-2">
                                  <span className="text-gray-300">Explicación:</span>
                                  <br />
                                  {change.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Análisis Recipe B
                        </h4>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">
                          {analysis.analysis.recipeBAnalysis}
                        </p>

                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-2">
                            Cambios Sugeridos en Prompts
                          </h5>
                          {analysis.promptChanges.recipeB.map((change: PromptChange, i: number) => (
                            <div key={i} className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                              <h6 className="font-medium text-blue-400">{change.promptTitle}</h6>
                              <div className="mt-2 space-y-2">
                                <p className="text-gray-400">
                                  <span className="text-gray-300">Acción: </span>
                                  <span className={
                                    change.action === 'MANTENER' ? 'text-green-400' :
                                    change.action === 'MODIFICAR' ? 'text-yellow-400' :
                                    'text-red-400'
                                  }>
                                    {change.action}
                                  </span>
                                </p>

                                {change.currentContent && (
                                  <div className="mt-3">
                                    <p className="text-gray-300 mb-1">Contenido Actual:</p>
                                    <pre className="whitespace-pre-wrap bg-gray-900/50 p-2 rounded text-gray-400 text-sm">
                                      {change.currentContent}
                                    </pre>
                                  </div>
                                )}

                                {change.suggestedContent && (
                                  <div className="mt-3">
                                    <p className="text-gray-300 mb-1">Contenido Propuesto:</p>
                                    <pre className="whitespace-pre-wrap bg-gray-900/50 p-2 rounded text-gray-400 text-sm">
                                      {change.suggestedContent}
                                    </pre>
                                  </div>
                                )}

                                <div className="mt-3">
                                  <p className="text-gray-300 mb-1">Cambios Específicos:</p>
                                  {change.changes.map((specificChange: SpecificChange, j: number) => (
                                    <div key={j} className="mb-2 bg-gray-900/30 p-2 rounded">
                                      <p className="text-sm">
                                        <span className={
                                          specificChange.type === 'AGREGAR' ? 'text-green-400' :
                                          specificChange.type === 'MODIFICAR' ? 'text-yellow-400' :
                                          'text-red-400'
                                        }>
                                          {specificChange.type}
                                        </span>
                                      </p>
                                      {specificChange.before && (
                                        <div className="mt-1">
                                          <p className="text-gray-300 text-xs">Antes:</p>
                                          <pre className="whitespace-pre-wrap text-gray-400 text-sm">
                                            {specificChange.before}
                                          </pre>
                                        </div>
                                      )}
                                      {specificChange.after && (
                                        <div className="mt-1">
                                          <p className="text-gray-300 text-xs">Después:</p>
                                          <pre className="whitespace-pre-wrap text-gray-400 text-sm">
                                            {specificChange.after}
                                          </pre>
                                        </div>
                                      )}
                                      <p className="text-gray-400 text-sm mt-1">
                                        {specificChange.explanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <p className="text-gray-400 mt-2">
                                  <span className="text-gray-300">Explicación:</span>
                                  <br />
                                  {change.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {analysis.newPrompts.suggested.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">
                          Nuevas Prompts Sugeridas
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {analysis.newPrompts.suggested.map((prompt: NewPromptSuggestion, i: number) => (
                            <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <h6 className="font-medium text-blue-400">{prompt.title}</h6>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  prompt.implementation === 'AMBAS' ? 'bg-purple-500/20 text-purple-300' :
                                  prompt.implementation === 'A' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-green-500/20 text-green-300'
                                }`}>
                                  Recipe {prompt.implementation}
                                </span>
                              </div>
                              <div className="mt-2 space-y-2">
                                <p className="text-gray-400">
                                  <span className="text-gray-300">Propósito:</span>
                                  <br />
                                  {prompt.purpose}
                                </p>
                                <p className="text-gray-400">
                                  <span className="text-gray-300">Contenido Sugerido:</span>
                                  <br />
                                  <span className="whitespace-pre-wrap">{prompt.content}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              } catch (e) {
                console.error("Error al parsear el análisis:", e);
                return (
                  <div className="text-sm text-gray-400 whitespace-pre-wrap">
                    {currentSplitTest.summary.content}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Memory Display */}
      {Boolean(currentSplitTest?.memory?.entries?.length) && (
        <div className="bg-gray-800/50 p-2 rounded-lg">
          <button
            onClick={() => setIsMemoryExpanded(!isMemoryExpanded)}
            className="w-full flex items-center justify-between gap-2 text-gray-300 hover:bg-gray-700/30 p-2 rounded-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <h3 className="text-sm font-medium">
                Memoria del Sistema ({currentSplitTest?.memory?.entries?.length ?? 0})
              </h3>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isMemoryExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMemoryExpanded && currentSplitTest?.memory?.entries && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {[...currentSplitTest.memory.entries]
                .sort((a, b) => b.importance - a.importance)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700/30 p-2 rounded-md hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Star
                          className="w-3 h-3"
                          fill={entry.importance > 7 ? "currentColor" : "none"}
                        />
                        Importancia: {entry.importance}/10
                      </span>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-200">{entry.content}</p>
                    <p className="text-xs text-gray-400 mt-1 italic">
                      {entry.reason}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex-none">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                     text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent"
            disabled={isLoading || !currentSplitTest}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !currentSplitTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 
                     transition-colors duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
