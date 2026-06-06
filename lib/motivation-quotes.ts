import { getApiBaseUrl } from "@/lib/api";

export interface MotivationQuote {
  content: string;
  author: string;
}

/** Offline fallback when backend is unreachable */
const FALLBACK_QUOTES: MotivationQuote[] = [
  { content: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { content: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { content: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { content: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { content: "Don't limit your challenges. Challenge your limits.", author: "Jerry Dunn" },
  { content: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { content: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { content: "The body achieves what the mind believes.", author: "Unknown" },
  { content: "Your health is an investment, not an expense.", author: "Unknown" },
  { content: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
];

let lastFallbackIndex = -1;

function pickFallback(): MotivationQuote {
  if (FALLBACK_QUOTES.length === 1) return FALLBACK_QUOTES[0];
  let idx = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  while (idx === lastFallbackIndex) {
    idx = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  }
  lastFallbackIndex = idx;
  return FALLBACK_QUOTES[idx];
}

/** Fetch a fresh motivation quote from FitTrack backend (30+ curated quotes) */
export async function fetchMotivationQuote(): Promise<MotivationQuote> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${getApiBaseUrl()}/motivation/quote`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Quote fetch failed");
    const data = (await res.json()) as MotivationQuote;
    if (!data.content) throw new Error("Empty quote");
    return {
      content: data.content,
      author: data.author ?? "Unknown",
    };
  } catch {
    return pickFallback();
  } finally {
    clearTimeout(timer);
  }
}
