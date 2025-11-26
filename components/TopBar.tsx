import React from 'react';

export const TopBar = ({ onlineCount, onSavePreset, onLoadPreset }: { 
  onlineCount: number | null;
  onSavePreset: () => void;
  onLoadPreset: () => void;
}) => (
  <div className="h-12 bg-white border-b-2 border-gray-500 flex items-center justify-between px-4 select-none">
    <div className="flex items-center gap-4">
      <h1 className="text-gray-900 font-bold tracking-[0.2em] text-sm">TEKDETEK</h1>
      <div className="h-4 w-px bg-gray-500" />
      <span className="text-xs text-gray-900 font-semibold">V.0.5</span>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 text-xs">
         <span className={`w-2 h-2 rounded-full ${onlineCount !== null && onlineCount > 0 ? 'bg-gray-900 animate-pulse' : 'bg-gray-500'}`}></span>
         <span className="text-gray-900 font-semibold">
           {onlineCount !== null ? `ONLINE: ${onlineCount}` : 'ONLINE: ...'}
         </span>
      </div>
      <div className="flex gap-2">
         <button 
           onClick={onSavePreset}
           className="text-[10px] border-2 border-gray-500 px-2 py-1 rounded text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white font-semibold transition-colors"
         >
           SAVE PRESET
         </button>
         <button 
           onClick={onLoadPreset}
           className="text-[10px] border-2 border-gray-500 px-2 py-1 rounded text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white font-semibold transition-colors"
         >
           LOAD PRESET
         </button>
      </div>
    </div>
  </div>
);
