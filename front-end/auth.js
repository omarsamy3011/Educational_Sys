const tabs = document.querySelectorAll("[data-panel]");
const panels = document.querySelectorAll(".form-panel");
const message = document.querySelector("#form-message");
const API_BASE =
  window.location.port === "5500"
    ? "http://127.0.0.1:3000"
    : window.location.origin;

function showPanel(panelId) {
  for (const panel of panels) {
    panel.hidden = panel.id !== panelId;
  }

  for (const tab of tabs) {
    const selected = tab.dataset.panel === panelId;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }
}

function showMessage(text, state = "success") {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = false;
}

async function postJson(path, body) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.");
  }

  return result;
}

async function submitForm(form, submitter, action) {
  const originalText = submitter.textContent;
  submitter.disabled = true;
  submitter.textContent = "Please wait...";

  try {
    await action(new FormData(form));
  } catch (error) {
    showMessage(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
      "error",
    );
  } finally {
    submitter.disabled = false;
    submitter.textContent = originalText;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    message.hidden = true;
    showPanel(tab.dataset.panel);
  });
}

document.querySelector("#register-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitter = form.querySelector("button[type='submit']");

  submitForm(form, submitter, async (fields) => {
    const password = fields.get("password");
    if (password !== fields.get("confirmPassword")) {
      throw new Error("The passwords do not match.");
    }

    const email = fields.get("email").trim();
    const body = {
      userName: fields.get("userName").trim(),
      email,
      phone: fields.get("phone").trim(),
      password,
      subject: fields.getAll("subject"),
      teachingLanguage: fields.get("teachingLanguage"),
    };
    for (const field of ["firstName", "lastName", "companyName"]) {
      const value = fields.get(field).trim();
      if (value) {
        body[field] = value;
      }
    }

    await postJson("/signup/teacher", body);

    document.querySelector("#verify-identifier").value = email;
    showPanel("verify-panel");
    showMessage(
      `Account created. Enter the verification code sent to ${email}.`,
    );
  });
});

document.querySelector("#verify-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitter = form.querySelector("button[type='submit']");

  submitForm(form, submitter, async (fields) => {
    await postJson("/verify-acc", {
      identifier: fields.get("identifier").trim(),
      otp: fields.get("otp").trim(),
    });

    document.querySelector("#login-identifier").value = fields
      .get("identifier")
      .trim();
    showPanel("login-panel");
    showMessage("Email verified. You can now sign in.");
  });
});

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitter = form.querySelector("button[type='submit']");

  submitForm(form, submitter, async (fields) => {
    const result = await postJson("/login/teacher", {
      identifier: fields.get("identifier").trim(),
      password: fields.get("password"),
    });

    if (result.data?.accessToken) {
      sessionStorage.setItem("accessToken", result.data.accessToken);
      sessionStorage.setItem("refreshToken", result.data.refreshToken || "");
      window.location.assign("teacher.html");
      return;
    }

    throw new Error("The server did not return an access token.");
  });
});
