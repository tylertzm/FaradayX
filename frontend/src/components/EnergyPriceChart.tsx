import React from 'react';
import '../components/ScrollableContainer.css';

interface EnergyPriceChartProps {
  data: { datetime: string; price_eur_per_mwh: number }[];
  history?: { datetime: string; price_eur_per_mwh: number }[];
  title?: string;
  selectedIdx?: number;
  setSelectedIdx?: (idx: number) => void;
}

const EnergyPriceChart: React.FC<EnergyPriceChartProps> = ({ data, history = [], title, selectedIdx, setSelectedIdx }) => {
  const allData = [...(history || []), ...data];
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (!allData.length) {
    return <div className="h-40 flex items-center justify-center text-xs text-slate-400 p-4">Loading price forecast...</div>;
  }
  // Defensive: filter out any undefined/null entries
  const safeData = allData.filter(d => d && typeof d.datetime === 'string' && typeof d.price_eur_per_mwh === 'number');
  if (!safeData.length) {
    return <div className="h-40 flex items-center justify-center text-xs text-slate-400 p-4">No price data available.</div>;
  }
  const max = Math.max(...safeData.map(d => d.price_eur_per_mwh));
  const min = Math.min(...safeData.map(d => d.price_eur_per_mwh));
  return (
    <div className="w-full relative p-3">
      {title && <div className="mb-2 text-xs text-white/80 font-medium px-1">{title}</div>}
      <div className="relative">
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-white/60 opacity-70 animate-pulse z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
        <div className="w-full h-40 overflow-x-auto scrollable-container bg-black/30 border border-white/10 p-3">
          <div className="h-full flex items-end gap-[1px] relative pt-12" style={{ minWidth: '100%', width: `${Math.max(safeData.length * 10, 100)}px` }}>
            {safeData.map((d, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex-1 ${hoveredIdx === i ? 'ring-1 ring-white/70' : ''}`}
                style={{
                  height: `${15 + ((d.price_eur_per_mwh - min) / (max - min || 1)) * 75}px`,
                  minWidth: 2,
                  position: 'relative',
                  background: 'linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
                }}
              >
                {/* Tooltip on hover - positioned above the chart area */}
                {hoveredIdx === i && (
                  <div className="fixed z-50 bg-black/90 text-xs text-white/90 px-3 py-2 rounded border border-white/30 whitespace-nowrap pointer-events-none"
                       style={{
                         top: '10px',
                         left: '50%',
                         transform: 'translateX(-50%)'
                       }}>
                    <div className="font-medium text-[10px] mb-1 text-white/80">{d.datetime.slice(5, 16)} {i < (history?.length || 0) ? '(past)' : '(future)'}</div>
                    <div className="text-[10px] text-white/80">Price: <span className="font-mono text-white">{d.price_eur_per_mwh.toFixed(3)} EUR/MWh</span></div>
                    {/* Show extra info for future bars */}
                    {i >= (history?.length || 0) && (
                      <div className="mt-1 text-green-200 text-[10px]">
                        <div className="font-medium">Optimized config</div>
                        <div className="text-[10px] text-white/70">Savings: 48% energy</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Additional info area above the bars */}
          <div className="absolute top-3 left-3 right-3 h-8 flex items-center justify-between text-[10px] text-white/60 pointer-events-none">
            <span>May-June-2025</span>
            <span className="text-white/70">↔ Scroll for more data</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-white/60 mt-2 px-1">
        <span>{safeData[0].datetime.slice(5, 16)}</span>
        <span>{safeData[safeData.length - 1].datetime.slice(5, 16)}</span>
      </div>
      <div className="flex justify-between text-[10px] text-white/40 mt-1 px-1">
        <span>Min: {min.toFixed(3)}</span>
        <span>Max: {max.toFixed(3)} EUR/MWh</span>
      </div>
    </div>
  );
};

export default EnergyPriceChart;
