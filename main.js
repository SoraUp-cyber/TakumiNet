const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 🔹 Permite recargar en desarrollo sin reiniciar manualmente
try {
  require('electron-reloader')(module);
} catch (_) {}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true, // Permite usar Node.js en renderer
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'img', 'logo.png') // opcional
  });

  mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));

  // mainWindow.webContents.openDevTools(); // Solo para depuración
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// =======================================
// 🔹 IPC para login
// =======================================
ipcMain.handle('login', async (event, { username, password }) => {
  try {
    const res = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    return data; // Devuelve al renderer {ok:true, token, user}
  } catch (err) {
    console.error('Error login:', err);
    return { ok: false, error: 'No se pudo conectar al servidor' };
  }
});

// =======================================
// 🔹 IPC para obtener perfil
// =======================================
ipcMain.handle('getPerfil', async (event, token) => {
  try {
    const res = await fetch('http://localhost:3001/api/perfil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data; // Devuelve {ok:true, usuario}
  } catch (err) {
    console.error('Error perfil:', err);
    return { ok: false, error: 'No se pudo obtener el perfil' };
  }
});
