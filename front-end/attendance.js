(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const accessToken = sessionStorage.getItem("accessToken");
  const sessionLabel = document.querySelector("#active-session-label");
  const sessionBadge = document.querySelector("#active-session-badge");
  const message = document.querySelector("#attendance-message");
  const review = document.querySelector("#student-review");
  const cameraPanel = document.querySelector("#camera-panel");
  const video = document.querySelector("#camera-video");
  const scanCanvas = document.createElement("canvas");
  const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
  let activeSession = null;
  let students = [];
  let pendingStudent = null;
  let cameraStream = null;
  let detector = null;
  let scanning = false;
  let lastScanAt = 0;
  let qrDecoderPromise = null;

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
        "No session is active. Activate a session from the Sessions page first.";
      sessionBadge.textContent = "No active session";
      sessionBadge.classList.remove("is-active");
      document.querySelector("#start-scan").disabled = true;
      document.querySelector("#student-id-input").disabled = true;
      document.querySelector("#student-id-form button").disabled = true;
      return;
    }
    sessionLabel.textContent = `Week ${activeSession.week} · Session ${activeSession.number}: ${activeSession.sequence}`;
    sessionBadge.textContent = "Active";
    sessionBadge.classList.add("is-active");
    document.querySelector("#start-scan").disabled = false;
    document.querySelector("#student-id-input").disabled = false;
    document.querySelector("#student-id-form button").disabled = false;
  }

  async function loadStudents() {
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
    students = Array.isArray(result.data) ? result.data.filter(Boolean) : [];
  }

  async function loadActiveSession() {
    const sessions = await apiRequest("/teacher/sessions");
    activeSession = Array.isArray(sessions)
      ? sessions.find((session) => session.active) || null
      : null;
  }

  function showStudent(student) {
    if (!activeSession) {
      showMessage("Activate a session before recording attendance.", "error");
      return;
    }
    const isPresent = (activeSession.attendance || []).some((entry) =>
      String(entry.student?._id || entry.student) === String(student._id),
    );
    if (isPresent) {
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
    if (!scanning) return;
    if (Date.now() - lastScanAt < 200) {
      requestAnimationFrame(scanFrames);
      return;
    }
    if (!video.videoWidth || !video.videoHeight) {
      requestAnimationFrame(scanFrames);
      return;
    }
    lastScanAt = Date.now();
    try {
      let rawValue;
      if (detector) {
        const codes = await detector.detect(video);
        rawValue = codes[0]?.rawValue;
      } else if (scanContext && video.videoWidth && video.videoHeight) {
        scanCanvas.width = video.videoWidth;
        scanCanvas.height = video.videoHeight;
        scanContext.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
        const image = scanContext.getImageData(
          0,
          0,
          scanCanvas.width,
          scanCanvas.height,
        );
        rawValue = window.jsQR(
          image.data,
          image.width,
          image.height,
          { inversionAttempts: "dontInvert" },
        )?.data;
      }
      if (rawValue) {
        findByIdentifier(rawValue);
        stopCamera();
        return;
      }
    } catch (error) {
      document.querySelector("#camera-status").textContent =
        error instanceof Error
          ? `QR scanning failed: ${error.message}`
          : "QR scanning failed. Enter the student ID manually.";
      stopCamera();
      return;
    }
    requestAnimationFrame(scanFrames);
  }

  function loadQrDecoder() {
    if (qrDecoderPromise) return qrDecoderPromise;
    qrDecoderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${API_BASE}/vendor/jsQR.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the QR scanner."));
      document.head.append(script);
    });
    return qrDecoderPromise;
  }

  function cameraErrorMessage(error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access in your browser settings, then try again.";
    }
    if (error instanceof Error && error.name === "NotFoundError") {
      return "No camera was found on this device.";
    }
    if (error instanceof Error && error.name === "NotReadableError") {
      return "The camera is already in use or unavailable. Close other camera apps and try again.";
    }
    if (!window.isSecureContext) {
      return "Camera access requires HTTPS or localhost. Open this page on a secure connection.";
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return "This browser does not provide camera access. Use HTTPS or a supported browser, or enter the student ID manually.";
    }
    return error instanceof Error
      ? `Could not open the camera: ${error.message}`
      : "Could not open the camera. Check browser camera permissions.";
  }

  async function startCamera() {
    if (!activeSession) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showMessage(cameraErrorMessage(), "error");
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      video.srcObject = cameraStream;
      await video.play();
      cameraPanel.hidden = false;
      detector = null;
      if ("BarcodeDetector" in window) {
        try {
          detector = new BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detector = null;
        }
      }
      if (!detector) {
        document.querySelector("#camera-status").textContent =
          "Loading QR scanner...";
        await loadQrDecoder();
      }
      document.querySelector("#camera-status").textContent =
        "Point the camera at the student's QR code.";
      scanning = true;
      requestAnimationFrame(scanFrames);
    } catch (error) {
      showMessage(cameraErrorMessage(error), "error");
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
    .addEventListener("click", async () => {
      if (!activeSession || !pendingStudent) return;
      const confirmButton = document.querySelector("#confirm-attendance");
      confirmButton.disabled = true;
      try {
        const checkedInStudent = pendingStudent;
        const result = await apiRequest(
          `/teacher/sessions/${activeSession._id}/attendance`,
          {
            method: "POST",
            body: JSON.stringify({
              identifier: checkedInStudent.userID || checkedInStudent._id,
            }),
          },
        );
        activeSession = result.session;
        pendingStudent = null;
        review.hidden = true;
        document.querySelector("#student-id-input").value = "";
        showMessage(
          `${studentName(checkedInStudent)} recorded as present for Week ${activeSession.week}, Session ${activeSession.number}.`,
        );
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Could not record attendance.",
          "error",
        );
      } finally {
        confirmButton.disabled = false;
      }
    });
  document
    .querySelector("#attendance-signout")
    .addEventListener("click", () => {
      stopCamera();
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      window.location.replace("teacherlogin.html");
    });

  Promise.all([loadStudents(), loadActiveSession()])
    .then(drawActiveSession)
    .catch((error) => {
      drawActiveSession();
      showMessage(
        error instanceof Error
          ? error.message
          : "Could not load the attendance page.",
        "error",
      );
    });
  window.addEventListener("pagehide", stopCamera);
})();
