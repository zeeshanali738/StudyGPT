import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from './icons/Icons';

interface SettingsPageProps {
  initialProfile: string;
  currentTheme: string;
  currentVoiceURI: string;
  currentLanguage: string;
  onSaveProfile: (newProfile: string) => void;
  onSaveTheme: (newTheme: string) => void;
  onSaveVoice: (newVoiceURI: string) => void;
  onSaveLanguage: (newLanguage: string) => void;
  onBack: () => void;
}

const MAX_PROFILE_LENGTH = 2000;

const presetThemes = [
    { name: 'Indigo', value: 'indigo', colors: 'from-indigo-500 to-purple-500' },
    { name: 'Emerald', value: 'emerald', colors: 'from-emerald-500 to-teal-500' },
    { name: 'Rose', value: 'rose', colors: 'from-rose-500 to-orange-500' },
    { name: 'Sky', value: 'sky', colors: 'from-sky-500 to-blue-500' },
];

const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'ur', name: 'Urdu' },
    { code: 'hi', name: 'Hindi' },
]

const SettingsPage: React.FC<SettingsPageProps> = ({ initialProfile, currentTheme, currentVoiceURI, currentLanguage, onSaveProfile, onSaveTheme, onSaveVoice, onSaveLanguage, onBack }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [customColor, setCustomColor] = useState(() => !presetThemes.some(t => t.value === currentTheme) ? currentTheme : '#6366f1');
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            const uniqueVoices = Array.from(new Map(availableVoices.map(v => [v.name, v])).values());
            setAllVoices(uniqueVoices.sort((a, b) => a.lang.localeCompare(b.lang)));
        }
    };
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }

    return () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = null;
        }
    };
  }, []);
  
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onSaveTheme(newColor);
  };
  
  const characterCount = profile.length;
  const countColor = characterCount > MAX_PROFILE_LENGTH 
    ? 'text-red-400' 
    : characterCount > MAX_PROFILE_LENGTH * 0.9 
    ? 'text-yellow-400' 
    : 'text-slate-400';

  const filteredVoices = allVoices.filter(v => v.lang.startsWith(currentLanguage));

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 animate-fadeIn">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 mr-4 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-100">
            <ArrowLeftIcon className="w-5 h-5"/>
        </button>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Your Study Profile</h2>
        <p className="text-sm text-slate-400 mb-4">
          Add key topics, learning goals, or background information here. This profile provides the AI with long-term context across all your study sessions.
        </p>
        <div className="relative w-full">
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="E.g., I'm a medical student preparing for my board exams, focusing on cardiology and pharmacology. I prefer detailed explanations with clinical examples."
            className="w-full h-64 p-3 pb-7 bg-slate-900 border border-slate-600 rounded-md text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none resize-y"
            rows={8}
            maxLength={MAX_PROFILE_LENGTH}
          />
           <div className={`absolute bottom-2 right-3 text-xs font-mono select-none ${countColor}`}>
            {characterCount}/{MAX_PROFILE_LENGTH}
          </div>
        </div>
        <div className="flex justify-end items-center mt-6">
          <button
            onClick={() => onSaveProfile(profile)}
            className="px-6 py-2 text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-md transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
         <h2 className="text-xl font-bold text-white mb-2">Theme</h2>
         <p className="text-sm text-slate-400 mb-4">
            Personalize the look and feel of your study space.
         </p>
         <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {presetThemes.map(theme => (
                <button 
                    key={theme.value}
                    onClick={() => onSaveTheme(theme.value)}
                    className={`relative p-2 h-20 rounded-lg bg-gradient-to-br ${theme.colors} transition-transform duration-200 ${currentTheme === theme.value ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-105' : 'hover:scale-105'}`}
                >
                    <span className="absolute bottom-2 left-2 text-sm font-semibold text-white backdrop-blur-sm bg-black/20 px-2 py-1 rounded">{theme.name}</span>
                </button>
            ))}
             <div className={`relative p-2 h-20 rounded-lg flex items-center justify-center transition-transform duration-200 ${!presetThemes.some(t => t.value === currentTheme) ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-105' : 'hover:scale-105'}`} style={{backgroundColor: customColor}}>
                 <input
                    type="color"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Select a custom color"
                />
                 <span className="text-sm font-semibold text-white backdrop-blur-sm bg-black/20 px-2 py-1 rounded">Custom</span>
            </div>
         </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mt-6">
        <h2 className="text-xl font-bold text-white mb-2">Language & Speech</h2>
        <p className="text-sm text-slate-400 mb-4">
            Choose the language for AI responses and the voice for reading messages aloud.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-1">Response Language</label>
                <select
                    id="language-select"
                    value={currentLanguage}
                    onChange={(e) => onSaveLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none"
                >
                    {languageOptions.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="voice-select" className="block text-sm font-medium text-slate-300 mb-1">Voice Preference</label>
                <select
                    id="voice-select"
                    value={currentVoiceURI}
                    onChange={(e) => onSaveVoice(e.target.value)}
                    disabled={allVoices.length === 0}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none"
                >
                    <option value="">Browser Default ({currentLanguage})</option>
                    {filteredVoices.map(voice => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                        </option>
                    ))}
                </select>
                {allVoices.length === 0 && <p className="text-xs text-slate-500 mt-2">Loading voices...</p>}
                {allVoices.length > 0 && filteredVoices.length === 0 && <p className="text-xs text-slate-500 mt-2">No voices found for the selected language.</p>}
            </div>
        </div>
      </div>

    </div>
  );
};

export default SettingsPage;