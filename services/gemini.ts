import { GoogleGenAI, Type } from "@google/genai";
import { JournalEntry, ProcessedMetadata, UserProfile } from '../types';
import { getUserProfile } from './storage';

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processAudioJournal = async (
  audioBlob: Blob,
  context: { location: string; timestamp: string }
): Promise<ProcessedMetadata> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Audio = await blobToBase64(audioBlob);

  const prompt = `
    You are an Expert Clinical Psychologist AI. Analyze this audio journal recorded at ${context.location} on ${context.timestamp}.
    
    ### LANGUAGE SETTINGS (CRITICAL):
    - The user speaks a mix of **English** and **Nepali** (Code-switching).
    - **Transcription**: Transcribe exactly as spoken. Use Devanagari script for Nepali phrases and Roman script for English phrases. Do not translate the transcript.
    - **Analysis Output**: The Summary, Facts, and Psychological Analysis must be generated in **English** for standardization.
    
    ### ANALYSIS FRAMEWORKS (STRICT ADHERENCE REQUIRED):
    
    1. **Affective State (Russell, 1980 - Circumplex Model)**:
       - **Valence**: -1.0 (Very Negative) to 1.0 (Very Positive).
       - **Arousal**: 0.0 (Sleepy/Low) to 1.0 (High Alert/Panic).
       
    2. **Cognitive Distortions (Beck, 1976 - CBT)**:
       - Identify specific logical errors in the user's thought process (e.g., Catastrophizing, All-or-Nothing, Personalization, Filtering). 
       - If none, return empty.
       
    3. **Motivation (Maslow, 1943 - Hierarchy of Needs)**:
       - Identify the *primary* need driving this entry: 'Physiological', 'Safety', 'Belonging', 'Esteem', or 'Self-Actualization'.

    4. **Core Memory Extraction**:
       - Extract 1-3 permanent facts about the user (in English).
       
    Tasks: Transcribe, Summarize, Profile (using frameworks above).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioBlob.type.split(';')[0], 
            data: base64Audio
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          summary: { type: Type.STRING },
          sentiment: { 
            type: Type.STRING, 
            enum: ['Positive', 'Neutral', 'Negative', 'Anxious', 'Excited', 'Stressed'] 
          },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          extractedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
          psychometrics: {
            type: Type.OBJECT,
            properties: {
              valence: { type: Type.NUMBER, description: "Russell (1980): -1.0 to 1.0" },
              arousal: { type: Type.NUMBER, description: "Russell (1980): 0.0 to 1.0" },
              cbtDistortions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "Beck (1976): List of cognitive distortions found." 
              },
              maslowLevel: { 
                type: Type.STRING, 
                enum: ['Physiological', 'Safety', 'Belonging', 'Esteem', 'Self-Actualization'],
                description: "Maslow (1943): Primary need level."
              }
            },
            required: ["valence", "arousal", "cbtDistortions", "maslowLevel"]
          }
        },
        required: ["transcript", "summary", "sentiment", "tags", "keyEvents", "extractedFacts", "psychometrics"]
      }
    }
  });

  if (!response.text) throw new Error("No response from Gemini");
  return JSON.parse(response.text) as ProcessedMetadata;
};

export const analyzeHistory = async (
  history: JournalEntry[],
  userQuery: string
): Promise<string> => {
  if (history.length === 0) {
    return "I need some journal entries before I can analyze your history. Try recording a few thoughts first!";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const userProfile = getUserProfile();

  // Map history with the new metrics for the Pro model to analyze
  const contextData = history.map(h => ({
    date: h.dateStr,
    location: h.locationName,
    summary: h.metadata.summary,
    keyEvents: h.metadata.keyEvents,
    psych: {
      valence: h.metadata.psychometrics?.valence,
      arousal: h.metadata.psychometrics?.arousal,
      distortions: h.metadata.psychometrics?.cbtDistortions,
      maslow: h.metadata.psychometrics?.maslowLevel
    }
  }));

  const prompt = `
    You are a Lead Psychologist AI.
    
    ### LANGUAGE CONTEXT:
    The user is bilingual (English/Nepali). 
    - The **History Data** provided is in English (standardized).
    - The **User Query** might be in English or Nepali.
    - **Response Language**: If the user asks in Nepali, reply in Nepali. If in English, reply in English.
    
    ### USER PROFILE (Core Traits):
    ${JSON.stringify(userProfile.coreMemories, null, 2)}
    
    ### LONGITUDINAL DATA (History):
    ${JSON.stringify(contextData, null, 2)}
    
    ### USER QUERY:
    "${userQuery}"
    
    ### ANALYSIS INSTRUCTIONS:
    1. **Psychometric Trajectory**: Analyze the trend of Valence/Arousal (Russell, 1980) over time. Is the user spiraling into high-arousal negativity (Anxiety) or low-arousal negativity (Depression)?
    2. **Cognitive Audit**: Identify recurring Cognitive Distortions (Beck, 1976).
    3. **Needs Analysis**: Using Maslow (1943), determine if the user is stuck at a lower level (Safety) preventing Self-Actualization.
    4. **Contextual Correlation**: Correlate these metrics with location data.
    
    Provide a professional, empathetic, yet analytically rigorous response.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
        thinkingConfig: { thinkingBudget: 4096 }
    }
  });

  return response.text || "I couldn't analyze the data at this moment.";
};