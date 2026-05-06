import { GoogleGenAI, Type } from "@google/genai";
import { QuizData } from "../types";

// Helper to ensure we have an API key
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

// Common Schema for both Text and Image generation
const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "La pregunta extraída o generada" },
          timeLimit: { type: Type.INTEGER, description: "Tiempo en segundos (ej. 20, 30)" },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Un identificador único corto como 'A', 'B', 'C', 'D'" },
                text: { type: Type.STRING, description: "Texto de la opción" },
                isCorrect: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING, description: "Explicación educativa específica para esta opción" }
              },
              required: ["id", "text", "isCorrect", "feedback"]
            }
          }
        },
        required: ["text", "options", "timeLimit"]
      }
    }
  },
  required: ["topic", "questions"]
};

const processResponse = (responseText: string | undefined): QuizData => {
  if (!responseText) {
    throw new Error("No se pudo generar el quiz.");
  }
  
  const data = JSON.parse(responseText) as QuizData;
  
  // Ensure IDs are unique per question
  data.questions = data.questions.map((q, qIdx) => ({
    ...q,
    id: `q-${qIdx}-${Date.now()}`,
    options: q.options.map((o, oIdx) => ({
      ...o,
      id: `${qIdx}-${oIdx}`
    }))
  }));

  return data;
};

export const generateQuiz = async (topic: string): Promise<QuizData> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    Eres un experto profesor que crea cuestionarios dinámicos y educativos tipo Kahoot.
    Tu objetivo es generar preguntas de opción múltiple interesantes sobre el tema proporcionado.
    
    CRÍTICO: Para CADA opción, debes proporcionar un campo 'feedback' (retroalimentación).
    - Si la opción es CORRECTA: Explica brevemente por qué es la respuesta correcta.
    - Si la opción es INCORRECTA: Explica por qué es incorrecta y aclara el concepto erróneo.
    
    El idioma de salida debe ser ESPAÑOL.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Genera un quiz de 5 preguntas sobre: "${topic}".`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: QUIZ_SCHEMA
    }
  });

  return processResponse(response.text);
};

export const generateQuizFromImages = async (base64Images: string[]): Promise<QuizData> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    Eres un asistente educativo experto. Analiza las imágenes proporcionadas. 
    Cada imagen corresponde a una diapositiva de un ejercicio o pregunta.
    
    Tu tarea es:
    1. Extraer la pregunta de la imagen.
    2. Extraer las opciones de respuesta.
    3. IDENTIFICAR la respuesta correcta. 
       - Si la diapositiva marca la respuesta (círculo, negrita, check), úsala.
       - Si no está marcada, RESUELVE el ejercicio tú mismo para determinar la correcta.
    4. Generar FEEDBACK educativo explicando por qué la correcta es correcta y por qué las otras fallan.
    
    Salida en formato JSON estricto. Idioma ESPAÑOL.
  `;

  // Construct parts: Text prompt + All Images
  const parts: any[] = [
    { text: "Analiza estas diapositivas y crea el quiz JSON." }
  ];

  base64Images.forEach(imgData => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imgData
      }
    });
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview", // Complex image processing and OCR
    contents: {
      role: 'user',
      parts: parts
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: QUIZ_SCHEMA
    }
  });

  return processResponse(response.text);
};