const { app, BrowserWindow, shell, session, Menu, desktopCapturer, ipcMain, Tray, nativeImage, dialog } = require("electron");
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

// ---------------- Yap++ (auto-runs the mod when the app opens) ----------------
const YAP_FILE = path.join(__dirname, "yapplusplus.js");
const prefFile = path.join(app.getPath("userData"), "yap-prefs.json");

function readPrefs() {
  try { return JSON.parse(fs.readFileSync(prefFile, "utf8")); } catch { return {}; }
}
function writePrefs(patch) {
  try { fs.writeFileSync(prefFile, JSON.stringify({ ...readPrefs(), ...patch })); } catch {}
}
function yapEnabled() { return readPrefs().enabled !== false; }
function setYapEnabled(v) { writePrefs({ enabled: v }); }

async function injectYap(wc) {
  if (!yapEnabled() || wc.isDestroyed()) return;
  try {
    if (!new URL(wc.getURL()).hostname.endsWith("yapper.website")) return;
    if (await wc.executeJavaScript("!!window.__yapPlusLoaded")) return;
    await wc.executeJavaScript("window.__yapPlusLoaded = true;");
    await wc.executeJavaScript(fs.readFileSync(YAP_FILE, "utf8"));
  } catch (e) {
    console.error("[Yap++] inject failed:", e.message);
  }
}

// ---------------- Yap App (mod menu: themes, effects, window options, custom code) ----------------
const PANEL_CSS = `
.yap-btn{position:fixed;left:12px;bottom:12px;width:34px;height:34px;border-radius:50%;background:#ff6b3a;color:#fff;font:700 16px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483646;opacity:.5;user-select:none;box-shadow:0 2px 8px #0006}
.yap-btn:hover{opacity:1}
.yap-hide{display:none !important}
.yap-panel{position:fixed;left:12px;bottom:56px;width:330px;max-height:75vh;display:flex;flex-direction:column;background:#17181c;color:#eee;border:1px solid #333;border-radius:12px;z-index:2147483647;font:13px system-ui,sans-serif;box-shadow:0 8px 32px #000a;overflow:hidden}
.yap-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#1f2025;font-weight:700;font-size:14px}
.yap-x{cursor:pointer;opacity:.7;font-size:18px;line-height:1}
.yap-x:hover{opacity:1}
.yap-body{padding:6px 14px 14px;overflow-y:auto}
.yap-sec{margin:14px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ff6b3a;font-weight:700}
.yap-row{display:flex;justify-content:space-between;align-items:center;margin:6px 0}
.yap-row input[type=range]{width:100%;accent-color:#ff6b3a}
.yap-col{margin:6px 0}
.yap-val{opacity:.7;font-variant-numeric:tabular-nums}
.yap-tog{display:flex;align-items:center;gap:8px;margin:7px 0;cursor:pointer}
.yap-tog input{accent-color:#ff6b3a}
.yap-panel select,.yap-panel textarea{width:100%;box-sizing:border-box;background:#111214;color:#eee;border:1px solid #333;border-radius:6px;padding:6px;font:12px ui-monospace,Consolas,monospace}
.yap-panel textarea{height:90px;resize:vertical}
.yap-panel button{background:#ff6b3a;color:#fff;border:0;border-radius:6px;padding:6px 10px;margin:6px 6px 0 0;cursor:pointer;font:600 12px system-ui,sans-serif}
.yap-panel button.yap-ghost{background:#2a2b31}
.yap-note{opacity:.55;font-size:11px;margin-top:2px}
.yap-fx{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483644}
.yap-ripple{position:fixed;width:80px;height:80px;border-radius:50%;border:2px solid #ff6b3a;pointer-events:none;z-index:2147483645;animation:yapRipple .6s ease-out forwards}
@keyframes yapRipple{from{transform:translate(-50%,-50%) scale(0);opacity:.7}to{transform:translate(-50%,-50%) scale(1);opacity:0}}
`;

