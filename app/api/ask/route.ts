import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AskMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskRequest = {
  messages: AskMessage[];
  name: string;
  breed: string;
  ageInWeeks: number;
  gender: string;
};

const SYSTEM_PROMPT = `You are a knowledgeable UK puppy advisor helping new dog owners. Always tailor advice to the specific puppy's name, breed, age in weeks, and gender provided. Address the owner directly and refer to the puppy by name.

When providing factual information, prioritise guidance from UK sources including: The Kennel Club, Dogs Trust, RSPCA, British Veterinary Association, RCVS, Blue Cross, and Vets4Pets. All health advice should reflect UK veterinary standards and protocols. UK vaccination schedule: 8 weeks first vaccination (DHP), 10-12 weeks second vaccination, 12-14 weeks optional leptospirosis booster, annual boosters thereafter.

When recommending products, prefer UK brands and retailers. Be practical, warm, and specific. Use step-by-step format where helpful. Avoid generic advice that doesn't apply to this specific puppy. Keep responses concise — under 200 words unless the question requires more detail. Do not make up statistics or cite specific URLs.`;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.floor(value);
  return rounded >= 0 ? rounded : null;
}

function asMessages(value: unknown): AskMessage[] | null {
  if (!Array.isArray(value)) return null;
  const out: AskMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as any).role;
    const content = (item as any).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    out.push({ role, content: trimmed });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw = body as Partial<AskRequest> | null;
    const messages = asMessages(raw?.messages);
    const name = asNonEmptyString(raw?.name);
    const breed = asNonEmptyString(raw?.breed) ?? "mixed breed";
    const gender = asNonEmptyString(raw?.gender) ?? "unknown";
    const ageInWeeks = asNonNegativeInteger(raw?.ageInWeeks);

    if (!messages || !name || ageInWeeks === null) {
      return NextResponse.json(
        { error: "Expected { messages, name, breed, ageInWeeks, gender }" },
        { status: 400 },
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const system = [
      SYSTEM_PROMPT,
      "",
      "Puppy details:",
      `Name: ${name}`,
      `Breed: ${breed}`,
      `Age: ${ageInWeeks} weeks`,
      `Gender: ${gender}`,
    ].join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 350,
      temperature: 0.6,
      system,
      messages,
      stream: false,
    });

    const answer = message.content
      .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!answer) {
      return NextResponse.json({ error: "No answer generated" }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("[/api/ask] POST crashed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

