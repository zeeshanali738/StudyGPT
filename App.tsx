import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import { StudySession, Message, Flashcard, QuizItem, Slide } from './types';
import * as sessionService from './services/sessionService';
import * as geminiService from './services/geminiService';
import SessionPanel from './components/SessionPanel';
import HomePage from './components/HomePage';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import WorkspaceView from './components/WorkspaceView';
import SettingsPage from './components/SettingsPage';
import VoiceControlUI from './components/VoiceControlUI';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { MenuIcon, BrainCircuitIcon, SettingsIcon, CheckCircleIcon, XCircleIcon, InfoIcon, XIcon } from './components/icons/Icons';
import QuizView from './components/QuizView';
import FlashcardsView from './components/FlashcardsView';
import SlidesView from './components/SlidesView';

// --- Notification System ---
type NotificationType = 'success' | 'error' | 'info';
interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
}
interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: number) => void }> = ({ notification, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);
  
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(notification.id), 500);
      }, 5000);
  
      return () => clearTimeout(timer);
    }, [notification.id, onRemove]);
  
    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(notification.id), 500);
    };

    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
        error: <XCircleIcon className="w-6 h-6 text-red-400" />,
        info: <InfoIcon className="w-6 h-6 text-sky-400" />,
    };
  
    return (
      <div className={`w-full max-w-sm bg-slate-800 border border-slate-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}>
        <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
                {icons[notification.type]}
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-slate-100">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
            </div>
            </div>
        </div>
        <div className="flex border-l border-slate-700">
            <button onClick={handleRemove} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]">
                <XIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    );
};
  
const NotificationContainer: React.FC<{ notifications: Notification[]; onRemove: (id: number) => void }> = ({ notifications, onRemove }) => (
    <div className="fixed inset-0 flex items-end justify-end px-4 py-6 pointer-events-none sm:p-6 z-50">
      <div className="w-full max-w-sm space-y-4">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRemove={onRemove} />
        ))}
      </div>
    </div>
);
  
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
  
    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
      setNotifications((prev) => [...prev, { ...notification, id: Date.now() }]);
    }, []);
  
    const removeNotification = useCallback((id: number) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);
  
    return (
      <NotificationContext.Provider value={{ addNotification }}>
        {children}
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      </NotificationContext.Provider>
    );
};
  
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};

// Simple hex color manipulation for generating theme variants
const colorLuminance = (hex: string, lum: number): string => {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;
  
    let rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).substr(c.length);
    }
  
    return rgb;
};

const speechRecognitionLangMap: { [key: string]: string } = {
    en: 'en-US',
    ur: 'ur-PK',
    hi: 'hi-IN',
};

export type NavigationCommand = { command: 'next' | 'prev', timestamp: number };

const AppContent: React.FC = () => {
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [studyMode, setStudyMode] = useState<'chat' | 'flashcards' | 'quiz' | 'slides'>('chat');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const [studyProfile, setStudyProfile] = useState<string>('');
    const [view, setView] = useState<'chat' | 'settings'>('chat');
    const [theme, setTheme] = useState<string>('indigo');
    const [voiceURI, setVoiceURI] = useState<string>('');
    const [language, setLanguage] = useState<string>('en');
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [navigationCommand, setNavigationCommand] = useState<NavigationCommand | null>(null);
    const { addNotification } = useNotification();

    const activeSession = sessions.find(s => s.id === activeSessionId) || null;

    useEffect(() => {
        const loadedSessions = sessionService.loadSessions();
        setSessions(loadedSessions);
        setStudyProfile(sessionService.loadStudyProfile());
        setTheme(sessionService.loadTheme());
        setVoiceURI(sessionService.loadVoiceURI());
        setLanguage(sessionService.loadLanguage());
        
        if (loadedSessions.length > 0) {
            const latestSession = [...loadedSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
            setActiveSessionId(latestSession.id);
        } else {
            setActiveSessionId(null);
        }
    }, []);

    useEffect(() => {
        const themeConfig = {
            indigo: { primary: '#6366f1', hover: '#4f46e5', light: '#818cf8', gradientFrom: '#6366f1', gradientTo: '#8b5cf6' },
            emerald: { primary: '#10b981', hover: '#059669', light: '#34d399', gradientFrom: '#10b981', gradientTo: '#14b8a6' },
            rose: { primary: '#f43f5e', hover: '#e11d48', light: '#fb7185', gradientFrom: '#f43f5e', gradientTo: '#f97316' },
            sky: { primary: '#38bdf8', hover: '#0ea5e9', light: '#7dd3fc', gradientFrom: '#38bdf8', gradientTo: '#3b82f6' },
        };

        let colors;
        if ((themeConfig as any)[theme]) {
            colors = (themeConfig as any)[theme];
        } else if (theme.startsWith('#')) {
            // Custom color
            colors = {
                primary: theme,
                hover: colorLuminance(theme, -0.1),
                light: colorLuminance(theme, 0.2),
                gradientFrom: theme,
                gradientTo: colorLuminance(theme, 0.15)
            };
        } else {
            colors = themeConfig.indigo; // Fallback
        }

        const root = document.documentElement;
        root.style.setProperty('--accent-primary', colors.primary);
        root.style.setProperty('--accent-primary-hover', colors.hover);
        root.style.setProperty('--accent-primary-light', colors.light);
        root.style.setProperty('--accent-gradient-from', colors.gradientFrom);
        root.style.setProperty('--accent-gradient-to', colors.gradientTo);
    }, [theme]);

    useEffect(() => {
        sessionService.saveSessions(sessions);
    }, [sessions]);

    useEffect(() => {
        sessionService.saveStudyProfile(studyProfile);
    }, [studyProfile]);

    const updateActiveSession = useCallback((update: Partial<StudySession> | ((s: StudySession) => StudySession)) => {
        if (!activeSessionId) return;
        setSessions(prevSessions =>
            prevSessions.map(s => {
                if (s.id === activeSessionId) {
                    const updatedSession = typeof update === 'function' ? update(s) : { ...s, ...update };
                    return { ...updatedSession, updatedAt: Date.now() };
                }
                return s;
            })
        );
    }, [activeSessionId]);

    const handleSaveProfile = (newProfile: string) => {
        setStudyProfile(newProfile);
    };

    const handleSaveTheme = (newTheme: string) => {
        setTheme(newTheme);
        sessionService.saveTheme(newTheme);
    };
    
    const handleSaveVoice = (newVoiceURI: string) => {
        setVoiceURI(newVoiceURI);
        sessionService.saveVoiceURI(newVoiceURI);
    };

    const handleSaveLanguage = (newLanguage: string) => {
        setLanguage(newLanguage);
        sessionService.saveLanguage(newLanguage);
    }

    const processResponse = useCallback(async (prompt: string, image: string | null, sessionId: string, history: Message[], shouldUseWebSearch: boolean) => {
        const placeholderMessage: Message = { role: 'assistant', content: '', sources: [], timestamp: Date.now() };
        setSessions(prevSessions =>
            prevSessions.map(s => (s.id === sessionId ? { ...s, messages: [...s.messages, placeholderMessage] } : s))
        );

        try {
            const onChunk = (chunkText: string) => {
                setSessions(prevSessions =>
                    prevSessions.map(s => {
                        if (s.id === sessionId) {
                            const lastMessage = s.messages[s.messages.length - 1];
                            if (lastMessage.role === 'assistant') {
                               const updatedMessage = { ...lastMessage, content: lastMessage.content + chunkText };
                               return { ...s, messages: [...s.messages.slice(0, -1), updatedMessage] };
                            }
                        }
                        return s;
                    })
                );
            };

            const { fullText, sources } = await geminiService.getChatResponse(prompt, history, shouldUseWebSearch, onChunk, studyProfile, image, language);
            let finalText = fullText;
            let newFlashcards: Flashcard[] = [];
            let newQuizItems: QuizItem[] = [];
            let newSlides: Slide[] = [];
            let studyAidTitle = '';

            const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);

            if (jsonMatch && jsonMatch[1]) {
                try {
                    const parsedJson = JSON.parse(jsonMatch[1]);
                    let studyAidGenerated = false;
                    studyAidTitle = parsedJson.title || '';

                    if (parsedJson.quiz && Array.isArray(parsedJson.quiz) && parsedJson.quiz.length > 0) {
                        newQuizItems = parsedJson.quiz;
                        setStudyMode('quiz');
                        studyAidGenerated = true;
                    }
                    if (parsedJson.flashcards && Array.isArray(parsedJson.flashcards) && parsedJson.flashcards.length > 0) {
                        newFlashcards = parsedJson.flashcards;
                        setStudyMode('flashcards');
                        studyAidGenerated = true;
                    }
                    if (parsedJson.slides && Array.isArray(parsedJson.slides) && parsedJson.slides.length > 0) {
                        newSlides = parsedJson.slides;
                        setStudyMode('slides');
                        studyAidGenerated = true;
                    }

                    if (studyAidGenerated) {
                        finalText = fullText.replace(jsonMatch[0], '').trim();
                        if (!finalText) {
                           finalText = `I've created the "${studyAidTitle}" for you.`;
                        }
                    }
                } catch (e) { console.error("Failed to parse JSON from response", e); }
            }
            
            setSessions(prevSessions => 
                prevSessions.map(s => {
                    if (s.id === sessionId) {
                        const lastMessage = s.messages[s.messages.length - 1];
                        return {
                            ...s,
                            messages: [...s.messages.slice(0, -1), { ...lastMessage, content: finalText, sources }],
                            flashcards: newFlashcards.length > 0 ? newFlashcards : s.flashcards,
                            flashcardsTitle: newFlashcards.length > 0 ? studyAidTitle : s.flashcardsTitle,
                            quizItems: newQuizItems.length > 0 ? newQuizItems : s.quizItems,
                            quizTitle: newQuizItems.length > 0 ? studyAidTitle : s.quizTitle,
                            slides: newSlides.length > 0 ? newSlides : s.slides,
                            slidesTitle: newSlides.length > 0 ? studyAidTitle : s.slidesTitle,
                            updatedAt: Date.now()
                        };
                    }
                    return s;
                })
            );
        } catch (error) {
            const content = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.";
            addNotification({ title: 'Error', message: content, type: 'error' });
            setSessions(prevSessions => 
                prevSessions.map(s => s.id === sessionId ? { ...s, messages: [...s.messages.slice(0, -1), { role: 'assistant', content, timestamp: Date.now() }] } : s)
            );
        } finally {
            setIsLoading(false);
        }
    }, [studyProfile, language, addNotification]);

    const handleSendMessage = useCallback(async (prompt: string, image: string | null = null) => {
        if (!prompt.trim() && !image) return;

        const realTimeKeywords = ['latest', 'recent', 'current', 'today', 'who is', 'what is', 'news', 'trending', new Date().getFullYear().toString()];
        const isFactualQuestion = realTimeKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
        const finalUseWebSearch = !useWebSearch && isFactualQuestion ? true : useWebSearch;
        if (finalUseWebSearch) setUseWebSearch(true);

        let currentSessionId = activeSessionId;
        let history: Message[] = [];
        
        const titleContent = image ? (prompt || 'Image Analysis') : prompt;

        if (!currentSessionId) {
            const newSession = sessionService.createNewSession();
            newSession.title = titleContent.length > 40 ? titleContent.substring(0, 40) + '...' : titleContent;
            currentSessionId = newSession.id;
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
        }
        
        const userMessage: Message = { role: 'user', content: prompt, image: image ?? undefined, timestamp: Date.now(), useWebSearch: finalUseWebSearch };
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                history = s.messages;
                const isFirstMessage = s.messages.length === 0;
                return {
                    ...s,
                    messages: [...s.messages, userMessage],
                    title: isFirstMessage ? (titleContent.length > 40 ? titleContent.substring(0, 40) + '...' : titleContent) : s.title,
                };
            }
            return s;
        }));

        setIsLoading(true);
        setStudyMode('chat');
        await processResponse(prompt, image, currentSessionId, history, finalUseWebSearch);

    }, [activeSessionId, processResponse, useWebSearch, language]);

    const handleNewSession = useCallback(() => {
        const newSession = sessionService.createNewSession();
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setStudyMode('chat');
        setUseWebSearch(false);
        setView('chat');
    }, []);
    
    const handleLoadSession = useCallback((sessionId: string) => {
        setActiveSessionId(sessionId);
        setStudyMode('chat');
        setView('chat');
    }, []);

    const handleDeleteSession = useCallback((sessionId: string) => {
        setSessions(prev => {
            const remaining = prev.filter(s => s.id !== sessionId);
            if (activeSessionId === sessionId) {
                const latestSession = [...remaining].sort((a,b) => b.updatedAt - a.updatedAt)[0];
                setActiveSessionId(latestSession ? latestSession.id : null);
            }
            return remaining;
        });
    }, [activeSessionId]);

    const handleFileUpload = useCallback(async (documentText: string, fileName: string) => {
        const newSession = sessionService.createNewSession();
        newSession.title = fileName;
        newSession.documentContext = documentText;
        newSession.documentSummary = "Generating summary...";
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setView('chat');
        
        try {
            const summary = await geminiService.summarizeDocument(documentText, studyProfile, language);
             setSessions(prev => prev.map(s => s.id === newSession.id ? {...s, documentSummary: summary} : s));
             addNotification({ title: 'Summary Ready!', message: `The summary for "${fileName}" is now available.`, type: 'success' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setSessions(prev => prev.map(s => s.id === newSession.id ? {...s, documentSummary: errorMessage} : s));
            addNotification({ title: 'Summarization Failed', message: errorMessage, type: 'error' });
        }
    }, [studyProfile, language, addNotification]);

    const handleExplainMessage = useCallback(async (content: string) => {
        if (!activeSession) return;
        const history = activeSession.messages;
        const prompt = `Please explain this in simpler terms:\n\n---\n\n${content}`;
        const userMessage: Message = { role: 'user', content: prompt, timestamp: Date.now() };
        updateActiveSession(s => ({ ...s, messages: [...s.messages, userMessage] }));
        setIsLoading(true);
        await processResponse(prompt, null, activeSession.id, history, false);
    }, [activeSession, processResponse, updateActiveSession]);
    
    const handleDeleteMessage = useCallback((messageIndex: number) => {
        if (!activeSession) return;
        updateActiveSession(s => ({ ...s, messages: s.messages.slice(0, messageIndex) }));
    }, [activeSession, updateActiveSession]);
    
    const stopSpeech = useCallback(() => {
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        setSpeakingIndex(null);
    }, []);

    const handleToggleSpeak = useCallback((text: string, index: number) => {
        if (speakingIndex === index) {
            stopSpeech();
        } else {
            stopSpeech();
            const utterance = new SpeechSynthesisUtterance(text);
            // Explicitly set the language for the utterance
            utterance.lang = speechRecognitionLangMap[language] || 'en-US';

            const voices = window.speechSynthesis.getVoices();
            if (voiceURI) {
                const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
                if (selectedVoice) utterance.voice = selectedVoice;
            } else {
                // If no voice is selected, let the browser pick the best voice for the specified lang
                const matchingVoices = voices.filter(v => v.lang.startsWith(language));
                if (matchingVoices.length > 0) {
                    utterance.voice = matchingVoices.find(v => v.default) || matchingVoices[0];
                }
            }
            utterance.onend = () => setSpeakingIndex(null);
            utterance.onerror = (e) => { console.error('Speech synthesis error:', e.error); setSpeakingIndex(null); };
            window.speechSynthesis.speak(utterance);
            setSpeakingIndex(index);
        }
    }, [speakingIndex, voiceURI, stopSpeech, language]);

    useEffect(() => () => stopSpeech(), [stopSpeech]); // Cleanup on unmount


    const voiceCommands = useMemo(() => ({
        'new session': handleNewSession,
        'start new chat': handleNewSession,
        'start over': handleNewSession,
        'show flashcards': () => { if (activeSession?.flashcards?.length) setStudyMode('flashcards') },
        'open quiz': () => { if (activeSession?.quizItems?.length) setStudyMode('quiz') },
        'view slides': () => { if (activeSession?.slides?.length) setStudyMode('slides') },
        'show presentation': () => { if (activeSession?.slides?.length) setStudyMode('slides') },
        'go to chat': () => setStudyMode('chat'),
        'next': () => setNavigationCommand({ command: 'next', timestamp: Date.now() }),
        'next card': () => setNavigationCommand({ command: 'next', timestamp: Date.now() }),
        'next slide': () => setNavigationCommand({ command: 'next', timestamp: Date.now() }),
        'previous': () => setNavigationCommand({ command: 'prev', timestamp: Date.now() }),
        'previous card': () => setNavigationCommand({ command: 'prev', timestamp: Date.now() }),
        'previous slide': () => setNavigationCommand({ command: 'prev', timestamp: Date.now() }),
    }), [handleNewSession, activeSession]);

    const dynamicVoiceCommands = useMemo(() => ([
        {
            keywords: ['ask', 'say', 'tell me', 'search for', 'what is', 'who is', 'explain'],
            action: (prompt: string) => handleSendMessage(prompt)
        }
    ]), [handleSendMessage]);

    const { isListening, transcript, startListening, stopListening } = useVoiceCommands(voiceCommands, dynamicVoiceCommands, speechRecognitionLangMap[language] || 'en-US');

    const lastAssistantMessageInfo = useMemo(() => {
        if (!activeSession || activeSession.messages.length === 0) return null;
        const lastIndex = activeSession.messages.map(m => m.role).lastIndexOf('assistant');
        if (lastIndex === -1) return null;
        return {
            content: activeSession.messages[lastIndex].content,
            index: lastIndex
        }
    }, [activeSession?.messages]);


    const renderMainContent = () => {
        if (view === 'settings') {
            return (
                <SettingsPage 
                    initialProfile={studyProfile}
                    currentTheme={theme}
                    currentVoiceURI={voiceURI}
                    currentLanguage={language}
                    onSaveProfile={handleSaveProfile}
                    onSaveTheme={handleSaveTheme}
                    onSaveVoice={handleSaveVoice}
                    onSaveLanguage={handleSaveLanguage}
                    onBack={() => setView('chat')}
                />
            );
        }

        if (!activeSession) {
            return (
                <div className="flex-1 flex flex-col items-center overflow-hidden">
                    <main className="w-full h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            <HomePage onSendExample={handleSendMessage} />
                        </div>
                        <div className="w-full max-w-3xl mx-auto p-4 pt-0">
                           <InputPanel onSend={handleSendMessage} onFileUpload={handleFileUpload} isLoading={isLoading} setStudyMode={setStudyMode} studyMode={'chat'} hasFlashcards={false} hasQuizItems={false} hasSlides={false} hasDocument={false} isChatStarted={false} useWebSearch={useWebSearch} setUseWebSearch={setUseWebSearch} lastAssistantMessageInfo={null} onListenToLast={() => {}}/>
                        </div>
                    </main>
                </div>
            );
        }

        if (activeSession.documentContext) {
            return <WorkspaceView session={activeSession} studyMode={studyMode} onSendMessage={handleSendMessage} isLoading={isLoading} onExplainMessage={handleExplainMessage} onDeleteMessage={handleDeleteMessage} useWebSearch={useWebSearch} setUseWebSearch={setUseWebSearch} setStudyMode={setStudyMode} speakingIndex={speakingIndex} onToggleSpeak={handleToggleSpeak} navigationCommand={navigationCommand} />;
        }
        
        // Split-screen view for study aids
        if (studyMode !== 'chat' && activeSession.messages.length > 0) {
            return (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
                    {/* Left Panel: Chat */}
                    <div className="flex flex-col bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden h-full">
                        <main className="w-full h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto w-full">
                                <OutputPanel 
                                    messages={activeSession.messages} 
                                    isLoading={isLoading} 
                                    onExplainMessage={handleExplainMessage} 
                                    onDeleteMessage={handleDeleteMessage} 
                                    speakingIndex={speakingIndex} 
                                    onToggleSpeak={handleToggleSpeak} 
                                />
                            </div>
                            <div className="p-4 pt-0">
                               <InputPanel 
                                    onSend={handleSendMessage} 
                                    onFileUpload={handleFileUpload} 
                                    isLoading={isLoading} 
                                    setStudyMode={setStudyMode} 
                                    studyMode={studyMode} 
                                    hasFlashcards={activeSession.flashcards.length > 0} 
                                    hasQuizItems={activeSession.quizItems.length > 0} 
                                    hasSlides={activeSession.slides.length > 0} 
                                    hasDocument={!!activeSession.documentContext} 
                                    isChatStarted={activeSession.messages.length > 0} 
                                    useWebSearch={useWebSearch} 
                                    setUseWebSearch={setUseWebSearch} 
                                    lastAssistantMessageInfo={lastAssistantMessageInfo} 
                                    onListenToLast={() => lastAssistantMessageInfo && handleToggleSpeak(lastAssistantMessageInfo.content, lastAssistantMessageInfo.index)} 
                                />
                            </div>
                        </main>
                    </div>
    
                    {/* Right Panel: Study Aid */}
                    <div className="flex flex-col bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden h-full">
                        <div className="p-2 md:p-4 h-full flex items-center justify-center overflow-y-auto">
                            {studyMode === 'quiz' && (
                                <QuizView quizItems={activeSession.quizItems} title={activeSession.quizTitle} />
                            )}
                            {studyMode === 'flashcards' && (
                                <FlashcardsView flashcards={activeSession.flashcards} title={activeSession.flashcardsTitle} navigationCommand={navigationCommand} />
                            )}
                            {studyMode === 'slides' && (
                                <SlidesView slides={activeSession.slides} title={activeSession.slidesTitle} navigationCommand={navigationCommand}/>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Default single-column chat view
        return (
            <div className="flex-1 flex flex-col items-center overflow-hidden">
                <main className="w-full h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto w-full">
                        <div className="max-w-3xl mx-auto h-full">
                            {activeSession.messages.length > 0 ? (
                                <OutputPanel messages={activeSession.messages} isLoading={isLoading} onExplainMessage={handleExplainMessage} onDeleteMessage={handleDeleteMessage} speakingIndex={speakingIndex} onToggleSpeak={handleToggleSpeak} />
                            ) : (
                                <HomePage onSendExample={handleSendMessage} />
                            )}
                        </div>
                    </div>
                    <div className="w-full max-w-3xl mx-auto p-4 pt-0">
                       <InputPanel onSend={handleSendMessage} onFileUpload={handleFileUpload} isLoading={isLoading} setStudyMode={setStudyMode} studyMode={studyMode} hasFlashcards={activeSession.flashcards.length > 0} hasQuizItems={activeSession.quizItems.length > 0} hasSlides={activeSession.slides.length > 0} hasDocument={!!activeSession.documentContext} isChatStarted={activeSession.messages.length > 0} useWebSearch={useWebSearch} setUseWebSearch={setUseWebSearch} lastAssistantMessageInfo={lastAssistantMessageInfo} onListenToLast={() => lastAssistantMessageInfo && handleToggleSpeak(lastAssistantMessageInfo.content, lastAssistantMessageInfo.index)} />
                    </div>
                </main>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-300">
            <SessionPanel isOpen={isSidePanelOpen} sessions={sessions} activeSessionId={activeSessionId} onNewSession={handleNewSession} onLoadSession={handleLoadSession} onDeleteSession={handleDeleteSession} />
            <div className="flex-1 flex flex-col relative">
                <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm z-20">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-100">
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="flex items-center ml-2 cursor-pointer" onClick={() => { setActiveSessionId(null); setView('chat'); }}>
                             <BrainCircuitIcon className="w-6 h-6 text-[var(--accent-primary)] mr-2"/>
                            <h1 className="text-lg font-semibold text-slate-100">StudyGPT</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <VoiceControlUI isListening={isListening} transcript={transcript} startListening={startListening} stopListening={stopListening} />
                        <button onClick={() => setView('settings')} className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-100" title="Settings">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                    </div>
                </header>
                {renderMainContent()}
            </div>
        </div>
    );
};

const App: React.FC = () => (
    <NotificationProvider>
        <AppContent />
    </NotificationProvider>
);

export default App;