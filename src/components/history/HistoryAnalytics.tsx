import React from 'react';
import { TimelineEvent } from '../../types/history';
import { ChatMessage } from '../../types/chat';
import { 
  Brain, MessageCircle, Scale, 
  GitCompare, Clock, Activity, CheckCircle, 
  XCircle, Thermometer 
} from 'lucide-react';

interface Props {
  events: TimelineEvent[];
}

export function HistoryAnalytics({ events }: Props) {
  // Estadísticas generales
  const totalChats = events.filter(e => e.type === 'chat').length;
  const totalEvaluations = events.filter(e => e.type === 'evaluation').length;
  const totalSplitTests = events.filter(e => e.type === 'splitTest').length;

  // Análisis de evaluaciones
  const evaluations = events.filter(e => e.type === 'evaluation');
  const passedEvaluations = evaluations.filter(e => e.details.evaluation?.passed).length;
  const evaluationPassRate = evaluations.length > 0 
    ? (passedEvaluations / evaluations.length * 100).toFixed(1) 
    : '0';

  // Análisis de modelos
  const modelUsage = events.reduce((acc, event) => {
    let model = '';
    if (event.type === 'chat') {
      const messages = event.details.messages as ChatMessage[];
      model = messages[0]?.model || 'Desconocido';
    } else if (event.type === 'evaluation') {
      model = event.details.model;
    } else if (event.type === 'splitTest') {
      model = event.details.recipeA.model;
    }
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análisis de temperatura
  const temperatureUsage = events
    .filter(e => e.type === 'chat')
    .reduce((acc, event) => {
      const messages = event.details.messages as ChatMessage[];
      const temp = messages[0]?.temperature;
      if (temp !== undefined) {
        const tempKey = temp.toFixed(1);
        acc[tempKey] = (acc[tempKey] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

  // Análisis de tiempo de respuesta
  const responseTimeStats = events
    .filter(e => e.type === 'chat')
    .reduce((acc, event) => {
      const messages = event.details.messages as ChatMessage[];
      messages.forEach(msg => {
        if (msg.responseTime) {
          acc.total += msg.responseTime;
          acc.count += 1;
          acc.min = Math.min(acc.min, msg.responseTime);
          acc.max = Math.max(acc.max, msg.responseTime);
        }
      });
      return acc;
    }, { total: 0, count: 0, min: Infinity, max: -Infinity });

  const avgResponseTime = responseTimeStats.count > 0 
    ? (responseTimeStats.total / responseTimeStats.count / 1000).toFixed(2)
    : '0';

  return (
    <div className="space-y-8">
      {/* Estadísticas generales */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-200">Chats</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totalChats}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-medium text-gray-200">Evaluaciones</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totalEvaluations}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-medium text-gray-200">Split Tests</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totalSplitTests}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-medium text-gray-200">Tasa de Éxito</h3>
          </div>
          <p className="text-2xl font-bold text-gray-100">{evaluationPassRate}%</p>
        </div>
      </div>

      {/* Análisis de modelos */}
      <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-200">Uso de Modelos</h3>
        </div>
        <div className="grid gap-2">
          {Object.entries(modelUsage).map(([model, count]) => (
            <div key={model} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-400">{model}</div>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(count / events.length * 100)}%`
                  }}
                />
              </div>
              <div className="w-16 text-right text-sm text-gray-400">
                {((count / events.length) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Análisis de temperatura */}
      <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-medium text-gray-200">Distribución de Temperatura</h3>
        </div>
        <div className="grid gap-2">
          {Object.entries(temperatureUsage)
            .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
            .map(([temp, count]) => (
              <div key={temp} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-400">{temp}</div>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{
                      width: `${(count / totalChats * 100)}%`
                    }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-gray-400">
                  {((count / totalChats) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Análisis de tiempo de respuesta */}
      <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-medium text-gray-200">Tiempos de Respuesta</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Promedio</p>
            <p className="text-xl font-bold text-gray-100">{avgResponseTime}s</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Mínimo</p>
            <p className="text-xl font-bold text-gray-100">
              {responseTimeStats.min !== Infinity 
                ? (responseTimeStats.min / 1000).toFixed(2) 
                : '0'}s
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Máximo</p>
            <p className="text-xl font-bold text-gray-100">
              {responseTimeStats.max !== -Infinity 
                ? (responseTimeStats.max / 1000).toFixed(2) 
                : '0'}s
            </p>
          </div>
        </div>
      </div>

      {/* Análisis de evaluaciones */}
      <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-medium text-gray-200">Resultados de Evaluación</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-400">Aprobadas</p>
              <p className="text-xl font-bold text-gray-100">{passedEvaluations}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-400">No Aprobadas</p>
              <p className="text-xl font-bold text-gray-100">
                {totalEvaluations - passedEvaluations}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 