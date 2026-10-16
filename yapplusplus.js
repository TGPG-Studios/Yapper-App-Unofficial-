// YAP++
// the original yap++ was made by @salami on yapper.

// Feel free to learn from the code.
// If you wish to make a fork of yap++ Then make sure to include this:
// <h1>This tool is built on top of Yapp++ made by @salami on yapper.</h1>

// I'm a kid so the plugin might be a little immature.

// here you can read the source code of a function which enables a plugin.

console.log("wait 5 sec for it's ui to load (might freeze for 1-2 sec)")

const PluginHost = {
  plugins: [],
  listeners: [],
  register(plugin) {
    this.plugins.push(plugin);
    if (localStorage.getItem(`yapplus.plugin.${plugin.id}`) === '1') {
      try { plugin.start(); } catch (e) { console.error('[Yap++] start failed', plugin.id, e); }
    }
    this.listeners.forEach(fn => fn(plugin));
  },
  isEnabled(plugin) {
    return localStorage.getItem(`yapplus.plugin.${plugin.id}`) === '1';
  },
  setEnabled(plugin, on) {
    localStorage.setItem(`yapplus.plugin.${plugin.id}`, on ? '1' : '0');
    try {
      on ? plugin.start() : plugin.stop();
    } catch (e) { console.error('[Yap++] toggle failed', plugin.id, e); }
    this.listeners.forEach(fn => fn(plugin));
  },
  all() { return this.plugins.slice(); },
  onChange(fn) { this.listeners.push(fn); },
};

// You can read the plugins here allong with their source code:

const notyping = {
  id: 'notyping',
  name: 'SilentTyping',
  description: "So sigma and mysterious #alphawolf",
  origSend: null,
  start() {
    if (this.origSend) return;
    this.origSend = WebSocket.prototype.send;
    const orig = this.origSend;
    WebSocket.prototype.send = function (data) {
      try {
        if (typeof data === 'string') {
          const f = JSON.parse(data);
          if (f && f.type === 'typing') return; // swallow it wait no dont take it out of context lmaoo
        }
      } catch (e) {}
      return orig.call(this, data);
    };
  },
  stop() {
    if (this.origSend) {
      WebSocket.prototype.send = this.origSend;
      this.origSend = null;
    }
  },
};

