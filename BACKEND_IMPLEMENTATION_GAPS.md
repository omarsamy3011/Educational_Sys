# Frontend API contract and backend build guide

**Audit date:** 2026-10-14  
**Purpose:** A practical, step-by-step guide for implementing the APIs the frontend calls and for understanding the data each screen expects back.

This file is based on `front-end/assets/js/core/api.js`, the frontend views and contracts, and the active backend routes/models under `src/`. The mock server is useful as a reference for behavior, but a mock route is **not** a production implementation.

## How to use this guide

- Every successful backend handler should use the existing response envelope:

  ```json
  { "message": "Operation succeeded", "data": {} }
  ```

  The frontend API client unwraps the `data` property. The shapes below therefore describe **`data`**, not the outer envelope.
- An array should return `[]` when there are no rows. Return `null` only for a field explicitly documented as optional.
- Return IDs as strings and dates as ISO-8601 values. Use numbers (not formatted currency strings) for amounts, prices, balances, and scores.
- Every read or write scoped by a teacher, student, assistant, center, or parent must verify the authenticated user has access to that record. A valid Mongo ID alone is not authorization.
- Validate every request body with a Zod schema. Do not pass an unfiltered `req.body` into an update.
- “Implemented” means a route exists in current source. It does **not** automatically mean the frontend contract is complete or the route's authorization and business rules are fully tested.

### A repeatable implementation recipe

Use this same sequence for each feature:

1. **Write down the contract:** HTTP method, exact path, query/path/body fields, response `data` shape, empty-result behavior, and expected errors.
2. **Decide where data lives:** reuse an existing model/embedded array when that is the source of truth; add a model only when the data has an independent lifecycle or query needs.
3. **Add/update the interface and schema:** define persisted fields and indexes in `src/common/interface/` and `src/db/model/`. Keep Mongoose types and Zod input types aligned.
4. **Add validation:** create strict create/update schemas in that feature's `*.validation.ts`; validate IDs, enum values, numeric ranges, and allowed fields.
5. **Implement service logic:** scope every database query by owner; calculate derived response values here; use a Mongo transaction or another atomic approach for money and multi-document state changes.
6. **Add controller route:** authenticate, validate, call the service, and return `successResponce({ res, message, data })`. Keep Express-specific details out of the service.
7. **Mount the route:** check `src/app.controller.ts` and mount any new router at the path the frontend actually calls.
8. **Test four cases:** success, empty/not-found, invalid input, and access to somebody else's ID. For financial actions, also test duplicate/retry/concurrent requests.
9. **Build and exercise the screen:** run `npx tsc`, then use the frontend against the real API and compare its response with the examples below.

## Existing backend structure

`src/app.controller.ts` currently mounts auth, teacher, session, center, and student routers. Public search handlers are also registered there. Current model files include Teacher, Student, Center, Assistant, Parent, Enrollment, Request, Session, Schedule, Chat, and Counter.

The following frontend API groups do **not** currently have a production router/module: assistant self-service (`/assistant/*`), parent (`/parent/*`), teaching content (exams, homework, lessons, booklets), announcements, follow-up, recharge/top-ups, transactions, expenses, and finance.

## API contracts: shared and authentication

| Frontend call | Current source status | Request the frontend sends | `data` the frontend needs |
|---|---|---|---|
| `POST /signup/teacher` | Implemented | Signup form fields; optional uploaded image is sent by the signup-specific multipart flow. | Success data used by the signup flow; return a useful account result, never the password hash. |
| `POST /signup/student` | Implemented | `firstName`, `lastName`, `phone`, `parentPhone`, `grade`, `schoolName`, `learningLanguage`, `gender`, `password`. The form submits strings; grade/language selects use numeric option strings. | `{ userID, qrCode? }`. The client can generate a QR itself if `qrCode` is omitted. |
| `POST /signup/center` | Implemented | Center signup form fields. | Success data used by signup; omit credentials/secrets. |
| `POST /signup/assistant`, `POST /signup/parent` | Missing | No public signup call currently supplies these. Decide whether these roles self-register or are created/invited by another role; do not expose open privileged signup by default. | Account result suitable for the chosen invitation/verification flow. |
| `POST /login/teacher`, `/login/student`, `/login/center` | Implemented | `{ identifier, password }` from the role login form. | `{ accessToken, refreshToken }`; include a trustworthy role/subject in claims or resolve the role server-side. |
| `POST /login/assistant`, `/login/parent` | Missing | `{ identifier, password }`. | Same token shape as other logins, with assistant/parent identity and role. |
| `POST /refresh-token` | Implemented | `{ refreshToken }`. | `{ accessToken }`. Reject expired/revoked/invalid refresh tokens with 401. |
| `POST /verify-acc` | Implemented | Verification identifier/OTP from signup flow. | Success indicator/account state; unknown accounts should produce a controlled 404/400, not a null dereference. |
| `POST /resend-otp` | Implemented | `{ identifier, purpose? }`, where purpose can distinguish account verification from password reset. | Success indicator; enforce cooldown/rate limit and do not disclose whether an arbitrary account exists. |
| `POST /forgot-password[/:role]` | Implemented | `{ identifier }`; optional role is part of the URL. | Success indicator; send a time-limited reset code. |
| `POST /reset-password[/:role]` | Implemented | `{ identifier, otp, password }`. | Success indicator. Consume the code once and apply password policy. |
| `PATCH /:role/password` | Partial | `{ currentPassword, newPassword }`. The frontend calls it for the active role. | `{ updated: true }` or another success value. `PATCH /center/password` exists; teacher, student, assistant, and parent password routes are missing. |
| `POST /uploads` | Missing | `multipart/form-data` with field name `file`. | `{ url }` where the URL can subsequently be stored in profile, homework, lesson, receipt, announcement, or answer data. Enforce authentication, type/size limits, and ownership. Signup image upload is not a replacement for this shared route. |
| `GET /teachers/search?q&subject&grade` | Partial | Optional URL query parameters `q`, `subject`, `grade`. | Array of public teacher cards: `_id`, `firstName`, `lastName`, `userName`, `companyName`, `subject[]`, `teachingLanguage`, `bio`, `profilepic`, `studentsCount`, `centers[]`. Current route reads `q`; add supported filters. |
| `GET /teacher/:id` | Implemented | Teacher ID in path. | Public teacher details plus `studentsCount`, `centers[]`, and `schedule[]` as needed by teacher profile/discovery screens. Do not return password or private account fields. |
| `GET /centers/search?q` | Implemented | Optional `q`. | Array of public center entries (at least ID, name, and the public contact/location fields displayed by the directory). |

### Authentication implementation steps

1. Decide which roles can be created publicly and which must be invited/linked.
2. Ensure login issues distinct, verifiable role identities. Update `auth.middleware.ts` so routes can require roles rather than trusting frontend route hiding.
3. Add the missing role login handlers and shared upload route; mount them from `src/app.controller.ts`.
4. Add role-specific password-change services. Verify the old password, hash the new one, and never return a hash.
5. Add request limits and generic responses for OTP/reset endpoints; test valid, expired, reused, and wrong codes.
6. Verify frontend token refresh: expired access token → one refresh request → retry original request; invalid refresh token → logout/401.

## API contracts: teacher portal

### Teacher profile and dashboard

| Frontend call | Current status | Frontend expects in `data` |
|---|---|---|
| `GET /teacher/profile` | Implemented | Teacher profile fields needed by account form, such as `_id`, names, username, email/phone, company, subjects, language, bio, profile image, and gender. Never include password. |
| `PATCH /teacher/profile` | Implemented | Updated profile object. Allow only editable profile fields; use `POST /uploads` first for a new profile image. |
| `DELETE /teacher/profile` | Implemented | A success result. Define dependency behavior for sessions/enrollments before deletion; soft deletion is safer for history. |
| `GET /teacher/dashboard` | Partial | `{ counts: { students, assistants, centers, pendingRequests, pendingTopups, pendingSubmissions, lowBalance, blocked }, totalBalance, activeSession, todaySlots[], attendanceTrend[], byCenter[], byGrade[], lowBalanceStudents[], recent[] }`. The current service has placeholder sections, so compute them or explicitly adjust the frontend contract. |

#### Dashboard build steps

1. Decide date boundaries/time zone for “today” and recent activity.
2. Fetch only this teacher's active enrollments, sessions, assistant records, center links, and any implemented top-ups/submissions.
3. Calculate counts and total student balance from enrollments; never count archived/pending enrollments as active students.
4. Derive active session, today's schedule, attendance trend, groupings by center/grade, low-balance students, and recent activity.
5. Return empty arrays and zero counts rather than omitting fields. Add tests for a teacher with no students/sessions and for centerless students.

