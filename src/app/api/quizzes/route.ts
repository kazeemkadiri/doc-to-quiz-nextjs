// src/app/api/quizzes/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkText, extractPDFText } from "@/lib/pdf";
import mammoth from 'mammoth';
import { QUIZ_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { PrismaClient } from "@/generated/prisma/client";
import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

const QuestionSchema = z.object({
  prompt: z.string().min(5),
  choices: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});
const ResponseSchema = z.object({ questions: z.array(QuestionSchema) });

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const count = Number(form.get("count") ?? 5);
  const difficulty = String(form.get("difficulty") ?? "medium");

  if (
    !(file instanceof File) ||
    (file.type !== "application/pdf" &&
      file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    return NextResponse.json({ error: "Upload a PDF or DOCX file." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB." }, { status: 413 });
  }

  let resultText = '';

  if (file.type === "application/pdf") {
    resultText = await extractPDFText(new Uint8Array(await file.arrayBuffer()));
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
    resultText = value;
  }


  if (resultText.length < 200) {
    return NextResponse.json({ error: "Couldn't find enough text. Is it a scanned PDF?" }, { status: 422 });
  }

  const chunk = chunkText(resultText)[0]; // MVP: first chunk only
  try {
    // const { topic, count = 5, difficulty = "medium" } = await req.json();

    // if (!topic || typeof topic !== "string") {
    //   return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    // }

    // const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: QUIZ_SYSTEM_PROMPT,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              answerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "answerIndex", "explanation"],
          },
        },
      },
    });

    const questions: Question[] = JSON.parse(response.text ?? "[]");

    // Basic validation so malformed output never reaches the client
    const valid = questions.filter(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 &&
        q.answerIndex < 4
    );

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Could not generate valid questions. Try again." },
        { status: 502 }
      );
    }

    // const quiz = await new PrismaClient().quiz.create({
    //   data: {
    //     title: file.name.replace(/\.pdf$/i, ""),
    //     questions: valid.map((q) => ({ ...q, options: q.options })) as any,
    //   },
    // });

    return NextResponse.json({ 
      data: {
        title: file.name.replace(/\.pdf$/i, ""),
        questions: valid.map((q) => ({ ...q, options: q.options })) as any,
      },
     });
  } catch (err) {
    console.error("Quiz generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate quiz." },
      { status: 500 }
    );
  }

  // const data = await llmRes.json();
  // const raw = data.content?.[0]?.text ?? "";

  // // Models sometimes wrap JSON in code fences; strip them before parsing
  // const cleaned = raw.replace(/```json|```/g, "").trim();

  // let parsed;
  // try {
  //   parsed = ResponseSchema.parse(JSON.parse(cleaned));
  // } catch {
  //   return NextResponse.json({ error: "The model returned an invalid quiz. Try again." }, { status: 502 });
  // }


}