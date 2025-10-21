import React, { useState } from 'react';
import { StudySession } from '../types';
import { NavigationCommand } from '../App';
import InputPanel from './InputPanel';
import OutputPanel from './OutputPanel';
import SummaryView from './SummaryView';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import SlidesView from './SlidesView';
import { FileTextIcon, ZapIcon } from './icons/Icons';

interface WorkspaceViewProps {
  session: StudySession;
  studyMode: 'chat' | 'flashcards' | 'quiz' | 'slides';
  onSendMessage: (text: string, image?: string | null) => void;
  isLoading: boolean;
  onExplainMessage: (text: string) => void;
  onDeleteMessage: (messageIndex: number) => void;
  useWebSearch: boolean;
  setUseWebSearch: (value: boolean) => void;
  setStudyMode: (mode: 'chat' | 'flashcards' | 'quiz' | 'slides') => void;
  speakingIndex: number | null;
  onToggleSpeak: (text: string, index: number) => void;
  navigationCommand: NavigationCommand | null;
}

const WorkspaceView: React.FC<WorkspaceViewProps> = ({ session, studyMode, onSendMessage, isLoading, onExplainMessage, onDeleteMessage, useWebSearch, setUseWebSearch, setStudyMode, speakingIndex, onToggleSpeak, navigationCommand }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'document'>('summary');
  
  const renderRightPane = () => {
    switch(studyMode) {
      case 'flashcards':
        return (
            <div className="flex-1 flex flex-col justify-center p-4">
                 <FlashcardsView flashcards={session.flashcards} navigationCommand={navigationCommand} />
            </div>
        );
      case 'quiz':
         return (
            <div className="flex-1 flex flex-col justify-center p-4">
                 <QuizView quizItems={session.quizItems} />
            </div>
        );
      case 'slides':
        return (
           <div className="flex-1 flex flex-col justify-center p-2 md:p-4">
                <SlidesView slides={session.slides} navigationCommand={navigationCommand}/>
           </div>
       );
      case 'chat':
      default:
        const lastAssistantMessageInfo = (() => {
            const lastIndex = session.messages.map(m => m.role).lastIndexOf('assistant');
            if (lastIndex === -1) return null;
            return {
                content: session.messages[lastIndex].content,
                index: lastIndex
            }
        })();

        return (
            <div className="flex flex-col h-full p-4">
                <div className="flex-1 overflow-y-auto mb-4 pr-2 flex flex-col">
                    <OutputPanel messages={session.messages} isLoading={isLoading} onExplainMessage={onExplainMessage} onDeleteMessage={onDeleteMessage} speakingIndex={speakingIndex} onToggleSpeak={onToggleSpeak} />
                </div>
                <div className="mt-auto">
                <InputPanel
                    onSend={onSendMessage}
                    onFileUpload={() => {}}
                    setStudyMode={setStudyMode}
                    studyMode={studyMode}
                    hasFlashcards={session.flashcards.length > 0}
                    hasQuizItems={session.quizItems.length > 0}
                    hasSlides={session.slides.length > 0}
                    hasDocument={true}
                    isLoading={isLoading}
                    isChatStarted={true}
                    useWebSearch={useWebSearch}
                    setUseWebSearch={setUseWebSearch}
                    lastAssistantMessageInfo={lastAssistantMessageInfo}
                    onListenToLast={() => lastAssistantMessageInfo && onToggleSpeak(lastAssistantMessageInfo.content, lastAssistantMessageInfo.index)}
                    />
                </div>
            </div>
        );
    }
  }

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
      <div className="flex flex-col bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex-shrink-0 flex items-center border-b border-slate-700 px-2">
          <TabButton
            icon={<ZapIcon className="w-4 h-4 mr-2" />}
            label="Summary"
            isActive={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
          />
          <TabButton
            icon={<FileTextIcon className="w-4 h-4 mr-2" />}
            label="Document"
            isActive={activeTab === 'document'}
            onClick={() => setActiveTab('document')}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' && (
            <SummaryView summary={session.documentSummary} />
          )}
          {activeTab === 'document' && (
            <div className="whitespace-pre-wrap text-sm text-slate-300 prose prose-invert prose-sm max-w-none">
                {session.documentContext}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden bg-slate-800 rounded-lg border border-slate-700">
        {renderRightPane()}
      </div>
    </div>
  );
};

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick}) => (
    <button 
        onClick={onClick}
        className={`flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
            isActive 
            ? 'border-[var(--accent-primary)] text-[var(--accent-primary-light)]' 
            : 'border-transparent text-slate-400 hover:text-white'
        }`}
    >
        {icon}
        {label}
    </button>
)

export default WorkspaceView;