### Students, enrollment actions, requests, and archive

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/myStudents` | Implemented, verify projection | No body. | Array of student profile fields merged with enrollment fields: `balance`, `points`, `isBlocked`, `pricePerSession`, `center`, `centerName`, `adminNote`, `followUpAssistant`, warning count, and joined/last-attended dates where available. |
| `GET /teacher/myStudents/:studentId` | Implemented, verify projection | Student ID. | One student with enrollment fields as above. Return 404 if this student is not enrolled with the authenticated teacher. |
| `PATCH /teacher/myStudents/:studentId` | Partial | Editable student and enrollment values. Expected allowlist: student `firstName,lastName,phone,parentPhone,gender,grade,schoolName,learningLanguage`; enrollment `pricePerSession,center,adminNote,followUpAssistant`. | Updated merged student/enrollment object. Current controller sends raw body to the service; add strict validation and split writes to the proper documents. |
| `POST /teacher/myStudents` | Implemented | Student fields plus optional `center`, `pricePerSession`, `balance`. | Created student/enrollment result, including generated `userID` and one-time temporary password if the UI shows credentials. Never return a stored password/hash. |
| `POST /teacher/myStudents/link` | Implemented | `{ identifier, center?, pricePerSession? }`, where identifier can be student code or phone. | Linked student/enrollment summary. Reject a duplicate active enrollment. |
| `POST /teacher/myStudents/import` | Implemented | `{ students: [...] }`; rows are form/CSV-derived objects. | `{ created: [{ name, userID, password? }], skipped: [{ row, reason }] }`. Bad rows should not silently look successful. |
| `DELETE /teacher/myStudents/:studentId` | Implemented | Optional `{ reason }`. | Success result for archived enrollment. Preserve history; do not delete the Student account. |
| `GET /teacher/archive` | Implemented | No body. | Array of archived student/enrollment display rows with removal reason/date. |
| `POST /teacher/archive/:studentId/restore` | Implemented | Student ID. | Restored enrollment summary; prevent duplicate active enrollment. |
| `GET /teacher/myStudents/:studentId/history` | Implemented, data partial | Student ID. | `{ attendance[], exams[], homework[], transactions[], warnings[], points[], booklets[], lessons[], stats }`. Empty categories are acceptable only until their corresponding storage feature exists; do not fabricate results. |
| `POST /teacher/myStudents/:studentId/balance` | Implemented | `{ amount, reason }`; amount can be positive or negative. | Updated `{ balance, transaction }`. Add a transaction/history entry atomically with balance adjustment. |
| `POST /teacher/myStudents/:studentId/points` | Implemented | `{ points, reason? }`; positive or negative nonzero delta. | Updated points and created point-history entry. |
| `POST /teacher/myStudents/:studentId/warnings` | Implemented | `{ reason }`. | New warning, warning count, and block state. Existing business rule: 3 warnings block unless product policy differs. |
| `DELETE /teacher/myStudents/:studentId/warnings/:warningId` | Missing | Student and warning IDs. | Updated warnings/count/block state. Decide and document whether removing warnings can auto-unblock. |
| `PATCH /teacher/myStudents/:studentId/block` | Missing | `{ blocked: boolean }`. | Updated `isBlocked` value. Distinguish manual block behavior from automatic three-warning block if both must be tracked. |
| `GET /teacher/requests` | Implemented | No body. | Array of pending student join requests with request ID, student public fields, and timestamps. |
| `PATCH /teacher/requests/:id` | Implemented | `{ status: "accepted" | "rejected" }`. | Updated request/enrollment status. Verify request belongs to teacher; accepting should create/activate exactly one enrollment. |

#### Student/enrollment implementation steps

1. Treat Enrollment as the owner of teacher-specific balance, points, warning state, price, center, and follow-up assignment.
2. For create/link, validate the student account and relationship before inserting enrollment. Add/keep a unique `(teacher, student)` index and define pending vs active transitions.
3. For updates, validate with a strict schema, update the Student document and Enrollment document separately, and return one merged view.
4. For balance/points/warnings, add immutable history entries as part of the same atomic operation as the new value.
5. For archive/restore, change `archived` and timestamps/reason; retain balances and history.
6. Test cross-teacher isolation: teacher A must not read or mutate a student only enrolled with teacher B.

### Sessions, attendance, scanning, and closings

The frontend calls **`/session/...`**, mounted from the session router—not `/teacher/sessions/...`.

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /session/sessions` | Implemented | No body; API wrapper can pass a query, though current controller does not use one. | Array of session summaries/details: `_id, sequence, week, number, date, center/centerName, grade, price, status, active, attendance, presentCount, collected`. |
| `GET /session/sessions/:sessionId` | Implemented | Session ID. | One full session report. Each attendance row should include student display data, `markedAt`, `payment`, `charged`, `comment`, `homeworkStatus`, marker, and location as supported. |
| `POST /session/sessions` | Implemented | `{ sequence, week, number, date?, center?, grade?, price? }`. | Created session object including saved optional fields, status, `active`, attendance, and `_id`. Blank center means online/null. |
| `PATCH /session/sessions/:sessionId` | Missing | Partial session fields and/or `{ status: "cancelled" }`. | Updated session; cancellation must refund any recorded charges exactly once if this is the chosen business rule. |
| `DELETE /session/sessions/:sessionId` | Missing | Session ID. | Deletion confirmation/result. Recommended: reject with 409 when attendance/staff/financial records exist; otherwise permit delete. |
| `PATCH /session/sessions/:sessionId/active` | Implemented | `{ active: boolean }`. | Updated session with new active state. Enforce one active session per teacher atomically if that remains the rule. |
| `POST /session/sessions/:sessionId/attendance` | Implemented, contract partial | `{ identifier }` currently; intended UI supports `{ identifier, payment?, comment?, homeworkStatus?, force? }`. | `{ session, student, charged, balance }` or equivalent fields needed to update scan UI. Reject duplicate attendance. Apply blocked/insufficient-balance rules consistently. |
| `PATCH /session/sessions/:sessionId/attendance/:studentId` | Missing | `{ payment?, comment?, homeworkStatus? }`. | Updated attendance row plus resulting balance if payment changed. Record a ledger adjustment for any changed amount. |
| `DELETE /session/sessions/:sessionId/attendance/:studentId` | Missing | IDs only. | Updated session and refunded balance/transaction where applicable. Make retries idempotent. |
| `POST /session/sessions/:sessionId/homework` | Missing | `{ identifier, status }`, status intended as `complete`, `incomplete`, `no_steps`, or `not_done`. | Updated attendance row/session. Reject students not attended if required by product rules. |
| `PUT /session/sessions/:sessionId/closing` | Implemented | `{ normalCost, reducedCost, reducedCount, notes? }`. | Updated closing: costs/counts and derived `normalCount`/`total` if the UI displays them. |
| `POST /session/sessions/:sessionId/staff` | Missing | `{ assistant, checkIn? }`. | Created staff attendance entry with assistant summary, check-in, and computed duration fields as relevant. |
| `PATCH /session/sessions/:sessionId/staff/:entryId` | Missing | `{ checkIn?, checkOut?, notes? }`. | Updated staff entry. Validate the assistant belongs to the teacher and entry belongs to this session. |
| `DELETE /session/sessions/:sessionId/staff/:entryId` | Missing | IDs only. | Updated session/staff list. |
| `GET /session/scan/lookup?identifier=` | Missing at frontend path | Query `{ identifier }`. Existing backend lookup is `GET /teacher/scan/lookup`. | `{ student, activeSession, attended, attendance, price, allowed, reasons[], warnings[], booklets[], lastSessions[] }`. Either add alias route or change frontend path; also preserve its 404 fallback deliberately. |

#### Session/attendance implementation steps

1. Decide whether attendance, staff, and closing data are embedded in Session or stored separately. The current Session model embeds attendance and closing; extend that source instead of duplicating data.
2. Define schemas for editing a session, attendance, homework status, staff check-in, and staff update. Validate ObjectIds and enum values.
3. Add service functions that first load the session using both `_id` and authenticated teacher ID.
4. For check-in, resolve identifier within that teacher's active enrollments, check blocked/balance state, insert attendance once, and update ledger/balance in an atomic operation.
5. For attendance deletion/payment changes and cancellation, calculate exact refund/adjustment from stored `charged`/`payment`; record each financial effect once.
6. Add the missing routes to `session.controller.ts`; fix the scan path mismatch using one canonical URL or a documented alias.
7. Test duplicate check-ins, low balance, blocked student, concurrent activation, cancellation retry, and a student/teacher who does not own the session.

### Schedule

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/schedule` | Implemented | No body. | Array of slots: `_id, title, dayOfWeek (0=Sun), startTime ("HH:MM"), durationMinutes, center, centerName, grade, notes, isActive`. |
| `POST /teacher/schedule` | Implemented | `{ title?, dayOfWeek, startTime, durationMinutes?, center?, grade?, notes?, isActive? }`. | Created slot in the same shape. |
| `PATCH /teacher/schedule/:slotId` | Implemented | Partial slot fields. | Updated slot. Reject empty patches and fields not in allowlist. |
| `DELETE /teacher/schedule/:slotId` | Implemented | ID only. | Success/deleted slot ID. |
| `POST /teacher/schedule/:slotId/start` | Implemented | `{ sequence }`. | Created and activated session associated with that slot, with center and grade inherited from the slot. |

### Exams and grading

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/exams` | Missing | No body. | Array of exams with `_id, name, maxScore, date, session, grade, results[], stats, sessionLabel`. |
| `GET /teacher/exams/:examId` | Missing | Exam ID. | One exam in detail shape with populated student names in results. |
| `POST /teacher/exams` | Missing | Form fields: exam name, max score, date, optional grade/session as present in UI. | Created exam object and ID. |
| `PATCH /teacher/exams/:examId` | Missing | Editable exam fields. | Updated exam object. |
| `DELETE /teacher/exams/:examId` | Missing | Exam ID. | Success/deleted ID; decide whether results are deleted or archived with it. |
| `PUT /teacher/exams/:examId/scores` | Missing | `{ scores: [{ student, score: number | null }] }`. | Updated exam/results and recalculated `{ count, avg, max, min }`. |

Exam result rows need `{ student, score }`. Student-facing endpoint expects each row as `{ exam: { _id, name, maxScore, date }, score, rank, participants, stats: { count, avg, max, min } }`; unscored student results use `score: null`.

