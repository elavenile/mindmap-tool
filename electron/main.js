import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        vibrancy: 'under-window',
        visualEffectState: 'active',
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // In development, load from Vite dev server
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

// Get the mindmaps directory
function getMindmapsDir() {
    const dir = path.join(app.getPath('userData'), 'mindmaps');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Save a mind map
ipcMain.handle('save-mindmap', async (event, { id, data }) => {
    const dir = getMindmapsDir();
    const filePath = path.join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true, path: filePath };
});

// Load a mind map
ipcMain.handle('load-mindmap', async (event, { id }) => {
    const dir = getMindmapsDir();
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return { success: true, data };
    }
    return { success: false };
});

// List all saved mind maps
ipcMain.handle('list-mindmaps', async () => {
    const dir = getMindmapsDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const maps = files.map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        return {
            id: path.basename(f, '.json'),
            name: data.name || 'Untitled',
            updatedAt: data.updatedAt || null,
            nodeCount: data.nodes?.length || 0,
        };
    });
    return maps.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});

// Delete a mind map
ipcMain.handle('delete-mindmap', async (event, { id }) => {
    const dir = getMindmapsDir();
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
    }
    return { success: false };
});

// Pick a file (images, PDFs, etc.)
ipcMain.handle('pick-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] },
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });
    if (result.canceled) return null;

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext);

    return {
        name: fileName,
        path: filePath,
        base64,
        ext,
        isImage,
        size: fileData.length,
    };
});

// Export mind map as PNG (placeholder — actual screenshot handled in renderer)
ipcMain.handle('export-dialog', async (event, { defaultName }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName || 'mindmap.json',
        filters: [
            { name: 'MindMap JSON', extensions: ['json'] },
            { name: 'PNG Image', extensions: ['png'] },
        ],
    });
    return result.canceled ? null : result.filePath;
});

ipcMain.handle('write-file', async (event, { filePath, data, encoding }) => {
    fs.writeFileSync(filePath, data, encoding || 'utf-8');
    return { success: true };
});
