(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const accessToken = sessionStorage.getItem("accessToken");
  const roster = document.querySelector("#directory-students");
  const rosterStatus = document.querySelector("#roster-status");
  const searchInput = document.querySelector("#student-search");
  const record = document.querySelector("#student-record");
  const pageMessage = document.querySelector("#directory-message");
  let students = [];
  let selectedStudentId = null;
  let requestVersion = 0;

  if (!accessToken) {
    window.location.replace("teacherlogin.html");
    return;
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

  function enumValue(value, labels) {
    if (
      typeof value === "number" ||
      (typeof value === "string" && /^\d+$/.test(value))
    ) {
      return String(value);
    }
    const index = labels.indexOf(value);
    return index < 0 ? "" : String(index);
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

  function showPageMessage(message, state = "success") {
    pageMessage.textContent = message;
    pageMessage.dataset.state = state;
    pageMessage.hidden = false;
  }

  function matchesSearch(student, query) {
    const searchable = [
      studentName(student),
      student.userID,
      student.phone,
      student.schoolName,
      student.grade,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(query);
  }

  function renderRoster() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const filteredStudents = students.filter((student) =>
      matchesSearch(student, query),
    );
    roster.replaceChildren();

    if (!filteredStudents.length) {
      const empty = document.createElement("li");
      empty.className = "directory-empty";
      empty.textContent = students.length
        ? "No students match that search."
        : "No students are assigned to this account yet.";
      roster.append(empty);
      return;
    }

    for (const student of filteredStudents) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.className = "directory-student-button";
      button.type = "button";
      button.setAttribute(
        "aria-current",
        String(student._id === selectedStudentId),
      );

      const name = document.createElement("strong");
      name.textContent = studentName(student);
      const metadata = document.createElement("span");
      const parts = [
        student.userID ? `ID ${student.userID}` : "",
        student.grade
          ? `Grade ${enumLabel(student.grade, ["S1", "S2", "S3"])}`
          : "",
      ].filter(Boolean);
      metadata.textContent = parts.join(" · ") || "Student record";
      button.append(name, metadata);
      button.addEventListener("click", () => loadStudent(student._id));
      item.append(button);
      roster.append(item);
    }
  }

  function addDetail(details, key, value) {
    if (
      /password|token|secret|^_id$|^__v$/i.test(key) ||
      value == null ||
      value === ""
    ) {
      return;
    }
    const term = document.createElement("dt");
    term.textContent = humanizeKey(key);
    const description = document.createElement("dd");
    const normalized =
      key === "grade"
        ? enumLabel(value, ["S1", "S2", "S3"])
        : key === "learningLanguage"
          ? enumLabel(value, ["Arabic", "English"])
          : value;
    description.textContent = displayValue(normalized);
    details.append(term, description);
  }

  function renderHistory(student) {
    const list = document.createElement("ol");
    list.className = "directory-history-list";
    const historyKeys = Object.keys(student).filter((key) =>
      /history|attendance|session|activity|progress|grades/i.test(key),
    );
    const entries = historyKeys.flatMap((key) => {
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

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "directory-history-empty";
      empty.textContent = "No learning history is available for this student.";
      list.append(empty);
      return list;
    }

    for (const entry of entries) {
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = entry.label;
      const value = document.createElement("span");
      value.textContent = displayValue(entry.value);
      item.append(label, value);
      list.append(item);
    }
    return list;
  }

  function buildProfile(student) {
    record.replaceChildren();
    const header = document.createElement("div");
    header.className = "record-heading";
    const headingCopy = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "STUDENT RECORD";
    const heading = document.createElement("h2");
    heading.id = "record-title";
    heading.textContent = studentName(student);
    headingCopy.append(eyebrow, heading);

    const editButton = document.createElement("button");
    editButton.className = "text-button";
    editButton.type = "button";
    editButton.textContent = "Edit details";
    editButton.addEventListener("click", () => buildEditForm(student));
    header.append(headingCopy, editButton);

    const details = document.createElement("dl");
    details.className = "directory-profile-details";
    for (const [key, value] of Object.entries(student)) {
      addDetail(details, key, value);
    }

    const historySection = document.createElement("section");
    historySection.className = "directory-history";
    const historyHeading = document.createElement("h3");
    historyHeading.textContent = "Learning history";
    historySection.append(historyHeading, renderHistory(student));
    record.append(header, details, historySection);
  }

  function buildEditForm(student) {
    record.replaceChildren();
    const header = document.createElement("div");
    header.className = "record-heading";
    const heading = document.createElement("h2");
    heading.id = "record-title";
    heading.textContent = `Edit ${studentName(student)}`;
    header.append(heading);

    const form = document.createElement("form");
    form.className = "teacher-form directory-edit-form";
    const fields = [
      {
        label: "First name",
        name: "firstName",
        value: student.firstName || "",
      },
      { label: "Last name", name: "lastName", value: student.lastName || "" },
      { label: "Student ID", name: "userID", value: student.userID || "" },
      {
        label: "Phone",
        name: "phone",
        value: student.phone || "",
        type: "tel",
      },
      { label: "School", name: "schoolName", value: student.schoolName || "" },
    ];

    for (const field of fields) {
      const label = document.createElement("label");
      label.htmlFor = `edit-${field.name}`;
      label.textContent = field.label;
      const input = document.createElement("input");
      input.id = `edit-${field.name}`;
      input.name = field.name;
      input.value = field.value;
      input.maxLength = field.name === "schoolName" ? 160 : 80;
      if (field.type) {
        input.type = field.type;
      }
      form.append(label, input);
    }

    for (const field of [
      {
        label: "Grade",
        name: "grade",
        options: ["S1", "S2", "S3"],
        value: enumValue(student.grade, ["S1", "S2", "S3"]),
      },
      {
        label: "Learning language",
        name: "learningLanguage",
        options: ["Arabic", "English"],
        value: enumValue(student.learningLanguage, ["Arabic", "English"]),
      },
    ]) {
      const label = document.createElement("label");
      label.htmlFor = `edit-${field.name}`;
      label.textContent = field.label;
      const select = document.createElement("select");
      select.id = `edit-${field.name}`;
      select.name = field.name;
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Not specified";
      select.append(blank);
      field.options.forEach((optionLabel, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = optionLabel;
        option.selected = field.value === option.value;
        select.append(option);
      });
      form.append(label, select);
    }

    const actions = document.createElement("div");
    actions.className = "directory-edit-actions";
    const cancel = document.createElement("button");
    cancel.className = "secondary-button";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => buildProfile(student));
    const save = document.createElement("button");
    save.className = "submit-button";
    save.type = "submit";
    save.textContent = "Save changes";
    actions.append(cancel, save);
    form.append(actions);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const body = Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, value.trim()]),
      );
      for (const fieldName of ["grade", "learningLanguage"]) {
        body[fieldName] =
          body[fieldName] === "" ? null : Number(body[fieldName]);
      }

      save.disabled = true;
      save.textContent = "Saving...";
      try {
        const updated = await request(
          `/myStudents/${encodeURIComponent(student._id)}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
        students = students.map((item) =>
          item._id === updated._id ? updated : item,
        );
        renderRoster();
        buildProfile(updated);
        showPageMessage("Student record updated.");
      } catch (error) {
        showPageMessage(
          error instanceof Error
            ? error.message
            : "Could not update this student.",
          "error",
        );
        save.disabled = false;
        save.textContent = "Save changes";
      }
    });

    record.append(header, form);
    form.elements.firstName.focus();
  }

  async function loadStudent(studentId) {
    selectedStudentId = studentId;
    const version = ++requestVersion;
    renderRoster();
    record.innerHTML =
      '<p class="record-loading" role="status">Loading student record...</p>';
    try {
      const student = await request(
        `/myStudents/${encodeURIComponent(studentId)}`,
      );
      if (version !== requestVersion) {
        return;
      }
      buildProfile(student);
    } catch (error) {
      if (version !== requestVersion) {
        return;
      }
      record.replaceChildren();
      const message = document.createElement("p");
      message.className = "directory-error";
      message.textContent =
        error instanceof Error ? error.message : "Could not load this student.";
      record.append(message);
    }
  }

  async function loadStudents() {
    rosterStatus.textContent = "Loading students...";
    roster.replaceChildren();
    try {
      const result = await request("/myStudents");
      students = Array.isArray(result) ? result.filter(Boolean) : [];
      rosterStatus.textContent = `${students.length} student${students.length === 1 ? "" : "s"}`;
      renderRoster();
      if (selectedStudentId) {
        const selected = students.find(
          (student) => student._id === selectedStudentId,
        );
        if (selected) {
          await loadStudent(selectedStudentId);
        } else {
          selectedStudentId = null;
          record.innerHTML =
            '<div class="record-empty"><p class="eyebrow">STUDENT RECORD</p><h2 id="record-title">Select a student</h2><p>The student profile and learning history will appear here.</p></div>';
        }
      }
    } catch (error) {
      rosterStatus.textContent =
        error instanceof Error ? error.message : "Could not load students.";
      renderRoster();
    }
  }

  searchInput.addEventListener("input", renderRoster);
  document
    .querySelector("#refresh-directory")
    .addEventListener("click", loadStudents);
  document.querySelector("#directory-logout").addEventListener("click", () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.replace("teacherlogin.html");
  });

  loadStudents();
})();
