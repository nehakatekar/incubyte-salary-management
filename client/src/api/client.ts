export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** An error response from the API, in its `{ error: { code, message, details } }` shape. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  method?: string;
}

export async function request<T>(
  path: string,
  { query, body, method = 'GET' }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}${toQueryString(query)}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when no response arrived at all (offline, server down, DNS).
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? `Request failed (${response.status})`,
      error?.details,
    );
  }
  return payload as T;
}

/**
 * React Query retry policy: a 4xx (not found, validation) will fail the same way
 * again, so only server and network errors get one more attempt.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !isClientError && failureCount < 1;
}

function toQueryString(query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** A readable message for any error, including field-level validation details. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.details.length > 0) {
    const details = error.details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message));
    return `${error.message} (${details.join('; ')})`;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
