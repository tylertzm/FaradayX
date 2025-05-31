import React from 'react';

interface SystemStatusProps {
  response: any;
  formatNumber: (num: number | null | undefined) => string;
  calculateAccuracy: (metric: 'runtime' | 'power' | 'cost', response: any) => number;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ response, formatNumber, calculateAccuracy }) => (
  <div className="col-span-4 bg-slate-800/40 backdrop-blur-sm rounded-xl p-2 border border-slate-700/50 shadow-lg h-[45vh]">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-sm font-semibold">System Status</h3>
    </div>
    <div className="flex items-center justify-between p-1.5 bg-slate-700/30 rounded-lg mb-1.5">
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 ${response.hardware?.gpu_available ? 'bg-green-400' : 'bg-red-400'} rounded-full animate-pulse`}></div>
        <span className="text-xs">GPU {response.hardware?.gpu_available ? 'Connected' : 'Not Connected'}</span>
      </div>
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">Available Compute</span>
        <span className="text-xs font-light">{response.hardware?.num_cores ? Math.round((response.hardware.num_cores / 12) * 100).toFixed(3) + '%' : 'N/A'}</span>
      </div>
      <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden mb-1.5">
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: response.hardware?.num_cores ? `${(Math.round((response.hardware.num_cores / 12) * 100)).toFixed(3)}%` : '0%'
          }}
        ></div>
      </div>
    </div>
    <div className="text-center p-1.5 mb-1.5 text-xs">
      <div className="text-slate-400 mb-0.5">{response.hardware?.device || 'Unknown Device'}</div>
      <div className="text-[10px] text-slate-500">{formatNumber(response.hardware?.num_cores)} cores • {formatNumber(response.hardware?.memory_bytes / 1e9)}GB RAM</div>
    </div>
    <div className="p-1.5 bg-slate-700/30 rounded-lg">
      <div className="mb-1">
        <span className="text-xs">Prediction Accuracy</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-center text-xs">
        <div>
          <div className="text-green-400">{calculateAccuracy('runtime', response).toFixed(3)}%</div>
          <div className="text-[10px] text-slate-500">Runtime</div>
        </div>
        <div>
          <div className="text-blue-400">{calculateAccuracy('power', response).toFixed(3)}%</div>
          <div className="text-[10px] text-slate-500">Power</div>
        </div>
      </div>
    </div>
  </div>
);

export default SystemStatus;
