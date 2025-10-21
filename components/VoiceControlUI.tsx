import React from 'react';
import { MicrophoneIcon } from './icons/Icons';

interface VoiceControlUIProps {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
}

const VoiceControlUI: React.FC<VoiceControlUIProps> = ({ isListening, transcript, startListening, stopListening }) => {
  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      <button 
        onClick={handleToggle} 
        className={`p-2 rounded-md transition-colors ${
          isListening 
            ? 'bg-red-500/20 text-red-400 animate-pulse' 
            : 'hover:bg-slate-700 text-slate-400 hover:text-slate-100'
        }`} 
        title={isListening ? 'Stop listening' : 'Start listening'}
      >
        <MicrophoneIcon className="w-5 h-5" />
      </button>

      {isListening && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 text-center max-w-lg w-full mx-4 animate-popIn">
            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-full animate-ping opacity-70"></div>
              <div className="relative w-20 h-20 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
                 <MicrophoneIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Listening...</h2>
            <p className="text-slate-400 min-h-[2.5em] text-lg">{transcript || '...'}</p>
            <button
              onClick={stopListening}
              className="mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceControlUI;
