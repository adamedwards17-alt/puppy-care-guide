"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SkillRating = 1 | 2 | 3;
type SkillKey = "sit" | "down" | "recall" | "leaveIt" | "looseLead" | "crate" | "socialisation";

type PuppyProfile = {
  name: string;
  dateOfBirth: string;
  breed: string;
  gender: "Boy" | "Girl";
};

type CheckIn = {
  week: number;
  completedAt: string;
  skills: Record<SkillKey, SkillRating>;
  assessment?: string;
};

const PROFILE_STORAGE_KEY = "pawguide.profile";
const CHECKIN_STORAGE_KEY = "pawguide.checkins";

const SKILLS: { key: SkillKey; label: string; emoji: string }[] = [
  { key: "sit", label: "Sit", emoji: "🐾" },
  { key: "down", label: "Down", emoji: "🐾" },
  { key: "recall", label: "Recall", emoji: "📣" },
  { key: "leaveIt", label: "Leave it", emoji: "✋" },
  { key: "looseLead", label: "Loose lead", emoji: "🦮" },
  { key: "crate", label: "Crate comfort", emoji: "🏠" },
  { key: "socialisation", label: "Socialisation", emoji: "🐶" },
];

const RATING_OPTIONS: { value: SkillRating; label: string; color: "red" | "amber" | "green" }[] = [
  { value: 1, label: "Needs work", color: "red" },
  { value: 2, label: "Getting there", color: "amber" },
  { value: 3, label: "Nailed it", color: "green" },
];

function calcWeekNumber(dob: string): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

function loadCheckins(): CheckIn[] {
  try {
    const raw = localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckIn[]) : [];
  } catch {
    return [];
  }
}

export default function CheckInPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PuppyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Partial<Record<SkillKey, SkillRating>>>({});
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) { router.replace("/profile"); return; }
      const parsed = JSON.parse(raw) as Partial<PuppyProfile> | null;
      if (!parsed?.name || !parsed?.dateOfBirth) { router.replace("/profile"); return; }

      const p: PuppyProfile = {
        name: String(parsed.name),
        dateOfBirth: String(parsed.dateOfBirth),
        breed: String(parsed.breed ?? ""),
        gender: parsed.gender === "Girl" ? "Girl" : "Boy",
      };

      const week = calcWeekNumber(p.dateOfBirth);
      if (loadCheckins().some((c) => c.week === week)) {
        router.replace("/progress");
        return;
      }

      setProfile(p);
    } catch {
      // fall through — show empty state
    }
    setLoaded(true);
  }, [router]);

  const weekNum = useMemo(
    () => (profile ? calcWeekNumber(profile.dateOfBirth) : null),
    [profile],
  );

  const allRated = useMemo(
    () => SKILLS.every((s) => ratings[s.key] !== undefined),
    [ratings],
  );

  async function handleSubmit() {
    if (!profile || !allRated || weekNum === null) return;
    setSubmitting(true);
    setError(null);

    const skills: Record<SkillKey, SkillRating> = {
      sit: ratings.sit!,
      down: ratings.down!,
      recall: ratings.recall!,
      leaveIt: ratings.leaveIt!,
      looseLead: ratings.looseLead!,
      crate: ratings.crate!,
      socialisation: ratings.socialisation!,
    };

    let assessment = "";
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skills,
          name: profile.name,
          breed: profile.breed,
          ageInWeeks: weekNum,
          gender: profile.gender,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { assessment?: unknown };
        if (typeof data.assessment === "string") assessment = data.assessment;
      }
    } catch {
      // fall through with empty assessment — still save locally
    }

    const checkin: CheckIn = { week: weekNum, completedAt: new Date().toISOString(), skills, assessment };
    const existing = loadCheckins().filter((c) => c.week !== weekNum);
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify([...existing, checkin]));
    router.push("/progress");
  }

  if (!loaded) {
    return <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900" />;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-amber-50/80 backdrop-blur">
          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 ring-1 ring-zinc-200/60 text-zinc-600 hover:bg-white transition"
              >
                <BackIcon className="h-5 w-5" />
              </button>
              <div className="leading-tight">
                <div className="text-base font-semibold tracking-tight">
                  Week {weekNum ?? "—"} Training Check-in
                </div>
                <div className="text-xs font-medium text-zinc-600">{profile?.name}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-3 px-4 pb-36 pt-4">
          {SKILLS.map(({ key, label, emoji }) => (
            <SkillCard
              key={key}
              label={label}
              emoji={emoji}
              value={ratings[key] ?? null}
              onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
            />
          ))}

          {error && (
            <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-200/60">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => { void handleSubmit(); }}
              disabled={!allRated || submitting}
              className={[
                "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition",
                allRated && !submitting
                  ? "bg-emerald-600 text-white ring-emerald-700/20 hover:bg-emerald-700"
                  : "bg-zinc-200/80 text-zinc-500 ring-zinc-300/60",
              ].join(" ")}
            >
              {submitting
                ? "Getting assessment…"
                : `See how ${profile?.name ?? "your puppy"}'s doing`}
            </button>
          </div>
          <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
        </div>
      </div>
    </div>
  );
}

function SkillCard({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  value: SkillRating | null;
  onChange: (v: SkillRating) => void;
}) {
  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg leading-none">{emoji}</span>
        <span className="text-sm font-semibold text-zinc-900">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {RATING_OPTIONS.map(({ value: v, label: l, color }) => (
          <RatingButton key={v} label={l} color={color} active={value === v} onClick={() => onChange(v)} />
        ))}
      </div>
    </div>
  );
}

function RatingButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: "red" | "amber" | "green";
  active: boolean;
  onClick: () => void;
}) {
  const styles: Record<string, string> = {
    red: active
      ? "bg-red-100 text-red-900 ring-red-300/70"
      : "bg-white/70 text-zinc-600 ring-zinc-200/70 hover:bg-red-50",
    amber: active
      ? "bg-amber-100 text-amber-900 ring-amber-300/70"
      : "bg-white/70 text-zinc-600 ring-zinc-200/70 hover:bg-amber-50",
    green: active
      ? "bg-emerald-100 text-emerald-900 ring-emerald-300/70"
      : "bg-white/70 text-zinc-600 ring-zinc-200/70 hover:bg-emerald-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={["rounded-2xl px-2 py-2.5 text-xs font-semibold ring-1 transition text-center", styles[color]].join(" ")}
    >
      {label}
    </button>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
    </svg>
  );
}
