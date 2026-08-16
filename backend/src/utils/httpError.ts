/**
 * Typed HTTP errors with dot-namespaced codes.
 *
 * The `code` is the machine contract with clients (`auth.invalid_token`,
 * `resource.not_found`, …); the `message` is for humans and may change
 * freely. Clients must branch on `code`, never on message text.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static unauthorized(message = 'Authentication required', code = 'auth.missing_token'): HttpError {
    return new HttpError(401, code, message);
  }

  static forbidden(message = 'Not allowed', code = 'auth.forbidden'): HttpError {
    return new HttpError(403, code, message);
  }

  static notFound(resource = 'Resource'): HttpError {
    return new HttpError(404, 'resource.not_found', `${resource} not found`);
  }

  static badRequest(message: string, code = 'request.invalid', details?: unknown): HttpError {
    return new HttpError(400, code, message, details);
  }

  static conflict(message: string, code = 'resource.conflict'): HttpError {
    return new HttpError(409, code, message);
  }
}
