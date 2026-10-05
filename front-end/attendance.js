(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const STORAGE_KEY = "teacherSessions.v1";
  const accessToken = sessionStorage.getItem("accessToken");
  const sessionLabel = document.querySelector("#active-session-label");
  const sessionBadge = document.querySelector("#active-session-badge");
  const message = document.querySelector("#attendance-message");
  const review = document.querySelector("#student-review");
  const cameraPanel = document.querySelector("#camera-panel");
  const video = document.querySelector("#camera-video");
  let sessions = loadSessions();
  let activeSession = sessions.find((session) => session.active);
  let students = [];
  let pendingStudent = null;
  let cameraStream = null;
  let detector = null;
  let scanning = false;

  if (!accessToken) {
    window.location.replace("teacherlogin.html");
    return;
  }

  function loadSessions() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
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

  function drawActiveSession() {
    if (!activeSession) {
      sessionLabel.textContent =
        "No session is active on this device. Activate a session from the Sessions page first.";
      sessionBadge.textContent = "No active session";
      sessionBadge.classList.remove("is-active");
      document.querySelector("#start-scan").disabled = true;
      document.querySelector("#student-id-input").disabled = true;
      document.querySelector("#student-id-form button").disabled = true;
      return;
    }
    sessionLabel.textContent = `Week ${activeSession.week} · Session ${activeSession.number}: ${activeSession.sequence}`;
    sessionBadge.textContent = "Active on this device";
    sessionBadge.classList.add("is-active");
  }

  async function loadStudents() {
    const response = await fetch(`${API_BASE}/teacher/myStudents`, {
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
    students = Array.isArray(result.data) ? result.data.filter(Boolean) : [];
  }

  function showStudent(student) {
    if (!activeSession) {
      showMessage("Activate a session before recording attendance.", "error");
      return;
    }
    if ((activeSession.attendance || []).includes(String(student._id))) {
      showMessage(
        `${studentName(student)} is already marked present.`,
        "error",
      );
      return;
    }
    pendingStudent = student;
    document.querySelector("#review-title").textContent = studentName(student);
    document.querySelector("#review-student-id").textContent = student.userID
      ? `ID ${student.userID}`
      : "";
    const fields = document.querySelector("#review-student-fields");
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
    review.hidden = false;
    review.scrollIntoView({ behavior: "smooth", block: "start" });
    showMessage(
      "Review the student details, then confirm to record attendance.",
    );
  }

  function findByIdentifier(identifier) {
    const normalized = identifier.trim().toLocaleLowerCase();
    const student = students.find((item) =>
      [item.userID, item._id].some(
        (value) => String(value || "").toLocaleLowerCase() === normalized,
      ),
    );
    if (!student) {
      showMessage(
        "No assigned student matched that ID. Check the ID and try again.",
        "error",
      );
      review.hidden = true;
      pendingStudent = null;
      return;
    }
    showStudent(student);
  }

  async function scanFrames() {
    if (!scanning || !detector) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length && codes[0].rawValue) {
        findByIdentifier(codes[0].rawValue);
        stopCamera();
        return;
      }
    } catch {
      document.querySelector("#camera-status").textContent =
        "Could not read a QR code. Try adjusting the camera or enter the ID manually.";
      stopCamera();
      return;
    }
    requestAnimationFrame(scanFrames);
  }

  async function startCamera() {
    if (!activeSession) return;
    if (!("BarcodeDetector" in window)) {
      showMessage(
        "QR scanning is not supported in this browser. Enter the student ID manually.",
        "error",
      );
      return;
    }
    try {
      detector = new BarcodeDetector({ formats: ["qr_code"] });
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      video.srcObject = cameraStream;
      await video.play();
      cameraPanel.hidden = false;
      document.querySelector("#camera-status").textContent =
        "Point the camera at the student's QR code.";
      scanning = true;
      requestAnimationFrame(scanFrames);
    } catch {
      showMessage(
        "Camera access was unavailable. Allow camera permission or enter the student ID manually.",
        "error",
      );
      stopCamera();
    }
  }

  function stopCamera() {
    scanning = false;
    if (cameraStream) {
      for (const track of cameraStream.getTracks()) track.stop();
    }
    cameraStream = null;
    video.srcObject = null;
    cameraPanel.hidden = true;
  }

  document
    .querySelector("#student-id-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      findByIdentifier(document.querySelector("#student-id-input").value);
    });
  document.querySelector("#start-scan").addEventListener("click", startCamera);
  document.querySelector("#stop-scan").addEventListener("click", stopCamera);
  document.querySelector("#cancel-review").addEventListener("click", () => {
    pendingStudent = null;
    review.hidden = true;
    message.hidden = true;
  });
  document
    .querySelector("#confirm-attendance")
    .addEventListener("click", () => {
      if (!activeSession || !pendingStudent) return;
      activeSession.attendance = [
        ...new Set([
          ...(activeSession.attendance || []),
          String(pendingStudent._id),
        ]),
      ];
      saveSessions();
      const name = studentName(pendingStudent);
      pendingStudent = null;
      review.hidden = true;
      document.querySelector("#student-id-input").value = "";
      showMessage(
        `${name} recorded as present for Week ${activeSession.week}, Session ${activeSession.number}.`,
      );
    });
  document
    .querySelector("#attendance-signout")
    .addEventListener("click", () => {
      stopCamera();
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      window.location.replace("teacherlogin.html");
    });

  drawActiveSession();
  loadStudents().catch((error) =>
    showMessage(
      error instanceof Error
        ? error.message
        : "Could not load assigned students.",
      "error",
    ),
  );
  window.addEventListener("pagehide", stopCamera);
})();
