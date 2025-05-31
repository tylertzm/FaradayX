import React from 'react';

interface CostEstimationProps {
  selectedDate: Date | undefined;
  realTimeCostEstimate: {
    cost: number;
    runtime: number;
    energy: number;
    price: number;
  } | null;
  isLoadingPrice: boolean;
}

const CostEstimation: React.FC<CostEstimationProps> = ({ selectedDate, realTimeCostEstimate, isLoadingPrice }) => {
  if (!selectedDate) return null;
  return (
    <div>
      {isLoadingPrice ? (
        <div className="text-xs text-slate-400">Calculating...</div>
      ) : realTimeCostEstimate ? (
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Estimated Cost: <span className="text-green-400 font-semibold">{realTimeCostEstimate.cost.toFixed(3)}¢</span></div>
          <div className="text-xs text-slate-400">Estimated Runtime: <span className="text-blue-400 font-semibold">{realTimeCostEstimate.runtime.toFixed(2)}s</span></div>
          <div className="text-xs text-slate-400">Estimated Energy: <span className="text-yellow-400 font-semibold">{realTimeCostEstimate.energy.toFixed(3)} Wh</span></div>
          <div className="text-xs text-slate-400">Energy Price: <span className="text-purple-400 font-semibold">{realTimeCostEstimate.price.toFixed(2)} €/MWh</span></div>
        </div>
      ) : (
        <div className="text-xs text-slate-400">No estimate available.</div>
      )}
    </div>
  );
};

export default CostEstimation;
