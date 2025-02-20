import React from 'react';
import { MessageSquare, ChefHat, Scale, Settings, History, Terminal, MessagesSquare } from 'lucide-react';
import { ChatTest } from './ChatTest';
import { HistoryView } from './HistoryView';
import { SettingsView } from './SettingsView';
import { ConsoleView } from './ConsoleView';
import { EvaluatorView } from './EvaluatorView';
import { SplitTest } from './SplitTest';
import { PromptForm } from './PromptForm';
import { RecipeView } from './RecipeView';

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: 'prompts', label: 'Prompts', component: PromptForm, icon: MessageSquare },
  { id: 'recipes', label: 'Recipes', component: RecipeView, icon: ChefHat },
  { id: 'evaluator', label: 'Evaluator', component: EvaluatorView, icon: Scale },
  { id: 'chat', label: 'Test Chat', component: ChatTest, icon: MessageSquare },
  { id: 'split', label: 'Split Test', component: SplitTest, icon: MessagesSquare },
  { id: 'history', label: 'History', component: HistoryView, icon: History },
  { id: 'settings', label: 'Settings', component: SettingsView, icon: Settings },
  { id: 'console', label: 'Console', component: ConsoleView, icon: Terminal }
] as const;

export function Tabs({ activeTab, setActiveTab }: TabProps) {
  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || ChatTest;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none border-b border-gray-700">
        <nav className="flex space-x-4 px-4" aria-label="Tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                px-3 py-2 text-sm font-medium rounded-md
                ${activeTab === id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  );
}