import React from 'react';

const PulsingDot = () => (
  <div className="relative">
    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
    <div className="w-1.5 h-1.5 bg-green-400 rounded-full absolute top-0 left-0 animate-ping"></div>
  </div>
);

export default PulsingDot;
