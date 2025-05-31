import React from 'react';
import { Calendar } from '../components/ui/calendar';

interface SchedulerCalendarProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
}

const SchedulerCalendar: React.FC<SchedulerCalendarProps> = ({ selectedDate, setSelectedDate }) => (
  <div className="h-[36vh] overflow-hidden">
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={setSelectedDate}
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
);

export default SchedulerCalendar;
