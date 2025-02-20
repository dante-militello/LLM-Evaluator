import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import type { Prompt } from '../store/promptStore';
import { usePromptStore } from '../store/promptStore';

interface PromptCardProps {
  prompt: Prompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const deletePrompt = usePromptStore((state) => state.deletePrompt);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: prompt.id,
    data: {
      type: 'prompt',
      prompt
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: 'move'
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deletePrompt(prompt.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 
                 shadow-lg hover:border-blue-500/50 transition-colors group touch-none"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium text-gray-200 mb-2">{prompt.title}</h3>
        <button
          onClick={handleDelete}
          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors 
                   opacity-0 group-hover:opacity-100 rounded-md hover:bg-gray-700/50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-gray-400 text-sm">{prompt.content}</p>
    </div>
  );
}