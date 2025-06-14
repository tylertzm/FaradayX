import { useState } from 'react';
import { runPrediction } from './utils/prediction.js';

interface PredictionButtonProps {
  modelName: string;
  inputText: string;
  onResponse: (response: any) => void;
}

export const PredictionButton = ({ modelName, inputText, onResponse }: PredictionButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await runPrediction(modelName, inputText);
      onResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePredict}
      disabled={isLoading || !modelName || !inputText}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Running...' : 'Run Prediction'}
    </button>
  );
};
