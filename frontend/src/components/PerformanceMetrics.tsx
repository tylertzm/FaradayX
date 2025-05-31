import React from 'react';
import { Clock, Zap, DollarSign } from 'lucide-react';
import BarChart from './BarChart';

interface PerformanceMetricsProps {
  response: any;
  formatNumber: (num: number | null | undefined) => string;
  extractPredictedRuntime: (rawText: string | undefined) => number | null;
  extractPredictedPower: (rawText: string | undefined) => number | null;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ response, formatNumber, extractPredictedRuntime, extractPredictedPower }) => (
  <div className="col-span-8 bg-slate-800/40 backdrop-blur-sm rounded-xl p-2 border border-slate-700/50 shadow-lg h-[45vh]">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-sm font-semibold">Performance Metrics</h3>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div>
        <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" />
          RUNTIME
        </div>
        <div className="h-[10vh]">
          <BarChart height={72} bars={10} />
        </div>
        <div className="text-lg font-light bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {formatNumber(response.predictedRuntime || extractPredictedRuntime(response.raw))}s
        </div>
        <div className="text-[10px] text-slate-400">predicted runtime</div>
        <div className="text-[10px] text-slate-400 mt-1">Input tokens: {typeof response.model?.input_token_length === 'number' ? response.model.input_token_length : 'N/A'}</div>
        <div className="text-[10px] text-slate-400">Output tokens: {typeof response.model?.output_token_length === 'number' ? response.model.output_token_length : 'N/A'}</div>
      </div>
      <div>
        <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-yellow-400" />
          ENERGY
        </div>
        <div className="h-[10vh]">
          <BarChart height={72} bars={10} />
        </div>
        <div className="text-lg font-light bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {formatNumber(response.energyUsed)} Wh
        </div>
        <div className="text-[10px] text-slate-400">energy used</div>
      </div>
      <div>
        <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-green-400" />
          COST
        </div>
        <div className="h-[10vh]">
          <BarChart height={72} bars={10} />
        </div>
        <div className="text-xl font-light bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
          {formatNumber(response.costCents)}¢
        </div>
        <div className="text-[2vh] text-slate-400">per inference</div>
      </div>
    </div>
  </div>
);

export default PerformanceMetrics;
