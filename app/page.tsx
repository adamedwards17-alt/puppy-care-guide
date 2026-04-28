"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PuppyProfile = {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  breed: string;
};

type SkillRating = 1 | 2 | 3;
type SkillKey = "sit" | "down" | "recall" | "leaveIt" | "looseLead" | "crate" | "socialisation";

type CheckIn = {
  week: number;
  completedAt: string;
  skills: Record<SkillKey, SkillRating>;
  assessment?: string;
};

const PROFILE_STORAGE_KEY = "pawguide.profile";
const CHECKIN_STORAGE_KEY = "pawguide.checkins";

const FALLBACK_POTTY_TIP =
  "At 8 weeks, plan an outside trip right after waking, after eating, after play, and about every 30–60 minutes when awake.";

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<PuppyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pottyAdvice, setPottyAdvice] = useState<string | null>(null);
  const [pottyAdviceLoading, setPottyAdviceLoading] = useState(false);
  const lastPottyAdviceKeyRef = useRef<string | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    queueMicrotask(() => setNowMs(Date.now()));

    (async () => {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) {
          queueMicrotask(() => setLoaded(true));
          router.replace("/profile");
          return;
        }
        const parsed = JSON.parse(raw) as Partial<PuppyProfile> | null;
        if (!parsed?.name || !parsed?.dateOfBirth) {
          queueMicrotask(() => setLoaded(true));
          router.replace("/profile");
          return;
        }
        queueMicrotask(() => {
          setProfile({
            name: String(parsed.name),
            dateOfBirth: String(parsed.dateOfBirth),
            breed: String(parsed.breed ?? ""),
          });
          setLoaded(true);
          try {
            const rawC = localStorage.getItem(CHECKIN_STORAGE_KEY);
            if (rawC) {
              const c = JSON.parse(rawC);
              if (Array.isArray(c)) setCheckins(c as CheckIn[]);
            }
          } catch {
            // ignore
          }
        });
      } catch {
        queueMicrotask(() => setLoaded(true));
        router.replace("/profile");
      }
    })();
  }, []);

  const ageWeeks = useMemo(() => {
    if (!profile?.dateOfBirth || nowMs === null) return null;
    const dob = new Date(profile.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const diffMs = nowMs - dob.getTime();
    const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, weeks);
  }, [profile, nowMs]);

  const showBanner = useMemo(() => {
    if (!profile || ageWeeks === null || bannerDismissed) return false;
    return !checkins.some((c) => c.week === ageWeeks);
  }, [profile, ageWeeks, bannerDismissed, checkins]);

  useEffect(() => {
    if (!profile?.name || ageWeeks === null) return;

    const key = JSON.stringify({ name: profile.name, breed: profile.breed ?? "", ageWeeks });
    if (lastPottyAdviceKeyRef.current === key) return;
    lastPottyAdviceKeyRef.current = key;

    const controller = new AbortController();
    queueMicrotask(() => {
      setPottyAdviceLoading(true);
      setPottyAdvice(null);
    });

    (async () => {
      try {
        const res = await fetch("/api/advice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: profile.name,
            breed: profile.breed ?? "",
            ageInWeeks: ageWeeks,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Advice request failed: ${res.status}`);
        const data = (await res.json()) as { advice?: unknown };
        if (typeof data.advice !== "string" || data.advice.trim().length === 0) {
          throw new Error("Advice response missing 'advice'");
        }
        setPottyAdvice(data.advice.trim());
      } catch {
        setPottyAdvice(FALLBACK_POTTY_TIP);
      } finally {
        setPottyAdviceLoading(false);
      }
    })();

    return () => controller.abort();
  }, [profile?.name, profile?.breed, ageWeeks]);

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900" />
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-amber-50/80 backdrop-blur">
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 shadow-sm ring-1 ring-emerald-200/60">
                  <PawIcon className="h-5 w-5 text-emerald-800" />
                </div>
                <div className="leading-tight">
                  <div className="text-base font-semibold tracking-tight">{profile?.name ?? "Pawguide"}</div>
                  <div className="text-xs font-medium text-zinc-600">
                    {ageWeeks === null ? "Daily routine for your puppy" : `Daily routine for a ${ageWeeks}-week puppy`}
                  </div>
                </div>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                Today
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-24 pt-4">
          {showBanner && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50/90 p-3.5 ring-1 ring-amber-200/70">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Time for {profile!.name}&apos;s weekly training check-in 🐾
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/checkin")}
                  className="mt-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 hover:bg-emerald-700 transition"
                >
                  Start check-in
                </button>
              </div>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-xl text-amber-700 hover:bg-amber-100/80 transition"
                aria-label="Dismiss"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Daily routine</h1>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Short cycles keep potty accidents down and naps predictable: wake → potty → eat → potty → play → nap.
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 ring-1 ring-amber-200/70">
                <SunIcon className="h-5 w-5 text-amber-800" />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <QuickTip
                tone="emerald"
                title="Potty pacing"
                body={
                  pottyAdviceLoading
                    ? `Getting advice for ${profile?.name ?? "your puppy"}...`
                    : (pottyAdvice ?? FALLBACK_POTTY_TIP)
                }
                icon={<DropletIcon className="h-4 w-4" />}
              />
              <QuickTip
                tone="amber"
                title="Evening wind-down"
                body="Remove water around 7:00 pm, keep play gentle, and do a calm final outside trip before the bedtime crate."
                icon={<MoonIcon className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-800">Sample schedule</h2>
              <div className="text-xs font-medium text-zinc-600">Adjust by 15–30 min</div>
            </div>

            <div className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-zinc-200/60">
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">A typical day</div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {ageWeeks === null ? "Puppy schedule" : `${ageWeeks} weeks old`}
                  </div>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  You’ll repeat the same mini-routine blocks through the day. The exact times can flex — the order matters most.
                </p>
              </div>

              <ol className="mt-2 divide-y divide-zinc-200/70 px-2 pb-2">
                <ScheduleRow
                  time="6:30 am"
                  title="Wake up"
                  detail="Quiet hello, straight outside."
                  tone="emerald"
                  icon={<SparkIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="6:35 am"
                  title="Outside to pee/poop"
                  detail="Reward immediately, then back inside."
                  tone="emerald"
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="6:45 am"
                  title="Breakfast"
                  detail="Meal #1, then offer a few minutes of calm."
                  tone="amber"
                  icon={<BowlIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="6:55 am"
                  title="Outside to pee"
                  detail="Most puppies need to go right after eating."
                  tone="emerald"
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="7:10 am"
                  title="Play + training"
                  detail="5–10 minutes of name game/sit, then gentle play."
                  tone="zinc"
                  icon={<BallIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="7:45 am"
                  title="Crate nap"
                  detail="1–2 hours. Dark, quiet, comfy."
                  tone="zinc"
                  icon={<CrateIcon className="h-4 w-4" />}
                />

                <ScheduleDivider label="Repeat this block through the day" />

                <ScheduleRow
                  time="9:30 am"
                  title="Wake → outside to pee"
                  detail="Straight out, then back in."
                  tone="emerald"
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="9:45 am"
                  title="Play + chew time"
                  detail="Chew toy on a mat, short tug, a few cues."
                  tone="zinc"
                  icon={<BoneIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="10:30 am"
                  title="Crate nap"
                  detail="Reset for the next cycle."
                  tone="zinc"
                  icon={<CrateIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="12:00 pm"
                  title="Lunch"
                  detail="Meal #2, then outside to pee."
                  tone="amber"
                  icon={<BowlIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="12:10 pm"
                  title="Outside to pee"
                  detail="Reward and keep it boring until they go."
                  tone="emerald"
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="12:30 pm"
                  title="Play + social time"
                  detail="Carry outdoors, meet a calm friend, hear new sounds."
                  tone="zinc"
                  icon={<HeartIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="1:15 pm"
                  title="Crate nap"
                  detail="Aim for another 1–2 hours."
                  tone="zinc"
                  icon={<CrateIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="3:30 pm"
                  title="Wake → outside to pee"
                  detail="Then a short play session."
                  tone="emerald"
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="5:30 pm"
                  title="Dinner"
                  detail="Meal #3, then outside to pee."
                  tone="amber"
                  icon={<BowlIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="7:00 pm"
                  title="Water removed"
                  detail="Small sips with dinner are fine; then pick up the bowl."
                  tone="amber"
                  icon={<DropletIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="8:30 pm"
                  title="Final outside trip"
                  detail="Slow, calm potty break. No big play."
                  tone="emerald"
                  icon={<MoonIcon className="h-4 w-4" />}
                />
                <ScheduleRow
                  time="9:00 pm"
                  title="Bedtime crate"
                  detail="Into the crate with a safe chew. Lights down."
                  tone="zinc"
                  icon={<CrateIcon className="h-4 w-4" />}
                />
              </ol>
            </div>
          </section>

          <section className="mt-4 rounded-3xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200/60">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 ring-1 ring-emerald-200/70">
                <CheckIcon className="h-5 w-5 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-emerald-950">
                  Quick success checklist
                </h2>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-emerald-950/80">
                  <li className="flex gap-2">
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-700" />
                    Take them outside every time they wake up — even from a 10‑minute doze.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-700" />
                    Keep play short and end it with a calm crate nap before they get bitey.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-700" />
                    If you’re unsure, choose “outside” first — it’s the easiest win.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="grid grid-cols-6 px-1 py-3">
            <BottomTab label="Routine" active icon={<ClockIcon className="h-5 w-5" />} />
            <BottomTab label="Ask" icon={<ChatIcon className="h-5 w-5" />} onClick={() => router.push("/ask")} />
            <BottomTab label="Potty" icon={<PawOutlineIcon className="h-5 w-5" />} />
            <BottomTab label="Tips" icon={<HeartIcon className="h-5 w-5" />} />
            <BottomTab label="Progress" icon={<ChartIcon className="h-5 w-5" />} onClick={() => router.push("/progress")} />
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
  icon: ReactNode;
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
          "grid h-10 w-10 place-items-center rounded-2xl ring-1",
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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5 4A4.5 4.5 0 0 0 2 8.5v4A4.5 4.5 0 0 0 6.5 17H7v2a1 1 0 0 0 1.6.8L12 17h5.5A4.5 4.5 0 0 0 22 12.5v-4A4.5 4.5 0 0 0 17.5 4h-11ZM6 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
    </svg>
  );
}

function QuickTip({
  title,
  body,
  icon,
  tone,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone: "emerald" | "amber";
}) {
  const styles =
    tone === "emerald"
      ? {
          wrap: "bg-emerald-50/80 ring-emerald-200/70 text-emerald-950",
          icon: "bg-white/80 ring-emerald-200/70 text-emerald-800",
          text: "text-emerald-950/80",
        }
      : {
          wrap: "bg-amber-50/80 ring-amber-200/70 text-amber-950",
          icon: "bg-white/80 ring-amber-200/70 text-amber-800",
          text: "text-amber-950/80",
        };

  return (
    <div className={["rounded-2xl p-3 ring-1", styles.wrap].join(" ")}>
      <div className="flex items-start gap-3">
        <div className={["grid h-9 w-9 place-items-center rounded-2xl ring-1", styles.icon].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <p className={["mt-0.5 text-sm leading-6", styles.text].join(" ")}>{body}</p>
        </div>
      </div>
    </div>
  );
}

function ScheduleDivider({ label }: { label: string }) {
  return (
    <li className="px-2 py-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200/80" />
        <div className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200/70">
          {label}
        </div>
        <div className="h-px flex-1 bg-zinc-200/80" />
      </div>
    </li>
  );
}

function ScheduleRow({
  time,
  title,
  detail,
  icon,
  tone,
}: {
  time: string;
  title: string;
  detail: string;
  icon: ReactNode;
  tone: "emerald" | "amber" | "zinc";
}) {
  const toneStyles =
    tone === "emerald"
      ? {
          badge: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
          icon: "bg-emerald-100 text-emerald-900 ring-emerald-200/70",
        }
      : tone === "amber"
        ? {
            badge: "bg-amber-50 text-amber-900 ring-amber-200/70",
            icon: "bg-amber-100 text-amber-900 ring-amber-200/70",
          }
        : {
            badge: "bg-zinc-50 text-zinc-700 ring-zinc-200/70",
            icon: "bg-zinc-100 text-zinc-700 ring-zinc-200/70",
          };

  return (
    <li className="px-2">
      <div className="flex items-start gap-3 rounded-2xl px-2 py-3">
        <div className={["mt-0.5 grid h-9 w-9 place-items-center rounded-2xl ring-1", toneStyles.icon].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
              <div className="mt-0.5 text-sm leading-6 text-zinc-600">{detail}</div>
            </div>
            <div className={["shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", toneStyles.badge].join(" ")}>
              {time}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8.7 10.2c1.1 0 2-1 2-2.2S9.8 5.8 8.7 5.8s-2 1-2 2.2 0 2.2 2 2.2Zm6.6 0c1.1 0 2-1 2-2.2s-.9-2.2-2-2.2-2 1-2 2.2.9 2.2 2 2.2ZM6.2 13.3c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .7 2 1.7 2Zm11.6 0c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .8 2 1.7 2ZM12 12.1c-2.3 0-4.5 1.7-4.5 3.8 0 1.6 1.4 2.7 3 2.7 1.3 0 1.7-.4 1.5-1.3-.2-.8.4-1.6 1.4-1.6s1.6.8 1.4 1.6c-.2.9.2 1.3 1.5 1.3 1.6 0 3-1.1 3-2.7 0-2.1-2.2-3.8-4.5-3.8Z" />
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

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 18a6 6 0 1 0-6-6 6 6 0 0 0 6 6Zm0-16a1 1 0 0 1 1 1v1.25a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1Zm0 18.75a1 1 0 0 1 1 1V23a1 1 0 0 1-2 0v-1.25a1 1 0 0 1 1-1ZM4.22 4.22a1 1 0 0 1 1.42 0l.88.88a1 1 0 1 1-1.42 1.42l-.88-.88a1 1 0 0 1 0-1.42Zm13.26 13.26a1 1 0 0 1 1.42 0l.88.88a1 1 0 0 1-1.42 1.42l-.88-.88a1 1 0 0 1 0-1.42ZM2 12a1 1 0 0 1 1-1h1.25a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1Zm18.75 0a1 1 0 0 1 1-1H23a1 1 0 0 1 0 2h-1.25a1 1 0 0 1-1-1ZM4.22 19.78a1 1 0 0 1 0-1.42l.88-.88a1 1 0 1 1 1.42 1.42l-.88.88a1 1 0 0 1-1.42 0ZM17.48 6.52a1 1 0 0 1 0-1.42l.88-.88a1 1 0 1 1 1.42 1.42l-.88.88a1 1 0 0 1-1.42 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.64 13.64a1 1 0 0 0-1.11-.24 7.5 7.5 0 0 1-9.93-9.93 1 1 0 0 0-1.35-1.35A9.5 9.5 0 1 0 22 14.75a1 1 0 0 0-.36-1.11Z" />
    </svg>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2s7 7.7 7 13a7 7 0 0 1-14 0C5 9.7 12 2 12 2Z" />
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

function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 10a8 8 0 0 0 16 0H4Zm0 2h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2Zm4.5-7.5a1 1 0 0 1 1 1V7h-2V5.5a1 1 0 0 1 1-1Zm7 0a1 1 0 0 1 1 1V7h-2V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.3 6.5a8.2 8.2 0 0 1-3.9 1.2A10.3 10.3 0 0 0 14.2 4a8 8 0 0 1 5.1 4.5ZM9.8 4a10.3 10.3 0 0 0-1.2 5.7 8.2 8.2 0 0 1-3.9-1.2A8 8 0 0 1 9.8 4Zm-6 6.4a10.1 10.1 0 0 0 5 1.5A10.1 10.1 0 0 0 6 17a8 8 0 0 1-2.2-6.6ZM12 20a8 8 0 0 1-4.8-1.6 8.3 8.3 0 0 1 3.4-6 12 12 0 0 0 2.8 0 8.3 8.3 0 0 1 3.4 6A8 8 0 0 1 12 20Zm6-3a10.1 10.1 0 0 0-2.8-5.1 10.1 10.1 0 0 0 5-1.5A8 8 0 0 1 18 17Z" />
    </svg>
  );
}

function CrateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm3-1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7Zm1.5 2.5a.75.75 0 0 1 .75-.75h0a.75.75 0 0 1 .75.75v7a.75.75 0 0 1-.75.75h0a.75.75 0 0 1-.75-.75v-7Zm5 0a.75.75 0 0 1 .75-.75h0a.75.75 0 0 1 .75.75v7a.75.75 0 0 1-.75.75h0a.75.75 0 0 1-.75-.75v-7Z" />
    </svg>
  );
}

function BoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.6 9.2a2.6 2.6 0 1 1 3.7-3.7l.6.6h2.2l.6-.6a2.6 2.6 0 1 1 3.7 3.7l-.6.6v2.2l.6.6a2.6 2.6 0 1 1-3.7 3.7l-.6-.6h-2.2l-.6.6a2.6 2.6 0 1 1-3.7-3.7l.6-.6V9.8l-.6-.6Zm4.2-.7v7h2.4v-7h-2.4Z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.2 16.2 4.8 11.8a1 1 0 0 1 1.4-1.4l3 3 8.6-8.6a1 1 0 1 1 1.4 1.4l-10 10a1 1 0 0 1-1.4 0Z" />
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 3v18h18M7 16v-4m4 4v-7m4 7v-2m4 2V8" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
