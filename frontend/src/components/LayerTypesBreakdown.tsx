import React from 'react';
import { Monitor } from 'lucide-react';

interface LayerTypesBreakdownProps {
  layerTypes: Record<string, number>;
}

const LayerTypesBreakdown: React.FC<LayerTypesBreakdownProps> = ({ layerTypes }) => {
  if (!layerTypes) return null;
  const total = Object.values(layerTypes).reduce((sum, n) => sum + n, 0);
  const sorted = Object.entries(layerTypes).sort(([, a], [, b]) => b - a);
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg mt-2" style={{ height: '45vh', width: '30vw', minWidth: 0, maxWidth: '100vw', boxSizing: 'border-box' }}>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Monitor className="w-4 h-4 text-green-400" />
        Layer Types Breakdown
        <span className="text-xs text-slate-500 ml-auto">{sorted.length} unique layer types</span>
      </h4>
      <div className="overflow-x-auto h-[38vh] relative scrollable-data-table">
        <table className="min-w-full text-xs text-left text-slate-300">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="px-2 py-1 font-medium">Layer Type</th>
              <th className="px-2 py-1 font-medium text-right">Count</th>
              <th className="px-2 py-1 font-medium text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {sorted.map(([type, count]) => (
              <tr key={type} className="hover:bg-slate-700/20">
                <td className="px-2 py-1 font-medium whitespace-nowrap text-blue-300 align-top">{type}</td>
                <td className="px-2 py-1 text-right align-top">{count.toLocaleString()}</td>
                <td className="px-2 py-1 text-right align-top">{total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LayerTypesBreakdown;
