# Student portal API contract

This guide describes the API contract the student-facing front end consumes. It was traced from `assets/js/core/api.js`, the student views, and the mock API in `assets/js/mock/server.js`. Treat the examples below as the frontend contract; the production backend may not implement every endpoint yet.

## Response and authentication conventions

- All successful API calls must return the standard envelope `{ "message": "...", "data": ... }`. The frontend unwraps `data` before passing a result to a view.
- Authenticated calls send `Authorization: Bearer <accessToken>`. A 401 triggers one refresh attempt using `POST /refresh-token`; that request has no access-token header.
- Student pages depend on a student-role access token. Teacher-scoped student features also require an active enrollment with the selected teacher. Return 403 when the student is not subscribed.
- IDs are opaque strings to the frontend. Dates should be ISO 8601 strings and prices, balances, and scores should be numbers.
- Errors should include a useful `message`. The UI specifically understands 401 (session expired), 403 (not allowed), 404 (endpoint/record missing), 409 (conflict), and `cause.code === "INSUFFICIENT_BALANCE"` for lesson unlocks.

## Sign-up and sign-in

| Method and path           | Request the frontend sends                                                                                                                                                                                                                                                                                   | Response `data` the frontend reads                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /signup/student`    | `firstName`, `lastName`, `phone`, `parentPhone`, `grade`, `schoolName`, `learningLanguage`, `gender`, `password`. Values are submitted from `FormData` as strings; the grade and learning-language selects currently use numeric option values. `confirmPassword` is checked in the browser and is not sent. | `{ userID: string, qrCode?: string }`. The UI shows the student code and QR; if `qrCode` is omitted it generates the QR in the browser.                                            |
| `POST /login/student`     | `{ identifier: string, password: string }`. `identifier` is the student code or phone number.                                                                                                                                                                                                                | `{ accessToken: string, refreshToken: string }`.                                                                                                                                   |
| `POST /refresh-token`     | `{ refreshToken: string }`                                                                                                                                                                                                                                                                                   | `{ accessToken: string }`                                                                                                                                                          |
| `PATCH /student/password` | `{ currentPassword: string, newPassword: string }`                                                                                                                                                                                                                                                           | The page only needs a successful response; the mock returns `{ updated: true }`. The UI requires a new password of at least 8 characters and does not send its confirmation field. |

## Account, teachers, and directory

### `GET /student/profile`

Called when the app loads the student's account and when the Profile page opens. Return a student object with:

```json
{
  "_id": "student-id",
  "userID": "STU-000123",
  "firstName": "Amina",
  "lastName": "Example",
  "phone": "01000000000",
  "parentPhone": "01000000001",
  "gender": "female",
  "grade": "S1",
  "schoolName": "Example School",
  "learningLanguage": "Arabic",
  "profilepic": "https://example.test/photo.jpg",
  "createdAt": "2026-01-01T10:00:00.000Z"
}
```

The required UI fields are `_id`, `userID`, `firstName`, `phone`, `grade`, and `learningLanguage`. Other fields can be empty or omitted where appropriate.

### `PATCH /student/profile`

Request body contains one or more changed fields from this allowlist:

```json
{
  "firstName": "Amina",
  "lastName": "Example",
  "parentPhone": "01000000001",
  "schoolName": "Example School",
  "profilepic": "https://example.test/photo.jpg"
}
```

The profile form edits first/last name, parent phone, and school. Photo upload separately sends `profilepic`. Phone, grade, and learning language are displayed but not editable in this form. Return the updated student profile object (same shape as `GET /student/profile`).

### `GET /student/teachers`

Returns the student's non-archived teacher enrollments. The app reads this immediately after the profile and uses it to choose the active teacher.

```json
[
  {
    "teacher": {
      "_id": "teacher-id",
      "firstName": "Teacher",
      "lastName": "Example",
      "userName": "teacher.example",
      "companyName": "Learning Center",
      "subject": ["Math"],
      "teachingLanguage": "Arabic",
      "profilepic": "https://example.test/teacher.jpg",
      "bio": "Teacher biography"
    },
    "status": "active",
    "joinedAt": "2026-01-01T10:00:00.000Z",
    "balance": 250
  }
]
```

`status` is `active` or `pending`. `balance` is the per-teacher balance for active enrollments and can be `null` for pending requests. A teacher object needs at least `_id` and the public display fields used by the teacher cards.

### Teacher discovery

| Method and path        | Request                                                                     | Response `data`                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /teachers/search` | Optional query parameters `q` (search text) and `subject` (subject filter). | Array of public teacher objects plus `studentsCount: number` and `centers: string[]`. Cards use `_id`, `firstName`, `lastName`, `userName`, `companyName`, `subject`, `teachingLanguage`, `bio`, `profilepic`, `studentsCount`, and `centers`.    |
| `GET /teachers/:id`    | Teacher ID in path.                                                         | One public teacher object plus `studentsCount`, `centers: [{ name, textlocation, ... }]`, and `schedule: Slot[]`. Schedule slots display weekday, start time, duration, grade, title, and center. Center items display `name` and `textlocation`. |

