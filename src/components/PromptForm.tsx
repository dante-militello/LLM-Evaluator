import React, { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { usePromptStore } from '../store/promptStore';

export function PromptForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState<{ id: string; content: string }[]>([]);
  const addPrompt = usePromptStore(state => state.addPrompt);

  const handleAddMessage = () => {
    setMessages([...messages, { id: Date.now().toString(), content: '' }]);
  };

  const handleMessageChange = (id: string, content: string) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    ));
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    addPrompt({
      title,
      content,
      messages: messages.filter(msg => msg.content.trim())
    });

    setTitle('');
    setContent('');
    setMessages([]);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 
                     placeholder-gray-500 backdrop-blur-sm"
            placeholder="Enter prompt title..."
          />
        </div>
        
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 
                     placeholder-gray-500 backdrop-blur-sm"
            placeholder="Enter your prompt here..."
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-200">Messages</h3>
            <button
              onClick={handleAddMessage}
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center 
                     text-white hover:bg-blue-500 transition-colors 
                     shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className="flex gap-2 group items-center">
                <div className="flex-shrink-0 w-8">
                  <div className="w-8 h-8 flex items-center justify-center 
                              bg-gray-700/50 rounded-full text-gray-400 font-medium">
                    {index + 1}
                  </div>
                </div>
                <input
                  type="text"
                  value={message.content}
                  onChange={(e) => handleMessageChange(message.id, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 
                           placeholder-gray-500 backdrop-blur-sm"
                  placeholder={`Enter message ${index + 1}...`}
                />
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors 
                           opacity-0 group-hover:opacity-100 rounded-md hover:bg-gray-700/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 
                 text-white rounded-md hover:bg-green-500 transition-colors 
                 shadow-lg shadow-green-500/20"
      >
        <Save className="w-4 h-4 mr-2" />
        Save Prompt
      </button>
    </div>
  );
}