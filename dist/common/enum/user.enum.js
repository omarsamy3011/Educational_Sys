"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeEnum = exports.assistantTypeEnum = exports.providerEnum = exports.genderEnum = void 0;
var genderEnum;
(function (genderEnum) {
    genderEnum["Male"] = "male";
    genderEnum["Female"] = "female";
})(genderEnum || (exports.genderEnum = genderEnum = {}));
var providerEnum;
(function (providerEnum) {
    providerEnum[providerEnum["System"] = 0] = "System";
    providerEnum[providerEnum["Gmail"] = 1] = "Gmail";
})(providerEnum || (exports.providerEnum = providerEnum = {}));
var assistantTypeEnum;
(function (assistantTypeEnum) {
    assistantTypeEnum[assistantTypeEnum["Admin"] = 0] = "Admin";
    assistantTypeEnum[assistantTypeEnum["Assistant"] = 1] = "Assistant";
})(assistantTypeEnum || (exports.assistantTypeEnum = assistantTypeEnum = {}));
var gradeEnum;
(function (gradeEnum) {
    gradeEnum[gradeEnum["S1"] = 0] = "S1";
    gradeEnum[gradeEnum["S2"] = 1] = "S2";
    gradeEnum[gradeEnum["S3"] = 2] = "S3";
})(gradeEnum || (exports.gradeEnum = gradeEnum = {}));
