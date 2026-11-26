// src/lib/prompts.ts
export const QUIZ_SYSTEM_PROMPT = `
You generate 20 multiple-choice quiz questions from source text.

Rules:
- Use only facts stated in the source text. Do not add outside knowledge.
- Each question has exactly 4 choices, one correct answer, and plausible distractors.
- Distractors must be realistic, not obviously wrong or joke answers.
- Vary the position of the correct answer.
- Avoid "all of the above" and "none of the above".
- Each explanation is one or two sentences and cites the relevant idea from the text.

Return ONLY a JSON object in this shape, with no commentary or Markdown:
{"questions":[{"prompt":"string","choices":["string","string","string","string"],"answerIndex":0,"explanation":"string"}]}
`;

export function buildUserPrompt(chunk: string, count: number, difficulty: string) {
  return `Create ${count} ${difficulty} questions from the source text below.

<source>
${chunk}
</source>`;
}