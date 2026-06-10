import { getApiBaseUrl } from "@/lib/api";

export type MembershipTier = "free" | "pending" | "premium";

export interface UpgradeStatusResponse {
  membershipTier: MembershipTier;
  latestRequest: {
    id: string;
    status: string;
    transactionId: string | null;
    submittedAt: string;
  } | null;
}

export async function fetchUpgradeStatus(token: string): Promise<UpgradeStatusResponse> {
  const res = await fetch(`${getApiBaseUrl()}/membership/upgrade-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to load membership status");
  }
  return res.json();
}

export async function submitUpgradeRequest(
  token: string,
  options: { transactionId?: string; proofUri?: string | null },
): Promise<{ message: string }> {
  const form = new FormData();
  if (options.transactionId?.trim()) {
    form.append("transactionId", options.transactionId.trim());
  }
  if (options.proofUri) {
    const name = options.proofUri.split("/").pop() ?? "proof.jpg";
    form.append("proof", {
      uri: options.proofUri,
      name,
      type: "image/jpeg",
    } as unknown as Blob);
  }

  const res = await fetch(`${getApiBaseUrl()}/membership/upgrade-request`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Failed to submit upgrade request");
  }
  return { message: body.message };
}
