const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 👉 Carga desde tu servidor local con IP
  win.loadURL('http://192.168.101.72:5502/');
}

app.whenReady().then(createWindow);
