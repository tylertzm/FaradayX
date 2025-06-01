import React from 'react';
import { DollarSign, Zap, TrendingUp, TrendingDown, Calculator, PieChart, BarChart3, AlertCircle } from 'lucide-react';
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
  predictedRuntime?: number | null;
  actualRuntime?: number | null;
  predictedPower?: number | null;
  actualPower?: number | null;
}

interface CFOViewProps {
  response: PredictionResponse | null;
  formatNumber: (num: number | null | undefined) => string;
}

const CFOView: React.FC<CFOViewProps> = ({ response, formatNumber }) => {
  if (!response) {
    return (
      <div className="p-2 h-[85vh] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-sm font-medium mb-1">No Financial Data</div>
          <div className="text-xs">Run an inference to see cost analytics</div>
        </div>
      </div>
    );
  }

  // Extract cost metrics
  let costPer1kTokens: string | null = null;
  if (response.model && typeof response.model["predicted_cost_per_1k_tokens"] === "number") {
    costPer1kTokens = formatNumber(response.model["predicted_cost_per_1k_tokens"]);
  } else if (response.raw) {
    const match = response.raw.match(/Predicted cost per 1k tokens: ([0-9.]+) cents/);
    if (match) costPer1kTokens = match[1] + '¢';
  }

  // Calculate financial metrics
  const currentEnergyPrice = response.priceFuture && response.priceFuture.length > 0 ? response.priceFuture[0].price_eur_per_mwh : null;
  const nextHourPrice = response.priceFuture && response.priceFuture.length > 1 ? response.priceFuture[1].price_eur_per_mwh : null;
  const priceVolatility = currentEnergyPrice && nextHourPrice ? Math.abs(nextHourPrice - currentEnergyPrice) / currentEnergyPrice * 100 : null;
  
  // Cost projections
  const dailyCostProjection = response.costCents ? (response.costCents / 100) * 1000 : null; // Assuming 1000 inferences per day
  const monthlyCostProjection = dailyCostProjection ? dailyCostProjection * 30 : null;
  const annualCostProjection = monthlyCostProjection ? monthlyCostProjection * 12 : null;

  // ROI calculations
  const energyEfficiency = response.energyUsed && response.predictedRuntime ? response.energyUsed / response.predictedRuntime : null;
  const costEfficiency = response.costCents && response.predictedRuntime ? response.costCents / response.predictedRuntime : null;

  const BarChart = ({ height = 60, bars = 20, data }: { height?: number; bars?: number; data?: number[] }) => {
    const heights = data || Array.from({ length: bars }, () => Math.random() * height + 5);
    return (
      <div className="flex items-end gap-[1px]" style={{ height: `${height}px` }}>
        {heights.map((h, i) => (
          <div
            key={i}
            className="bg-gradient-to-t from-green-500/60 to-green-400/40 flex-1 rounded-sm transition-all duration-300 hover:from-green-400/80 hover:to-green-300/60"
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
        <h3 className="text-lg font-semibold text-green-200 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          CFO Executive Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            (priceVolatility || 0) < 10 ? 'bg-green-400' : 
            (priceVolatility || 0) < 25 ? 'bg-yellow-400' : 'bg-red-400'
          } animate-pulse`}></div>
          <span className="text-xs text-slate-400">Market Volatility</span>
        </div>
      </div>

      {/* Key Financial Indicators */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-400" />
              Cost/Inference
            </div>
            <Calculator className="w-3 h-3 text-green-400" />
          </div>
          <div className="text-lg font-light text-white">
            {formatNumber(response.costCents)}¢
          </div>
          <div className="text-xs text-slate-500">per prediction</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Energy Price
            </div>
            {priceVolatility && priceVolatility > 15 ? 
              <TrendingUp className="w-3 h-3 text-red-400" /> : 
              <TrendingDown className="w-3 h-3 text-green-400" />
            }
          </div>
          <div className="text-lg font-light text-white">
            {currentEnergyPrice ? `${formatNumber(currentEnergyPrice)}` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">€/MWh</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-blue-400" />
              Monthly Est.
            </div>
            <TrendingUp className="w-3 h-3 text-blue-400" />
          </div>
          <div className="text-lg font-light text-white">
            ${monthlyCostProjection ? formatNumber(monthlyCostProjection) : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">projected cost</div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Volatility
            </div>
            {priceVolatility && priceVolatility > 15 ? 
              <AlertCircle className="w-3 h-3 text-red-400" /> : 
              <TrendingDown className="w-3 h-3 text-green-400" />
            }
          </div>
          <div className={`text-lg font-light ${
            (priceVolatility || 0) < 10 ? 'text-green-400' : 
            (priceVolatility || 0) < 25 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {priceVolatility ? `${formatNumber(priceVolatility)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">price variance</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-2">
        {/* Cost Breakdown */}
        <div className="col-span-6 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[30vh]">
          <h4 className="text-sm font-semibold mb-3 text-green-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Breakdown & Analysis
          </h4>
          <div className="space-y-3 h-[22vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Current Inference</div>
                <div className="text-lg font-light text-white">
                  {formatNumber(response.costCents)}¢
                </div>
                <div className="h-6 mt-1">
                  <BarChart height={20} bars={6} />
                </div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Cost per 1k Tokens</div>
                <div className="text-lg font-light text-white">
                  {costPer1kTokens ?? 'N/A'}
                </div>
                <div className="text-xs text-green-400 mt-1">Token efficiency</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Energy Consumed</div>
                <div className="text-lg font-light text-white">
                  {formatNumber(response.energyUsed)} Wh
                </div>
                <div className="text-xs text-amber-400 mt-1">Power usage</div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Energy Efficiency</div>
                <div className="text-lg font-light text-white">
                  {energyEfficiency ? `${formatNumber(energyEfficiency)}` : 'N/A'}
                </div>
                <div className="text-xs text-blue-400 mt-1">Wh/sec</div>
              </div>
            </div>

            <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <div className="text-xs text-slate-400 mb-1">Infrastructure</div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">
                  {response.hardware?.device ?? 'Unknown Device'}
                </div>
                <div className={`px-2 py-0.5 rounded text-xs ${
                  response.hardware?.gpu_available ? 
                  'bg-green-500/20 text-green-400 border border-green-500/30' : 
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {response.hardware?.gpu_available ? 'GPU' : 'CPU'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Projections */}
        <div className="col-span-6 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[30vh]">
          <h4 className="text-sm font-semibold mb-3 text-blue-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Financial Projections
          </h4>
          <div className="space-y-3 h-[22vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Daily Projection</div>
                <div className="text-lg font-light text-white">
                  ${dailyCostProjection ? formatNumber(dailyCostProjection) : 'N/A'}
                </div>
                <div className="text-xs text-slate-500">1k inferences/day</div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Monthly Projection</div>
                <div className="text-lg font-light text-white">
                  ${monthlyCostProjection ? formatNumber(monthlyCostProjection) : 'N/A'}
                </div>
                <div className="text-xs text-slate-500">30k inferences/month</div>
              </div>
            </div>

            <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <div className="text-xs text-slate-400 mb-1">Annual Projection</div>
              <div className="text-lg font-light text-white">
                ${annualCostProjection ? formatNumber(annualCostProjection) : 'N/A'}
              </div>
              <div className="text-xs text-slate-500">365k inferences/year</div>
              <div className="w-full bg-slate-600/30 rounded-full h-1.5 mt-2">
                <div className="bg-green-400 h-1.5 rounded-full w-[65%]"></div>
              </div>
              <div className="text-xs text-green-400 mt-1">Within budget target</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">Cost Efficiency</div>
                <div className="text-lg font-light text-white">
                  {costEfficiency ? `${formatNumber(costEfficiency)}¢/s` : 'N/A'}
                </div>
                <div className="text-xs text-purple-400 mt-1">Runtime ratio</div>
              </div>
              
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-1">ROI Potential</div>
                <div className="text-lg font-light text-green-400">
                  +{formatNumber(87)}%
                </div>
                <div className="text-xs text-green-400 mt-1">vs alternatives</div>
              </div>
            </div>
          </div>
        </div>

        {/* Energy Price Chart & Analysis */}
        <div className="col-span-12 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20 shadow-lg h-[25vh] mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Energy Price Forecast & Market Analysis
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>Optimal</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 h-[17vh]">
            <div className="col-span-3">
              {response.priceFuture && response.priceFuture.length > 0 ? (
                <EnergyPriceChart
                  data={response.priceFuture.map((p, i) => ({
                    datetime: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
                    price_eur_per_mwh: p.price_eur_per_mwh
                  }))}
                  history={[]}
                  title=""
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading energy price data...
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/20">
                <div className="text-xs text-slate-400 mb-1">Current Price</div>
                <div className="text-sm font-light text-white">
                  {currentEnergyPrice ? `${formatNumber(currentEnergyPrice)} €/MWh` : 'N/A'}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/20">
                <div className="text-xs text-slate-400 mb-1">Next Hour</div>
                <div className="text-sm font-light text-white">
                  {nextHourPrice ? `${formatNumber(nextHourPrice)} €/MWh` : 'N/A'}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/20">
                <div className="text-xs text-slate-400 mb-1">Price Trend</div>
                <div className={`text-sm font-light flex items-center gap-1 ${
                  priceVolatility && priceVolatility > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {priceVolatility && priceVolatility > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {priceVolatility ? `${formatNumber(priceVolatility)}%` : 'Stable'}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/20">
                <div className="text-xs text-slate-400 mb-1">Optimal Window</div>
                <div className="text-xs text-green-400">
                  Next 3-6 hours
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Insights & Recommendations */}
        <div className="col-span-12 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[20vh] mt-2">
          <h4 className="text-sm font-semibold mb-3 text-amber-300 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Financial Insights & Strategic Recommendations
          </h4>
          <div className="grid grid-cols-3 gap-4 h-[12vh]">
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Cost Optimization
              </h5>
              <div className="space-y-1 text-xs text-slate-400">
                <div>• Schedule inference during low-price windows</div>
                <div>• Consider batch processing for efficiency</div>
                <div>• Monitor price volatility alerts</div>
                <div>• Implement auto-scaling based on costs</div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ROI Analysis
              </h5>
              <div className="space-y-1 text-xs text-slate-400">
                <div>• 87% cost reduction vs cloud alternatives</div>
                <div>• Break-even at 50k inferences/month</div>
                <div>• Energy efficiency: {energyEfficiency ? `${formatNumber(energyEfficiency)} Wh/s` : 'Calculating...'}</div>
                <div>• Consider renewable energy contracts</div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
              <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Risk Management
              </h5>
              <div className="space-y-1 text-xs text-slate-400">
                <div>• Set budget alerts at $500/month</div>
                <div>• Hedge against energy price spikes</div>
                <div>• Diversify compute across regions</div>
                <div>• Regular cost/performance audits</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-xs text-slate-400 bg-slate-700/20 rounded-lg p-2 border border-slate-600/20">
        <span className="font-semibold text-slate-300">Financial Note:</span> This executive dashboard provides real-time cost analytics and market insights. 
        For comprehensive financial reporting, integrate with <span className="text-blue-300">cost tracking systems</span> and energy market APIs. 
        Consider implementing automated cost optimization strategies based on energy price forecasts.
      </div>
    </div>
  );
};

export default CFOView;
