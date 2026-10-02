"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponce = void 0;
const successResponce = ({ res, message = 'success', status = 200, data }) => {
    return res.status(status).json({
        message,
        data
    });
};
exports.successResponce = successResponce;
