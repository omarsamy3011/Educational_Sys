"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbconnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_service_1 = require("../config/env.service");
const dbconnection = () => {
    mongoose_1.default.connect(env_service_1.env.dataBase_url, {
        dbName: env_service_1.env.db_name
    })
        .then(() => { console.log("database connected"); })
        .catch((err) => console.log(err));
};
exports.dbconnection = dbconnection;
