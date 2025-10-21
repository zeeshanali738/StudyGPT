import { StudySession } from '../types';

const getStorageKey = () => 'study-gpt-sessions';
const getProfileKey = () => 'study-gpt-profile';
const getThemeKey = () => 'study-gpt-theme';
const getVoiceKey = () => 'study-gpt-voice-uri';
const getLanguageKey = () => 'study-gpt-language';

// --- Data Versioning and Migration ---
// By adding a version number, we can safely introduce changes to the data structure
// in the future without breaking the app for existing users.
const CURRENT_DATA_VERSION = 1;

interface StoredData {
  version: number;
  sessions: StudySession[];
}

const migrateData = (data: any): StudySession[] => {
  if (!data) {
    return [];
  }

  // Handle legacy format (plain array of sessions)
  if (Array.isArray(data)) {
    console.log("Migrating legacy session data to versioned format.");
    return data as StudySession[];
  }

  // Handle versioned format
  if (typeof data === 'object' && 'version' in data && 'sessions' in data) {
    const storedVersion = data.version as number;
    if (storedVersion === CURRENT_DATA_VERSION) {
      return data.sessions;
    }
    
    // Placeholder for future migration logic
    if (storedVersion < CURRENT_DATA_VERSION) {
      console.warn(`Stored data version (${storedVersion}) is older than current app version (${CURRENT_DATA_VERSION}). Future migrations would run here.`);
      // e.g., if (data.version === 1) { data.sessions = migrateV1toV2(data.sessions); }
      // For now, we assume backward compatibility and load the data as is.
      return data.sessions;
    }
    
    if (storedVersion > CURRENT_DATA_VERSION) {
      console.error(`Stored data version (${storedVersion}) is NEWER than current app version (${CURRENT_DATA_VERSION}). This may cause issues.`)
      return data.sessions;
    }
  }

  // If data is in an unknown format, return empty.
  console.warn("Could not recognize stored session data format.");
  return [];
};


export const loadSessions = (): StudySession[] => {
  try {
    const serializedSessions = localStorage.getItem(getStorageKey());
    if (serializedSessions === null) {
      return [];
    }
    const data = JSON.parse(serializedSessions);
    const migratedSessions = migrateData(data);

    // Basic validation
    if (Array.isArray(migratedSessions)) {
        return migratedSessions;
    }
    return [];
  } catch (error) {
    console.error("Failed to load sessions from localStorage", error);
    // If parsing fails, create a backup of the potentially corrupted data
    const existingData = localStorage.getItem(getStorageKey());
    if (existingData) {
      try {
        localStorage.setItem(`${getStorageKey()}-backup-${Date.now()}`, existingData);
        console.log("Created a backup of potentially corrupted session data.");
      } catch (backupError) {
        console.error("Failed to create backup of corrupted session data", backupError);
      }
    }
    return [];
  }
};

export const saveSessions = (sessions: StudySession[]): void => {
  try {
    const dataToStore: StoredData = {
      version: CURRENT_DATA_VERSION,
      sessions,
    };
    const serializedSessions = JSON.stringify(dataToStore);
    localStorage.setItem(getStorageKey(), serializedSessions);
  } catch (error) {
    console.error("Failed to save sessions to localStorage", error);
  }
};

export const createNewSession = (): StudySession => {
    const now = Date.now();
    return {
        id: now.toString(),
        title: 'New Study Session',
        createdAt: now,
        updatedAt: now,
        messages: [],
        flashcards: [],
        flashcardsTitle: '',
        quizItems: [],
        quizTitle: '',
        slides: [],
        slidesTitle: '',
        documentContext: '',
        documentSummary: '',
    };
};

export const loadStudyProfile = (): string => {
  try {
    return localStorage.getItem(getProfileKey()) || '';
  } catch (error) {
    console.error("Failed to load study profile from localStorage", error);
    return '';
  }
};

export const saveStudyProfile = (profile: string): void => {
  try {
    localStorage.setItem(getProfileKey(), profile);
  } catch (error) {
    console.error("Failed to save study profile to localStorage", error);
  }
};

export const loadTheme = (): string => {
  try {
    return localStorage.getItem(getThemeKey()) || 'indigo';
  } catch (error) {
    console.error("Failed to load theme from localStorage", error);
    return 'indigo';
  }
};

export const saveTheme = (theme: string): void => {
  try {
    localStorage.setItem(getThemeKey(), theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage", error);
  }
};

export const loadVoiceURI = (): string => {
  try {
    return localStorage.getItem(getVoiceKey()) || '';
  } catch (error) {
    console.error("Failed to load voice URI from localStorage", error);
    return '';
  }
};

export const saveVoiceURI = (uri: string): void => {
  try {
    localStorage.setItem(getVoiceKey(), uri);
  } catch (error) {
    console.error("Failed to save voice URI to localStorage", error);
  }
};

export const loadLanguage = (): string => {
    try {
      return localStorage.getItem(getLanguageKey()) || 'en';
    } catch (error) {
      console.error("Failed to load language from localStorage", error);
      return 'en';
    }
};

export const saveLanguage = (language: string): void => {
    try {
      localStorage.setItem(getLanguageKey(), language);
    } catch (error) {
      console.error("Failed to save language to localStorage", error);
    }
};
