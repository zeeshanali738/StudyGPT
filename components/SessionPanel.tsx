import React, { useState } from 'react';
import { StudySession } from '../types';
import { MessageSquarePlusIcon, TrashIcon, SearchIcon } from './icons/Icons';

interface SessionPanelProps {
  isOpen: boolean;
  sessions: StudySession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const SessionPanel: React.FC<SessionPanelProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onNewSession,
  onLoadSession,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent onLoadSession from firing
    onDeleteSession(sessionId);
  };
  
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const sortedSessions = [...filteredSessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="w-64 bg-slate-900/70 backdrop-blur-sm flex flex-col p-2 border-r border-slate-700 transition-all duration-300 animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300 px-2">History</h2>
        <button
          onClick={onNewSession}
          className="p-2 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100"
          aria-label="New study session"
        >
          <MessageSquarePlusIcon className="w-5 h-5" />
        </button>
      </div>
       <div className="relative mb-2 px-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 focus:border-[var(--accent-primary)] rounded-md py-1.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-400 focus:ring-0 focus:outline-none"
        />
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {sortedSessions.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => onLoadSession(session.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-[var(--accent-primary)] text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span className="truncate pr-2">{session.title}</span>
                <TrashIcon 
                    onClick={(e) => handleDelete(e, session.id)} 
                    className={`w-4 h-4 flex-shrink-0 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ${session.id === activeSessionId ? 'text-indigo-200 hover:text-white' : ''}`}
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default SessionPanel;