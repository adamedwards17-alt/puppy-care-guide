import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AdviceRequest = {
  name: string;
  breed: string;
  ageInWeeks: number;
};

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

export async function POST(req: Request) {
  return NextResponse.json({ debug: process.env.ANTHROPIC_API_KEY ? "key exists" : "key missing", allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')) });
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

    const raw = body as Partial<AdviceRequest> | null;
    const name = asNonEmptyString(raw?.name);
    const breed = asNonEmptyString(raw?.breed) ?? "mixed breed";
    const ageInWeeks = asNonNegativeInteger(raw?.ageInWeeks);

    if (!name || ageInWeeks === null) {
      return NextResponse.json({ error: "Expected { name, breed, ageInWeeks }" }, { status: 400 });
    }

    console.log("[/api/advice] handler entered", { hasKey: Boolean(apiKey) });

    // Dynamic import to avoid module-load crashes if Next/Node runtime disagrees with SDK packaging.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const prompt = [
      `Give a 2–3 sentence potty training tip for a puppy.`,
      `Puppy name: ${name}`,
      `Breed: ${breed}`,
      `Age: ${ageInWeeks} weeks`,
      ``,
      `Make it practical, kind, and specific to breed tendencies and this age. No lists, no emojis.`,
    ].join("\n");

    let message: Awaited<ReturnType<typeof client.messages.create>>;
    try {
      message = await client.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 120,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (error) {
      console.error("[/api/advice] anthropic request failed", error);
      console.error(
        "[/api/advice] anthropic error message",
        error instanceof Error ? error.message : String(error),
      );
      return NextResponse.json({ error: "Anthropic request failed" }, { status: 502 });
    }

    const advice = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join("\n")
      .replace(/\s+/g, " ")
      .trim();

    if (!advice) {
      return NextResponse.json({ error: "No advice generated" }, { status: 502 });
    }

    return NextResponse.json({ advice });
  } catch (error) {
    console.error("[/api/advice] POST crashed", error);
    if (error instanceof Error) {
      console.error("[/api/advice] crash details", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

