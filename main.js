const { app, BrowserWindow, shell, session, Menu, desktopCapturer, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const SITE = "https://yapper.website";

const stateFile = path.join(app.getPath("userData"), "window-state.json");
const ALLOWED = ["media", "display-capture", "notifications", "clipboard-sanitized-write", "fullscreen"];

function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); }
  catch { return { width: 1200, height: 800 }; }
}

// ---------------- screen share ----------------
const PICKER_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,sans-serif;background:#111;color:#eee}
header{padding:14px 18px;font-size:16px;font-weight:600;background:#1b1b1b}
h2{font-size:12px;text-transform:uppercase;opacity:.6;margin:14px 18px 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:0 18px}
.item{background:#1b1b1b;border:2px solid transparent;border-radius:8px;padding:8px;cursor:pointer}
.item:hover{border-color:#ff6b3a}
.item img{width:100%;border-radius:4px;display:block;background:#000}
.item div{margin-top:6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
footer{position:fixed;bottom:0;left:0;right:0;padding:10px 18px;background:#1b1b1b;font-size:13px}
main{padding-bottom:50px}
</style></head><body>
<header>Choose what to share</header><main id="main"></main>
<footer><label><input type="checkbox" id="audio"> Share system audio (Windows)</label></footer>
<script>
const { ipcRenderer } = require("electron");
(async () => {
  const items = await ipcRenderer.invoke("picker:list");
  const main = document.getElementById("main");
  const section = (title, list) => {
    if (!list.length) return;
    const h = document.createElement("h2"); h.textContent = title; main.appendChild(h);
    const g = document.createElement("div"); g.className = "grid"; main.appendChild(g);
    list.forEach((s) => {
      const d = document.createElement("div"); d.className = "item";
      const img = document.createElement("img"); img.src = s.thumb;
      const n = document.createElement("div"); n.textContent = s.name;
      d.append(img, n);
      d.onclick = () => ipcRenderer.send("picker:choose", s.id, document.getElementById("audio").checked);
      g.appendChild(d);
    });
  };
  section("Screens", items.filter((s) => s.screen));
  section("Windows", items.filter((s) => !s.screen));
})();
</script></body></html>`;

let pickerList = [];
let pickerDone = null;
ipcMain.handle("picker:list", () => pickerList);
ipcMain.on("picker:choose", (_e, id, audio) => pickerDone && pickerDone(id, audio));

function pickSource(parent, sources) {
  return new Promise((resolve, reject) => {
    pickerList = sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumb: s.thumbnail.isEmpty() ? "" : s.thumbnail.toDataURL(),
      screen: s.id.startsWith("screen:")
    }));
    const pw = new BrowserWindow({
      parent, modal: !!parent, width: 780, height: 560, title: "Share your screen",
      autoHideMenuBar: true, backgroundColor: "#111111", minimizable: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    pw.setMenu(null);
    let finished = false;
    const finish = (id, audio) => {
      if (finished) return;
      finished = true;
      pickerDone = null;
      const src = sources.find((s) => s.id === id) || null;
      if (!pw.isDestroyed()) pw.close();
      resolve(src ? { src, audio: !!audio } : null);
    };
    pickerDone = finish;
    pw.on("closed", () => finish(null));
    pw.webContents.on("did-fail-load", (_e, _code, desc) => {
      if (finished) return;
      finished = true;
      pickerDone = null;
      if (!pw.isDestroyed()) pw.destroy();
      reject(new Error("picker failed to load: " + desc));
    });
    pw.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(PICKER_HTML));
  });
}

function setupScreenShare(ses) {
  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    let sources = [];
    try {
      sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 320, height: 200 }
      });
    } catch (e) {
      console.error("[screenshare] getSources failed:", e.message);
      return callback({});
    }
    if (!sources.length) return callback({});

    let picked;
    try {
      const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      picked = await pickSource(parent, sources);
    } catch (e) {
      console.error("[screenshare] picker error, using primary screen:", e.message);
      const first = sources.find((s) => s.id.startsWith("screen:")) || sources[0];
      picked = { src: first, audio: false };
    }
    if (!picked) return callback({}); // cancelled

    const streams = { video: picked.src };
    if (picked.audio && request.audioRequested && process.platform === "win32") streams.audio = "loopback";
    callback(streams);
  });
}

// ---------------- window ----------------
function createWindow() {
  const state = loadState();
  const win = new BrowserWindow({
    ...state,
    minWidth: 400,
    minHeight: 500,
    title: "Yapper",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#111111",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  if (state.maximized) win.maximize();
  win.loadURL(SITE);

  const wc = win.webContents;
  wc.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key.toLowerCase();
    if ((i.control && k === "r") || k === "f5") { wc.reload(); e.preventDefault(); }
    else if (k === "f12") { wc.toggleDevTools(); e.preventDefault(); }
  });

  win.on("close", () => {
    if (win.isDestroyed()) return;
    const b = win.getNormalBounds();
    fs.writeFileSync(stateFile, JSON.stringify({ ...b, maximized: win.isMaximized() }));
  });

  const isYapper = (u) => { try { return new URL(u).hostname.endsWith("yapper.website"); } catch { return false; } };
  wc.setWindowOpenHandler(({ url }) => {
    if (isYapper(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (e, url) => {
    if (!isYapper(url)) { e.preventDefault(); shell.openExternal(url); }
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ALLOWED.includes(perm)));
    session.defaultSession.setPermissionCheckHandler((_wc, perm) => ALLOWED.includes(perm));
    setupScreenShare(session.defaultSession);
    Menu.setApplicationMenu(null);
    createWindow();
    app.on("activate", () => BrowserWindow.getAllWindows().length || createWindow());
  });

  app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
}
