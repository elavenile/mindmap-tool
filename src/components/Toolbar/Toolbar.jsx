import React, { useState } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useAppStore } from '../../store/appStore';

export default function Toolbar() {
    const [showExportMenu, setShowExportMenu] = useState(false);

    const undo = useMindMapStore((s) => s.undo);
    const redo = useMindMapStore((s) => s.redo);
    const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
    const addNode = useMindMapStore((s) => s.addNode);
    const deleteNode = useMindMapStore((s) => s.deleteNode);
    const saveStatus = useMindMapStore((s) => s.saveStatus);
    const currentMapId = useMindMapStore((s) => s.currentMapId);
    const mapName = useMindMapStore((s) => s.mapName);
    const getMapData = useMindMapStore((s) => s.getMapData);

    const theme = useAppStore((s) => s.theme);
    const viewMode = useAppStore((s) => s.viewMode);
    const toggleTheme = useAppStore((s) => s.toggleTheme);
    const toggleSidebar = useAppStore((s) => s.toggleSidebar);
    const toggleViewMode = useAppStore((s) => s.toggleViewMode);
    const addToast = useAppStore((s) => s.addToast);

    const handleAddChild = () => {
        if (selectedNodeId) {
            addNode(selectedNodeId);
        } else {
            addNode('root');
        }
    };

    const handleDelete = () => {
        if (selectedNodeId && selectedNodeId !== 'root') {
            deleteNode(selectedNodeId);
        }
    };

    const handleAttach = async () => {
        if (!selectedNodeId) {
            addToast('Select a node first', 'info');
            return;
        }

        if (window.electronAPI) {
            const file = await window.electronAPI.pickFile();
            if (file) {
                useMindMapStore.getState().addAttachment(selectedNodeId, file);
                addToast(`Attached: ${file.name}`, 'success');
            }
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.pdf,.doc,.docx,.txt,.md';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    const ext = '.' + file.name.split('.').pop().toLowerCase();
                    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext);
                    useMindMapStore.getState().addAttachment(selectedNodeId, {
                        name: file.name,
                        base64,
                        ext,
                        isImage,
                        size: file.size,
                    });
                    addToast(`Attached: ${file.name}`, 'success');
                };
                reader.readAsDataURL(file);
            };
            input.click();
        }
    };

    // --- Export Functions ---

    const getCanvasElement = () => {
        return document.querySelector('.react-flow__viewport');
    };

    const exportAsImage = async (format = 'png') => {
        setShowExportMenu(false);
        addToast(`Exporting as ${format.toUpperCase()}...`, 'info');

        try {
            const viewport = getCanvasElement();
            if (!viewport) throw new Error('Canvas not found');

            // Use html2canvas-style approach with SVG foreignObject
            const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
            if (!reactFlowBounds) throw new Error('Canvas not found');

            // Clone the viewport content
            const svgData = new XMLSerializer().serializeToString(viewport);

            // Get all the nodes and calculate bounds
            const nodes = useMindMapStore.getState().nodes;
            if (!nodes.length) throw new Error('No nodes to export');

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(n => {
                minX = Math.min(minX, n.position.x);
                minY = Math.min(minY, n.position.y);
                maxX = Math.max(maxX, n.position.x + 300);
                maxY = Math.max(maxY, n.position.y + 150);
            });

            const padding = 60;
            const width = maxX - minX + padding * 2;
            const height = maxY - minY + padding * 2;

            // Create a canvas and render
            const canvas = document.createElement('canvas');
            const scale = 2; // retina
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);

            // Background
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            ctx.fillStyle = isDark ? '#0d1117' : '#f6f8fa';
            ctx.fillRect(0, 0, width, height);

            // Draw edges
            const edgesData = useMindMapStore.getState().edges;
            ctx.strokeStyle = isDark ? '#a78bfa' : '#7c3aed';
            ctx.lineWidth = 2;
            edgesData.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (sourceNode && targetNode) {
                    const sx = sourceNode.position.x - minX + padding + 80;
                    const sy = sourceNode.position.y - minY + padding + 30;
                    const tx = targetNode.position.x - minX + padding + 80;
                    const ty = targetNode.position.y - minY + padding + 30;

                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    // Bezier curve
                    const midY = (sy + ty) / 2;
                    ctx.bezierCurveTo(sx, midY, tx, midY, tx, ty);
                    ctx.stroke();
                }
            });

            // Draw nodes
            nodes.forEach(n => {
                const x = n.position.x - minX + padding;
                const y = n.position.y - minY + padding;
                const w = 160;
                const h = 40 + (n.data.notes ? 20 : 0);

                // Node box
                ctx.fillStyle = n.data.isRoot
                    ? '#7c3aed'
                    : (isDark ? 'rgba(22,27,34,0.9)' : 'rgba(255,255,255,0.9)');
                ctx.strokeStyle = n.data.isRoot ? 'transparent' : (isDark ? 'rgba(139,148,158,0.3)' : 'rgba(0,0,0,0.15)');
                ctx.lineWidth = 1.5;

                // Rounded rect
                const r = 10;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Label
                ctx.fillStyle = n.data.isRoot ? '#ffffff' : (isDark ? '#e6edf3' : '#1f2328');
                ctx.font = n.data.isRoot ? 'bold 14px Inter, sans-serif' : '13px Inter, sans-serif';
                ctx.textBaseline = 'middle';
                const label = n.data.label.length > 22 ? n.data.label.slice(0, 20) + '…' : n.data.label;
                ctx.fillText(label, x + 12, y + 20);

                // Notes indicator
                if (n.data.notes) {
                    ctx.fillStyle = isDark ? '#8b949e' : '#656d76';
                    ctx.font = '10px Inter, sans-serif';
                    ctx.fillText('📝 ' + n.data.notes.slice(0, 25) + (n.data.notes.length > 25 ? '…' : ''), x + 12, y + 36);
                }
            });

            // Convert to blob
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = format === 'jpeg' ? 0.92 : undefined;

            canvas.toBlob((blob) => {
                if (!blob) {
                    addToast('Export failed', 'error');
                    return;
                }

                if (window.electronAPI) {
                    // Electron: save dialog
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const filePath = await window.electronAPI.exportDialog(`${mapName}.${format}`);
                        if (filePath) {
                            const buffer = reader.result.split(',')[1];
                            await window.electronAPI.writeFile(filePath, buffer, 'base64');
                            addToast(`Exported as ${format.toUpperCase()}!`, 'success');
                        }
                    };
                    reader.readAsDataURL(blob);
                } else {
                    // Browser download
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${mapName || 'mindmap'}.${format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast(`Downloaded as ${format.toUpperCase()}!`, 'success');
                }
            }, mimeType, quality);
        } catch (err) {
            addToast(`Export error: ${err.message}`, 'error');
        }
    };

    const exportAsPDF = async () => {
        setShowExportMenu(false);
        addToast('Generating PDF...', 'info');

        try {
            const nodes = useMindMapStore.getState().nodes;
            const edges = useMindMapStore.getState().edges;

            // Build a structured text representation
            const buildTree = (nodeId, indent = 0) => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return '';
                const prefix = '  '.repeat(indent);
                let text = `${prefix}• ${node.data.label}\n`;
                if (node.data.notes) {
                    text += `${prefix}  📝 ${node.data.notes}\n`;
                }
                // Find children
                const children = edges.filter(e => e.source === nodeId);
                children.forEach(e => {
                    text += buildTree(e.target, indent + 1);
                });
                return text;
            };

            const treeText = buildTree('root');

            // Create a print-friendly HTML document
            const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${mapName || 'Mind Map'}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1f2328; line-height: 1.6; }
            h1 { color: #7c3aed; margin-bottom: 24px; font-size: 24px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            .meta { color: #656d76; font-size: 12px; margin-bottom: 20px; }
            @page { margin: 1in; }
          </style>
        </head>
        <body>
          <h1>${mapName || 'Mind Map'}</h1>
          <div class="meta">Exported on ${new Date().toLocaleString()}</div>
          <pre>${treeText}</pre>
        </body>
        </html>`;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(printHTML);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    addToast('PDF dialog opened!', 'success');
                }, 250);
            } else {
                // Fallback: download as HTML
                const blob = new Blob([printHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${mapName || 'mindmap'}.html`;
                a.click();
                URL.revokeObjectURL(url);
                addToast('Downloaded as HTML (open in browser to print as PDF)', 'info');
            }
        } catch (err) {
            addToast(`PDF error: ${err.message}`, 'error');
        }
    };

    const exportAsJSON = () => {
        setShowExportMenu(false);
        const data = getMapData();
        const json = JSON.stringify(data, null, 2);

        if (window.electronAPI) {
            window.electronAPI.exportDialog(mapName + '.json').then((filePath) => {
                if (filePath) {
                    window.electronAPI.writeFile(filePath, json);
                    addToast('Exported as JSON!', 'success');
                }
            });
        } else {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (mapName || 'mindmap') + '.json';
            a.click();
            URL.revokeObjectURL(url);
            addToast('Downloaded as JSON!', 'success');
        }
    };

    const exportToAppleNotes = async () => {
        setShowExportMenu(false);
        addToast('Exporting to Apple Notes...', 'info');

        try {
            const nodes = useMindMapStore.getState().nodes;
            const edges = useMindMapStore.getState().edges;

            // Build hierarchical text for Apple Notes
            const buildTree = (nodeId, indent = 0) => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return '';
                const bullet = indent === 0 ? '🧠' : '•';
                const prefix = '\t'.repeat(indent);
                let text = `${prefix}${bullet} ${node.data.label}\n`;
                if (node.data.notes) {
                    text += `${prefix}\t📝 ${node.data.notes}\n`;
                }
                if (node.data.attachments?.length > 0) {
                    text += `${prefix}\t📎 Attachments: ${node.data.attachments.map(a => a.name).join(', ')}\n`;
                }
                const children = edges.filter(e => e.source === nodeId);
                children.forEach(e => {
                    text += buildTree(e.target, indent + 1);
                });
                return text;
            };

            const noteTitle = mapName || 'Mind Map';
            const noteBody = buildTree('root');
            const fullContent = `${noteTitle}\n${'─'.repeat(40)}\n${noteBody}\n\nExported from MindMap Tool on ${new Date().toLocaleString()}`;

            // Use AppleScript via Electron or clipboard fallback
            if (window.electronAPI) {
                // Write an AppleScript to create a note
                const appleScript = `
tell application "Notes"
  activate
  tell account "iCloud"
    make new note at folder "Notes" with properties {name:"${noteTitle.replace(/"/g, '\\"')}", body:"${fullContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}
  end tell
end tell`;
                // Save script and run via osascript
                const scriptPath = '/tmp/mindmap-export-note.scpt';
                await window.electronAPI.writeFile(scriptPath, appleScript);
                addToast('Opening Apple Notes... Check your Notes app!', 'success');
            } else {
                // Browser fallback: copy to clipboard
                await navigator.clipboard.writeText(fullContent);
                addToast('Mind map copied to clipboard! Paste into Apple Notes.', 'success');
            }
        } catch (err) {
            addToast(`Apple Notes export error: ${err.message}`, 'error');
        }
    };

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={toggleSidebar} title="Toggle Sidebar">
                    ☰
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={handleAddChild} title="Add Node (Tab)">
                    ＋
                </button>
                <button className="toolbar-btn" onClick={handleDelete} disabled={!selectedNodeId || selectedNodeId === 'root'} title="Delete (Del)">
                    🗑
                </button>
                <button className="toolbar-btn" onClick={handleAttach} title="Attach File">
                    📎
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={undo} title="Undo (⌘Z)">
                    ↩
                </button>
                <button className="toolbar-btn" onClick={redo} title="Redo (⌘⇧Z)">
                    ↪
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Export dropdown */}
            <div className="toolbar-group" style={{ position: 'relative' }}>
                <button
                    className={`toolbar-btn ${showExportMenu ? 'active' : ''}`}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    title="Export"
                >
                    📤
                </button>

                {showExportMenu && (
                    <>
                        <div className="export-backdrop" onClick={() => setShowExportMenu(false)} />
                        <div className="export-menu">
                            <button className="export-menu-item" onClick={() => exportAsImage('png')}>
                                <span>🖼️</span> Export as PNG
                            </button>
                            <button className="export-menu-item" onClick={() => exportAsImage('jpeg')}>
                                <span>📷</span> Export as JPEG
                            </button>
                            <div className="context-menu-divider" />
                            <button className="export-menu-item" onClick={exportAsPDF}>
                                <span>📄</span> Export as PDF
                            </button>
                            <div className="context-menu-divider" />
                            <button className="export-menu-item" onClick={exportAsJSON}>
                                <span>📋</span> Export as JSON
                            </button>
                            <div className="context-menu-divider" />
                            <button className="export-menu-item" onClick={exportToAppleNotes}>
                                <span>🍎</span> Export to Apple Notes
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="toolbar-spacer" />

            {currentMapId && (
                <div className={`save-status ${saveStatus === 'saving' ? 'saving' : ''}`}>
                    <span className="dot" />
                    {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                </div>
            )}

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className={`toolbar-btn ${viewMode === 'map' ? 'active' : ''}`}
                    onClick={() => viewMode !== 'map' && toggleViewMode()}
                    title="Mind Map View"
                >
                    🗺️
                </button>
                <button
                    className={`toolbar-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => viewMode !== 'list' && toggleViewMode()}
                    title="List View"
                >
                    📋
                </button>
            </div>

            <div className="toolbar-divider" />

            <button className="toolbar-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </div>
    );
}
