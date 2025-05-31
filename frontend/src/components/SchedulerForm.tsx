import React from 'react';
import { Input } from '../components/ui/input';

interface SchedulerFormProps {
  scheduleModelName: string;
  setScheduleModelName: (v: string) => void;
  scheduleInputText: string;
  setScheduleInputText: (v: string) => void;
  selectedTime: string;
  setSelectedTime: (v: string) => void;
  onSchedule: () => void;
  isScheduling: boolean;
}

const SchedulerForm: React.FC<SchedulerFormProps> = ({
  scheduleModelName,
  setScheduleModelName,
  scheduleInputText,
  setScheduleInputText,
  selectedTime,
  setSelectedTime,
  onSchedule,
  isScheduling
}) => (
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
          onChange={(e) => setSelectedTime(e.target.value)}
          className="h-8 text-xs bg-slate-700/50 border-slate-600/50"
        />
      </div>
      <div className="flex items-end">
        <button
          onClick={onSchedule}
          disabled={isScheduling}
          className="w-full px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center"
        >
          {isScheduling ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          ) : (
            'Schedule'
          )}
        </button>
      </div>
    </div>
  </div>
);

export default SchedulerForm;
