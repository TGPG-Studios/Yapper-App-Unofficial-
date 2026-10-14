// Puts icon.png onto dist/win-unpacked/Yapper.exe so pinned/shortcut icons aren't Electron's.
const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico");
const ResEdit = require("resedit");

(async () => {
  const exePath = path.join(__dirname, "dist", "win-unpacked", "Yapper.exe");
  const ico = await pngToIco(path.join(__dirname, "icon.png"));

  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(ico);
  const icons = iconFile.icons.map((i) => i.data);

  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const targets = groups.length ? groups : [{ id: 1, lang: 1033 }];
  targets.forEach((g) =>
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, icons)
  );

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log("Icon added to", exePath);
})().catch((e) => { console.error(e); process.exit(1); });
