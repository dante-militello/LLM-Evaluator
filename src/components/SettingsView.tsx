import React, { useRef } from 'react';
import { usePromptStore } from '../store/promptStore';
import { OPENAI_MODELS, CLAUDE_MODELS } from '../constants';
import { Download, Upload } from 'lucide-react';

export function SettingsView() {
  const settings = usePromptStore(state => state.settings);
  const updateSettings = usePromptStore(state => state.updateSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string | number) => {
    updateSettings({ [field]: value });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_export_${new Date().toISOString().split('T')[0]}.json`;
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
        const importedSettings = JSON.parse(content);
        await updateSettings(importedSettings);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error importing settings:', error);
        alert('Error al importar la configuración. Asegúrate de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const TemperatureInput = ({ 
    label, 
    value, 
    onChange,
    min,
    max,
    step
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-gray-300 w-12 text-center">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Export/Import Buttons */}
      <div className="flex justify-end gap-2 mb-4">
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
          Importar Configuración
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 
                   transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar Configuración
        </button>
      </div>

      {/* Chat Configuration Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-200">Configuración del Chat</h2>
        
        {/* OpenAI Chat Settings */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">OpenAI Chat</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={settings.openaiApiKey}
              onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modelo
            </label>
            <select
              value={settings.chatOpenAIModel}
              onChange={(e) => handleChange('chatOpenAIModel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {OPENAI_MODELS.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <TemperatureInput
            label="Temperatura"
            value={settings.chatOpenAITemperature}
            onChange={(value) => handleChange('chatOpenAITemperature', value)}
          />
          <TemperatureInput
            label="Frequency Penalty"
            value={settings.frequencyPenalty}
            onChange={(value) => handleChange('frequencyPenalty', value)}
            min={0}
            max={2}
            step={0.1}
          />
          <TemperatureInput
            label="Presence Penalty"
            value={settings.presencePenalty}
            onChange={(value) => handleChange('presencePenalty', value)}
            min={0}
            max={2}
            step={0.1}
          />
        </div>

        {/* Deepseek Chat Settings */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">Deepseek Chat</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={settings.deepseekApiKey}
              onChange={(e) => handleChange('deepseekApiKey', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sk-..."
            />
          </div>
        </div>

        {/* Claude Chat Settings */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">Claude Chat</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={settings.claudeApiKey}
              onChange={(e) => handleChange('claudeApiKey', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modelo
            </label>
            <select
              value={settings.chatClaudeModel}
              onChange={(e) => handleChange('chatClaudeModel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CLAUDE_MODELS.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <TemperatureInput
            label="Temperatura"
            value={settings.chatClaudeTemperature}
            onChange={(value) => handleChange('chatClaudeTemperature', value)}
          />
        </div>
      </div>

      {/* Evaluation Configuration Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-200">Configuración de Evaluación</h2>
        
        {/* Models */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">Modelos</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modelo para Prompts
            </label>
            <select
              value={settings.promptEvalModel}
              onChange={(e) => handleChange('promptEvalModel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {OPENAI_MODELS.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modelo del Evaluador
            </label>
            <select
              value={settings.evaluatorModel}
              onChange={(e) => handleChange('evaluatorModel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {OPENAI_MODELS.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Temperatures */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">Temperaturas</h3>
          <TemperatureInput
            label="Temperatura para Evaluación de Prompts"
            value={settings.promptEvalTemperature}
            onChange={(value) => handleChange('promptEvalTemperature', value)}
          />
          <TemperatureInput
            label="Temperatura del Evaluador"
            value={settings.evaluationTemperature}
            onChange={(value) => handleChange('evaluationTemperature', value)}
          />
        </div>

        {/* Evaluation Prompt */}
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-300">Prompt de Evaluación</h3>
          <div>
            <textarea
              value={settings.evaluationPrompt}
              onChange={(e) => handleChange('evaluationPrompt', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md 
                       text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}