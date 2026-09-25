import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import app from "../firebase/config";

const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});

const model = getGenerativeModel(ai, {
  model: "gemini-3.6-flash",
});

export const testGemini = async () => {
  try {
    const result = await model.generateContent(
      "Reply with exactly: POLICESETU AI Gemini connection successful.",
    );

    const response = result.response;

    console.log("Gemini response:", response.text());

    return response.text();
  } catch (error) {
    console.error("Gemini connection error:", error);
    throw error;
  }
};
