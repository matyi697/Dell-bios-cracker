const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  
  processFile: (file) => {
    let actualPath;
    if (webUtils && webUtils.getPathForFile) {
        actualPath = webUtils.getPathForFile(file);
    } else {
        actualPath = file.path;
    }
    
    ipcRenderer.send('start-processing', actualPath);
  },

  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, message) => callback(message));
  }
});