### Online homework

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/homework` | Missing | No body. | Array of homework: `_id, title, description, order, startDate, endDate, externalLink, submissionType, isOpen` and optionally counts. |
| `POST /teacher/homework` | Missing | Form fields: title/details, start/end dates, submission type, external link, and target grade/session fields shown by the form. | Created homework object. |
| `PATCH /teacher/homework/:homeworkId` | Missing | Editable homework fields. | Updated homework object. |
| `DELETE /teacher/homework/:homeworkId` | Missing | ID only. | Success/deleted ID; preserve existing submissions or explicitly reject deletion if they exist. |
| `GET /teacher/homework/:homeworkId/submissions` | Missing | ID only. | `{ homework, submissions[] }`; each submission includes student, status, files/link/comment, submitted date, and grading feedback. |
| `PATCH /teacher/homework/submissions/:submissionId` | Missing | `{ status, feedback }` as consumed by grading form. | Updated submission with new status/feedback. |

Student contract: `GET /student/teachers/:teacherId/homework` returns homework records with a `submission` object or `null`; `POST /student/homework/:homeworkId/submit` accepts `{ files: string[], comment?, link? }` and returns `{ submitted: true }` or the saved submission. Check due date, open state, enrollment, and allowed file count/type.

### Video lessons, access, questions, and answers

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/lessons` | Missing | No body. | Array of lesson summaries with counts and publish/access fields. |
| `GET /teacher/lessons/:lessonId` | Missing | ID only. | Lesson including `parts[]`, `questions[]`, and grants/answers needed by teacher editor. |
| `POST /teacher/lessons` | Missing | Form data: title, description, week, grade, pricing/free state, access settings, ordered parts and questions. | Created lesson with IDs for nested parts/questions. |
| `PATCH /teacher/lessons/:lessonId` | Missing | Updated lesson fields; UI sends complete `parts[]` and `questions[]` arrays when editing. | Updated lesson. Preserve IDs that remain; remove only omitted nested items according to the editor's replace-all contract. |
| `DELETE /teacher/lessons/:lessonId` | Missing | ID only. | Success/deleted ID; define grant/progress cleanup. |
| `POST /teacher/lessons/:lessonId/grants` | Missing | `{ student, maxViews, hours }`. | Created grant with `_id`, limits, usage, and expiry data. |
| `DELETE /teacher/lessons/:lessonId/grants/:grantId` | Missing | IDs only. | Success/revoked grant. |
| `GET /teacher/lessons/:lessonId/answers` | Missing | Lesson ID. | Student answers with question/student, choice/image/text, pending/correct state, points, and timestamps. |
| `PATCH /teacher/lessons/answers/:answerId` | Missing | `{ isCorrect, points }` for essay grading. | Updated answer; apply awarded points to the correct student's enrollment exactly once. |
| `GET /student/teachers/:teacherId/lessons` | Missing | Teacher ID. | Array with `_id,title,description,week,order,price,partsCount,questionsCount,durationSeconds,access,watchedSeconds`. |
| `GET /student/lessons/:lessonId` | Missing | Lesson ID. | Public lesson details, access state, parts, questions, and progress. Do **not** return playable part URLs unless access is open. |
| `POST /student/lessons/:lessonId/unlock` | Missing | No body. | `{ access, balance? }`; debit only once and return 409 with `cause.code = "INSUFFICIENT_BALANCE"` if needed. |
| `POST /student/lessons/:lessonId/progress` | Missing | `{ start: true }` to start/open or `{ part, seconds }` to save progress. | `{ access }` and updated watched progress. Enforce view count and access expiry. |
| `POST /student/questions/:questionId/answer` | Missing | MCQ `{ choice }`; essay/photo `{ imageUrl }` or supported text. | Answer object with `_id, question, lesson, choice/imageUrl/text, status, isCorrect, points`, and `correct` only when safe to reveal. |

Lesson access states the UI understands: `free`, `granted`, `available`, `locked`, `expired`, and `exhausted`. Pick one source of truth for grant expiration, view consumption, and watched seconds; enforce it in the service, not just the view.

### Booklets

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/booklets` | Missing | No body. | Array of catalog entries: `_id, name, description?, sellPrice, stock, active?`. |
| `POST /teacher/booklets` | Missing | Form fields for name, price, stock, description/image as displayed. | Created booklet. |
| `PATCH /teacher/booklets/:bookletId` | Missing | Editable catalog fields. | Updated booklet. |
| `DELETE /teacher/booklets/:bookletId` | Missing | ID only. | Success/deleted ID; handle existing orders without losing records. |
| `GET /teacher/booklets/orders` | Missing | No body. | Orders with booklet and student summaries, `_id, price, paid, delivered, method, status, receiptUrl, reference, createdAt`. |
| `POST /teacher/booklets/orders` | Missing | Form data identifies student/booklet and payment method/details. | Created order. Validate stock and avoid duplicate active reservations as required by policy. |
| `PATCH /teacher/booklets/orders/:orderId` | Missing | `{ status?, paid?, price?, delivered? }`. | Updated order. Record payment/delivery state change and any money ledger entry. |
| `GET /student/teachers/:teacherId/booklets` | Missing | Teacher ID. | Array of `{ booklet, order }`; order may be `null`. |
| `POST /student/booklets/:bookletId/reserve` | Missing | `{ method: "center" }` or `{ method: "transfer", receiptUrl, reference }`. | Created order with price/payment/delivery/status fields. |

### Wallet, recharge, top-ups, transactions, finance, and expenses

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/recharge-codes` | Missing | No body. | Teacher-owned code list with amount, batch, created/expiry, redeemed state/student. |
| `POST /teacher/recharge-codes` | Missing | `{ count, amount, prefix?, batch? }`; UI caps count at 200. | Created codes/list and batch summary. Generate unpredictable codes; store only a safe representation if possible. |
| `DELETE /teacher/recharge-codes/:codeId` | Missing | ID only. | Success for an unused code; reject deleting redeemed codes. |
| `GET /teacher/topups` | Missing | No body. | Pending/reviewed top-up requests with student, amount, method, reference, receipt URL, status, date. |
| `PATCH /teacher/topups/:topupId` | Missing | `{ status: "approved" | "rejected", amount?, reason? }`. | Updated top-up. Only approval credits enrollment balance; protect against repeat approval. |
| `GET /teacher/transactions?from&to&type&student` | Missing | Optional filters. | Array of transactions: `_id, createdAt, type, reason, amount, student`; credits positive and charges negative. |
| `GET /teacher/finance?from&to` | Missing | Date range query. | `{ totals: { cash, recharge, topups, booklets, income, expenses, centerCosts, salaries, net, charged }, byDay[], sessions[] }`. Derive from the ledger, not unrelated ad hoc sums. |
| `GET /teacher/expenses?from&to` | Missing | Optional date range. | Array of expense records: `_id, amount, category, note/reason, date, createdAt`. |
| `POST /teacher/expenses` | Missing | Expense form fields, at minimum amount, category/description, and date. | Created expense record. Validate finite nonnegative amount and teacher ownership. |
| `DELETE /teacher/expenses/:expenseId` | Missing | ID only. | Success/deleted ID; enforce teacher ownership. |
| `GET /student/teachers/:teacherId/transactions` | Missing | Teacher ID. | Array `{ _id, createdAt, type, reason, amount }`. |
| `POST /student/recharge` | Missing | `{ code }`. | `{ amount, balance, teacher }`; one-time redemption, scoped to the student's active teacher enrollment. |
| `POST /student/teachers/:teacherId/topups` | Missing | `{ amount, method, reference, receiptUrl }`. | Created pending top-up `{ _id, amount, method, reference, receiptUrl, status, createdAt }`. Do not credit balance until approved. |

#### Money implementation steps

1. Define one ledger convention first: positive means credit to student/teacher, negative means charge; every entry has owner, amount, type, reason, actor, and timestamp.
2. Decide whether Enrollment's embedded transaction history is sufficient or create a dedicated transaction collection for query volume and cross-feature reporting. Avoid maintaining two unsynchronized ledgers.
3. Wrap balance changes and ledger writes in a Mongo transaction where supported; otherwise use conditional atomic updates and idempotency keys.
4. Add RechargeCode and TopUp models; enforce unique code/reference constraints and single-use redemption.
5. Implement approval state transitions so retrying the same approval cannot credit a balance twice.
6. Build finance totals by aggregating the ledger and expense/closing/salary sources; test a hand-calculated example including refunds.

### Announcements, follow-up, and leaderboard

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/announcements` | Missing | No body. | Array of active/managed announcement cards. |
| `POST /teacher/announcements` | Missing | `{ title, body, imageUrl?, videoUrl?, linkUrl?, audience: { grades[], centers[] }, isActive?, pinned? }`. | Created announcement with `_id`, timestamps, and normalized audience. |
| `PATCH /teacher/announcements/:announcementId` | Missing | Partial announcement fields from allowlist. | Updated announcement. |
| `DELETE /teacher/announcements/:announcementId` | Missing | ID only. | Success/deleted ID. |
| `GET /teacher/follow-up?session&mine=1` | Missing | Optional session ID and assistant-only `mine=1` filter. | `{ sessions[], session, exam, assistants[], rows[] }`. Each row includes student, balance, attended, homework status, exam score, recent absences, assigned assistant, and latest comment. |
| `POST /teacher/follow-up/comments` | Missing | `{ student, session?, comment }`. | Saved comment with author and timestamp. |
| `PUT /teacher/follow-up/assign` | Missing | `{ assistant: assistantId | null, students: studentIds[] }`. | `{ updated: number }` or updated assignment rows. |
| `GET /teacher/leaderboard` | Implemented | No body. | Array `{ rank, student, points, centerName }`; student fields should be appropriate for the teacher. Verify ties and missing/population behavior. |
| `GET /student/teachers/:teacherId/leaderboard` | Missing | Teacher ID. | Array `{ rank, name, points, isMe, centerName }`. Do not leak phone, user code, or other private fields for other students. |

Follow-up needs stored homework/exam outcomes to calculate every “needs attention” reason. Until those models/routes exist, return explicit null/unknown values rather than pretending that missing work is complete.

### Assistants

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /teacher/assistants` | Implemented | No body. | Teacher-owned assistants without password/hash. Include `_id`, names, username, email/phone, role, permissions, and salary fields used by the page. |
| `POST /teacher/assistants` | Implemented | `{ firstName?, lastName?, userName, email, phone, password }`; UI filters empty optional fields. | Created assistant (typically with an ID and role/permissions). UI may make a follow-up update call to set role/permissions. |
| `PATCH /teacher/assistants/:assistantId` | Missing | Names, phone, role, permissions, and `salary: { type, amount }`. | Updated assistant without password. Validate role and permission names. |
| `DELETE /teacher/assistants/:assistantId` | Missing | ID only. | Success/deleted ID; decide how existing staff attendance/history remains readable. |
| `GET /teacher/assistants/:assistantId/stats` | Missing | Assistant ID. | `{ assistant, sessionsWorked, minutes, attendanceMarked, homeworkChecked, ... }` for selected period as supported. |
| `GET /assistant/profile` | Missing | No body. | Assistant profile, `role`, `permissions[]`, and teacher public summary. |
| `PATCH /assistant/profile` | Missing | Editable assistant profile fields only. | Updated assistant profile. |
| `GET /assistant/work-log` | Missing | No body. | Work/check-in history and salary estimate; define period and salary calculation fields. |
| Assistant access to `/teacher/*` | Partial/system-wide | Frontend intentionally reuses teacher routes. | Resolve assistant's teacher ID server-side, then check permission for each operation. Assistant must never supply an arbitrary teacher ID to gain access. |

