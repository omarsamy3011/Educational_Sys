(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const accessToken = sessionStorage.getItem("accessToken");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const profileForm = document.querySelector("#profile-form");
  const profileDialog = document.querySelector("#profile-dialog");
  const studentsList = document.querySelector("#students-list");
  const studentsStatus = document.querySelector("#students-status");

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
    const response = await fetch(`${API_BASE}/teacher${path}`, {
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
      detailsButton.textContent = "Details";
      const studentDetail = document.createElement("section");
      studentDetail.className = "student-detail";
      studentDetail.setAttribute("aria-live", "polite");
      studentDetail.hidden = true;
      detailsButton.addEventListener("click", () =>
        loadStudent(student._id, studentDetail),
      );

      rowHeader.append(summary, detailsButton);
      item.append(rowHeader, studentDetail);
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

  async function loadStudent(studentId, studentDetail) {
    if (!studentId) {
      showMessage("This student record has no valid identifier.", "error");
      return;
    }

    try {
      studentDetail.hidden = false;
      studentDetail.textContent = "Loading student details...";
      const student = await request(
        `/myStudents/${encodeURIComponent(studentId)}`,
      );
      studentDetail.replaceChildren();
      const heading = document.createElement("h3");
      heading.textContent = studentName(student);
      studentDetail.append(heading);

      const details = [
        ["Student ID", student.userID],
        ["Phone", student.phone],
        ["Grade", enumLabel(student.grade, ["S1", "S2", "S3"])],
        ["School", student.schoolName],
        [
          "Learning language",
          enumLabel(student.learningLanguage, ["Arabic", "English"]),
        ],
      ];
      const list = document.createElement("dl");
      list.className = "student-detail-list";
      for (const [label, value] of details) {
        if (value == null || value === "") {
          continue;
        }
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        list.append(term, description);
      }
      studentDetail.append(list);
      studentDetail.hidden = false;
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Could not load student details.",
        "error",
      );
    }
  }

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
