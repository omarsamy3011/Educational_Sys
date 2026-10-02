"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectEnum = exports.teachingLanguageEnum = void 0;
var teachingLanguageEnum;
(function (teachingLanguageEnum) {
    teachingLanguageEnum[teachingLanguageEnum["Arabic"] = 0] = "Arabic";
    teachingLanguageEnum[teachingLanguageEnum["English"] = 1] = "English";
})(teachingLanguageEnum || (exports.teachingLanguageEnum = teachingLanguageEnum = {}));
var subjectEnum;
(function (subjectEnum) {
    subjectEnum[subjectEnum["Math"] = 0] = "Math";
    subjectEnum[subjectEnum["Physics"] = 1] = "Physics";
    subjectEnum[subjectEnum["English"] = 2] = "English";
    subjectEnum[subjectEnum["Science"] = 3] = "Science";
    subjectEnum[subjectEnum["Biology"] = 4] = "Biology";
    subjectEnum[subjectEnum["Chemistry"] = 5] = "Chemistry";
    subjectEnum[subjectEnum["Arabic"] = 6] = "Arabic";
})(subjectEnum || (exports.subjectEnum = subjectEnum = {}));
