export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", code: string = "BAD_REQUEST") {
    super(message, code, 400);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation Failed",
    code: string = "VALIDATION_FAILED"
  ) {
    super(message, code, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", code: string = "UNAUTHORIZED") {
    super(message, code, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", code: string = "FORBIDDEN") {
    super(message, code, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = "Resource Not Found",
    code: string = "NOT_FOUND"
  ) {
    super(message, code, 404);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message: string = "Internal Server Error",
    code: string = "INTERNAL_SERVER_ERROR"
  ) {
    super(message, code, 500);
  }
}
