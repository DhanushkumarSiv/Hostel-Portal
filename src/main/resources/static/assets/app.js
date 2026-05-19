const STORAGE_KEY = "hostel_session";

const FEATURES = {
  dashboard: "Dashboard",
  students: "Students",
  attendance: "Attendance",
  circulars: "Circulars",
  menu: "Menu",
  complaints: "Complaints",
  outpass: "Outpass",
  feedback: "Food Feedback",
  gym: "Gym Access",
  indoor: "Indoor Court"
};

const ROLE_FEATURES = {
  STUDENT: ["dashboard", "attendance", "circulars", "menu", "complaints", "outpass", "feedback", "gym", "indoor"],
  FACULTY: ["dashboard", "students", "attendance", "circulars", "menu", "complaints", "outpass", "feedback", "gym", "indoor"],
  ADMIN: ["dashboard", "students", "attendance", "circulars", "menu", "complaints", "outpass", "feedback", "gym", "indoor"]
};

const state = {
  session: loadSession(),
  activeFeature: "dashboard"
};

const appRoot = document.getElementById("app");
const { useEffect, useMemo, useState } = React;
const DEFAULT_PROFILE_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Ccircle cx='80' cy='80' r='80' fill='%23e7ecf2'/%3E%3Ccircle cx='80' cy='62' r='27' fill='%23bec8d3'/%3E%3Cpath d='M30 138c6-28 26-42 50-42s44 14 50 42' fill='%23bec8d3'/%3E%3C/svg%3E";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function parseMaybeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
}

async function api(path, options = {}) {
  const session = state.session;
  const opts = {
    method: options.method || "GET",
    headers: {
      ...(options.headers || {})
    }
  };

  if (session?.token) {
    opts.headers.Authorization = `Bearer ${session.token}`;
  }

  if (options.body && !options.formData) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(options.body);
  }

  if (options.formData) {
    opts.body = options.formData;
  }

  const res = await fetch(path, opts);
  const text = await res.text();
  const payload = parseMaybeJson(text);

  if (!res.ok) {
    const message = payload?.message || payload?.error || payload || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload;
}

function setNotice(container, message, kind = "info") {
  container.innerHTML = `<div class="notice ${kind}">${message}</div>`;
}

function roleBadge(role) {
  return `<span class="badge">${role}</span>`;
}

function card(label, value) {
  return `<div class="card"><div class="card-label">${label}</div><div class="card-value">${value || "-"}</div></div>`;
}