`Assistant` model already exists, but salary fields may need to be added to its interface/model. Do not add an `assistants[]` field to Teacher just to make list work; assistants already have a `teacher` reference.

## API contracts: learning-center portal

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /center/profile` | Implemented | No body. | Center's public/editable profile fields. |
| `PATCH /center/profile` | Implemented | Partial validated profile fields. | Updated profile. |
| `PATCH /center/password` | Implemented | `{ currentPassword, newPassword }`. | Success indicator. |
| `GET /center/dashboard` | Implemented | No body. | Counts, closings due, today schedule, active sessions, by-teacher groups, recent sessions as displayed by center dashboard. |
| `GET /center/teachers` | Implemented | No body. | Array `{ teacher, status, requestedBy, studentsCount, sessionsCount, attendanceCount, lastSessionAt, slots[] }`. |
| `POST /center/teachers/invite` | Implemented | `{ identifier }` (teacher username/contact as accepted by form). | Created/updated center-teacher request. |
| `PATCH /center/teachers/:teacherId` | Implemented | `{ status }` (`active` or rejected status as defined by validator). | Updated relationship/request. |
| `DELETE /center/teachers/:teacherId` | Implemented | Teacher ID. | Success/unlinked result. |
| `GET /center/schedule` | Implemented | No body. | Active slots at this center for linked teachers, including teacher display info. |
| `GET /center/sessions?from&to` | Implemented | Optional date range. | Sessions at this center with teacher public summary, present count and closing totals; do not return student personal data. |

### Center implementation/test steps

1. Verify every query is scoped to the authenticated center and active teacher-center links.
2. Check that changing a request to active/rejected updates the same relationship state read by `GET /center/teachers` and teacher schedule.
3. Return attendance counts and totals only; test serialized responses for accidental student names, phone numbers, or codes.
4. Test sessions with no center closing and date-range boundaries.

## API contracts: student portal

All `/student/teachers/:teacherId/...` routes must verify the authenticated student has an **active, non-archived enrollment** with that teacher.

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /student/profile` | Implemented | No body. | Student profile: `_id,userID,firstName,lastName,phone,parentPhone,gender,grade,schoolName,learningLanguage,profilepic,createdAt`. |
| `PATCH /student/profile` | Implemented, validate fields | `{ firstName?, lastName?, parentPhone?, schoolName?, profilepic? }`. | Updated profile in the same shape as GET. Never accept changes to userID, password, balance, or enrollment fields here. |
| `GET /student/teachers` | Implemented | No body. | Array `{ teacher: publicTeacher, status, joinedAt, balance }`; pending balance may be null. |
| `POST /student/teachers/:teacherId/request` | Implemented | No body. | `{ status: "pending" }`; duplicate/active request should be a conflict, not a duplicate row. |
| `DELETE /student/teachers/:teacherId/request` | Missing | No body. | `{ status: "none" }`; only cancel a pending request. Never silently unlink an active teacher. |
| `GET /student/teachers/:teacherId/overview` | Partial | Teacher ID. | `{ teacher, balance, pricePerSession, points, rank, classSize, isBlocked, centerName, warnings[], nextSlot, lastSession, stats, announcements[], followUp }`. `nextSlot`, `lastSession`, and `followUp` can be null. Rates unsupported by persisted data should be explicit null and rendered as unavailable. |
| `GET /student/teachers/:teacherId/sessions` | Partial/broken | Teacher ID. | Array `{ session: { _id, sequence, week, number, date, centerName? }, status, markedAt, location, homeworkStatus, payment, comment }`. Current service refers to `this.sessionRepository`, which is not initialized in its constructor; fix this before using the route. |
| `GET /student/teachers/:teacherId/lessons` | Missing | Teacher ID. | Array lesson summaries: `_id,title,description,week,order,price,partsCount,questionsCount,durationSeconds,access,watchedSeconds`. |
| `GET /student/lessons/:lessonId` | Missing | Lesson ID. | Lesson details and access state. Hide protected video URLs until access is authorized. |
| `POST /student/lessons/:lessonId/unlock` | Missing | No body. | `{ access, balance? }`; 409 insufficient balance with machine-readable `cause.code`. |
| `POST /student/lessons/:lessonId/progress` | Missing | `{ start: true }` or `{ part, seconds }`. | `{ access }` and updated progress; enforce view/expiration limits. |
| `POST /student/questions/:questionId/answer` | Missing | `{ choice }` or `{ imageUrl }`/supported essay data. | Saved answer with correct/pending status, earned points, and safe feedback. |
| `GET /student/teachers/:teacherId/homework` | Missing | Teacher ID. | Array homework rows with details and `submission` object or null. |
| `POST /student/homework/:homeworkId/submit` | Missing | `{ files: string[], comment?, link? }`. | `{ submitted: true }` or saved submission. |
| `GET /student/teachers/:teacherId/exams` | Missing | Teacher ID. | Array `{ exam: { _id,name,maxScore,date }, score, rank, participants, stats: { count,avg,max,min } }`; score/rank can be null. |
| `GET /student/teachers/:teacherId/booklets` | Missing | Teacher ID. | Array `{ booklet: { _id,name,sellPrice,stock }, order: null | orderSummary }`. |
| `POST /student/booklets/:bookletId/reserve` | Missing | `{ method: "center" }` or `{ method: "transfer", receiptUrl, reference }`. | Created order with `_id,price,paid,delivered,method,status,receiptUrl,reference,createdAt`. |
| `GET /student/teachers/:teacherId/transactions` | Missing | Teacher ID. | Array `{ _id,createdAt,type,reason,amount }`; positive amount is credit, negative is charge. |
| `POST /student/recharge` | Missing | `{ code }`. | `{ amount,balance,teacher }`; redeem once and credit the correct enrollment. |
| `POST /student/teachers/:teacherId/topups` | Missing | `{ amount,method,reference,receiptUrl }`. | Created top-up with status pending. Do not change balance until approval. |
| `GET /student/teachers/:teacherId/leaderboard` | Missing | Teacher ID. | Array `{ rank,name,points,isMe,centerName }`; other students' private fields must not be returned. |
| `PATCH /student/password` | Missing | `{ currentPassword,newPassword }`. | Success result such as `{ updated: true }`. |

### Student implementation steps

1. Fix `getTeacherSessions`: either inject a `DatabaseReposatory<ISession>` correctly or query `sessionModel` directly; remove unused filters/variables and handle an online session whose `center` is null.
2. Add an enrollment helper that returns/throws for a missing or inactive teacher enrollment. Reuse it in each student-scoped service method.
3. Implement sessions/overview from attendance and sessions first; define status rules for cancelled, attended, currently active, and past sessions.
4. Implement content and wallet features only after their teacher-side create/review APIs and storage exist.
5. Keep response values UI-ready: percentages as numbers, money as numbers, ISO dates, arrays for list fields, and null for genuinely unavailable optional objects.
6. Test that changing a teacher ID in the URL cannot reveal another student's data.

## API contracts: parent portal

| Frontend call | Current status | Request | Frontend expects in `data` |
|---|---|---|---|
| `GET /parent/profile` | Missing | No body. | `{ name, phone, children: [{ student fields, teachers[] }] }`, limited to linked children. |
| `POST /parent/children` | Missing | `{ code }` (student code used by the link-child form). | Linked child summary; reject a code whose student's parent phone does not match the parent's verified phone unless there is a separate secure verification process. |
| `DELETE /parent/children/:studentId` | Missing | Student ID. | Success/unlinked result; cannot unlink another parent's child. |
| `GET /parent/children/:studentId/report?teacher=:teacherId` | Missing | Child path ID; selected teacher query. | Report for this child/teacher: attendance, exam summaries, payments/transactions, warnings, and assistant contact where data exists. Verify both parent-child link and active teacher relationship. |

### Parent implementation steps

1. Implement parent authentication and ensure a parent identity is in the token.
2. Pick one authoritative link design: current `Parent.child[]` for a simple relationship, or a separate link model if verification/history/status is required.
3. Verify child linking using a verified phone/code process; do not let an unverified user claim any student by knowing a code.
4. Build report queries from the child's enrollment and existing history collections, and test a parent attempting to request an unlinked child.

## Exact frontend form and response contracts for missing/partial APIs

This section refines the summary tables above using the actual form/view code. “Required” means the UI enforces it or requires it before submission; the backend must still validate every field. Response properties called **required by the view** are read directly by the UI, while optional properties are rendered conditionally or have a fallback.

### Serialization rules used by the forms

- `formDialog` converts `type: "number"` inputs to numbers; a blank number becomes `null`. Selects, dates, text, URLs, and textarea values are strings. Checkboxes are booleans; checkbox groups are arrays of strings.
- A select with “No center” / “All grades” can serialize its empty choice as an empty string. Normalize that to `null` (center) or the agreed “all grades” representation at the API boundary; do not persist `""` accidentally.
- Upload controls do not send file bytes in normal JSON requests. The view first uploads the file using `POST /uploads`, then sends the returned `url` in the feature request.
- The API client unwraps the envelope, so views consume `data` directly. A form that refreshes a list may only require a successful result; a detail/editor screen often needs the saved entity returned immediately.

