import { getApiBaseUrl } from "@/lib/api";

export interface MotivationQuote {
  content: string;
  author: string;
}

export class MotivationQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotivationQuoteError";
  }
}

/** Live quote via Veera backend (proxies ZenQuotes + type.fit) */
export async function fetchMotivationQuote(): Promise<MotivationQuote> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${getApiBaseUrl()}/motivation/quote`, {
      signal: controller.signal,
    });
    const data = (await res.json()) as MotivationQuote & { error?: string };
    if (!res.ok) {
      throw new MotivationQuoteError(data.error ?? "Could not load quote. Tap refresh to try again.");
    }
    if (!data.content?.trim()) {
      throw new MotivationQuoteError("Empty quote response. Tap refresh to try again.");
    }
    return {
      content: data.content.trim(),
      author: data.author?.trim() || "Unknown",
    };
  } catch (err) {
    if (err instanceof MotivationQuoteError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new MotivationQuoteError("Quote request timed out. Check your connection and retry.");
    }
    throw new MotivationQuoteError("Could not reach quote service. Is the backend running?");
  } finally {
    clearTimeout(timer);
  }
}
