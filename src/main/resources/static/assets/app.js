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

function formatDateTimeParts(value) {
  if (!value) {
    return { date: "-", time: "-", display: "No previous login record" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "-", time: "-", display: String(value) };
  }

  const date = parsed.toLocaleDateString();
  const time = parsed.toLocaleTimeString();
  return { date, time, display: `${date} ${time}` };
}

const attendanceScannerState = {
  stream: null,
  rafId: null,
  active: false,
  decodeInFlight: false,
  lastDecodeAt: 0
};

const featureIntervals = [];

function registerFeatureInterval(id) {
  featureIntervals.push(id);
}

function clearFeatureIntervals() {
  while (featureIntervals.length) {
    const id = featureIntervals.pop();
    clearInterval(id);
  }
}

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
    student: res.student || null,
    faculty: res.faculty || null,
    previousLoginAt: res.previousLoginAt || null
  };

  if (session.role === "STUDENT" && !session.student) {
    session.student = await api("/students/me", {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    });
  }

  if (session.role === "FACULTY" && !session.faculty) {
    session.faculty = await api("/faculty/me", {
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
  clearFeatureIntervals();

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
  const { role, regNo, student, faculty, previousLoginAt } = state.session;

  if (role === "ADMIN") {
    const previousLogin = formatDateTimeParts(previousLoginAt);

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
              <strong>ADMIN</strong>
              <p>${regNo}</p>
            </div>
          </div>
        </header>

        <section class="dashboard-main">
          <article class="dashboard-identity">
            <img src="${DEFAULT_PROFILE_ICON}" alt="Default profile" />
            <div class="dashboard-identity-text">
              <h4>ADMIN</h4>
              <p>ADMIN ACCESS</p>
              <span>${regNo}</span>
            </div>
          </article>

          <article class="dashboard-profile-panel">
            <h3>Login Data</h3>
            <div class="dashboard-profile-list">
              ${profileLine("Name", "ADMIN")}
              ${profileLine("Previous Login Date", previousLogin.date)}
              ${profileLine("Previous Login Time", previousLogin.time)}
            </div>
          </article>
        </section>
      </div>
    `;
    return;
  }

  if (role === "FACULTY") {
    const facultyName = faculty?.name || "Faculty";
    const facultyRoom = faculty?.roomNo || faculty?.RoomNo || "-";
    const facultyFloor = faculty?.floorNo || "-";
    const floorInchargeOf = faculty?.floorInchargeOf || faculty?.floorincharge || "-";

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
              <strong>${facultyName.toUpperCase()}</strong>
              <p>${regNo}</p>
            </div>
          </div>
        </header>

        <section class="dashboard-main">
          <article class="dashboard-identity">
            <img src="${DEFAULT_PROFILE_ICON}" alt="Default profile" />
            <div class="dashboard-identity-text">
              <h4>${facultyName.toUpperCase()}</h4>
              <p>FACULTY ACCESS</p>
              <span>${regNo}</span>
            </div>
          </article>

          <article class="dashboard-profile-panel">
            <h3>Faculty Profile</h3>
            <div class="dashboard-profile-list">
              ${profileLine("Name", facultyName)}
              ${profileLine("Room", facultyRoom)}
              ${profileLine("Floor", facultyFloor)}
              ${profileLine("Floor Incharge Of", floorInchargeOf)}
            </div>
          </article>
        </section>
      </div>
    `;
    return;
  }

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
  const role = state.session.role;
  const endpoint = role === "FACULTY" ? "/students/floor/mine" : "/students";
  const buttonLabel = role === "FACULTY" ? "Load Floor Students" : "Load All Students";

  root.innerHTML = `
    <div class="actions">
      <button id="loadStudentsBtn">${buttonLabel}</button>
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
      const students = await api(endpoint);
      setNotice(notice, `Loaded ${students.length} students`, "success");
      tableRoot.innerHTML = tableFromStudents(students, role);
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  });
}

function tableFromStudents(students, role) {
  if (!students.length) return "<p>No students found.</p>";

  if (role === "ADMIN" || role === "FACULTY") {
    const rows = students
      .map(
        (s) => `<tr>
      <td>${s.name || ""}</td>
      <td>${s.department || ""}</td>
      <td>${s.year || ""}</td>
      <td>${s.roomNo || s.RoomNo || ""}</td>
      <td>${s.roomType || s.RoomType || ""}</td>
    </tr>`
      )
      .join("");

    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>Year</th><th>Room No</th><th>Room Type</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

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
  const canGenerate = role === "FACULTY";
  const canMark = role === "STUDENT";
  const canViewSummary = role === "ADMIN" || role === "FACULTY";
  const summaryEndpoint = role === "ADMIN" ? "/attendance/daily/admin" : "/attendance/daily/faculty";

  root.innerHTML = `
    ${canGenerate ? `
      <div class="panel-lite">
        <h3>Generate QR (Faculty)</h3>
        <button id="generateQrBtn">Generate Attendance QR</button>
        <div id="qrNotice"></div>
        <div id="generatedQrPreview" class="qr-preview">
          <p>Tap generate to show a new attendance QR.</p>
        </div>
        <textarea id="generatedQr" rows="3" readonly placeholder="Generated attendance payload appears here"></textarea>
      </div>
    ` : ""}

    ${canViewSummary ? `
      <div class="panel-lite">
        <div class="actions">
          <button id="loadAttendanceSummaryBtn">Load Today's Attendance</button>
        </div>
        <div id="attendanceSummaryNotice"></div>
        <div id="attendanceSummaryContent"></div>
      </div>
    ` : ""}

    ${canMark ? `
      <div class="panel-lite">
        <h3>Scan QR (Student)</h3>
        <div class="actions">
          <button id="scanQrBtn" type="button">Scan QR</button>
          <button id="stopScanBtn" type="button" class="ghost" disabled>Stop Camera</button>
        </div>
        <video id="scanVideo" class="scan-video" playsinline muted></video>
        <p class="scan-help">Allow camera permission, point to the faculty QR, and attendance will be marked automatically.</p>
        <form id="markAttendanceForm" class="form-grid">
          <label>QR Data</label>
          <textarea name="qrData" required rows="3" placeholder="Paste scanned QR payload"></textarea>
          <button type="submit">Mark Attendance Manually</button>
        </form>
        <div id="markNotice"></div>
      </div>
    ` : ""}
  `;

  if (canViewSummary) {
    const summaryBtn = document.getElementById("loadAttendanceSummaryBtn");
    const summaryNotice = document.getElementById("attendanceSummaryNotice");
    const summaryContent = document.getElementById("attendanceSummaryContent");

    const loadSummary = async () => {
      try {
        setNotice(summaryNotice, "Loading today's attendance...", "info");
        const summary = await api(summaryEndpoint);
        summaryContent.innerHTML = attendanceSummaryMarkup(summary, role);
        setNotice(summaryNotice, `Loaded ${summary?.totalStudents || 0} students`, "success");
      } catch (err) {
        setNotice(summaryNotice, err.message, "error");
      }
    };

    summaryBtn.addEventListener("click", loadSummary);
    loadSummary();
  }

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

function attendanceSummaryMarkup(summary, role) {
  const students = Array.isArray(summary?.students) ? summary.students : [];
  const present = Number(summary?.presentCount || 0);
  const absent = Number(summary?.absentCount || 0);
  const total = Number(summary?.totalStudents || students.length || 0);
  const presentAngle = total > 0 ? Math.round((present / total) * 360) : 0;
  const showFloor = role === "ADMIN";

  const rows = students
    .map(
      (s) => `<tr>
        <td>${s.name || ""}</td>
        <td>${s.roomNo || ""}</td>
        <td>${s.roomType || ""}</td>
        ${showFloor ? `<td>${s.floorNo || ""}</td>` : ""}
        <td><span class="attendance-status ${String(s.attendance || "").toLowerCase()}">${s.attendance || ""}</span></td>
      </tr>`
    )
    .join("");

  return `
    <div class="attendance-summary-wrap">
      <div class="attendance-summary-top">
        <div class="attendance-pie" style="--present-angle:${presentAngle}deg"></div>
        <div class="attendance-summary-meta">
          <p><strong>Date:</strong> ${summary?.date || "-"}</p>
          <p><strong>Total Students:</strong> ${total}</p>
          <p><strong>Present:</strong> ${present}</p>
          <p><strong>Absent:</strong> ${absent}</p>
        </div>
      </div>
      <div class="attendance-legend">
        <span><i class="dot present"></i>Present</span>
        <span><i class="dot absent"></i>Absent</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Room</th>
              <th>Room Type</th>
              ${showFloor ? "<th>Floor No</th>" : ""}
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCirculars(root) {
  const role = state.session.role;
  const canPublish = role === "ADMIN" || role === "FACULTY";
  const isAdmin = role === "ADMIN";
  const publishNote =
    role === "FACULTY"
      ? "This circular will be sent only to your floor students."
      : "This circular will be sent to all hostel students.";

  root.innerHTML = `
    ${canPublish ? `
      <form id="circularForm" class="form-grid">
        <h3>Publish Circular</h3>
        <p class="scan-help">${publishNote}</p>
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

  if (canPublish) {
    const form = document.getElementById("circularForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/circular/publish", {
          method: "POST",
          body: {
            subject: String(fd.get("subject") || "").trim(),
            details: String(fd.get("details") || "").trim()
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
    .map((c) => {
      const postedByRole = String(c.postedByRole || "ADMIN").toUpperCase();
      const isFacultyPost = postedByRole === "FACULTY";
      const roleText = isFacultyPost ? "Posted by Floor Incharge" : "Posted by Admin";
      const roleClass = isFacultyPost ? "circular-faculty" : "circular-admin";
      const floorText = isFacultyPost && c.targetFloorNo ? ` | Floor: ${c.targetFloorNo}` : "";

      return `
      <article class="stack-card ${roleClass}">
        <h4>${c.subject || "No subject"}</h4>
        <p>${c.details || ""}</p>
        <small>${roleText}${floorText} | ${c.createdAt || ""}</small>
        ${isAdmin ? `<div class="actions"><button data-edit="${c.id}">Edit</button><button class="danger" data-delete="${c.id}">Delete</button></div>` : ""}
      </article>
    `;
    })
    .join("");
}

const WEEKDAY_ORDER = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
};

function normalizeDayKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function sortMenusWeekly(rows) {
  return [...rows].sort((a, b) => {
    const aDay = normalizeDayKey(a.days);
    const bDay = normalizeDayKey(b.days);
    const aOrder = WEEKDAY_ORDER[aDay];
    const bOrder = WEEKDAY_ORDER[bDay];

    if (aOrder && bOrder) return aOrder - bOrder;
    if (aOrder) return -1;
    if (bOrder) return 1;
    return String(a.days || "").localeCompare(String(b.days || ""));
  });
}

function isTodayMenuDay(dayValue) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return normalizeDayKey(dayValue) === normalizeDayKey(today);
}

function localIsoDateToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderMenu(root) {
  const role = state.session.role;
  const canEdit = role === "ADMIN";
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
  const body = sortMenusWeekly(rows)
    .map(
      (m) => `
      <tr class="${isTodayMenuDay(m.days) ? "menu-today" : ""}">
        <td>${m.days || ""}</td>
        <td>${m.breakfast || ""}</td>
        <td>${m.lunch || ""}</td>
        <td>${m.snacks || ""}</td>
        <td>${m.dinner || ""}</td>
        ${canEdit ? `<td><button data-update-menu='${JSON.stringify(m).replace(/'/g, "&#39;")}'>Edit</button></td>` : ""}
      </tr>
    `
    )
    .join("");

  return `<div class="table-wrap"><table><thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snacks</th><th>Dinner</th>${canEdit ? "<th>Action</th>" : ""}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderComplaints(root) {
  const role = state.session.role;
  const regNo = state.session.regNo;
  const canUpdate = role === "FACULTY" || role === "ADMIN";
  const endpoint =
    role === "FACULTY" ? "/complaint/faculty/mine" : role === "ADMIN" ? "/complaint" : "/complaint/student/feed";

  root.innerHTML = `
    ${role === "STUDENT" ? `
      <form id="complaintForm" class="form-grid">
        <h3>Post Complaint</h3>
        <label>Room Number</label><input name="roomNumber" required />
        <label>Type</label>
        <select name="category" required>
          <option value="PERSONAL">PERSONAL</option>
          <option value="PUBLIC">PUBLIC</option>
        </select>
        <label>Title</label><input name="title" required />
        <label>Description</label><textarea name="description" required rows="3"></textarea>
        <button type="submit">Submit Complaint</button>
      </form>
    ` : ""}

    ${canUpdate ? `
      <div class="panel-lite">
        <div id="complaintSummary"></div>
      </div>
    ` : ""}

    <div class="actions">
      <button id="loadComplaintsBtn">${canUpdate ? "Load Complaints" : "Load My Complaints"}</button>
    </div>
    <div id="complaintNotice"></div>
    <div id="complaintList"></div>
  `;

  const notice = document.getElementById("complaintNotice");
  const list = document.getElementById("complaintList");
  const summary = document.getElementById("complaintSummary");

  const loadComplaints = async () => {
    try {
      const rows = await api(endpoint);
      list.innerHTML = complaintCards(rows, canUpdate, role, regNo);
      if (summary) {
        summary.innerHTML = complaintSummaryMarkup(rows);
      }
      bindComplaintActions();
      bindComplaintDeleteActions();
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

  function bindComplaintDeleteActions() {
    list.querySelectorAll("[data-delete-complaint-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/complaint/${btn.dataset.deleteComplaintId}/student-delete`, { method: "DELETE" });
          setNotice(notice, "Complaint deleted", "success");
          await loadComplaints();
        } catch (err) {
          setNotice(notice, err.message, "error");
        }
      });
    });
  }

  const loadBtn = document.getElementById("loadComplaintsBtn");
  loadBtn.addEventListener("click", loadComplaints);

  const form = document.getElementById("complaintForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      body.studentId = regNo;
      try {
        await api("/complaint", { method: "POST", body });
        form.reset();
        setNotice(notice, "Complaint submitted", "success");
        await loadComplaints();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  loadComplaints();
}

function complaintSummaryMarkup(rows) {
  const today = localIsoDateToday();
  const todayRows = rows.filter((row) => String(row.createdAt || "").slice(0, 10) === today);

  const pending = todayRows.filter((row) => row.status === "PENDING").length;
  const inProgress = todayRows.filter((row) => row.status === "IN_PROGRESS").length;
  const resolved = todayRows.filter((row) => row.status === "RESOLVED").length;
  const total = pending + inProgress + resolved;

  const pendingAngle = total > 0 ? Math.round((pending / total) * 360) : 0;
  const progressAngle = total > 0 ? Math.round((inProgress / total) * 360) : 0;

  return `
    <div class="attendance-summary-top">
      <div class="complaint-pie" style="--pending-angle:${pendingAngle}deg;--progress-angle:${progressAngle}deg"></div>
      <div class="attendance-summary-meta">
        <p><strong>Today's Complaints:</strong> ${total}</p>
        <p><strong>Pending:</strong> ${pending}</p>
        <p><strong>In Progress:</strong> ${inProgress}</p>
        <p><strong>Resolved:</strong> ${resolved}</p>
      </div>
    </div>
    <div class="attendance-legend">
      <span><i class="dot complaint-pending"></i>Pending</span>
      <span><i class="dot complaint-progress"></i>In Progress</span>
      <span><i class="dot complaint-resolved"></i>Resolved</span>
    </div>
  `;
}

function complaintCards(rows, canUpdate, role, regNo) {
  if (!rows.length) return "<p>No complaints available.</p>";
  return rows
    .map((c) => {
      const isPublic = complaintIsPublic(c);
      const canFacultyUpdate = canUpdate && !(role === "FACULTY" && isPublic);
      const isStudentOwner = role === "STUDENT" && String(c.studentId || "").toLowerCase() === String(regNo || "").toLowerCase();
      const canDeletePublic = isStudentOwner && isPublic && complaintWithinDays(c, 3);
      const publicBadge = isPublic ? `<span class="badge complaint-public-badge">PUBLIC</span>` : `<span class="badge">PERSONAL</span>`;
      const publicClass = role === "ADMIN" && isPublic ? "complaint-public-card" : "";

      return `
      <article class="stack-card ${publicClass}">
        <h4>${c.title || "Complaint"} ${publicBadge} ${c.emergency || c.isEmergency ? "<span class=\"badge danger\">Emergency</span>" : ""}</h4>
        <p>${c.description || ""}</p>
        <small>Student: ${c.studentId || "-"} | Room: ${c.roomNumber || "-"} | Status: ${c.status || "-"}</small>
        ${canFacultyUpdate ? `
          <label>Update Status</label>
          <select data-status-id="${c.id}">
            <option ${c.status === "PENDING" ? "selected" : ""} value="PENDING">PENDING</option>
            <option ${c.status === "IN_PROGRESS" ? "selected" : ""} value="IN_PROGRESS">IN_PROGRESS</option>
            <option ${c.status === "RESOLVED" ? "selected" : ""} value="RESOLVED">RESOLVED</option>
          </select>
        ` : ""}
        ${canDeletePublic ? `<div class="actions"><button class="danger" data-delete-complaint-id="${c.id}">Delete</button></div>` : ""}
      </article>
    `;
    })
    .join("");
}

function complaintIsPublic(complaint) {
  const category = String(complaint?.category || "").toUpperCase();
  return category === "PUBLIC" || category === "GENERAL";
}

function complaintWithinDays(complaint, days) {
  const created = complaint?.createdAt ? new Date(complaint.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) return false;
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return created.getTime() >= threshold;
}

function renderOutpass(root) {
  const role = state.session.role;
  const regNo = state.session.regNo;
  const isStudent = role === "STUDENT";
  const isFaculty = role === "FACULTY";
  const isAdmin = role === "ADMIN";

  root.innerHTML = `
    ${isStudent ? `
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

    ${isAdmin ? `
      <div class="panel-lite">
        <div id="outpassSummary"></div>
      </div>
    ` : ""}

    <div class="actions">
      ${isStudent ? `<button id="loadMyOutpass">My Outpass History</button>` : ""}
      ${isFaculty ? `
        <button id="loadPendingFloor">Pending Requests (My Floor)</button>
        <button id="loadAllFloor">All Requests (My Floor)</button>
      ` : ""}
      ${isAdmin ? `<button id="loadAllOutpass">All Outpasses</button>` : ""}
    </div>

    <div id="outpassNotice"></div>
    <div id="outpassList"></div>
  `;

  const notice = document.getElementById("outpassNotice");
  const list = document.getElementById("outpassList");
  const summaryRoot = document.getElementById("outpassSummary");
  let currentLoader = null;

  const renderList = (rows, canApprove, mode) => {
    if (!rows.length) {
      list.innerHTML = "<p>No outpass entries found.</p>";
      if (isAdmin && summaryRoot) {
        summaryRoot.innerHTML = outpassSummaryMarkup([]);
      }
      return;
    }

    if (isAdmin && summaryRoot) {
      summaryRoot.innerHTML = outpassSummaryMarkup(rows);
    }

    list.innerHTML = rows
      .map((o) => {
        if (mode === "student-history") {
          return `
        <article class="stack-card">
          <h4>${o.studentName || "Student"} (${o.regNo || ""})</h4>
          <p>Reason: ${o.reason || "-"}</p>
          <small>Out: ${o.outDate || "-"} ${o.outTime || "-"}</small>
          <small>Return: ${o.returnDate || "-"} ${o.returnTime || "-"}</small>
          <small>Status: ${formatOutpassStatus(o.status)}</small>
        </article>
      `;
        }

        if (mode === "admin-all") {
          return `
        <article class="stack-card">
          <h4>${o.studentName || "Student"} (${o.regNo || ""})</h4>
          <small>Out: ${o.outDate || "-"} ${o.outTime || "-"}</small>
          <small>Return: ${o.returnDate || "-"} ${o.returnTime || "-"}</small>
          <small>Status: ${formatOutpassStatus(o.status)}</small>
        </article>
      `;
        }

        return `
        <article class="stack-card">
          <h4>${o.studentName || "Student"} (${o.regNo || ""})</h4>
          <p>Reason: ${o.reason || "-"}</p>
          <small>Out: ${o.outDate || "-"} ${o.outTime || "-"}</small>
          <small>Return: ${o.returnDate || "-"} ${o.returnTime || "-"}</small>
          <small>Floor: ${o.floorNo || "-"} | Room: ${o.roomNo || "-"} | Status: ${formatOutpassStatus(o.status)}</small>
          ${canApprove && o.status === "PENDING" ? `
            <div class="actions">
              <button data-approve-id="${o.id}">Approve</button>
              <button class="danger" data-deny-id="${o.id}">Deny</button>
            </div>
          ` : ""}
        </article>
      `;
      })
      .join("");

    if (canApprove) {
      list.querySelectorAll("[data-approve-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/outpass/${btn.dataset.approveId}/approve`, { method: "PATCH" });
            setNotice(notice, "Outpass approved", "success");
            if (currentLoader) await currentLoader();
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
            if (currentLoader) await currentLoader();
          } catch (err) {
            setNotice(notice, err.message, "error");
          }
        });
      });
    }
  };

  const loadStudentHistory = async () => {
    try {
      const rows = await api(`/outpass/my/${regNo}`);
      renderList(rows, false, "student-history");
      setNotice(notice, `Loaded ${rows.length} entries`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadFacultyPending = async () => {
    try {
      const rows = await api("/outpass/faculty/mine/pending");
      renderList(rows, true, "faculty");
      setNotice(notice, `Loaded ${rows.length} pending requests`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadFacultyAll = async () => {
    try {
      const rows = await api("/outpass/faculty/mine/all");
      renderList(rows, true, "faculty");
      setNotice(notice, `Loaded ${rows.length} requests`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadAdminAll = async () => {
    try {
      const rows = await api("/outpass/all");
      renderList(rows, false, "admin-all");
      setNotice(notice, `Loaded ${rows.length} total requests`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const myOutpassBtn = document.getElementById("loadMyOutpass");
  if (myOutpassBtn) {
    myOutpassBtn.addEventListener("click", async () => {
      currentLoader = loadStudentHistory;
      await loadStudentHistory();
    });
  }

  const pendingBtn = document.getElementById("loadPendingFloor");
  if (pendingBtn) {
    pendingBtn.addEventListener("click", async () => {
      currentLoader = loadFacultyPending;
      await loadFacultyPending();
    });
  }

  const allFloorBtn = document.getElementById("loadAllFloor");
  if (allFloorBtn) {
    allFloorBtn.addEventListener("click", async () => {
      currentLoader = loadFacultyAll;
      await loadFacultyAll();
    });
  }

  const allOutBtn = document.getElementById("loadAllOutpass");
  if (allOutBtn) {
    allOutBtn.addEventListener("click", async () => {
      currentLoader = loadAdminAll;
      await loadAdminAll();
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

  if (isFaculty) {
    currentLoader = loadFacultyPending;
    loadFacultyPending();
  } else if (isAdmin) {
    currentLoader = loadAdminAll;
    loadAdminAll();
  } else {
    currentLoader = loadStudentHistory;
    loadStudentHistory();
  }
}

function outpassSummaryMarkup(rows) {
  const today = localIsoDateToday();
  const todayRows = rows.filter((row) => String(row.outDate || "") === today);
  const approved = todayRows.filter((row) => row.status === "APPROVED").length;
  const notApproved = Math.max(0, todayRows.length - approved);
  const total = todayRows.length;
  const approvedAngle = total > 0 ? Math.round((approved / total) * 360) : 0;

  return `
    <div class="attendance-summary-top">
      <div class="outpass-pie" style="--approved-angle:${approvedAngle}deg"></div>
      <div class="attendance-summary-meta">
        <p><strong>Today's Outpass Requests:</strong> ${total}</p>
        <p><strong>Approved:</strong> ${approved}</p>
        <p><strong>Not Approved:</strong> ${notApproved}</p>
      </div>
    </div>
    <div class="attendance-legend">
      <span><i class="dot outpass-approved"></i>Approved</span>
      <span><i class="dot outpass-pending"></i>Not Approved</span>
    </div>
  `;
}

function formatOutpassStatus(status) {
  if (status === "DENIED") return "REJECTED";
  return status || "-";
}

function renderFeedback(root) {
  const role = state.session.role;
  const isStudent = role === "STUDENT";
  const canViewStudentDetails = role === "FACULTY" || role === "ADMIN";

  root.innerHTML = `
    ${isStudent ? `
      <form id="feedbackForm" class="form-grid" enctype="multipart/form-data">
        <h3>Submit Food Feedback</h3>
        <label>Rating (1-5)</label>
        <input type="number" min="1" max="5" name="rating" required />
        <label>Message</label>
        <textarea name="message" required rows="3"></textarea>
        <label>Take Photo</label>
        <input type="file" name="cameraImage" accept="image/*" capture="environment" />
        <label>Or Upload From Device</label>
        <input type="file" name="uploadImage" accept="image/*" />
        <button type="submit">Submit Feedback</button>
      </form>
    ` : ""}

    <button id="loadFeedbackBtn">Load Feedback</button>
    <div id="feedbackNotice"></div>
    <div id="feedbackList" class="feedback-grid"></div>
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
        .map((f) => {
          const heading = canViewStudentDetails
            ? `${f.studentName || "Student"} | Floor: ${f.floorNo || "-"} | Hostel: ${f.hostelName || "-"}`
            : "Posted by Student";
          const deleteBtn = isStudent && f.canDelete ? `<button class="danger" data-delete-feedback="${f.id}">Delete</button>` : "";
          return `
          <article class="stack-card feedback-card">
            <h4>${heading}</h4>
            <p>Rating: ${f.rating || "-"}</p>
            <p>${f.message || ""}</p>
            ${f.imageName ? `<img class="preview" src="/uploads/feedback-images/${f.imageName}" alt="Feedback image" />` : ""}
            ${deleteBtn ? `<div class="actions">${deleteBtn}</div>` : ""}
          </article>
        `;
        })
        .join("");

      list.querySelectorAll("[data-delete-feedback]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/food_feedback/${btn.dataset.deleteFeedback}`, { method: "DELETE" });
            setNotice(notice, "Feedback deleted", "success");
            await loadFeedback();
          } catch (err) {
            setNotice(notice, err.message, "error");
          }
        });
      });
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
      const cameraImage = form.querySelector("input[name='cameraImage']")?.files?.[0] || null;
      const uploadImage = form.querySelector("input[name='uploadImage']")?.files?.[0] || null;
      const selectedImage = cameraImage || uploadImage;
      fd.delete("cameraImage");
      fd.delete("uploadImage");
      if (selectedImage) {
        fd.append("image", selectedImage);
      }
      try {
        await api("/food_feedback/submit", { method: "POST", formData: fd });
        form.reset();
        setNotice(notice, "Feedback submitted", "success");
        await loadFeedback();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  loadFeedback();
}

function renderGym(root) {
  const role = state.session.role;
  const isAdmin = role === "ADMIN";

  root.innerHTML = `
    <div class="actions">
      ${isAdmin ? `<button id="gymStatusBtn">Check Gym Status</button>` : `<button id="gymScanBtn">Scan Gym QR</button><button id="gymStopScanBtn" class="ghost" disabled>Stop Camera</button>`}
    </div>
    ${!isAdmin ? `<video id="gymScanVideo" class="scan-video" playsinline muted></video><p class="scan-help">Point camera to Gym QR. After scan, key status updates automatically.</p>` : ""}
    <div id="gymNotice"></div>
    ${isAdmin ? `<div id="gymLogs"></div>` : ""}
  `;

  const notice = document.getElementById("gymNotice");
  const logsRoot = document.getElementById("gymLogs");

  if (isAdmin) {
    document.getElementById("gymStatusBtn").addEventListener("click", async () => {
      try {
        const status = await api("/gym/status");
        setNotice(notice, `${status?.status || "Gym status loaded"}`, "info");
        logsRoot.innerHTML = keyLogMarkup(status?.logs || [], "Gym Key Usage");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  if (!isAdmin) {
    const scanBtn = document.getElementById("gymScanBtn");
    const stopBtn = document.getElementById("gymStopScanBtn");
    const video = document.getElementById("gymScanVideo");

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
        setNotice(notice, "Camera started. Scanning Gym QR...", "info");

        await startAttendanceScanner(video, async () => {
          resetCameraButtons();
          const msg = await api("/gym/scan", { method: "POST" });
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

  const checkAlerts = async () => {
    try {
      const alerts = await api("/gym/alerts");
      if (Array.isArray(alerts) && alerts.length) {
        setNotice(notice, alerts.join(" | "), "error");
      }
    } catch (err) {
      // silent
    }
  };

  if (isAdmin) document.getElementById("gymStatusBtn").click();
  checkAlerts();
  registerFeatureInterval(setInterval(checkAlerts, 45000));
}

function renderIndoor(root) {
  const role = state.session.role;
  const isAdmin = role === "ADMIN";

  root.innerHTML = `
    <div class="actions">
      ${isAdmin ? `<button id="indoorStatusBtn">Check Indoor Court Status</button>` : `<button id="indoorScanBtn">Scan Indoor Court QR</button><button id="indoorStopScanBtn" class="ghost" disabled>Stop Camera</button>`}
    </div>
    ${!isAdmin ? `<video id="indoorScanVideo" class="scan-video" playsinline muted></video><p class="scan-help">Point camera to Indoor Court QR. After scan, key status updates automatically.</p>` : ""}
    <div id="indoorNotice"></div>
    ${isAdmin ? `<div id="indoorLogs"></div>` : ""}
  `;

  const notice = document.getElementById("indoorNotice");
  const logsRoot = document.getElementById("indoorLogs");

  if (isAdmin) {
    document.getElementById("indoorStatusBtn").addEventListener("click", async () => {
      try {
        const status = await api("/indoor-court/status");
        setNotice(notice, `${status?.status || "Indoor court status loaded"}`, "info");
        logsRoot.innerHTML = keyLogMarkup(status?.logs || [], "Indoor Court Key Usage");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    });
  }

  if (!isAdmin) {
    const scanBtn = document.getElementById("indoorScanBtn");
    const stopBtn = document.getElementById("indoorStopScanBtn");
    const video = document.getElementById("indoorScanVideo");

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
        setNotice(notice, "Camera started. Scanning Indoor Court QR...", "info");

        await startAttendanceScanner(video, async () => {
          resetCameraButtons();
          const msg = await api("/indoor-court/scan", { method: "POST" });
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

  const checkAlerts = async () => {
    try {
      const alerts = await api("/indoor-court/alerts");
      if (Array.isArray(alerts) && alerts.length) {
        setNotice(notice, alerts.join(" | "), "error");
      }
    } catch (err) {
      // silent
    }
  };

  if (isAdmin) document.getElementById("indoorStatusBtn").click();
  checkAlerts();
  registerFeatureInterval(setInterval(checkAlerts, 45000));
}

function keyLogMarkup(rows, heading) {
  if (!rows.length) return `<p>${heading}: No key usage data found.</p>`;

  const body = rows
    .map(
      (row) => `<tr>
        <td>${row.keyHolderRole || "-"}</td>
        <td>${row.studentName || "-"}</td>
        <td>${row.openTime || row.OpenTime || "-"}</td>
        <td>${row.closeTime || "-"}</td>
        <td>${row.status || "-"}</td>
      </tr>`
    )
    .join("");

  return `
    <h3>${heading}</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Role</th><th>Name</th><th>Taken At</th><th>Returned At</th><th>Status</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

const reactRoot = ReactDOM.createRoot(appRoot);
reactRoot.render(<App />);
