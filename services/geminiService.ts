
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFinancialAdvice = async (
  question: string,
  transactions: Transaction[],
  userName: string
): Promise<string> => {
  try {
    const txSummary = JSON.stringify(transactions.map(t => ({
      date: t.date,
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMode: t.paymentMode || 'Unknown',
      note: t.note
    })));

    const prompt = `
      User Name: ${userName}
      Transaction Data (JSON): ${txSummary}
      
      User Question: ${question}
      
      You are a helpful and savvy financial assistant. 
      Use the provided transaction data to answer the user's question.
      If the data is empty, tell them to add some transactions first.
      Be concise, encouraging, and format your response nicely (markdown is supported).
      Focus on totals, trends, payment modes (UPI/Cash usage), and specific project details if asked.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a mobile app financial assistant. Keep answers short (under 150 words) and easy to read on a phone."
      }
    });

    return response.text || "Sorry, I couldn't generate an insight right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the insights engine. Please check your internet connection.";
  }
};
