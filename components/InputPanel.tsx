import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SendIcon, PaperclipIcon, GlobeIcon, BookOpenIcon, ClipboardCheckIcon, PresentationIcon, MessageCircleIcon, CameraIcon, XIcon, PlusIcon, Volume2Icon } from './icons/Icons';
import * as geminiService from '../services/geminiService';

interface InputPanelProps {
  onSend: (text: string, image?: string | null) => void;
  onFileUpload: (documentText: string, fileName:string) => void;
  isLoading: boolean;
  setStudyMode: (mode: 'chat' | 'flashcards' | 'quiz' | 'slides') => void;
  studyMode: 'chat' | 'flashcards' | 'quiz' | 'slides';
  hasFlashcards: boolean;
  hasQuizItems: boolean;
  hasSlides: boolean;
  hasDocument: boolean;
  isChatStarted: boolean;
  useWebSearch: boolean;
  setUseWebSearch: (value: boolean) => void;
  lastAssistantMessageInfo: { content: string, index: number } | null;
  onListenToLast: () => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  onSend,
  onFileUpload,
  isLoading,
  setStudyMode,
  studyMode,
  hasFlashcards,
  hasQuizItems,
  hasSlides,
  hasDocument,
  isChatStarted,
  useWebSearch,
  setUseWebSearch,
  lastAssistantMessageInfo,
  onListenToLast,
}) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt.length > 5 && isFocused) {
            setIsFetchingSuggestions(true);
            try {
                const newSuggestions = await geminiService.getAutocompleteSuggestions(trimmedPrompt);
                // Only update if the input hasn't changed while fetching
                if (textareaRef.current?.value.trim() === trimmedPrompt) {
                  setSuggestions(newSuggestions);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
                setSuggestions([]);
            } finally {
                setIsFetchingSuggestions(false);
            }
        } else {
            setSuggestions([]);
        }
    }, 500); // 500ms debounce

    return () => {
        clearTimeout(handler);
    };
  }, [prompt, isFocused]);


  const handleSend = () => {
    if ((!prompt.trim() && !image) || isLoading) return;
    onSend(prompt, image);
    setPrompt('');
    setImage(null);
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onFileUpload(text, file.name);
      };
      reader.readAsText(file);
    }
    if(e.target) e.target.value = ''; // Reset file input
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
    if(e.target) e.target.value = ''; // Reset file input
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Use a small timeout to allow click events on suggestions
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setPrompt(suggestionText);
    setSuggestions([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Manually trigger height adjustment after populating text
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          }
      }, 0);
    }
  };

  const showSuggestions = isFocused && prompt.trim() !== '' && !image && suggestions.length > 0;
  
  const ModeButton = useCallback(({ Icon, label, mode, enabled, onClick, title }: { Icon: React.FC<any>, label: string, mode?: 'chat' | 'flashcards' | 'quiz' | 'slides', enabled: boolean, onClick?: () => void, title: string }) => (
    <button
        onClick={onClick || (() => setStudyMode(mode!))}
        disabled={!enabled}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            enabled
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
        title={title}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
), [setStudyMode]);


  return (
    <div className="relative">
      {showSuggestions && (
        <div className="absolute bottom-full w-full mb-2 px-1 animate-slideInUpSmall">
          <div className="bg-slate-700/60 backdrop-blur-md border border-slate-600/50 rounded-lg p-2 max-h-60 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {suggestions.map((s, i) => {
                const lowerCasePrompt = prompt.toLowerCase();
                const lowerCaseSuggestion = s.toLowerCase();
                const startsWith = lowerCaseSuggestion.startsWith(lowerCasePrompt);
                const matchedPart = startsWith ? s.substring(0, prompt.length) : '';
                const remainingPart = startsWith ? s.substring(prompt.length) : s;
                return (
                  <button
                    key={`auto-${i}`}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-[var(--accent-primary)] hover:text-white transition-colors group"
                  >
                    {startsWith ? (
                      <>
                        <span className="group-hover:text-white">{matchedPart}</span>
                        <span className="font-semibold text-white">{remainingPart}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-white">{s}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl shadow-black/20">
        <div className="flex justify-center items-center gap-2 mb-2 px-2 flex-wrap">
          {studyMode !== 'chat' && <ModeButton Icon={MessageCircleIcon} label="Chat" mode="chat" enabled={true} title="View Chat" />}
          {lastAssistantMessageInfo && <ModeButton Icon={Volume2Icon} label="Listen" enabled={!!lastAssistantMessageInfo.content} onClick={onListenToLast} title="Listen to last message"/>}
          <ModeButton Icon={BookOpenIcon} label="Flashcards" mode="flashcards" enabled={hasFlashcards} title={hasFlashcards ? "View Flashcards" : "No flashcards generated yet"} />
          <ModeButton Icon={ClipboardCheckIcon} label="Quiz" mode="quiz" enabled={hasQuizItems} title={hasQuizItems ? "View Quiz" : "No quiz generated yet"} />
          <ModeButton Icon={PresentationIcon} label="Slides" mode="slides" enabled={hasSlides} title={hasSlides ? "View Slides" : "No slides generated yet"} />
        </div>

        <div className="relative flex items-end gap-2 p-1">
          <div className="relative flex-shrink-0">
              {/* Attach Menu */}
              <div className={`absolute bottom-full mb-3 flex items-center gap-3 transition-all duration-300 ${isAttachMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
                  <button 
                        onClick={() => { imageInputRef.current?.click(); setIsAttachMenuOpen(false); }} 
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-slate-300 transition-all hover:bg-[var(--accent-primary)] hover:text-white hover:scale-110 active:scale-100 ${isAttachMenuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                        style={{ transitionDelay: isAttachMenuOpen ? '150ms' : '0ms' }}
                        title="Attach an image"
                    >
                        <CameraIcon className="w-5 h-5" />
                    </button>
                    {!hasDocument && !isChatStarted && (
                        <button 
                            onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }} 
                            className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-slate-300 transition-all hover:bg-[var(--accent-primary)] hover:text-white hover:scale-110 active:scale-100 ${isAttachMenuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                            style={{ transitionDelay: isAttachMenuOpen ? '100ms' : '50ms' }}
                            title="Upload a document (.txt, .md)"
                        >
                            <PaperclipIcon className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-all hover:scale-110 active:scale-100 ${useWebSearch ? 'bg-[var(--accent-primary)] text-white' : 'bg-slate-600'} ${isAttachMenuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                        style={{ transitionDelay: isAttachMenuOpen ? '50ms' : '100ms' }}
                        title={useWebSearch ? 'Web search is ON' : 'Turn on web search'}
                    >
                        <GlobeIcon className="w-5 h-5" />
                    </button>
              </div>
              {/* Trigger Button */}
              <button
                  onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/80 text-slate-300 transition-all duration-300 hover:bg-slate-600 hover:text-white"
                  aria-label="Attach file or image"
              >
                  <PlusIcon className={`w-6 h-6 transition-transform duration-300 ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".txt,.md" className="hidden" />
          </div>
          
          <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Ask a question, or request study aids..."
                className="w-full bg-slate-700/50 text-slate-100 placeholder-slate-400 rounded-lg p-3 pr-4 resize-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none overflow-y-auto transition"
                rows={1}
                style={{maxHeight: '200px', minHeight: '44px'}}
              />
          </div>

          <button
              onClick={handleSend}
              disabled={(!prompt.trim() && !image) || isLoading}
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white transition-all duration-200 hover:bg-[var(--accent-primary-hover)] hover:scale-110 active:scale-100 disabled:scale-100 disabled:bg-slate-600 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
          </button>
        </div>
        {image && (
            <div className="mt-1 px-2 pb-1 animate-fadeIn">
                <div className="relative inline-block">
                    <img src={image} alt="Preview" className="h-20 w-auto rounded-md object-cover"/>
                    <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-slate-600 rounded-full p-0.5 text-white hover:bg-red-500 transition-colors">
                        <XIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InputPanel;