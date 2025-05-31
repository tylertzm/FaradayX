import React from 'react';
import { Cpu, TrendingUp } from 'lucide-react';

interface HardwareInfo {
  cpu_frequency: number;
  device: string;
  gpu_available: boolean;
  machine: string;
  memory_bytes: number;
  num_cores: number;
  os: string;
  os_version: string;
}

interface ModelInfo {
  input_token_length?: number;
  output_token_length?: number;
  [key: string]: string | number | boolean | null | undefined | object;
}

interface PredictionResponse {
  hardware: HardwareInfo | null;
  predictedRuntime: number | null;
  actualRuntime: number | null;
  error: number | null;
  model?: ModelInfo;
  raw?: string;
}

interface CTOViewProps {
  response: PredictionResponse | null;
  formatNumber: (num: number | null | undefined) => string;
  extractPredictedRuntime: (rawText: string | undefined) => number | null;
  extractActualRuntime: (rawText: string | undefined) => number | null;
  extractInputTokenLength: (model: ModelInfo, rawText: string | undefined) => number | null;
  extractOutputTokenLength: (model: ModelInfo, rawText: string | undefined) => number | null;
}

const CTOView: React.FC<CTOViewProps> = ({ response, formatNumber, extractPredictedRuntime, extractActualRuntime, extractInputTokenLength, extractOutputTokenLength }) => {
  if (!response) return null;
  const inputTokens = extractInputTokenLength(response.model, response.raw);
  const outputTokens = extractOutputTokenLength(response.model, response.raw);
  return (
    <div className="p-2">
      <h3 className="text-lg font-semibold mb-4 text-blue-200">CTO Executive View</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-1"><Cpu className="w-4 h-4" /> Hardware Utilization</h4>
          <div className="text-xs text-slate-400 mb-1">Cores Used</div>
          <div className="text-lg font-light">{formatNumber(response.hardware?.num_cores)} / 12</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Memory</div>
          <div className="text-lg font-light">{formatNumber(response.hardware?.memory_bytes / 1e9)} GB</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">GPU</div>
          <div className="text-lg font-light">{response.hardware?.gpu_available ? 'Available' : 'Not Available'}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-purple-300 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Model Performance</h4>
          <div className="text-xs text-slate-400 mb-1">Input Token Length</div>
          <div className="text-lg font-light">{inputTokens !== undefined ? formatNumber(inputTokens) : 'N/A'}</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Output Token Length</div>
          <div className="text-lg font-light">{outputTokens !== undefined ? formatNumber(outputTokens) : 'N/A'}</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Predicted Runtime</div>
          <div className="text-lg font-light">{formatNumber(response.predictedRuntime || extractPredictedRuntime(response.raw))}s</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Actual Runtime</div>
          <div className="text-lg font-light">{formatNumber(response.actualRuntime || extractActualRuntime(response.raw))}s</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Error Rate</div>
          <div className="text-lg font-light">{formatNumber(response.error)}%</div>
        </div>
      </div>
      <div className="mt-6 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Note:</span> For deeper fleet-wide analytics, see <span className="text-blue-300">benchmarks.csv</span> and <span className="text-blue-300">hardware features</span> in the backend. (Integrate backend endpoints for full fleet stats.)
      </div>
    </div>
  );
};

export default CTOView;
