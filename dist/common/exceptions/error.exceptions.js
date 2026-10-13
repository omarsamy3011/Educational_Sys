"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.ConflictError = exports.NotFoundError = exports.BadRequestError = void 0;
class ApplicationError extends Error {
    status;
    constructor(message, status, cause) {
        super(message, { cause });
        this.status = status;
    }
}
class BadRequestError extends ApplicationError {
    constructor(message, cause) {
        super(message, 400, cause);
    }
}
exports.BadRequestError = BadRequestError;
class NotFoundError extends ApplicationError {
    constructor(message, cause) {
        super(message, 404, cause);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends ApplicationError {
    constructor(message, cause) {
        super(message, 409, cause);
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends ApplicationError {
    constructor(message = 'Unauthorized', cause) {
        super(message, 401, cause);
    }
}
exports.UnauthorizedError = UnauthorizedError;