// Runs inside the Yapper page. Talks to the app through window.__yapQueue (polled by the main process).
function yapMenu() {
  if (window.__yapAppLoaded) return;
  window.__yapAppLoaded = true;

  const KEY = "yap_settings";
  const DEFAULTS = {
    brightness: 100, contrast: 100, saturation: 100, hue: 0, warmth: 0,
    font: "default", thinScroll: false, reduceMotion: false,
    trail: false, trailColor: "rainbow", snow: false, ripples: false,
    zoom: 100, opacity: 100, onTop: false, startup: false, startMinimized: false, showButton: true,
    customCss: "", customJs: "", runJs: false
  };
  let S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  window.__yapQueue = window.__yapQueue || [];
  const send = (c) => window.__yapQueue.push(c);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  // ----- CSS from settings (sent to the app, which injects it) -----
  const FONTS = {
    default: "", segoe: '"Segoe UI", sans-serif', arial: "Arial, sans-serif",
    comic: '"Comic Sans MS", cursive', consolas: "Consolas, monospace", georgia: "Georgia, serif"
  };
  function buildCss() {
    let css = "";
    const f = [];
    if (S.brightness !== 100) f.push("brightness(" + S.brightness + "%)");
    if (S.contrast !== 100) f.push("contrast(" + S.contrast + "%)");
    if (S.saturation !== 100) f.push("saturate(" + S.saturation + "%)");
    if (S.hue !== 0) f.push("hue-rotate(" + S.hue + "deg)");
    if (S.warmth !== 0) f.push("sepia(" + S.warmth + "%)");
    if (f.length) css += "html{filter:" + f.join(" ") + "}\n";
    if (FONTS[S.font]) {
      css += "body,body *:not(i):not(svg):not([class*=\"icon\" i]):not([class*=\"material\" i]){font-family:" + FONTS[S.font] + " !important}\n";
    }
    if (S.thinScroll) {
      css += "::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#888;border-radius:6px}::-webkit-scrollbar-track{background:transparent}\n";
    }
    if (S.reduceMotion) {
      css += "*,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important}\n";
    }
    return css + (S.customCss || "");
  }
  const pushCss = debounce(() => send({ type: "css", css: buildCss() }), 150);
  const pushNative = debounce(() => send({
    type: "native", zoom: S.zoom, opacity: S.opacity, onTop: S.onTop,
    startup: S.startup, startMinimized: S.startMinimized
  }), 200);

  // ----- effects -----
  const hueOf = (t) => (t / 4) % 360;
  const trailColor = (t) => {
    switch (S.trailColor) {
      case "pink": return "hsl(320,100%,65%)";
      case "cyan": return "hsl(185,100%,60%)";
      case "white": return "hsl(0,0%,100%)";
      case "orange": return "hsl(18,100%,60%)";
      default: return "hsl(" + hueOf(t) + ",100%,60%)";
    }
  };
  let trail = null;
  function trailOn() {
    if (trail) return;
    const c = el("canvas", "yap-fx");
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const pts = [];
    let raf = 0;
    const move = (e) => pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    const draw = (now) => {
      ctx.clearRect(0, 0, c.width, c.height);
      while (pts.length && now - pts[0].t > 600) pts.shift();
      for (const p of pts) {
        const age = (now - p.t) / 600;
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.fillStyle = trailColor(p.t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * (1 - age) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    addEventListener("mousemove", move);
    addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    trail = { stop() { cancelAnimationFrame(raf); removeEventListener("mousemove", move); removeEventListener("resize", resize); c.remove(); } };
  }
  function trailOff() { if (trail) { trail.stop(); trail = null; } }

  let snow = null;
  function snowOn() {
    if (snow) return;
    const c = el("canvas", "yap-fx");
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const flakes = Array.from({ length: 70 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: 1 + Math.random() * 2.5, s: 0.4 + Math.random() * 1.2, d: Math.random() * Math.PI * 2
    }));
    let raf = 0;
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (const f of flakes) {
        f.y += f.s; f.d += 0.02; f.x += Math.sin(f.d) * 0.5;
        if (f.y > c.height + 5) { f.y = -5; f.x = Math.random() * c.width; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    snow = { stop() { cancelAnimationFrame(raf); removeEventListener("resize", resize); c.remove(); } };
  }
  function snowOff() { if (snow) { snow.stop(); snow = null; } }

  document.addEventListener("click", (e) => {
    if (!S.ripples) return;
    const r = el("div", "yap-ripple");
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 650);
  }, true);

  function applyFx() {
    if (S.trail) { trailOff(); trailOn(); } else trailOff();
    if (S.snow) snowOn(); else snowOff();
  }

  // ----- panel -----
  const btn = el("div", "yap-btn", "Y");
  btn.title = "Yap App (Ctrl+Shift+M)";
  document.body.appendChild(btn);
  const panel = el("div", "yap-panel yap-hide");
  document.body.appendChild(panel);
  const toggle = () => panel.classList.toggle("yap-hide");
  window.__yapToggle = toggle;
  btn.onclick = toggle;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") panel.classList.add("yap-hide"); });

  function route(kind) {
    if (kind === "css") pushCss();
    else if (kind === "native") pushNative();
    else if (kind === "fx") applyFx();
  }

  function render() {
    panel.textContent = "";
    const head = el("div", "yap-head");
    head.appendChild(el("span", null, "Yap App"));
    const x = el("span", "yap-x", "\u00d7");
    x.onclick = () => panel.classList.add("yap-hide");
    head.appendChild(x);
    panel.appendChild(head);
    const body = el("div", "yap-body");
    panel.appendChild(body);

    const section = (t) => body.appendChild(el("div", "yap-sec", t));
    const slider = (key, label, min, max, unit, kind) => {
      const col = el("div", "yap-col");
      const row = el("div", "yap-row");
      row.appendChild(el("span", null, label));
      const val = el("span", "yap-val", S[key] + unit);
      row.appendChild(val);
      const inp = el("input");
      inp.type = "range"; inp.min = min; inp.max = max; inp.value = S[key];
      inp.oninput = () => { S[key] = Number(inp.value); val.textContent = S[key] + unit; save(); route(kind); };
      col.append(row, inp);
      body.appendChild(col);
    };
    const check = (key, label, kind, after) => {
      const t = el("label", "yap-tog");
      const cb = el("input");
      cb.type = "checkbox"; cb.checked = !!S[key];
      cb.onchange = () => { S[key] = cb.checked; save(); route(kind); if (after) after(); };
      t.append(cb, el("span", null, label));
      body.appendChild(t);
    };
    const select = (key, label, options, kind) => {
      const row = el("div", "yap-row");
      row.appendChild(el("span", null, label));
      const sel = el("select");
      sel.style.width = "55%";
      options.forEach(([v, name]) => { const o = el("option", null, name); o.value = v; sel.appendChild(o); });
      sel.value = S[key];
      sel.onchange = () => { S[key] = sel.value; save(); route(kind); };
      row.appendChild(sel);
      body.appendChild(row);
    };

    section("Appearance");
    slider("brightness", "Brightness", 50, 150, "%", "css");
    slider("contrast", "Contrast", 50, 150, "%", "css");
    slider("saturation", "Saturation", 0, 200, "%", "css");
    slider("hue", "Hue shift", 0, 360, "\u00b0", "css");
    slider("warmth", "Warm tint", 0, 60, "%", "css");
    select("font", "Font", [["default", "Default"], ["segoe", "Segoe UI"], ["arial", "Arial"], ["comic", "Comic Sans"], ["consolas", "Consolas"], ["georgia", "Georgia"]], "css");
    check("thinScroll", "Thin scrollbars", "css");
    check("reduceMotion", "Reduce motion", "css");

    section("Effects");
    check("trail", "Cursor trail", "fx");
    select("trailColor", "Trail color", [["rainbow", "Rainbow"], ["pink", "Pink"], ["cyan", "Cyan"], ["orange", "Orange"], ["white", "White"]], "fx");
    check("snow", "Falling snow", "fx");
    check("ripples", "Click ripples", "fx");

    section("Window");
    slider("zoom", "Zoom", 50, 200, "%", "native");
    slider("opacity", "Window opacity", 30, 100, "%", "native");
    check("onTop", "Always on top", "native");
    check("startup", "Launch when Windows starts", "native");
    check("startMinimized", "Start hidden in tray", "native");
    check("showButton", "Show the floating Y button", null, () => btn.classList.toggle("yap-hide", !S.showButton));
    body.appendChild(el("div", "yap-note", "Open this menu anytime with Ctrl+Shift+M."));

    section("Yap++");
    const t = el("label", "yap-tog");
    const cb = el("input");
    cb.type = "checkbox"; cb.checked = window.__yapPlusEnabled !== false;
    cb.onchange = () => send({ type: "yap", enabled: cb.checked });
    t.append(cb, el("span", null, "Enable Yap++ (reloads the app)"));
    body.appendChild(t);

    section("Custom CSS");
    const css = el("textarea");
    css.value = S.customCss; css.spellcheck = false;
    css.placeholder = "body { background: #000 !important; }";
    body.appendChild(css);
    const applyCss = el("button", null, "Apply CSS");
    applyCss.onclick = () => { S.customCss = css.value; save(); pushCss(); };
    body.appendChild(applyCss);

    section("Custom JavaScript");
    const js = el("textarea");
    js.value = S.customJs; js.spellcheck = false;
    js.placeholder = "console.log('hello from Yap App');";
    body.appendChild(js);
    const runJs = el("button", null, "Save & run now");
    runJs.onclick = () => { S.customJs = js.value; save(); send({ type: "js", code: js.value }); };
    body.appendChild(runJs);
    check("runJs", "Run it every time the app opens");
    body.appendChild(el("div", "yap-note", "Only paste code you trust. It has full access to your Yapper account."));

    const reset = el("button", "yap-ghost", "Reset everything");
    reset.onclick = () => { S = Object.assign({}, DEFAULTS); save(); applyAll(); render(); };
    body.appendChild(el("div", "yap-sec", ""));
    body.appendChild(reset);
  }

  function applyAll() {
    btn.classList.toggle("yap-hide", !S.showButton);
    pushCss();
    pushNative();
    applyFx();
  }

  render();
  applyAll();
}

// Handles requests sent from the menu inside the page.
let yapCssKey = null;
async function handleCmd(win, wc, c) {
  if (!c || typeof c !== "object") return;
  if (c.type === "css" && typeof c.css === "string" && c.css.length < 200000) {
    if (yapCssKey) { try { await wc.removeInsertedCSS(yapCssKey); } catch {} yapCssKey = null; }
    if (c.css.trim()) yapCssKey = await wc.insertCSS(c.css);
  } else if (c.type === "native") {
    const z = Number(c.zoom);
    if (z >= 50 && z <= 200) wc.setZoomFactor(z / 100);
    const o = Number(c.opacity);
    if (o >= 30 && o <= 100) win.setOpacity(o / 100);
    win.setAlwaysOnTop(!!c.onTop);
    if (app.isPackaged && app.getLoginItemSettings().openAtLogin !== !!c.startup) {
      app.setLoginItemSettings({ openAtLogin: !!c.startup });
    }
    if (readPrefs().startMinimized !== !!c.startMinimized) writePrefs({ startMinimized: !!c.startMinimized });
  } else if (c.type === "js" && typeof c.code === "string") {
    wc.executeJavaScript(c.code).catch((e) => console.error("[Yap App js]", e.message));
  } else if (c.type === "yap") {
    setYapEnabled(!!c.enabled);
    wc.reload();
  }
}

async function injectMenu(wc) {
  if (wc.isDestroyed()) return;
  try {
    if (!new URL(wc.getURL()).hostname.endsWith("yapper.website")) return;
    if (await wc.executeJavaScript("!!window.__yapAppLoaded")) return;
    yapCssKey = null;
    await wc.insertCSS(PANEL_CSS);
    await wc.executeJavaScript(`window.__yapPlusEnabled=${yapEnabled()};(${yapMenu.toString()})()`);
    const code = await wc.executeJavaScript(
      "(()=>{try{const s=JSON.parse(localStorage.getItem('yap_settings')||'{}');return s.runJs&&typeof s.customJs==='string'?s.customJs:''}catch(e){return ''}})()"
    );
    if (code && code.trim()) wc.executeJavaScript(code).catch((e) => console.error("[Yap App launch js]", e.message));
  } catch (e) {
    console.error("[Yap App] inject failed:", e.message);
  }
}

// ---------------- auto update (GitHub Releases) ----------------
let updater = null;
let manualCheck = false;

function setupAutoUpdate() {
  if (!app.isPackaged) return;
  try {
    updater = require("electron-updater").autoUpdater;
    updater.setFeedURL({ provider: "github", owner: "TGPG-Studios", repo: "Yapper-App-Unofficial-" });
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    updater.on("update-available", (i) => {
      if (manualCheck) dialog.showMessageBox({ type: "info", message: `Downloading Yapper ${i.version}...`, buttons: ["OK"] });
    });
    updater.on("update-not-available", () => {
      if (manualCheck) { manualCheck = false; dialog.showMessageBox({ type: "info", message: "You're on the latest version.", buttons: ["OK"] }); }
    });
    updater.on("update-downloaded", (i) => {
      manualCheck = false;
      dialog.showMessageBox({
        type: "info", title: "Yapper update", message: `Yapper ${i.version} is ready.`,
        detail: "Restart now to update, or it installs when you quit.",
        buttons: ["Restart now", "Later"], defaultId: 0, cancelId: 1
      }).then((r) => { if (r.response === 0) { isQuitting = true; updater.quitAndInstall(true, true); } });
    });
    updater.on("error", (e) => {
      console.error("[update]", e && e.message);
      if (manualCheck) {
        manualCheck = false;
        dialog.showMessageBox({ type: "warning", message: "Couldn't check for updates.", detail: String((e && e.message) || e).slice(0, 200), buttons: ["OK"] });
      }
    });

    updater.checkForUpdates().catch(() => {});
    setInterval(() => updater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
  } catch (e) {
    console.error("[update] setup failed:", e.message);
    updater = null;
  }
}

function checkForUpdates() {
  if (!updater) {
    dialog.showMessageBox({ type: "info", message: "Updates only work in the installed app.", buttons: ["OK"] });
    return;
  }
  manualCheck = true;
  updater.checkForUpdates().catch(() => { manualCheck = false; });
}

// ---------------- system tray ----------------
let mainWin = null;
let tray = null;
let isQuitting = false;
app.on("before-quit", () => { isQuitting = true; });

function showWindow() {
  if (!mainWin || mainWin.isDestroyed()) return createWindow();
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

function createTray() {
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, "icon.png")).resize({ width: 16, height: 16 });
    tray = new Tray(img);
    tray.setToolTip("Yapper v" + app.getVersion());
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Yapper v" + app.getVersion(), enabled: false },
      { label: "Open Yapper", click: showWindow },
      { label: "Check for updates", click: checkForUpdates },
      { type: "separator" },
      { label: "Quit", click: () => { isQuitting = true; app.quit(); } }
    ]));
    tray.on("click", showWindow);
  } catch (e) {
    console.error("[tray] failed:", e.message);
    tray = null;
  }
}

