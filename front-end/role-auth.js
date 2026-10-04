(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;

  function showMessage(message, text, state = "success") {
    message.textContent = text;
    message.dataset.state = state;
    message.hidden = false;
  }

  async function postJson(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
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

  function setupRoleAuth(role) {
    const tabs = document.querySelectorAll("[data-panel]");
    const panels = document.querySelectorAll(".form-panel");
    const message = document.querySelector("#form-message");

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

    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        message.hidden = true;
        showPanel(tab.dataset.panel);
      });
    }

    const registerForm = document.querySelector("#register-form");
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitter = form.querySelector("button[type='submit']");
      const originalText = submitter.textContent;
      submitter.disabled = true;
      submitter.textContent = "Please wait...";

      try {
        const fields = new FormData(form);
        if (fields.get("password") !== fields.get("confirmPassword")) {
          throw new Error("The passwords do not match.");
        }

        const body = Object.fromEntries(fields.entries());
        delete body.confirmPassword;
        const result = await postJson(`/signup/${role}`, body);

        if (role === "student") {
          document.querySelector("#student-id-value").textContent =
            result.data.userID;
          document.querySelector("#student-id-qr").src = result.data.qrCode;
          document.querySelector("#student-credentials").hidden = false;
          showMessage(
            message,
            `Account created. Your student number is ${result.data.userID}. Save it for signing in.`,
          );
        } else {
          const identifier = fields.get("name");
          document.querySelector("#login-identifier").value = identifier.trim();
          showPanel("login-panel");
          showMessage(message, "Account created. You can now sign in.");
        }
      } catch (error) {
        showMessage(
          message,
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
          "error",
        );
      } finally {
        submitter.disabled = false;
        submitter.textContent = originalText;
      }
    });

    const loginForm = document.querySelector("#login-form");
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitter = form.querySelector("button[type='submit']");
      const originalText = submitter.textContent;
      submitter.disabled = true;
      submitter.textContent = "Please wait...";

      try {
        const fields = new FormData(form);
        const result = await postJson(`/login/${role}`, {
          identifier: fields.get("identifier").trim(),
          password: fields.get("password"),
        });

        if (result.data?.accessToken) {
          sessionStorage.setItem("accessToken", result.data.accessToken);
          sessionStorage.setItem("refreshToken", result.data.refreshToken || "");
        }

        showMessage(message, "Signed in successfully. Your session token is ready for authenticated requests.");
        form.reset();
      } catch (error) {
        showMessage(
          message,
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
          "error",
        );
      } finally {
        submitter.disabled = false;
        submitter.textContent = originalText;
      }
    });
  }

  window.setupRoleAuth = setupRoleAuth;
})();
