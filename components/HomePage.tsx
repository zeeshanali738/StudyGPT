import React from 'react';

interface HomePageProps {
  onSendExample: (text: string, image?: string | null) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSendExample }) => {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start pt-32 md:pt-40 p-4 animate-fadeIn">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-3">StudyGPT</h1>
        <p className="text-lg text-slate-400 mb-4">Your Personal AI Study Assistant</p>
        <p className="text-md text-slate-400">
          Generate quizzes, flashcards, and summaries from any topic or document.
        </p>
        <p className="text-md text-slate-400 mt-2">
          Accelerate your learning with personalized AI assistance.
        </p>
      </div>
    </div>
  );
};

export default HomePage;