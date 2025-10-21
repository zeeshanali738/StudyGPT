// Fix: Added definitions for all shared types and exported them.
export interface Source {
  uri: string;
  title: string;
  content?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  sources?: Source[];
  timestamp: number;
  useWebSearch?: boolean;
}

export interface Flashcard {
  question: string;
  answer: string;
  context: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Slide {
  title: string;
  content: string[];
}

export interface StudySession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  flashcards: Flashcard[];
  flashcardsTitle: string;
  quizItems: QuizItem[];
  quizTitle: string;
  slides: Slide[];
  slidesTitle: string;
  documentContext: string;
  documentSummary: string;
}
