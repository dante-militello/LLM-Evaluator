import React, { useState } from 'react';
import { usePromptStore, Message } from '../store/promptStore';
import { Play, CheckCircle2, XCircle, AlertCircle, MessageCircle } from 'lucide-react';

interface MessageWithPromptTitle extends Message {
  promptTitle: string;
}

function MessageCard({ message, promptTitle }: { 
  message: MessageWithPromptTitle;
  promptTitle: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const updateMessage = usePromptStore(state => state.updateMessage);

  const handleSave = async () => {
    await updateMessage(message.id, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <div className="text-sm text-gray-400 mb-2">
        Prompt: {promptTitle}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">Mensaje:</h4>
          {!message.evaluation && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/30 border border-gray-600 rounded
                       text-gray-200 focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300 
                         transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-400 
                         text-white rounded transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 bg-gray-700/30 p-3 rounded">
            {message.content}
          </p>
        )}
      </div>

      {message.evaluation && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Respuesta:</h4>
            <div className="bg-gray-700/30 p-3 rounded">
              <p className="text-gray-300">{message.evaluation.response}</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {message.evaluation.evaluation.passed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Approved</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">Not Approved</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded">
              {message.evaluation.evaluation.reason}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function EvaluatorView() {
  const {
    prompts,
    recipes,
    selectedRecipe,
    isEvaluating,
    error,
    selectRecipe,
    evaluateMessages
  } = usePromptStore();

  const handleEvaluate = () => {
    if (!selectedRecipe) {
      alert('Por favor selecciona una receta para evaluar');
      return;
    }
    evaluateMessages();
  };

  const selectedRecipeData = recipes.find(r => r.id === selectedRecipe);
  const selectedPrompts = selectedRecipeData
    ? selectedRecipeData.prompts
        .map(promptId => prompts.find(p => p.id === promptId))
        .filter(Boolean)
    : [];

  const allMessages = selectedPrompts.flatMap(prompt => 
    prompt?.messages ? prompt.messages.map(message => ({
      ...message,
      promptTitle: prompt.title
    })) : []
  );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating || !selectedRecipe}
          className={`px-8 py-4 text-lg font-semibold rounded-lg shadow-lg 
                     flex items-center justify-center mx-auto space-x-2
                     ${isEvaluating || !selectedRecipe
                       ? 'bg-gray-600 cursor-not-allowed' 
                       : 'bg-blue-600 hover:bg-blue-500'} 
                     text-white transition-colors`}
        >
          <Play className="w-6 h-6 mr-2" />
          {isEvaluating ? 'Evaluando...' : 'Iniciar Evaluación'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Recetas Disponibles</h2>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-4">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => selectRecipe(recipe.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all
                           ${selectedRecipe === recipe.id
                             ? 'bg-blue-600/20 border-blue-500'
                             : 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50'}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium text-gray-200">{recipe.title}</h3>
                  {selectedRecipe === recipe.id ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {recipe.prompts.map(promptId => {
                    const prompt = prompts.find(p => p.id === promptId);
                    return prompt && (
                      <div key={promptId} className="flex items-center gap-2 text-sm text-gray-400">
                        <span>• {prompt.title}</span>
                        {prompt?.messages && prompt.messages.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <MessageCircle className="w-3 h-3" />
                            <span className="text-xs">{prompt.messages.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Mensajes y Evaluaciones
          </h2>
          {selectedRecipe ? (
            <div className="space-y-6">
              {allMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  promptTitle={message.promptTitle}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Selecciona una receta para ver los mensajes y evaluaciones
            </div>
          )}
        </div>
      </div>
    </div>
  );
}