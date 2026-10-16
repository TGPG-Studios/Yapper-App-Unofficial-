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
// REGISTER SO IT LIKE ACTUALLY APPEARS IN PLUGINS YESSSSSS WE NEED 67 PLUGINNN YEASSSSS
// humongous amount of newlines so i can navigate to ts (phack you messagelogger)

const staffbadge = {
  id: 'staffbadge',
  name: 'Staff Badge',
  description: 'Shows the Yap++ badge next to staff members (client-side only — only Yap++ users see it).',
  BADGED: ['77ae11af', '1720334f', 'c5ccf56', 'c5ccf056'], // thos unbelievably long base64 is the data of the badge image but in text.
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
PluginHost.register(messagelogger);
PluginHost.register(imasigma);
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