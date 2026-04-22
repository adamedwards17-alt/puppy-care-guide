"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type PuppyProfile = {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  breed: string;
  gender?: "Boy" | "Girl";
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PROFILE_STORAGE_KEY = "pawguide.profile";

export default function AskPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PuppyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) {
          setLoaded(true);
          router.replace("/profile");
          return;
        }
        const parsed = JSON.parse(raw) as Partial<PuppyProfile> | null;
        if (!parsed?.name || !parsed?.dateOfBirth) {
          setLoaded(true);
          router.replace("/profile");
          return;
        }
        setProfile({
          name: String(parsed.name),
          dateOfBirth: String(parsed.dateOfBirth),
          breed: String(parsed.breed ?? ""),
          gender: parsed.gender === "Boy" || parsed.gender === "Girl" ? parsed.gender : undefined,
        });
        setLoaded(true);
      } catch {
        setLoaded(true);
        router.replace("/profile");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const maybeCtor = (window.SpeechRecognition ??
      window.webkitSpeechRecognition) as unknown as SpeechRecognitionConstructor | undefined;

    if (!maybeCtor) {
      setSpeechSupported(false);
      recognitionRef.current = null;
      return;
    }

    setSpeechSupported(true);
    const rec = new maybeCtor();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text.trim().length === 0) return;
      setDraft((prev) => (prev ? `${prev.replace(/\s+$/g, "")} ${text.trimStart()}` : text.trimStart()));
      textareaRef.current?.focus();
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const ageInWeeks = useMemo(() => {
    if (!profile?.dateOfBirth) return null;
    const dob = new Date(profile.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, weeks);
  }, [profile?.dateOfBirth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loading]);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    if (!profile?.name) return;

    setError(null);
    setDraft("");
    setLoading(true);
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          name: profile.name,
          breed: profile.breed ?? "",
          ageInWeeks: ageInWeeks ?? 0,
          gender: profile.gender ?? "Boy",
        }),
      });

      if (!res.ok) throw new Error(`Ask request failed: ${res.status}`);
      const data = (await res.json()) as { answer?: unknown };
      const answer = data.answer;
      if (typeof answer !== "string" || answer.trim().length === 0) {
        throw new Error("Ask response missing 'answer'");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer.trim() }]);
    } catch {
      setError("Sorry — I couldn’t get an answer just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-zinc-50 to-emerald-50 font-sans text-zinc-900" />
    );
  }

  const puppyName = profile?.name ?? "your puppy";

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
                <div className="text-base font-semibold tracking-tight">{`Ask about ${puppyName}`}</div>
                <div className="text-xs font-medium text-zinc-600">Help &amp; Q&amp;A</div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4">
          <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
            <div className="text-sm leading-6 text-zinc-700">
              {`Hi! Ask me anything about ${puppyName}. I’ll remember what we’ve talked about during this session.`}
            </div>
          </section>

          {messages.length > 0 ? (
            <div className="mt-4 space-y-3">
              {messages.map((m, idx) => (
                <ChatBubble key={idx} role={m.role} content={m.content} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200/60">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 ring-1 ring-emerald-200/70">
                  <SparkIcon className="h-5 w-5 text-emerald-800" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight text-emerald-950">
                    Try a quick question
                  </div>
                  <div className="mt-1 text-sm leading-6 text-emerald-950/80">
                    “How often should we take {puppyName} out for wee breaks today?”
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/60">
              <div className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
                Thinking…
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-3xl bg-amber-50/80 p-4 ring-1 ring-amber-200/70">
              <div className="text-sm font-medium text-amber-900">{error}</div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-zinc-200/70 bg-white/80 backdrop-blur">
          <div className="px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Ask about ${puppyName}…`}
                rows={1}
                className="min-h-[44px] w-full resize-none rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={loading}
              />
              {speechSupported ? (
                <button
                  type="button"
                  onClick={() => {
                    const rec = recognitionRef.current;
                    if (!rec) return;
                    if (loading) return;

                    if (listening) {
                      try {
                        rec.stop();
                      } catch {
                        // ignore
                      }
                      setListening(false);
                      return;
                    }

                    try {
                      setListening(true);
                      rec.start();
                    } catch {
                      setListening(false);
                    }
                  }}
                  disabled={loading}
                  className={[
                    "relative grid h-11 w-11 place-items-center rounded-full text-sm font-semibold shadow-sm ring-1 transition focus:outline-none focus:ring-2",
                    listening
                      ? "bg-emerald-600 text-white ring-emerald-700/20 focus:ring-emerald-300"
                      : "bg-emerald-100 text-emerald-900 ring-emerald-200/70 hover:bg-emerald-200/70 focus:ring-emerald-200",
                  ].join(" ")}
                  aria-label={listening ? "Stop dictation" : "Start dictation"}
                  aria-pressed={listening}
                >
                  {listening ? (
                    <span className="absolute inset-0 -z-10 rounded-full">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
                    </span>
                  ) : null}
                  <MicIcon className="h-5 w-5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || draft.trim().length === 0}
                className={[
                  "grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold shadow-sm ring-1 transition",
                  loading || draft.trim().length === 0
                    ? "bg-zinc-200/80 text-zinc-500 ring-zinc-300/60"
                    : "bg-emerald-600 text-white ring-emerald-700/20 hover:bg-emerald-700",
                ].join(" ")}
                aria-label="Send"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)]" />
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ring-1",
          isUser
            ? "bg-emerald-600 text-white ring-emerald-700/20"
            : "bg-white/85 text-zinc-900 ring-zinc-200/60",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
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

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l1.3 6.3L20 12l-6.7 3.7L12 22l-1.3-6.3L4 12l6.7-3.7L12 2Z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.4 20.2a1 1 0 0 1-.95-1.3l2.6-7.3-2.6-7.3A1 1 0 0 1 3.7 3L21 12 3.7 21a1 1 0 0 1-.3.05ZM6.5 12l-1.9 5.3L17.9 12 4.6 6.7 6.5 12Zm0 0h6.7a1 1 0 1 0 0-2H6.5a1 1 0 1 0 0 2Z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm7-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

