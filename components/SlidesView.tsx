import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Slide } from '../types';
import { NavigationCommand } from '../App';
import { ArrowLeftIcon, ArrowRightIcon, MaximizeIcon, MinimizeIcon } from './icons/Icons';

interface SlidesViewProps {
  slides: Slide[];
  title?: string;
  navigationCommand: NavigationCommand | null;
}

const SlideItem: React.FC<{ slide: Slide, slideNumber: number, totalSlides: number }> = ({ slide, slideNumber, totalSlides }) => {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] p-4 shadow-md flex-shrink-0">
           <h2 className="text-2xl lg:text-3xl font-bold text-white text-center animate-fadeInDown" style={{ animationDelay: '0.1s' }}>
              {slide.title}
            </h2>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 min-h-0">
            <ul className="space-y-3">
                {slide.content.map((point, index) => (
                  <li 
                    key={index} 
                    className="flex items-start text-base lg:text-lg animate-fadeInUpStagger"
                    style={{ animationDelay: `${0.2 + index * 0.1}s`}}
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-primary-light)] flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>
                    <span>{point}</span>
                  </li>
                ))}
            </ul>
        </div>

        {/* Footer */}
        <div className="p-3 text-right text-xs font-medium text-slate-400 border-t border-slate-200 flex-shrink-0">
            {slideNumber} / {totalSlides}
        </div>
      </div>
    );
};


const SlidesView: React.FC<SlidesViewProps> = ({ slides, title, navigationCommand }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('animate-slideInFromRight');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const slidesContainerRef = useRef<HTMLDivElement>(null);
  
  const handleNavigation = useCallback((direction: 'next' | 'prev') => {
    setAnimationClass('animate-slideOutToLeft');
    
    setTimeout(() => {
      let nextIndex;
      if (direction === 'next') {
        nextIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
      } else {
        nextIndex = currentIndex === 0 ? slides.length - 1 : currentIndex + 1;
      }
      setCurrentIndex(nextIndex);
      setAnimationClass('animate-slideInFromRight');
    }, 500); // Match animation duration
  }, [currentIndex, slides.length]);

  const goToPrevious = useCallback(() => handleNavigation('prev'), [handleNavigation]);
  const goToNext = useCallback(() => handleNavigation('next'), [handleNavigation]);

  useEffect(() => {
    if (navigationCommand) {
      if (navigationCommand.command === 'next') {
        goToNext();
      } else if (navigationCommand.command === 'prev') {
        goToPrevious();
      }
    }
  }, [navigationCommand, goToNext, goToPrevious]);
  
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  const toggleFullscreen = () => {
    if (!slidesContainerRef.current) return;
    if (!document.fullscreenElement) {
        slidesContainerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goToPrevious();
      else if (event.key === 'ArrowRight') goToNext();
      else if (event.key === 'f') {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [goToPrevious, goToNext, handleFullscreenChange]);


  if (!slides || slides.length === 0) {
    return <div className="flex items-center justify-center h-full"><p className="text-center text-slate-400">No slides available. Ask me to create a presentation!</p></div>;
  }
  
  const currentSlide = slides[currentIndex];

  return (
    <div ref={slidesContainerRef} className={`flex flex-col h-full transition-colors ${isFullscreen ? 'bg-slate-900 p-8' : 'p-4'}`}>
      {!isFullscreen && <h3 className="text-2xl font-bold text-white mb-6 text-center">{title || 'Presentation'}</h3>}
      
      <div className="relative flex-1 w-full min-h-0 mx-auto flex items-center justify-center">
         <div 
            key={currentIndex} 
            className={`w-full h-full flex items-center justify-center ${animationClass}`}
          >
           <div className="w-full max-h-full aspect-[16/9]">
              <SlideItem slide={currentSlide} slideNumber={currentIndex + 1} totalSlides={slides.length} />
           </div>
         </div>
      </div>

      <div className={`flex items-center justify-between pt-6 max-w-4xl mx-auto w-full ${isFullscreen ? 'text-white' : 'text-slate-300'}`}>
        <button onClick={goToPrevious} className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors" aria-label="Previous slide">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
                Slide {currentIndex + 1} of {slides.length}
            </span>
        </div>

        <div className="flex items-center gap-2">
            <button onClick={toggleFullscreen} className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors" aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
               {isFullscreen ? <MinimizeIcon className="w-5 h-5"/> : <MaximizeIcon className="w-5 h-5"/>}
            </button>
            <button onClick={goToNext} className="p-3 rounded-full bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors" aria-label="Next slide">
              <ArrowRightIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

       {!isFullscreen && (
            <p className="text-center text-xs text-slate-500 mt-4">
                Tip: Use arrow keys to navigate. Press 'F' to go full screen.
            </p>
       )}
    </div>
  );
};

export default SlidesView;
