import React from 'react';
import { TimelineEvent } from '../../types/history';
import { 
  MessageCircle, Scale, GitCompare, Clock, 
  CheckCircle, XCircle, ArrowLeft
} from 'lucide-react';
import { usePromptStore } from '../../store/promptStore';

interface Props {
  event: TimelineEvent;
  onClose: () => void;
}

export const HistoryDetailView: React.FC<Props> = ({ event, onClose }) => {
  const handleRestoreChat = usePromptStore((state) => state.handleRestoreChat);

  const onRestoreChat = () => {
    if (event.type === 'chat') {
      handleRestoreChat(event.details);
      onClose();
    }
  };

  const renderEventIcon = () => {
    switch (event.type) {
      case 'chat':
        return <MessageCircle className="w-6 h-6 text-blue-400" />;
      case 'evaluation':
        return <Scale className="w-6 h-6 text-green-400" />;
      case 'splitTest':
        return <GitCompare className="w-6 h-6 text-purple-400" />;
      default:
        return null;
    }
  };

  const renderEventContent = () => {
    switch (event.type) {
      case 'chat':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Chat Session</h3>
              <button
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                onClick={onRestoreChat}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Restaurar Chat</span>
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300"><strong className="text-gray-200">Recipe:</strong> {event.details.recipe?.title || 'Unknown'}</p>
              <p className="text-gray-300"><strong className="text-gray-200">Messages:</strong> {event.details.messages.length}</p>
              <div className="space-y-2">
                {event.details.messages.map((message, index) => (
                  <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="font-medium text-gray-200 mb-1">{message.role}</p>
                    <p className="text-sm text-gray-300">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'evaluation':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Evaluación</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <strong className="text-gray-200">Estado:</strong>
                  {event.details.evaluation?.passed ? (
                    <span className="flex items-center text-green-400">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="flex items-center text-red-400">
                      <XCircle className="w-4 h-4 mr-1" />
                      No Aprobado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-gray-300">
                    <strong className="text-gray-200">Modelo:</strong> {event.details.model}
                  </p>
                  {event.details.temperature && (
                    <p className="text-gray-300">
                      <strong className="text-gray-200">Temperatura:</strong> {event.details.temperature}
                    </p>
                  )}
                </div>
              </div>
              {event.details.recipe && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-200 font-medium mb-2">Recipe:</p>
                  <p className="text-sm text-gray-300"><strong className="text-gray-200">Nombre:</strong> {event.details.recipe.title}</p>
                  <p className="text-sm text-gray-300"><strong className="text-gray-200">Descripción:</strong> {event.details.recipe.description}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-200 font-medium mb-1">Mensaje:</p>
                  <p className="text-sm text-gray-300">{event.details.message}</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-200 font-medium mb-1">Respuesta:</p>
                  <p className="text-sm text-gray-300">{event.details.response}</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-200 font-medium mb-1">Evaluación:</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">{event.details.evaluation?.reason}</p>
                    {event.details.evaluation?.score !== undefined && (
                      <p className="text-sm">
                        <strong className="text-gray-200">Puntuación:</strong>
                        <span className="text-gray-300 ml-2">{event.details.evaluation.score}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'splitTest':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Split Test</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h4 className="font-medium text-gray-200 mb-2">Recipe A</h4>
                <p className="text-gray-300"><strong className="text-gray-200">Nombre:</strong> {event.details.recipeA.title}</p>
                <p className="text-gray-300"><strong className="text-gray-200">Descripción:</strong> {event.details.recipeA.description}</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h4 className="font-medium text-gray-200 mb-2">Recipe B</h4>
                <p className="text-gray-300"><strong className="text-gray-200">Nombre:</strong> {event.details.recipeB.title}</p>
                <p className="text-gray-300"><strong className="text-gray-200">Descripción:</strong> {event.details.recipeB.description}</p>
              </div>
              {event.details.summary && (
                <>
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="font-medium text-gray-200 mb-2">Análisis General</h4>
                    {(() => {
                      try {
                        const analysis = JSON.parse(event.details.summary.content);
                        return (
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-1">Resumen</h5>
                              <p className="text-sm text-gray-300">{analysis.analysis.summary}</p>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-1">Patrones en Respuestas Preferidas</h5>
                              <p className="text-sm text-gray-300">{analysis.analysis.patternsFavoredResponses}</p>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-1">Análisis Recipe A</h5>
                              <p className="text-sm text-gray-300">{analysis.analysis.recipeAAnalysis}</p>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-1">Análisis Recipe B</h5>
                              <p className="text-sm text-gray-300">{analysis.analysis.recipeBAnalysis}</p>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return <p className="text-sm text-gray-300">{event.details.summary.content}</p>;
                      }
                    })()}
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="font-medium text-gray-200 mb-2">Recomendaciones</h4>
                    {(() => {
                      try {
                        const analysis = JSON.parse(event.details.summary.content);
                        return (
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-2">Recipe A</h5>
                              <div className="space-y-2">
                                {analysis.recommendations.recipeA.modifications.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-blue-400">Modificaciones Sugeridas:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeA.modifications.map((mod: string, i: number) => (
                                        <li key={i}>{mod}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {analysis.recommendations.recipeA.additions.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-green-400">Prompts a Agregar:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeA.additions.map((add: string, i: number) => (
                                        <li key={i}>{add}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {analysis.recommendations.recipeA.removals.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-red-400">Prompts a Considerar Eliminar:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeA.removals.map((rem: string, i: number) => (
                                        <li key={i}>{rem}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-200 mb-2">Recipe B</h5>
                              <div className="space-y-2">
                                {analysis.recommendations.recipeB.modifications.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-blue-400">Modificaciones Sugeridas:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeB.modifications.map((mod: string, i: number) => (
                                        <li key={i}>{mod}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {analysis.recommendations.recipeB.additions.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-green-400">Prompts a Agregar:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeB.additions.map((add: string, i: number) => (
                                        <li key={i}>{add}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {analysis.recommendations.recipeB.removals.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-red-400">Prompts a Considerar Eliminar:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
                                      {analysis.recommendations.recipeB.removals.map((rem: string, i: number) => (
                                        <li key={i}>{rem}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return <p className="text-sm text-gray-300">{event.details.summary.improvedPrompt}</p>;
                      }
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-6 bg-gray-900/50 rounded-xl">
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-700">
        {renderEventIcon()}
        <span className="text-sm text-gray-400 flex items-center">
          <Clock className="w-4 h-4 inline-block mr-1" />
          {new Date(event.timestamp).toLocaleString()}
        </span>
      </div>
      {renderEventContent()}
    </div>
  );
}; 