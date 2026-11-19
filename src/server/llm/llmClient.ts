
import { GoogleGenAI } from "@google/genai";
import { SEARCH_SYSTEM_PROMPT } from "./prompts";

type Candidate = { code: string; name: string; name_ne?: string };

export async function interpretWithModel(question: string, candidates: Candidate[]) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || candidates.length === 0) return null;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: process.env.GOOGLE_MODEL ?? "gemini-2.5-flash",
            contents: `Question: ${question}\nCandidate indicators:\n${JSON.stringify(candidates)}`,
            config: {
                systemInstruction: SEARCH_SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    properties: {
                        matched: { type: "boolean" },
                        indicator_code: { type: "string" },
                        period_from: { type: "string" },
                        period_to: { type: "string" },
                        chart_hint: { type: "string" },
                        clarifying_question: { type: "string" },
                    },
                    required: ["matched", "indicator_code"],
                },
            },
        });

        const plan = JSON.parse(response.text ?? "null");
        // Only accept an indicator from the candidate list, so the model can't invent one.
        if (!plan?.matched || !candidates.some((c) => c.code === plan.indicator_code)) return null;
        return plan;
    } catch (error) {
        console.error("Gemini interpretation failed; falling back to text search", error);
        return null;
    }
}