function profileLine(label, value) {
  return `<div class="profile-line"><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

const attendanceScannerState = {
  stream: null,
  rafId: null,
  active: false,
  decodeInFlight: false,
  lastDecodeAt: 0
};

function stopAttendanceScanner() {
  attendanceScannerState.active = false;
  attendanceScannerState.decodeInFlight = false;
  attendanceScannerState.lastDecodeAt = 0;

  if (attendanceScannerState.rafId) {
    cancelAnimationFrame(attendanceScannerState.rafId);
    attendanceScannerState.rafId = null;
  }

  if (attendanceScannerState.stream) {
    attendanceScannerState.stream.getTracks().forEach((track) => track.stop());
    attendanceScannerState.stream = null;
  }
}

async function startAttendanceScanner(videoEl, onDetect) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  stopAttendanceScanner();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });

  videoEl.srcObject = stream;
  await videoEl.play();

  attendanceScannerState.stream = stream;
  attendanceScannerState.active = true;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Unable to initialize QR scanner.");
  }

  const scan = async () => {
    if (!attendanceScannerState.active) {
      return;
    }

    if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !attendanceScannerState.decodeInFlight) {
      if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
      }

      const now = Date.now();
      if (now - attendanceScannerState.lastDecodeAt >= 350) {
        attendanceScannerState.lastDecodeAt = now;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        try {
          attendanceScannerState.decodeInFlight = true;

          const imageData = canvas.toDataURL("image/jpeg", 0.7);
          const response = await api("/attendance/decode-qr", {
            method: "POST",
            body: { imageData }
          });

          const qrData = String(response?.qrData || "").trim();
          if (qrData) {
            stopAttendanceScanner();
            await onDetect(qrData);
            return;
          }
        } catch (err) {
          // Ignore decode miss/error and keep scanning.
        } finally {
          attendanceScannerState.decodeInFlight = false;
        }
      }
    }

    attendanceScannerState.rafId = requestAnimationFrame(scan);
  };

  attendanceScannerState.rafId = requestAnimationFrame(scan);
}

async function loginUser(body) {
  const res = await api("/login", { method: "POST", body });
  const session = {
    token: res.token || res,
    regNo: res.regNo || body.regNo,
    role: (res.role || body.role || "STUDENT").toUpperCase(),
    student: res.student || null
  };

  if (session.role === "STUDENT" && !session.student) {
    session.student = await api("/students/me", {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    });
  }

  return session;
}

function App() {
  const [session, setSession] = useState(state.session);
  const [activeFeature, setActiveFeature] = useState(state.activeFeature);
  const [notice, setNoticeState] = useState({ message: "", kind: "info" });
  const [menuOpen, setMenuOpen] = useState(false);

  const allowedFeatures = useMemo(() => {
    if (!session) return [];
    return ROLE_FEATURES[session.role] || ROLE_FEATURES.STUDENT;
  }, [session]);

  useEffect(() => {
    state.session = session;
    state.activeFeature = activeFeature;
  }, [session, activeFeature]);

  useEffect(() => {
    if (!session) {
      stopAttendanceScanner();
      return;
    }

    if (!allowedFeatures.includes(activeFeature)) {
      setActiveFeature("dashboard");
      return;
    }

    renderFeature(activeFeature);
    setMenuOpen(false);
  }, [session, activeFeature, allowedFeatures]);

  const handleLogout = () => {
    stopAttendanceScanner();
    saveSession(null);
    setSession(null);
    setActiveFeature("dashboard");
    setNoticeState({ message: "", kind: "info" });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      role: String(formData.get("role") || "").trim().toUpperCase(),
      regNo: String(formData.get("regNo") || "").trim(),
      password: String(formData.get("password") || "")
    };

    try {
      setNoticeState({ message: "Checking credentials...", kind: "info" });
      const loggedInSession = await loginUser(body);
      saveSession(loggedInSession);
      setSession(loggedInSession);
      setActiveFeature("dashboard");
      setNoticeState({ message: "", kind: "info" });
    } catch (err) {
      setNoticeState({ message: err.message, kind: "error" });
    }
  };

  if (!session) {
    return (
      <div className="page-bg">
        <div className="ambient-shape shape-a"></div>
        <div className="ambient-shape shape-b"></div>
        <div className="login-wrap">
          <div className="brand-block">
            <p className="eyebrow">HostelMate</p>
            <h1>Smart Hostel Experience</h1>
            <p>Role-based access for student life, operations, and daily hostel updates.</p>
            <ul className="brand-points">
              <li>Attendance and QR workflow</li>
              <li>Menu, outpass, complaints, circulars</li>
              <li>Fast access on mobile and desktop</li>
            </ul>
          </div>
          <form id="loginForm" className="panel login-panel" onSubmit={handleLogin}>
            <h2>Sign In</h2>
            <label>Role</label>
            <select name="role" defaultValue="STUDENT" required>
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admin</option>
            </select>

            <label>Register Number</label>
            <input name="regNo" type="text" required placeholder="Enter register number" />

            <label>Password</label>
            <input name="password" type="password" required placeholder="Enter password" />

            <button type="submit">Login to HostelMate</button>
            {notice.message ? <div className={`notice ${notice.kind}`}>{notice.message}</div> : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img src="/assets/images/sec-logo.png" alt="Saveetha Engineering College logo" />
            <p className="logo-chip">HostelMate</p>
          </div>
          <p>
            <span className="badge">{session.role}</span> {session.regNo}
          </p>
        </div>
        <nav className="menu">
          {allowedFeatures.map((feature) => (
            <button
              key={feature}
              className={`menu-item ${activeFeature === feature ? "active" : ""}`}
              onClick={() => setActiveFeature(feature)}
            >
              {FEATURES[feature]}
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="content">
        <header className="content-head">
          <div>
            <h1>{FEATURES[activeFeature] || "Dashboard"}</h1>
            <p>Manage hostel operations from a single role-based workspace.</p>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen((prev) => !prev)}>Menu</button>
        </header>
        <section id="featureRoot" className="panel"></section>
      </main>
    </div>
  );
}

function renderFeature(feature) {
  stopAttendanceScanner();

  const root = document.getElementById("featureRoot");
  if (!root) {
    return;
  }

  const renderers = {
    dashboard: renderDashboard,
    students: renderStudents,
    attendance: renderAttendance,
    circulars: renderCirculars,
    menu: renderMenu,
    complaints: renderComplaints,
    outpass: renderOutpass,
    feedback: renderFeedback,
    gym: renderGym,
    indoor: renderIndoor
  };

  const fn = renderers[feature] || renderDashboard;
  fn(root);
}

function renderDashboard(root) {
  const { role, regNo, student } = state.session;
  const studentName = student?.name || "Student";
  const studentDepartment = student?.department || "-";
  const studentYear = student?.year || "-";
  const studentHostel = student?.hostelName || student?.HostelName || "-";
  const studentRoom = student?.roomNo || student?.RoomNo || "-";
  const studentFloor = student?.floorNo || "-";
  const studentPhone = student?.phoneNumber || "-";
  const roleLine =
    role === "STUDENT"
      ? `${studentDepartment} | ${studentYear}`
      : `${role} ACCESS`;

  root.innerHTML = `
    <div class="dashboard-template">
      <header class="dashboard-college-bar">
        <div class="dashboard-college-title">
          <h3>Saveetha Engineering College (Autonomous)</h3>
          <p>HostelMate Campus Dashboard</p>
        </div>
        <div class="dashboard-user-chip">
          <img src="${DEFAULT_PROFILE_ICON}" alt="Default profile" />
          <div>
            <strong>${studentName.toUpperCase()}</strong>
            <p>${regNo}</p>
          </div>
        </div>
      </header>

      <section class="dashboard-main">
        <article class="dashboard-identity">
          <img src="${DEFAULT_PROFILE_ICON}" alt="Default profile" />
          <div class="dashboard-identity-text">
            <h4>${studentName.toUpperCase()}</h4>
            <p>${roleLine}</p>
            <span>${regNo}</span>
          </div>
        </article>

        <article class="dashboard-profile-panel">
          <h3>Profile</h3>
          <div class="dashboard-profile-list">
            ${profileLine("Regester No", regNo)}
            ${profileLine("Name", studentName)}
            ${profileLine("Department", studentDepartment)}
            ${profileLine("Year", studentYear)}
            ${profileLine("Hostel", studentHostel)}
            ${profileLine("Room", studentRoom)}
            ${profileLine("Floor", studentFloor)}
            ${profileLine("Phone", studentPhone)}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderStudents(root) {
  root.innerHTML = `
    <div class="actions">
      <button id="loadStudentsBtn">Load Students</button>
    </div>
    <div id="studentsNotice"></div>
    <div id="studentsTable"></div>
  `;

  const btn = document.getElementById("loadStudentsBtn");
  const notice = document.getElementById("studentsNotice");
  const tableRoot = document.getElementById("studentsTable");

  btn.addEventListener("click", async () => {
    try {
      setNotice(notice, "Loading students...", "info");
      const students = await api("/students");
      setNotice(notice, `Loaded ${students.length} students`, "success");
      tableRoot.innerHTML = tableFromStudents(students);
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  });
}

function tableFromStudents(students) {
  if (!students.length) return "<p>No students found.</p>";
  const rows = students
    .map(
      (s) => `<tr>
      <td>${s.regNo || ""}</td>
      <td>${s.name || ""}</td>
      <td>${s.department || ""}</td>
      <td>${s.year || ""}</td>
      <td>${s.roomNo || s.RoomNo || ""}</td>
      <td>${s.floorNo || ""}</td>
    </tr>`
    )
    .join("");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>RegNo</th><th>Name</th><th>Department</th><th>Year</th><th>Room</th><th>Floor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderAttendance(root) {
  const role = state.session.role;
  const canGenerate = role === "FACULTY" || role === "ADMIN";
  const canMark = role === "STUDENT" || role === "ADMIN";

  root.innerHTML = `
    ${canGenerate ? `
      <div class="panel-lite">
        <h3>Generate QR (Faculty/Admin)</h3>
        <button id="generateQrBtn">Generate Attendance QR</button>
        <div id="qrNotice"></div>
        <div id="generatedQrPreview" class="qr-preview">
          <p>Tap generate to show a new attendance QR.</p>
        </div>
        <textarea id="generatedQr" rows="3" readonly placeholder="Generated attendance payload appears here"></textarea>
      </div>
    ` : ""}

    ${canMark ? `
      <div class="panel-lite">
        <h3>Scan QR (Student/Admin)</h3>
        <div class="actions">
          <button id="scanQrBtn" type="button">Scan QR</button>
          <button id="stopScanBtn" type="button" class="ghost" disabled>Stop Camera</button>
        </div>
        <video id="scanVideo" class="scan-video" playsinline muted></video>
        <p class="scan-help">Allow camera permission, point to the admin QR, and attendance will be marked automatically.</p>
        <form id="markAttendanceForm" class="form-grid">
          <label>QR Data</label>
          <textarea name="qrData" required rows="3" placeholder="Paste scanned QR payload"></textarea>
          <button type="submit">Mark Attendance Manually</button>
        </form>
        <div id="markNotice"></div>
      </div>
    ` : ""}
  `;

  if (canGenerate) {
    const btn = document.getElementById("generateQrBtn");
    const notice = document.getElementById("qrNotice");
    const out = document.getElementById("generatedQr");
    const preview = document.getElementById("generatedQrPreview");

    btn.addEventListener("click", async () => {
      try {
        const qr = await api("/attendance/generate-qr");
        const qrData = String(qr?.qrData || (typeof qr === "string" ? qr : "")).trim();
        const qrImageDataUrl = String(qr?.qrImageDataUrl || "").trim();

        out.value = qrData || JSON.stringify(qr);

        if (qrImageDataUrl) {
          preview.innerHTML = `<img src="${qrImageDataUrl}" alt="Attendance QR code" />`;
        } else {
          preview.innerHTML = "<p>QR image is not available.</p>";
        }

        setNotice(notice, "QR generated successfully", "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  if (canMark) {
    const form = document.getElementById("markAttendanceForm");
    const notice = document.getElementById("markNotice");
    const scanBtn = document.getElementById("scanQrBtn");
    const stopBtn = document.getElementById("stopScanBtn");
    const video = document.getElementById("scanVideo");
    const qrDataInput = form.querySelector("textarea[name='qrData']");

    const markAttendanceFromPayload = async (payload) => {
      const qrData = String(payload || "").trim();
      if (!qrData) {
        setNotice(notice, "QR data is empty.", "error");
        return;
      }

      const result = await api("/attendance/mark", { method: "POST", body: { qrData } });
      const message = typeof result === "string" ? result : "Attendance marked";
      const isSuccess = /success|already marked/i.test(message);

      setNotice(notice, message, isSuccess ? "success" : "error");
    };

    const resetCameraButtons = () => {
      scanBtn.disabled = false;
      stopBtn.disabled = true;
      video.srcObject = null;
      video.style.display = "none";
    };

    scanBtn.addEventListener("click", async () => {
      try {
        scanBtn.disabled = true;
        stopBtn.disabled = false;
        video.style.display = "block";
        setNotice(notice, "Camera started. Scanning for QR...", "info");

        await startAttendanceScanner(video, async (decodedValue) => {
          qrDataInput.value = decodedValue;
          resetCameraButtons();
          await markAttendanceFromPayload(decodedValue);
        });
      } catch (err) {
        resetCameraButtons();
        stopAttendanceScanner();
        setNotice(notice, err.message || "Unable to start camera scanner.", "error");
      }
    });

    stopBtn.addEventListener("click", () => {
      stopAttendanceScanner();
      resetCameraButtons();
      setNotice(notice, "Camera stopped.", "info");
    });

    resetCameraButtons();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = String(new FormData(form).get("qrData") || "").trim();
        await markAttendanceFromPayload(payload);
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }
}

function renderCirculars(root) {
  const isAdmin = state.session.role === "ADMIN";

  root.innerHTML = `
    ${isAdmin ? `
      <form id="circularForm" class="form-grid">
        <h3>Publish Circular</h3>
        <label>Subject</label>
        <input name="subject" required />
        <label>Details</label>
        <textarea name="details" rows="3" required></textarea>
        <button type="submit">Publish</button>
      </form>
    ` : ""}
    <div id="circularNotice"></div>
    <div id="circularList"></div>
  `;

  const notice = document.getElementById("circularNotice");
  const list = document.getElementById("circularList");

  const load = async () => {
    try {
      const data = await api("/circular/all");
      list.innerHTML = renderCircularCards(data, isAdmin);

      if (isAdmin) {
        list.querySelectorAll("[data-delete]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            try {
              await api(`/circular/${btn.dataset.delete}`, { method: "DELETE" });
              setNotice(notice, "Circular deleted", "success");
              await load();
            } catch (err) {
              setNotice(notice, err.message, "error");
            }
          });
        });

        list.querySelectorAll("[data-edit]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.edit;
            const subject = prompt("Updated subject:");
            if (!subject) return;
            const details = prompt("Updated details:");
            if (!details) return;
            try {
              await api(`/circular/${id}`, {
                method: "PUT",
                body: { subject, details }
              });
              setNotice(notice, "Circular updated", "success");
              await load();
            } catch (err) {
              setNotice(notice, err.message, "error");
            }
          });
        });
      }
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  if (isAdmin) {
    const form = document.getElementById("circularForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/circular/publish", {
          method: "POST",
          body: {
            subject: String(fd.get("subject") || "").trim(),
            details: String(fd.get("details") || "").trim(),
            publishedBy: state.session.regNo
          }
        });
        form.reset();
        setNotice(notice, "Circular published", "success");
        await load();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  load();
}

function renderCircularCards(data, isAdmin) {
  if (!data.length) return "<p>No circulars available.</p>";
  return data
    .map(
      (c) => `
      <article class="stack-card">
        <h4>${c.subject || "No subject"}</h4>
        <p>${c.details || ""}</p>
        <small>${c.createdAt || ""}</small>
        ${isAdmin ? `<div class="actions"><button data-edit="${c.id}">Edit</button><button class="danger" data-delete="${c.id}">Delete</button></div>` : ""}
      </article>
    `
    )
    .join("");
}

function renderMenu(root) {
  const canEdit = state.session.role === "ADMIN" || state.session.role === "FACULTY";
  root.innerHTML = `
    ${canEdit ? `
      <form id="menuForm" class="form-grid">
        <h3>Add Menu</h3>
        <label>Day</label><input name="days" required />
        <label>Breakfast</label><input name="breakfast" required />
        <label>Lunch</label><input name="lunch" required />
        <label>Snacks</label><input name="snacks" required />
        <label>Dinner</label><input name="dinner" required />
        <button type="submit">Save Menu</button>
      </form>
    ` : ""}
    <div id="menuNotice"></div>
    <div id="menuTable"></div>
  `;

  const notice = document.getElementById("menuNotice");
  const tableRoot = document.getElementById("menuTable");

  const load = async () => {
    try {
      const rows = await api("/menu");
      tableRoot.innerHTML = menuTable(rows, canEdit);
      if (canEdit) {
        tableRoot.querySelectorAll("[data-update-menu]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const row = JSON.parse(btn.dataset.updateMenu);
            const breakfast = prompt("Breakfast", row.breakfast || "");
            const lunch = prompt("Lunch", row.lunch || "");
            const snacks = prompt("Snacks", row.snacks || "");
            const dinner = prompt("Dinner", row.dinner || "");
            if ([breakfast, lunch, snacks, dinner].some((x) => x === null)) return;
            try {
              await api(`/menu/${row.id}`, {
                method: "PUT",
                body: {
                  days: row.days,
                  breakfast,
                  lunch,
                  snacks,
                  dinner
                }
              });
              setNotice(notice, "Menu updated", "success");
              await load();
            } catch (err) {
              setNotice(notice, err.message, "error");
            }
          });
        });
      }
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  if (canEdit) {
    document.getElementById("menuForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api("/menu", {
          method: "POST",
          body: Object.fromEntries(fd.entries())
        });
        e.target.reset();
        setNotice(notice, "Menu added", "success");
        await load();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  load();
}

function menuTable(rows, canEdit) {
  if (!rows.length) return "<p>No menu entries available.</p>";
  const body = rows
    .map(
      (m) => `
      <tr>
        <td>${m.days || ""}</td>
        <td>${m.breakfast || ""}</td>
        <td>${m.lunch || ""}</td>
        <td>${m.snacks || ""}</td>
        <td>${m.dinner || ""}</td>
        <td>${canEdit ? `<button data-update-menu='${JSON.stringify(m).replace(/'/g, "&#39;")}'>Edit</button>` : "-"}</td>
      </tr>
    `
    )
    .join("");

  return `<div class="table-wrap"><table><thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snacks</th><th>Dinner</th><th>Action</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderComplaints(root) {
  const role = state.session.role;
  const studentId = state.session.regNo;

  root.innerHTML = `
    ${(role === "STUDENT" || role === "ADMIN") ? `
      <form id="complaintForm" class="form-grid">
        <h3>Post Complaint</h3>
        <label>Room Number</label><input name="roomNumber" required />
        <label>Category</label>
        <select name="category" required>
          <option value="GENERAL">GENERAL</option>
          <option value="PERSONAL">PERSONAL</option>
        </select>
        <label>Title</label><input name="title" required />
        <label>Description</label><textarea name="description" required rows="3"></textarea>
        <button type="submit">Submit Complaint</button>
      </form>
    ` : ""}

    <div class="actions">
      ${(role === "FACULTY" || role === "ADMIN") ? `<button id="loadAllComplaints">Load All Complaints</button>` : ""}
      <button id="loadMyComplaints">Load My Complaints</button>
    </div>
    <div id="complaintNotice"></div>
    <div id="complaintList"></div>
  `;

  const notice = document.getElementById("complaintNotice");
  const list = document.getElementById("complaintList");

  const loadByStudent = async () => {
    try {
      const rows = await api(`/complaint/student/${studentId}`);
      list.innerHTML = complaintCards(rows, role === "FACULTY" || role === "ADMIN");
      bindComplaintActions();
      setNotice(notice, `Loaded ${rows.length} complaint(s)`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadAll = async () => {
    try {
      const rows = await api("/complaint");
      list.innerHTML = complaintCards(rows, true);
      bindComplaintActions();
      setNotice(notice, `Loaded ${rows.length} complaint(s)`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  function bindComplaintActions() {
    list.querySelectorAll("[data-status-id]").forEach((el) => {
      el.addEventListener("change", async () => {
        try {
          await api(`/complaint/${el.dataset.statusId}/status?status=${el.value}`, { method: "PATCH" });
          setNotice(notice, "Status updated", "success");
        } catch (err) {
          setNotice(notice, err.message, "error");
        }
      });
    });
  }

  const mineBtn = document.getElementById("loadMyComplaints");
  mineBtn.addEventListener("click", loadByStudent);

  const allBtn = document.getElementById("loadAllComplaints");
  if (allBtn) allBtn.addEventListener("click", loadAll);

  const form = document.getElementById("complaintForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      body.studentId = studentId;
      try {
        await api("/complaint", { method: "POST", body });
        form.reset();
        setNotice(notice, "Complaint submitted", "success");
        await loadByStudent();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }
}

function complaintCards(rows, canUpdate) {
  if (!rows.length) return "<p>No complaints available.</p>";
  return rows
    .map(
      (c) => `
      <article class="stack-card">
        <h4>${c.title || "Complaint"} ${c.emergency || c.isEmergency ? "<span class=\"badge danger\">Emergency</span>" : ""}</h4>
        <p>${c.description || ""}</p>
        <small>Student: ${c.studentId || "-"} | Room: ${c.roomNumber || "-"} | Status: ${c.status || "-"}</small>
        ${canUpdate ? `
          <label>Update Status</label>
          <select data-status-id="${c.id}">
            <option ${c.status === "PENDING" ? "selected" : ""} value="PENDING">PENDING</option>
            <option ${c.status === "IN_PROGRESS" ? "selected" : ""} value="IN_PROGRESS">IN_PROGRESS</option>
            <option ${c.status === "RESOLVED" ? "selected" : ""} value="RESOLVED">RESOLVED</option>
          </select>
        ` : ""}
      </article>
    `
    )
    .join("");
}

function renderOutpass(root) {
  const role = state.session.role;
  const regNo = state.session.regNo;

  root.innerHTML = `
    ${(role === "STUDENT" || role === "ADMIN") ? `
      <form id="outpassForm" class="form-grid">
        <h3>Submit Outpass</h3>
        <label>Out Date</label><input type="date" name="outDate" required />
        <label>Out Time</label><input type="time" name="outTime" required />
        <label>Return Date</label><input type="date" name="returnDate" required />
        <label>Return Time</label><input type="time" name="returnTime" required />
        <label>Reason</label><textarea name="reason" rows="3" required></textarea>
        <button type="submit">Submit Outpass</button>
      </form>
    ` : ""}

    <div class="actions">
      <button id="loadMyOutpass">My Outpass History</button>
      ${(role === "FACULTY" || role === "ADMIN") ? `
        <input id="floorNoInput" placeholder="Floor no" />
        <button id="loadPendingFloor">Pending by Floor</button>
        <button id="loadAllFloor">All by Floor</button>
      ` : ""}
      ${role === "ADMIN" ? `<button id="loadAllOutpass">All Outpasses</button>` : ""}
    </div>

    <div id="outpassNotice"></div>
    <div id="outpassList"></div>
  `;

  const notice = document.getElementById("outpassNotice");
  const list = document.getElementById("outpassList");

  const renderList = (rows, canApprove) => {
    if (!rows.length) {
      list.innerHTML = "<p>No outpass entries found.</p>";
      return;
    }

    list.innerHTML = rows
      .map(
        (o) => `
        <article class="stack-card">
          <h4>${o.studentName || "Student"} (${o.regNo || ""})</h4>
          <p>Reason: ${o.reason || "-"}</p>
          <small>Floor: ${o.floorNo || "-"} | Room: ${o.roomNo || "-"} | Status: ${o.status || "-"}</small>
          ${canApprove && o.status === "PENDING" ? `
            <div class="actions">
              <button data-approve-id="${o.id}">Approve</button>
              <button class="danger" data-deny-id="${o.id}">Deny</button>
            </div>
          ` : ""}
        </article>
      `
      )
      .join("");

    if (canApprove) {
      list.querySelectorAll("[data-approve-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/outpass/${btn.dataset.approveId}/approve`, { method: "PATCH" });
            setNotice(notice, "Outpass approved", "success");
          } catch (err) {
            setNotice(notice, err.message, "error");
          }
        });
      });

      list.querySelectorAll("[data-deny-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const reason = prompt("Reason for denial (optional):") || "";
          try {
            await api(`/outpass/${btn.dataset.denyId}/deny?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
            setNotice(notice, "Outpass denied", "success");
          } catch (err) {
            setNotice(notice, err.message, "error");
          }
        });
      });
    }
  };

  document.getElementById("loadMyOutpass").addEventListener("click", async () => {
    try {
      const rows = await api(`/outpass/my/${regNo}`);
      renderList(rows, false);
      setNotice(notice, `Loaded ${rows.length} entries`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  });

  const pendingBtn = document.getElementById("loadPendingFloor");
  const floorInput = document.getElementById("floorNoInput");
  if (pendingBtn) {
    pendingBtn.addEventListener("click", async () => {
      const floor = String(floorInput.value || "").trim();
      if (!floor) {
        setNotice(notice, "Enter floor number", "error");
        return;
      }
      try {
        const rows = await api(`/outpass/floor/${encodeURIComponent(floor)}/pending`);
        renderList(rows, true);
        setNotice(notice, `Loaded ${rows.length} pending requests`, "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  const allFloorBtn = document.getElementById("loadAllFloor");
  if (allFloorBtn) {
    allFloorBtn.addEventListener("click", async () => {
      const floor = String(floorInput.value || "").trim();
      if (!floor) {
        setNotice(notice, "Enter floor number", "error");
        return;
      }
      try {
        const rows = await api(`/outpass/floor/${encodeURIComponent(floor)}/all`);
        renderList(rows, true);
        setNotice(notice, `Loaded ${rows.length} requests`, "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  const allOutBtn = document.getElementById("loadAllOutpass");
  if (allOutBtn) {
    allOutBtn.addEventListener("click", async () => {
      try {
        const rows = await api("/outpass/all");
        renderList(rows, false);
        setNotice(notice, `Loaded ${rows.length} total requests`, "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  const form = document.getElementById("outpassForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      body.regNo = regNo;
      try {
        await api("/outpass/submit", { method: "POST", body });
        form.reset();
        setNotice(notice, "Outpass submitted", "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }
}

function renderFeedback(root) {
  const role = state.session.role;

  root.innerHTML = `
    ${(role === "STUDENT" || role === "ADMIN") ? `
      <form id="feedbackForm" class="form-grid" enctype="multipart/form-data">
        <h3>Submit Food Feedback</h3>
        <label>Rating (1-5)</label>
        <input type="number" min="1" max="5" name="rating" required />
        <label>Message</label>
        <textarea name="message" required rows="3"></textarea>
        <label>Image</label>
        <input type="file" name="image" accept="image/*" required />
        <button type="submit">Submit Feedback</button>
      </form>
    ` : ""}

    ${(role === "FACULTY" || role === "ADMIN") ? `<button id="loadFeedbackBtn">Load Feedback</button>` : ""}
    <div id="feedbackNotice"></div>
    <div id="feedbackList"></div>
  `;

  const notice = document.getElementById("feedbackNotice");
  const list = document.getElementById("feedbackList");

  const loadFeedback = async () => {
    try {
      const rows = await api("/food_feedback/all");
      if (!rows.length) {
        list.innerHTML = "<p>No feedback entries found.</p>";
        return;
      }

      list.innerHTML = rows
        .map(
          (f) => `
          <article class="stack-card">
            <h4>${f.studentName || "Student"} (${f.regNo || ""})</h4>
            <p>Rating: ${f.rating || "-"}</p>
            <p>${f.message || ""}</p>
            ${f.imageName ? `<img class="preview" src="/uploads/feedback-images/${f.imageName}" alt="Feedback image" />` : ""}
          </article>
        `
        )
        .join("");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadBtn = document.getElementById("loadFeedbackBtn");
  if (loadBtn) {
    loadBtn.addEventListener("click", loadFeedback);
  }

  const form = document.getElementById("feedbackForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/food_feedback/submit", { method: "POST", formData: fd });
        form.reset();
        setNotice(notice, "Feedback submitted", "success");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }
}

function renderGym(root) {
  const role = state.session.role;
  root.innerHTML = `
    <div class="actions">
      <button id="gymStatusBtn">Check Gym Status</button>
      <button id="gymScanBtn">Scan Gym QR</button>
      <button id="gymStopScanBtn" class="ghost" disabled>Stop Camera</button>
    </div>
    <video id="gymScanVideo" class="scan-video" playsinline muted></video>
    <p class="scan-help">Point the camera to Gym QR. After scan, key status updates automatically.</p>
    ${role === "ADMIN" ? `
      <form id="gymAdminForm" class="form-grid">
        <label>Student ID</label><input name="studentId" required />
        <label>Student Name</label><input name="studentName" required />
        <label>Room Number</label><input name="roomNo" required />
        <label>Mobile Number</label><input name="mobileNo" required />
      </form>
    ` : ""}
    <div id="gymNotice"></div>
  `;

  const notice = document.getElementById("gymNotice");
  const form = document.getElementById("gymAdminForm");
  const scanBtn = document.getElementById("gymScanBtn");
  const stopBtn = document.getElementById("gymStopScanBtn");
  const video = document.getElementById("gymScanVideo");

  const resetCameraButtons = () => {
    scanBtn.disabled = false;
    stopBtn.disabled = true;
    video.srcObject = null;
    video.style.display = "none";
  };

  document.getElementById("gymStatusBtn").addEventListener("click", async () => {
    try {
      const status = await api("/gym/status");
      setNotice(notice, typeof status === "string" ? status : JSON.stringify(status), "info");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  });

  scanBtn.addEventListener("click", async () => {
    try {
      scanBtn.disabled = true;
      stopBtn.disabled = false;
      video.style.display = "block";
      setNotice(notice, "Camera started. Scanning Gym QR...", "info");

      await startAttendanceScanner(video, async () => {
        resetCameraButtons();

        let path = "/gym/scan";
        if (role === "ADMIN" && form) {
          const fd = new FormData(form);
          const params = new URLSearchParams(fd);
          path += `?${params.toString()}`;
        }
        const msg = await api(path, { method: "POST" });
        setNotice(notice, typeof msg === "string" ? msg : "Gym action completed", "success");
      });
    } catch (err) {
      resetCameraButtons();
      stopAttendanceScanner();
      setNotice(notice, err.message || "Unable to start camera scanner.", "error");
    }
  });

  stopBtn.addEventListener("click", () => {
    stopAttendanceScanner();
    resetCameraButtons();
    setNotice(notice, "Camera stopped.", "info");
  });

  resetCameraButtons();
}

function renderIndoor(root) {
  const role = state.session.role;
  root.innerHTML = `
    <div class="actions">
      <button id="indoorStatusBtn">Check Indoor Court Status</button>
      <button id="indoorScanBtn">Scan Indoor Court QR</button>
      <button id="indoorStopScanBtn" class="ghost" disabled>Stop Camera</button>
    </div>
    <video id="indoorScanVideo" class="scan-video" playsinline muted></video>
    <p class="scan-help">Point the camera to Indoor Court QR. After scan, key status updates automatically.</p>
    ${role === "ADMIN" ? `
      <form id="indoorAdminForm" class="form-grid">
        <label>Student ID</label><input name="studentId" required />
        <label>Student Name</label><input name="studentName" required />
        <label>Room Number</label><input name="roomNo" required />
        <label>Mobile Number</label><input name="mobileNo" required />
      </form>
    ` : ""}
    <div id="indoorNotice"></div>
  `;

  const notice = document.getElementById("indoorNotice");
  const form = document.getElementById("indoorAdminForm");
  const scanBtn = document.getElementById("indoorScanBtn");
  const stopBtn = document.getElementById("indoorStopScanBtn");
  const video = document.getElementById("indoorScanVideo");

  const resetCameraButtons = () => {
    scanBtn.disabled = false;
    stopBtn.disabled = true;
    video.srcObject = null;
    video.style.display = "none";
  };

  document.getElementById("indoorStatusBtn").addEventListener("click", async () => {
    try {
      const status = await api("/indoor-court/status");
      setNotice(notice, typeof status === "string" ? status : JSON.stringify(status), "info");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  });

  scanBtn.addEventListener("click", async () => {
    try {
      scanBtn.disabled = true;
      stopBtn.disabled = false;
      video.style.display = "block";
      setNotice(notice, "Camera started. Scanning Indoor Court QR...", "info");

      await startAttendanceScanner(video, async () => {
        resetCameraButtons();

        let path = "/indoor-court/scan";
        if (role === "ADMIN" && form) {
          const fd = new FormData(form);
          const params = new URLSearchParams(fd);
          path += `?${params.toString()}`;
        }
        const msg = await api(path, { method: "POST" });
        setNotice(notice, typeof msg === "string" ? msg : "Indoor court action completed", "success");
      });
    } catch (err) {
      resetCameraButtons();
      stopAttendanceScanner();
      setNotice(notice, err.message || "Unable to start camera scanner.", "error");
    }
  });

  stopBtn.addEventListener("click", () => {
    stopAttendanceScanner();
    resetCameraButtons();
    setNotice(notice, "Camera stopped.", "info");
  });

  resetCameraButtons();
}

const reactRoot = ReactDOM.createRoot(appRoot);
reactRoot.render(<App />);
