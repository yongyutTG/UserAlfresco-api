const documentLibraryPath = "/Sites/tg-saving/documentLibrary";

    // key ใน sessionStorage ของ browser
    // alfrescoUserApiToken ไม่ได้มาจาก .env แต่ได้จาก response ของ POST /auth/login
    // ใช้เก็บ accessToken ชั่วคราวเพื่อให้ refresh หน้าแล้วยังเรียก API ต่อได้ใน tab/session เดิม
    const tokenKey = "alfrescoUserApiToken";
    const usernameKey = "alfrescoUserApiUsername";

    const state = {
      // โหลด token/username ที่เคย login ไว้จาก sessionStorage
      // sessionStorage จะหายเมื่อปิด tab/browser session หรือ logout
      token: sessionStorage.getItem(tokenKey) || "",
      username: sessionStorage.getItem(usernameKey) || "",
      folderPath: "",
      q: "",
      maxItems: 100,
      skipCount: 0,
      total: 0,
      hasMoreItems: false,
      loading: false,
    };

    const els = {
      sessionBar: document.getElementById("sessionBar"),
      sessionUser: document.getElementById("sessionUser"),
      logoutBtn: document.getElementById("logoutBtn"),
      folderList: document.getElementById("folderList"),
      folderCount: document.getElementById("folderCount"),
      keyword: document.getElementById("keyword"),
      pageSize: document.getElementById("pageSize"),
      searchBtn: document.getElementById("searchBtn"),
      clearBtn: document.getElementById("clearBtn"),
      prevBtn: document.getElementById("prevBtn"),
      nextBtn: document.getElementById("nextBtn"),
      currentPath: document.getElementById("currentPath"),
      summary: document.getElementById("summary"),
      pageInfo: document.getElementById("pageInfo"),
      rows: document.getElementById("fileRows"),
    };

    function authHeaders() {
      // ทุก API ใต้ /user-api/alfresco/* ต้องแนบ token นี้
      // Backend จะเอา token ไปหา session แล้วเรียก Alfresco ด้วยสิทธิ์ของ user ที่ login
      return state.token ? { Authorization: `Bearer ${state.token}` } : {};
    }

    function redirectToLogin() {
      const currentPage = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login/?redirect=${encodeURIComponent(currentPage)}`);
    }

    async function fetchJson(url, options = {}) {
      // helper กลางสำหรับเรียก API แบบ JSON และแนบ Bearer token ให้อัตโนมัติ
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...authHeaders(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      return data;
    }

    function setLoading(loading) {
      state.loading = loading;
      for (const element of [els.keyword, els.pageSize, els.searchBtn, els.clearBtn]) {
        element.disabled = loading;
      }
      for (const button of els.folderList.querySelectorAll("button")) button.disabled = loading;
      els.prevBtn.disabled = loading || state.skipCount === 0;
      els.nextBtn.disabled = loading || !state.hasMoreItems;
    }

    function setLoggedIn(token, username) {
      // token ตรงนี้คือ data.accessToken ที่ Backend สร้างให้หลังตรวจ Alfresco login สำเร็จ
      // เก็บไว้เฉพาะใน browser session ไม่ใช่ token ถาวร และไม่ใช่ API_TOKEN ของโปรเจคเก่า
      state.token = token;
      state.username = username;
      sessionStorage.setItem(tokenKey, token);
      sessionStorage.setItem(usernameKey, username);
      renderSession();
    }

    function clearSession() {
      // logout ฝั่ง browser: ล้าง token ออกจาก memory และ sessionStorage
      // ส่วน /auth/logout จะลบ session ฝั่ง Backend ด้วย
      state.token = "";
      state.username = "";
      state.folderPath = "";
      state.q = "";
      state.skipCount = 0;
      state.hasMoreItems = false;
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(usernameKey);
      els.keyword.value = "";
      els.folderCount.textContent = "ยังไม่ได้ login";
      els.folderList.innerHTML = '<div class="empty">กรุณา login ก่อน</div>';
      els.rows.innerHTML = '<tr><td colspan="5" class="empty">ยังไม่มีข้อมูล</td></tr>';
      els.summary.textContent = "กรุณา login ก่อนใช้งาน";
      els.pageInfo.textContent = "";
      renderSession();
    }

    function renderSession() {
      const loggedIn = Boolean(state.token);
      els.sessionBar.classList.toggle("hidden", !loggedIn);
      els.sessionUser.textContent = state.username || "-";
      els.currentPath.textContent = loggedIn ? (state.folderPath || "เลือกโฟลเดอร์ที่ต้องการ") : "Login ด้วย user Alfresco เพื่อดู folder/file ตามสิทธิ์ของ user";
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function formatBytes(bytes) {
      const value = Number(bytes);
      if (!Number.isFinite(value)) return "-";
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    function formatDate(ms) {
      if (!ms) return "-";
      return new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(Number(ms)));
    }

    function resetPendingSearch(message) {
      state.skipCount = 0;
      state.hasMoreItems = false;
      els.currentPath.textContent = state.folderPath || "เลือกโฟลเดอร์ที่ต้องการ";
      els.summary.textContent = message;
      els.pageInfo.textContent = "";
      els.rows.innerHTML = '<tr><td colspan="5" class="empty">ยังไม่มีข้อมูล กดปุ่มค้นหาเพื่อโหลดรายการไฟล์</td></tr>';
      setLoading(false);
    }

    function renderFolders(folders) {
      const allowedFolders = folders
        .filter((item) => item.isFolder && item.path)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));

      els.folderCount.textContent = `พบ ${allowedFolders.length.toLocaleString("th-TH")} โฟลเดอร์ตามสิทธิ์`;

      if (!allowedFolders.length) {
        els.folderList.innerHTML = '<div class="empty">ไม่พบโฟลเดอร์ที่ user นี้มีสิทธิ์เห็น</div>';
        return;
      }

      els.folderList.innerHTML = allowedFolders.map((folder) => `
        <button class="folder-item" type="button" data-folder-path="${escapeHtml(folder.path)}">
          ${escapeHtml(folder.name)}
        </button>
      `).join("");
    }

    async function loadFolders() {
      if (!state.token) return;
      setLoading(true);
      els.summary.textContent = "กำลังโหลดรายชื่อโฟลเดอร์...";
      try {
        const params = new URLSearchParams({ path: documentLibraryPath });
        // fetchJson จะแนบ Authorization: Bearer <alfrescoUserApiToken> ให้เอง
        const folders = await fetchJson(`/user-api/alfresco/folders?${params.toString()}`);
        renderFolders(folders);
        state.folderPath = "";
        els.currentPath.textContent = "เลือกโฟลเดอร์ที่ต้องการ";
        els.summary.textContent = "เลือกโฟลเดอร์ แล้วกดปุ่มค้นหาเพื่อแสดงรายการไฟล์";
      } catch (err) {
        els.summary.innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
      } finally {
        setLoading(false);
      }
    }

    function buildDocumentsUrl() {
      const params = new URLSearchParams({
        folderPath: state.folderPath,
        maxItems: String(state.maxItems),
        skipCount: String(state.skipCount),
      });
      if (state.q) params.set("q", state.q);
      const endpoint = state.q ? "/user-api/alfresco/documents/search" : "/user-api/alfresco/documents";
      return `${endpoint}?${params.toString()}`;
    }

    function renderRows(files) {
      if (!files.length) {
        els.rows.innerHTML = '<tr><td colspan="5" class="empty">ไม่พบไฟล์</td></tr>';
        return;
      }

      els.rows.innerHTML = files.map((file, index) => {
        const rowNumber = state.skipCount + index + 1;
        return `
          <tr>
            <td class="num">${rowNumber}</td>
            <td class="name">${escapeHtml(file.name || "-")}</td>
            <td class="num muted">${formatBytes(file.size)}</td>
            <td class="muted">${formatDate(file.creationDate)}</td>
            <td><button class="secondary" type="button" data-download-url="${escapeHtml(file.downloadUrl || "")}">เปิด</button></td>
          </tr>
        `;
      }).join("");
    }

    async function loadFiles(resetPage = false) {
      if (!state.token) {
        els.summary.textContent = "กรุณา login ก่อนใช้งาน";
        return;
      }
      if (!state.folderPath) {
        els.summary.textContent = "กรุณาเลือกโฟลเดอร์ก่อน";
        els.rows.innerHTML = '<tr><td colspan="5" class="empty">กรุณาเลือกโฟลเดอร์ก่อน</td></tr>';
        return;
      }

      if (resetPage) state.skipCount = 0;
      setLoading(true);
      els.summary.textContent = "กำลังโหลดข้อมูล...";
      els.pageInfo.textContent = "";
      els.currentPath.textContent = state.folderPath;

      try {
        // Backend จะใช้ token เพื่อเรียก Alfresco ตาม permission ของ user ที่ login
        const data = await fetchJson(buildDocumentsUrl());
        state.total = data.total || 0;
        state.hasMoreItems = Boolean(data.hasMoreItems);
        renderRows(data.files || []);
        const mode = state.q ? `ผลค้นหา "${state.q}"` : "ไฟล์ทั้งหมด";
        els.summary.innerHTML = `<strong>${mode}</strong> แสดง ${data.count || 0} จากทั้งหมด ${state.total.toLocaleString("th-TH")} รายการ`;
        els.pageInfo.textContent = `skipCount ${state.skipCount.toLocaleString("th-TH")} | maxItems ${state.maxItems}`;
      } catch (err) {
        els.rows.innerHTML = '<tr><td colspan="5" class="empty error">โหลดข้อมูลไม่สำเร็จ</td></tr>';
        els.summary.innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
        state.hasMoreItems = false;
      } finally {
        setLoading(false);
      }
    }

    function syncSearchState() {
      state.q = els.keyword.value.trim();
      state.maxItems = Number(els.pageSize.value);
    }

    function openDocument(url) {
      if (!url) return;

      // เปิดแบบ direct URL เหมือนเวอร์ชันแรก ให้ browser เป็นคน stream/render PDF เอง
      // หลัง login backend ตั้ง HttpOnly cookie แล้ว route content จึงรู้ session user ได้โดยไม่ต้อง fetch blob ผ่าน JS
      window.open(url, "_blank", "noopener");
    }

    els.logoutBtn.addEventListener("click", async () => {
      try {
        if (state.token) await fetch("/auth/logout", { method: "POST", headers: authHeaders() });
      } catch (err) {}
      clearSession();
      redirectToLogin();
    });

    els.folderList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-folder-path]");
      if (!button) return;

      els.keyword.value = "";
      state.folderPath = button.dataset.folderPath || "";
      syncSearchState();

      for (const item of els.folderList.querySelectorAll(".folder-item")) item.classList.remove("active");
      button.classList.add("active");

      resetPendingSearch("กดปุ่มค้นหาเพื่อแสดงรายการไฟล์ในโฟลเดอร์ที่เลือก");
    });

    els.searchBtn.addEventListener("click", () => {
      syncSearchState();
      loadFiles(true);
    });

    els.keyword.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        syncSearchState();
        loadFiles(true);
      }
    });

    els.pageSize.addEventListener("change", () => {
      syncSearchState();
      resetPendingSearch(state.folderPath ? "กดปุ่มค้นหาเพื่อโหลดข้อมูลตามจำนวนต่อหน้าที่เลือก" : "กรุณาเลือกโฟลเดอร์ก่อน");
    });

    els.clearBtn.addEventListener("click", () => {
      els.keyword.value = "";
      syncSearchState();
      resetPendingSearch(state.folderPath ? "ล้างคำค้นแล้ว กดปุ่มค้นหาเพื่อแสดงไฟล์ทั้งหมดในโฟลเดอร์ที่เลือก" : "กรุณาเลือกโฟลเดอร์ก่อน");
    });

    els.prevBtn.addEventListener("click", () => {
      syncSearchState();
      state.skipCount = Math.max(0, state.skipCount - state.maxItems);
      loadFiles(false);
    });

    els.nextBtn.addEventListener("click", () => {
      syncSearchState();
      state.skipCount += state.maxItems;
      loadFiles(false);
    });

    els.rows.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-download-url]");
      if (button) openDocument(button.dataset.downloadUrl);
    });

    if (!state.token) {
      redirectToLogin();
    } else {
      renderSession();
      setLoading(false);
      loadFolders();
    }
