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
  const response = await fetch(`/api${path}${toQueryString(query)}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
