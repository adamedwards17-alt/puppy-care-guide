"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PuppyProfile = {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  breed: string;
  gender: "Boy" | "Girl";
};

const PROFILE_STORAGE_KEY = "pawguide.profile";

const UK_TOP_BREEDS = [
  "Labrador Retriever",
  "French Bulldog",
  "Cocker Spaniel",
  "Bulldog",
  "Dachshund",
  "Golden Retriever",
  "German Shepherd",
  "Staffordshire Bull Terrier",
  "Miniature Schnauzer",
  "Chihuahua",
  "Pug",
  "Border Collie",
  "Whippet",
  "Beagle",
  "Shih Tzu",
  "Boxer",
  "Cavalier King Charles Spaniel",
  "Cockapoo",
  "Poodle",
  "Rottweiler",
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function calcAgeWeeks(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const weeks = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, weeks);
}

export default function ProfileViewPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<PuppyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  // draft state for edit mode
  const [draftName, setDraftName] = useState("");
  const [draftDob, setDraftDob] = useState("");
  const [draftBreed, setDraftBreed] = useState("");
  const [draftGender, setDraftGender] = useState<"Boy" | "Girl">("Boy");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PuppyProfile> | null;
      if (parsed?.name) {
        const p: PuppyProfile = {
          name: String(parsed.name),
          dateOfBirth: String(parsed.dateOfBirth ?? ""),
          breed: String(parsed.breed ?? ""),
          gender: parsed.gender === "Girl" ? "Girl" : "Boy",
        };
        setProfile(p);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function startEditing() {
    if (!profile) return;
    setDraftName(profile.name);
    setDraftDob(profile.dateOfBirth);
    setDraftBreed(profile.breed);
    setDraftGender(profile.gender);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  const canSave = useMemo(
    () => draftName.trim().length > 0 && draftDob.trim().length > 0 && draftBreed.trim().length > 0,
    [draftName, draftDob, draftBreed],
  );

  function saveEdits() {
    if (!canSave) return;
    const updated: PuppyProfile = {
      name: draftName.trim(),
      dateOfBirth: draftDob,
      breed: draftBreed.trim(),
      gender: draftGender,
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    setProfile(updated);
    setEditing(false);
  }

  const ageWeeks = useMemo(() => (profile ? calcAgeWeeks(profile.dateOfBirth) : null), [profile]);

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900" />
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-amber-50/80 backdrop-blur">
          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 shadow-sm ring-1 ring-emerald-200/60">
                  <PawIcon className="h-5 w-5 text-emerald-800" />
                </div>
                <div className="leading-tight">
                  <div className="text-base font-semibold tracking-tight">
                    {profile?.name ?? "Your puppy"}
                  </div>
                  <div className="text-xs font-medium text-zinc-600">Profile</div>
                </div>
              </div>
              {!editing && profile && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60 hover:bg-white transition"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4">
          {!profile && !editing ? (
            <div className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-zinc-200/60 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 ring-1 ring-amber-200/60">
                <PawIcon className="h-7 w-7 text-amber-800" />
              </div>
              <p className="text-sm font-medium text-zinc-600">No profile set up yet.</p>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="mt-4 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 hover:bg-emerald-700 transition"
              >
                Set up profile
              </button>
            </div>
          ) : editing ? (
            <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
              <div className="space-y-4">
                <Field label="Puppy's name" htmlFor="draftName">
                  <input
                    id="draftName"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Hugo"
                    autoComplete="off"
                    className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </Field>

                <Field label="Date of birth" htmlFor="draftDob">
                  <input
                    id="draftDob"
                    type="date"
                    value={draftDob}
                    onChange={(e) => setDraftDob(e.target.value)}
                    className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </Field>

                <Field label="Breed" htmlFor="draftBreed">
                  <input
                    id="draftBreed"
                    type="text"
                    value={draftBreed}
                    onChange={(e) => setDraftBreed(e.target.value)}
                    placeholder="Start typing…"
                    list="breedOptions"
                    autoComplete="off"
                    className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <datalist id="breedOptions">
                    {UK_TOP_BREEDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Gender" htmlFor="draftGender">
                  <div className="grid grid-cols-2 gap-2">
                    <GenderOption active={draftGender === "Boy"} label="Boy" onClick={() => setDraftGender("Boy")} />
                    <GenderOption active={draftGender === "Girl"} label="Girl" onClick={() => setDraftGender("Girl")} />
                  </div>
                </Field>
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-zinc-200/60">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-3xl bg-amber-100 ring-1 ring-amber-200/60 shadow-sm">
                    <PawIcon className="h-8 w-8 text-amber-800" />
                  </div>
                  <div>
                    <div className="text-xl font-bold tracking-tight text-zinc-900">{profile!.name}</div>
                    {ageWeeks !== null && (
                      <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                        {ageWeeks} weeks old
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-3xl bg-white/80 shadow-sm ring-1 ring-zinc-200/60 overflow-hidden">
                <DetailRow
                  icon={<CakeIcon className="h-4 w-4" />}
                  label="Date of birth"
                  value={formatDate(profile!.dateOfBirth)}
                  tone="amber"
                />
                <DetailRow
                  icon={<PawOutlineIcon className="h-4 w-4" />}
                  label="Breed"
                  value={profile!.breed || "—"}
                  tone="emerald"
                  divider
                />
                <DetailRow
                  icon={<HeartIcon className="h-4 w-4" />}
                  label="Gender"
                  value={profile!.gender}
                  tone="emerald"
                  divider
                />
              </section>
            </>
          )}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="grid grid-cols-5 px-2 py-3">
            <BottomTab label="Routine" icon={<ClockIcon className="h-5 w-5" />} onClick={() => router.push("/")} />
            <BottomTab label="Ask" icon={<ChatIcon className="h-5 w-5" />} onClick={() => router.push("/ask")} />
            <BottomTab label="Potty" icon={<PawOutlineIcon className="h-5 w-5" />} />
            <BottomTab label="Tips" icon={<HeartIcon className="h-5 w-5" />} />
            <BottomTab label="Profile" active icon={<UserIcon className="h-5 w-5" />} />
          </div>
          {editing ? (
            <div className="absolute inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
              <div className="grid grid-cols-2 gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200/70 hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdits}
                  disabled={!canSave}
                  className={[
                    "rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition",
                    canSave
                      ? "bg-emerald-600 text-white ring-emerald-700/20 hover:bg-emerald-700"
                      : "bg-zinc-200/80 text-zinc-500 ring-zinc-300/60",
                  ].join(" ")}
                >
                  Save
                </button>
              </div>
              <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
            </div>
          ) : (
            <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
          )}
        </nav>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  tone,
  divider,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "amber";
  divider?: boolean;
}) {
  const iconStyles =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200/70"
      : "bg-amber-100 text-amber-800 ring-amber-200/70";

  return (
    <div className={["flex items-center gap-3 px-4 py-3.5", divider ? "border-t border-zinc-200/60" : ""].join(" ")}>
      <div className={["grid h-9 w-9 place-items-center rounded-2xl ring-1 shrink-0", iconStyles].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block px-1 text-xs font-semibold tracking-tight text-zinc-800">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function GenderOption({ label, active, onClick }: { label: "Boy" | "Girl"; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition",
        active ? "bg-emerald-100 text-emerald-900 ring-emerald-200/70" : "bg-white/70 text-zinc-700 ring-zinc-200/70 hover:bg-white",
      ].join(" ")}
    >
      {label}
    </button>
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
        "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold",
        active ? "text-emerald-900" : "text-zinc-500",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-10 w-10 place-items-center rounded-2xl ring-1",
          active ? "bg-emerald-100 text-emerald-900 ring-emerald-200/70" : "bg-zinc-50 text-zinc-500 ring-zinc-200/70",
        ].join(" ")}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8.7 10.2c1.1 0 2-1 2-2.2S9.8 5.8 8.7 5.8s-2 1-2 2.2 0 2.2 2 2.2Zm6.6 0c1.1 0 2-1 2-2.2s-.9-2.2-2-2.2-2 1-2 2.2.9 2.2 2 2.2ZM6.2 13.3c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .7 2 1.7 2Zm11.6 0c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .8 2 1.7 2ZM12 12.1c-2.3 0-4.5 1.7-4.5 3.8 0 1.6 1.4 2.7 3 2.7 1.3 0 1.7-.4 1.5-1.3-.2-.8.4-1.6 1.4-1.6s1.6.8 1.4 1.6c-.2.9.2 1.3 1.5 1.3 1.6 0 3-1.1 3-2.7 0-2.1-2.2-3.8-4.5-3.8Z" />
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

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 6a2 2 0 1 1 4 0M12 6a2 2 0 1 1 4 0M5 10a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Zm1 5v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2a5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 2.236 4.472A5 5 0 0 1 6 15Z" />
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
