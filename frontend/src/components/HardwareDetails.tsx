import React from 'react';
import { Cpu } from 'lucide-react';

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

interface HardwareDetailsProps {
  hardware: HardwareInfo | null;
  formatNumber: (num: number | null | undefined) => string;
}

const HardwareDetails: React.FC<HardwareDetailsProps> = ({ hardware, formatNumber }) => {
  if (!hardware) return null;
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-[2vw] border border-slate-700/50 shadow-lg" style={{ height: '45vh', minWidth: 0, maxWidth: '100vw', boxSizing: 'border-box' }}>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ fontSize: '1.2vw' }}>
        <Cpu className="w-4 h-4 text-blue-400" />
        Hardware Configuration
      </h3>
      <div className="overflow-x-auto overflow-y-auto" style={{ height: '38vh', minWidth: 0 }}>
        <table className="min-w-full text-xs text-left text-slate-300" style={{ fontSize: '1vw', width: '100%' }}>
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="px-2 py-1 font-medium" style={{ width: '40%' }}>Field</th>
              <th className="px-2 py-1 font-medium" style={{ width: '60%' }}>Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {Object.entries(hardware).map(([key, value]) => (
              <tr key={key} className="hover:bg-slate-700/20">
                <td className="px-2 py-1 font-medium whitespace-nowrap text-slate-400 align-top" style={{ fontSize: '1vw', maxWidth: '18vw', overflow: 'hidden', textOverflow: 'ellipsis' }}>{key}</td>
                <td className="px-2 py-1 whitespace-pre-wrap break-all align-top" style={{ fontSize: '1vw', maxWidth: '30vw', wordBreak: 'break-word' }}>{typeof value === 'number' ? formatNumber(value) : String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HardwareDetails;
