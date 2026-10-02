"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = void 0;
const error_exceptions_1 = require("../exceptions/error.exceptions");
const validation = (schema) => {
    return (req, res, next) => {
        let validationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key]) {
                throw new error_exceptions_1.BadRequestError("Validation error");
            }
            const result = schema[key].safeParse(req[key]);
            if (!result.success) {
                validationErrors.push({ key, issue: result.error.issues });
            }
            if (validationErrors.length > 0) {
                throw new error_exceptions_1.BadRequestError('validation error', validationErrors);
            }
            next();
        }
    };
};
exports.validation = validation;
