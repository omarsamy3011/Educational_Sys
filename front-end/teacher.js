(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const accessToken = sessionStorage.getItem("accessToken");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const profileForm = document.querySelector("#profile-form");
  const profileDialog = document.querySelector("#profile-dialog");
  const assistantForm = document.querySelector("#assistant-form");
  const assistantDialog = document.querySelector("#assistant-dialog");
  const assistantFormMessage = document.querySelector("#assistant-form-message");
  const studentsList = document.querySelector("#students-list");
  const studentsStatus = document.querySelector("#students-status");
  const studentProfileDialog = document.querySelector(
    "#student-profile-dialog",
  );
  const studentProfileView = document.querySelector("#student-profile-view");
  const studentProfileDetails = document.querySelector(
    "#student-profile-details",
  );
  const studentHistoryList = document.querySelector("#student-history-list");
  const studentEditForm = document.querySelector("#student-edit-form");
  const studentProfileMessage = document.querySelector(
    "#student-profile-message",
  );
  let activeStudent = null;

  if (!accessToken) {
    window.location.replace("teacherlogin.html");
    return;
  }

  function showMessage(message, state = "success") {
    dashboardMessage.textContent = message;
    dashboardMessage.dataset.state = state;
    dashboardMessage.hidden = false;
  }

  async function request(path, options = {}) {
    const response = await window.authenticatedFetch(`${API_BASE}/teacher${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
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

  function setProfile(profile) {
    const subjectNames = [
      "Math",
      "Physics",
      "English",
      "Science",
      "Biology",
      "Chemistry",
      "Arabic",
    ];
    const languageNames = ["Arabic", "English"];
    const subjects = new Set(
      (profile.subject || []).map((subject) =>
        typeof subject === "number" ? subjectNames[subject] : subject,
      ),
    );
    const name = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    document.querySelector("#profile-name").textContent = name || "—";
    document.querySelector("#profile-username").textContent =
      profile.userName || "—";
    document.querySelector("#profile-email").textContent = profile.email || "—";
    document.querySelector("#profile-phone").textContent = profile.phone || "—";
    document.querySelector("#profile-company-name").textContent =
      profile.companyName || "—";
    document.querySelector("#profile-gender-value").textContent =
      profile.gender || "—";
    document.querySelector("#profile-subject-values").textContent =
      [...subjects].filter(Boolean).join(", ") || "—";
    document.querySelector("#profile-language-value").textContent =
      typeof profile.teachingLanguage === "number"
        ? languageNames[profile.teachingLanguage] || "—"
        : profile.teachingLanguage || "—";
    document.querySelector("#profile-picture-value").textContent =
      profile.profilepic || "—";
    profileForm.elements.firstName.value = profile.firstName || "";
    profileForm.elements.lastName.value = profile.lastName || "";
    profileForm.elements.companyName.value = profile.companyName || "";
    profileForm.elements.gender.value = profile.gender || "";
    profileForm.elements.teachingLanguage.value =
      profile.teachingLanguage === 0
        ? "Arabic"
        : profile.teachingLanguage === 1
          ? "English"
          : profile.teachingLanguage || "";
    profileForm.elements.profilepic.value = profile.profilepic || "";

    for (const option of profileForm.elements.subject.options) {
      option.selected = subjects.has(option.value);
    }

    document.querySelector("#teacher-greeting").textContent =
      name || profile.userName || "Teacher portal";
  }

  async function loadProfile() {
    const profile = await request("/profile");
    setProfile(profile);
  }

  function studentName(student) {
    return (
      [student.firstName, student.lastName].filter(Boolean).join(" ") ||
      student.userID ||
      "Student"
    );
  }

  function enumLabel(value, labels) {
    if (
      typeof value === "number" ||
      (typeof value === "string" && /^\d+$/.test(value))
    ) {
      return labels[Number(value)] || String(value);
    }
    return value == null ? "" : String(value);
  }

  function renderStudents(students) {
    studentsList.replaceChildren();

    if (!students.length) {
      studentsStatus.textContent =
        "No students are assigned to your account yet.";
      return;
    }

    studentsStatus.textContent = `${students.length} assigned student${students.length === 1 ? "" : "s"}`;
    for (const student of students) {
      if (!student || typeof student !== "object") {
        continue;
      }

      const item = document.createElement("li");
      item.className = "student-row";

      const rowHeader = document.createElement("div");
      rowHeader.className = "student-row-header";
      const summary = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = studentName(student);
      summary.append(name);
      const gradeLabel = enumLabel(student.grade, ["S1", "S2", "S3"]);
      if (gradeLabel) {
        const grade = document.createElement("span");
        grade.className = "student-meta";
        grade.textContent = `Grade ${gradeLabel}`;
        summary.append(grade);
      }

      const detailsButton = document.createElement("button");
      detailsButton.type = "button";
      detailsButton.className = "text-button";
      detailsButton.textContent = "Open profile";
      detailsButton.setAttribute(
        "aria-label",
        `Open ${studentName(student)} profile`,
      );
      detailsButton.addEventListener("click", () => loadStudent(student._id));

      rowHeader.append(summary, detailsButton);
      item.append(rowHeader);
      studentsList.append(item);
    }
  }

  async function loadStudents() {
    studentsStatus.textContent = "Loading students...";
    studentsList.replaceChildren();
    try {
      const students = await request("/myStudents");
      renderStudents(Array.isArray(students) ? students : []);
    } catch (error) {
      studentsStatus.textContent =
        error instanceof Error ? error.message : "Could not load students.";
    }
  }

  function displayValue(value) {
    if (value == null || value === "") {
      return "—";
    }
    if (Array.isArray(value)) {
      return value.map(displayValue).join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  function humanizeKey(key) {
    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (character) => character.toUpperCase());
  }

  function enumValue(value, labels) {
    if (
      typeof value === "number" ||
      (typeof value === "string" && /^\d+$/.test(value))
    ) {
      return String(value);
    }
    const index = labels.indexOf(value);
    return index === -1 ? "" : String(index);
  }

  function renderStudentHistory(student) {
    studentHistoryList.replaceChildren();
    const historyKeys = Object.keys(student).filter((key) =>
      /history|attendance|session|activity|progress|grades/i.test(key),
    );
    const historyEntries = historyKeys.flatMap((key) => {
      const value = student[key];
      if (Array.isArray(value)) {
        return value.map((entry) => ({
          label: humanizeKey(key),
          value: entry,
        }));
      }
      if (value && typeof value === "object") {
        return Object.entries(value).map(([label, entry]) => ({
          label: `${humanizeKey(key)} · ${humanizeKey(label)}`,
          value: entry,
        }));
      }
      return value == null || value === ""
        ? []
        : [{ label: humanizeKey(key), value }];
    });

    if (!historyEntries.length) {
      const empty = document.createElement("li");
      empty.className = "student-history-empty";
      empty.textContent = "No learning history is available for this student.";
      studentHistoryList.append(empty);
      return;
    }

    for (const entry of historyEntries) {
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = entry.label;
      const value = document.createElement("span");
      value.textContent = displayValue(entry.value);
      item.append(label, value);
      studentHistoryList.append(item);
    }
  }

  function renderStudentProfile(student) {
    activeStudent = student;
    document.querySelector("#student-profile-title").textContent =
      studentName(student);
    studentProfileDetails.replaceChildren();
    const details = document.createElement("dl");
    details.className = "student-detail-list";
    for (const [key, value] of Object.entries(student)) {
      if (
        /password|token|secret|^_id$|^__v$/i.test(key) ||
        value == null ||
        value === ""
      ) {
        continue;
      }
      const term = document.createElement("dt");
      term.textContent = humanizeKey(key);
      const description = document.createElement("dd");
      description.textContent = displayValue(
        key === "grade"
          ? enumLabel(value, ["S1", "S2", "S3"])
          : key === "learningLanguage"
            ? enumLabel(value, ["Arabic", "English"])
            : value,
      );
      details.append(term, description);
    }
    studentProfileDetails.append(details);
    renderStudentHistory(student);
    studentEditForm.elements.firstName.value = student.firstName || "";
    studentEditForm.elements.lastName.value = student.lastName || "";
    studentEditForm.elements.userID.value = student.userID || "";
    studentEditForm.elements.phone.value = student.phone || "";
    studentEditForm.elements.grade.value = enumValue(student.grade, [
      "S1",
      "S2",
      "S3",
    ]);
    studentEditForm.elements.schoolName.value = student.schoolName || "";
    studentEditForm.elements.learningLanguage.value = enumValue(
      student.learningLanguage,
      ["Arabic", "English"],
    );
    studentProfileMessage.hidden = true;
    studentEditForm.hidden = true;
    studentProfileView.hidden = false;
  }

  async function loadStudent(studentId) {
    if (!studentId) {
      showMessage("This student record has no valid identifier.", "error");
      return;
    }

    try {
      studentProfileDialog.showModal();
      studentProfileView.hidden = true;
      studentEditForm.hidden = true;
      studentProfileMessage.textContent = "Loading student profile...";
      studentProfileMessage.hidden = false;
      const student = await request(
        `/myStudents/${encodeURIComponent(studentId)}`,
      );
      renderStudentProfile(student);
    } catch (error) {
      studentProfileMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not load student details.";
      studentProfileMessage.dataset.state = "error";
      studentProfileMessage.hidden = false;
    }
  }

  studentEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeStudent?._id) {
      return;
    }
    const submitButton = studentEditForm.querySelector("button[type='submit']");
    const originalLabel = submitButton.textContent;
    const fields = new FormData(studentEditForm);
    const body = Object.fromEntries(
      [...fields.entries()].map(([field, value]) => [field, value.trim()]),
    );
    for (const field of ["grade", "learningLanguage"]) {
      body[field] = body[field] === "" ? null : Number(body[field]);
    }

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
    studentProfileMessage.hidden = true;
    try {
      const student = await request(
        `/myStudents/${encodeURIComponent(activeStudent._id)}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      renderStudentProfile(student);
      showMessage("Student profile updated.");
      await loadStudents();
    } catch (error) {
      studentProfileMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not update this student.";
      studentProfileMessage.dataset.state = "error";
      studentProfileMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });

  document.querySelector("#edit-student").addEventListener("click", () => {
    studentProfileView.hidden = true;
    studentEditForm.hidden = false;
    studentEditForm.elements.firstName.focus();
  });
  document
    .querySelector("#cancel-student-edit")
    .addEventListener("click", () => {
      if (activeStudent) {
        renderStudentProfile(activeStudent);
      }
    });
  document
    .querySelector("#close-student-profile")
    .addEventListener("click", () => {
      studentProfileDialog.close();
    });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = profileForm.querySelector("button[type='submit']");
    const originalLabel = submitButton.textContent;
    const formData = new FormData(profileForm);
    const body = {};

    for (const field of [
      "firstName",
      "lastName",
      "companyName",
      "gender",
      "teachingLanguage",
      "profilepic",
    ]) {
      const value = formData.get(field).trim();
      if (value) {
        body[field] = value;
      }
    }
    body.subject = formData.getAll("subject");

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
    try {
      const profile = await request("/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setProfile(profile);
      profileDialog.close();
      showMessage("Your profile has been updated.");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Could not update your profile.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });

  document.querySelector("#edit-profile").addEventListener("click", () => {
    profileDialog.showModal();
    profileForm.elements.firstName.focus();
  });
  document
    .querySelector("#close-profile-dialog")
    .addEventListener("click", () => {
      profileDialog.close();
    });
  document
    .querySelector("#cancel-profile-edit")
    .addEventListener("click", () => {
      profileDialog.close();
    });

  function showAssistantFormMessage(message, state = "error") {
    assistantFormMessage.textContent = message;
    assistantFormMessage.dataset.state = state;
    assistantFormMessage.hidden = false;
  }

  assistantForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = assistantForm.querySelector("button[type='submit']");
    const originalLabel = submitButton.textContent;
    const fields = new FormData(assistantForm);
    const body = Object.fromEntries(
      [...fields.entries()].map(([field, value]) => [field, value.trim()]),
    );

    submitButton.disabled = true;
    submitButton.textContent = "Adding...";
    assistantFormMessage.hidden = true;
    try {
      const assistant = await request("/assistants", {
        method: "POST",
        body: JSON.stringify(body),
      });
      assistantForm.reset();
      assistantDialog.close();
      showMessage(`Assistant ${assistant.userName} was added to your team.`);
    } catch (error) {
      showAssistantFormMessage(
        error instanceof Error
          ? error.message
          : "Could not add the assistant.",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });

  document.querySelector("#add-assistant").addEventListener("click", () => {
    assistantFormMessage.hidden = true;
    assistantDialog.showModal();
    assistantForm.elements.userName.focus();
  });
  document
    .querySelector("#close-assistant-dialog")
    .addEventListener("click", () => assistantDialog.close());
  document
    .querySelector("#cancel-assistant")
    .addEventListener("click", () => assistantDialog.close());

  document
    .querySelector("#refresh-students")
    .addEventListener("click", loadStudents);
  document.querySelector("#logout-button").addEventListener("click", () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.replace("teacherlogin.html");
  });

  document
    .querySelector("#delete-account")
    .addEventListener("click", async (event) => {
      if (
        !window.confirm(
          "Delete your teacher account? This action cannot be undone.",
        )
      ) {
        return;
      }

      const button = event.currentTarget;
      button.disabled = true;
      try {
        await request("/profile", { method: "DELETE" });
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        window.location.replace("teacherlogin.html");
      } catch (error) {
        button.disabled = false;
        showMessage(
          error instanceof Error
            ? error.message
            : "Could not delete your account.",
          "error",
        );
      }
    });

  Promise.all([loadProfile(), loadStudents()]).catch((error) => {
    showMessage(
      error instanceof Error
        ? error.message
        : "Could not load your teacher account.",
      "error",
    );
  });
})();
