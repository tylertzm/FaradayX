import React from 'react';
import { Cpu, TrendingUp, Monitor, Activity, Clock, Zap, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

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
  predictedPower?: number | null;
  actualPower?: number | null;
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
  if (!response) {
    return (
      <div className="p-2 h-[85vh] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-sm font-medium mb-1">No Infrastructure Data</div>
          <div className="text-xs">Run an inference to see technical metrics</div>
        </div>
      </div>
    );
  }

  const inputTokens = extractInputTokenLength(response.model, response.raw);
  const outputTokens = extractOutputTokenLength(response.model, response.raw);
  const predictedRuntime = response.predictedRuntime || extractPredictedRuntime(response.raw);
  const actualRuntime = response.actualRuntime || extractActualRuntime(response.raw);
  const errorRate = response.error;

  // Calculate performance indicators
  const runtimeAccuracy = predictedRuntime && actualRuntime ? 
    (1 - Math.abs(predictedRuntime - actualRuntime) / predictedRuntime) * 100 : null;
  const throughput = inputTokens && actualRuntime ? inputTokens / actualRuntime : null;

  // System health indicators
  const systemStatus = {
    gpu: response.hardware?.gpu_available ? 'healthy' : 'warning',
    memory: response.hardware?.memory_bytes ? 
      (response.hardware.memory_bytes / 1e9 > 8 ? 'healthy' : 'warning') : 'unknown',
    performance: errorRate !== null ? 
      (errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'critical') : 'unknown'
  };

  const BarChart = ({ height = 60, bars = 20, data }: { height?: number; bars?: number; data?: number[] }) => {
    const heights = data || Array.from({ length: bars }, () => Math.random() * height + 5);
    return (
      <div className="flex items-end gap-[1px]" style={{ height: `${height}px` }}>
        {heights.map((h, i) => (
          <div
            key={i}
            className="bg-gradient-to-t from-blue-500/60 to-blue-400/40 flex-1 rounded-sm transition-all duration-300 hover:from-blue-400/80 hover:to-blue-300/60"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-2 h-[85vh] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-200 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          CTO Executive Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            Object.values(systemStatus).every(s => s === 'healthy') ? 'bg-green-400 animate-pulse' :
            Object.values(systemStatus).some(s => s === 'critical') ? 'bg-red-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
          }`}></div>
          <span className="text-xs text-slate-400">System Health</span>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-green-400" />
              Throughput
            </div>
            <TrendingUp className="w-3 h-3 text-green-400" />
          </div>
          <div className="text-lg font-light text-white">
            {throughput ? `${formatNumber(throughput)}/s` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">tokens per second</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              Accuracy
            </div>
            <BarChart3 className="w-3 h-3 text-blue-400" />
          </div>
          <div className="text-lg font-light text-white">
            {runtimeAccuracy ? `${formatNumber(runtimeAccuracy)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">prediction accuracy</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Power
            </div>
            {systemStatus.performance === 'healthy' ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> : 
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            }
          </div>
          <div className="text-lg font-light text-white">
            {response.predictedPower ? `${formatNumber(response.predictedPower)}W` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">predicted draw</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Error Rate
            </div>
            {systemStatus.performance === 'healthy' ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> : 
              systemStatus.performance === 'critical' ? 
              <XCircle className="w-3 h-3 text-red-400" /> :
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            }
          </div>
          <div className={`text-lg font-light ${
            systemStatus.performance === 'healthy' ? 'text-green-400' : 
            systemStatus.performance === 'critical' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {errorRate !== null ? `${formatNumber(errorRate)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">prediction error</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-2">
        {/* Infrastructure Overview */}
        <div className="col-span-6 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[30vh]">
          <h4 className="text-sm font-semibold mb-3 text-blue-300 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Infrastructure Overview
          </h4>
          <div className="grid grid-cols-2 gap-3 h-[22vh]">
            <div className="space-y-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">CPU Cores</div>
                <div className="text-lg font-light text-white flex items-center justify-between">
                  {formatNumber(response.hardware?.num_cores)}
                  <div className="text-xs text-slate-500">/ 12 available</div>
                </div>
                <div className="w-full bg-slate-600/30 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((response.hardware?.num_cores || 0) / 12) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Memory</div>
                <div className="text-lg font-light text-white">
                  {formatNumber((response.hardware?.memory_bytes || 0) / 1e9)} GB
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {response.hardware?.machine || 'Unknown machine'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">GPU Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    response.hardware?.gpu_available ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <div className="text-sm font-medium text-white">
                    {response.hardware?.gpu_available ? 'Available' : 'Unavailable'}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {response.hardware?.device || 'Unknown device'}
                </div>
              </div>

              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Operating System</div>
                <div className="text-sm font-medium text-white">
                  {response.hardware?.os || 'Unknown'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {response.hardware?.os_version || 'Version unknown'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Analytics */}
        <div className="col-span-6 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[30vh]">
          <h4 className="text-sm font-semibold mb-3 text-purple-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance Analytics
          </h4>
          <div className="space-y-3 h-[22vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Input Tokens</div>
                <div className="text-lg font-light text-white">
                  {inputTokens !== null ? formatNumber(inputTokens) : 'N/A'}
                </div>
                <div className="h-8 mt-1">
                  <BarChart height={25} bars={8} />
                </div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Output Tokens</div>
                <div className="text-lg font-light text-white">
                  {outputTokens !== null ? formatNumber(outputTokens) : 'N/A'}
                </div>
                <div className="h-8 mt-1">
                  <BarChart height={25} bars={8} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Predicted Runtime</div>
                <div className="text-lg font-light text-white">
                  {predictedRuntime ? `${formatNumber(predictedRuntime)}s` : 'N/A'}
                </div>
                <div className="text-xs text-blue-400 mt-1">Model estimate</div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Actual Runtime</div>
                <div className="text-lg font-light text-white">
                  {actualRuntime ? `${formatNumber(actualRuntime)}s` : 'N/A'}
                </div>
                <div className="text-xs text-green-400 mt-1">Measured</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet & Model Insights */}
        <div className="col-span-12 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[25vh] mt-2">
          <h4 className="text-sm font-semibold mb-3 text-amber-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Technical Insights & Recommendations
          </h4>
          <div className="grid grid-cols-3 gap-4 h-[17vh]">
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                System Optimization
              </h5>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    response.hardware?.gpu_available ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>{response.hardware?.gpu_available ? 'GPU acceleration active' : 'Consider GPU acceleration'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (response.hardware?.memory_bytes || 0) / 1e9 > 16 ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>
                    {(response.hardware?.memory_bytes || 0) / 1e9 > 16 ? 
                      'Memory capacity optimal' : 
                      'Memory may be limiting factor'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (response.hardware?.cpu_frequency || 0) > 3000 ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>CPU frequency: {formatNumber(response.hardware?.cpu_frequency)} MHz</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Model Performance
              </h5>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (errorRate || 0) < 5 ? 'bg-green-400' : (errorRate || 0) < 15 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span>
                    {(errorRate || 0) < 5 ? 'Excellent accuracy' : 
                     (errorRate || 0) < 15 ? 'Good accuracy' : 'Accuracy needs improvement'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (runtimeAccuracy || 0) > 90 ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>
                    Runtime prediction: {runtimeAccuracy ? `${formatNumber(runtimeAccuracy)}% accurate` : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Throughput: {throughput ? `${formatNumber(throughput)} tok/s` : 'Calculating...'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Next Steps
              </h5>
              <div className="space-y-2 text-xs text-slate-400">
                <div>• Monitor fleet performance via benchmarks.csv</div>
                <div>• Implement auto-scaling for peak loads</div>
                <div>• Consider model quantization for efficiency</div>
                <div>• Set up alerts for error rate thresholds</div>
                <div>• Analyze hardware utilization patterns</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-xs text-slate-400 bg-slate-700/20 rounded-lg p-2 border border-slate-600/20">
        <span className="font-semibold text-slate-300">Technical Note:</span> This executive dashboard aggregates real-time infrastructure metrics. 
        For detailed fleet analytics, integrate with <span className="text-blue-300">benchmarks.csv</span> and backend monitoring systems. 
        Consider implementing distributed tracing for multi-node deployments.
      </div>
    </div>
  );
};

export default CTOView;
