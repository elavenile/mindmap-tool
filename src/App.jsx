import React, { useEffect } from 'react';
import MindMapCanvas from './components/MindMap/MindMapCanvas';
import ListView from './components/ListView/ListView';
import Sidebar from './components/Sidebar/Sidebar';
import Toolbar from './components/Toolbar/Toolbar';
import { useMindMapStore } from './store/mindMapStore';
import { useAppStore } from './store/appStore';

export default function App() {
    const currentMapId = useMindMapStore((s) => s.currentMapId);
    const newMap = useMindMapStore((s) => s.newMap);
    const undo = useMindMapStore((s) => s.undo);
    const redo = useMindMapStore((s) => s.redo);
    const toasts = useAppStore((s) => s.toasts);
    const viewMode = useAppStore((s) => s.viewMode);

    // Create a default map on first load
    useEffect(() => {
        if (!currentMapId) {
            newMap('My First Mind Map');
        }
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.target.contentEditable === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    return (
        <div className="app-container">
            {/* macOS-style title bar */}
            <div className="app-titlebar">
                <span>MindMap Tool</span>
            </div>

            {/* Toolbar */}
            <Toolbar />

            {/* Body: Sidebar + Canvas/List */}
            <div className="app-body">
                <Sidebar />

                {currentMapId ? (
                    viewMode === 'map' ? <MindMapCanvas /> : <ListView />
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧠</div>
                        <h3>Welcome to MindMap Tool</h3>
                        <p>Create a new mind map to start exploring and organizing your ideas.</p>
                        <button className="btn btn-primary" onClick={() => newMap('New Mind Map')}>
                            ＋ Create Mind Map
                        </button>
                    </div>
                )}
            </div>

            {/* Toasts */}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {t.type === 'success' && '✅ '}
                        {t.type === 'error' && '❌ '}
                        {t.type === 'info' && 'ℹ️ '}
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
