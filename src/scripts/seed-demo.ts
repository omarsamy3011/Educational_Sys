import mongoose from "mongoose"
import { env } from "../config/env.service"
import { genertateHash } from "../common/security/security"
import centerModel from "../db/model/center"
import sessionModel from "../db/model/session"
import studentModel from "../db/model/student"
import teacherModel from "../db/model/teacher"

const demoPassword = "12345678"

async function seedDemoData() {
    if (process.env.NODE_ENV !== "dev" || process.env.SEED_DEMO_DATA !== "true") {
        throw new Error("Demo seeding is allowed only in dev mode with SEED_DEMO_DATA=true")
    }
    if (!env.dataBase_url || !env.db_name) {
        throw new Error("Configure dataBase_url and db_name in the development environment before seeding")
    }
    const hasDevelopmentDatabaseName = /(^|[-_])(dev|development|test|local)([-_]|$)/i.test(env.db_name)
    const explicitlyApprovedDatabase = process.env.DEMO_SEED_DATABASE === env.db_name
    if (!hasDevelopmentDatabaseName && !explicitlyApprovedDatabase) {
        throw new Error(`Refusing to seed database '${env.db_name}'; use a dev/test/local database or explicitly approve this exact name with DEMO_SEED_DATABASE`)
    }

    await mongoose.connect(env.dataBase_url, { dbName: env.db_name })

    try {
        const password = await genertateHash({ plainText: demoPassword })
        const center = await centerModel.findOneAndUpdate(
            { name: "Demo Learning Center" },
            {
                $set: {
                    name: "Demo Learning Center",
                    password,
                    phone: "01000000001",
                    localphone: "0200000001",
                    textlocation: "Demo district",
                    Maplocation: ""
                }
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        ).exec()

        const studentData = [
            { userID: "STU-DEMO-0001", phone: "01000000011", firstName: "Mina", lastName: "Adel", grade: "S1", balance: 250, isBlocked: false },
            { userID: "STU-DEMO-0002", phone: "01000000012", firstName: "Nour", lastName: "Samir", grade: "S2", balance: 40, isBlocked: false },
            { userID: "STU-DEMO-0003", phone: "01000000013", firstName: "Omar", lastName: "Hany", grade: "S3", balance: 0, isBlocked: true }
        ]
        const students = await Promise.all(studentData.map((student) =>
            studentModel.findOneAndUpdate(
                { userID: student.userID },
                {
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
                },
                { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
            ).exec()
        ))

        const teacher = await teacherModel.findOneAndUpdate(
            { userName: "demo.teacher" },
            {
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
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        ).exec()

        await sessionModel.findOneAndUpdate(
            { teacher: teacher._id, sequence: "Demo session", week: 1, number: 1 },
            {
                $set: {
                    teacher: teacher._id,
                    sequence: "Demo session",
                    week: 1,
                    number: 1,
                    active: false,
                    attendance: students.slice(0, 2).map((student) => ({ student: student._id, markedAt: new Date() }))
                }
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        ).exec()

        console.log("Demo data seeded.")
        console.log(`Teacher: demo.teacher / ${demoPassword}`)
        console.log(`Center: Demo Learning Center / ${demoPassword}`)
        console.log(`Students: ${studentData.map(({ userID }) => userID).join(", ")} / ${demoPassword}`)
    } finally {
        await mongoose.disconnect()
    }
}

seedDemoData().catch((error: unknown) => {
    console.error("Demo seeding failed:", error)
    process.exitCode = 1
})
