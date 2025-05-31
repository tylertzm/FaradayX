import React from 'react';
import { Settings } from 'lucide-react';

interface ModelFeaturesProps {
  modelOnlyFields: Record<string, unknown>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const ModelFeatures: React.FC<ModelFeaturesProps> = ({ modelOnlyFields }) => {
  if (!modelOnlyFields || Object.keys(modelOnlyFields).length === 0) return null;
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-[2vw] border border-slate-700/50 shadow-lg" style={{ height: '45vh', width: '30vw', minWidth: 0, maxWidth: '100vw', boxSizing: 'border-box' }}>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ fontSize: '1.2vw' }}>
        <Settings className="w-4 h-4 text-purple-400" />
        Model Configuration
      </h4>
      <div className="overflow-x-auto overflow-y-auto" style={{ height: '38vh', minWidth: 0 }}>
        <table className="min-w-full text-xs text-left text-slate-300" style={{ fontSize: '1vw', width: '100%' }}>
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="px-2 py-1 font-medium" style={{ width: '40%' }}>Field</th>
              <th className="px-2 py-1 font-medium" style={{ width: '60%' }}>Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {Object.entries(modelOnlyFields).map(([key, value]) => (
              <tr key={key} className="hover:bg-slate-700/20">
                <td className="px-2 py-1 font-medium whitespace-nowrap text-slate-400 align-top" style={{ fontSize: '1vw', maxWidth: '18vw', overflow: 'hidden', textOverflow: 'ellipsis' }}>{key.replace(/_/g, ' ')}</td>
                <td className="px-2 py-1 whitespace-pre-wrap break-all align-top" style={{ fontSize: '1vw', maxWidth: '30vw', wordBreak: 'break-word' }}>{formatValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModelFeatures;
