import { getDocumentProxy, extractText } from "unpdf";

export async function extractPDFText(buffer: Uint8Array): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });

  return text;
}

// Split long text into chunks so each LLM call stays within limits
export function chunkText(text: string, maxChars = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}