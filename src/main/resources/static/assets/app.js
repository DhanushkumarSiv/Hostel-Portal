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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
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
  container.innerHTML = `<div class="notice ${kind}">${escapeHtml(message)}</div>`;
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

function formatReadableDateTime(value) {
  if (!value) return "Date not available";

  const rawValue = String(value).trim();
  const normalizedValue = rawValue.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?$/,
    "$1"
  );
  const parsed = new Date(normalizedValue);

  if (Number.isNaN(parsed.getTime())) {
    return rawValue.replace("T", " ").replace(/\.\d+$/, "");
  }

  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parsed);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);

  return `${date}, ${time}`;
}

function parseLocalDateTime(value) {
  if (!value) return null;

  const rawValue = String(value).trim();
  const parts = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (parts) {
    return new Date(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3]),
      Number(parts[4]),
      Number(parts[5]),
      Number(parts[6] || 0)
    );
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReadableMinuteDateTime(value) {
  if (!value) return "-";

  const rawValue = String(value).trim();
  const dateValue = parseLocalDateTime(rawValue);

  if (!dateValue) {
    return rawValue.replace("T", " ").replace(/:\d{2}(?:\.\d+)?$/, "");
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(dateValue);
}

const attendanceScannerState = {
  stream: null,
  rafId: null,
  active: false,
  decodeInFlight: false,
  lastDecodeAt: 0,
  barcodeDetector: null,
  failedDecodes: 0
};

const feedbackPhotoState = {
  stream: null,
  capturedFile: null,
  previewUrl: ""
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
  attendanceScannerState.barcodeDetector = null;
  attendanceScannerState.failedDecodes = 0;

  if (attendanceScannerState.rafId) {
    cancelAnimationFrame(attendanceScannerState.rafId);
    attendanceScannerState.rafId = null;
  }

  if (attendanceScannerState.stream) {
    attendanceScannerState.stream.getTracks().forEach((track) => track.stop());
    attendanceScannerState.stream = null;
  }
}

function stopFeedbackCamera({ clearCapture = false } = {}) {
  if (feedbackPhotoState.stream) {
    feedbackPhotoState.stream.getTracks().forEach((track) => track.stop());
    feedbackPhotoState.stream = null;
  }

  if (clearCapture) {
    feedbackPhotoState.capturedFile = null;
    if (feedbackPhotoState.previewUrl) {
      URL.revokeObjectURL(feedbackPhotoState.previewUrl);
      feedbackPhotoState.previewUrl = "";
    }
  }
}

async function startFeedbackCamera(videoEl) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  stopFeedbackCamera();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  feedbackPhotoState.stream = stream;
  videoEl.srcObject = stream;
  videoEl.setAttribute("playsinline", "true");
  videoEl.muted = true;
  await videoEl.play();
}

async function captureFeedbackPhoto(videoEl) {
  if (!videoEl.videoWidth || !videoEl.videoHeight) {
    throw new Error("Camera is still starting. Try again in a moment.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to capture photo.");
  }

  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  if (!blob) {
    throw new Error("Unable to capture photo.");
  }

  return new File([blob], `food-feedback-${Date.now()}.jpg`, { type: "image/jpeg" });
}

