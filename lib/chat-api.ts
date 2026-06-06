import { getApiBaseUrl } from "@/lib/api";

export interface ChatMessageDto {
  id: string;
  threadId: string;
  senderId: string;
  role: "user" | "assistant";
  content: string;
  messageType: string;
  createdAt: string;
}

export interface ChatThreadDto {
  id: string;
  subject: string | null;
  threadType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: ChatMessageDto | null;
}

async function parseJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export async function fetchDefaultCoachThread(token: string): Promise<ChatThreadDto> {
  const res = await fetch(`${getApiBaseUrl()}/chat/threads/default`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  return data.thread as ChatThreadDto;
}

export async function fetchChatThreads(token: string): Promise<ChatThreadDto[]> {
  const res = await fetch(`${getApiBaseUrl()}/chat/threads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  return (data.threads ?? []) as ChatThreadDto[];
}

export async function fetchChatMessages(token: string, threadId: string, limit = 50): Promise<ChatMessageDto[]> {
  const res = await fetch(`${getApiBaseUrl()}/chat/threads/${threadId}/messages?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  return (data.messages ?? []) as ChatMessageDto[];
}

export async function sendChatMessage(
  token: string,
  threadId: string,
  content: string,
): Promise<{ userMessage: ChatMessageDto; assistantMessage: ChatMessageDto; source: string }> {
  const res = await fetch(`${getApiBaseUrl()}/chat/threads/${threadId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const data = await parseJson(res);
  return {
    userMessage: data.userMessage,
    assistantMessage: data.assistantMessage,
    source: data.source ?? "groq",
  };
}