### Enrollment requests

| Method and path                        | Request                                                                | Response `data`         |
| -------------------------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `POST /student/teachers/:id/request`   | No body; `:id` is the teacher ID.                                      | `{ status: "pending" }` |
| `DELETE /student/teachers/:id/request` | No body; `:id` is the teacher ID. Only a pending request is cancelled. | `{ status: "none" }`    |

After either action the frontend reloads the profile and teacher list. Reject duplicate/active requests with a useful conflict response.

## Teacher-specific learning pages

Every endpoint in this section contains a teacher ID in its path. The UI calls these only when there is an active teacher selected.

### Home overview — `GET /student/teachers/:id/overview`

The home and wallet pages consume this response:

```json
{
  "teacher": {
    "_id": "teacher-id",
    "firstName": "Teacher",
    "lastName": "Example"
  },
  "balance": 250,
  "pricePerSession": 80,
  "points": 12,
  "rank": 3,
  "classSize": 20,
  "isBlocked": false,
  "centerName": "Main Center",
  "warnings": [
    { "reason": "Warning reason", "createdAt": "2026-01-01T10:00:00.000Z" }
  ],
  "nextSlot": {
    "_id": "slot-id",
    "dayOfWeek": 1,
    "startTime": "17:00",
    "durationMinutes": 90,
    "title": "Grade 1",
    "centerName": "Main Center",
    "startsInMinutes": 120
  },
  "lastSession": {
    "session": {
      "_id": "session-id",
      "sequence": "Week 1",
      "week": 1,
      "number": 1,
      "date": "2026-01-01T10:00:00.000Z"
    },
    "status": "present",
    "homeworkStatus": "complete"
  },
  "stats": {
    "present": 8,
    "absent": 2,
    "attendanceRate": 80,
    "homeworkRate": 75,
    "examAvg": 85
  },
  "announcements": [],
  "followUp": { "name": "Assistant Example", "phone": "01000000002" }
}
```

`nextSlot`, `lastSession`, and `followUp` may be `null`; `warnings` and `announcements` should be arrays. Home reads `teacher`, `balance`, `pricePerSession`, `points`, `rank`, `classSize`, `isBlocked`, `nextSlot`, `lastSession`, all five `stats` values, announcements, warnings, and follow-up name/phone. Wallet uses `teacher`, `balance`, and `pricePerSession`.

Announcement items are passed to the shared announcement card. Provide the normal announcement fields (`_id`, `title`, `body`, `createdAt`, plus optional `imageUrl`, `pinned`, and other presentation fields used by the shared card).

### Sessions — `GET /student/teachers/:id/sessions`

Returns an array of attendance rows:

```json
[
  {
    "session": {
      "_id": "session-id",
      "sequence": "Week 1",
      "week": 1,
      "number": 1,
      "date": "2026-01-01T10:00:00.000Z",
      "centerName": "Main Center"
    },
    "status": "present",
    "markedAt": "2026-01-01T10:05:00.000Z",
    "location": "Main Center",
    "homeworkStatus": "complete",
    "payment": 80,
    "comment": "Good work"
  }
]
```

`status` is typically `present`, `absent`, `pending`, or `cancelled`. `markedAt`, `location`, `homeworkStatus`, `payment`, and `comment` may be null/empty when not applicable. The page reads `session.week`, `session.number`, `session.sequence`, `session.date`, attendance status/time/location, homework status, payment, and comment.

### Video lessons

