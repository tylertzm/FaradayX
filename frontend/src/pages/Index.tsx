import React, { useState, useEffect, useCallback } from 'react';
import { Play, Cpu, Zap, DollarSign, Clock, Monitor, Settings, TrendingUp, MoreHorizontal, Calendar as CalendarIcon, Plus, Trash2, AlertCircle } from 'lucide-react';
import EnergyPriceChart from '../components/EnergyPriceChart';
import { Calendar } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import CTOView from './CTOView';
import CFOView from './CFOView';
import HardwareDetails from '../components/HardwareDetails';
import ModelFeatures from '../components/ModelFeatures';
import LayerTypesBreakdown from '../components/LayerTypesBreakdown';
import SchedulerForm from '../components/SchedulerForm';
import SchedulerCalendar from '../components/SchedulerCalendar';
import CostEstimation from '../components/CostEstimation';

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

interface ModelInfo {
  [key: string]: string | number | boolean | null | undefined | object;
}

interface PricePoint {
  datetime: string;
  price_eur_per_mwh: number;
}

interface PredictionResponse {
  actualRuntime: number | null;
  auctionPrice: number | null;
  costCents: number | null;
  costEur: number | null;
  actualCostEur: number | null;
  actualCostCents: number | null;
  energyUsed: number | null;
  error: number | null;
  predictedPower: number | null;
  actualPower: number | null;
  hardware: HardwareInfo | null;
  model: ModelInfo;
  predictedRuntime: number | null;
  priceFuture: { price_eur_per_mwh: number }[];
  priceHistory: { price_eur_per_mwh: number }[];
  raw?: string;
  stderr?: string;
}

interface ScheduledJob {
  id: string;
  modelName: string;
  inputText: string;
  scheduledTime: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimatedCost: number | null;
  estimatedRuntime: number | null;
  estimatedEnergy: number | null;
  energyPrice: number | null;
  result?: PredictionResponse;
  createdAt: Date;
  actualRuntime?: number;
}

// Add types for pipeline info
interface EvaluationReport {
  mae?: number;
  rmse?: number;
  r2?: number;
  [key: string]: number | string | undefined;
}

interface FeatureImportance {
  [feature: string]: number;
}

interface PipelineInfo {
  evaluation_report?: EvaluationReport;
  feature_importance?: FeatureImportance;
  logs: string[];
  benchmarks?: string[][];
}

