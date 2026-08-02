const tokenKey = "alfrescoUserApiToken";
    const usernameKey = "alfrescoUserApiUsername";
    const form = document.getElementById("loginForm");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const button = document.getElementById("loginBtn");
    const message = document.getElementById("message");

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirect") || "/frontend/";

    if (sessionStorage.getItem(tokenKey)) {
      window.location.replace(redirectTo);
    }

    function setMessage(type, text) {
      message.className = `message ${type}`;
      message.textContent = text;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.className = "message";
      message.textContent = "";
      button.disabled = true;
      button.textContent = "กำลัง Login...";

      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.value.trim(),
            password: password.value,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error?.message || `HTTP ${res.status}`);
        }

        sessionStorage.setItem(tokenKey, data.accessToken);
        sessionStorage.setItem(usernameKey, data.username || data.user?.username || username.value.trim());
        password.value = "";
        setMessage("success", "Login สำเร็จ กำลังไปหน้าไฟล์...");
        window.location.replace(redirectTo);
      } catch (err) {
        setMessage("error", err.message || "Login ไม่สำเร็จ");
      } finally {
        button.disabled = false;
        button.textContent = "Login";
      }
    });
