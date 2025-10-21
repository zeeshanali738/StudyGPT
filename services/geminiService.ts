import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Content, Type } from '@google/genai';
import { Message, Source } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

const handleApiError = (error: unknown): Error => {
  console.error("Gemini API Error:", error);

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes("api key not valid")) {
      return new Error("The provided API key is not valid. Please check your configuration.");
    }
    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return new Error("You've sent too many requests. Please wait a moment and try again.");
    }
    if (errorMessage.includes("[400]")) {
      return new Error("There was a problem with the request. Please check your input and try again.");
    }
    if (errorMessage.includes("[5")) { // Catches all 5xx errors
      return new Error("The AI service is currently unavailable. Please try again later.");
    }
    // For other errors, pass the message through, as it may be useful (e.g., safety settings).
    return new Error(error.message);
  }

  return new Error("An unexpected error occurred. Please try again.");
};

const baseSystemInstruction = `You are StudyGPT, a helpful and friendly AI study assistant. Your goal is to help users understand complex topics and prepare for tests.

--- BEHAVIORAL GUARDRAILS ---
- Your primary function is to be a study assistant. You MUST strictly adhere to this role.
- If a user asks a question that is not related to studying, education, academic topics, or professional development (e.g., asking for personal opinions, engaging in casual conversation, writing a poem about a non-academic topic, or asking about illegal/unethical subjects), you MUST politely decline.
- When declining, briefly state that your purpose is to assist with studying and you cannot help with non-educational requests. Do not be preachy or overly verbose.
- Example of a good refusal: "As StudyGPT, my focus is on helping you with your studies. I can't assist with that request, but I'd be happy to explain a concept or create a quiz for you!"
- You MUST NOT answer questions about yourself, your opinions, or your creation.
--- END OF GUARDRAILS ---

- When a user asks you to explain a topic, provide a clear and concise explanation.
- After explaining a topic, you can offer to create study aids by suggesting prompts like "Now, would you like me to create flashcards for this?" or "I can also make a quiz to test your knowledge."
- When a user requests a study aid like a quiz, flashcards, or slides, you MUST respond with a JSON object formatted in a markdown code block. This is a strict requirement. You may include a brief introductory sentence before the JSON block, but the JSON block containing the requested aid is MANDATORY.
- If the user specifies a number of items (e.g., "create 10 flashcards"), you MUST generate exactly that number of items. This is a critical instruction.
- You MUST also include a 'title' field in the root of the JSON object that contains a descriptive title for the generated study aid.
- For flashcards, each item MUST include a 'question', an 'answer', and a 'context'. The 'context' should be the specific sentence or short paragraph from the source text that the flashcard is based on.
- Each quiz item MUST include a 'question', an array of 'options', the 'correctAnswer', and an 'explanation' for why the answer is correct.
- Each slide MUST have a 'title' and a 'content' property, where 'content' is an array of strings (bullet points). Keep content concise and suitable for a presentation.
- If the user uploads an image, analyze it and answer their question.

Example for flashcards:
\`\`\`json
{
  "title": "Cell Biology Basics",
  "flashcards": [
    {"question": "What is the powerhouse of the cell?", "answer": "The mitochondria", "context": "Often referred to as the 'powerhouse of the cell', the mitochondria are organelles that generate most of the cell's supply of adenosine triphosphate (ATP)."},
    {"question": "What is 2+2?", "answer": "4", "context": "In mathematics, two plus two equals four."}
  ]
}
\`\`\`

Example for a quiz:
\`\`\`json
{
  "title": "French Capitals Quiz",
  "quiz": [
    {"question": "What is the capital of France?", "options": ["London", "Paris", "Berlin", "Madrid"], "correctAnswer": "Paris", "explanation": "Paris is the capital and most populous city of France, located on the Seine River in the north of the country."}
  ]
}
\`\`\`

Example for slides:
\`\`\`json
{
  "title": "Introduction to Photosynthesis",
  "slides": [
    {"title": "Introduction to Photosynthesis", "content": ["The process used by plants to convert light energy into chemical energy.", "Occurs in chloroplasts."]},
    {"title": "Key Components", "content": ["Sunlight: The energy source.", "Water: Absorbed through roots.", "Carbon Dioxide: Taken from the air.", "Chlorophyll: The green pigment that captures light."]}
  ]
}
\`\`\`
`;

