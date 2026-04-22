"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PuppyProfile = {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  breed: string;
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

export default function ProfilePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [breed, setBreed] = useState("");

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && dateOfBirth.trim().length > 0 && breed.trim().length > 0;
  }, [breed, dateOfBirth, name]);

  function saveProfile(profile: PuppyProfile) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900">
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-amber-50/80 backdrop-blur">
          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 shadow-sm ring-1 ring-emerald-200/60">
                <PawIcon className="h-5 w-5 text-emerald-800" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold tracking-tight">Tell us about your puppy</div>
                <div className="text-xs font-medium text-zinc-600">This helps tailor routines and tips.</div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4">
          <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmit) return;
                saveProfile({ name: name.trim(), dateOfBirth, breed: breed.trim() });
                router.push("/");
              }}
            >
              <Field label="Puppy’s name" htmlFor="puppyName">
                <input
                  id="puppyName"
                  name="puppyName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mochi"
                  autoComplete="off"
                  className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  required
                />
              </Field>

              <Field label="Date of birth" htmlFor="dateOfBirth">
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  required
                />
              </Field>

              <Field label="Breed" htmlFor="breed">
                <input
                  id="breed"
                  name="breed"
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="Start typing…"
                  list="ukBreedOptions"
                  autoComplete="off"
                  className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  required
                />
                <datalist id="ukBreedOptions">
                  {UK_TOP_BREEDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>

              <div className="pt-1 text-xs font-medium text-zinc-600">
                You can change this later — we just need a starting point.
              </div>

              <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
                <div className="px-4 py-3">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                      "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition",
                      canSubmit
                        ? "bg-emerald-600 text-white ring-emerald-700/20 hover:bg-emerald-700"
                        : "bg-zinc-200/80 text-zinc-500 ring-zinc-300/60",
                    ].join(" ")}
                  >
                    Let’s go
                  </button>
                </div>
                <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
              </div>
            </form>
          </section>
        </main>
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

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8.7 10.2c1.1 0 2-1 2-2.2S9.8 5.8 8.7 5.8s-2 1-2 2.2 0 2.2 2 2.2Zm6.6 0c1.1 0 2-1 2-2.2s-.9-2.2-2-2.2-2 1-2 2.2.9 2.2 2 2.2ZM6.2 13.3c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .7 2 1.7 2Zm11.6 0c.9 0 1.7-.9 1.7-2s-.8-2-1.7-2-1.7.9-1.7 2 .8 2 1.7 2ZM12 12.1c-2.3 0-4.5 1.7-4.5 3.8 0 1.6 1.4 2.7 3 2.7 1.3 0 1.7-.4 1.5-1.3-.2-.8.4-1.6 1.4-1.6s1.6.8 1.4 1.6c-.2.9.2 1.3 1.5 1.3 1.6 0 3-1.1 3-2.7 0-2.1-2.2-3.8-4.5-3.8Z" />
    </svg>
  );
}

