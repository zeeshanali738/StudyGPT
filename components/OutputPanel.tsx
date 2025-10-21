import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Message, Source } from '../types';
import { UserIcon, BrainCircuitIcon, SparklesIcon, TrashIcon, CopyIcon, GlobeIcon, Volume2Icon, StopCircleIcon, CheckCircleIcon } from './icons/Icons';
import Loader from './Loader';

// A simple markdown-to-HTML renderer that handles paragraphs, lists, bold, and code blocks.
const formatContent = (text: string): string => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
        if (index % 2 === 1) { // It's a code block
            const match = part.match(/```(.*?)\n([\s\S]*?)```/);
            if (match) {
                const [, , code] = match;
                const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<pre class="bg-slate-900 rounded-md p-4 text-sm font-mono overflow-x-auto my-4"><code>${escapedCode.trim()}</code></pre>`;
            }
        }
        
        // It's regular text
        let html = part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>');

        html = html.replace(/(<\/li>\s*<li>)/g, '</li><li>');
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

        return html.split(/\n\n+/).filter(p => p.trim()).map(p => {
            if (p.startsWith('<ul>') || p.startsWith('<pre>')) return p;
            return `<p>${p.replace(/\n/g, '<br />')}</p>`;
        }).join('');

    }).join('');
};

interface MessageItemProps {
  message: Message;
  messageIndex: number;
  onExplainMessage: (text: string) => void;
  onDeleteMessage: (messageIndex: number) => void;
  isSpeaking: boolean;
  onToggleSpeak: (text: string, index: number) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, messageIndex, onExplainMessage, onDeleteMessage, isSpeaking, onToggleSpeak }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { role, content, image, sources } = message;
  const isAssistant = role === 'assistant';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [content]);

  const handleSpeak = () => onToggleSpeak(content, messageIndex);
  
  const icon = isAssistant ? <BrainCircuitIcon className="w-6 h-6 text-[var(--accent-primary)]"/> : <UserIcon className="w-6 h-6 text-slate-400"/>;
  const containerClass = isAssistant ? "bg-slate-800/40" : "";
  const actionButtonClass = "p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors";

  if (isAssistant && content === '') {
    return (
        <div className="p-4 md:p-6 flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mt-1">{icon}</div>
            <div className="flex items-center gap-2">
                <Loader className="w-5 h-5"/>
                <span className="text-slate-400 text-sm">Thinking...</span>
            </div>
        </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 flex gap-4 ${containerClass}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-invert prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
        
        {image && <img src={image} alt="User upload" className="mt-4 max-w-xs rounded-lg border border-slate-700" />}

        {sources && sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <GlobeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Web Sources</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sources.map((source, index) => {
                        let hostname = 'unknown';
                        try {
                            hostname = new URL(source.uri).hostname;
                        } catch (e) {
                            console.error("Invalid source URI:", source.uri);
                        }
                        return (
                            <a 
                                key={index} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-slate-300 bg-slate-700/50 hover:bg-slate-700 p-3 rounded-lg group transition-colors flex items-start gap-3" 
                                title={source.title}
                            >
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 group-hover:bg-[var(--accent-primary)] text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                                    <span className="text-[10px] font-bold">{index + 1}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{source.title || hostname}</p>
                                    <p className="text-slate-400 truncate">{hostname}</p>
                                    {source.content && (
                                        <p className="text-slate-400 mt-2 text-xs italic">
                                            "{source.content.substring(0, 120)}{source.content.length > 120 ? '...' : ''}"
                                        </p>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        )}

        {isAssistant && content && (
          <div className="flex items-center gap-1 mt-4">
            <button onClick={handleCopy} className={actionButtonClass} title="Copy">{isCopied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <CopyIcon className="w-4 h-4" />}</button>
            <button onClick={() => onExplainMessage(content)} className={actionButtonClass} title="Explain simpler"><SparklesIcon className="w-4 h-4" /></button>
            <button onClick={handleSpeak} className={actionButtonClass} title={isSpeaking ? "Stop speaking" : "Read aloud"}>{isSpeaking ? <StopCircleIcon className="w-4 h-4 text-[var(--accent-primary)]"/> : <Volume2Icon className="w-4 h-4" />}</button>
            <div className="flex-grow"></div>
            <button onClick={() => onDeleteMessage(messageIndex)} className={actionButtonClass} title="Delete from this point"><TrashIcon className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

interface OutputPanelProps {
  messages: Message[];
  isLoading: boolean;
  onExplainMessage: (text: string) => void;
  onDeleteMessage: (messageIndex: number) => void;
  speakingIndex: number | null;
  onToggleSpeak: (text: string, index: number) => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ messages, isLoading, onExplainMessage, onDeleteMessage, speakingIndex, onToggleSpeak }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);
    
    return (
        <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                {messages.map((msg, index) => (
                    <MessageItem key={`${msg.timestamp}-${index}`} message={msg} messageIndex={index} onExplainMessage={onExplainMessage} onDeleteMessage={onDeleteMessage} isSpeaking={speakingIndex === index} onToggleSpeak={onToggleSpeak}/>
                ))}
            </div>
        </div>
    );
};

export default OutputPanel;