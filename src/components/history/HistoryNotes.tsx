import React, { useState } from 'react';
import { Tag, Note } from '../../types/history';
import { Plus, X, Save, Tag as TagIcon } from 'lucide-react';

interface Props {
  itemId: string;
  tags: Tag[];
  notes: Note[];
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
  onAddNote: (note: Note) => void;
  onRemoveNote: (noteId: string) => void;
}

export function HistoryNotes({
  itemId,
  tags,
  notes,
  onAddTag,
  onRemoveTag,
  onAddNote,
  onRemoveNote
}: Props) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6'); // Blue-500
  const [newNote, setNewNote] = useState('');

  const handleAddTag = () => {
    if (!newTagLabel.trim()) return;

    onAddTag({
      id: Date.now().toString(),
      name: newTagLabel.trim(),
      color: newTagColor
    });

    setNewTagLabel('');
    setShowAddTag(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    onAddNote({
      id: Date.now().toString(),
      eventId: itemId,
      content: newNote.trim(),
      timestamp: new Date().getTime()
    });

    setNewNote('');
  };

  return (
    <div className="space-y-4">
      {/* Tags Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">Etiquetas</h4>
          <button
            onClick={() => setShowAddTag(!showAddTag)}
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
          >
            {showAddTag ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {showAddTag && (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newTagLabel}
              onChange={(e) => setNewTagLabel(e.target.value)}
              placeholder="Nueva etiqueta..."
              className="flex-1 px-2 py-1 text-sm bg-gray-700/50 border border-gray-600 
                       rounded text-gray-200"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagLabel.trim()}
              className="p-1 text-green-400 hover:text-green-300 transition-colors 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              <TagIcon className="w-3 h-3" />
              <span>{tag.name}</span>
              <button
                onClick={() => onRemoveTag(tag.id)}
                className="p-0.5 hover:bg-gray-700/30 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Notas</h4>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Añadir nota..."
              className="flex-1 px-3 py-1.5 text-sm bg-gray-700/50 border border-gray-600 
                       rounded text-gray-200"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Añadir
            </button>
          </div>

          {notes.map(note => (
            <div
              key={note.id}
              className="bg-gray-800/50 p-3 rounded flex items-start justify-between gap-4"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {note.content}
                </p>
                <time className="text-xs text-gray-500">
                  {new Date(note.timestamp).toLocaleString()}
                </time>
              </div>
              <button
                onClick={() => onRemoveNote(note.id)}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 