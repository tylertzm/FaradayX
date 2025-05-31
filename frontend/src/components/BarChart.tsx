import React from 'react';

const BarChart = ({ height = 60, bars = 20 }: { height?: number; bars?: number }) => {
  const heights = Array.from({ length: bars }, () => Math.random() * height + 5);
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

export default BarChart;
