const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveMindmap: (id, data) => ipcRenderer.invoke('save-mindmap', { id, data }),
    loadMindmap: (id) => ipcRenderer.invoke('load-mindmap', { id }),
    listMindmaps: () => ipcRenderer.invoke('list-mindmaps'),
    deleteMindmap: (id) => ipcRenderer.invoke('delete-mindmap', { id }),
    pickFile: () => ipcRenderer.invoke('pick-file'),
    exportDialog: (defaultName) => ipcRenderer.invoke('export-dialog', { defaultName }),
    writeFile: (filePath, data, encoding) => ipcRenderer.invoke('write-file', { filePath, data, encoding }),
});