const AIInferencePredictor = () => {
  const [modelName, setModelName] = useState('Qwen/Qwen3-0.6B');
  const [inputText, setInputText] = useState('What is a good alternative to John?');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PredictionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Scheduler state
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [scheduleModelName, setScheduleModelName] = useState('Qwen/Qwen3-0.6B');
  const [scheduleInputText, setScheduleInputText] = useState('What is a good alternative to John?');
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'details', 'scheduler', 'pipeline'
  
  // Real-time cost estimation state
  const [currentEnergyPrice, setCurrentEnergyPrice] = useState<number>(85.2);
  
  // Real-time runtime tracking
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [realTimeCostEstimate, setRealTimeCostEstimate] = useState<{
    cost: number;
    runtime: number;
    energy: number;
    price: number;
  } | null>(null);

  // Pipeline info state
  const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Load scheduled jobs from backend on component mount
  useEffect(() => {
    loadScheduledJobs();
  }, []);

  // Auto-refresh jobs when on scheduler tab
  useEffect(() => {
    if (activeTab !== 'scheduler') return;
    
    const interval = setInterval(() => {
      loadScheduledJobs();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // getEnergyPriceForTime (move this up)
  const getEnergyPriceForTime = useCallback(async (scheduledTime: Date): Promise<number> => {
    try {
      const timestamp = scheduledTime.getTime();
      const response = await fetch(`http://localhost:5001/api/scheduler/energy-price/${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        return data.price || 85.2; // Use consistent fallback
      } else {
        console.warn('Energy price API returned error:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch energy price:', error);
    }
    return 85.2; // Use fixed fallback instead of random
  }, []);

  // getCurrentEnergyPrice (keep only one definition)
  const getCurrentEnergyPrice = useCallback(async (): Promise<number> => {
    try {
      setIsLoadingPrice(true);
      const timestamp = Date.now();
      const response = await fetch(`http://localhost:5001/api/scheduler/energy-price/${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        const price = data.price || 85.2;
        setCurrentEnergyPrice(price);
        return price;
      } else {
        console.warn('Current energy price API returned error:', response.status);
        return currentEnergyPrice;
      }
    } catch (error) {
      console.error('Failed to fetch current energy price:', error);
      return currentEnergyPrice;
    } finally {
      setIsLoadingPrice(false);
    }
  }, [currentEnergyPrice]);

  // updateRealTimeCostEstimate (move above hooks)
  const updateRealTimeCostEstimate = useCallback(async (scheduledTime: Date) => {
    try {
      setIsLoadingPrice(true);
      // Use the current scheduler model/input for prediction
      const predictRes = await fetch('http://localhost:5001/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: scheduleModelName,
          inputText: scheduleInputText
        })
      });
      if (!predictRes.ok) throw new Error('Backend prediction failed');
      const predictData = await predictRes.json();
      const estimatedRuntime = predictData.predictedRuntime || 1.2;
      const estimatedPower = predictData.predictedPower || 25;
      // Find the price forecast for the scheduled time (match hour)
      let energyPrice = 85.2;
      if (predictData.priceFuture && predictData.priceFuture.length > 0) {
        const schedHour = scheduledTime.getHours();
        const match = predictData.priceFuture.find((p: { datetime: string; price_eur_per_mwh: number }) => {
          const d = new Date(p.datetime);
          return d.getHours() === schedHour;
        });
        if (match) energyPrice = match.price_eur_per_mwh;
        else energyPrice = predictData.priceFuture[0].price_eur_per_mwh;
      }
      const estimatedEnergy = (estimatedRuntime * estimatedPower) / 3600;
      const estimatedCost = (estimatedEnergy * energyPrice) / 1000;
      const estimatedCostCents = estimatedCost * 100;
      setRealTimeCostEstimate({
        cost: estimatedCostCents,
        runtime: estimatedRuntime,
        energy: estimatedEnergy,
        price: energyPrice
      });
    } catch (error) {
      console.error('Failed to update real-time cost estimate:', error);
      setRealTimeCostEstimate({
        cost: 2.3,
        runtime: 1.2,
        energy: 2.7,
        price: 85.2
      });
    } finally {
      setIsLoadingPrice(false);
    }
  }, [scheduleModelName, scheduleInputText]);

  // Fetch current energy price on component mount and scheduler tab activation
  useEffect(() => {
    getCurrentEnergyPrice();
  }, [getCurrentEnergyPrice]);

  useEffect(() => {
    if (activeTab === 'scheduler') {
      getCurrentEnergyPrice();
    }
  }, [activeTab, getCurrentEnergyPrice]);

  // Update real-time cost estimate when selected date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      updateRealTimeCostEstimate(scheduledDateTime);
    }
  }, [selectedDate, selectedTime, response, updateRealTimeCostEstimate]);

  // Periodic refresh of energy prices for live updates (every 5 minutes)
  useEffect(() => {
    if (activeTab !== 'scheduler') return;
    const interval = setInterval(() => {
      getCurrentEnergyPrice();
      if (selectedDate && selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        updateRealTimeCostEstimate(scheduledDateTime);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab, selectedDate, selectedTime, getCurrentEnergyPrice, updateRealTimeCostEstimate]);

  const loadScheduledJobs = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/scheduler/jobs');
      if (response.ok) {
        const jobs = await response.json();
        const formattedJobs = jobs.map((job: ScheduledJob) => ({
          ...job,
          scheduledTime: new Date(job.scheduledTime),
          createdAt: new Date(job.createdAt)
        }));
        setScheduledJobs(formattedJobs);
      }
    } catch (error) {
      console.error('Failed to load scheduled jobs:', error);
    }
  };


  // Function to extract predicted runtime from raw text if it's null in the response
  const extractPredictedRuntime = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    const match = rawText.match(/\[ML Model\] Predicted runtime \(seconds\): (\d+\.\d+)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Function to extract actual runtime from raw text if it's null in the response
  const extractActualRuntime = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    const match = rawText.match(/Actual measured runtime \(seconds\): (\d+\.\d+)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Function to extract predicted power from raw text
  const extractPredictedPower = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    // Look for average power in the raw output
    const match = rawText.match(/avg_power = ([0-9.]+)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Scheduler functions
  const generateJobId = () => {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const estimateJobCost = async (
    modelName: string,
    inputText: string,
    scheduledTime: Date
  ): Promise<{ 
    estimatedCost: number;
    estimatedRuntime: number;
    estimatedEnergy: number;
    energyPrice: number;
  }> => {
    try {
      // Call backend /api/predict for model, input, and (optionally) scheduled time
      const predictRes = await fetch('http://localhost:5001/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName,
          inputText
        })
      });
      if (!predictRes.ok) throw new Error('Backend prediction failed');
      const predictData = await predictRes.json();
      // Use backend-predicted runtime and power
      const estimatedRuntime = predictData.predictedRuntime || 2.5;
      const estimatedPower = predictData.predictedPower || 30;
      // Find the price forecast for the scheduled time (match hour)
      let energyPrice = 85.2;
      if (predictData.priceFuture && predictData.priceFuture.length > 0) {
        // Try to match the hour of scheduledTime
        const schedHour = scheduledTime.getHours();
        const match = predictData.priceFuture.find((p: { datetime: string; price_eur_per_mwh: number }) => {
          const d = new Date(p.datetime);
          return d.getHours() === schedHour;
        });
        if (match) energyPrice = match.price_eur_per_mwh;
        else energyPrice = predictData.priceFuture[0].price_eur_per_mwh;
      }
      // Calculate energy (Wh) and cost (EUR)
      const estimatedEnergy = (estimatedRuntime * estimatedPower) / 3600; // Wh
      const estimatedCost = (estimatedEnergy * energyPrice) / 1000; // EUR
      return {
        estimatedCost,
        estimatedRuntime,
        estimatedEnergy,
        energyPrice
      };
    } catch (error) {
      // Fallback to previous local estimation if backend fails
      const energyPrice = await getEnergyPriceForTime(scheduledTime);
      const estimatedRuntime = response?.predictedRuntime || 2.5;
      const estimatedPower = response?.predictedPower || 30;
      const estimatedEnergy = (estimatedRuntime * estimatedPower) / 3600;
      const estimatedCost = (estimatedEnergy * energyPrice) / 1000;
      return {
        estimatedCost,
        estimatedRuntime,
        estimatedEnergy,
        energyPrice
      };
    }
  };

  const scheduleJob = async () => {
    if (!selectedDate || !scheduleModelName.trim() || !scheduleInputText.trim()) {
      setErrorMsg('Please select a date, model name, and input text for scheduling.');
      return;
    }

    setIsScheduling(true);
    try {
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(hour, minute, 0, 0);

      // Check if scheduled time is in the future
      if (scheduledTime <= new Date()) {
        setErrorMsg('Scheduled time must be in the future.');
        setIsScheduling(false);
        return;
      }

      // Estimate job cost
      const estimates = await estimateJobCost(scheduleModelName, scheduleInputText, scheduledTime);

      // Send to backend
      const backendResponse = await fetch('http://localhost:5001/api/scheduler/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: scheduleModelName,
          inputText: scheduleInputText,
          scheduledTime: scheduledTime.toISOString(),
          ...estimates
        })
      });

      if (!backendResponse.ok) {
        throw new Error('Failed to schedule job on backend');
      }

      const backendResult = await backendResponse.json();

      const newJob: ScheduledJob = {
        id: backendResult.id,
        modelName: scheduleModelName,
        inputText: scheduleInputText,
        scheduledTime,
        status: 'pending',
        ...estimates,
        createdAt: new Date()
      };

      setScheduledJobs(prev => [...prev, newJob].sort((a, b) => 
        a.scheduledTime.getTime() - b.scheduledTime.getTime()
      ));

      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('12:00');
      setScheduleModelName('Qwen/Qwen3-0.6B');
      setScheduleInputText('What is a good alternative to John?');
      
      setErrorMsg('');
    } catch (error) {
      setErrorMsg('Failed to schedule job: ' + (error as Error).message);
    } finally {
      setIsScheduling(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/scheduler/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setScheduledJobs(prev => prev.filter(job => job.id !== jobId));
      } else {
        setErrorMsg('Failed to delete job');
      }
    } catch (error) {
      setErrorMsg('Failed to delete job: ' + (error as Error).message);
    }
  };

  const runJobNow = async (job: ScheduledJob) => {
    // Update job status to running
    setScheduledJobs(prev => prev.map(j => 
      j.id === job.id ? { 
        ...j, 
        status: 'running'
      } : j
    ));

    try {
      const response = await fetch(`http://localhost:5001/api/scheduler/jobs/${job.id}/run`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run job');
      }
      
      const result = await response.json();
      
      // Store the actual runtime from the backend response
      setScheduledJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          actualRuntime: result.actualRuntime
        } : j
      ));
      
      // Update job with results and reload jobs to get updated status from backend
      await loadScheduledJobs();
      
    } catch (error) {
      console.error('Failed to run job:', error);
      setErrorMsg(`Failed to run job: ${(error as Error).message}`);
      
      // Update job status to failed
      setScheduledJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          status: 'failed'
        } : j
      ));
    }
  };

  // Function to extract actual power from raw text
  const extractActualPower = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    // Currently not provided in the output, could be added later
    return null;
  };

  // Function to extract predicted cost from raw text
  const extractPredictedCost = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    const match = rawText.match(/Predicted cost of inference: ([0-9.]+) cents/);
    return match ? parseFloat(match[1]) : null;
  };

  // Function to extract actual cost from raw text
  const extractActualCost = (rawText: string | undefined): number | null => {
    if (!rawText) return null;
    // Currently not directly provided in the output
    return null;
  };

  // Function to calculate actual cost if needed
  const calculateActualCost = (energyUsed: number | null, auctionPrice: number | null): number | null => {
    if (energyUsed === null || auctionPrice === null || energyUsed === undefined || auctionPrice === undefined) return null;
    // Convert energy from Wh to kWh, then multiply to price per MWh, then convert to cents
    // energyUsed is in Wh, auctionPrice is in EUR/MWh
    const energyInKWh = energyUsed / 1000; // Convert Wh to kWh
    const energyInMWh = energyInKWh / 1000; // Convert kWh to MWh
    const costInEur = energyInMWh * auctionPrice; // Cost in EUR
    const costInCents = costInEur * 100; // Convert EUR to cents
    return Math.round(costInCents * 1000) / 1000; // Round to 3 decimal places
  };

  // Function to calculate accuracy values for different metrics
  const calculateAccuracy = (
    metric: 'runtime' | 'power' | 'cost',
    response: PredictionResponse | null
  ): number => {
    if (!response) return 85; // Default fallback value
    
    switch (metric) {
      case 'runtime': {
        if (response.predictedRuntime || response.actualRuntime) {
          const predictedRuntime = response.predictedRuntime || extractPredictedRuntime(response.raw) || 0;
          const actualRuntime = response.actualRuntime || extractActualRuntime(response.raw) || 0;
          if (predictedRuntime === 0 || actualRuntime === 0) return 85;
          const error = Math.abs((predictedRuntime - actualRuntime) / actualRuntime) * 100;
          return Math.min(100, Math.max(0, 100 - error));
        }
        return response.error !== null ? (100 - response.error) : 85;
      }
        
      case 'power': {
        // Use direct power values from response if available
        if (response.predictedPower && response.actualPower && response.actualPower > 0) {
          const powerError = Math.abs((response.predictedPower - response.actualPower) / response.actualPower) * 100;
          return Math.min(100, Math.max(0, 100 - powerError));
        }
        
        // Try extracting from raw text if not in response
        const predictedPower = response.predictedPower || extractPredictedPower(response.raw);
        const actualPower = response.actualPower || extractActualPower(response.raw);
        
        if (predictedPower && actualPower && actualPower > 0) {
          const powerError = Math.abs((predictedPower - actualPower) / actualPower) * 100;
          return Math.min(100, Math.max(0, 100 - powerError));
        }
        
        // If we don't have actual power data, derive from runtime error but with a fixed offset
        // This makes it stable between renders but still related to runtime accuracy
        return response.error !== null ? 
          Math.min(100, Math.max(0, 100 - response.error - 2)) : 
          88;
      }
        
      case 'cost': {
        // Extract predicted and actual cost values
        const predictedCost = response.costCents || extractPredictedCost(response.raw);
        const actualCost = response.actualCostCents || calculateActualCost(response.energyUsed, response.auctionPrice);
        
        if (predictedCost && actualCost && actualCost > 0) {
          const costError = Math.abs((predictedCost - actualCost) / actualCost) * 100;
          return Math.min(100, Math.max(0, 100 - costError));
        }
        
        // If we don't have actual cost data, derive from runtime error but with a fixed offset
        // This makes it stable between renders but still related to runtime accuracy
        return response.error !== null ? 
          Math.min(100, Math.max(0, 100 - response.error + 3)) : 
          94;
      }
    }
  };

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const runPrediction = useCallback(async () => {
    setIsLoading(true);
    setResponse(null);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:5001/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, inputText }),
      });
      if (!res.ok) throw new Error('Backend error');
      const result = await res.json();
      setResponse(result);
      
      // Set the next refresh time to 1 hour from now
      // const nextTime = new Date();
      // nextTime.setHours(nextTime.getHours() + 1);
      // setNextRefreshTime(nextTime);
      
    } catch (e) {
      setErrorMsg('Failed to get prediction. Please check backend and CORS.');
    } finally {
      setIsLoading(false);
    }
  }, [modelName, inputText]);
  

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(3) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(3) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(3) + 'K';
    return num.toFixed(3);
  };

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

  const PulsingDot = () => (
    <div className="relative">
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full absolute top-0 left-0 animate-ping"></div>
    </div>
  );

  // Helper to add synthetic datetimes to price arrays
  const addDatetimes = (arr: { price_eur_per_mwh: number }[], start: Date): PricePoint[] => {
    return arr.map((item, idx) => ({
      datetime: new Date(start.getTime() + idx * 60 * 60 * 1000).toISOString(),
      price_eur_per_mwh: item.price_eur_per_mwh
    }));
  };

  // --- Helper: Aggregate summary for CTO (hardware/model health) ---
  const getCTOSummary = () => {
    if (!response) return null;
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-1"><Cpu className="w-4 h-4" /> Hardware Utilization</h4>
          <div className="text-xs text-slate-400 mb-1">Cores Used</div>
          <div className="text-lg font-light">{formatNumber(response.hardware?.num_cores)} / 12</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Memory</div>
          <div className="text-lg font-light">{formatNumber(response.hardware?.memory_bytes / 1e9)} GB</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">GPU</div>
          <div className="text-lg font-light">{response.hardware?.gpu_available ? 'Available' : 'Not Available'}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-purple-300 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Model Performance</h4>
          <div className="text-xs text-slate-400 mb-1">Predicted Runtime</div>
          <div className="text-lg font-light">{formatNumber(response.predictedRuntime || extractPredictedRuntime(response.raw))}s</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Actual Runtime</div>
          <div className="text-lg font-light">{formatNumber(response.actualRuntime || extractActualRuntime(response.raw))}s</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Error Rate</div>
          <div className="text-lg font-light">{formatNumber(response.error)}%</div>
        </div>
      </div>
    );
  };

  // Function to extract input token length from model info or raw text
  const extractInputTokenLength = (model: ModelInfo, rawText: string | undefined): number | null => {
    if (model && typeof model.input_token_length === 'number') return model.input_token_length;
    if (rawText) {
      const match = rawText.match(/Input tokens:\s*(\d+)/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  };

  // Function to extract output token length from model info or raw text
  const extractOutputTokenLength = (model: ModelInfo, rawText: string | undefined): number | null => {
    if (model && typeof model.output_token_length === 'number') return model.output_token_length;
    if (rawText) {
      const match = rawText.match(/Output tokens:\s*(\d+)/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  };

  // --- Helper: Aggregate summary for CFO (cost/energy/price) ---
  const getCFOSummary = () => {
    if (!response) return null;
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-green-300 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Cost Analytics</h4>
          <div className="text-xs text-slate-400 mb-1">Cost per Inference</div>
          <div className="text-lg font-light">{formatNumber(response.costCents)}¢</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Energy Used</div>
          <div className="text-lg font-light">{formatNumber(response.energyUsed)} Wh</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-1"><Zap className="w-4 h-4" /> Energy Price Trend</h4>
          <div className="text-xs text-slate-400 mb-1">Current Price</div>
          <div className="text-lg font-light">{response.priceFuture && response.priceFuture.length > 0 ? formatNumber(response.priceFuture[0].price_eur_per_mwh) : 'N/A'} €/MWh</div>
          <div className="text-xs text-slate-400 mb-1 mt-2">Forecast (next hour)</div>
          <div className="text-lg font-light">{response.priceFuture && response.priceFuture.length > 1 ? formatNumber(response.priceFuture[1].price_eur_per_mwh) : 'N/A'} €/MWh</div>
        </div>
      </div>
    );
  };

  // --- Render ---
  return (
    <div className="h-[100vh] overflow-hidden flex flex-col bg-black text-white px-[2vw] font-sans" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', background: 'linear-gradient(120deg, #181818 60%, #232323 100%)' }}>
      {/* Navigation Header */}
      <nav className="flex items-center justify-between px-3 h-[5vh] border-b border-white/10 bg-black/50" style={{ boxShadow: 'none', borderRadius: 0 }}>
        <div className="flex items-center gap-2">
          <img src="/Logo-SVG-v2.svg" alt="Logo" className="w-8 h-8 object-contain" style={{ minWidth: 24, minHeight: 24 }} />
          <span className="text-base font-bold tracking-widest text-white uppercase" style={{ letterSpacing: '0.15em' }}>FaradayX</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-white/70 font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="flex items-center gap-1">
            <PulsingDot />
            <span className="text-xs text-white/40">Live</span>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="h-[95vh] overflow-hidden p-2 flex flex-col">
        {/* Tabs Navigation */}
        <div className="flex space-x-4 h-[3vh] mb-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-4 py-1 text-xs font-bold uppercase tracking-widest border-0 bg-transparent transition-colors ${activeTab === 'main' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            style={{ borderRadius: 0 }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-1 text-xs font-bold uppercase tracking-widest border-0 bg-transparent transition-colors ${activeTab === 'details' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            style={{ borderRadius: 0 }}
          >
            Hardware & Model
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-4 py-1 text-xs font-bold uppercase tracking-widest border-0 bg-transparent transition-colors ${activeTab === 'scheduler' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            style={{ borderRadius: 0 }}
          >
            AI Scheduler
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-1 text-xs font-bold uppercase tracking-widest border-0 bg-transparent transition-colors ${activeTab === 'pipeline' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            style={{ borderRadius: 0 }}
          >
            Pipeline
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="h-[92vh] overflow-auto">
          {/* Configuration Form - Only show for Dashboard and Hardware & Model tabs */}
          {(activeTab === 'main' || activeTab === 'details') && (
            <div className="flex gap-1 mb-1.5 h-[8vh]">
              <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-xl p-2 border border-slate-700/50 shadow-lg">
                <div className="grid grid-cols-7 gap-1 items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-slate-700/50 border border-slate-600/50 rounded-lg"
                      placeholder="e.g. Qwen/Qwen3-0.6B"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-slate-700/50 border border-slate-600/50 rounded-lg"
                      placeholder="Enter input text..."
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={runPrediction}
                      disabled={isLoading || !modelName.trim()}
                      className="w-full px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}          {/* Error Message */}
          {errorMsg && (
            <div className="mb-2 p-2 bg-red-900/60 text-red-200 rounded-xl border border-red-700/40 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'main' && response && (
            <div className="grid grid-cols-12 gap-2">
              {/* Performance Metrics - Make metrics bigger and clearer */}
              <div className="col-span-8 bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 shadow-none h-[45vh] flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-extrabold mb-2 text-white flex items-center gap-2" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
                    <TrendingUp className="w-6 h-6 text-white/80" />
                    AI Inference Performance Overview
                  </h3>
                  <p className="text-base text-white/70 mb-4" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
                    This dashboard summarizes the latest AI inference run, highlighting efficiency, cost, and technical health. Use these insights to optimize resource allocation and model selection.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-8 flex-1">
                  {/* Runtime */}
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg p-6 border border-white/20 shadow-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-6 h-6 text-white/80" />
                      <span className="text-lg text-white font-semibold">Runtime</span>
                    </div>
                    <div className="text-5xl font-extrabold text-white mb-1" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', letterSpacing: '-0.03em' }}>
                      {formatNumber(response.predictedRuntime || extractPredictedRuntime(response.raw))}s
                    </div>
                    <div className="text-base text-white/70">Predicted</div>
                    <div className="text-lg text-white mt-2">Actual: <span className="font-bold">{formatNumber(response.actualRuntime || extractActualRuntime(response.raw))}s</span></div>
                    <div className="text-xs text-white/50 mt-1">Input: {typeof response.model?.input_token_length === 'number' ? response.model.input_token_length : 'N/A'} | Output: {typeof response.model?.output_token_length === 'number' ? response.model.output_token_length : 'N/A'}</div>
                  </div>
                  {/* Energy */}
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg p-6 border border-white/20 shadow-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-6 h-6 text-white/80" />
                      <span className="text-lg text-white font-semibold">Energy</span>
                    </div>
                    <div className="text-5xl font-extrabold text-white mb-1" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', letterSpacing: '-0.03em' }}>
                      {formatNumber(response.energyUsed)} Wh
                    </div>
                    <div className="text-base text-white/70">Total Used</div>
                    <div className="text-lg text-white mt-2">Power: <span className="font-bold">{formatNumber(response.predictedPower || extractPredictedPower(response.raw))}W</span></div>
                  </div>
                  {/* Cost */}
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg p-6 border border-white/20 shadow-none">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-6 h-6 text-white/80" />
                      <span className="text-lg text-white font-semibold">Cost</span>
                    </div>
                    <div className="text-5xl font-extrabold text-white mb-1" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', letterSpacing: '-0.03em' }}>
                      {formatNumber(response.costCents)}¢
                    </div>
                    <div className="text-base text-white/70">Per Inference</div>
                    <div className="text-lg text-white mt-2">Error: <span className={`font-bold ${response.error !== null && response.error < 20 ? 'text-green-400' : 'text-yellow-400'}`}>{formatNumber(response.error)}%</span></div>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="text-base text-white/80">
                    <span className="font-bold">Story:</span> The model <span className="font-bold text-white">{modelName}</span> processed your input in <span className="font-bold text-white">{formatNumber(response.actualRuntime || extractActualRuntime(response.raw))}s</span>, consuming <span className="font-bold text-white">{formatNumber(response.energyUsed)} Wh</span> and costing <span className="font-bold text-white">{formatNumber(response.costCents)}¢</span> per inference. Accuracy and efficiency metrics help you identify optimization opportunities.
                  </div>
                </div>
              </div>
              {/* System Status */}
              <div className="col-span-4 bg-slate-800/40 backdrop-blur-sm rounded-xl p-2 border border-slate-700/50 shadow-lg h-[45vh]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">System Status</h3>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-slate-700/30 rounded-lg mb-1.5">
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 ${response.hardware?.gpu_available ? 'bg-green-400' : 'bg-red-400'} rounded-full animate-pulse`}></div>
                    <span className="text-xs">GPU {response.hardware?.gpu_available ? 'Connected' : 'Not Connected'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Available Compute</span>
                    <span className="text-xs font-light">{response.hardware?.num_cores ? Math.round((response.hardware.num_cores / 12) * 100).toFixed(3) + '%' : 'N/A'}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: response.hardware?.num_cores ? `${(Math.round((response.hardware.num_cores / 12) * 100)).toFixed(3)}%` : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-center p-1.5 mb-1.5 text-xs">
                  <div className="text-slate-400 mb-0.5">{response.hardware?.device || 'Unknown Device'}</div>
                  <div className="text-[10px] text-slate-500">{formatNumber(response.hardware?.num_cores)} cores • {formatNumber(response.hardware?.memory_bytes / 1e9)}GB RAM</div>
                </div>
                <div className="p-1.5 bg-slate-700/30 rounded-lg">
                  <div className="mb-1">
                    <span className="text-xs">Prediction Accuracy</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-center text-xs">
                    <div>
                      <div className="text-green-400">{calculateAccuracy('runtime', response).toFixed(3)}%</div>
                      <div className="text-[10px] text-slate-500">Runtime</div>
                    </div>
                    <div>
                      <div className="text-blue-400">{calculateAccuracy('power', response).toFixed(3)}%</div>
                      <div className="text-[10px] text-slate-500">Power</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Energy Price Chart */}
              {(response.priceFuture?.length > 0 || response.priceHistory?.length > 0) && (
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
                    data={addDatetimes(response.priceFuture || [], new Date())}
                    history={addDatetimes(response.priceHistory || [], new Date(Date.now() - (response.priceHistory?.length || 0) * 60 * 60 * 1000))}
                    title=""
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && response && (
            <div className="w-full flex flex-col items-center justify-start pt-8 pb-12 px-4 min-h-[60vh]">
              {/* Story Header */}
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
                  The Inference Journey
                </h2>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  Follow the path from hardware environment to model configuration, culminating in your AI inference result. Each step impacts performance, cost, and efficiency.
                </p>
              </div>
              {/* Vertical Timeline/Stepper Layout */}
              <div className="flex flex-col items-center w-full max-w-5xl mx-auto gap-12 relative">
                {/* Hardware Section */}
                <div className="flex flex-col items-center w-full">
                  <div className="bg-white/10 text-white px-8 py-6 rounded-2xl border border-white/30 shadow-none min-w-[260px] max-w-[420px] w-full mb-4">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Cpu className="w-7 h-7 text-white/80" /> Hardware Environment
                    </h3>
                    <table className="min-w-full text-base text-left text-white/90 border-separate border-spacing-y-1">
                      <tbody>
                        {response.hardware && Object.entries(response.hardware).map(([key, value]) => (
                          <tr key={key}>
                            <td className="pr-2 text-white/70 font-medium whitespace-nowrap">{key.replace(/_/g, ' ')}</td>
                            <td className="pl-2 whitespace-pre-wrap break-all text-white/90">
                              {typeof value === 'object' ? JSON.stringify(value) : 
                                key === 'memory_bytes' ? `${(Number(value) / 1e9).toFixed(2)} GB` :
                                key === 'cpu_frequency' ? `${(Number(value) / 1e9).toFixed(2)} GHz` :
                                value?.toString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-base text-white/70 max-w-xs text-center mb-2">
                    <span className="font-semibold text-white">Your hardware</span> provides the computational foundation for every inference. More cores, memory, and GPU acceleration can dramatically improve speed and efficiency.
                  </div>
                </div>
                {/* Stepper Connector */}
                <div className="flex flex-col items-center justify-center">
                  <svg width="4" height="60" viewBox="0 0 4 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="4" height="60" rx="2" fill="#fff" opacity="0.2" />
                  </svg>
                </div>
                {/* Model Section */}
                <div className="flex flex-col items-center w-full">
                  <div className="bg-white/10 text-white px-8 py-6 rounded-2xl border border-white/30 shadow-none min-w-[260px] max-w-[420px] w-full mb-4">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Settings className="w-7 h-7 text-white/80" /> Model Configuration
                    </h3>
                    <div className="overflow-x-auto max-h-[28vh] relative">
                      {(() => {
                        let modelFeatures = null;
                        if (response.raw && response.raw.includes("Extracted Features:")) {
                          try {
                            const extractedPart = response.raw.split("Extracted Features:")[1];
                            const jsonMatch = extractedPart.match(/\{[\s\S]*?\n\}/);
                            if (jsonMatch) {
                              modelFeatures = JSON.parse(jsonMatch[0]);
                            }
                          } catch (e) {
                            console.error('Error parsing model features:', e);
                          }
                        }
                        const hardwareFields = [
                          'cpu_frequency', 'num_cores', 'memory_bytes', 'device', 'os', 'os_version', 
                          'machine', 'gpu_available', 'architecture', 'platform', 'processor', 
                          'cpu_model', 'ram', 'storage', 'gpu_model', 'gpu_memory', 'system_info',
                          'hardware_id', 'device_type', 'compute_capability', 'driver_version'
                        ];
                        const modelOnlyFields = modelFeatures ? Object.fromEntries(
                          Object.entries(modelFeatures).filter(([key]) => 
                            !hardwareFields.includes(key) && key !== 'layer_types'
                          )
                        ) : null;
                        return modelOnlyFields && Object.keys(modelOnlyFields).length > 0 ? (
                          <ModelFeatures modelOnlyFields={modelOnlyFields} />
                        ) : (
                          <div className="text-base text-white/60">No model configuration details available.</div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-base text-white/70 max-w-xs text-center mb-2">
                    <span className="font-semibold text-white">Your model</span> architecture and configuration determine how data is processed and predictions are made. More parameters and layers can mean greater capability, but also higher cost.
                  </div>
                </div>
                {/* Stepper Connector */}
                <div className="flex flex-col items-center justify-center">
                  <svg width="4" height="60" viewBox="0 0 4 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="4" height="60" rx="2" fill="#fff" opacity="0.2" />
                  </svg>
                </div>
                {/* Inference Result Section */}
                <div className="flex flex-col items-center w-full">
                  <div className="bg-white/90 text-black px-8 py-6 rounded-2xl border border-white/60 shadow-lg min-w-[260px] max-w-[420px] w-full mb-4">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <TrendingUp className="w-7 h-7 text-black/80" /> Inference Result
                    </h3>
                    <div className="text-lg font-semibold mb-2">{modelName}</div>
                    <div className="text-base mb-1"><span className="font-bold">Runtime:</span> {formatNumber(response.actualRuntime || extractActualRuntime(response.raw))}s</div>
                    <div className="text-base mb-1"><span className="font-bold">Energy:</span> {formatNumber(response.energyUsed)} Wh</div>
                    <div className="text-base mb-1"><span className="font-bold">Cost:</span> {formatNumber(response.costCents)}¢</div>
                    <div className="text-base mb-1"><span className="font-bold">Accuracy:</span> {calculateAccuracy('runtime', response).toFixed(2)}%</div>
                  </div>
                  <div className="text-base text-black/70 max-w-xs text-center">
                    <span className="font-semibold text-black">Result:</span> Your inference run brings together hardware and model choices, producing a result that balances speed, energy, and cost.
                  </div>
                </div>
              </div>
              {/* Story Summary */}
              <div className="mt-10 text-center">
                <h4 className="text-xl font-bold text-white mb-2">Summary</h4>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  Every inference is a journey: <span className="font-semibold text-white">hardware</span> enables computation, <span className="font-semibold text-white">model configuration</span> shapes intelligence, and <span className="font-semibold text-white">results</span> reveal the impact. Optimize each step for the best performance and value.
                </p>
              </div>
            </div>
          )}

          {/* AI Scheduler Tab */}
          {activeTab === 'scheduler' && (
            <div className="grid grid-cols-12 gap-2">
              {/* Schedule New Job */}
              <div className="col-span-5 bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 shadow-lg h-[45vh]">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-400" />
                  Schedule New Inference
                </h3>
                
                {/* Model Configuration */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Model Name</label>
                    <Input
                      value={scheduleModelName}
                      onChange={(e) => setScheduleModelName(e.target.value)}
                      placeholder="e.g. Qwen/Qwen3-0.6B"
                      className="h-8 text-xs bg-slate-700/50 border-slate-600/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Input Text</label>
                    <textarea
                      value={scheduleInputText}
                      onChange={(e) => setScheduleInputText(e.target.value)}
                      placeholder="Enter input text..."
                      className="w-full h-16 px-3 py-2 text-xs bg-slate-700/50 border border-slate-600/50 rounded-lg resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Time</label>
                      <Input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => {
                          setSelectedTime(e.target.value);
                          if (selectedDate && e.target.value) {
                            const [hours, minutes] = e.target.value.split(":").map(Number);
                            const scheduledDateTime = new Date(selectedDate);
                            scheduledDateTime.setHours(hours, minutes, 0, 0);
                            updateRealTimeCostEstimate(scheduledDateTime);
                          }
                        }}
                        className="h-8 text-xs bg-slate-700/50 border-slate-600/50"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={scheduleJob}
                        disabled={isScheduling || !selectedDate}
                        className="h-8 w-full text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        {isScheduling ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Schedule
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="col-span-3 bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-lg h-[45vh]">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  Select Date
                </h3>
                <div className="h-[36vh] overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date && selectedTime) {
                        const [hours, minutes] = selectedTime.split(":").map(Number);
                        const scheduledDateTime = new Date(date);
                        scheduledDateTime.setHours(hours, minutes, 0, 0);
                        updateRealTimeCostEstimate(scheduledDateTime);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border-0 w-full h-full"
                    classNames={{
                      months: "flex flex-col w-full h-full",
                      month: "w-full h-full flex flex-col",
                      caption: "flex justify-center pt-2 pb-2 relative items-center",
                      caption_label: "text-sm font-semibold text-white",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-slate-700/50 hover:bg-slate-600/50 p-0 opacity-70 hover:opacity-100 text-sm rounded-md border border-slate-600/30 flex items-center justify-center",
                      nav_button_previous: "absolute left-2",
                      nav_button_next: "absolute right-2",
                      table: "w-full border-collapse flex-1",
                      head_row: "flex w-full mb-1",
                      head_cell: "text-slate-400 rounded-md flex-1 font-medium text-sm text-center py-1",
                      row: "flex w-full",
                      cell: "flex-1 text-center text-sm p-0.5 relative",
                      day: "h-8 w-full p-0 font-medium text-sm hover:bg-slate-700/50 rounded-md transition-colors flex items-center justify-center",
                      day_selected: "bg-blue-600 text-white hover:bg-blue-600 font-semibold",
                      day_today: "bg-slate-700/50 text-white font-semibold",
                      day_outside: "text-slate-600 opacity-50",
                      day_disabled: "text-slate-600 opacity-30 cursor-not-allowed",
                    }}
                  />
                </div>
              </div>

              {/* Cost Estimation */}
              <div className="col-span-4 bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-lg h-[45vh] overflow-hidden">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  Cost Estimation
                </h3>
                
                {selectedDate && (
                  <div className="h-[36vh] overflow-y-auto pr-2 space-y-3">
                    <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="text-xs text-slate-400 mb-2 font-medium">Selected Date & Time</div>
                      <div className="text-sm font-semibold text-white">
                        {selectedDate.toLocaleDateString()} at {selectedTime}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-slate-700/20 rounded-lg border border-slate-600/20">
                      <div className="text-xs text-slate-400 mb-3 flex items-center gap-2 font-medium">
                        Real-time Cost Breakdown
                        {isLoadingPrice && (
                          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-slate-700/40 rounded-lg text-center border border-slate-600/30">
                          <div className="text-lg font-bold text-green-400">
                            {realTimeCostEstimate ? `${realTimeCostEstimate.cost.toFixed(3)}¢` : '~2.3¢'}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 font-medium">Est. Cost</div>
                          {realTimeCostEstimate && (
                            <div className="text-xs text-slate-400 mt-1">
                              <span className="font-medium">(API)</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-slate-700/40 rounded-lg text-center border border-slate-600/30">
                          <div className="text-lg font-bold text-blue-400">
                            {realTimeCostEstimate ? `${realTimeCostEstimate.runtime.toFixed(1)}s` : '~1.2s'}
                          </div>
                          <div className="text-base text-white/70">Est. Runtime</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="p-2 bg-slate-700/20 rounded-lg border border-slate-600/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium">Current Energy Price</span>
                          <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                            {isLoadingPrice ? (
                              <div className="w-2 h-2 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              `${currentEnergyPrice.toFixed(1)} EUR/MWh`
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-2 bg-slate-700/20 rounded-lg border border-slate-600/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium">Est. Energy Usage</span>
                          <span className="text-xs font-semibold text-amber-400">
                            {realTimeCostEstimate ? `${realTimeCostEstimate.energy.toFixed(1)} Wh` : '2.7 Wh'}
                          </span>
                        </div>
                      </div>
                      
                      {realTimeCostEstimate && (
                        <div className="p-2 bg-slate-700/20 rounded-lg border border-slate-600/20">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">Selected Time Price</span>
                            <span className="text-xs font-semibold text-blue-400">
                              {realTimeCostEstimate.price.toFixed(1)} EUR/MWh
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-500 text-center bg-slate-700/20 p-2.5 rounded-lg border border-slate-600/20">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span>💡</span>
                        <span className="text-blue-400 font-medium">Optimal scheduling:</span>
                      </div>
                      <div className="text-slate-400 mb-2">Energy prices are typically lowest between 2-6 AM</div>
                      {realTimeCostEstimate && realTimeCostEstimate.price < currentEnergyPrice && (
                        <div className="text-green-400 font-medium text-xs">
                          💚 Selected time has lower energy cost! ({((currentEnergyPrice - realTimeCostEstimate.price) / currentEnergyPrice * 100).toFixed(1)}% savings)
                        </div>
                      )}
                      {realTimeCostEstimate && realTimeCostEstimate.price > currentEnergyPrice && (
                        <div className="text-yellow-400 font-medium text-xs">
                          ⚠️ Selected time has higher energy cost. Consider rescheduling.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {!selectedDate && (
                  <div className="h-[36vh] flex items-center justify-center">
                    <div className="text-center text-slate-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <div className="text-sm font-medium mb-1">Select a date to see cost estimates</div>
                      <div className="text-xs">Choose a date and time for scheduling</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Scheduled Jobs List */}
              <div className="col-span-12 bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-lg h-[40vh] mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Scheduled Jobs ({scheduledJobs.length})
                  </h3>
                  {scheduledJobs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs font-medium">
                        {scheduledJobs.filter(job => job.status === 'pending').length} pending
                      </Badge>
                      {scheduledJobs.filter(job => job.status === 'completed').length > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs font-medium">
                          {scheduledJobs.filter(job => job.status === 'completed').length} completed
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="h-[30vh] overflow-y-auto space-y-2 pr-2">
                  {scheduledJobs.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <div className="text-base font-medium mb-1">No scheduled jobs</div>
                        <div className="text-sm">Schedule your first AI inference above</div>
                      </div>
                    </div>
                  ) : (
                    scheduledJobs.map((job) => (
                      <Card key={job.id} className="bg-slate-700/40 border-slate-600/40 hover:bg-slate-700/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Header with status and time */}
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={
                                    job.status === 'completed' ? 'default' :
                                    job.status === 'running' ? 'secondary' :
                                    job.status === 'failed' ? 'destructive' : 'outline'
                                  }
                                  className={`text-xs font-medium px-1.5 py-0.5 ${
                                    job.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                    job.status === 'running' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    job.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                    'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                  }`}
                                >
                                  {job.status}
                                </Badge>
                                <span className="text-xs text-slate-300 font-medium">
                                  {job.scheduledTime.toLocaleDateString()} at {job.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              
                              {/* Model and input text */}
                              <div className="mb-2">
                                <div className="text-sm font-semibold text-white mb-1 truncate">{job.modelName}</div>
                                <div className="text-xs text-slate-400 line-clamp-1 leading-relaxed">{job.inputText}</div>
                              </div>
                              
                              {/* Metrics grid with consistent alignment */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-600/30 rounded-md p-2 text-center">
                                  <div className="text-xs text-slate-400 mb-0.5 font-medium">Cost</div>
                                  <div className="text-xs font-semibold text-green-400">
                                    {job.estimatedCost ? `${(job.estimatedCost * 100).toFixed(2)}¢` : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-600/30 rounded-md p-2 text-center">
                                  <div className="text-xs text-slate-400 mb-0.5 font-medium">
                                    {job.status === 'completed' && job.actualRuntime ? 'Actual Runtime' : 'Runtime'}
                                  </div>
                                  <div className={`text-xs font-semibold ${
                                    job.status === 'completed' && job.actualRuntime ? 'text-green-400' : 'text-blue-400'
                                  }`}>
                                    {job.status === 'completed' && job.actualRuntime ? 
                                      `${job.actualRuntime.toFixed(1)}s` :
                                     job.estimatedRuntime ? 
                                      `${job.estimatedRuntime.toFixed(1)}s` : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-600/30 rounded-md p-2 text-center">
                                  <div className="text-xs text-slate-400 mb-0.5 font-medium">Energy</div>
                                  <div className="text-xs font-semibold text-amber-400">
                                    {job.estimatedEnergy ? `${(job.estimatedEnergy * 1000).toFixed(1)}Wh` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex flex-col items-center gap-1.5 ml-3">
                              <div className="h-7 flex items-center">
                                {job.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => runJobNow(job)}
                                    className="h-7 w-7 p-0 bg-green-600/20 hover:bg-green-600/40 border-green-500/30 text-green-400 hover:text-green-300"
                                    title="Run now"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {job.status === 'running' && (
                                  <div className="h-7 w-7 flex items-center justify-center bg-blue-600/20 rounded-md border border-blue-500/30">
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-400"></div>
                                  </div>
                                )}
                                {job.status === 'completed' && job.result && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setResponse(job.result!);
                                      setModelName(job.modelName);
                                      setInputText(job.inputText);
                                      setActiveTab('main');
                                    }}
                                    className="h-7 w-7 p-0 bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/30 text-blue-400 hover:text-blue-300"
                                    title="View results"
                                  >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteJob(job.id)}
                                className="h-7 w-7 p-0 bg-red-600/20 hover:bg-red-600/40 border-red-500/30 text-red-400 hover:text-red-300"
                                title="Delete job"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {job.status === 'failed' && (
                            <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Job failed to execute
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cto' && response && (
            <CTOView
              response={response}
              formatNumber={formatNumber}
              extractPredictedRuntime={extractPredictedRuntime}
              extractActualRuntime={extractActualRuntime}
              extractInputTokenLength={extractInputTokenLength}
              extractOutputTokenLength={extractOutputTokenLength}
            />
          )}

          {activeTab === 'cfo' && response && (
            <CFOView
              response={response}
              formatNumber={formatNumber}
            />
          )}

          {activeTab === 'pipeline' && (
            <div className="w-full flex flex-col items-center justify-center pt-12 pb-12 px-4 min-h-[60vh]">
              <h2 className="text-3xl font-extrabold text-white mb-8 tracking-tight text-center" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
                Backend Inference Time Prediction Pipeline
              </h2>
              <div className="flex flex-row items-center justify-center gap-8 w-full max-w-6xl">
                {/* Step 1: User Input */}
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/30 shadow-none min-w-[180px] max-w-[220px] text-center mb-2">
                    <div className="mb-2"><span className="font-bold text-lg">User Input</span></div>
                    <div className="text-sm text-white/80">Prompt, Model Name, Hardware Info</div>
                  </div>
                  <span className="text-xs text-white/50">(Frontend)</span>
                </div>
                {/* Arrow */}
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 12 H54" stroke="#fff" strokeWidth="3" strokeDasharray="8 4" opacity="0.7" />
                  <polygon points="54,6 60,12 54,18" fill="#fff" opacity="0.7" />
                </svg>
                {/* Step 2: Feature Extraction */}
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/30 shadow-none min-w-[180px] max-w-[220px] text-center mb-2">
                    <div className="mb-2"><span className="font-bold text-lg">Feature Extraction</span></div>
                    <div className="text-sm text-white/80">Extracts hardware & model features, input length, etc.</div>
                  </div>
                  <span className="text-xs text-white/50">(Python backend)</span>
                </div>
                {/* Arrow */}
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 12 H54" stroke="#fff" strokeWidth="3" strokeDasharray="8 4" opacity="0.7" />
                  <polygon points="54,6 60,12 54,18" fill="#fff" opacity="0.7" />
                </svg>
                {/* Step 3: ML Model */}
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/30 shadow-none min-w-[180px] max-w-[220px] text-center mb-2">
                    <div className="mb-2"><span className="font-bold text-lg">ML Model</span></div>
                    <div className="text-sm text-white/80">Trained regressor (e.g., RandomForest) predicts inference time</div>
                  </div>
                  <span className="text-xs text-white/50">(Python backend)</span>
                </div>
                {/* Arrow */}
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 12 H54" stroke="#fff" strokeWidth="3" strokeDasharray="8 4" opacity="0.7" />
                  <polygon points="54,6 60,12 54,18" fill="#fff" opacity="0.7" />
                </svg>
                {/* Step 4: Prediction Output */}
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/30 shadow-none min-w-[180px] max-w-[220px] text-center mb-2">
                    <div className="mb-2"><span className="font-bold text-lg">Prediction Output</span></div>
                    <div className="text-sm text-white/80">Returns predicted inference time to frontend</div>
                  </div>
                  <span className="text-xs text-white/50">(API response)</span>
                </div>
              </div>
              <div className="mt-10 text-center">
                <h4 className="text-xl font-bold text-white mb-2">How it works</h4>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  The backend receives your input, extracts relevant features, runs them through a trained ML model, and returns a fast, data-driven prediction of inference time. This enables real-time cost and scheduling optimization.
                </p>
              </div>
              {/* Backend Artifacts & Insights - use main pipelineInfo state */}
              <div className="w-full max-w-5xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Evaluation Report */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span>📊</span> Evaluation Report
                  </h3>
                  {pipelineLoading ? (
                    <div className="text-white/60">Loading…</div>
                  ) : pipelineError ? (
                    <div className="text-red-400">{pipelineError}</div>
                  ) : pipelineInfo?.evaluation_report ? (
                    <div className="space-y-1 mt-2">
                      {Object.entries(pipelineInfo.evaluation_report).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs text-white/80">
                          <span className="font-medium">{k}</span>
                          <span className="text-green-400 font-mono">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">No evaluation report found.</div>
                  )}
                </div>
                {/* Feature Importances */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span>🌟</span> Feature Importances
                  </h3>
                  {pipelineLoading ? (
                    <div className="text-white/60">Loading…</div>
                  ) : pipelineError ? (
                    <div className="text-red-400">{pipelineError}</div>
                  ) : pipelineInfo?.feature_importance ? (
                    <div className="space-y-1 mt-2">
                      {Object.entries(pipelineInfo.feature_importance).map(([feature, value]) => (
                        <div key={feature} className="flex justify-between text-xs text-white/80">
                          <span className="font-medium">{feature}</span>
                          <span className="text-blue-400 font-mono">{value.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">No feature importance data.</div>
                  )}
                </div>
                {/* Log Files */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span>📝</span> Log Files
                  </h3>
                  {pipelineLoading ? (
                    <div className="text-white/60">Loading…</div>
                  ) : pipelineError ? (
                    <div className="text-red-400">{pipelineError}</div>
                  ) : pipelineInfo?.logs && pipelineInfo.logs.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pipelineInfo.logs.map(log => (
                        <span key={log} className="bg-slate-700/40 text-xs text-white/70 px-2 py-1 rounded-md border border-slate-600/30">{log}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">No logs found.</div>
                  )}
                </div>
                {/* Benchmarks Preview */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span>📈</span> Benchmarks Preview
                  </h3>
                  {pipelineLoading ? (
                    <div className="text-white/60">Loading…</div>
                  ) : pipelineError ? (
                    <div className="text-red-400">{pipelineError}</div>
                  ) : pipelineInfo?.benchmarks ? (
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-xs text-white/80 border-separate border-spacing-y-1">
                        <thead>
                          <tr>
                            {pipelineInfo.benchmarks[0]?.map((h, i) => <th key={i} className="font-bold text-white/90 pr-2 pb-1">{h}</th>)}
                        </tr>
                        </thead>
                        <tbody>
                          {pipelineInfo.benchmarks.slice(1, 6).map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => <td key={j} className="pr-2 text-white/80">{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {pipelineInfo.benchmarks.length > 6 && <div className="text-xs text-slate-400 mt-1">…{pipelineInfo.benchmarks.length - 6} more rows</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">No benchmark data.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInferencePredictor;
