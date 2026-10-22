export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(code, 404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(code, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(code, 403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict or illegal transition', code = 'CONFLICT') {
    super(code, 409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input', details?: unknown, code = 'VALIDATION_ERROR') {
    super(code, 400, message, details);
  }
}
