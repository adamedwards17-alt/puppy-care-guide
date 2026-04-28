import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SkillRating = 1 | 2 | 3;

type SkillsPayload = {
  sit: SkillRating;
  down: SkillRating;
  recall: SkillRating;
  leaveIt: SkillRating;
  looseLead: SkillRating;
  crate: SkillRating;
  socialisation: SkillRating;
};

type ProgressRequest = {
  skills: SkillsPayload;
  name: string;
  breed: string;
  ageInWeeks: number;
  gender: string;
};

const RATING_LABELS: Record<number, string> = { 1: "Needs work", 2: "Getting there", 3: "Nailed it" };

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw = body as Partial<ProgressRequest> | null;
    const name = asString(raw?.name);
    if (!name || !raw?.skills || typeof raw.ageInWeeks !== "number") {
      return NextResponse.json({ error: "Expected { skills, name, breed, ageInWeeks, gender }" }, { status: 400 });
    }

    const { skills, breed, ageInWeeks, gender } = raw;

    const skillLines = [
      `Sit: ${RATING_LABELS[skills.sit] ?? "Unknown"}`,
      `Down: ${RATING_LABELS[skills.down] ?? "Unknown"}`,
      `Recall: ${RATING_LABELS[skills.recall] ?? "Unknown"}`,
      `Leave it: ${RATING_LABELS[skills.leaveIt] ?? "Unknown"}`,
      `Loose lead walking: ${RATING_LABELS[skills.looseLead] ?? "Unknown"}`,
      `Crate comfort: ${RATING_LABELS[skills.crate] ?? "Unknown"}`,
      `Socialisation: ${RATING_LABELS[skills.socialisation] ?? "Unknown"}`,
    ].join("\n");

    const systemPrompt =
      "You are a UK puppy training expert. Based on the puppy's age, breed, and self-reported training progress, provide a concise assessment. For each skill, state whether the puppy is ahead, on track, or needs more focus compared to typical expectations for this breed and age. Then give 2-3 practical training tips for the skills that need the most work. Be warm, encouraging, and specific. Use UK training standards (Kennel Club Good Citizen scheme). Keep the total response under 250 words.";

    const userPrompt = [
      `Puppy name: ${name}`,
      `Breed: ${breed ?? "mixed breed"}`,
      `Age: ${ageInWeeks} weeks`,
      `Gender: ${gender ?? "Boy"}`,
      "",
      "Self-reported skill levels this week:",
      skillLines,
    ].join("\n");

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const assessment = message.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!assessment) return NextResponse.json({ error: "No assessment generated" }, { status: 502 });

    return NextResponse.json({ assessment });
  } catch (err) {
    console.error("[/api/progress] POST crashed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
