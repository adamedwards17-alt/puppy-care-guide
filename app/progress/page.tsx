"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

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

const RATING_LABEL: Record<SkillRating, string> = {
  1: "Needs work",
  2: "Getting there",
  3: "Nailed it",
};

const RATING_BADGE: Record<SkillRating, string> = {
  1: "bg-red-100 text-red-900 ring-red-200/70",
  2: "bg-amber-100 text-amber-900 ring-amber-200/70",
  3: "bg-emerald-100 text-emerald-900 ring-emerald-200/70",
};

const RATING_BAR: Record<SkillRating, string> = {
  1: "bg-red-400",
  2: "bg-amber-400",
  3: "bg-emerald-500",
};

function getExpected(ageInWeeks: number): Record<SkillKey, SkillRating> {
  if (ageInWeeks < 10) {
    return { sit: 1, down: 1, recall: 1, leaveIt: 1, looseLead: 1, crate: 2, socialisation: 2 };
  }
  if (ageInWeeks < 12) {
    return { sit: 2, down: 1, recall: 1, leaveIt: 1, looseLead: 1, crate: 2, socialisation: 2 };
  }
  if (ageInWeeks < 16) {
    return { sit: 2, down: 2, recall: 1, leaveIt: 1, looseLead: 2, crate: 2, socialisation: 2 };
  }
  if (ageInWeeks < 20) {
    return { sit: 3, down: 2, recall: 2, leaveIt: 2, looseLead: 2, crate: 3, socialisation: 2 };
  }
  return { sit: 3, down: 3, recall: 2, leaveIt: 2, looseLead: 3, crate: 3, socialisation: 3 };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

export default function ProgressPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PuppyProfile | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) { router.replace("/profile"); return; }
      const parsed = JSON.parse(raw) as Partial<PuppyProfile> | null;
      if (!parsed?.name || !parsed?.dateOfBirth) { router.replace("/profile"); return; }

      setProfile({
        name: String(parsed.name),
        dateOfBirth: String(parsed.dateOfBirth),
        breed: String(parsed.breed ?? ""),
        gender: parsed.gender === "Girl" ? "Girl" : "Boy",
      });
      setCheckins(loadCheckins());
    } catch {
      // fall through
    }
    setLoaded(true);
  }, [router]);

  const latest = useMemo(
    () =>
      checkins.length > 0
        ? [...checkins].sort((a, b) => b.week - a.week)[0]
        : null,
    [checkins],
  );

  const expected = useMemo(
    () => (latest ? getExpected(latest.week) : null),
    [latest],
  );

  const history = useMemo(
    () =>
      latest
        ? [...checkins].sort((a, b) => b.week - a.week).slice(1)
        : [],
    [checkins, latest],
  );

  if (!loaded) {
    return <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900" />;
  }

  if (!latest) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 ring-1 ring-amber-200/60">
            <ChartIcon className="h-7 w-7 text-amber-800" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No check-ins yet.</p>
          <button
            type="button"
            onClick={() => router.push("/checkin")}
            className="mt-4 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 hover:bg-emerald-700 transition"
          >
            Start first check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-amber-50/80 backdrop-blur">
          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 shadow-sm ring-1 ring-emerald-200/60">
                <ChartIcon className="h-5 w-5 text-emerald-800" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold tracking-tight">
                  {profile?.name}&apos;s Progress — Week {latest.week}
                </div>
                <div className="text-xs font-medium text-zinc-600">
                  Completed {formatDate(latest.completedAt)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4 space-y-3">
          {/* Skill grid */}
          <section className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-zinc-200/60 overflow-hidden">
            {SKILLS.map(({ key, label, emoji }, idx) => {
              const rating = latest.skills[key];
              const exp = expected![key];
              return (
                <div
                  key={key}
                  className={["px-4 py-3.5", idx > 0 ? "border-t border-zinc-200/60" : ""].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-base leading-none">{emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-900">{label}</span>
                        <span
                          className={["rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 shrink-0", RATING_BADGE[rating]].join(" ")}
                        >
                          {RATING_LABEL[rating]}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100 ring-1 ring-zinc-200/60">
                        <div
                          className={["h-full rounded-full transition-all", RATING_BAR[rating]].join(" ")}
                          style={{ width: `${(rating / 3) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs font-medium text-zinc-500">
                        Expected: {RATING_LABEL[exp]}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* AI assessment */}
          {latest.assessment ? (
            <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200/60">
                  <SparkIcon className="h-3.5 w-3.5 text-emerald-800" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-zinc-900">Training assessment</span>
              </div>
              <div className="text-sm text-zinc-700">
                <ReactMarkdown
                  components={{
                    p: ({ children, ...props }) => (
                      <p className="my-2 leading-6 first:mt-0 last:mb-0" {...props}>{children}</p>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="my-2 ml-5 list-disc space-y-1 marker:text-zinc-400" {...props}>{children}</ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="my-2 ml-5 list-decimal space-y-1 marker:text-zinc-400" {...props}>{children}</ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li className="pl-0.5" {...props}>{children}</li>
                    ),
                    strong: ({ children, ...props }) => (
                      <strong className="font-semibold text-zinc-900" {...props}>{children}</strong>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2 className="mb-1 mt-3 text-sm font-semibold text-zinc-900 first:mt-0" {...props}>{children}</h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3 className="mb-1 mt-3 text-sm font-semibold text-zinc-900 first:mt-0" {...props}>{children}</h3>
                    ),
                  }}
                >
                  {latest.assessment}
                </ReactMarkdown>
              </div>
            </section>
          ) : null}

          {/* History */}
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200/60 hover:bg-white transition"
            >
              <span>{showHistory ? "Hide history" : "View history"}</span>
              <ChevronIcon className={["h-4 w-4 text-zinc-400 transition-transform", showHistory ? "rotate-180" : ""].join(" ")} />
            </button>
          )}

          {showHistory && history.length > 0 && (
            <section className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-zinc-200/60 overflow-hidden">
              {history.map((c, idx) => (
                <div key={c.week} className={["px-4 py-3.5", idx > 0 ? "border-t border-zinc-200/60" : ""].join(" ")}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900">Week {c.week}</span>
                    <span className="text-xs font-medium text-zinc-500">{formatDate(c.completedAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SKILLS.map(({ key, label }) => {
                      const r = c.skills[key];
                      return r ? (
                        <span
                          key={key}
                          className={["rounded-full px-2 py-0.5 text-xs font-semibold ring-1", RATING_BADGE[r]].join(" ")}
                        >
                          {label}: {RATING_LABEL[r]}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Back to routine */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 hover:bg-emerald-700 transition"
          >
            Back to routine
          </button>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="grid grid-cols-6 px-1 py-3">
            <BottomTab label="Routine" icon={<ClockIcon className="h-5 w-5" />} onClick={() => router.push("/")} />
            <BottomTab label="Ask" icon={<ChatIcon className="h-5 w-5" />} onClick={() => router.push("/ask")} />
            <BottomTab label="Potty" icon={<PawOutlineIcon className="h-5 w-5" />} />
            <BottomTab label="Tips" icon={<HeartIcon className="h-5 w-5" />} />
            <BottomTab label="Progress" active icon={<ChartIcon className="h-5 w-5" />} />
            <BottomTab label="Profile" icon={<UserIcon className="h-5 w-5" />} onClick={() => router.push("/profile-view")} />
          </div>
          <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
        </nav>
      </div>
    </div>
  );
}

function BottomTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-semibold",
        active ? "text-emerald-900" : "text-zinc-500",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-9 w-9 place-items-center rounded-2xl ring-1",
          active
            ? "bg-emerald-100 text-emerald-900 ring-emerald-200/70"
            : "bg-zinc-50 text-zinc-500 ring-zinc-200/70",
        ].join(" ")}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 3v18h18M7 16v-4m4 4v-7m4 7v-2m4 2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l1.3 6.3L20 12l-6.7 3.7L12 22l-1.3-6.3L4 12l6.7-3.7L12 2Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm.75 5.25a.75.75 0 0 0-1.5 0V12c0 .2.08.39.22.53l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.03-3.03Z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5 4A4.5 4.5 0 0 0 2 8.5v4A4.5 4.5 0 0 0 6.5 17H7v2a1 1 0 0 0 1.6.8L12 17h5.5A4.5 4.5 0 0 0 22 12.5v-4A4.5 4.5 0 0 0 17.5 4h-11ZM6 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21s-7-4.4-9.2-9.3C1.1 8.2 3.1 5 6.5 5c1.9 0 3.2 1 3.9 2.1C11.3 6 12.6 5 14.5 5 17.9 5 19.9 8.2 21.2 11.7 19 16.6 12 21 12 21Z" />
    </svg>
  );
}

function PawOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.7 10.1c1 0 1.8-.9 1.8-2s-.8-2-1.8-2-1.8.9-1.8 2 .8 2 1.8 2Zm6.6 0c1 0 1.8-.9 1.8-2s-.8-2-1.8-2-1.8.9-1.8 2 .8 2 1.8 2ZM6.3 13.2c.8 0 1.5-.8 1.5-1.8s-.7-1.8-1.5-1.8-1.5.8-1.5 1.8.6 1.8 1.5 1.8Zm11.4 0c.8 0 1.5-.8 1.5-1.8s-.7-1.8-1.5-1.8-1.5.8-1.5 1.8.7 1.8 1.5 1.8ZM12 12.2c-2.1 0-4 1.5-4 3.4 0 1.4 1.2 2.4 2.6 2.4 1.1 0 1.5-.3 1.4-1.1-.2-.7.3-1.4 1.2-1.4s1.4.7 1.2 1.4c-.2.8.2 1.1 1.4 1.1 1.4 0 2.6-1 2.6-2.4 0-1.9-1.9-3.4-4-3.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
    </svg>
  );
}