// ---------------- window ----------------
function createWindow() {
  const state = loadState();
  const startHidden = !!readPrefs().startMinimized && !!tray;
  const win = new BrowserWindow({
    ...state,
    show: !startHidden,
    minWidth: 400,
    minHeight: 500,
    title: "Yapper",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#111111",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  mainWin = win;
  if (state.maximized) win.maximize();
  win.loadURL(SITE);

  const wc = win.webContents;
  wc.on("did-finish-load", () => setTimeout(() => { injectYap(wc); injectMenu(wc); }, 1500));
  const poll = setInterval(async () => {
    if (wc.isDestroyed() || wc.isLoading()) return;
    try {
      const q = await wc.executeJavaScript("(()=>{const q=window.__yapQueue;window.__yapQueue=[];return q||[]})()");
      for (const c of q) await handleCmd(win, wc, c);
    } catch {}
  }, 500);
  win.on("closed", () => clearInterval(poll));
  wc.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key.toLowerCase();
    if (i.control && i.shift && k === "m") { wc.executeJavaScript("window.__yapToggle&&window.__yapToggle()").catch(() => {}); e.preventDefault(); return; }
    if (i.control && i.shift && k === "y") { setYapEnabled(!yapEnabled()); wc.reload(); e.preventDefault(); return; }
    if ((i.control && k === "r") || k === "f5") { wc.reload(); e.preventDefault(); }
    else if (k === "f12") { wc.toggleDevTools(); e.preventDefault(); }
  });

  win.on("close", (e) => {
    if (win.isDestroyed()) return;
    const b = win.getNormalBounds();
    fs.writeFileSync(stateFile, JSON.stringify({ ...b, maximized: win.isMaximized() }));
    if (!isQuitting && tray) { e.preventDefault(); win.hide(); }
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
  app.on("second-instance", showWindow);

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ALLOWED.includes(perm)));
    session.defaultSession.setPermissionCheckHandler((_wc, perm) => ALLOWED.includes(perm));
    setupScreenShare(session.defaultSession);
    Menu.setApplicationMenu(null);
    createTray();
    createWindow();
    setupAutoUpdate();
    app.on("activate", showWindow);
  });

  app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
}
