import React, { useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { usePromptStore } from "../store/promptStore";
import { Save, X, ChevronDown, ChevronUp, Plus, Trash2, MessageCircle, Edit, Search, Download, Upload } from "lucide-react";
import type { Prompt, Recipe } from "../store/promptStore";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggablePrompt({ prompt, onDelete }: { prompt: Prompt; onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(prompt.title);
  const [editedContent, setEditedContent] = useState(prompt.content);
  const [editedMessages, setEditedMessages] = useState(prompt.messages || []);
  
  const updatePrompt = usePromptStore(state => state.updatePrompt);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: prompt.id,
    data: { type: "prompt", prompt },
  });

  const handleSaveChanges = async () => {
    await updatePrompt(prompt.id, {
      title: editedTitle,
      content: editedContent,
      messages: editedMessages
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(prompt.title);
    setEditedContent(prompt.content);
    setEditedMessages(prompt.messages || []);
    setIsEditing(false);
  };

  const handleAddMessage = () => {
    setEditedMessages([
      ...editedMessages,
      { id: Date.now().toString(), content: '' }
    ]);
  };

  const handleUpdateMessage = (id: string, content: string) => {
    setEditedMessages(messages =>
      messages.map(msg => msg.id === id ? { ...msg, content } : msg)
    );
  };

  const handleDeleteMessage = (id: string) => {
    setEditedMessages(messages => messages.filter(msg => msg.id !== id));
  };

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.5 : undefined }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700
                 shadow-lg hover:border-blue-500/50 transition-colors group"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-1 px-3 py-1 bg-gray-700/50 border border-gray-600 rounded
                       text-gray-200 focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div {...attributes} {...listeners} className="flex-1 cursor-grab">
              <h3 className="text-lg font-medium text-gray-200">{prompt.title}</h3>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {prompt?.messages && prompt.messages.length > 0 && (
              <div className="flex items-center gap-1 text-gray-400">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{prompt.messages.length}</span>
              </div>
            )}
            
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="p-1 text-green-400 hover:bg-gray-700/50 rounded transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-blue-400 transition-colors
                           opacity-0 group-hover:opacity-100 rounded hover:bg-gray-700/50"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-gray-700/50 rounded-full transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors 
                           opacity-0 group-hover:opacity-100 rounded hover:bg-gray-700/50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {(isExpanded || isEditing) && (
          <div className="mt-4 space-y-4">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded
                         text-gray-200 focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-400">{prompt.content}</div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-500">Messages:</h4>
                {isEditing && (
                  <button
                    onClick={handleAddMessage}
                    className="p-1 text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(isEditing ? editedMessages : prompt.messages || []).map((message, index) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-2"
                  >
                    <span className="flex-shrink-0 bg-gray-600 text-gray-400 px-1.5 py-0.5 rounded text-xs">
                      {index + 1}
                    </span>
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={message.content}
                          onChange={(e) => handleUpdateMessage(message.id, e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-700/50 border border-gray-600 
                                   rounded text-xs text-gray-200"
                        />
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300">{message.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onRemovePrompt, onDeleteRecipe, isOver }: {
  recipe: Recipe;
  onRemovePrompt: (promptId: string) => void;
  onDeleteRecipe: () => void;
  isOver: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prompts = usePromptStore((state) => state.prompts);
  const reorderPromptsInRecipe = usePromptStore((state) => state.reorderPromptsInRecipe);
  
  const { setNodeRef } = useDroppable({
    id: `recipe-${recipe.id}`,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = recipe.prompts.indexOf(active.id as string);
    const newIndex = recipe.prompts.indexOf(over.id as string);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = [...recipe.prompts];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    
    reorderPromptsInRecipe(recipe.id, newOrder);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border 
                 shadow-lg transition-all duration-200 ${
                   isOver
                     ? "border-blue-500 ring-2 ring-blue-500/50"
                     : "border-gray-700 hover:border-blue-500/50"
                 } group`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-200">{recipe.title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-700/50 rounded-full transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <button
            onClick={onDeleteRecipe}
            className="p-1 text-gray-500 hover:text-red-400 transition-colors 
                     opacity-0 group-hover:opacity-100 rounded-md hover:bg-gray-700/50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-3">
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={recipe.prompts} strategy={verticalListSortingStrategy}>
              {recipe.prompts.map((promptId) => {
                const prompt = prompts.find((p) => p.id === promptId);
                return (
                  prompt && (
                    <SortableRecipePrompt
                      key={promptId}
                      prompt={prompt}
                      onRemove={() => onRemovePrompt(promptId)}
                    />
                  )
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortableRecipePrompt({ prompt, onRemove }: { prompt: Prompt; onRemove: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: prompt.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined
  };

  // Manejador para detener la propagación del evento
  const handleButtonClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-700/50 rounded-md border border-gray-600 group"
    >
      <div className="p-3">
        {/* Área arrastrable */}
        <div className="flex justify-between items-center">
          <div {...attributes} {...listeners} className="flex-1 cursor-move">
            <h4 className="text-sm font-medium text-gray-300">{prompt.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            {prompt?.messages && prompt.messages.length > 0 && (
              <div className="flex items-center gap-1 text-gray-400">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{prompt.messages.length}</span>
              </div>
            )}
            {/* Botón expandir/colapsar */}
            <button
              onClick={(e) => handleButtonClick(e, () => setIsExpanded(!isExpanded))}
              className="p-1 hover:bg-gray-600/50 rounded-full transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {/* Botón eliminar */}
            <button
              onClick={(e) => handleButtonClick(e, onRemove)}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors 
                       opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido expandido */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="text-xs text-gray-400">{prompt.content}</div>
            {prompt?.messages && prompt.messages.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-500">Messages:</h5>
                {prompt.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="bg-gray-800/50 p-2 rounded text-xs text-gray-300 flex items-start gap-2"
                  >
                    <span className="bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded text-xs">
                      {index + 1}
                    </span>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecipeView() {
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [newRecipeTitle, setNewRecipeTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDroppableId, setActiveDroppableId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const prompts = usePromptStore((state) => state.prompts);
  const recipes = usePromptStore((state) => state.recipes);
  const addRecipe = usePromptStore((state) => state.addRecipe);
  const addPrompt = usePromptStore((state) => state.addPrompt);
  const deletePrompt = usePromptStore((state) => state.deletePrompt);
  const deleteRecipe = usePromptStore((state) => state.deleteRecipe);
  const removePromptFromRecipe = usePromptStore((state) => state.removePromptFromRecipe);

  const filteredPrompts = prompts.filter(prompt =>
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDroppableId(null);

    if (!over) return;

    const recipeId = over.id.toString().replace("recipe-", "");
    const recipe = recipes.find((r) => r.id === recipeId);

    if (recipe && !recipe.prompts.includes(active.id as string)) {
      const updatedPrompts = [...recipe.prompts, active.id as string];
      usePromptStore.getState().updateRecipe(recipeId, {
        ...recipe,
        prompts: updatedPrompts,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    setActiveDroppableId(event.over?.id.toString() || null);
  };

  const handleCreateRecipe = () => {
    if (!newRecipeTitle.trim()) return;

    addRecipe({
      title: newRecipeTitle,
      prompts: [],
    });

    setNewRecipeTitle("");
    setShowTitleInput(false);
  };

  const handleExport = () => {
    const exportData = {
      recipes,
      prompts
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipes_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        // Crear un mapa para mantener el registro de los IDs antiguos -> nuevos
        const promptIdMap = new Map<string, string>();
        
        // Importar prompts primero y guardar el mapeo de IDs
        for (const prompt of importData.prompts) {
          const oldId = prompt.id;
          const newPrompt = { ...prompt, id: Date.now().toString() };
          await addPrompt(newPrompt);
          promptIdMap.set(oldId, newPrompt.id);
        }
        
        // Luego importar recipes usando los nuevos IDs de prompts
        for (const recipe of importData.recipes) {
          // Mapear los IDs antiguos de prompts a los nuevos
          const newPromptIds = recipe.prompts.map((oldId: string) => promptIdMap.get(oldId)).filter(Boolean);
          
          await addRecipe({
            ...recipe,
            id: Date.now().toString(),
            prompts: newPromptIds
          });
        }
        
        // Limpiar el input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="space-y-4">
        <div className="flex w-full justify-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 
                     transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 
                     transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          {!showTitleInput ? (
            <button
              onClick={() => setShowTitleInput(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 
                       transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Recipe
            </button>
          ) : (
            <div className="flex items-center gap-4 w-full justify-end">
              <input
                type="text"
                value={newRecipeTitle}
                onChange={(e) => setNewRecipeTitle(e.target.value)}
                placeholder="Enter recipe title..."
                className="px-4 w-full py-2 bg-gray-800/50 border border-gray-700 rounded-md 
                         text-gray-200 placeholder-gray-500"
                autoFocus
              />
              <button
                onClick={handleCreateRecipe}
                disabled={!newRecipeTitle.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowTitleInput(false);
                  setNewRecipeTitle("");
                }}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">Available Prompts</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md 
                           text-gray-200 placeholder-gray-500 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {filteredPrompts.map((prompt) => (
                <DraggablePrompt
                  key={prompt.id}
                  prompt={prompt}
                  onDelete={() => deletePrompt(prompt.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-200">Your Recipes</h2>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onRemovePrompt={(promptId) => removePromptFromRecipe(recipe.id, promptId)}
                  onDeleteRecipe={() => deleteRecipe(recipe.id)}
                  isOver={activeDroppableId === `recipe-${recipe.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            {prompts.find((p) => p.id === activeId)?.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}