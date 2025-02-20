import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import { RequestHandler } from "express";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Recipe } from "../src/types/common";

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const OPENAI_MODELS = {
  GPT35: "gpt-3.5",
  GPT4O: "gpt-4o",
  GPT35_TURBO: "gpt-3.5-turbo",
  GPT4O_MINI: "gpt-4o-mini"
} as const;

const EVALUATOR_MODEL = OPENAI_MODELS.GPT4O_MINI;

interface EvaluationResponse {
  score: number;
  passed: boolean;
  reason: string;
}

interface RecipePrompt {
  title: string;
  content: string;
}

interface EvaluationRequest {
  recipe: {
    title: string;
    prompts: RecipePrompt[];
  };
  message: string;
  settings: {
    evaluationPrompt: string;
    systemTemperature: number;
    evaluationTemperature: number;
    openaiApiKey: string;
  };
}

app.post("/api/evaluate", async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { recipe, message, settings } = req.body as EvaluationRequest;

    if (!settings.openaiApiKey) {
      res.status(400).json({ error: 'Se requiere API Key de OpenAI' });
      return;
    }

    const openai = new OpenAI({ apiKey: settings.openaiApiKey });

    // Obtener los prompts completos de la receta
    const recipePrompts = recipe.prompts
      .map((prompt: RecipePrompt) => {
        return prompt ? `${prompt.title}: ${prompt.content}` : null;
      })
      .filter(Boolean);

    // Primera llamada a OpenAI con las instrucciones de la receta
    const initialRequest = {
      model: EVALUATOR_MODEL,
      messages: [
        {
          role: "system" as const,
          content: `Debes seguir estrictamente estas instrucciones para responder al mensaje del usuario:
${recipePrompts.join("\n\n")}`,
        },
        {
          role: "user" as const,
          content: message,
        },
      ],
      temperature: Number(settings.systemTemperature) || 0.7,
    };

    const initialResponse = await openai.chat.completions.create(initialRequest);
    const aiResponse = initialResponse.choices[0].message.content;

    // Segunda llamada a OpenAI para evaluar la respuesta
    const evaluationRequest = {
      model: EVALUATOR_MODEL,
      messages: [
        {
          role: "system" as const,
          content: `${settings.evaluationPrompt}

Responde en formato JSON con esta estructura exacta:
{
  "score": <número del 0 al 10>,
  "passed": <boolean>,
  "reason": "<explicación detallada de la evaluación>"
}`,
        },
        {
          role: "user" as const,
          content: `INSTRUCCIONES DE LA RECETA:
${recipePrompts.join("\n\n")}

MENSAJE DEL USUARIO:
${message}

RESPUESTA DE LA IA:
${aiResponse}`,
        },
      ],
      temperature: Number(settings.evaluationTemperature) || 0.3,
    };

    const evaluationResponse = await openai.chat.completions.create(evaluationRequest);
    let evaluation: EvaluationResponse;

    try {
      const rawContent = evaluationResponse.choices[0].message.content?.trim() || "";
      const cleanContent = rawContent
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^\s*\{\s*/, "{")
        .replace(/\s*\}\s*$/, "}")
        .trim();

      evaluation = JSON.parse(cleanContent) as EvaluationResponse;

      if (
        typeof evaluation.score !== "number" ||
        typeof evaluation.passed !== "boolean" ||
        typeof evaluation.reason !== "string"
      ) {
        throw new Error("Estructura JSON inválida");
      }

      evaluation.score = Math.max(0, Math.min(10, Number(evaluation.score)));
      evaluation.passed = Boolean(evaluation.passed);
      evaluation.reason = String(evaluation.reason);
    } catch (parseError) {
      console.error("Error parsing evaluation JSON:", parseError);
      evaluation = {
        score: 0.0,
        passed: false,
        reason: "Error al procesar la evaluación: Formato de respuesta inválido"
      };
    }

    res.json({
      response: aiResponse,
      evaluation,
      logs: { evaluationRequest }
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({
      error: "Error al procesar tu solicitud",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

interface ChatRequest {
  message: string;
  model: string;
  apiKey: string;
  systemPrompt?: string;
  previousMessages?: Array<{ role: string; content: string; }>;
  temperature?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface Message {
  role: string;
  content: string;
}

const openaiHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { 
      message, 
      model, 
      apiKey, 
      systemPrompt, 
      previousMessages,
      temperature,
      frequencyPenalty,
      presencePenalty 
    } = req.body as ChatRequest;

    if (!apiKey) {
      res.status(400).json({ error: 'Se requiere API Key de OpenAI' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'Se requiere especificar un modelo' });
      return;
    }

    const openai = new OpenAI({ apiKey });
    const messages: ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (previousMessages && previousMessages.length > 0) {
      messages.push(...previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: temperature || 0.7,
      frequency_penalty: frequencyPenalty || 0,
      presence_penalty: presencePenalty || 0,
    });

    res.json({ 
      response: response.choices[0].message.content,
      model 
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ 
      error: 'Error al comunicarse con OpenAI',
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

const claudeHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { message, model, apiKey, systemPrompt, previousMessages } = req.body as ChatRequest;

    if (!apiKey) {
      res.status(400).json({ error: 'Se requiere API Key de Claude' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'Se requiere especificar un modelo' });
      return;
    }

    // Construir el array de mensajes en el formato correcto de Claude
    const formattedMessages: Message[] = [];
    
    // Los mensajes previos no deben incluir mensajes del sistema
    if (previousMessages && previousMessages.length > 0) {
      formattedMessages.push(...previousMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        })));
    }

    formattedMessages.push({
      role: 'user',
      content: message
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: formattedMessages,
        system: systemPrompt, // El mensaje del sistema va aquí
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error completo de Claude:', errorData);
      throw new Error(`Error de Claude: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    res.json({ 
      response: data.content[0].text,
      model 
    });
  } catch (error) {
    console.error('Claude Error:', error);
    res.status(500).json({ 
      error: 'Error al comunicarse con Claude',
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

const deepseekHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { message, model, apiKey, systemPrompt, previousMessages } = req.body as ChatRequest;

    if (!apiKey) {
      res.status(400).json({ error: 'Se requiere API Key de Deepseek' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'Se requiere especificar un modelo' });
      return;
    }

    const messages: Message[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (previousMessages && previousMessages.length > 0) {
      messages.push(...previousMessages);
    }

    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Deepseek: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ 
      response: data.choices[0].message.content,
      model 
    });
  } catch (error) {
    console.error('Deepseek Error:', error);
    res.status(500).json({ 
      error: 'Error al comunicarse con Deepseek',
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

app.post('/api/chat/openai', openaiHandler);
app.post('/api/chat/claude', claudeHandler);
app.post('/api/chat/deepseek', deepseekHandler);

const SPLIT_TEST_ANALYSIS_PROMPT = `Eres un experto en ingeniería de prompts para chatbots terapéuticos. Tu tarea es analizar los resultados de un test A/B entre dos recipes (conjuntos de prompts) y proporcionar recomendaciones para mejorar las INSTRUCCIONES DEL SISTEMA que definen el comportamiento del bot.

IMPORTANTE: NO sugieras respuestas específicas o mensajes del chatbot. En su lugar, sugiere cambios en las REGLAS y DIRECTRICES que el bot debe seguir.

Por ejemplo:
❌ NO SUGERIR: "El bot debería decir: '¿Cómo te sientes hoy?'"
✅ SUGERIR: "Agregar regla: Comenzar las sesiones con una pregunta abierta sobre el estado emocional actual del usuario"

❌ NO SUGERIR: "Responder: Entiendo que las tareas del hogar pueden ser difíciles"
✅ SUGERIR: "Modificar regla de validación emocional: Incluir reconocimiento específico del contexto antes de hacer preguntas exploratorias"

Analiza:
1. Qué secciones de las instrucciones del sistema son efectivas vs cuáles necesitan mejoras
2. Qué reglas o directrices faltan o deberían agregarse
3. Qué patrones de comportamiento deberían modificarse
4. Qué aspectos de la personalidad del bot necesitan ajuste

FORMATO REQUERIDO:
Para cada sección que necesite cambios, DEBES:
1. Copiar EXACTAMENTE el contenido actual completo de la sección, incluyendo:
   - Título de la sección
   - Todas las reglas y sub-reglas
   - El formato y sangría exactos
   - Cualquier ejemplo o nota

2. Proporcionar el contenido nuevo completo, manteniendo:
   - La misma estructura que el original
   - El mismo estilo de formato
   - Todas las reglas actualizadas
   - Nuevas reglas agregadas
   - El mismo sistema de viñetas o numeración

3. Listar cada cambio específico, indicando:
   - La regla exacta que se está modificando/agregando/eliminando
   - El texto exacto antes y después del cambio
   - Una explicación clara de por qué el cambio mejorará el comportamiento

Proporciona tu análisis en formato JSON con esta estructura:
{
  "analysis": {
    "summary": "Resumen general del análisis de las recipes",
    "patternsFavoredResponses": "Patrones identificados en las respuestas más efectivas y cómo se relacionan con las instrucciones del sistema",
    "recipeAAnalysis": "Análisis de las instrucciones en Recipe A",
    "recipeBAnalysis": "Análisis de las instrucciones en Recipe B"
  },
  "promptChanges": {
    "recipeA": [
      {
        "promptTitle": "Título exacto de la sección",
        "action": "MANTENER | MODIFICAR | ELIMINAR",
        "currentContent": "CONTENIDO ACTUAL COMPLETO Y EXACTO de la sección, incluyendo título, reglas, formato y ejemplos",
        "suggestedContent": "CONTENIDO NUEVO COMPLETO manteniendo la misma estructura y formato",
        "changes": [
          {
            "type": "AGREGAR | MODIFICAR | ELIMINAR",
            "before": "Texto exacto de la regla original (si aplica)",
            "after": "Texto exacto de la nueva regla (si aplica)",
            "explanation": "Explicación específica de por qué este cambio mejorará el comportamiento del bot"
          }
        ],
        "explanation": "Explicación general de cómo estos cambios mejorarán el comportamiento del bot"
      }
    ],
    "recipeB": [/* mismo formato que recipeA */]
  },
  "newPrompts": {
    "suggested": [
      {
        "title": "Título de la nueva sección",
        "content": "Contenido completo y formateado de la nueva sección, siguiendo el mismo estilo que las secciones existentes",
        "purpose": "Qué aspecto del comportamiento del bot mejorará",
        "implementation": "A | B | AMBAS",
        "placement": "Dónde colocar esta sección en relación a las existentes"
      }
    ]
  }
}

EJEMPLO DE CAMBIO VÁLIDO:
{
  "promptTitle": "Indagación progresiva",
  "action": "MODIFICAR",
  "currentContent": "Indagación progresiva\\n- Hacé una pregunta a la vez, evitando múltiples preguntas en la misma respuesta\\n- Después de indagar sobre un aspecto, esperá la respuesta antes de explorar otros\\n- No busques soluciones mientras estás en fase de indagación",
  "suggestedContent": "Indagación progresiva\\n- Hacé una pregunta específica a la vez, enfocándote en un aspecto emocional concreto\\n- Esperá la respuesta del usuario antes de pasar al siguiente aspecto\\n- Mantené un registro mental de los temas explorados para evitar repeticiones\\n- No ofrezcas soluciones hasta haber explorado completamente el contexto emocional\\n- Prioriza preguntas sobre sentimientos antes que sobre hechos",
  "changes": [
    {
      "type": "MODIFICAR",
      "before": "Hacé una pregunta a la vez, evitando múltiples preguntas en la misma respuesta",
      "after": "Hacé una pregunta específica a la vez, enfocándote en un aspecto emocional concreto",
      "explanation": "Esta modificación hace énfasis en la especificidad emocional de cada pregunta"
    },
    {
      "type": "AGREGAR",
      "before": null,
      "after": "Mantené un registro mental de los temas explorados para evitar repeticiones",
      "explanation": "Esta nueva regla ayuda a mantener una conversación más coherente y progresiva"
    }
  ]
}

Asegúrate de que todas las sugerencias:
1. Sean REGLAS e INSTRUCCIONES para el comportamiento del bot, NO respuestas específicas
2. Incluyan directrices claras y procesables
3. Mantengan consistencia con el estilo terapéutico
4. Aborden patrones identificados en el feedback
5. Muestren claramente qué reglas se están modificando
6. Expliquen por qué cada cambio mejorará el comportamiento

IMPORTANTE:
- SIEMPRE incluye el contenido completo y exacto de las secciones actuales
- SIEMPRE mantén el mismo estilo de formato y estructura
- NUNCA sugieras respuestas específicas del bot
- SIEMPRE lista cada cambio específico con su antes y después`;

interface SplitTestAnalysisRequest {
  messages: Array<{
    userMessage: string;
    recipeA: {
      recipe: Recipe;
      response: string;
    };
    recipeB: {
      recipe: Recipe;
      response: string;
    };
    feedback?: {
      selectedOption: 'A' | 'B';
      feedback: string;
      reaction: 'like' | 'dislike';
    };
  }>;
  recipeA: Recipe;
  recipeB: Recipe;
  memory?: {
    entries: Array<{
      content: string;
      importance: number;
      reason: string;
    }>;
  };
}

app.post("/api/analyze/split-test", async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { messages, recipeA, recipeB, memory } = req.body as SplitTestAnalysisRequest;
    const { openaiApiKey } = req.body.settings;

    if (!openaiApiKey) {
      res.status(400).json({ error: 'Se requiere API Key de OpenAI' });
      return;
    }

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Se requieren mensajes para analizar' });
      return;
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Construir el contexto para el análisis
    const analysisContext = {
      recipes: {
        A: {
          title: recipeA.title,
          description: recipeA.description,
          prompts: recipeA.prompts
        },
        B: {
          title: recipeB.title,
          description: recipeB.description,
          prompts: recipeB.prompts
        }
      },
      conversation: messages.map(msg => ({
        user: msg.userMessage,
        responseA: msg.recipeA.response,
        responseB: msg.recipeB.response,
        selectedOption: msg.feedback?.selectedOption || null,
        reaction: msg.feedback?.reaction || null,
        feedback: msg.feedback?.feedback || null
      })),
      memory: memory?.entries || []
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SPLIT_TEST_ANALYSIS_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(analysisContext, null, 2)
        }
      ],
      temperature: 0.3
    });

    const analysisResponse = response.choices[0].message.content;
    
    try {
      // Intentar parsear la respuesta como JSON
      const cleanedResponse = analysisResponse
        ?.replace(/```json\s*/, "")
        .replace(/```\s*$/, "")
        .trim() || "{}";
      
      const analysis = JSON.parse(cleanedResponse);
      
      res.json({ analysis });
    } catch (parseError) {
      console.error("Error parsing analysis response:", parseError);
      res.status(500).json({ 
        error: 'Error al procesar el análisis',
        rawResponse: analysisResponse 
      });
    }
  } catch (error) {
    console.error("Error in split test analysis:", error);
    res.status(500).json({ 
      error: 'Error al realizar el análisis',
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
}); 