### Teacher session and report forms

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST /session/sessions` create | Required `sequence: string`, `week: number`, `number: number`; optional `date: string` (`YYYY-MM-DD`), `center: string \| null`, `grade: string \| number \| null`, `price: number \| null`. The separate `activate` checkbox is **not** in the create body; after create, checked means a second `PATCH /session/sessions/:id/active` with `{ active: true }`. | Create must return `_id` so the follow-up activation works; list/detail render `sequence,week,number,date,centerName,grade,active,status,presentCount,attendance,collected`. |
| `PATCH /session/sessions/:id` edit | Same fields as create, but optional. Cancel sends `{ status: "cancelled" }`; restore sends `{ status: "normal" }`. | Updated session/list item. |
| `POST /session/sessions/:id/attendance` mark present | `{ identifier: string, force?: boolean }`; `identifier` is a student code or ID. `force: true` is retried only after the UI confirms an `INSUFFICIENT_BALANCE` or `BLOCKED` error. | Success triggers a reload; report rows use `attendance[]` with `student,markedAt,payment,charged,comment,homeworkStatus,markedBy,location`. Errors need a machine-readable `details.code` to enable the explicit force retry. |
| `PATCH /session/sessions/:id/attendance/:studentId` edit row/homework | Payment editor sends `{ payment: number \| null, comment: string }`; homework selector sends `{ homeworkStatus: string \| null }`. Changing payment changes the balance as stated in the form. | Success triggers a report reload; retain all attendance row properties listed above. |
| `POST /session/sessions/:id/homework` scan homework | `{ identifier: string, status: string }`; identifier is the student code (fallback student ID). Status is one of the configured `HOMEWORK_STATUS` keys other than `"submitted"`. | Success triggers the scan workflow to record the status and move to the next student. |
| `GET /session/scan/lookup?identifier=...` | Query parameter `identifier` is the scanned code or entered identifier. | Scan result reads `student` and `allowed`; student fields include `userID,name,phone,parentPhone,balance,isBlocked`. This is currently called at `/session/scan/lookup`, so the backend mount must match that exact path (not only `/teacher/scan/lookup`). |
| Session closing save | `{ normalCost: number, reducedCost: number \| null, reducedCount: number \| null, notes: string }`. | `closing: { normalCount,normalCost,reducedCount,reducedCost,total,notes }`; report displays all these values and calculates cash-after-center from `total`. |
| Assistant check-in | `{ assistant: string, checkIn: string, notes: string }`; `checkIn` is a `datetime-local` string. Check-out sends `{ checkOut: ISO datetime string }`. | `staff[]` rows: `_id,assistant,checkIn,checkOut,minutes,notes`; assistant display requires name fields. |
| `GET /session/sessions/:id` | No form body. | Report directly reads `week,number,sequence,date,centerName,grade,status,active,attendance[],staff[],closing`. Each attendance row needs `student` (name, code, phone, parentPhone, balance), `payment,charged,markedAt,homeworkStatus,comment,markedBy`. `staff` and `closing` may be empty/null. Absent students are calculated client-side from the teacher’s student list, so `GET /teacher/myStudents` must also return student `_id/userID` and center/grade fields. |

### Teacher schedule forms

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST/PATCH /teacher/schedule[/:slotId]` | `{ title: string, dayOfWeek: number, startTime: "HH:MM", durationMinutes: number \| null, center: string \| null, grade: string \| number \| null, notes: string, isActive: boolean }`. Title/day/time are required. Day options are Sunday=0 through Saturday=6. | Schedule grid reads `_id,title,dayOfWeek,startTime,durationMinutes,centerName,grade,notes,isActive`; center and grade can be absent/null. |
| `POST /teacher/schedule/:slotId/start` | `{ sequence: string }`, required topic for today’s session. | Created live session must return `_id`; center and grade should be inherited from the slot. UI navigates to scanning after creation. |

### Teacher student-management forms

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST /teacher/myStudents` create student | Required `firstName,phone`; optional `lastName,parentPhone,grade,gender,schoolName,learningLanguage,center,pricePerSession`. Numeric fields are numbers or `null`; center and grade are select values. | The credentials dialog reads `{ userID, password?, student }`; `student` needs `firstName,lastName`. |
| `PATCH /teacher/myStudents/:studentId` edit | `firstName,lastName,phone,parentPhone,grade,schoolName,learningLanguage,gender,center,pricePerSession,adminNote`, plus `followUpAssistant` only when assistants are available. | Reloaded profile reads student fields plus `userID,balance,points,isBlocked,warningsCount,centerName,pricePerSession`. |
| `POST /teacher/myStudents/:studentId/balance` | UI asks `kind: "add" \| "deduct"`, positive `amount`, and `reason`; the API receives `{ amount: positive number for add or negative number for deduct, reason: string }`. | Reloaded profile/history; transaction row needs `createdAt,type,reason,amount`. |
| `POST /teacher/myStudents/:studentId/points` | `{ points: number, reason: string }`; a negative number removes points. | Updated student points and point-history row. |
| `POST /teacher/myStudents/:studentId/warnings` | `{ reason: string }`, required. | Updated `warnings[]`, `warningsCount`, and `isBlocked`; warning rows need `_id,reason,createdAt`. |
| `DELETE /teacher/myStudents/:studentId/warnings/:warningId` | No body. | Updated warning list/count and block state. |
| `PATCH /teacher/myStudents/:studentId/block` | `{ blocked: boolean }`. | Updated `isBlocked`. |
| `DELETE /teacher/myStudents/:studentId` archive | `{ reason: string }`; reason is optional. | Success is followed by navigation/reload; archive list needs student summary and removal reason/date. |
| `GET /teacher/myStudents/:studentId/history` | No body. | Tabs consume `attendance[]` (`session, status, markedAt, payment, homeworkStatus`), `exams[]` (`exam,score,rank,participants,stats`), `homework[]` (`homework,submission`), `transactions[]` (`createdAt,type,reason,amount`), `warnings[]`, `points[]`, `booklets[]` (`booklet,price,paid,delivered,deliveredAt,status`), `lessons[]` (`lesson,access,watchedSeconds,totalSeconds`), and `stats: { attendanceRate,present,absent,homeworkRate,examAvg }`. |

### Teacher exam, homework, and lesson forms

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST/PATCH /teacher/exams[/:examId]` | `{ name: string, maxScore: number, date: string, grade: string \| number \| null, session: string \| null }`; name/max score are required in the form. | Detail/editor reads `_id,name,maxScore,date,grade,session,results[],stats,sessionLabel`; list rows need exam name/date/max score and result rows. |
| `PUT /teacher/exams/:examId/scores` | `{ scores: [{ student: string, score: number \| null }] }`. The score is a number or null for absent; the form submits all rows, including rows hidden by the current search filter. | Updated scores and recalculated statistics; students’ exam view reads `exam:{_id,name,maxScore,date},score,rank,participants,stats:{count,avg,max,min}`. |
| `POST/PATCH /teacher/homework[/:homeworkId]` | `{ title: string, description: string, startDate: string, endDate: string, submissionType: "upload" \| "link", externalLink: string, grade: string \| number \| null }`. Title and dates are required. | List/detail reads `_id,title,description,order,startDate,endDate,externalLink,submissionType,isOpen`; submissions view also needs each submission’s `student,status,files,link,comment,submittedAt,feedback`. |
| `PATCH /teacher/homework/submissions/:submissionId` | `{ status: string, feedback: string }`; use the UI’s configured homework status values and do not silently accept unknown statuses. | Updated submission with `status,feedback`; student view renders those and submitted date/files. |
| `POST/PATCH /teacher/lessons[/:lessonId]` | The editor sends `{ title,description,week,grade,isFree,price,accessHours,viewsIfAttended,viewsIfPaid,sessions, published, parts, questions }`. Detail fields are title/week/grade plus the remaining optional settings. Each part is `{ title,category,url,durationSeconds }`; a file is uploaded first and only its URL is sent. Each question is `{ text,imageUrl,part,type,trigger,triggerSeconds,choices,correct,bonusPoints,isActive }`; MCQ `choices` is `{a,b,c,d}` and `correct` is `"a"|"b"|"c"|"d"`, essay uses `{}` and `null`. New question editor-only `tempId` is stripped before sending. Parts/questions arrays are sent as the editor’s full current arrays. | Editor requires returned lesson `_id,title,description,week,grade,isFree,price,accessHours,viewsIfAttended,viewsIfPaid,sessions,published,parts[],questions[],grants[]`. Saved nested parts/questions need IDs for later question-to-part references and answer/grant routes. |
| `POST /teacher/lessons/:lessonId/grants` | `{ student: string, maxViews: number \| null, hours: number \| null }`. | Updated grants list; grant rows need student, usage/view limits and expiry/access dates. |
| `PATCH /teacher/lessons/answers/:answerId` | `{ isCorrect: boolean, points: number }`; incorrect answers send `points: 0`. | Updated answer; the UI reloads the lesson answer list. |
| `GET /teacher/lessons/:lessonId/answers` | No body. | Rows read `answer._id,student,question.text,imageUrl,text,isCorrect,points,status`; `question.bonusPoints` is used as the initial grading points value. |

