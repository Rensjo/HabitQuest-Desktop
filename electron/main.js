// electron/main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  // platform icon
  const iconPath =
    process.platform === 'darwin'
      ? path.join(__dirname, '..', 'assets', 'icon.icns')
      : path.join(__dirname, '..', 'assets', 'icon.png');

  // On macOS, set dock icon explicitly
  if (process.platform === 'darwin') {
    try { app.dock.setIcon(iconPath); } catch (_) {}
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b1220',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = path.join(__dirname, '..', 'app', 'index.html');
  if (!fs.existsSync(indexPath)) {
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <style>body{font-family:system-ui;background:#0b1220;color:#e5e7eb;padding:24px;line-height:1.5}</style>
      <h2>HabitQuest Desktop</h2>
      <p>Put your built web app in <code>/app</code> with an <code>index.html</code>.</p>
    `));
  } else {
    win.loadFile(indexPath);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/* ---------- persistence paths ---------- */
const userDataDir = app.getPath('userData');                  // e.g. %APPDATA%\HabitQuest
const dataPath    = path.join(userDataDir, 'data.json');

/* ---------- IPC: save/load ---------- */
ipcMain.on('save-data', (_event, data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
});

ipcMain.handle('load-data', async () => {
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return null;
});

/* ---------- IPC: factory reset ---------- */
ipcMain.handle('factory-reset', async () => {
  try {
    // wipe the whole app userData directory (safer than just deleting data.json)
    fs.rmSync(userDataDir, { recursive: true, force: true });
    return { ok: true };
  } catch (e) {
    console.error('Factory reset failed:', e);
    return { ok: false, error: String(e) };
  }
});

/* ---------- app lifecycle ---------- */
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
