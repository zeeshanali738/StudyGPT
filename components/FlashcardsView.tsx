import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';
import { NavigationCommand } from '../App';
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from './icons/Icons';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  title?: string;
  navigationCommand: NavigationCommand | null;
}

const FlashcardItem: React.FC<{ card: Flashcard }> = ({ card }) => {
    const [isFlipped, setIsFlipped] = useState(false);
  
    useEffect(() => {
      setIsFlipped(false);
    }, [card]);

    return (
      <div 
        className="w-full h-80 perspective-1000 group cursor-pointer" 
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full card-flip-inner transition-all duration-700 ease-in-out group-hover:shadow-2xl group-hover:shadow-[var(--accent-primary)]/20 ${isFlipped ? 'flipped' : ''}`}>
          {/* Front of card */}
          <div className="card-front absolute w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl shadow-lg flex items-center justify-center p-6 text-center border border-slate-700">
            <p className="text-xl font-medium text-slate-100 group-hover:scale-105 transition-transform">{card.question}</p>
          </div>
          {/* Back of card */}
           <div className="card-back absolute w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl shadow-lg flex flex-col justify-center p-6 text-center border border-slate-700 overflow-y-auto">
             <div className="flex-grow flex items-center justify-center">
                <p className="text-xl font-semibold text-white">{card.answer}</p>
              </div>
              {card.context && (
                <div className="mt-4 pt-4 border-t border-slate-600/50 w-full text-left bg-black/20 p-3 rounded-md">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Context</h4>
                  <p className="text-sm text-slate-300 italic">"{card.context}"</p>
                </div>
              )}
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <RefreshCwIcon className="w-3 h-3 mr-1" />
          Click to flip
        </div>
      </div>
    );
};

const FlashcardsView: React.FC<FlashcardsViewProps> = ({ flashcards, title, navigationCommand }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? flashcards.length - 1 : prevIndex - 1));
  }, [flashcards.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === flashcards.length - 1 ? 0 : prevIndex + 1));
  }, [flashcards.length]);

  useEffect(() => {
    if (navigationCommand) {
      if (navigationCommand.command === 'next') {
        goToNext();
      } else if (navigationCommand.command === 'prev') {
        goToPrevious();
      }
    }
  }, [navigationCommand, goToNext, goToPrevious]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPrevious, goToNext]);


  if (!flashcards || flashcards.length === 0) {
    return <p className="text-center text-slate-400">No flashcards available. Ask me to create some!</p>;
  }

  return (
    <div className="animate-fadeIn w-full max-w-xl">
      <h3 className="text-2xl font-bold text-white mb-6 text-center">{title || 'Flashcards'}</h3>
      <div className="relative">
        <div key={currentIndex} className="animate-fadeIn">
          <FlashcardItem card={flashcards[currentIndex]} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-6">
        <button onClick={goToPrevious} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors" aria-label="Previous card">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-slate-300">
          {currentIndex + 1} / {flashcards.length}
        </span>
        <button onClick={goToNext} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors" aria-label="Next card">
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
      <p className="text-center text-xs text-slate-500 mt-4">
        Tip: Use your left and right arrow keys to navigate
      </p>
    </div>
  );
};

export default FlashcardsView;
