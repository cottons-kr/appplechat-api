export enum ErrorName {
  NotFoundError = 'NotFoundError',
  UnauthorizedError = 'UnauthorizedError',
  BadRequestError = 'BadRequestError',
  InternalServerError = 'InternalServerError',
  ConflictError = 'ConflictError',
}

export class NotFoundError extends Error {
  constructor(
    public message: string,
    public name = ErrorName.NotFoundError,
    public status = 404
  ) {
    super(message)
  }
}

export class UnauthorizedError extends Error {
  constructor(
    public message: string,
    public name = ErrorName.UnauthorizedError,
    public status = 401
  ) {
    super(message)
  }
}

export class BadRequestError extends Error {
  constructor(
    public message: string,
    public name = ErrorName.BadRequestError,
    public status = 400
  ) {
    super(message)
  }
}

export class InternalServerError extends Error {
  constructor(
    public message: string,
    public name = ErrorName.InternalServerError,
    public status = 500
  ) {
    super(message)
  }
}

export class ConflictError extends Error {
  constructor(
    public message: string,
    public name = ErrorName.ConflictError,
    public status = 409
  ) {
    super(message)
  }
}

export const errorCollection = {
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
  ConflictError,
} as const