| Method and path                      | Request                                                                                                              | Response `data`                                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /student/teachers/:id/lessons`  | Teacher ID in path.                                                                                                  | Array of lesson summaries. Each needs `_id`, `title`, `description`, `week`, `order`, `price`, `partsCount`, `questionsCount`, `durationSeconds`, `access`, and `watchedSeconds`. |
| `GET /student/lessons/:id`           | Lesson ID in path.                                                                                                   | Lesson detail described below.                                                                                                                                                    |
| `POST /student/lessons/:id/unlock`   | No body.                                                                                                             | `{ access: Access, balance?: number }`                                                                                                                                            |
| `POST /student/lessons/:id/progress` | Start watching: `{ "start": true }`. Save progress: `{ "part": "part-id", "seconds": 30 }`.                          | `{ access: Access }`                                                                                                                                                              |
| `POST /student/questions/:id/answer` | Multiple choice: `{ "choice": "a" }`. Essay/photo: `{ "imageUrl": "https://..." }` (or textual answer if supported). | Answer object with `_id`, `question`, `lesson`, `choice`, `imageUrl`, `status`, `isCorrect`, `points`, and optionally `correct` and `text`.                                       |

Lesson detail includes:

- Lesson summary fields: `_id`, `title`, `description`, `week`, `isFree`, `price`, `accessHours`, `viewsIfPaid`, `viewsIfAttended`.
- `teacher`: public teacher display object.
- `access`: `{ state }` where state is `free`, `granted`, `available`, `locked`, `expired`, or `exhausted`. Depending on state, include `price`, `views`, `hours`, `viewsLeft`, `maxViews`, `expiresAt`, `startsOnOpen`, `method`, and/or `grantId`.
- `parts`: array with `_id`, `title`, `category`, `durationSeconds`, and `url`. Locked lessons should not expose playable URLs.
- `questions`: active questions with `_id`, `part`, `type` (`mcq` or `essay`), `text`, `imageUrl`, `bonusPoints`, `trigger`, `triggerSeconds`, `choices` (for MCQ), and `answer` (object or `null`). Include `correct` only when it is appropriate to reveal it after an answer.
- `progress`: array of watched part rows; the list screen also uses its summary `watchedSeconds`.

An answer returned for an MCQ should include `isCorrect`, `points`, and the correct choice as `correct`, so the UI can show the result. Essay answers normally return `status: "pending"` until graded.

### Homework

| Method and path                      | Request                                                                                                                                                                                                            | Response `data`                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `GET /student/teachers/:id/homework` | Teacher ID in path.                                                                                                                                                                                                | Array of homework records described below.                          |
| `POST /student/homework/:id/submit`  | `{ "files": ["https://..."], "comment": "optional note", "link": "optional result URL" }`. Upload-type homework sends one or more uploaded file URLs; link-type homework may send an empty files array and a link. | The view only requires success; mock returns `{ submitted: true }`. |

Each homework item needs `_id`, `order`, `title`, `description`, `startDate`, `endDate`, `externalLink`, `submissionType`, and `isOpen`, plus `submission` (an object or `null`). The submission object can contain `status`, `files: string[]`, `submittedAt`, and `feedback`. Status and open/closed state determine whether the student can submit or replace their work.

### Exams — `GET /student/teachers/:id/exams`

Returns rows, one for each relevant exam:

```json
[
  {
    "exam": {
      "_id": "exam-id",
      "name": "Unit 1",
      "maxScore": 100,
      "date": "2026-01-01T10:00:00.000Z"
    },
    "score": 85,
    "rank": 2,
    "participants": 18,
    "stats": { "count": 18, "avg": 72.5, "max": 98, "min": 30 }
  }
]
```

`score` and `rank` may be `null` when the student was absent/not scored. The frontend reads `exam.name`, `exam.maxScore`, `exam.date`, `score`, `rank`, `participants`, and `stats.avg/max`.

### Booklets

| Method and path                      | Request                                                                                                                                                     | Response `data`                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET /student/teachers/:id/booklets` | Teacher ID in path.                                                                                                                                         | Array of `{ booklet, order }` rows.                                                                                     |
| `POST /student/booklets/:id/reserve` | `{ "method": "center" }` or `{ "method": "transfer", "receiptUrl": "https://...", "reference": "receipt reference" }`. Transfer uses `POST /uploads` first. | Created order with `_id`, `price`, `paid`, `delivered`, `method`, `status`, `receiptUrl`, `reference`, and `createdAt`. |

`booklet` needs `_id`, `name`, `sellPrice`, and `stock`. `order` is `null` if not reserved; otherwise it needs `_id`, `price`, `paid`, `delivered`, `status`, and `method`. `status` values shown by the page include `pending`, `approved`, and `rejected`; `delivered` controls its received indicator.

### Wallet and payment history

