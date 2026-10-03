"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModel = exports.chatSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const chat_enum_1 = require("../../common/enum/chat.enum");
const messageSchema = new mongoose_1.default.Schema({
    content: {
        type: String,
        required: function () {
            return this.attachments.length == 0;
        }
    },
    attachments: {
        type: [String]
    },
    likes: {
        type: [mongoose_1.Types.ObjectId],
        ref: 'user'
    },
    tags: {
        type: [mongoose_1.Types.ObjectId],
        ref: 'user'
    },
    createdBy: {
        type: mongoose_1.Types.ObjectId,
        ref: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    editedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date,
        default: null
    },
    restoredAt: {
        type: Date,
        default: null
    }
});
exports.chatSchema = new mongoose_1.default.Schema({
    particepate: [{
            type: mongoose_1.Types.ObjectId,
            ref: 'user'
        }],
    createdBy: {
        type: mongoose_1.Types.ObjectId,
        ref: 'user'
    },
    message: {
        type: [messageSchema],
        required: true
    },
    roomID: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: chat_enum_1.ChatEnum,
        default: chat_enum_1.ChatEnum.ovm
    },
    group: {
        type: String,
        required: function () {
            return this.type == chat_enum_1.ChatEnum.ovm;
        }
    },
    groupImage: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    editedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date,
        default: null
    },
    restoredAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    strict: true
});
exports.chatModel = mongoose_1.default.model('chat', exports.chatSchema);
