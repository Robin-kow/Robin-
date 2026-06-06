import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export const initGemini = () => {
  if (process.env.API_KEY) {
    client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const getTarotReading = async (cardName: string, isReversed: boolean): Promise<string> => {
  if (!client) {
    initGemini();
    if (!client) return "AI Configuration missing. Please set API_KEY.";
  }

  try {
    const orientation = isReversed ? "reversed" : "upright";
    const prompt = `I drew the Tarot card '${cardName}' in the ${orientation} position. 
    Provide a mystical, concise (max 2 sentences) interpretation of what this means for my immediate future. 
    Focus on the feeling and actionable advice.`;

    const response = await client!.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || " The mists obscure the future...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The spirits are silent (Network Error).";
  }
};

export const getSpreadReading = async (cards: { name: string, isReversed: boolean }[]): Promise<string> => {
  if (!client) {
    initGemini();
    if (!client) return "AI Configuration missing. Please set API_KEY.";
  }

  try {
    const positions = ["The Past", "The Present", "The Future"];
    const cardDescriptions = cards.map((c, i) => {
        const pos = positions[i] || `Card ${i+1}`;
        return `${pos}: ${c.name} (${c.isReversed ? "Reversed" : "Upright"})`;
    }).join("\n");

    const prompt = `I have performed a three-card Tarot spread (Past, Present, Future). Here are the cards drawn:\n${cardDescriptions}\n\nInterpret these cards together as a cohesive narrative. How does the past influence the present, and what does it suggest for the future? Provide a mystical, insightful summary (max 100 words).`;

    const response = await client!.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "The fate is clouded...";
  } catch (error) {
    console.error("Gemini Spread Error:", error);
    return "The spirits are silent (Network Error).";
  }
};

export const generateTarotImage = async (readingText: string): Promise<string> => {
  if (!client) {
    initGemini();
    if (!client) return "";
  }
  
  try {
    const prompt = `Create a Tarot-inspired illustration based on the following reading.
    Style: Intricate black and white ink line art, hatching and cross-hatching, woodcut etching aesthetic, high contrast.
    Composition: The artwork MUST absolutely fill the entire image dimension extending seamlessly to the very edges. NO BORDERS of any kind. NO WHITE MARGINS. NO BLACK FRAMES. DO NOT draw a border or frame around the scene.
    Content constraints: NO TEXT LABELS, NO WORDS.
    Blend core elements of the reading into a cohesive scene.
    
    Reading: ${readingText}`;

    const response = await client!.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // @ts-expect-error GenAI SDK typings might not include imageConfig fully
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    
    return "";
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return "";
  }
};
