import { PDFParse } from "pdf-parse";

export async function extractText(buffer: Buffer): Promise<string> {
  const data = await new PDFParse(buffer);
  return (await data.getText()).text.replace(/\s+/g, " ").trim();
}

// Split long text into chunks so each LLM call stays within limits
export function chunkText(text: string, maxChars = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}