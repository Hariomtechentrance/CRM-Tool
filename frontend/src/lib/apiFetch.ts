// Fetch wrapper with automatic exponential-backoff retry on 429 / 5xx.
// Swap out the underlying `fetch` call if you later move to axios.

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, options);

    if (res.ok || !RETRYABLE.has(res.status) || attempt >= MAX_RETRIES) {
      return res;
    }

    attempt++;
    // Respect Retry-After header if the server sends one
    const retryAfter = res.headers.get("Retry-After");
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1_000
      : Math.min(500 * Math.pow(2, attempt - 1), 8_000); // 500 ms → 1 s → 2 s → 4 s → 8 s cap

    await new Promise((r) => setTimeout(r, delay));
  }
}
