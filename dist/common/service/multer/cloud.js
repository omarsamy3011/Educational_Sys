"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const multer_1 = __importDefault(require("multer"));
const os_1 = require("os");
const multer_enum_1 = require("../../enum/multer.enum");
const uploadFile = ({ storageType = multer_enum_1.MulterStorageEnums.memoryStorage }) => {
    const storage = storageType == multer_enum_1.MulterStorageEnums.memoryStorage ? multer_1.default.memoryStorage() : multer_1.default.diskStorage({
        destination(req, file, cb) {
            cb(null, (0, os_1.tmpdir)());
        },
        filename(req, file, cb) {
            let name = Date.now() + '-' + file.originalname;
            cb(null, name);
        }
    });
    return (0, multer_1.default)({ storage });
};
exports.uploadFile = uploadFile;