| Method and path                          | Request                                                                             | Response `data`                                                                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /student/teachers/:id/transactions` | Teacher ID in path.                                                                 | Array of transaction records; each needs `_id`, `createdAt`, `type`, `reason`, and numeric `amount`.                                                      |
| `POST /student/recharge`                 | `{ "code": "LC-XXXXXX" }`                                                           | `{ amount: number, balance: number, teacher: public teacher object }`                                                                                     |
| `POST /student/teachers/:id/topups`      | `{ "amount": number, "method": string, "reference": string, "receiptUrl": string }` | Created top-up. The UI only requires success; a useful response includes `_id`, `amount`, `method`, `reference`, `receiptUrl`, `status`, and `createdAt`. |

For transaction `type`, the UI uses a display badge; `amount` is positive for credits and negative for charges. A submitted top-up is pending review and must not immediately change the displayed balance.

### Leaderboard — `GET /student/teachers/:id/leaderboard`

Returns an array:

```json
[
  {
    "rank": 1,
    "name": "Student Example",
    "points": 25,
    "isMe": false,
    "centerName": "Main Center"
  },
  {
    "rank": 2,
    "name": "Amina Example",
    "points": 12,
    "isMe": true,
    "centerName": "Main Center"
  }
]
```

The page reads `rank`, `name`, `points`, `isMe`, and `centerName`. `isMe` identifies the current student's row.

## File uploads

`POST /uploads` is shared by student profile photos, homework attachments, top-up receipts, booklet receipts, and essay-answer photos. The browser sends `multipart/form-data` with one field named `file`. Return:

```json
{ "message": "Upload successful", "data": { "url": "https://..." } }
```

The `url` is then passed in the corresponding profile/submission/top-up/reservation/answer request.

## Student page to API mapping

| Student page  | API calls                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | `GET /student/profile`, `GET /student/teachers` during app load; `GET /student/teachers/:id/overview` when a teacher is active                                 |
| Teachers      | `GET /student/teachers` during app load; `GET /teachers/search`; `GET /teachers/:id`; `POST` or `DELETE /student/teachers/:id/request`                         |
| My sessions   | `GET /student/teachers/:id/sessions`                                                                                                                           |
| Video lessons | `GET /student/teachers/:id/lessons`; `GET /student/lessons/:id`; lesson unlock/progress and question-answer endpoints above                                    |
| Homework      | `GET /student/teachers/:id/homework`; `POST /student/homework/:id/submit`; `POST /uploads`                                                                     |
| Exams         | `GET /student/teachers/:id/exams`                                                                                                                              |
| Booklets      | `GET /student/teachers/:id/booklets`; `POST /student/booklets/:id/reserve`; `POST /uploads` for transfer receipts                                              |
| Wallet        | `GET /student/teachers/:id/overview`; `GET /student/teachers/:id/transactions`; `POST /student/recharge`; `POST /student/teachers/:id/topups`; `POST /uploads` |
| Leaderboard   | `GET /student/teachers/:id/leaderboard`                                                                                                                        |
| Profile       | `GET/PATCH /student/profile`; `POST /uploads`; `PATCH /student/password`                                                                                       |

the rest apis for teacher and session ===>

Compared with the frontend API definitions in api.js and backend routes in teacher.controller.ts and session.controller.ts, these frontend-requested endpoints are still missing:

Student management: DELETE /teacher/myStudents/:studentId/warnings/:warningId; PATCH /teacher/myStudents/:studentId/block
Sessions: GET /teacher/sessions/:sessionId; PATCH and DELETE /teacher/sessions/:sessionId; PATCH and DELETE /teacher/sessions/:sessionId/attendance/:studentId; POST /teacher/sessions/:sessionId/homework; and the POST, PATCH, and DELETE staff routes under /teacher/sessions/:sessionId/staff. The list/create session, active toggle, attendance creation, and closing routes do exist.
Exams: list, detail, create, update, delete, and save scores.
Homework: list, create, update, delete, list submissions, and grade a submission.
Lessons: list, detail, create, update, delete, grant/revoke access, list answers, and grade an answer.
Booklets: booklet list/create/update/delete and order list/create/update.
Finance and payments: recharge-code list/generate/delete; top-up list/review; transaction list; finance summary; and expense list/add/delete.
Announcements: list, create, update, and delete.
Follow-up: list, add a comment, and assign follow-up.
Assistant management: update/remove an assistant and retrieve assistant stats. The assistant list and add routes exist, but the frontend API file notes that listing is currently broken because the Teacher schema has no assistants field.
One related limitation: student history currently derives attendance from sessions; several other history categories do not have backend data storage yet.
