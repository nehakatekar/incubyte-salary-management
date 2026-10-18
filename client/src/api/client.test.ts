import { ApiError, request, shouldRetry } from './client';

describe('request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns an API error response into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'NOT_FOUND', message: 'Employee not found' } },
          { status: 404 },
        ),
      ),
    );

    await expect(request('/employees/9')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Employee not found',
    });
  });

  it('explains an unreachable server instead of a raw "Failed to fetch"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const error = await request('/employees').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect((error as ApiError).message).toMatch(/cannot reach the server/i);
  });
});

describe('shouldRetry', () => {
  it('does not retry client errors, which will fail the same way again', () => {
    expect(shouldRetry(0, new ApiError(404, 'NOT_FOUND', 'Employee not found'))).toBe(false);
    expect(shouldRetry(0, new ApiError(400, 'VALIDATION_ERROR', 'Bad request'))).toBe(false);
  });

  it('retries server and network errors once', () => {
    expect(shouldRetry(0, new ApiError(500, 'INTERNAL_ERROR', 'Boom'))).toBe(true);
    expect(shouldRetry(0, new ApiError(0, 'NETWORK_ERROR', 'Offline'))).toBe(true);
    expect(shouldRetry(1, new ApiError(500, 'INTERNAL_ERROR', 'Boom'))).toBe(false);
  });
});
