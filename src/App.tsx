import React, { useEffect } from 'react';
import { Tabs } from './components/Tabs';
import { usePromptStore } from './store/promptStore';

export function App() {
  const [activeTab, setActiveTab] = React.useState('prompts');
  const initializeStore = usePromptStore(state => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-blue-400 mb-8 text-center">
          OpenAI Response Evaluator
        </h1>
        
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}