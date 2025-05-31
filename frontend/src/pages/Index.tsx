
import React, { useState, useEffect } from 'react';
import { Play, Cpu, Zap, DollarSign, Clock, Monitor, Settings, TrendingUp, MoreHorizontal } from 'lucide-react';

const AIInferencePredictor = () => {
  const [modelName, setModelName] = useState('Qwen/Qwen3-0.6B');
  const [inputText, setInputText] = useState('what is a good alternative to john');
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [actualRuntime, setActualRuntime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate model feature extraction and prediction
  const simulateExtraction = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const features = {
          num_params: Math.floor(Math.random() * 1000000000) + 100000000,
          flops: Math.floor(Math.random() * 5000000000) + 1000000000,
          num_layers: Math.floor(Math.random() * 500) + 50,
          layer_types: {
            "Model": 1,
            "Embedding": 1,
            "ModuleList": 1,
            "DecoderLayer": Math.floor(Math.random() * 50) + 12,
            "Attention": Math.floor(Math.random() * 50) + 12,
            "Linear": Math.floor(Math.random() * 300) + 100,
            "RMSNorm": Math.floor(Math.random() * 150) + 50,
            "MLP": Math.floor(Math.random() * 50) + 12,
            "SiLU": Math.floor(Math.random() * 50) + 12,
            "RotaryEmbedding": 1
          },
          input_shape: [1, inputText.split(' ').length],
          device: "Apple M3 Pro",
          num_cores: 11,
          cpu_frequency: 3100000000,
          memory_bytes: 19327352832,
          os: "Darwin",
          machine: "arm64",
          gpu_available: true
        };

        const predictedRuntime = (Math.random() * 0.3 + 0.05).toFixed(4);
        const energyUsed = (Math.random() * 2 + 0.5).toFixed(2);
        const auctionPrice = (Math.random() * 50 + 60).toFixed(2);
        const costEur = (auctionPrice / 1000 * energyUsed).toFixed(6);
        const costCents = (costEur * 100).toFixed(4);

        resolve({
          features,
          predictedRuntime: parseFloat(predictedRuntime),
          energyUsed: parseFloat(energyUsed),
          auctionPrice: parseFloat(auctionPrice),
          costEur: parseFloat(costEur),
          costCents: parseFloat(costCents)
        });
      }, 2000);
    });
  };

  const runPrediction = async () => {
    setIsLoading(true);
    setPrediction(null);
    setActualRuntime(null);

    try {
      const result = await simulateExtraction();
      setPrediction(result);
      
      // Simulate actual runtime measurement
      setTimeout(() => {
        const actual = result.predictedRuntime * (0.8 + Math.random() * 0.4);
        const error = Math.abs((result.predictedRuntime - actual) / actual * 100);
        setActualRuntime({
          runtime: actual,
          error: error
        });
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const BarChart = ({ height = 60, bars = 20 }) => {
    const heights = Array.from({ length: bars }, () => Math.random() * height + 10);
    return (
      <div className="flex items-end gap-1 h-16">
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

  const PulsingDot = () => (
    <div className="relative">
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      <div className="w-2 h-2 bg-green-400 rounded-full absolute top-0 left-0 animate-ping"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/30">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AI Inference
            </span>
          </div>
          <div className="flex gap-8 text-sm">
            <span className="text-white font-medium border-b-2 border-blue-500 pb-1">Dashboard</span>
            <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">My predictions</span>
            <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Reporting</span>
            <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Settings</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <PulsingDot />
          <span className="text-sm text-slate-400">Live monitoring</span>
        </div>
      </nav>

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light mb-2">Performance Overview</h1>
            <p className="text-slate-400">Monitor and predict ML inference metrics in real-time</p>
          </div>
          <div className="text-right bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <div className="text-2xl font-light">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-slate-400">Local Time</div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Model Configuration</h2>
              <p className="text-slate-400 text-sm">Configure your model and input parameters</p>
            </div>
            <button className="text-xs bg-slate-700/50 hover:bg-slate-600/50 px-4 py-2 rounded-full transition-colors border border-slate-600/50">
              <Settings className="w-3 h-3 inline mr-2" />
              Advanced Settings
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                HuggingFace Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g. Qwen/Qwen3-0.6B"
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Example Input Text
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter your input text..."
              />
            </div>
          </div>

          <button
            onClick={runPrediction}
            disabled={isLoading || !modelName.trim()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing Model...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Prediction
              </>
            )}
          </button>
        </div>

        {prediction && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
            {/* Main Metrics Card */}
            <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Performance Metrics</h3>
                  <p className="text-slate-400 text-sm">Real-time model performance indicators</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer transition-colors" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="group">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-blue-400" />
                    RUNTIME PREDICTION
                  </div>
                  <div className="mb-4">
                    <BarChart />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-light bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      {prediction.predictedRuntime}
                    </div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">seconds predicted</div>
                  </div>
                </div>

                <div className="group">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-2 font-medium">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    ENERGY CONSUMPTION
                  </div>
                  <div className="mb-4">
                    <BarChart />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-light bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      {prediction.energyUsed}
                    </div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Wh consumed</div>
                  </div>
                </div>

                <div className="group">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-2 font-medium">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    INFERENCE COST
                  </div>
                  <div className="mb-4">
                    <BarChart />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-light bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      {prediction.costCents}
                    </div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">cents per inference</div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">System Status</h3>
                <MoreHorizontal className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer transition-colors" />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">GPU Connected</span>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative transition-all">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-xl p-6">
                  <div className="w-full h-32 bg-gradient-to-br from-slate-600/50 to-slate-700/50 rounded-xl flex items-center justify-center mb-4 border border-slate-600/30">
                    <Monitor className="w-16 h-16 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-1">Apple M3 Pro</div>
                    <div className="text-xs text-slate-500">11 cores • 19GB RAM</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">Available Compute</span>
                    <span className="text-2xl font-light">87%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
                    <div className="w-[87%] bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-1000 ease-out"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy Tracking */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Prediction Accuracy</h3>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              
              <div className="text-sm text-slate-400 mb-6">
                Real-time accuracy monitoring
              </div>

              <div className="text-center">
                <div className="text-5xl font-light mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {actualRuntime ? `${(100 - actualRuntime.error).toFixed(0)}%` : '85%'}
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">accuracy rate</div>
              </div>
              
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-400">92%</div>
                  <div className="text-xs text-slate-500">Runtime</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-400">88%</div>
                  <div className="text-xs text-slate-500">Energy</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-400">94%</div>
                  <div className="text-xs text-slate-500">Cost</div>
                </div>
              </div>
            </div>

            {/* Weekly Performance */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Weekly Performance</h3>
                <div className="flex items-center gap-2">
                  <button className="text-xs bg-slate-700/50 hover:bg-slate-600/50 px-3 py-1 rounded-full transition-colors">
                    7 Days
                  </button>
                </div>
              </div>

              <div className="text-sm text-slate-400 mb-6">
                Performance trends over the past week
              </div>

              <div className="grid grid-cols-7 gap-3 mb-6">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="text-center">
                    <div className="text-xs text-slate-400 mb-2">{day}</div>
                    <div className={`h-16 rounded-lg transition-all duration-300 flex items-end justify-center p-2 ${
                      i === 2 ? 'bg-gradient-to-t from-blue-600 to-blue-500' : 'bg-slate-700/50'
                    }`}>
                      <div className={`text-xs ${i === 2 ? 'text-white font-medium' : 'text-slate-400'}`}>
                        {i === 2 ? prediction.predictedRuntime : (Math.random() * 0.5).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Energy Efficiency */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-8 border border-green-500/20 shadow-2xl">
              <h3 className="text-xl font-semibold mb-6">Energy Efficiency</h3>
              
              <div className="text-sm text-slate-400 mb-6">
                Current optimization score
              </div>

              <div className="text-center mb-8">
                <div className="text-5xl font-light mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">92%</div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">efficiency score</div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-700/30 rounded-xl p-4">
                <span>Peak: 11AM - 3PM</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                      i <= 4 ? 'bg-green-400' : 'bg-slate-600'
                    }`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {actualRuntime && (
          <div className="mt-8 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl animate-in slide-in-from-bottom duration-700">
            <h3 className="text-xl font-semibold mb-6">Prediction Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                <div className="text-slate-400 text-sm mb-2">Predicted Runtime</div>
                <div className="text-2xl font-light">{prediction.predictedRuntime}s</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                <div className="text-slate-400 text-sm mb-2">Actual Runtime</div>
                <div className="text-2xl font-light">{actualRuntime.runtime.toFixed(4)}s</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                <div className="text-slate-400 text-sm mb-2">Prediction Error</div>
                <div className={`text-2xl font-light ${actualRuntime.error < 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {actualRuntime.error.toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                <div className="text-slate-400 text-sm mb-2">Energy Cost</div>
                <div className="text-2xl font-light">{prediction.costEur} EUR</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInferencePredictor;
