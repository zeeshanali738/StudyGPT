import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { QuizItem } from '../types';
import { CheckSquareIcon, XCircleIcon, ArrowRightIcon, ArrowLeftIcon, ClockIcon } from './icons/Icons';

interface QuizViewProps {
  quizItems: QuizItem[];
  title?: string;
}

// New CircularProgress component for results
const CircularProgress: React.FC<{ percentage: number, size?: number, strokeWidth?: number }> = ({ percentage, size = 120, strokeWidth = 10 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
                className="progress-ring-bg"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
            <circle
                className="progress-ring-fg"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                }}
            />
             <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dy=".3em"
                className="text-2xl font-bold fill-current text-white"
            >
                {`${percentage}%`}
            </text>
        </svg>
    );
};

const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const formatTotalTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) {
        return "No time limit. Take your time!";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (minutes > 0) {
        parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (remainingSeconds > 0) {
        parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) return "No time limit."

    return `Total time: ${parts.join(' ')}.`;
};


const QuizView: React.FC<QuizViewProps> = ({ quizItems, title }) => {
  const [quizState, setQuizState] = useState<'not-started' | 'in-progress' | 'finished'>('not-started');
  const [timerSetting, setTimerSetting] = useState<number | null>(quizItems.length * 30);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [animationClass, setAnimationClass] = useState('animate-fadeInScaleUp');
  
  const currentItem = quizItems[currentIndex];

  useEffect(() => {
    if (quizState === 'in-progress' && timeLeft !== null && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? Math.max(0, prev - 1) : 0));
      }, 1000);

      return () => clearInterval(timerId);
    } else if (quizState === 'in-progress' && timeLeft === 0) {
      setQuizState('finished');
    }
  }, [quizState, timeLeft]);
  
  const handleAnswerSelect = (option: string) => {
    if (selectedOption) return; // Already answered
    setSelectedOption(option);
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleStartQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOption(null);
    setTimeLeft(timerSetting);
    setQuizState('in-progress');
    setAnimationClass('animate-fadeInScaleUp');
  };

  const handleNext = useCallback(() => {
    setAnimationClass('animate-slideOutToLeft');
    setTimeout(() => {
        if (currentIndex < quizItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setAnimationClass('animate-slideInFromRight');
        } else {
            setQuizState('finished');
        }
    }, 500); // match animation duration
  }, [currentIndex, quizItems.length]);
  
  const goToPrevious = useCallback(() => {
    if (currentIndex === 0) return;
    setAnimationClass('animate-slideOutToRight');
    setTimeout(() => {
        const prevIndex = currentIndex - 1;
        setCurrentIndex(prevIndex);
        setSelectedOption(answers[prevIndex] || null);
        setAnimationClass('animate-slideInFromLeftWithFade');
    }, 500);
  }, [currentIndex, answers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight' && selectedOption) {
            handleNext();
        } else if (event.key === 'ArrowLeft') {
            goToPrevious();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, goToPrevious, selectedOption]);


  const handleRetake = () => {
    setQuizState('not-started');
  };
  
  const score = useMemo(() => {
    return quizItems.reduce((acc, item, index) => {
      return acc + (answers[index] === item.correctAnswer ? 1 : 0);
    }, 0);
  }, [answers, quizItems]);

  const timerOptions = [
    { label: 'No Timer', value: null },
    { label: '30s / question', value: quizItems.length * 30 },
    { label: '1m / question', value: quizItems.length * 60 },
    { label: '2m / question', value: quizItems.length * 120 },
  ];

  if (!quizItems || quizItems.length === 0) {
    return <p className="text-center text-slate-400">No quiz available. Ask me to create one!</p>;
  }

  if (quizState === 'not-started') {
    return (
      <div className="text-center animate-fadeInScaleUp p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center h-full justify-center">
        <h3 className="text-3xl font-bold text-white mb-2">{title || 'Ready for your quiz?'}</h3>
        <p className="text-slate-400 mb-8">{quizItems.length} questions await.</p>
        
        <div className="mb-6 w-full max-w-sm">
            <h4 className="text-lg font-semibold text-slate-200 mb-4">Timer Settings</h4>
            <div className="flex flex-wrap justify-center gap-3">
                {timerOptions.map(opt => (
                    <button 
                        key={opt.label}
                        onClick={() => setTimerSetting(opt.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-colors ${
                            timerSetting === opt.value 
                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white' 
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
             <div className="h-6 mt-4 text-center">
                <p className="text-sm text-slate-400">
                    {formatTotalTime(timerSetting)}
                </p>
            </div>
        </div>

        <button onClick={handleStartQuiz} className="mt-2 px-10 py-3 font-semibold rounded-md text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-transform transform hover:scale-105">
            Start Quiz
        </button>
      </div>
    );
  }

  if (quizState === 'finished') {
    const percentage = Math.round((score / quizItems.length) * 100);
    return (
      <div className="text-center animate-fadeInScaleUp p-6 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center">
        <h3 className="text-3xl font-bold text-white mb-4">{title || 'Quiz Complete!'}</h3>
        {timeLeft === 0 && <p className="text-red-400 font-semibold mb-4 -mt-2">Time's up!</p>}
        <div className="my-6">
           <CircularProgress percentage={percentage} />
        </div>
        <p className="text-xl font-semibold text-slate-300">You scored <span className="text-white font-bold">{score}</span> out of <span className="font-bold text-white">{quizItems.length}</span></p>
        <button onClick={handleRetake} className="mt-8 px-8 py-3 font-semibold rounded-md text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-colors">
            Retake Quiz
        </button>
      </div>
    );
  }
  
  const progressPercentage = ((currentIndex) / quizItems.length) * 100;

  const getOptionClass = (option: string) => {
    if (!selectedOption) {
      return 'border-slate-700 bg-slate-800 hover:border-[var(--accent-primary)] hover:bg-slate-700';
    }
    
    if (option === currentItem.correctAnswer) {
      return 'border-green-500 bg-green-500/20 text-white ring-2 ring-green-500';
    }

    if (option === selectedOption) {
      return 'border-red-500 bg-red-500/20 text-white';
    }
    
    return 'border-slate-700 bg-slate-800/50 opacity-60';
  };

  return (
    <div className="flex flex-col h-full p-2 md:p-4 w-full max-w-3xl">
      <div className="mb-4">
        {title && <h2 className="text-xl font-bold text-white text-center mb-4">{title}</h2>}
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-300">
                    Question {currentIndex + 1} / {quizItems.length}
                </span>
            </div>
             {timeLeft !== null && (
                <div className={`flex items-center gap-1.5 text-sm font-mono font-medium rounded-full px-2 py-0.5 transition-colors ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
              )}
        </div>
        <div className="w-full h-2 progress-bar-bg">
            <div className="h-full progress-bar-fg" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
      
      <div className={`${animationClass} flex-grow`}>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <p className="font-semibold text-lg mb-6 text-slate-100 min-h-[5em] flex items-center">
                <span className="text-slate-400 mr-3">{currentIndex + 1}.</span>
                <span>{currentItem.question}</span>
            </p>
            <div className="space-y-3">
            {currentItem.options.map((option) => (
                <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={!!selectedOption}
                className={`w-full text-left p-4 border rounded-lg transition-all duration-200 flex items-center justify-between text-slate-100 transform active:scale-98
                    ${getOptionClass(option)}
                    ${!selectedOption ? 'cursor-pointer' : 'cursor-default' }
                `}
                >
                    <span>{option}</span>
                    {selectedOption && option === currentItem.correctAnswer && <CheckSquareIcon className="w-5 h-5 text-green-400" />}
                    {selectedOption === option && option !== currentItem.correctAnswer && <XCircleIcon className="w-5 h-5 text-red-400" />}
                </button>
            ))}
            </div>

            {selectedOption && currentItem.explanation && (
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-fadeIn">
                <h4 className="font-semibold text-slate-100 mb-2">Explanation</h4>
                <p className="text-sm text-slate-300">{currentItem.explanation}</p>
            </div>
            )}
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center h-10">
        <div>
            {currentIndex > 0 && (
                <button 
                    onClick={goToPrevious}
                    className="inline-flex items-center px-6 py-2 font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 transition-colors animate-fadeIn"
                >
                    <ArrowLeftIcon className="w-5 h-5 mr-2"/>
                    Previous
                </button>
            )}
        </div>
        <div>
            {selectedOption && (
                <button 
                    onClick={handleNext} 
                    className="inline-flex items-center px-6 py-2 font-medium rounded-md text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-colors animate-fadeIn"
                >
                    {currentIndex < quizItems.length - 1 ? 'Next Question' : 'Show Results'}
                    <ArrowRightIcon className="w-5 h-5 ml-2"/>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;
