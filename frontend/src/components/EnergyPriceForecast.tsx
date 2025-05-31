import React from 'react';
import EnergyPriceChart from './EnergyPriceChart';

interface PricePoint {
  datetime: string;
  price_eur_per_mwh: number;
}

interface EnergyPriceForecastProps {
  priceFuture: PricePoint[];
  priceHistory: PricePoint[];
  addDatetimes: (arr: { price_eur_per_mwh: number }[], start: Date) => PricePoint[];
}

const EnergyPriceForecast: React.FC<EnergyPriceForecastProps> = ({ priceFuture, priceHistory, addDatetimes }) => (
  <div className="col-span-12 bg-slate-800/40 backdrop-blur-sm rounded-xl p-2 border border-blue-500/20 shadow-lg mt-2 h-[35vh]">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-sm font-semibold">Energy Price Forecast</h3>
      <span className="text-[10px] text-slate-500 flex items-center">
        <svg className="w-3 h-3 mr-1 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8l4 4-4 4M3 12h18"></path>
        </svg>
        Scroll horizontally
      </span>
    </div>
    <EnergyPriceChart
      data={addDatetimes(priceFuture || [], new Date())}
      history={addDatetimes(priceHistory || [], new Date(Date.now() - (priceHistory?.length || 0) * 60 * 60 * 1000))}
      title=""
    />
  </div>
);

export default EnergyPriceForecast;
