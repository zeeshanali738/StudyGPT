import { useState, useEffect, useRef, useCallback } from 'react';

// Fix: Add type definitions for the Web Speech API to resolve TypeScript errors.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface CommandMap {
  [key: string]: () => void;
}

interface DynamicCommand {
    keywords: string[];
    action: (transcribedText: string) => void;
}

const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
  if (typeof window !== 'undefined') {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition;
  }
  return null;
};

export const useVoiceCommands = (staticCommands: CommandMap, dynamicCommands: DynamicCommand[] = [], language: string = 'en-US') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, []);

  const processTranscript = useCallback((text: string) => {
    const lowerCaseText = text.toLowerCase().trim();
    
    // Check for exact static commands first
    if (staticCommands[lowerCaseText]) {
      staticCommands[lowerCaseText]();
      stopListening();
      return;
    }
    
    // Check for dynamic commands
    for (const command of dynamicCommands) {
        for (const keyword of command.keywords) {
            const keywordWithSpace = keyword + ' ';
            if (lowerCaseText.startsWith(keywordWithSpace)) {
                const capturedText = text.substring(keywordWithSpace.length);
                command.action(capturedText);
                stopListening();
                return;
            }
        }
    }

    // A specific command to stop listening
    if (lowerCaseText === 'stop listening' || lowerCaseText === 'cancel') {
        stopListening();
    }

  }, [staticCommands, dynamicCommands, stopListening]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(interimTranscript);
      if (finalTranscript) {
        processTranscript(finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (isListeningRef.current) {
        stopListening();
      }
    };
    
    recognition.onend = () => {
        // If it stops but we still want to be listening, restart it.
        // This handles cases where the service times out.
        if (isListeningRef.current) {
            recognition.start();
        }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [processTranscript, stopListening, language]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: !!getSpeechRecognition()
  };
};