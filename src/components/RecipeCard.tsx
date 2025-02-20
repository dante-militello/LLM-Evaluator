import React from 'react';
import type { Recipe } from '../store/promptStore';
import { usePromptStore } from '../store/promptStore';
import { Trash2, X } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const prompts = usePromptStore((state) => state.prompts);
  const deleteRecipe = usePromptStore((state) => state.deleteRecipe);
  const removePromptFromRecipe = usePromptStore((state) => state.removePromptFromRecipe);

  const recipePrompts = recipe.prompts
    .map(id => prompts.find(p => p.id === id))
    .filter(Boolean);

  return (
    <div
      className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 
                 shadow-lg hover:border-blue-500/50 transition-colors group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-gray-200">{recipe.title}</h3>
        <button
          onClick={() => deleteRecipe(recipe.id)}
          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors 
                   opacity-0 group-hover:opacity-100 rounded-md hover:bg-gray-700/50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {recipePrompts.map((prompt) => (
          prompt && (
            <div
              key={prompt.id}
              className="bg-gray-700/50 p-3 rounded-md border border-gray-600 group/prompt"
            >
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-300 mb-1">
                  {prompt.title}
                </h4>
                <button
                  onClick={() => removePromptFromRecipe(recipe.id, prompt.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors 
                           opacity-0 group-hover/prompt:opacity-100 rounded-md hover:bg-gray-600/50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-gray-400">{prompt.content}</p>
            </div>
          )
        ))}
      </div>
    </div>
  );
}