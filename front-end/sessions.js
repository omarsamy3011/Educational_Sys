(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const accessToken = sessionStorage.getItem("accessToken");
  const form = document.querySelector("#create-session-form");
  const sessionsList = document.querySelector("#sessions-list");
  const message = document.querySelector("#sessions-message");
  const attendanceDialog = document.querySelector("#attendance-dialog");
  const studentDetailDialog = document.querySelector("#student-detail-dialog");
  let students = [];
  let sessions = [];

  if (!accessToken) {
    window.location.replace("teacherlogin.html");
    return;
  }

  async function apiRequest(path, options = {}) {
    const response = await window.authenticatedFetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        window.location.replace("teacherlogin.html");
      }
      throw new Error(result.message || "The request could not be completed.");
    }
    return result.data;
  }

  async function requestStudents() {
    const response = await window.authenticatedFetch(`${API_BASE}/teacher/myStudents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        window.location.replace("teacherlogin.html");
      }
      throw new Error(result.message || "Could not load assigned students.");
    }
    return Array.isArray(result.data) ? result.data.filter(Boolean) : [];
  }

  async function requestSessions() {
    const result = await apiRequest("/teacher/sessions");
    return Array.isArray(result) ? result : [];
  }

  function showMessage(text, state = "success") {
    message.textContent = text;
    message.dataset.state = state;
    message.hidden = false;
  }

  function studentName(student) {
    return (
      [student.firstName, student.lastName].filter(Boolean).join(" ") ||
      student.userID ||
      "Student"
    );
  }

  function latestSequence() {
    return sessions.reduce(
      (latest, session) =>
        session.week > latest.week ||
        (session.week === latest.week && session.number > latest.number)
          ? session
          : latest,
      { week: 0, number: 0 },
    );
  }

  function setSuggestions() {
    const latest = latestSequence();
    const nextWeek = latest.week || 1;
    const nextNumber = latest.week ? latest.number + 1 : 1;
    document.querySelector("#session-week").value = String(nextWeek);
    document.querySelector("#session-number").value = String(nextNumber);
  }

  function makeStudentButton(student) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attendance-student-button";
    button.textContent = studentName(student);
    button.addEventListener("click", () => showStudentDetails(student));
    return button;
  }

  function showStudentDetails(student) {
    const fields = document.querySelector("#student-detail-fields");
    fields.replaceChildren();
    const values = [
      ["Name", studentName(student)],
      ["Student ID", student.userID],
      ["Phone", student.phone],
      ["Gender", student.gender],
      ["Grade", student.grade],
      ["School", student.schoolName],
      ["Learning language", student.learningLanguage],
      ["Profile picture URL", student.profilepic],
    ];
    for (const [label, value] of values) {
      if (value == null || value === "") continue;
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = String(value);
      fields.append(term, detail);
    }
    document.querySelector("#student-detail-title").textContent =
      studentName(student);
    studentDetailDialog.showModal();
  }

  function showAttendance(session) {
    const present = new Set(
      (session.attendance || []).map((entry) =>
        String(entry.student?._id || entry.student),
      ),
    );
    const presentList = document.querySelector("#present-list");
    const absentList = document.querySelector("#absent-list");
    const presentStudents = students.filter((student) =>
      present.has(String(student._id)),
    );
    const absentStudents = students.filter(
      (student) => !present.has(String(student._id)),
    );
    presentList.replaceChildren();
    absentList.replaceChildren();
    for (const student of presentStudents) {
      const item = document.createElement("li");
      item.append(makeStudentButton(student));
      presentList.append(item);
    }
    for (const student of absentStudents) {
      const item = document.createElement("li");
      item.append(makeStudentButton(student));
      absentList.append(item);
    }
    document.querySelector("#present-count").textContent = String(
      presentStudents.length,
    );
    document.querySelector("#absent-count").textContent = String(
      absentStudents.length,
    );
    document.querySelector("#attendance-dialog-title").textContent =
      `Week ${session.week} · Session ${session.number}`;
    attendanceDialog.showModal();
  }

  function renderSessions() {
    sessionsList.replaceChildren();
    document.querySelector("#session-count").textContent =
      `${sessions.length} session${sessions.length === 1 ? "" : "s"}`;
    if (!sessions.length) {
      const empty = document.createElement("p");
      empty.className = "sessions-empty";
      empty.textContent = "No sessions have been created yet.";
      sessionsList.append(empty);
      return;
    }
    for (const session of [...sessions].sort(
      (left, right) => right.week - left.week || right.number - left.number,
    )) {
      const article = document.createElement("article");
      article.className = "session-row";
      const copy = document.createElement("div");
      copy.className = "session-row-copy";
      const sequence = document.createElement("p");
      sequence.className = "session-sequence";
      sequence.textContent = session.sequence;
      const metadata = document.createElement("p");
      metadata.className = "session-metadata";
      metadata.textContent = `Week ${session.week} · Session ${session.number} · ${(session.attendance || []).length} present`;
      copy.append(sequence, metadata);
      const actions = document.createElement("div");
      actions.className = "session-row-actions";
      const state = document.createElement("span");
      state.className = `session-state-badge${session.active ? " is-active" : ""}`;
      state.textContent = session.active ? "Active" : "Inactive";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = session.active ? "secondary-button" : "submit-button";
      toggle.textContent = session.active ? "Deactivate" : "Activate";
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
          const updated = await apiRequest(
            `/teacher/sessions/${session._id}/active`,
            {
              method: "PATCH",
              body: JSON.stringify({ active: !session.active }),
            },
          );
          sessions = sessions.map((item) => ({
            ...item,
            active: String(item._id) === String(updated._id) && updated.active,
          }));
          renderSessions();
          showMessage(
            updated.active ? "Session activated." : "Session deactivated.",
          );
        } catch (error) {
          showMessage(
            error instanceof Error ? error.message : "Could not update session.",
            "error",
          );
          toggle.disabled = false;
        }
      });
      const view = document.createElement("button");
      view.type = "button";
      view.className = "text-button";
      view.textContent = "View attendance";
      view.addEventListener("click", () => showAttendance(session));
      actions.append(state, toggle, view);
      article.append(copy, actions);
      sessionsList.append(article);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const session = {
      sequence: String(fields.get("sequence")).trim(),
      week: Number(fields.get("week")),
      number: Number(fields.get("number")),
    };
    if (!session.sequence || session.week < 1 || session.number < 1) {
      showMessage(
        "Enter a topic and valid positive week and session numbers.",
        "error",
      );
      return;
    }
    try {
      sessions.push(await apiRequest("/teacher/sessions", {
        method: "POST",
        body: JSON.stringify(session),
      }));
      renderSessions();
      form.reset();
      setSuggestions();
      showMessage("Session created successfully.");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Could not create session.",
        "error",
      );
    }
  });

  document.querySelector("#sessions-signout").addEventListener("click", () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.replace("teacherlogin.html");
  });
  document
    .querySelector("#close-attendance-dialog")
    .addEventListener("click", () => attendanceDialog.close());
  document
    .querySelector("#close-student-detail")
    .addEventListener("click", () => studentDetailDialog.close());

  Promise.all([requestStudents(), requestSessions()])
    .then(([studentResult, sessionResult]) => {
      students = studentResult;
      sessions = sessionResult;
      renderSessions();
      setSuggestions();
    })
    .catch((error) => {
      renderSessions();
      setSuggestions();
      showMessage(
        error instanceof Error ? error.message : "Could not load students.",
        "error",
      );
    });
})();
