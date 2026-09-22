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
    throw new Error(
      body?.message ?? body?.error ?? `Request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
