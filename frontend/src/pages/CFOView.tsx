import React from 'react';
import { DollarSign, Zap } from 'lucide-react';
import EnergyPriceChart from '../components/EnergyPriceChart';

interface PricePoint {
  price_eur_per_mwh: number;
}

interface HardwareInfo {
  device: string;
  gpu_available: boolean;
}

interface ModelInfo {
  [key: string]: string | number | boolean | null | undefined | object;
}

interface PredictionResponse {
  costCents: number | null;
  energyUsed: number | null;
  priceFuture: PricePoint[];
  hardware?: HardwareInfo | null;
  model?: ModelInfo;
  raw?: string;
}

interface CFOViewProps {
  response: PredictionResponse | null;
  formatNumber: (num: number | null | undefined) => string;
}

const CFOView: React.FC<CFOViewProps> = ({ response, formatNumber }) => {
  if (!response) return null;

  // Try to extract predicted cost per 1k tokens from model info or raw text
  let costPer1kTokens: string | null = null;
  if (response.model && typeof response.model["predicted_cost_per_1k_tokens"] === "number") {
    costPer1kTokens = formatNumber(response.model["predicted_cost_per_1k_tokens"]);
  } else if (response.raw) {
    const match = response.raw.match(/Predicted cost per 1k tokens: ([0-9.]+) cents/);
    if (match) costPer1kTokens = match[1] + '¢';
  }

  return (
    <div className="p-2">
      <h3 className="text-lg font-semibold mb-4 text-green-200">CFO Executive View</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-green-300 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Cost Analytics</h4>
          <div className="text-xs text-slate-400 mb-1">Cost per Inference</div>
          <div className="text-lg font-light">{formatNumber(response.costCents)}¢</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Predicted Cost per 1k Tokens</div>
          <div className="text-lg font-light">{costPer1kTokens ?? 'N/A'}</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Energy Used</div>
          <div className="text-lg font-light">{formatNumber(response.energyUsed)} Wh</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-1"><Zap className="w-4 h-4" /> Energy Price Trend</h4>
          <div className="text-xs text-slate-400 mb-1">Current Price</div>
          <div className="text-lg font-light">{response.priceFuture && response.priceFuture.length > 0 ? formatNumber(response.priceFuture[0].price_eur_per_mwh) : 'N/A'} €/MWh</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Forecast (next hour)</div>
          <div className="text-lg font-light">{response.priceFuture && response.priceFuture.length > 1 ? formatNumber(response.priceFuture[1].price_eur_per_mwh) : 'N/A'} €/MWh</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Device</div>
          <div className="text-lg font-light">{response.hardware?.device ?? 'N/A'}</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">GPU</div>
          <div className="text-lg font-light">{response.hardware?.gpu_available ? 'Available' : 'Not Available'}</div>
        </div>
      </div>
      {/* Energy Price Chart */}
      {response.priceFuture && response.priceFuture.length > 0 && (
        <div className="mt-6 bg-slate-800/40 rounded-xl p-4 border border-blue-500/20 shadow-lg">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-1"><Zap className="w-4 h-4" /> Energy Price Forecast</h4>
          <EnergyPriceChart
            data={response.priceFuture.map((p, i) => ({
              datetime: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
              price_eur_per_mwh: p.price_eur_per_mwh
            }))}
            history={[]}
            title=""
          />
        </div>
      )}
      <div className="mt-6 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Note:</span> For historical cost/energy analytics, see <span className="text-blue-300">benchmarks.csv</span> and <span className="text-blue-300">energy price</span> data in the backend. (Integrate backend endpoints for cost trends.)
      </div>
    </div>
  );
};

export default CFOView;