async function startAttendanceScanner(videoEl, onDetect, options = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  stopAttendanceScanner();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  videoEl.srcObject = stream;
  videoEl.setAttribute("playsinline", "true");
  videoEl.muted = true;
  await videoEl.play();

  attendanceScannerState.stream = stream;
  attendanceScannerState.active = true;

  if ("BarcodeDetector" in window) {
    try {
      attendanceScannerState.barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch (err) {
      attendanceScannerState.barcodeDetector = null;
    }
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctx || !cropCtx) {
    throw new Error("Unable to initialize QR scanner.");
  }

  const decodeFrame = async (imageData) => {
    const response = await api("/qr/decode", {
      method: "POST",
      body: { imageData }
    });

    return String(response?.qrData || "").trim();
  };

  const setScaledCanvasSize = (targetCanvas, sourceWidth, sourceHeight, maxSize) => {
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    targetCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
    targetCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
  };

  const scan = async () => {
    if (!attendanceScannerState.active) {
      return;
    }

    if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !attendanceScannerState.decodeInFlight) {
      const now = Date.now();
      if (now - attendanceScannerState.lastDecodeAt >= 250) {
        attendanceScannerState.lastDecodeAt = now;

        try {
          attendanceScannerState.decodeInFlight = true;
          let qrData = "";

          if (attendanceScannerState.barcodeDetector) {
            try {
              const barcodes = await attendanceScannerState.barcodeDetector.detect(videoEl);
              qrData = String(barcodes?.[0]?.rawValue || "").trim();
            } catch (err) {
              qrData = "";
            }
          }

          if (!qrData) {
            setScaledCanvasSize(canvas, videoEl.videoWidth, videoEl.videoHeight, 960);
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            qrData = await decodeFrame(canvas.toDataURL("image/jpeg", 0.95));
          }

          if (!qrData) {
            const sourceSize = Math.min(videoEl.videoWidth, videoEl.videoHeight);
            const sourceX = Math.max(0, Math.round((videoEl.videoWidth - sourceSize) / 2));
            const sourceY = Math.max(0, Math.round((videoEl.videoHeight - sourceSize) / 2));
            setScaledCanvasSize(cropCanvas, sourceSize, sourceSize, 900);
            cropCtx.drawImage(
              videoEl,
              sourceX,
              sourceY,
              sourceSize,
              sourceSize,
              0,
              0,
              cropCanvas.width,
              cropCanvas.height
            );
            qrData = await decodeFrame(cropCanvas.toDataURL("image/jpeg", 0.98));
          }

          if (qrData) {
            stopAttendanceScanner();
            await onDetect(qrData);
            return;
          }
          attendanceScannerState.failedDecodes += 1;
          if (options.onProgress && attendanceScannerState.failedDecodes % 8 === 0) {
            options.onProgress("Still scanning. Hold the QR steady inside the camera box.");
          }
        } catch (err) {
          attendanceScannerState.failedDecodes += 1;
          if (options.onProgress && attendanceScannerState.failedDecodes % 6 === 0) {
            options.onProgress("Camera is open, but QR was not readable yet.");
          }
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
      stopFeedbackCamera({ clearCapture: true });
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
    stopFeedbackCamera({ clearCapture: true });
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
  stopFeedbackCamera({ clearCapture: true });
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
  const canUseForum = canGenerate || canMark;
  const canViewSummary = role === "ADMIN" || role === "FACULTY";
  const summaryEndpoint = role === "ADMIN" ? "/attendance/daily/admin" : "/attendance/daily/faculty";

  root.innerHTML = `
    ${canUseForum ? `
      <div class="attendance-forum">
        <div class="attendance-forum-head">
          <div>
            <h3>Floor Attendance Forum</h3>
            <p>${canGenerate ? "Generate the floor QR and answer scan queries." : "Scan the live floor QR and ask scan queries."}</p>
          </div>
          ${canGenerate ? `<button id="generateQrBtn" type="button">Generate Floor QR</button>` : ""}
        </div>
        <div id="qrNotice"></div>
        <div id="attendanceForumContent" class="attendance-forum-content"></div>
        <form id="attendanceForumMessageForm" class="forum-composer">
          <label>${canGenerate ? "Reply in discussion" : "Ask a scanning query"}</label>
          <textarea name="message" rows="3" maxlength="1000" required placeholder="${canGenerate ? "Type a reply for your floor students" : "Type your QR scanning query"}"></textarea>
          <button type="submit">${canGenerate ? "Post Reply" : "Post Query"}</button>
        </form>
      </div>
    ` : ""}

    ${canViewSummary ? `
      <div class="panel-lite">
        <div class="actions">
          <button id="loadAttendanceSummaryBtn">Load Today's Attendance</button>
        </div>
        <div class="attendance-filter-bar">
          <div class="attendance-filter-group">
            <label for="attendanceFloorFilter">Floor</label>
            <select id="attendanceFloorFilter" disabled>
              <option value="ALL">All Floors</option>
            </select>
          </div>
          <div class="attendance-filter-group">
            <label for="attendanceStatusFilter">Status</label>
            <select id="attendanceStatusFilter">
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="NOT TAKEN">Not Taken</option>
            </select>
          </div>
        </div>
        <div id="attendanceSummaryNotice"></div>
        <div id="attendanceSummaryContent"></div>
      </div>
    ` : ""}
  `;

  if (canUseForum) {
    const forumNotice = document.getElementById("qrNotice");
    const forumContent = document.getElementById("attendanceForumContent");
    const messageForm = document.getElementById("attendanceForumMessageForm");
    const generateBtn = document.getElementById("generateQrBtn");
    let currentForum = null;

    const renderForum = () => {
      forumContent.innerHTML = attendanceForumMarkup(currentForum, role);
      bindAttendanceForumActions(currentForum, role);
    };

    const loadForum = async (showLoading = false) => {
      try {
        if (showLoading) {
          setNotice(forumNotice, "Loading attendance forum...", "info");
        }
        currentForum = await api("/attendance/forum");
        renderForum();
        if (showLoading) {
          setNotice(forumNotice, `Loaded Floor ${currentForum?.floorNo || "-"} forum`, "success");
        }
      } catch (err) {
        setNotice(forumNotice, err.message, "error");
      }
    };

    if (generateBtn) {
      generateBtn.addEventListener("click", async () => {
        try {
          generateBtn.disabled = true;
          setNotice(forumNotice, "Generating QR for your floor...", "info");
          const qr = await api("/attendance/generate-qr");
          setNotice(forumNotice, `QR generated for Floor ${qr?.floorNo || "-"}`, "success");
          await loadForum(false);
        } catch (err) {
          setNotice(forumNotice, err.message, "error");
        } finally {
          generateBtn.disabled = false;
        }
      });
    }

    messageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = messageForm.querySelector("button[type='submit']");
      const textarea = messageForm.querySelector("textarea[name='message']");
      const message = String(new FormData(messageForm).get("message") || "").trim();

      if (!message) {
        setNotice(forumNotice, "Message is required.", "error");
        return;
      }

      try {
        submitBtn.disabled = true;
        await api("/attendance/forum/messages", { method: "POST", body: { message } });
        textarea.value = "";
        setNotice(forumNotice, "Posted to the attendance forum", "success");
        await loadForum(false);
      } catch (err) {
        setNotice(forumNotice, err.message, "error");
      } finally {
        submitBtn.disabled = false;
      }
    });

    loadForum(true);
    registerFeatureInterval(setInterval(() => loadForum(false), 8000));
  }

  if (canViewSummary) {
    const summaryBtn = document.getElementById("loadAttendanceSummaryBtn");
    const floorFilter = document.getElementById("attendanceFloorFilter");
    const statusFilter = document.getElementById("attendanceStatusFilter");
    const summaryNotice = document.getElementById("attendanceSummaryNotice");
    const summaryContent = document.getElementById("attendanceSummaryContent");
    const summaryState = {
      data: null,
      filters: {
        floor: "ALL",
        status: "ALL"
      }
    };

    const uniqueFloors = (students) => {
      return Array.from(
        new Set(
          students
            .map((student) => String(student?.floorNo || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    };

    const filteredSummary = () => {
      const source = summaryState.data;
      if (!source) {
        return null;
      }

      const students = Array.isArray(source.students) ? source.students : [];
      const floorValue = summaryState.filters.floor;
      const statusValue = summaryState.filters.status;

      const rows = students.filter((student) => {
        const matchesFloor = floorValue === "ALL" || String(student.floorNo || "").trim() === floorValue;
        const matchesStatus = statusValue === "ALL" || String(student.attendance || "").trim().toUpperCase() === statusValue;
        return matchesFloor && matchesStatus;
      });

      const presentCount = rows.filter((row) => String(row.attendance || "").trim().toUpperCase() === "PRESENT").length;
      const absentCount = rows.filter((row) => String(row.attendance || "").trim().toUpperCase() === "ABSENT").length;

      return {
        ...source,
        presentCount,
        absentCount,
        totalStudents: rows.length,
        students: rows
      };
    };

    const renderSummary = () => {
      if (!summaryState.data) {
        summaryContent.innerHTML = "";
        return;
      }

      const view = filteredSummary();
      const rows = Array.isArray(view?.students) ? view.students : [];
      const floorLabel = summaryState.filters.floor === "ALL" ? "all floors" : `floor ${summaryState.filters.floor}`;
      const statusLabel = summaryState.filters.status === "ALL" ? "all statuses" : summaryState.filters.status.toLowerCase();

      if (!rows.length) {
        summaryContent.innerHTML = `<p class="attendance-summary-empty">No attendance rows match ${floorLabel} and ${statusLabel}.</p>`;
        return;
      }

      summaryContent.innerHTML = attendanceSummaryMarkup(view, role);
    };

    const syncFloorFilter = () => {
      if (!floorFilter) return;

      const floors = uniqueFloors(summaryState.data?.students || []);
      floorFilter.innerHTML = `<option value="ALL">All Floors</option>${
        floors.map((floor) => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`).join("")
      }`;
      floorFilter.disabled = floors.length === 0;

      if (summaryState.filters.floor !== "ALL" && !floors.includes(summaryState.filters.floor)) {
        summaryState.filters.floor = "ALL";
        floorFilter.value = "ALL";
      }
    };

    const loadSummary = async () => {
      try {
        setNotice(summaryNotice, "Loading today's attendance...", "info");
        const summary = await api(summaryEndpoint);
        summaryState.data = summary;
        syncFloorFilter();
        renderSummary();
        setNotice(summaryNotice, `Loaded ${summary?.totalStudents || 0} students`, "success");
      } catch (err) {
        setNotice(summaryNotice, err.message, "error");
      }
    };

    summaryBtn.addEventListener("click", loadSummary);
    floorFilter?.addEventListener("change", () => {
      summaryState.filters.floor = floorFilter.value || "ALL";
      renderSummary();
    });
    statusFilter?.addEventListener("change", () => {
      summaryState.filters.status = statusFilter.value || "ALL";
      renderSummary();
    });
    loadSummary();
  }
}

function bindAttendanceForumActions(forum, role) {
  const scanBtn = document.getElementById("scanQrBtn");
  const markNotice = document.getElementById("markNotice");

  if (!scanBtn || role !== "STUDENT") {
    return;
  }

  scanBtn.addEventListener("click", async () => {
    const qrData = String(forum?.latestQr?.qrData || "").trim();

    if (!qrData) {
      setNotice(markNotice, "No active QR is available.", "error");
      return;
    }

    try {
      scanBtn.disabled = true;
      setNotice(markNotice, "Scanning live QR...", "info");
      const result = await api("/attendance/mark", { method: "POST", body: { qrData } });
      const message = typeof result === "string" ? result : "Attendance marked";
      const isSuccess = /success|already marked/i.test(message);

      setNotice(markNotice, message, isSuccess ? "success" : "error");
    } catch (err) {
      setNotice(markNotice, err.message, "error");
    } finally {
      scanBtn.disabled = false;
    }
  });
}

function attendanceForumMarkup(forum, role) {
  const floorNo = escapeHtml(forum?.floorNo || "-");
  const latestQr = forum?.latestQr || null;
  const messages = Array.isArray(forum?.messages) ? forum.messages : [];
  const qrPost = latestQr ? attendanceQrForumPost(latestQr, role) : `
    <div class="forum-empty">
      <strong>No QR generated yet</strong>
      <p>The latest floor QR will appear here when faculty generates it.</p>
    </div>
  `;
  const messageItems = messages.length
    ? messages.map(attendanceForumMessagePost).join("")
    : `<div class="forum-empty slim"><p>No scan queries yet.</p></div>`;

  return `
    <div class="forum-floor-strip">
      <span class="badge">Floor ${floorNo}</span>
      <span>${messages.length} discussion ${messages.length === 1 ? "post" : "posts"} today</span>
    </div>
    <div class="forum-thread">
      ${qrPost}
      ${messageItems}
    </div>
    <div id="markNotice"></div>
  `;
}

function attendanceQrForumPost(latestQr, role) {
  const facultyName = escapeHtml(latestQr.facultyName || "Floor Faculty");
  const floorNo = escapeHtml(latestQr.floorNo || "-");
  const generatedAt = escapeHtml(formatForumTime(latestQr.createdAt));
  const qrImage = latestQr.qrImageDataUrl
    ? `<img src="${escapeHtml(latestQr.qrImageDataUrl)}" alt="Attendance QR code" />`
    : `<p>QR image is not available.</p>`;

  return `
    <article class="forum-post qr-post">
      <div class="forum-avatar faculty">F</div>
      <div class="forum-post-body">
        <div class="forum-meta">
          <strong>${facultyName}</strong>
          <span>${generatedAt}</span>
        </div>
        <div class="qr-forum-card">
          <div class="qr-preview forum-qr-preview">${qrImage}</div>
          <div class="qr-action-col">
            <h4>Attendance QR</h4>
            <p>Floor ${floorNo}</p>
            ${role === "STUDENT"
              ? `<button id="scanQrBtn" type="button">Scan QR</button>`
              : `<span class="badge">Active QR</span>`}
          </div>
        </div>
      </div>
    </article>
  `;
}

function attendanceForumMessagePost(message) {
  const authorRole = String(message.authorRole || "").toUpperCase();
  const isFaculty = authorRole === "FACULTY";
  const authorName = escapeHtml(message.authorName || (isFaculty ? "Faculty" : "Student"));
  const createdAt = escapeHtml(formatForumTime(message.createdAt));
  const text = escapeHtml(message.message || "").replace(/\n/g, "<br>");
  const initial = escapeHtml((authorName.trim()[0] || "?").toUpperCase());

  return `
    <article class="forum-post">
      <div class="forum-avatar ${isFaculty ? "faculty" : "student"}">${initial}</div>
      <div class="forum-post-body">
        <div class="forum-meta">
          <strong>${authorName}</strong>
          <span>${isFaculty ? "Faculty" : "Student"}</span>
          <span>${createdAt}</span>
        </div>
        <p>${text}</p>
      </div>
    </article>
  `;
}

function formatForumTime(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function attendanceStatusClass(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function attendanceSummaryMarkup(summary, role) {
  const students = Array.isArray(summary?.students) ? summary.students : [];
  const present = Number(summary?.presentCount || 0);
  const absent = Number(summary?.absentCount || 0);
  const total = Number(summary?.totalStudents || students.length || 0);
  const notTaken = total > 0 && present === 0 && absent === 0 && students.some((s) => s.attendance === "NOT TAKEN");
  const presentAngle = total > 0 ? Math.round((present / total) * 360) : 0;
  const showFloor = role === "ADMIN";

  const rows = students
    .map(
      (s) => `<tr>
        <td>${s.name || ""}</td>
        <td>${s.roomNo || ""}</td>
        <td>${s.roomType || ""}</td>
        ${showFloor ? `<td>${s.floorNo || ""}</td>` : ""}
        <td><span class="attendance-status ${attendanceStatusClass(s.attendance)}">${s.attendance || ""}</span></td>
      </tr>`
    )
    .join("");

  return `
    <div class="attendance-summary-wrap">
      <div class="attendance-summary-top">
        <div class="attendance-pie ${notTaken ? "not-taken" : ""}" style="--present-angle:${presentAngle}deg"></div>
        <div class="attendance-summary-meta">
          <p><strong>Date:</strong> ${summary?.date || "-"}</p>
          <p><strong>Total Students:</strong> ${total}</p>
          <p><strong>Present:</strong> ${present}</p>
          <p><strong>Absent:</strong> ${absent}</p>
          ${notTaken ? `<p><strong>Status:</strong> Attendance not taken</p>` : ""}
        </div>
      </div>
      <div class="attendance-legend">
        <span><i class="dot present"></i>Present</span>
        <span><i class="dot absent"></i>Absent</span>
        ${notTaken ? `<span><i class="dot not-taken"></i>Not Taken</span>` : ""}
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
      list.innerHTML = renderCircularCards(data, isAdmin, role);

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

function renderCircularCards(data, isAdmin, viewerRole = state.session?.role) {
  if (!data.length) return "<p>No circulars available.</p>";

  if (viewerRole === "STUDENT") {
    const floorCirculars = data.filter((c) => String(c.postedByRole || "ADMIN").toUpperCase() === "FACULTY");
    const adminCirculars = data.filter((c) => String(c.postedByRole || "ADMIN").toUpperCase() !== "FACULTY");

    return `
      <div class="circular-groups">
        ${renderCircularGroup("Floor Incharge Circulars", floorCirculars, isAdmin, "No floor incharge circulars right now.")}
        ${renderCircularGroup("Admin Circulars", adminCirculars, isAdmin, "No admin circulars right now.")}
      </div>
    `;
  }

  return data
    .map((c) => renderCircularCard(c, isAdmin))
    .join("");
}

function renderCircularGroup(title, circulars, isAdmin, emptyMessage) {
  return `
    <section class="circular-section">
      <div class="circular-section-head">
        <h3>${escapeHtml(title)}</h3>
        <span>${circulars.length} ${circulars.length === 1 ? "circular" : "circulars"}</span>
      </div>
      ${circulars.length
        ? circulars.map((c) => renderCircularCard(c, isAdmin)).join("")
        : `<p class="empty-text">${escapeHtml(emptyMessage)}</p>`}
    </section>
  `;
}

function renderCircularCard(c, isAdmin) {
  const postedByRole = String(c.postedByRole || "ADMIN").toUpperCase();
  const isFacultyPost = postedByRole === "FACULTY";
  const roleText = isFacultyPost ? "Floor Incharge" : "Admin";
  const roleClass = isFacultyPost ? "circular-faculty" : "circular-admin";
  const floorText = isFacultyPost && c.targetFloorNo ? `<span>Floor: ${escapeHtml(c.targetFloorNo)}</span>` : "";

  return `
    <article class="stack-card ${roleClass}">
      <h4>${escapeHtml(c.subject || "No subject")}</h4>
      <p>${escapeHtml(c.details || "")}</p>
      <div class="circular-meta" aria-label="Circular posting details">
        <span>Posted by ${roleText}</span>
        ${floorText}
        <span>${escapeHtml(formatReadableDateTime(c.createdAt))}</span>
      </div>
      ${isAdmin ? `<div class="actions"><button data-edit="${c.id}">Edit</button><button class="danger" data-delete="${c.id}">Delete</button></div>` : ""}
    </article>
  `;
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
    <div id="menuNotice"></div>
    ${canEdit ? `
      <form id="menuEditForm" class="menu-edit-panel" hidden>
        <div class="menu-edit-head">
          <span class="badge">ADMIN</span>
          <div>
            <h3>Edit Menu</h3>
            <p>Update the selected day's food schedule.</p>
          </div>
        </div>
        <input name="id" type="hidden" />
        <div class="menu-edit-grid">
          <label>Day<input name="days" required readonly /></label>
          <label>Breakfast<input name="breakfast" required /></label>
          <label>Lunch<input name="lunch" required /></label>
          <label>Snacks<input name="snacks" required /></label>
          <label>Dinner<input name="dinner" required /></label>
        </div>
        <div class="menu-edit-actions">
          <button type="submit">Save Changes</button>
          <button type="button" class="ghost" id="cancelMenuEdit">Cancel</button>
        </div>
      </form>
    ` : ""}
    <div id="menuTable"></div>
  `;

  const notice = document.getElementById("menuNotice");
  const tableRoot = document.getElementById("menuTable");
  const editForm = canEdit ? document.getElementById("menuEditForm") : null;

  const openMenuEditor = (row) => {
    editForm.elements.id.value = row.id;
    editForm.elements.days.value = row.days || "";
    editForm.elements.breakfast.value = row.breakfast || "";
    editForm.elements.lunch.value = row.lunch || "";
    editForm.elements.snacks.value = row.snacks || "";
    editForm.elements.dinner.value = row.dinner || "";
    editForm.hidden = false;
    editForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
    editForm.elements.breakfast.focus();
  };

  const load = async () => {
    try {
      const rows = await api("/menu");
      tableRoot.innerHTML = menuTable(rows, canEdit);
      if (canEdit) {
        tableRoot.querySelectorAll("[data-update-menu]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const row = JSON.parse(decodeURIComponent(btn.dataset.updateMenu));
            openMenuEditor(row);
          });
        });
      }
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  if (canEdit) {
    document.getElementById("cancelMenuEdit").addEventListener("click", () => {
      editForm.reset();
      editForm.hidden = true;
    });

    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const values = Object.fromEntries(fd.entries());
      try {
        await api(`/menu/${values.id}`, {
          method: "PUT",
          body: {
            days: values.days,
            breakfast: values.breakfast,
            lunch: values.lunch,
            snacks: values.snacks,
            dinner: values.dinner
          }
        });
        e.target.reset();
        editForm.hidden = true;
        setNotice(notice, "Menu updated", "success");
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
        ${canEdit ? `<td><button data-update-menu="${escapeHtml(encodeURIComponent(JSON.stringify(m)))}">Edit</button></td>` : ""}
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

    <div class="complaint-filter-panel">
      <div class="complaint-filter-head">
        <h4>Filter Complaints</h4>
      </div>
      <div class="complaint-filter-grid">
        <div class="complaint-filter-field">
          <label for="complaintFromDate">From</label>
          <input id="complaintFromDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="complaintToDate">To</label>
          <input id="complaintToDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="complaintPresetFilter">Quick Range</label>
          <select id="complaintPresetFilter">
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>
      <div class="actions complaint-filter-actions">
        <button id="applyComplaintFilterBtn" type="button">Apply Filter</button>
        <button id="resetComplaintFilterBtn" type="button" class="ghost">Reset</button>
      </div>
    </div>

    <div class="actions">
      <button id="loadComplaintsBtn">${canUpdate ? "Load Complaints" : "Load My Complaints"}</button>
    </div>
    <div id="complaintNotice"></div>
    <div id="complaintList"></div>
  `;

  const notice = document.getElementById("complaintNotice");
  const list = document.getElementById("complaintList");
  const summary = document.getElementById("complaintSummary");
  const fromDateInput = document.getElementById("complaintFromDate");
  const toDateInput = document.getElementById("complaintToDate");
  const presetFilter = document.getElementById("complaintPresetFilter");
  const applyFilterBtn = document.getElementById("applyComplaintFilterBtn");
  const resetFilterBtn = document.getElementById("resetComplaintFilterBtn");
  const complaintState = {
    rows: []
  };

  const localDateFromValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const complaintDayKey = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayIso = () => localIsoDateToday();

  const applyPresetRange = () => {
    const preset = presetFilter?.value || "ALL";
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = null;

    if (preset === "TODAY") {
      start = new Date(end);
    } else if (preset === "LAST_7_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 6);
    } else if (preset === "LAST_30_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 29);
    }

    if (preset === "ALL") {
      fromDateInput.value = "";
      toDateInput.value = "";
      return;
    }

    if (start) {
      fromDateInput.value = complaintDayKey(start);
      toDateInput.value = complaintDayKey(end);
    }
  };

  const filterComplaints = (rows) => {
    const from = localDateFromValue(fromDateInput?.value);
    const to = localDateFromValue(toDateInput?.value);

    return rows.filter((row) => {
      const created = row?.createdAt ? new Date(row.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) {
        return false;
      }
      const dateOnly = new Date(created.getFullYear(), created.getMonth(), created.getDate());
      if (from && dateOnly < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
        return false;
      }
      if (to && dateOnly > new Date(to.getFullYear(), to.getMonth(), to.getDate())) {
        return false;
      }
      return true;
    });
  };

  const renderFilteredComplaints = () => {
    const filtered = filterComplaints(complaintState.rows);
    list.innerHTML = complaintCards(filtered, canUpdate, role, regNo);
    if (summary) {
      summary.innerHTML = complaintSummaryMarkup(filtered);
    }
    bindComplaintActions();
    bindComplaintDeleteActions();

    const urgentCount = filtered.filter((row) => complaintIsUrgent(row)).length;
    if (canUpdate && urgentCount > 0) {
      setNotice(notice, `${urgentCount} urgent complaint(s) need attention`, "error");
      return;
    }

    setNotice(notice, `Showing ${filtered.length} of ${complaintState.rows.length} complaint(s)`, "success");
  };

  const loadComplaints = async () => {
    try {
      const rows = await api(endpoint);
      complaintState.rows = sortComplaintsNewest(rows);
      renderFilteredComplaints();
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
  applyFilterBtn?.addEventListener("click", () => {
    if (presetFilter.value !== "ALL") {
      applyPresetRange();
    }
    renderFilteredComplaints();
  });
  resetFilterBtn?.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    presetFilter.value = "ALL";
    renderFilteredComplaints();
  });
  presetFilter?.addEventListener("change", () => {
    applyPresetRange();
  });

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
  const urgent = todayRows.filter((row) => complaintIsUrgent(row)).length;

  const pendingAngle = total > 0 ? Math.round((pending / total) * 360) : 0;
  const progressAngle = total > 0 ? Math.round((inProgress / total) * 360) : 0;

  return `
    ${urgent > 0 ? `
      <div class="complaint-alert">
        <strong>${urgent} urgent complaint(s)</strong>
        <span>Need faculty/admin attention right now.</span>
      </div>
    ` : ""}
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
      const isUrgent = complaintIsUrgent(c);
      const canFacultyUpdate = canUpdate && !(role === "FACULTY" && isPublic);
      const isStudentOwner = role === "STUDENT" && String(c.studentId || "").toLowerCase() === String(regNo || "").toLowerCase();
      const canDeletePublic = isStudentOwner && isPublic && complaintWithinDays(c, 3);
      const publicBadge = isPublic ? `<span class="badge complaint-public-badge">PUBLIC</span>` : `<span class="badge">PERSONAL</span>`;
      const publicClass = role === "ADMIN" && isPublic ? "complaint-public-card" : "";
      const urgentClass = isUrgent ? "complaint-emergency-card" : "";
      const repeatBadge = Number(c.repeatCount || 0) > 1 ? `<span class="badge complaint-repeat-badge">Repeat x${Number(c.repeatCount || 0)}</span>` : "";

      return `
      <article class="stack-card ${publicClass} ${urgentClass}">
        <h4>${c.title || "Complaint"} ${publicBadge} ${repeatBadge} ${isUrgent ? "<span class=\"badge danger\">Urgent</span>" : ""}</h4>
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

function sortComplaintsNewest(rows) {
  return [...rows].sort((a, b) => {
    const aTime = parseLocalDateTime(a?.createdAt)?.getTime() || 0;
    const bTime = parseLocalDateTime(b?.createdAt)?.getTime() || 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
}

function complaintIsPublic(complaint) {
  const category = String(complaint?.category || "").toUpperCase();
  return category === "PUBLIC" || category === "GENERAL";
}

function complaintIsUrgent(complaint) {
  return Boolean(
    complaint?.emergency
      || complaint?.isEmergency
      || Number(complaint?.repeatCount || 0) >= 3
  );
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

    <div class="complaint-filter-panel">
      <div class="complaint-filter-head">
        <h4>Filter Outpass</h4>
      </div>
      <div class="complaint-filter-grid">
        <div class="complaint-filter-field">
          <label for="outpassFromDate">From</label>
          <input id="outpassFromDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="outpassToDate">To</label>
          <input id="outpassToDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="outpassPresetFilter">Quick Range</label>
          <select id="outpassPresetFilter">
            <option value="ALL">All</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>
      <div class="actions complaint-filter-actions">
        <button id="applyOutpassFilterBtn" type="button">Apply Filter</button>
        <button id="resetOutpassFilterBtn" type="button" class="ghost">Reset</button>
      </div>
    </div>

    <div id="outpassNotice"></div>
    <div id="outpassList"></div>
  `;

  const notice = document.getElementById("outpassNotice");
  const list = document.getElementById("outpassList");
  const summaryRoot = document.getElementById("outpassSummary");
  const fromDateInput = document.getElementById("outpassFromDate");
  const toDateInput = document.getElementById("outpassToDate");
  const presetFilter = document.getElementById("outpassPresetFilter");
  const applyFilterBtn = document.getElementById("applyOutpassFilterBtn");
  const resetFilterBtn = document.getElementById("resetOutpassFilterBtn");
  const outpassState = {
    rows: [],
    canApprove: false,
    mode: "student-history"
  };
  let currentLoader = null;

  const localDateFromValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const outpassDayKey = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const applyOutpassPreset = () => {
    const preset = presetFilter?.value || "ALL";
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = null;

    if (preset === "TODAY") {
      start = new Date(end);
    } else if (preset === "LAST_7_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 6);
    } else if (preset === "LAST_30_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 29);
    }

    if (!start) {
      fromDateInput.value = "";
      toDateInput.value = "";
      return;
    }

    fromDateInput.value = outpassDayKey(start);
    toDateInput.value = outpassDayKey(end);
  };

  const rowDateForFilter = (row) => {
    if (row?.outDate) {
      const outDate = localDateFromValue(String(row.outDate).slice(0, 10));
      if (outDate) return outDate;
    }
    if (row?.createdAt) {
      return localDateFromValue(row.createdAt);
    }
    return null;
  };

  const filterOutpasses = (rows) => {
    const from = localDateFromValue(fromDateInput?.value);
    const to = localDateFromValue(toDateInput?.value);

    return rows.filter((row) => {
      const rowDate = rowDateForFilter(row);
      if (!rowDate) return !from && !to;
      if (from && rowDate < from) return false;
      if (to && rowDate > to) return false;
      return true;
    });
  };

  const renderFilteredOutpasses = () => {
    const rows = filterOutpasses(outpassState.rows);
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
        if (outpassState.mode === "student-history") {
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

        if (outpassState.mode === "admin-all") {
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
          ${outpassState.canApprove && o.status === "PENDING" ? `
            <div class="actions">
              <button data-approve-id="${o.id}">Approve</button>
              <button class="danger" data-deny-id="${o.id}">Deny</button>
            </div>
          ` : ""}
        </article>
      `;
      })
      .join("");

    if (outpassState.canApprove) {
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

  const renderList = (rows, canApprove, mode) => {
    outpassState.rows = rows;
    outpassState.canApprove = canApprove;
    outpassState.mode = mode;
    renderFilteredOutpasses();
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

  applyFilterBtn?.addEventListener("click", () => {
    if (presetFilter.value !== "ALL") {
      applyOutpassPreset();
    }
    renderFilteredOutpasses();
    setNotice(notice, `Showing ${filterOutpasses(outpassState.rows).length} of ${outpassState.rows.length} outpass request(s)`, "success");
  });

  resetFilterBtn?.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    presetFilter.value = "ALL";
    renderFilteredOutpasses();
    setNotice(notice, `Showing ${outpassState.rows.length} of ${outpassState.rows.length} outpass request(s)`, "success");
  });

  presetFilter?.addEventListener("change", () => {
    applyOutpassPreset();
  });

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
        <label>Rating</label>
        <select name="rating" required>
          <option value="">Select rating</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        <label>Message</label>
        <textarea name="message" required rows="3"></textarea>
        <label>Photo</label>
        <div class="feedback-media-row">
          <button type="button" id="feedbackCameraBtn">Take Photo</button>
          <button type="button" id="feedbackUploadBtn" class="ghost">Upload From Device</button>
          <input id="feedbackUploadInput" class="feedback-file-input" type="file" name="uploadImage" accept="image/*" />
        </div>
        <div id="feedbackCameraPanel" class="feedback-camera-panel" hidden>
          <video id="feedbackCameraVideo" class="feedback-camera-video" playsinline muted></video>
          <div class="actions">
            <button type="button" id="feedbackCaptureBtn">Capture Photo</button>
            <button type="button" id="feedbackStopCameraBtn" class="ghost">Stop Camera</button>
          </div>
        </div>
        <div id="feedbackPhotoPreview" class="feedback-photo-preview" hidden>
          <img id="feedbackPhotoPreviewImg" alt="Selected feedback photo" />
          <span id="feedbackPhotoPreviewText">Photo selected</span>
          <button type="button" id="feedbackClearPhotoBtn" class="ghost">Remove</button>
        </div>
        <button type="submit">Submit Feedback</button>
      </form>
    ` : ""}

    <div class="complaint-filter-panel">
      <div class="complaint-filter-head">
        <h4>Filter Feedback</h4>
      </div>
      <div class="complaint-filter-grid">
        <div class="complaint-filter-field">
          <label for="feedbackFromDate">From</label>
          <input id="feedbackFromDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="feedbackToDate">To</label>
          <input id="feedbackToDate" type="date" />
        </div>
        <div class="complaint-filter-field">
          <label for="feedbackPresetFilter">Quick Range</label>
          <select id="feedbackPresetFilter">
            <option value="ALL">All</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>
      <div class="actions complaint-filter-actions">
        <button id="applyFeedbackFilterBtn" type="button">Apply Filter</button>
        <button id="resetFeedbackFilterBtn" type="button" class="ghost">Reset</button>
      </div>
    </div>

    <button id="loadFeedbackBtn">Load Feedback</button>
    <div id="feedbackNotice"></div>
    <div id="feedbackList" class="feedback-grid"></div>
  `;

  const notice = document.getElementById("feedbackNotice");
  const list = document.getElementById("feedbackList");
  const fromDateInput = document.getElementById("feedbackFromDate");
  const toDateInput = document.getElementById("feedbackToDate");
  const presetFilter = document.getElementById("feedbackPresetFilter");
  const applyFilterBtn = document.getElementById("applyFeedbackFilterBtn");
  const resetFilterBtn = document.getElementById("resetFeedbackFilterBtn");
  const feedbackState = {
    rows: []
  };

  const localDateFromValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const feedbackDayKey = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const applyFeedbackPreset = () => {
    const preset = presetFilter?.value || "ALL";
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = null;

    if (preset === "TODAY") {
      start = new Date(end);
    } else if (preset === "LAST_7_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 6);
    } else if (preset === "LAST_30_DAYS") {
      start = new Date(end);
      start.setDate(start.getDate() - 29);
    }

    if (!start) {
      fromDateInput.value = "";
      toDateInput.value = "";
      return;
    }

    fromDateInput.value = feedbackDayKey(start);
    toDateInput.value = feedbackDayKey(end);
  };

  const filterFeedbackRows = (rows) => {
    const from = localDateFromValue(fromDateInput?.value);
    const to = localDateFromValue(toDateInput?.value);

    return rows.filter((row) => {
      const created = localDateFromValue(row?.createdAt);
      if (!created) return !from && !to;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  };

  const renderFilteredFeedback = () => {
    const rows = filterFeedbackRows(feedbackState.rows);
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
  };

  const loadFeedback = async () => {
    try {
      const rows = await api("/food_feedback/all");
      feedbackState.rows = rows;
      renderFilteredFeedback();
      setNotice(notice, `Loaded ${rows.length} feedback entr${rows.length === 1 ? "y" : "ies"}`, "success");
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  const loadBtn = document.getElementById("loadFeedbackBtn");
  if (loadBtn) {
    loadBtn.addEventListener("click", loadFeedback);
  }

  applyFilterBtn?.addEventListener("click", () => {
    if (presetFilter.value !== "ALL") {
      applyFeedbackPreset();
    }
    renderFilteredFeedback();
    setNotice(notice, `Showing ${filterFeedbackRows(feedbackState.rows).length} of ${feedbackState.rows.length} feedback entr${feedbackState.rows.length === 1 ? "y" : "ies"}`, "success");
  });

  resetFilterBtn?.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    presetFilter.value = "ALL";
    renderFilteredFeedback();
    setNotice(notice, `Showing ${feedbackState.rows.length} of ${feedbackState.rows.length} feedback entr${feedbackState.rows.length === 1 ? "y" : "ies"}`, "success");
  });

  presetFilter?.addEventListener("change", () => {
    applyFeedbackPreset();
  });

  const form = document.getElementById("feedbackForm");
  if (form) {
    const cameraBtn = document.getElementById("feedbackCameraBtn");
    const uploadBtn = document.getElementById("feedbackUploadBtn");
    const uploadInput = document.getElementById("feedbackUploadInput");
    const cameraPanel = document.getElementById("feedbackCameraPanel");
    const cameraVideo = document.getElementById("feedbackCameraVideo");
    const captureBtn = document.getElementById("feedbackCaptureBtn");
    const stopCameraBtn = document.getElementById("feedbackStopCameraBtn");
    const preview = document.getElementById("feedbackPhotoPreview");
    const previewImg = document.getElementById("feedbackPhotoPreviewImg");
    const previewText = document.getElementById("feedbackPhotoPreviewText");
    const clearPhotoBtn = document.getElementById("feedbackClearPhotoBtn");

    const resetCameraUi = () => {
      stopFeedbackCamera();
      cameraPanel.hidden = true;
      cameraVideo.srcObject = null;
      cameraBtn.disabled = false;
      captureBtn.disabled = false;
      stopCameraBtn.disabled = false;
    };

    const showPhotoPreview = (file) => {
      if (feedbackPhotoState.previewUrl) {
        URL.revokeObjectURL(feedbackPhotoState.previewUrl);
      }
      feedbackPhotoState.previewUrl = URL.createObjectURL(file);
      previewImg.src = feedbackPhotoState.previewUrl;
      previewText.textContent = file.name || "Photo selected";
      preview.hidden = false;
    };

    const clearPhoto = () => {
      feedbackPhotoState.capturedFile = null;
      uploadInput.value = "";
      if (feedbackPhotoState.previewUrl) {
        URL.revokeObjectURL(feedbackPhotoState.previewUrl);
        feedbackPhotoState.previewUrl = "";
      }
      previewImg.removeAttribute("src");
      preview.hidden = true;
    };

    cameraBtn.addEventListener("click", async () => {
      try {
        clearPhoto();
        cameraBtn.disabled = true;
        cameraPanel.hidden = false;
        setNotice(notice, "Opening camera...", "info");
        await startFeedbackCamera(cameraVideo);
        setNotice(notice, "Camera is ready. Capture the food photo.", "info");
      } catch (err) {
        resetCameraUi();
        setNotice(notice, err.message || "Unable to open camera.", "error");
      }
    });

    captureBtn.addEventListener("click", async () => {
      try {
        const file = await captureFeedbackPhoto(cameraVideo);
        feedbackPhotoState.capturedFile = file;
        uploadInput.value = "";
        showPhotoPreview(file);
        resetCameraUi();
        setNotice(notice, "Photo captured.", "success");
      } catch (err) {
        setNotice(notice, err.message || "Unable to capture photo.", "error");
      }
    });

    stopCameraBtn.addEventListener("click", () => {
      resetCameraUi();
      setNotice(notice, "Camera stopped.", "info");
    });

    uploadBtn.addEventListener("click", () => {
      resetCameraUi();
      uploadInput.click();
    });

    uploadInput.addEventListener("change", () => {
      const file = uploadInput.files?.[0];
      if (!file) {
        clearPhoto();
        return;
      }
      feedbackPhotoState.capturedFile = null;
      showPhotoPreview(file);
    });

    clearPhotoBtn.addEventListener("click", () => {
      clearPhoto();
      setNotice(notice, "Photo removed.", "info");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const uploadImage = uploadInput.files?.[0] || null;
      const selectedImage = feedbackPhotoState.capturedFile || uploadImage;
      fd.delete("uploadImage");
      if (selectedImage) {
        fd.append("image", selectedImage);
      }
      try {
        await api("/food_feedback/submit", { method: "POST", formData: fd });
        form.reset();
        clearPhoto();
        resetCameraUi();
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
      ${isAdmin ? `<button id="gymStatusBtn">Check Gym Key Status</button>` : `<button id="gymScanBtn">Scan Gym QR</button><button id="gymStopScanBtn" class="ghost" disabled>Stop Camera</button><button id="gymStatusBtn" type="button">Check Gym Key Status</button>`}
    </div>
    ${isAdmin ? `<div id="gymQr"></div>` : ""}
    ${!isAdmin ? `<video id="gymScanVideo" class="scan-video" playsinline muted></video><p class="scan-help">Point camera to Gym QR. After scan, key status updates automatically.</p>` : ""}
    <div id="gymNotice"></div>
    <div id="gymStatus"></div>
    ${isAdmin ? `<div id="gymLogs"></div>` : ""}
  `;

  const notice = document.getElementById("gymNotice");
  const statusRoot = document.getElementById("gymStatus");
  const logsRoot = document.getElementById("gymLogs");
  const statusBtn = document.getElementById("gymStatusBtn");

  const loadStatus = async () => {
    try {
      const status = await api("/gym/status");
      setNotice(notice, `${status?.status || "Gym status loaded"}`, "info");
      statusRoot.innerHTML = keyStatusMarkup(status, "Gym");
      if (logsRoot) {
        logsRoot.innerHTML = keyLogMarkup(status?.logs || [], "Gym Key Usage");
      }
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  statusBtn.addEventListener("click", loadStatus);

  if (isAdmin) {
    const qrRoot = document.getElementById("gymQr");
    (async () => {
      try {
        const qr = await api("/gym/qr");
        qrRoot.innerHTML = permanentKeyQrMarkup(qr, "Gym QR");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    })();
  }

  if (!isAdmin) {
    const scanBtn = document.getElementById("gymScanBtn");
    const stopBtn = document.getElementById("gymStopScanBtn");
    const video = document.getElementById("gymScanVideo");

    const submitGymKey = async (qrData) => {
      try {
        const msg = await api("/gym/scan", { method: "POST", body: { qrData } });
        setNotice(notice, typeof msg === "string" ? msg : "Gym action completed", "success");
        await loadStatus();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
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
        setNotice(notice, "Camera started. Scanning Gym QR...", "info");

        await startAttendanceScanner(
          video,
          async (qrData) => {
            resetCameraButtons();
            await submitGymKey(qrData);
          },
          { onProgress: (message) => setNotice(notice, message, "info") }
        );
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

  loadStatus();
  checkAlerts();
  registerFeatureInterval(setInterval(checkAlerts, 45000));
}

function renderIndoor(root) {
  const role = state.session.role;
  const isAdmin = role === "ADMIN";

  root.innerHTML = `
    <div class="actions">
      ${isAdmin ? `<button id="indoorStatusBtn">Check Indoor Court Key Status</button>` : `<button id="indoorScanBtn">Scan Indoor Court QR</button><button id="indoorStopScanBtn" class="ghost" disabled>Stop Camera</button><button id="indoorStatusBtn" type="button">Check Indoor Court Key Status</button>`}
    </div>
    ${isAdmin ? `<div id="indoorQr"></div>` : ""}
    ${!isAdmin ? `<video id="indoorScanVideo" class="scan-video" playsinline muted></video><p class="scan-help">Point camera to Indoor Court QR. After scan, key status updates automatically.</p>` : ""}
    <div id="indoorNotice"></div>
    <div id="indoorStatus"></div>
    ${isAdmin ? `<div id="indoorLogs"></div>` : ""}
  `;

  const notice = document.getElementById("indoorNotice");
  const statusRoot = document.getElementById("indoorStatus");
  const logsRoot = document.getElementById("indoorLogs");
  const statusBtn = document.getElementById("indoorStatusBtn");

  const loadStatus = async () => {
    try {
      const status = await api("/indoor-court/status");
      setNotice(notice, `${status?.status || "Indoor court status loaded"}`, "info");
      statusRoot.innerHTML = keyStatusMarkup(status, "Indoor Court");
      if (logsRoot) {
        logsRoot.innerHTML = keyLogMarkup(status?.logs || [], "Indoor Court Key Usage");
      }
    } catch (err) {
      setNotice(notice, err.message, "error");
    }
  };

  statusBtn.addEventListener("click", loadStatus);

  if (isAdmin) {
    const qrRoot = document.getElementById("indoorQr");
    (async () => {
      try {
        const qr = await api("/indoor-court/qr");
        qrRoot.innerHTML = permanentKeyQrMarkup(qr, "Indoor Court QR");
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
    })();
  }

  if (!isAdmin) {
    const scanBtn = document.getElementById("indoorScanBtn");
    const stopBtn = document.getElementById("indoorStopScanBtn");
    const video = document.getElementById("indoorScanVideo");

    const submitIndoorKey = async (qrData) => {
      try {
        const msg = await api("/indoor-court/scan", { method: "POST", body: { qrData } });
        setNotice(notice, typeof msg === "string" ? msg : "Indoor court action completed", "success");
        await loadStatus();
      } catch (err) {
        setNotice(notice, err.message, "error");
      }
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
        setNotice(notice, "Camera started. Scanning Indoor Court QR...", "info");

        await startAttendanceScanner(
          video,
          async (qrData) => {
            resetCameraButtons();
            await submitIndoorKey(qrData);
          },
          { onProgress: (message) => setNotice(notice, message, "info") }
        );
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

  loadStatus();
  checkAlerts();
  registerFeatureInterval(setInterval(checkAlerts, 45000));
}

function permanentKeyQrMarkup(qr, title) {
  const qrImage = qr?.qrImageDataUrl
    ? `<img src="${escapeHtml(qr.qrImageDataUrl)}" alt="${escapeHtml(title)}" />`
    : `<p>QR image is not available.</p>`;
  const qrData = escapeHtml(qr?.qrData || "-");
  return `
    <div class="key-qr-card">
      <div class="qr-preview">${qrImage}</div>
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>Permanent QR. It does not expire.</p>
        <span class="badge">${qrData}</span>
      </div>
    </div>
  `;
}

function keyStatusMarkup(status, label) {
  const activeHolder = status?.activeHolder || null;
  const isTaken = Number(status?.activeCount || 0) > 0;
  const holderText = activeHolder
    ? `${activeHolder.studentName || "-"} (${activeHolder.keyHolderRole || "-"})`
    : "No active holder";
  return `
    <div class="panel-lite">
      <h3>${escapeHtml(label)} Key Status</h3>
      <p><strong>${isTaken ? "Taken" : "Returned / Available"}</strong></p>
      <p>${escapeHtml(holderText)}</p>
    </div>
  `;
}

function keyLogMarkup(rows, heading) {
  if (!rows.length) return `<p>${heading}: No key usage data found.</p>`;

  const body = rows
    .map(
      (row) => `<tr>
        <td>${row.keyHolderRole || "-"}</td>
        <td>${row.studentName || "-"}</td>
        <td>${escapeHtml(formatReadableMinuteDateTime(row.openTime || row.OpenTime))}</td>
        <td>${escapeHtml(formatReadableMinuteDateTime(row.closeTime))}</td>
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
