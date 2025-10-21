import React from 'react';

interface SummaryViewProps {
  summary: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  // A simple markdown to HTML converter
  const formatSummary = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-white mt-4 mb-2">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-gray-200 mt-3 mb-1">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium text-gray-300 mt-2">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li class="mb-1 ml-4">$1</li>')
      .replace(/<\/li>(\n|\r\n)<li>/g, '</li><li>') // fix list spacing
      .replace(/(\n|\r\n){2,}/g, '<br/><br/>') // Treat double newlines as paragraphs
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Key Points Summary</h3>
      {summary === "Generating summary..." ? (
         <div className="flex items-center space-x-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-200 rounded-full animate-spin"></div>
            <span>Analyzing document...</span>
        </div>
      ) : (
        <div 
            className="text-gray-300 space-y-4 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatSummary(summary) }} 
        />
      )}
    </div>
  );
};

export default SummaryView;