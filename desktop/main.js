const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
if (!app.requestSingleInstanceLock()) app.quit();
function createWindow() {
  const win = new BrowserWindow({ width: 1366, height: 860, minWidth: 1024, minHeight: 640, backgroundColor: '#eef3fc', title: 'CoreStay People', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(['geolocation', 'media'].includes(permission)));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