const SIXSEVEN = {
  id: 'SIXSEVEN',
  name: 'SIXSEVEN',
  description: 'HIHI S-S-SIXSEVENNs (makes every message you send have 67)',
  origFetch: null,
  start() {
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isInsert = url.indexOf('/rest/v1/messages') !== -1
                    && init && init.method === 'POST';
      if (isInsert && init.body) {
        try {
          const body = JSON.parse(init.body);
          if (typeof body.content === 'string') {
            body.content = body.content + ' 67';
            init.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  },
  stop() {
    if (this.origFetch) {
      window.fetch = this.origFetch;
      this.origFetch = null;
    }
  },
};

const imasigma = {
  id: 'imasigma',
  name: 'Im a sigma',
  description: `Let's every one of your messages know that you're a sigma`,
  origFetch: null,
  start() {
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isInsert = url.indexOf('/rest/v1/messages') !== -1
                    && init && init.method === 'POST';
      if (isInsert && init.body) {
        try {
          const body = JSON.parse(init.body);
          if (typeof body.content === 'string') {
            body.content = body.content + ` \n* (I'm a sigma)`;
            init.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  },
  stop() {
    if (this.origFetch) {
      window.fetch = this.origFetch;
      this.origFetch = null;
    }
  },
};

// Commented out until this shitty shit works

// const funcommands = { 
//   id: 'funcommands',
//   name: 'Fun commands',
//   description: `Funny and usefull commands made by me!`,
//   origFetch: null,
//   start() {
//     if (!this.origFetch) this.origFetch = window.fetch;
//     const origFetch = this.origFetch;

//     window.fetch = function (input, init) {
//       const url = typeof input === 'string' ? input : (input && input.url) || '';
//       const isInsert = url.indexOf('/rest/v1/messages') !== -1
//                     && init && init.method === 'POST';
//       if (isInsert && init.body) {
//         try {
//           const body = JSON.parse(init.body);
//           if (typeof body.content === 'string') {
//             if (body.content.match("y/")) 
//               if (body.content === "y/test") {
//                 body.content = "test command"
//                 init.body = JSON.stringify(body);
//               }

//               if (body.content === "y/userid")
//                 body.content = `work in progress`
//                 init.body = JSON.stringify(body);

//               if (body.content.match("y/attention"))
//                 body.content = body.content.replace("y/attention ", "")
//                 body.content = `# ` + body.content
//                 init.body = JSON.stringify(body);
              
//               if (body.content.match("y/btw"))
//                 body.content = body.content.replace("y/btw ", "")
//                 body.content = `*` + body.content + `*`
//                 init.body = JSON.stringify(body);
//           }
//         } catch (e) {}
//       }
//       return origFetch.call(this, input, init);
//     };
//   },
//   stop() {
//     if (this.origFetch) {
//       window.fetch = this.origFetch;
//       this.origFetch = null;
//     }
//   },
// };

const messagelogger = {
  id: 'messagelogger',
  name: 'MessageLogger',
  description: 'You know how messages get deleted right? What if they became **red** instead? (HAS SOME BUGS!)',
  origFetch: null,
  origAddEventListener: null,
  STORAGE_KEY: 'yapplus.messagelog',
  domObserver: null,
  renderTimer: null,

  start() {
    const self = this;

    const css = document.createElement('style');
    css.id = 'yapplus-ghost-css';
    css.textContent = `
      [data-yp-ghost] .msg-text,
      [data-yp-ghost] .msg-text * { color: #ff4b4b !important; }
      [data-yp-ghost] .msg-author { color: #ff4b4b !important; }
    `;
    (document.head || document.documentElement).appendChild(css);

    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = (init && init.method) || 'GET';
      const isMessages = url.indexOf('/rest/v1/messages') !== -1;

      if (isMessages && method === 'POST' && init && init.body) {
        try {
          const body = JSON.parse(init.body);
          const tempKey = `local-${Date.now()}-${Math.random()}`;
          self.recordWithKey(tempKey, 'outgoing', {
            content: body.content,
            channel_id: body.channel_id,
            author_id: body.author_id,
            created_at: new Date().toISOString(),
          });
          const p = origFetch.call(this, input, init);
          p.then(r => {
            if (!r.ok) return;
            r.clone().json().then(row => {
              if (row && row.id) self.rekey(tempKey, row.id);
            }).catch(() => {});
          }).catch(() => {});
          return p;
        } catch (e) {}
      }

      if (isMessages && method === 'DELETE') {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        if (m) self.markDeleted(m[1], true);
      }

      if (isMessages && method === 'PATCH' && init && init.body) {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        try {
          const body = JSON.parse(init.body);
          if (m && body.content) self.markEdited(m[1], body.content);
        } catch (e) {}
      }

      if (isMessages && method === 'GET') {
        return origFetch.call(this, input, init).then(async (res) => {
          if (!res.ok) return res;
          try {
            const text = await res.text();
            const rows = JSON.parse(text);
            if (!Array.isArray(rows)) return new Response(text, res);
            const channelMatch = url.match(/channel_id=eq\.([0-9a-f-]+)/i);
            const channelId = channelMatch ? channelMatch[1] : null;
            if (channelId) {
              const log = self.load();
              const extras = Object.values(log).filter(r =>
                r.deleted && r.channel_id === channelId
              );
              for (const r of extras) {
                if (!rows.find(x => x.id === r.id)) {
                  rows.push(self.toSupabaseRow(r));
                }
              }
              rows.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            return new Response(JSON.stringify(rows), {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
            });
          } catch (e) {
            return res;
          }
        });
      }

      if (url.indexOf('/rest/v1/profiles') !== -1 ||
          url.indexOf('/rest/v1/users') !== -1 ||
          url.indexOf('who_online') !== -1) {
        return origFetch.call(this, input, init).then(res => {
          res.clone().json().then(rows => {
            if (Array.isArray(rows)) self.cacheAuthors(rows);
            else if (rows && typeof rows === 'object') self.cacheAuthors([rows]);
          }).catch(() => {});
          return res;
        });
      }

      return origFetch.call(this, input, init);
    };

    if (!this.origAddEventListener) {
      this.origAddEventListener = WebSocket.prototype.addEventListener;
    }
    const origAddEL = this.origAddEventListener;

    WebSocket.prototype.addEventListener = function (type, listener, options) {
      if (type !== 'message') return origAddEL.call(this, type, listener, options);
      const wrapped = function (ev) {
        try {
          const frame = JSON.parse(ev.data);
          const data = frame && frame.payload && frame.payload.data;
          if (data && data.table === 'messages') {
            const t = data.type || frame.event;
            if (t === 'INSERT') {
              self.record('incoming', data.record);
              self.scheduleGhostPaint();
            } else if (t === 'UPDATE') {
              self.markEdited(data.record.id, data.record.content);
            } else if (t === 'DELETE') {
              const old = data.old_record || data.old;
              if (old && old.id) self.markDeleted(old.id, true);
            }
          }
        } catch (e) {}
        return listener.call(this, ev);
      };
      return origAddEL.call(this, type, wrapped, options);
    };

    this.installGhostStrip();
    this.scheduleGhostPaint();
    console.log('[Messagelogger] armed');
  },

  stop() {
    if (this.origFetch) { window.fetch = this.origFetch; this.origFetch = null; }
    if (this.origAddEventListener) {
      WebSocket.prototype.addEventListener = this.origAddEventListener;
      this.origAddEventListener = null;
    }
    if (this.domObserver) { this.domObserver.disconnect(); this.domObserver = null; }
    if (this.renderTimer) { clearInterval(this.renderTimer); this.renderTimer = null; }
    clearTimeout(this._paintDebounce);
    clearTimeout(this._paintDebounce2);
    clearTimeout(this._paintDebounce3);
    const strip = document.getElementById('yapplus-ghost-strip');
    if (strip) strip.remove();
    const css = document.getElementById('yapplus-ghost-css');
    if (css) css.remove();
    console.log('[Messagelogger] disarmed');
  },

  load() {
    try { return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  },
  save(data) {
    const arr = Object.values(data).filter(r => r && r.created_at);
    while (arr.length > 500) {
      const oldest = arr.reduce((a, b) => a.created_at < b.created_at ? a : b);
      delete data[oldest.id || oldest.created_at];
    }
    try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); }
    catch (e) {}
  },

  cacheAuthors(rows) {
    const data = this.load();
    let changed = false;
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const id = r.id || r.user_id || r.author_id;
      if (!id) continue;
      const username = r.username || r.display_name || r.name || r.handle;
      const avatar = r.avatar_url || r.avatar || r.profile_picture || r.pfp;
      if (!username && !avatar) continue;
      data['__author__' + id] = { id, username, avatar };
      changed = true;
    }
    if (changed) this.save(data);
  },

  getAuthor(id) {
    const data = this.load();
    return data['__author__' + id] || null;
  },

  record(direction, row) {
    const key = row.id || `local-${Date.now()}-${Math.random()}`;
    this.recordWithKey(key, direction, row);
  },
  recordWithKey(key, direction, row) {
    const data = this.load();
    data[key] = {
      id: row.id || null,
      direction,
      content: row.content,
      channel_id: row.channel_id,
      author_id: row.author_id,
      created_at: row.created_at || new Date().toISOString(),
      deleted: false,
      edited: false,
    };
    if (row.author_id) {
      const cached = data['__author__' + row.author_id];
      if (cached) {
        data[key].author_username = cached.username;
        data[key].author_avatar = cached.avatar;
        data[key].author_avatar_style = cached.avatar_style;
      }
    }
    this.save(data);
  },
  rekey(oldKey, newId) {
    const data = this.load();
    if (!data[oldKey]) return;
    data[oldKey].id = newId;
    data[newId] = data[oldKey];
    delete data[oldKey];
    this.save(data);
  },
  markDeleted(id, toast) {
    const data = this.load();
    if (!data[id]) return false;
    if (data[id].deleted) return true;
    data[id].deleted = true;
    data[id].deleted_at = new Date().toISOString();
    this.save(data);
    if (toast) this.showToast(data[id]);
    this.scheduleGhostPaint();
    return true;
  },
  markEdited(id, newContent) {
    const data = this.load();
    if (!data[id]) return;
    if (!data[id].edits) data[id].edits = [];
    data[id].edits.push({ at: new Date().toISOString(), content: newContent });
    data[id].edited = true;
    this.save(data);
  },

  toSupabaseRow(r) {
    return {
      id: r.id,
      channel_id: r.channel_id,
      author_id: r.author_id,
      content: r.content,
      created_at: r.created_at,
      edited_at: null,
      attachment_path: null,
      attachment_width: null,
      attachment_height: null,
      reply_to_id: null,
      pinned_at: null,
      pinned_by: null,
    };
  },

  currentChannelId() {
    try {
      const url = location.href;
      const m = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) return m[1];
    } catch (e) {}
    try {
      const p = JSON.parse(localStorage.getItem('yapper:place') || '{}');
      return p.c || null;
    } catch (e) { return null; }
  },

  scheduleGhostPaint() {
    const self = this;
    clearTimeout(this._paintDebounce);
    clearTimeout(this._paintDebounce2);
    clearTimeout(this._paintDebounce3);
    this._paintDebounce = setTimeout(() => self.paintGhosts(), 60);
    this._paintDebounce2 = setTimeout(() => self.paintGhosts(), 250);
    this._paintDebounce3 = setTimeout(() => self.paintGhosts(), 800);
  },

  paintGhosts() {
    const list = document.querySelector('.messages');
    if (!list) return;
    const channelId = this.currentChannelId();
    if (!channelId) return;

    const log = this.load();
    const ghosts = Object.values(log).filter(r =>
      r && r.deleted && r.channel_id === channelId
    );

    list.querySelectorAll('[data-yp-ghost]').forEach(el => {
      const gid = el.getAttribute('data-message-id');
      if (!ghosts.find(g => g.id === gid)) el.remove();
    });

    for (const g of ghosts) {
      if (list.querySelector(`.msg[data-message-id="${g.id}"]`)) continue;
      const el = this.buildGhostEl(g);
      if (!el) continue;
      const realMsgs = [...list.querySelectorAll('.msg[data-message-id]')];
      let insertBefore = null;
      for (const real of realMsgs) {
        const id = real.getAttribute('data-message-id');
        const row = Object.values(log).find(r => r && r.id === id);
        if (row && row.created_at > g.created_at) { insertBefore = real; break; }
      }
      if (insertBefore && insertBefore.parentNode === list) {
        list.insertBefore(el, insertBefore);
      } else {
        list.appendChild(el);
      }
    }

    let dirty = false;
    const log2 = this.load();
    for (const g of ghosts) {
      if (g.author_username && g.author_avatar && g.author_avatar_style) continue;
      const real = list.querySelector(`.msg[data-message-id="${g.id}"]`);
      if (!real) continue;
      const authorEl = real.querySelector('.msg-author');
      const img = real.querySelector('.avatar img');
      if (authorEl && !g.author_username) {
        g.author_username = authorEl.textContent.trim();
        dirty = true;
      }
      if (img && !g.author_avatar) {
        g.author_avatar = img.getAttribute('src');
        g.author_avatar_style = img.getAttribute('style') || '';
        dirty = true;
      }
      if (g.author_id && (g.author_username || g.author_avatar)) {
        log2['__author__' + g.author_id] = {
          id: g.author_id,
          username: g.author_username,
          avatar: g.author_avatar,
          avatar_style: g.author_avatar_style,
        };
      }
      if (dirty) log2[g.id] = g;
    }
    if (dirty) this.save(log2);

    try {
      document.querySelectorAll('.msg[data-message-id]').forEach(el => {
        const id = el.getAttribute('data-message-id');
        const l = this.load();
        if (l[id] && l[id].deleted) {
          el.querySelectorAll('.msg-text, .msg-text *').forEach(n =>
            n.style.setProperty('color', '#ff4b4b', 'important'));
        }
      });
    } catch (e) {}
  },

  buildGhostEl(g) {
    const data = this.load();
    const cached = data['__author__' + g.author_id] || {};
    const username = (g.author_username || cached.username || 'deleted user') + ' (deleted)';
    const avatar = g.author_avatar || cached.avatar || null;
    const avatarStyle = g.author_avatar_style || cached.avatar_style || 'object-fit:cover;';

    const el = document.createElement('div');
    el.className = 'msg';
    el.setAttribute('data-yp-ghost', '1');
    el.setAttribute('data-message-id', g.id);
    el.style.background = 'transparent';

    const avatarHtml = avatar
      ? `<span class="avatar-clip" style="position:absolute;inset:0;border-radius:50%;overflow:hidden;"><img alt="" draggable="false" src="${this.escapeHtml(avatar)}" style="${this.escapeHtml(avatarStyle)}"></span>`
      : `<div style="width:40px;height:40px;border-radius:50%;background:#ff4b4b;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">?</div>`;

    el.innerHTML =
      `<div class="msg-gutter">` +
        `<button type="button" class="avatar" style="position:relative;width:40px;height:40px;background:transparent;padding:0;border:none;cursor:default;">${avatarHtml}</button>` +
      `</div>` +
      `<div class="msg-body">` +
        `<div class="msg-head">` +
          `<button class="msg-author" style="color:#ff4b4b;cursor:default;">${this.escapeHtml(username)}</button>` +
          `<span class="msg-time">${new Date(g.created_at).toLocaleTimeString()}</span>` +
        `</div>` +
        `<div class="msg-text" style="color:#ff4b4b !important;">${this.escapeHtml(g.content)}</div>` +
      `</div>` +
      `<div class="msg-actions"></div>`;
    return el;
  },

  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  installGhostStrip() {
    if (document.getElementById('yapplus-ghost-strip')) return;
    const self = this;

    const strip = document.createElement('div');
    strip.id = 'yapplus-ghost-strip';
    strip.style.cssText = 'padding:6px 16px;font-size:12px;color:#ff4b4b;background:rgba(255,75,75,0.08);border-top:1px solid rgba(255,75,75,0.2);cursor:pointer;display:none;user-select:none;';
    strip.addEventListener('click', () => {
      const l = document.getElementById('yapplus-ghost-list');
      if (l) l.style.display = l.style.display === 'none' ? 'block' : 'none';
    });

    const list = document.createElement('div');
    list.id = 'yapplus-ghost-list';
    list.style.cssText = 'display:none;max-height:200px;overflow-y:auto;padding:8px 16px;font-size:12px;background:rgba(255,75,75,0.04);border-top:1px solid rgba(255,75,75,0.15);color:#ffb3b3;';

    const attach = () => {
      const composer = document.querySelector('.composer');
      if (!composer || !composer.parentNode) return false;
      if (!document.getElementById('yapplus-ghost-strip')) {
        composer.parentNode.insertBefore(list, composer);
        composer.parentNode.insertBefore(strip, list);
      }
      return true;
    };

    if (!attach()) {
      const obs = new MutationObserver(() => {
        if (attach()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    this.renderTimer = setInterval(() => {
      const log = self.load();
      const channelId = self.currentChannelId();
      const items = Object.values(log).filter(r =>
        r && r.deleted && r.channel_id === channelId
      );
      if (items.length === 0) {
        strip.style.display = 'none';
        list.style.display = 'none';
        list.innerHTML = '';
        return;
      }
      strip.style.display = 'block';
      strip.textContent = `${items.length} deleted message${items.length === 1 ? '' : 's'} in this channel — click to view`;
      list.innerHTML = items
        .sort((a, b) => a.created_at < b.created_at ? 1 : -1)
        .map(r => {
          const cached = log['__author__' + r.author_id] || {};
          const name = r.author_username || cached.username || 'deleted user';
          return `<div style="margin-bottom:6px;"><span style="color:#ff8a8a;">${new Date(r.created_at).toLocaleString()}</span> &nbsp;·&nbsp; <b style="color:#ff6b6b;">${self.escapeHtml(name)}</b>: <span style="color:#ff4b4b;">${self.escapeHtml(r.content)}</span></div>`;
        })
        .join('');
    }, 1000);
  },

  showToast(row) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e1f22;border:1px solid rgba(255,75,75,0.4);border-left:3px solid #ff4b4b;color:#dbdee1;padding:10px 14px;border-radius:8px;font-size:13px;z-index:2147483647;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.5);';
    t.innerHTML = `<div style="color:#ff4b4b;font-weight:700;margin-bottom:4px;">message deleted</div><div style="color:#b5bac1;font-size:12px;margin-bottom:6px;">${new Date().toLocaleTimeString()}</div><div style="color:#ff4b4b;">${this.escapeHtml(row.content)}</div>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 8000);
  },
};


const staffbadge = {
  id: 'staffbadge',
  name: 'Staff Badge',
  description: 'A badge for yap++ contributors/staff/helpers/eventwinners.',
  BADGED: ['77ae11af', '1720334f', 'c5ccf56', 'c5ccf056', 'da302abc', 'baebe68c-8944-4738-aa41-40d67a018c62', 'c00c8a06-ec79-42ca-9b79-bfa3139a0d25'], 
  // HUMONGOUS IMAGE BUT IN TEXT. im forced to do ts because yap++ is just a script without files.
  BADGE_SRC: 'data:image/png;base64,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', 
  msgAuthor: new Map(), 
  unresolvable: new Set(), // ids that couldn't be foundd omg do better
  observer: null,
  origFetch: null,
  origAddEventListener: null,
  origOnMessage: null,
  paintTimer: null,
  healTimer: null,
  healInterval: null,
  token: null,

  isBadged(authorId) {
    if (!authorId) return false;
    const a = String(authorId).toLowerCase();
    return this.BADGED.some(p => a.startsWith(p));
  },

  remember(msgId, authorId) {
    if (msgId && authorId) this.msgAuthor.set(msgId, String(authorId).toLowerCase());
  },

  sniffToken(input, init) {
    try {
      let h = (init && init.headers) || (input && input.headers);
      if (!h) return;
      let auth = null;
      if (typeof Headers !== 'undefined' && h instanceof Headers) auth = h.get('authorization');
      else if (Array.isArray(h)) {
        const f = h.find(x => String(x[0]).toLowerCase() === 'authorization');
        auth = f && f[1];
      } else auth = h.authorization || h.Authorization;
      if (auth && auth.indexOf('Bearer ') === 0) this.token = auth.slice(7);
    } catch (e) {}
  },

  getToken() {
    if (this.token) return this.token;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) {
          try {
            let v = JSON.parse(localStorage.getItem(k));
            if (typeof v === 'string') v = JSON.parse(v);
            const t = v && (v.access_token || (v.currentSession && v.currentSession.access_token));
            if (t) { this.token = t; return t; }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return null;
  },

  start() {
    const self = this;

    // map messages -> author from fetch (history) and websocket (live)
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;
    window.fetch = function (input, init) {
      self.sniffToken(input, init);
      const p = origFetch.call(this, input, init);
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('/rest/v1/messages') !== -1) {
          p.then(res => {
            if (!res.ok) return;
            res.clone().json().then(rows => {
              if (Array.isArray(rows)) rows.forEach(r => self.remember(r.id, r.author_id));
              else if (rows && rows.id) self.remember(rows.id, rows.author_id);
              self.schedulePaint();
            }).catch(() => {});
          }).catch(() => {});
        }
        if (url.indexOf('/rest/v1/profiles') !== -1) self.schedulePaint();
      } catch (e) {}
      return p;
    };

    this.handleWs = function (raw) {
      try {
        const f = JSON.parse(raw);
        const p = f && (f.payload || f);
        const d = p && p.data;
        const rec = p.record || (d && d.record);
        const table = p.table || (d && d.table);
        if (rec && rec.id && rec.author_id && (!table || table === 'messages')) {
          self.remember(rec.id, rec.author_id);
          self.schedulePaint();
        }
      } catch (e) {}
    };

    if (!this.origAddEventListener) this.origAddEventListener = WebSocket.prototype.addEventListener;
    const origAddEL = this.origAddEventListener;
    WebSocket.prototype.addEventListener = function (type, listener, options) {
      if (type !== 'message') return origAddEL.call(this, type, listener, options);
      const wrapped = function (ev) {
        self.handleWs(ev.data);
        return listener.call(this, ev);
      };
      return origAddEL.call(this, type, wrapped, options);
    };

    // catch the annoying people who try to bypass it
    const onmsgDesc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
    if (onmsgDesc && onmsgDesc.set && !this.origOnMessage) {
      this.origOnMessage = onmsgDesc;
      Object.defineProperty(WebSocket.prototype, 'onmessage', {
        configurable: true,
        get() { return onmsgDesc.get.call(this); },
        set(fn) {
          const wrapped = function (ev) {
            self.handleWs(ev.data);
            return fn.call(this, ev);
          };
          return onmsgDesc.set.call(this, wrapped);
        },
      });
    }

    this.observer = new MutationObserver(() => self.schedulePaint());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.schedulePaint();
    this.backfill();
    this.healInterval = setInterval(() => self.heal(), 4000);
    console.log('[StaffBadge] armed');
  },

  async backfill() { // for anyone that goes through the code: this is the part it uses your token
    try {
      const loc = (location.href.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0];
      if (!loc) return;
      const token = this.getToken();
      if (!token) return;
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZmt1cXpkZHd2dGRvanpnbWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mzk0ODgsImV4cCI6MjEwNzIxNTQ4OH0.kMZcUf8DgMrYFNGtMPW9SGja2m1cRdMq5WJv5XBNgCU'; // universal token for yapper
      const res = await (this.origFetch || window.fetch)(
        `https://dnfkuqzddwvtdojzgmdm.supabase.co/rest/v1/messages?channel_id=eq.${loc}&select=id,author_id&order=created_at.desc&limit=200`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) rows.forEach(r => this.remember(r.id, r.author_id));
        this.schedulePaint();
      }
    } catch (e) {}
  },

  // self healing: for the people that tried to bypass it, we catch em too
  async heal() {
    if (this.healing) return;
    const missing = [];
    document.querySelectorAll('.msg[data-message-id]').forEach(el => {
      const id = el.getAttribute('data-message-id');
      if (id && !this.msgAuthor.has(id) && !this.unresolvable.has(id)) missing.push(id);
    });
    if (!missing.length) return;
    const token = this.getToken();
    if (!token) return;
    this.healing = true;
    try {
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZmt1cXpkZHd2dGRvanpnbWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mzk0ODgsImV4cCI6MjEwNzIxNTQ4OH0.kMZcUf8DgMrYFNGtMPW9SGja2m1cRdMq5WJv5XBNgCU'; // universal key again
      const batch = missing.slice(0, 150);
      const res = await (this.origFetch || window.fetch)(
        `https://dnfkuqzddwvtdojzgmdm.supabase.co/rest/v1/messages?id=in.(${batch.join(',')})&select=id,author_id`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        const found = new Set();
        if (Array.isArray(rows)) rows.forEach(r => { this.remember(r.id, r.author_id); found.add(r.id); });
        batch.forEach(id => { if (!found.has(id)) this.unresolvable.add(id); });
        this.schedulePaint();
      }
    } catch (e) {}
    this.healing = false;
  },

  stop() {
    if (this.origFetch) { window.fetch = this.origFetch; this.origFetch = null; }
    if (this.origAddEventListener) {
      WebSocket.prototype.addEventListener = this.origAddEventListener;
      this.origAddEventListener = null;
    }
    if (this.origOnMessage) {
      Object.defineProperty(WebSocket.prototype, 'onmessage', this.origOnMessage);
      this.origOnMessage = null;
    }
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
    clearInterval(this.healInterval);
    clearTimeout(this.paintTimer);
    document.querySelectorAll('.yp-staff-badge').forEach(el => el.remove());
    console.log('[StaffBadge] disarmed');
  },

  schedulePaint() {
    clearTimeout(this.paintTimer);
    this.paintTimer = setTimeout(() => this.paint(), 80);
  },

  injectCss() {
    if (document.getElementById('yp-staff-badge-css')) return;
    const css = document.createElement('style');
    css.id = 'yp-staff-badge-css';
    css.textContent = `
      .yp-staff-badge {
        height: 16px;
        width: 16px;
        border-radius: 50%;
        margin-left: 6px;
        vertical-align: -3px;
        align-self: center;
        object-fit: cover;
        box-shadow: 0 0 5px rgba(255, 0, 255, .55);
        pointer-events: none;
        user-select: none;
      }
    `;
    (document.head || document.documentElement).appendChild(css);
  },

  paint() {
    this.injectCss();
    document.querySelectorAll('.msg[data-message-id]').forEach(el => {
      const mid = el.getAttribute('data-message-id');
      const author = this.msgAuthor.get(mid);
      const name = el.querySelector('.msg-head .msg-author');
      if (!name) return;
      const head = name.parentNode;
      let existing = head.querySelector(':scope > .yp-staff-badge');
      if (author && this.isBadged(author)) {
        if (existing && existing.previousElementSibling === name) return;
        if (existing) existing.remove();
        const img = document.createElement('img');
        img.className = 'yp-staff-badge';
        img.src = this.BADGE_SRC;
        img.alt = 'Yap++';
        img.title = 'Yap++ Client';
        img.draggable = false;
        head.insertBefore(img, name.nextSibling);
      } else if (existing) {
        existing.remove();
      }
    });
  },
};

// badge on by default
if (localStorage.getItem('yapplus.plugin.staffbadge') === null) {
  localStorage.setItem('yapplus.plugin.staffbadge', '1');
}

const autoedit = {
  id: 'autoedit',
  name: 'Auto Edit',
  description: 'Whenever you send the top message, it edits to the bottom one,',
  origFetch: null,

  getCmd() {
    try { return (localStorage.getItem('yapplus.autoedit.cmd') || '').trim(); } catch (e) { return ''; }
  },

  getText() {
    try { return localStorage.getItem('yapplus.autoedit.text') || ''; } catch (e) { return ''; }
  },

  start() {
    const self = this;
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        const cmd = self.getCmd();
        if (cmd && method === 'POST' && url.indexOf('/rest/v1/messages') !== -1 && init && init.body) {
          let body = null;
          try { body = JSON.parse(init.body); } catch (e) {}
          if (body && typeof body.content === 'string' && body.content.trim().toLowerCase() === cmd.toLowerCase()) {
            const text = self.getText();
            const p = origFetch.call(this, input, init);
            p.then(res => {
              if (!res.ok) return;
              res.clone().json().then(row => {
                if (row && row.id) self.edit(row.id, text === '' ? ' ' : text, init);
              }).catch(() => {});
            }).catch(() => {});
            return p;
          }
        }
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
    console.log('[AutoEdit] armed');
  },

  edit(id, text, srcInit) {
    try {
      let headers = {};
      const h = srcInit && srcInit.headers;
      if (typeof Headers !== 'undefined' && h instanceof Headers) h.forEach((v, k) => { headers[k] = v; });
      else if (Array.isArray(h)) h.forEach(pair => { headers[pair[0]] = pair[1]; });
      else if (h) headers = Object.assign({}, h);
      headers['Content-Type'] = 'application/json';
      window.fetch(`https://dnfkuqzddwvtdojzgmdm.supabase.co/rest/v1/messages?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ content: text }),
      }).catch(() => {});
    } catch (e) {}
  },

  stop() {
    if (this.origFetch) { window.fetch = this.origFetch; this.origFetch = null; }
    console.log('[AutoEdit] disarmed');
  },
};

if (localStorage.getItem('yapplus.plugin.autoedit') === null) {
  localStorage.setItem('yapplus.plugin.autoedit', '1');
}







// HUGEE amount of space because scrolling past these humongously large plugins is torture






PluginHost.register(SIXSEVEN);
PluginHost.register(imasigma);
PluginHost.register(messagelogger);
PluginHost.register(staffbadge);
PluginHost.register(autoedit);
PluginHost.register(notyping);
// PluginHost.register(funcommands); // commented out until this shit works


















// and here you can read the actual yap++ menu injection itself

(function () {
  if (window.__yapplusInstalled) {
    console.log('Yap++ has already ordered a double big mac');
    return;
  }
  window.__yapplusInstalled = true;
  const NAV_ID = 'yapplus-nav-button';
  const PANEL_ID = 'yapplus-panel';

  const style = document.createElement('style'); // the CSS so it doesnt look like TRASH
  style.textContent = ` 
    #${NAV_ID} { color: #e27ed3; }
    #${PANEL_ID} { padding: 28px 40px; color: #dbdee1; line-height: 1.5; }
    #${PANEL_ID} h2 { margin: 0 0 18px; font-size: 20px; color: #fff; }
    #${PANEL_ID} a { color: #e27ed3; text-decoration: none; }
    #${PANEL_ID} a:hover { text-decoration: underline; }
    #${PANEL_ID} .yp-section { margin-bottom: 24px; }
    #${PANEL_ID} .yp-section h3 {
      font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
      color: #b5bac1; margin: 0 0 10px;
    }

    .yp-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }
    .yp-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .yp-slider {
      position: absolute;
      inset: 0;
      background: #4e5058;
      border-radius: 22px;
      transition: background .15s;
      cursor: pointer;
    }
    .yp-slider::before {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      top: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform .15s;
    }
    .yp-switch input:checked + .yp-slider { background: #e27ed3; }
    .yp-switch input:checked + .yp-slider::before { transform: translateX(18px); }

    .yp-plugin-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #2b2d31;
    }
    .yp-plugin-row:last-child { border-bottom: none; }
    .yp-plugin-name { font-weight: 600; color: #fff; }
    .yp-plugin-desc { font-size: 12px; color: #949ba4; margin-top: 2px; }
  `;
  document.head.appendChild(style);

  function buildPanel() {
    const p = document.createElement('div');
    p.id = PANEL_ID;
    p.innerHTML = `
      <h1>😼 • Yap++ </h1>
      <h2>The <b>Cutest</b> Client mod for yapper</h2>
      <p style="color: pink;">Tester build</p>

      <hr>
      <p></p>

      <h4>Quick tip!</h4>
      <p>If Yap++ hasn't updated yet, You can just use the up arrow key inside the console to automatically paste the latest yap++ version you used!! you don't have to copy it again everytime.<p>

      <div class="yp-section">
        <h3>Plugins</h3>
        <div id="yapplus-plugin-list"></div>
      </div>

      <div class="yp-section">
        <h3>Auto Edit</h3>
        <p style="font-size:12px;color:#949ba4;margin:0 0 8px;">Type the command and it get's autoreplaced!!!</p>
        <input id="yapplus-ae-cmd" type="text" placeholder="/command" autocomplete="off"
          style="width:100%;margin-bottom:8px;background:#1e1f22;border:1px solid #3f4147;border-radius:6px;color:#dbdee1;padding:8px 10px;font-size:14px;outline:none;box-sizing:border-box;">
        <input id="yapplus-ae-text" type="text" placeholder="text" autocomplete="off"
          style="width:100%;background:#1e1f22;border:1px solid #3f4147;border-radius:6px;color:#dbdee1;padding:8px 10px;font-size:14px;outline:none;box-sizing:border-box;">
      </div>

      <hr>

      <div class="yp-section">
        <h3>About</h3>
        <p>Thank you for using Yap++ ❤️</p>
        <p>Yapper: <b>salami</b></p>
        <p>YouTube: <a href="https://www.youtube.com/@sedesuu" target="_blank">@sedesuu</a></p>
        <p>Discord: <a href="https://discord.com/users/1384802116106719384" target="_blank">.salamidev</a></p>
        <p>Thank you to our biggest helper and Co-Owner too;</p>
        <p>I'm ofcourse talking about the goat @Lemon 🥹</p>

        <hr>
        <p></p>

        <div class="yp-section">
          <h3> Ethics </h3>
          <p> Yap++ Does <b>not</b> Save, Distribute, Or maliciously use your login tokens/login information. We want @Antic to notice and support us!</p>
        </div>
      </div>  
    `;

    const list = p.querySelector('#yapplus-plugin-list');

    function render() {
      list.innerHTML = '';
      PluginHost.all().forEach(plugin => {
        const row = document.createElement('div');
        row.className = 'yp-plugin-row';
        const info = document.createElement('div');
        info.innerHTML = `
          <div class="yp-plugin-name">${plugin.name}</div>
          <div class="yp-plugin-desc">${plugin.description || ''}</div>
        `;
        const label = document.createElement('label');
        label.className = 'yp-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = PluginHost.isEnabled(plugin);
        const slider = document.createElement('span');
        slider.className = 'yp-slider';
        label.appendChild(input);
        label.appendChild(slider);

        input.addEventListener('change', () => {
          PluginHost.setEnabled(plugin, input.checked);
        });
        row.appendChild(info);
        row.appendChild(label);
        list.appendChild(row);
      });
    }
    render();
    PluginHost.onChange(render);

    const aeCmd = p.querySelector('#yapplus-ae-cmd');
    const aeText = p.querySelector('#yapplus-ae-text');
    try {
      aeCmd.value = localStorage.getItem('yapplus.autoedit.cmd') || '';
      aeText.value = localStorage.getItem('yapplus.autoedit.text') || '';
    } catch (e) {}
    aeCmd.addEventListener('input', () => {
      try { localStorage.setItem('yapplus.autoedit.cmd', aeCmd.value); } catch (e) {}
    });
    aeText.addEventListener('input', () => {
      try { localStorage.setItem('yapplus.autoedit.text', aeText.value); } catch (e) {}
    });
    return p;
  }

  function inject() {
    if (document.getElementById(NAV_ID)) return;
    const nav  = document.querySelector('.settings-nav');
    const main = document.querySelector('.settings-main');
    if (!nav || !main) return;
    const btn = document.createElement('button');
    btn.id = NAV_ID;
    btn.textContent = '😼 Yap++';
    btn.addEventListener('click', () => {
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      main.innerHTML = '';
      main.appendChild(buildPanel());
    });
    nav.appendChild(btn);
    console.log('😼 Yap++ is HEREEEE BABEYYYY');
  }
  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  inject();
  console.log('yapp++ dabbed up the yapper gods n shi ');
})();