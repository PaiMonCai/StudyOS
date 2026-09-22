export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.error?.message ??
      body?.message ??
      (typeof body?.error === "string" ? body.error : null) ??
      `Request failed: ${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