### Teacher booklet, wallet, announcement, follow-up, assistant, and finance forms

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST/PATCH /teacher/booklets[/:bookletId]` | `{ name: string, grade: string \| number, stock: number, printPrice: number, sellPrice: number, isActive: boolean }`; fields come from catalogue form. | Catalogue rows need `_id,name,grade,stock,printPrice,sellPrice,isActive`; order rows need populated `booklet.name` and order fields. |
| `POST /teacher/booklets/orders` assign/sell | `{ student: string, booklet: string, price: number \| null, paid: number, delivered: boolean }`. Price may be blank/null to use normal sell price. | Order needs `_id,student,booklet,price,paid,delivered,status,method,receiptUrl,reference,createdAt`. Student/booklet are populated display objects. |
| `PATCH /teacher/booklets/orders/:orderId` | Review sends `{ status: "verified" \| "rejected" }`; payment edit sends `{ price: number, paid: number }`; delivery sends `{ delivered: true }`. | Updated order; student booklets read `price,paid,delivered,deliveredAt,status,method`. |
| `POST /teacher/recharge-codes` | `{ count: number, amount: number, prefix: string, batch: string }`. | Generated code rows/list entries need code, amount, status, batch and timestamps as displayed. |
| `PATCH /teacher/topups/:id` review | `{ status: string, amount: number, reason: string }`. UI should only allow the declared approve/reject statuses. | Updated top-up state; approving may affect enrollment balance and must produce a transaction exactly once. |
| `GET /teacher/transactions?from&to&type` and `GET /teacher/expenses?from&to` | Query values are optional date strings and type filter string; expense creation sends `{ amount: number, category: "printing" \| "rent" \| "salaries" \| "supplies" \| "marketing" \| "other", reason: string, date: string }`. | Transaction table reads `createdAt,type,reason,amount`; expenses read `_id,amount,category,reason,date`. Finance summary fields must be numeric and match the date-filtered rows. |
| `POST/PATCH /teacher/announcements[/:id]` | `{ title,body,imageUrl,videoUrl,linkUrl,audience:{grades:string[],centers:string[]},pinned:boolean,isActive:boolean }`. Image file is uploaded first; `imageUrl` is the returned upload URL. Empty audience arrays mean no selected grade/center restriction only if that is the agreed product rule. | Announcement card reads `_id,title,body,imageUrl,videoUrl,linkUrl,audience,pinned,isActive,createdAt`. |
| `GET /teacher/follow-up?session&mine` | `session` and `mine` are query filters; no request body. | Results include `rows[]` with `student` (userID/name/phone/parentPhone), `attended,homeworkStatus,examScore,absences,assignedTo,lastComment`; also `assistants[]` with `_id,name`. |
| `POST /teacher/follow-up/comments` | `{ student: string, session: string, comment: string }`; comment is required. | Saved note’s `comment,byName,createdAt`; the view inserts those values into `lastComment`. |
| `POST /teacher/follow-up/assign` | `{ assistant: string \| null, students: string[] }`; selected students are all checked rows. Null assistant means unassign. | Success followed by a full list reload. |
| `POST /teacher/assistants` then `PATCH /teacher/assistants/:id` | Create form: `{ firstName,lastName,userName,email,phone,password,fullAccess,permissions }`; UI removes `fullAccess` from the POST, then calls update with `{ role: "Admin" \| "Assistant", permissions }`. Edit sends `{ firstName,lastName,phone,role,permissions,salary:{type,amount} }`. | Assistant list needs `_id,name/firstName,lastName,email,phone,role,permissions,salary,isActive`; stats view reads `sessionsWorked,minutes,attendanceMarked,homeworkChecked,comments,salaryEstimate,rows[]`. |

### Student and parent forms, requests, and response fields

| Endpoint/action | Exact UI input and serialized request | Response properties read by the UI |
|---|---|---|
| `POST /student/teachers/:teacherId/request` and `DELETE .../request` | No body; teacher ID is in the path. | The refreshed `/student/teachers` result is an array of `{ teacher:{_id,firstName,lastName,userName,companyName,subject[],teachingLanguage,bio,profilepic,centers[]},status,balance }`; statuses include `active` and `pending`. |
| `GET /teachers/search?q&subject` and `GET /teacher/:id` | Search sends text `q` and selected subject; profile call sends teacher ID in path. | Directory rows need public teacher card fields `_id,firstName,lastName,userName,companyName,subject[],teachingLanguage,bio,profilepic,centers[]`. Profile also reads `studentsCount,schedule[]`; never send private fields. |
| `PATCH /student/profile` | Profile form sends `{ firstName,lastName,parentPhone,schoolName }`. Photo change uploads first, then sends `{ profilepic: url }`. | Returned profile reads `_id,userID,firstName,lastName,phone,parentPhone,grade,schoolName,learningLanguage,profilepic`. |
| `POST /student/teachers/:teacherId/topups` | `{ amount: number, method: string, reference: string, receiptUrl: string }`. Receipt is a required image upload in the UI; reference can be blank. | UI only needs successful submission; subsequent teacher review uses pending state. Do not credit balance before approval. |
| `POST /student/recharge` | `{ code: string }`; view trims whitespace and uppercases the code. | `{ amount: number, balance: number, teacher: publicTeacher }`; success message reads amount, teacher name, and new balance. |
| `POST /student/homework/:homeworkId/submit` | For upload homework, UI requires 1–10 files, each at most 10 MB, uploads each and sends `{ files: string[], comment: string, link: "" }`. Link homework sends `{ files: [], comment: string, link: string }`; result link and note are optional. | Reloaded homework rows read `_id,order,title,description,startDate,endDate,externalLink,isOpen,submissionType,submission`. Submission reads `status,files,submittedAt,feedback`. |
| `POST /student/lessons/:lessonId/unlock` | No body; confirmation is UI-only. | Result’s `access` updates access state; lesson list/detail consume `state,price,views,viewsLeft,hours,expiresAt,startsOnOpen`. |
| `POST /student/lessons/:lessonId/progress` | Start: `{ start: true }`; progress: `{ part: string, seconds: number }`. Progress is saved every 30 seconds and at part end. | Start may return `access`; detail/list render `watchedSeconds`, access, and parts. |
| `POST /student/questions/:questionId/answer` | MCQ: `{ choice: "a" \| "b" \| "c" \| "d" }`. Essay: upload a photo then `{ imageUrl: url }`. | Answer needs `_id,choice,imageUrl,status,isCorrect,points`; safe `correct` is used to highlight the correct MCQ choice after answering. |
| `GET /student/teachers/:teacherId/lessons` and `GET /student/lessons/:lessonId` | Teacher ID / lesson ID in path; no body. | Summary needs `_id,title,description,week,partsCount,questionsCount,durationSeconds,watchedSeconds,access`. Detail additionally needs `teacher,parts[{_id,title,category,url,durationSeconds}],questions[{_id,part,text,imageUrl,type,trigger,triggerSeconds,choices,correct,bonusPoints,answer}],access,accessHours`. Only return playable `url` values after verifying open access. |
| `POST /student/booklets/:bookletId/reserve` | `{ method: "center" \| "transfer", receiptUrl: string, reference: string }`; transfer requires receipt image and uploads it first; center payment does not require a receipt. | Refreshed catalogue array `{ booklet:{_id,name,sellPrice,stock}, order:null|{price,paid,status,delivered,method,reference} }`. |
| `GET /student/teachers/:teacherId/exams` | No body. | Rows read `exam:{_id,name,maxScore,date},score,rank,participants,stats:{avg,max}`; table/chart also require `stats.count,min` where provided. |
| `GET /student/teachers/:teacherId/transactions` and `GET /student/teachers/:teacherId/overview` | No body. | Transactions: `{_id,createdAt,type,reason,amount}`. Overview reads `teacher,balance,pricePerSession,points,rank,classSize,isBlocked,centerName,warnings[],nextSlot,lastSession,stats,announcements[],followUp`; `stats` includes attendance/homework/exam rates and counts. Unsupported metrics must remain `null`, not fabricated. |
| `POST /parent/children` link child | `{ code: string }` from the student-code form. | Linked student summary needs `_id,userID,firstName,lastName,grade,teachers[]`; teacher cards need `_id,firstName,lastName,subject[]`. |
| `GET /parent/profile` | No body. | Parent children view consumes `person.phone` for the verified parent phone and `children[]` with `_id,userID,firstName,lastName,grade,teachers[]`. |
| `GET /parent/children/:studentId/report?teacher=:teacherId` | Child ID path and optional selected teacher query; no body. | Report page reads `student,teachers[],teacher,isBlocked,warnings[],balance,points,centerName,sessions[],exams[],transactions[],stats,followUp`. Session rows need `session:{week,number,sequence,date},status,homeworkStatus,comment`; stats need `attendanceRate,present,absent,homeworkRate,examAvg`; followUp needs `assistant,teacherPhone,lastComment`. |
| `DELETE /parent/children/:studentId` | No body. | Success followed by profile reload; do not return or expose unrelated children. |

### Concrete JSON examples (student-contract style)

The examples below show the JSON body sent by the frontend and the `data` object returned inside the standard response envelope. Replace example IDs, URLs, and values with real values. An endpoint that only needs a success result can return a small object such as `{ "updated": true }`; return the richer shape shown where the frontend reads it immediately.

#### Sessions, attendance, and schedule

`POST /session/sessions` — the create form sends the fields below. The `activate` checkbox is not included; checked means a second request to `PATCH /session/sessions/:id/active` with `{ "active": true }`.

```json
{
  "sequence": "Derivatives: chain rule",
  "week": 3,
  "number": 2,
  "date": "2026-10-14",
  "center": "center-id",
  "grade": "2",
  "price": null
}
```

The create response must include `_id` for the optional activation request:

```json
{
  "_id": "session-id",
  "sequence": "Derivatives: chain rule",
  "week": 3,
  "number": 2,
  "date": "2026-10-14T00:00:00.000Z",
  "center": "center-id",
  "centerName": "Main Center",
  "grade": "2",
  "price": null,
  "status": "normal",
  "active": true,
  "attendance": [],
  "presentCount": 0,
  "collected": 0
}
```

`PATCH /session/sessions/:id/attendance/:studentId` is used for both payment/comment edits and homework status:

```json
{ "payment": 50, "comment": "Paid part of the fee" }
```

```json
{ "homeworkStatus": "complete" }
```

`POST /session/sessions/:id/attendance` marks attendance with `{ "identifier": "STU-000123" }`; when the teacher confirms a blocked/insufficient-balance override, the retry body is `{ "identifier": "STU-000123", "force": true }`. Errors requiring confirmation must identify the cause in `details.code` as `"BLOCKED"` or `"INSUFFICIENT_BALANCE"`.

`POST /session/sessions/:id/homework` sends `{ "identifier": "STU-000123", "status": "complete" }`. `GET /session/scan/lookup?identifier=STU-000123` returns a scan lookup object:

```json
{
  "student": {
    "_id": "student-id",
    "userID": "STU-000123",
    "firstName": "Amina",
    "lastName": "Example",
    "phone": "01000000000",
    "parentPhone": "01000000001",
    "balance": 250,
    "isBlocked": false
  },
  "allowed": true
}
```

`PUT /session/sessions/:id/closing` receives:

```json
{
  "normalCost": 50,
  "reducedCost": 25,
  "reducedCount": 2,
  "notes": "Two students paid the reduced rate"
}
```

The saved `closing` returned in a session report should include `{ "normalCount": 8, "normalCost": 50, "reducedCount": 2, "reducedCost": 25, "total": 450, "notes": "..." }`.

`POST /session/sessions/:id/staff` receives `{ "assistant": "assistant-id", "checkIn": "2026-10-14T16:00", "notes": "Room 2" }`. Check-out uses `PATCH /session/sessions/:id/staff/:entryId` with `{ "checkOut": "2026-10-14T17:30:00.000Z" }`. Session report staff rows need `assistant` (display name), `checkIn`, `checkOut`, `minutes`, and `notes`.

`POST /teacher/schedule` and `PATCH /teacher/schedule/:slotId` use the same shape:

```json
{
  "title": "Grade 2 · Group A",
  "dayOfWeek": 3,
  "startTime": "16:00",
  "durationMinutes": 90,
  "center": "center-id",
  "grade": "2",
  "notes": "Room 2",
  "isActive": true
}
```

`POST /teacher/schedule/:slotId/start` sends `{ "sequence": "Lesson 5: Derivatives" }`. It returns a created live session including `_id`, `week`, `number`, `sequence`, `date`, inherited `center` and `grade`, and `active: true`.

#### Teacher student management

`POST /teacher/myStudents` receives the form fields as JSON (omitted optional values are not shown):

```json
{
  "firstName": "Amina",
  "lastName": "Example",
  "phone": "01000000000",
  "parentPhone": "01000000001",
  "grade": "2",
  "gender": "female",
  "schoolName": "Example School",
  "learningLanguage": "0",
  "center": "center-id",
  "pricePerSession": 80
}
```

The create flow displays the generated student credentials:

```json
{
  "userID": "STU-000123",
  "password": "one-time-password",
  "student": {
    "_id": "student-id",
    "firstName": "Amina",
    "lastName": "Example"
  }
}
```

`PATCH /teacher/myStudents/:studentId` updates student/enrollment values, such as:

```json
{
  "firstName": "Amina",
  "lastName": "Example",
  "grade": "2",
  "center": "center-id",
  "pricePerSession": 80,
  "followUpAssistant": "assistant-id",
  "adminNote": "Call parent after the next session"
}
```

Balance and points adjustment bodies are:

```json
{ "amount": -40, "reason": "Correction" }
```

```json
{ "points": 5, "reason": "Excellent quiz result" }
```

Warning creation sends `{ "reason": "Missed class without notice" }`; blocking sends `{ "blocked": true }`; archiving sends `{ "reason": "Moved to another class" }`. The merged student response used by profiles and lists includes student identity/contact fields and enrollment values, for example:

```json
{
  "_id": "student-id",
  "userID": "STU-000123",
  "firstName": "Amina",
  "lastName": "Example",
  "phone": "01000000000",
  "parentPhone": "01000000001",
  "grade": "2",
  "center": "center-id",
  "centerName": "Main Center",
  "balance": 250,
  "pricePerSession": 80,
  "points": 12,
  "isBlocked": false,
  "warningsCount": 0
}
```

#### Exams and homework

`POST /teacher/exams` and `PATCH /teacher/exams/:examId` use:

```json
{
  "name": "Unit 1",
  "maxScore": 100,
  "date": "2026-10-14",
  "grade": "2",
  "session": "session-id"
}
```

`PUT /teacher/exams/:examId/scores` submits every student row, including any rows currently hidden by the search filter:

```json
{
  "scores": [
    { "student": "student-id-1", "score": 85 },
    { "student": "student-id-2", "score": null }
  ]
}
```

The teacher exam result needs exam details, result rows, and statistics; the student-facing projection is:

```json
[
  {
    "exam": { "_id": "exam-id", "name": "Unit 1", "maxScore": 100, "date": "2026-10-14T00:00:00.000Z" },
    "score": 85,
    "rank": 2,
    "participants": 18,
    "stats": { "count": 18, "avg": 72.5, "max": 98, "min": 30 }
  }
]
```

`POST /teacher/homework` and `PATCH /teacher/homework/:homeworkId` use:

```json
{
  "title": "Worksheet 3",
  "description": "Solve questions 1–5",
  "startDate": "2026-10-14",
  "endDate": "2026-10-21",
  "submissionType": "upload",
  "externalLink": "",
  "grade": "2"
}
```

Student upload submission sends `{ "files": ["https://files.example.test/work.pdf"], "comment": "Question 4 is unclear", "link": "" }`. For link homework it can send `{ "files": [], "comment": "", "link": "https://example.test/my-work" }`. Grading sends `{ "status": "complete", "feedback": "Good work" }`. Homework list rows need `_id,title,description,order,startDate,endDate,externalLink,submissionType,isOpen`; a submission includes `status,files,link,comment,submittedAt,feedback`.

#### Video lessons and question answers

`POST /teacher/lessons` and `PATCH /teacher/lessons/:lessonId` submit lesson fields with nested ordered arrays. Example:

```json
{
  "title": "Derivatives",
  "description": "Introduction and worked examples",
  "week": 3,
  "grade": "2",
  "isFree": false,
  "price": 30,
  "accessHours": 48,
  "viewsIfAttended": 5,
  "viewsIfPaid": 3,
  "sessions": ["session-id"],
  "published": true,
  "parts": [
    {
      "title": "Explanation",
      "category": "explanation",
      "url": "https://media.example.test/video.mp4",
      "durationSeconds": 600
    }
  ],
  "questions": [
    {
      "text": "What is the derivative of x²?",
      "imageUrl": "",
      "part": "part-id",
      "type": "mcq",
      "trigger": "time",
      "triggerSeconds": 120,
      "choices": { "a": "x", "b": "2x", "c": "x²", "d": "2" },
      "correct": "b",
      "bonusPoints": 5,
      "isActive": true
    }
  ]
}
```

Video files and question images are uploaded separately; only their returned URLs appear in this body. `POST /teacher/lessons/:lessonId/grants` sends `{ "student": "student-id", "maxViews": 3, "hours": 48 }`. Teacher essay grading sends `{ "isCorrect": true, "points": 5 }`; an incorrect grade uses `{ "isCorrect": false, "points": 0 }`.

The student lesson summary/detail response must keep access information with the lesson. A detail example after access is granted:

```json
{
  "_id": "lesson-id",
  "title": "Derivatives",
  "description": "Introduction and worked examples",
  "week": 3,
  "teacher": { "_id": "teacher-id", "firstName": "Teacher", "lastName": "Example" },
  "access": {
    "state": "granted",
    "viewsLeft": 2,
    "views": 3,
    "hours": 48,
    "expiresAt": "2026-10-16T16:00:00.000Z",
    "startsOnOpen": false
  },
  "accessHours": 48,
  "parts": [
    { "_id": "part-id", "title": "Explanation", "category": "explanation", "url": "https://media.example.test/video.mp4", "durationSeconds": 600 }
  ],
  "questions": [
    {
      "_id": "question-id",
      "part": "part-id",
      "type": "mcq",
      "text": "What is the derivative of x²?",
      "imageUrl": "",
      "bonusPoints": 5,
      "trigger": "time",
      "triggerSeconds": 120,
      "choices": { "a": "x", "b": "2x", "c": "x²", "d": "2" },
      "answer": null
    }
  ],
  "progress": []
}
```

`POST /student/lessons/:lessonId/unlock` takes no body and returns `{ "access": { "state": "granted", "viewsLeft": 3, "hours": 48, "expiresAt": null, "startsOnOpen": true }, "balance": 220 }`. Start watching sends `{ "start": true }`; progress sends `{ "part": "part-id", "seconds": 30 }`. An MCQ answer sends `{ "choice": "b" }`; an essay answer uploads the photo then sends `{ "imageUrl": "https://files.example.test/answer.jpg" }`. Answers should return `_id,question,choice,imageUrl,status,isCorrect,points` and reveal `correct` only once it is appropriate.

#### Booklets, wallet, expenses, and finance

`POST /teacher/booklets` and `PATCH /teacher/booklets/:bookletId` send:

```json
{
  "name": "Algebra booklet",
  "grade": "2",
  "stock": 30,
  "printPrice": 20,
  "sellPrice": 35,
  "isActive": true
}
```

`POST /teacher/booklets/orders` sells/assigns a booklet with `{ "student": "student-id", "booklet": "booklet-id", "price": null, "paid": 10, "delivered": false }`. A student transfer reservation sends `{ "method": "transfer", "receiptUrl": "https://files.example.test/receipt.jpg", "reference": "TX-123" }`; pay-at-center sends `{ "method": "center", "receiptUrl": "", "reference": "" }`. Order rows need populated `student` and `booklet` objects plus `_id,price,paid,delivered,deliveredAt,method,status,receiptUrl,reference,createdAt`. Review sends `{ "status": "verified" }` or `{ "status": "rejected" }`; editing payment sends `{ "price": 35, "paid": 20 }`; marking delivery sends `{ "delivered": true }`.

`POST /teacher/recharge-codes` receives `{ "count": 20, "amount": 100, "prefix": "LC", "batch": "October 2026" }`. Code listing/generation results need code, amount, status, batch, and timestamps as displayed. A student redeems with `{ "code": "LC-XXXXXX" }` and expects `{ "amount": 100, "balance": 350, "teacher": { "_id": "teacher-id", "firstName": "Teacher", "lastName": "Example" } }`.

`POST /student/teachers/:teacherId/topups` sends `{ "amount": 200, "method": "Vodafone Cash", "reference": "TX-123", "receiptUrl": "https://files.example.test/receipt.jpg" }`. Review at `PATCH /teacher/topups/:topupId` sends `{ "status": "approved", "amount": 200, "reason": "Receipt verified" }`; the pending top-up itself must not change the balance.

`POST /teacher/expenses` sends `{ "amount": 500, "category": "printing", "reason": "October worksheets", "date": "2026-10-14" }`. Expense list rows need `_id,amount,category,reason,date`. Finance and transaction report calls use query parameters, for example `GET /teacher/transactions?from=2026-10-01&to=2026-10-31&type=topup`; each transaction row needs `{ "_id": "transaction-id", "createdAt": "2026-10-14T10:00:00.000Z", "type": "topup", "reason": "Wallet recharge", "amount": 200 }`.

#### Announcements, follow-up, and assistants

`POST /teacher/announcements` sends:

```json
{
  "title": "Exam next week",
  "body": "Please revise chapters 1–3.",
  "imageUrl": "https://files.example.test/announcement.jpg",
  "videoUrl": "",
  "linkUrl": "",
  "audience": { "grades": ["2"], "centers": ["center-id"] },
  "pinned": true,
  "isActive": true
}
```

`POST /teacher/follow-up/comments` sends `{ "student": "student-id", "session": "session-id", "comment": "Called the parent; student was sick" }`; return `{ "comment": "Called the parent; student was sick", "byName": "Assistant Example", "createdAt": "2026-10-14T10:00:00.000Z" }`. Assignment uses `PUT /teacher/follow-up/assign` with `{ "assistant": "assistant-id", "students": ["student-id-1", "student-id-2"] }`; use `"assistant": null` to unassign. Follow-up list results need student contact fields, attendance/homework/exam/absence summary, `assignedTo`, `lastComment`, and an `assistants` array with `_id,name`.

Assistant creation submits:

```json
{
  "firstName": "Sam",
  "lastName": "Example",
  "userName": "sam.example",
  "email": "sam@example.test",
  "phone": "01000000002",
  "password": "temporary-password",
  "permissions": ["scan_attendance", "scan_homework"]
}
```

The UI then separately patches role/permissions, for example `{ "role": "Assistant", "permissions": ["scan_attendance", "scan_homework"] }`. Assistant edit sends `{ "firstName": "Sam", "lastName": "Example", "phone": "01000000002", "role": "Assistant", "permissions": ["scan_attendance"], "salary": { "type": "hourly", "amount": 50 } }`. Assistant list rows need `_id,name/firstName,lastName,email,phone,role,permissions,salary,isActive`; stats require `sessionsWorked,minutes,attendanceMarked,homeworkChecked,comments,salaryEstimate,rows`.

#### Parent and public teacher data

`POST /parent/children` sends `{ "code": "STU-000123" }`. The linked-child response should include `_id,userID,firstName,lastName,grade,teachers[]`. `GET /parent/profile` returns a `person` object containing the verified parent phone plus a `children[]` array. For example:

```json
{
  "person": { "phone": "01000000001" },
  "children": [
    {
      "_id": "student-id",
      "userID": "STU-000123",
      "firstName": "Amina",
      "lastName": "Example",
      "grade": "2",
      "teachers": [
        { "_id": "teacher-id", "firstName": "Teacher", "lastName": "Example", "subject": ["Math"] }
      ]
    }
  ]
}
```

`GET /parent/children/:studentId/report?teacher=teacher-id` should return the response below; include only data belonging to the authenticated parent’s linked child and selected teacher:

```json
{
  "student": { "_id": "student-id", "userID": "STU-000123", "firstName": "Amina", "lastName": "Example", "grade": "2" },
  "teachers": [{ "_id": "teacher-id", "firstName": "Teacher", "lastName": "Example", "subject": ["Math"] }],
  "teacher": { "_id": "teacher-id", "firstName": "Teacher", "lastName": "Example" },
  "isBlocked": false,
  "warnings": [],
  "balance": 250,
  "points": 12,
  "centerName": "Main Center",
  "stats": { "attendanceRate": 80, "present": 8, "absent": 2, "homeworkRate": 75, "examAvg": 85 },
  "sessions": [
    {
      "session": { "week": 3, "number": 2, "sequence": "Derivatives", "date": "2026-10-14T10:00:00.000Z" },
      "status": "present",
      "homeworkStatus": "complete",
      "comment": ""
    }
  ],
  "exams": [],
  "transactions": [],
  "followUp": {
    "assistant": { "name": "Assistant Example", "phone": "01000000002" },
    "teacherPhone": "01000000003",
    "lastComment": null
  }
}
```

Public teacher directory cards need `_id,firstName,lastName,userName,companyName,subject[],teachingLanguage,bio,profilepic,studentsCount,centers[]`. `GET /teacher/:id` additionally supplies `centers[]` as public center summaries and `schedule[]` for the weekly schedule. Never include credential hashes, private phone numbers, or student-level records in public teacher results.

## Models: what exists and what still needs a persistence decision

### Existing source models

`Teacher`, `Student`, `Center`, `Assistant`, `Parent`, `Enrollment`, `Request`, `Session`, `Schedule`, `Chat`, and `Counter` exist in `src/db/model/`.

- **Enrollment** already owns teacher-specific balance, points, warnings, block status, price, center, follow-up assignment, and embedded point/transaction history. Avoid creating parallel collections for these unless intentionally migrating.
- **Session** already owns attendance and closing. Extend embedded attendance with payment/charged/comment/homework/location/marker only if that matches your query needs.
- **Assistant** already references its teacher. Add salary and work-related fields only after defining their rules; no Teacher `assistants[]` array is required.
- **Parent** already contains a child reference array. Decide if that simple shape is enough for verified link/unlink lifecycle.
- **Request** currently supports teacher/center/student request relationships; confirm status/direction semantics before using it for all three.

### Likely new models or embedded subdocuments

| Feature | Suggested persistence | Important fields / indexes to decide |
|---|---|---|
| Teacher-center link lifecycle | Reuse/extend `Request` or add `CenterLink` | teacher, center, status, requestedBy, timestamps; unique active pair |
| Homework | `Homework` + `HomeworkSubmission` or embedded submissions | teacher, title, dates, target grade/session, type; unique student/homework submission or revision history |
| Exams | `Exam` with embedded results or `ExamResult` | teacher, name, date, maxScore, grade/session; student score uniqueness per exam |
| Lessons | `Lesson` with parts/questions or separate collections | teacher, ordered content, published/access settings, media URLs |
| Lesson grants/progress/answers | `LessonGrant`, `LessonProgress`, `LessonAnswer` or embedded equivalents | student/lesson/question IDs, view counts, expiry, unique answer policy, grading state |
| Booklets/orders | `Booklet`, `BookletOrder` | teacher, stock/price, student/order, receipt, payment and delivery status |
| Recharge/top-up | `RechargeCode`, `TopUp` | unique code/reference, teacher/student/enrollment, amount, state, redeemed/reviewed timestamps |
| Teacher transactions | Existing Enrollment transaction history or dedicated `Transaction` | immutable amount/type/owner/actor/time; decide one source of truth |
| Expenses | `Expense` | teacher, amount, date, category, note, createdBy |
| Announcements | `Announcement` | teacher, body/media, active/pinned, grade and center audience |
| Follow-up comments | `FollowUpComment` | teacher, student, session, comment, author, timestamp |
| Session staff | Embedded `staff[]` in Session or `SessionStaff` | assistant, session, check-in/out, notes, duration |

## Recommended step-by-step project plan

Follow this order to avoid building a screen on top of data that does not yet exist.

### Phase 1 — make the existing contract reliable

1. Fix `getTeacherSessions` and run `npx tsc --noEmit`.
2. Add a small route inventory/test that confirms every current controller route is mounted at the expected prefix.
3. Align the session scan URL (`/session/scan/lookup` vs current `/teacher/scan/lookup`).
4. Finish teacher student update validation and add missing warning-delete/block routes.
5. Compare actual responses for student overview/sessions, teacher students, schedule, sessions, and center sessions against the shapes in this file.

### Phase 2 — authorization and shared infrastructure

1. Put role/subject identity in access tokens and enforce roles in middleware.
2. Add assistant-to-teacher context and per-route permission checks.
3. Add `/uploads`, remaining password routes, and rate-limited reset/OTP handling.
4. Add ownership tests before adding more CRUD routes; these protect every later module.

### Phase 3 — session workflow completion

1. Extend attendance schema for needed report fields.
2. Implement edit/remove attendance, homework scan, staff check-in/out, session update/delete, and scan route.
3. Make charges/refunds and ledger writes atomic/idempotent.
4. Test end-to-end: create session → activate → scan student → edit payment/homework → close → cancel/remove and verify balances.

### Phase 4 — complete student/assistant/parent foundations

1. Implement pending join-request cancellation and student session history.
2. Finish assistant CRUD, own profile/work log, salary and permissions.
3. Add parent login/profile/link/report with verified relationships.
4. Confirm each role can only access its allowed student/teacher/center records.

### Phase 5 — content

1. Implement Exam model and teacher create/edit/delete/score routes; then student exam list.
2. Implement Homework and submissions; then teacher grading and student submission.
3. Implement Lesson parts/questions/grants/progress/answers; protect media URLs and enforce view limits.
4. Implement Booklet catalog/orders/reservations and delivery.
5. For each feature, implement teacher routes first, student read/write routes second, then update overview/history aggregates.

### Phase 6 — money, communications, reporting

1. Settle the ledger source of truth.
2. Implement recharge codes, top-up review, student transactions, and their idempotent balance effects.
3. Implement expenses and finance aggregation from ledger + expenses + closings + salary.
4. Implement announcements/audience targeting and follow-up comments/assignment/lists.
5. Verify dashboard, overview, finance, and follow-up totals against hand-calculated fixtures.

## Final verification checklist for each endpoint

- [ ] Method and path exactly match `front-end/assets/js/core/api.js`.
- [ ] Request body/query fields match the form/view and are validated with a strict schema.
- [ ] Success uses `{ message, data }`; the frontend receives the expected fields inside `data`.
- [ ] List endpoints return `[]` for no results; missing single records return a clear 404.
- [ ] Invalid input returns 400; unauthorized role/ownership returns 401/403; duplicate state changes return 409 where appropriate.
- [ ] Reads and writes are scoped to authenticated owner/enrollment/relationship.
- [ ] Passwords, private student fields, and locked media URLs are never leaked.
- [ ] Money/status operations are atomic or idempotent and leave a durable audit/ledger entry.
- [ ] Test empty state, normal success, invalid ID/body, cross-account access, duplicate/retry, and relevant boundary conditions.
- [ ] Run `npx tsc --noEmit`, rebuild `dist/` if the runtime uses compiled files, and exercise the actual frontend page.

## Source files to consult while implementing

- `front-end/assets/js/core/api.js` — exact methods, paths, path parameters, and query/body forwarding.
- `front-end/assets/js/views/` — which response properties each screen actually reads and which form fields it sends.
- `front-end/assets/js/mock/server.js` — intended demonstration behavior and useful response examples; not production persistence.
- `front-end/STUDENT_API_CONTRACT.md` — detailed student-facing payload examples.
- `front-end/FRONTEND_REPORT.md` — broader product rules and original feature requirements; some status labels are stale.
- `src/app.controller.ts` — route prefixes and shared endpoints.
- `src/module/*/*.controller.ts` — current production route declarations.
- `src/module/*/*.service.ts` — current production behavior.
- `src/db/model/` and `src/common/interface/` — persisted schema and TypeScript contracts.