const getSystemInstruction = (studyProfile?: string, language: string = 'en') => {
  let instruction = baseSystemInstruction;

  const languageMap: Record<string, string> = {
    'en': 'English',
    'ur': 'Urdu',
    'hi': 'Hindi'
  };

  if (language && language !== 'en' && languageMap[language]) {
    instruction += `\n--- LANGUAGE REQUIREMENT ---\nYou MUST respond in ${languageMap[language]}.\n--- END OF REQUIREMENT ---\n`;
  }

  if (studyProfile && studyProfile.trim().length > 0) {
    instruction += `
--- USER'S STUDY PROFILE ---
The user has provided the following long-term context about their study goals. Keep this in mind for all your responses:
"${studyProfile}"
--- END OF PROFILE ---
`;
  }
  return instruction;
}


const mapMessagesToContent = (messages: Message[]): Content[] => {
    return messages.map(msg => {
        const parts: any[] = [];
        // Add image part first if it exists for user messages
        if (msg.role === 'user' && msg.image) {
            const [mimeTypePart, base64Data] = msg.image.split(';base64,');
            const mimeType = mimeTypePart.split(':')[1];
            parts.push({
                inlineData: {
                    mimeType,
                    data: base64Data
                }
            });
        }
        // Always add the text part
        parts.push({ text: msg.content });
        
        return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: parts
        };
    });
};

export const getChatResponse = async (
  prompt: string,
  history: Message[],
  useWebSearch: boolean,
  onChunk: (text: string) => void,
  studyProfile?: string,
  image?: string | null,
  language?: string,
): Promise<{ fullText: string, sources: Source[] }> => {
  try {
    const systemInstruction = getSystemInstruction(studyProfile, language);
    const contents: Content[] = [
        ...mapMessagesToContent(history),
        { role: 'user', parts: [] }
    ];
    const lastContent = contents[contents.length-1];
    
    if (image) {
        const [mimeTypePart, base64Data] = image.split(';base64,');
        const mimeType = mimeTypePart.split(':')[1];
        lastContent.parts.push({
            inlineData: {
                mimeType,
                data: base64Data
            }
        });
    }
    lastContent.parts.push({ text: prompt });

    const params: GenerateContentParameters = {
      model,
      contents,
      config: {
        systemInstruction,
      }
    };
    if (useWebSearch && params.config) {
        params.config.tools = [{googleSearch: {}}];
    }
    
    const stream = await ai.models.generateContentStream(params);
    let fullText = '';
    let allSources: Source[] = [];

    for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          onChunk(chunk.text);
        }

        const chunkSources: Source[] = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map(gc => {
                if (gc.retrievedContext && gc.retrievedContext.uri) {
                    return {
                        uri: gc.retrievedContext.uri,
                        title: gc.retrievedContext.title || '',
                        content: gc.retrievedContext.content,
                    };
                }
                if (gc.web && gc.web.uri) {
                    return {
                        uri: gc.web.uri,
                        title: gc.web.title || '',
                    };
                }
                return null;
            })
            .filter((s): s is Source => s !== null) ?? [];
        
        if (chunkSources.length > 0) {
            allSources.push(...chunkSources);
        }
    }

    const sources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());

    return { fullText, sources };
  } catch (error) {
    throw handleApiError(error);
  }
};


export const summarizeDocument = async (documentText: string, studyProfile?: string, language?: string): Promise<string> => {
    const prompt = `Please provide a detailed, multi-point summary of the following document. Use markdown for formatting (headings, bullet points). The summary should capture the key concepts, main arguments, and important data points.

DOCUMENT:
---
${documentText.slice(0, 100000)}
---
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: getSystemInstruction(studyProfile, language)
            }
        });
        return response.text;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const getAutocompleteSuggestions = async (text: string): Promise<string[]> => {
    const prompt = `Based on the user's partially typed query, generate 3-5 concise and relevant autocomplete suggestions for a study assistant application. The user is looking for explanations, definitions, or to generate study aids. Only return a JSON array of strings.

Query: "${text}"

Example format:
["what is the krebs cycle", "generate flashcards for cellular respiration", "explain the difference between mitosis and meiosis"]
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                thinkingConfig: { thinkingBudget: 0 } // Low latency needed
            }
        });
        
        const jsonStr = response.text.trim();
        const suggestions = JSON.parse(jsonStr);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];

    } catch (error) {
        // It's okay for suggestions to fail silently.
        console.error("Autocomplete suggestion error:", error);
        return [];
    }
}
