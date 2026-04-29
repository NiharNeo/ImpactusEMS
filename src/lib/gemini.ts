const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

export async function generateEventDescription(name: string, type: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing");
  }

  const prompt = `You are a professional event copywriter for "Nexus", a premium event management platform. 
  Write a compelling, high-conversion event description for an event titled "${name}" which is a "${type}".
  The tone should be sophisticated, minimalist, and exciting. 
  Keep it to 3-4 paragraphs. Focus on the value for attendees.
  Return only the text of the description.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function enhanceDescription(currentDescription: string, name: string) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");

  const prompt = `Enhance and polish this event description for "${name}". 
  Make it more professional, engaging, and clear. 
  Keep the original intent but improve the flow and impact.
  Original: ${currentDescription}
  Return only the polished text.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
 
 
