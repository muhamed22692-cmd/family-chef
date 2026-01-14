// Frontend Gemini Service
// هذا الملف لا يحتوي على API Key
// فقط يرسل الطلب إلى Netlify Function

export interface GeminiResponse {
  text: string;
}

export async function analyzeWithGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch("/.netlify/functions/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt
      })
    });

    if (!response.ok) {
      throw new Error("Failed to reach AI service");
    }

    const data: GeminiResponse = await response.json();
    return data.text;

  } catch (error) {
    console.error("Gemini Frontend Error:", error);
    throw new Error("حدث خطأ أثناء تحليل البيانات");
  }
}