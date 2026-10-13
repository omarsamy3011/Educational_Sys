"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_service_1 = require("../config/env.service");
const security_1 = require("../common/security/security");
const center_1 = __importDefault(require("../db/model/center"));
const session_1 = __importDefault(require("../db/model/session"));
const student_1 = __importDefault(require("../db/model/student"));
const teacher_1 = __importDefault(require("../db/model/teacher"));
const demoPassword = "12345678";
async function seedDemoData() {
    if (process.env.NODE_ENV !== "dev" || process.env.SEED_DEMO_DATA !== "true") {
        throw new Error("Demo seeding is allowed only in dev mode with SEED_DEMO_DATA=true");
    }
    if (!env_service_1.env.dataBase_url || !env_service_1.env.db_name) {
        throw new Error("Configure dataBase_url and db_name in the development environment before seeding");
    }
    const hasDevelopmentDatabaseName = /(^|[-_])(dev|development|test|local)([-_]|$)/i.test(env_service_1.env.db_name);
    const explicitlyApprovedDatabase = process.env.DEMO_SEED_DATABASE === env_service_1.env.db_name;
    if (!hasDevelopmentDatabaseName && !explicitlyApprovedDatabase) {
        throw new Error(`Refusing to seed database '${env_service_1.env.db_name}'; use a dev/test/local database or explicitly approve this exact name with DEMO_SEED_DATABASE`);
    }
    await mongoose_1.default.connect(env_service_1.env.dataBase_url, { dbName: env_service_1.env.db_name });
    try {
        const password = await (0, security_1.genertateHash)({ plainText: demoPassword });
        const center = await center_1.default.findOneAndUpdate({ name: "Demo Learning Center" }, {
            $set: {
                name: "Demo Learning Center",
                password,
                phone: "01000000001",
                localphone: "0200000001",
                textlocation: "Demo district",
                Maplocation: ""
            }
        }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).exec();
        const studentData = [
            { userID: "STU-DEMO-0001", phone: "01000000011", firstName: "Mina", lastName: "Adel", grade: "S1", balance: 250, isBlocked: false },
            { userID: "STU-DEMO-0002", phone: "01000000012", firstName: "Nour", lastName: "Samir", grade: "S2", balance: 40, isBlocked: false },
            { userID: "STU-DEMO-0003", phone: "01000000013", firstName: "Omar", lastName: "Hany", grade: "S3", balance: 0, isBlocked: true }
        ];
        const students = await Promise.all(studentData.map((student) => student_1.default.findOneAndUpdate({ userID: student.userID }, {
            $set: {
                ...student,
                password,
                parentPhone: "01000000019",
                schoolName: "Demo School",
                learningLanguage: "Arabic",
                balance: student.balance,
                pricePerSession: 100,
                center: center._id
            }
        }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).exec()));
        const teacher = await teacher_1.default.findOneAndUpdate({ userName: "demo.teacher" }, {
            $set: {
                userName: "demo.teacher",
                email: "teacher.demo@example.test",
                password,
                phone: "01000000021",
                firstName: "Demo",
                lastName: "Teacher",
                confirmEmail: true,
                subject: ["Math"],
                teachingLanguage: "Arabic",
                students: students.map((student) => student._id),
                center: [center._id]
            }
        }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).exec();
        await session_1.default.findOneAndUpdate({ teacher: teacher._id, sequence: "Demo session", week: 1, number: 1 }, {
            $set: {
                teacher: teacher._id,
                sequence: "Demo session",
                week: 1,
                number: 1,
                active: false,
                attendance: students.slice(0, 2).map((student) => ({ student: student._id, markedAt: new Date() }))
            }
        }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).exec();
        console.log("Demo data seeded.");
        console.log(`Teacher: demo.teacher / ${demoPassword}`);
        console.log(`Center: Demo Learning Center / ${demoPassword}`);
        console.log(`Students: ${studentData.map(({ userID }) => userID).join(", ")} / ${demoPassword}`);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
seedDemoData().catch((error) => {
    console.error("Demo seeding failed:", error);
    process.exitCode = 1;
});
