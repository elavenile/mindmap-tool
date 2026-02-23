import React, { useState, useEffect, useCallback } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useAppStore } from '../../store/appStore';
import { suggestBranches, AI_PROVIDERS } from '../../services/aiService';

export default function Sidebar() {
    const [maps, setMaps] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [showNewMapModal, setShowNewMapModal] = useState(false);
    const [newMapName, setNewMapName] = useState('');

    const sidebarOpen = useAppStore((s) => s.sidebarOpen);
    const aiProvider = useAppStore((s) => s.aiProvider);
    const apiKeys = useAppStore((s) => s.apiKeys);
    const setAiProvider = useAppStore((s) => s.setAiProvider);
    const setApiKey = useAppStore((s) => s.setApiKey);
    const getActiveApiKey = useAppStore((s) => s.getActiveApiKey);
    const addToast = useAppStore((s) => s.addToast);

    const currentMapId = useMindMapStore((s) => s.currentMapId);
    const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
    const nodes = useMindMapStore((s) => s.nodes);
    const edges = useMindMapStore((s) => s.edges);
    const newMap = useMindMapStore((s) => s.newMap);
    const loadMap = useMindMapStore((s) => s.loadMap);
    const addNode = useMindMapStore((s) => s.addNode);
    const getMapData = useMindMapStore((s) => s.getMapData);
    const setSaveStatus = useMindMapStore((s) => s.setSaveStatus);

    // Load map list
    const refreshMaps = useCallback(async () => {
        if (window.electronAPI) {
            const list = await window.electronAPI.listMindmaps();
            setMaps(list);
        } else {
            const saved = JSON.parse(localStorage.getItem('mindmaps-list') || '[]');
            setMaps(saved);
        }
    }, []);

    useEffect(() => {
        refreshMaps();
    }, [refreshMaps]);

    // Auto-save
    useEffect(() => {
        if (!currentMapId) return;
        const timer = setTimeout(async () => {
            const data = getMapData();
            setSaveStatus('saving');
            if (window.electronAPI) {
                await window.electronAPI.saveMindmap(currentMapId, data);
            } else {
                localStorage.setItem(`mindmap-${currentMapId}`, JSON.stringify(data));
                const list = JSON.parse(localStorage.getItem('mindmaps-list') || '[]');
                const exists = list.find((m) => m.id === currentMapId);
                if (exists) {
                    exists.name = data.name;
                    exists.updatedAt = data.updatedAt;
                    exists.nodeCount = data.nodes.length;
                } else {
                    list.push({ id: currentMapId, name: data.name, updatedAt: data.updatedAt, nodeCount: data.nodes.length });
                }
                localStorage.setItem('mindmaps-list', JSON.stringify(list));
            }
            setSaveStatus('saved');
            refreshMaps();
        }, 2000);
        return () => clearTimeout(timer);
    }, [currentMapId, nodes, edges]);

    // Create new map
    const handleNewMap = () => {
        const name = newMapName.trim() || 'Untitled Mind Map';
        newMap(name);
        setShowNewMapModal(false);
        setNewMapName('');
        addToast('New mind map created!', 'success');
        setTimeout(refreshMaps, 500);
    };

    // Open a map
    const handleOpenMap = async (mapId) => {
        let data;
        if (window.electronAPI) {
            const result = await window.electronAPI.loadMindmap(mapId);
            if (result.success) data = result.data;
        } else {
            data = JSON.parse(localStorage.getItem(`mindmap-${mapId}`) || 'null');
        }
        if (data) {
            loadMap(mapId, data);
            setSuggestions([]);
        }
    };

    // Delete a map
    const handleDeleteMap = async (e, mapId) => {
        e.stopPropagation();
        if (window.electronAPI) {
            await window.electronAPI.deleteMindmap(mapId);
        } else {
            localStorage.removeItem(`mindmap-${mapId}`);
            const list = JSON.parse(localStorage.getItem('mindmaps-list') || '[]').filter((m) => m.id !== mapId);
            localStorage.setItem('mindmaps-list', JSON.stringify(list));
        }
        if (mapId === currentMapId) {
            newMap();
        }
        refreshMaps();
        addToast('Mind map deleted', 'info');
    };

    // AI Suggest from sidebar
    const handleSuggest = async () => {
        if (!selectedNodeId) return;
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (!node) return;

        const apiKey = getActiveApiKey();
        if (!apiKey) {
            addToast(`Set your ${aiProvider} API key first`, 'error');
            return;
        }

        // Build parent path
        const path = [];
        let current = selectedNodeId;
        while (current) {
            const n = nodes.find((nd) => nd.id === current);
            if (n) path.unshift(n.data.label);
            const edge = edges.find((e) => e.target === current);
            current = edge ? edge.source : null;
        }

        // Get sibling labels
        const siblingEdges = edges.filter((e) => e.source === (edges.find((e2) => e2.target === selectedNodeId)?.source || selectedNodeId));
        const siblingLabels = siblingEdges
            .map((e) => nodes.find((n) => n.id === e.target)?.data.label)
            .filter(Boolean);

        setAiLoading(true);
        setSuggestions([]);

        try {
            const results = await suggestBranches(aiProvider, apiKey, node.data.label, path.slice(0, -1), siblingLabels);
            setSuggestions(results);
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setAiLoading(false);
        }
    };

    // Add suggestion as node
    const handleAddSuggestion = (text) => {
        if (selectedNodeId) {
            addNode(selectedNodeId, text);
            setSuggestions((prev) => prev.filter((s) => s !== text));
            addToast(`Added: "${text}"`, 'success');
        }
    };

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    const activeKey = apiKeys[aiProvider] || '';

    return (
        <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            {/* Header */}
            <div className="sidebar-header">
                <h2>🧠 MindMap</h2>
            </div>

            {/* AI Provider & API Key */}
            <div className="api-key-section">
                <label className="api-key-label">AI Provider</label>
                <div className="ai-provider-tabs">
                    {AI_PROVIDERS.map((p) => (
                        <button
                            key={p.id}
                            className={`ai-provider-tab ${aiProvider === p.id ? 'active' : ''}`}
                            onClick={() => setAiProvider(p.id)}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                <label className="api-key-label" style={{ marginTop: 8 }}>
                    {AI_PROVIDERS.find((p) => p.id === aiProvider)?.name} API Key
                </label>
                <input
                    type="password"
                    className="api-key-input"
                    placeholder={AI_PROVIDERS.find((p) => p.id === aiProvider)?.placeholder || 'Enter API key...'}
                    value={activeKey}
                    onChange={(e) => setApiKey(aiProvider, e.target.value)}
                />
            </div>

            {/* Map list */}
            <div className="sidebar-section">
                <div className="sidebar-section-title">Mind Maps</div>
                <button className="new-map-btn" onClick={() => setShowNewMapModal(true)}>
                    <span>＋</span> New Mind Map
                </button>

                <ul className="map-list" style={{ marginTop: 8 }}>
                    {maps.map((m) => (
                        <li
                            key={m.id}
                            className={`map-list-item ${m.id === currentMapId ? 'active' : ''}`}
                            onClick={() => handleOpenMap(m.id)}
                        >
                            <div>
                                <div className="map-name">{m.name}</div>
                                <div className="map-meta">{m.nodeCount} nodes</div>
                            </div>
                            <button className="delete-btn" onClick={(e) => handleDeleteMap(e, m.id)}>🗑</button>
                        </li>
                    ))}
                    {maps.length === 0 && (
                        <li style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                            No saved maps yet
                        </li>
                    )}
                </ul>
            </div>

            {/* AI Suggestions */}
            <div className="ai-panel">
                <div className="ai-panel-title">
                    <span className="sparkle">✨</span> AI Suggestions
                </div>

                {selectedNode ? (
                    <>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Selected: <strong>{selectedNode.data.label}</strong>
                        </div>
                        <button
                            className="ai-suggest-btn"
                            onClick={handleSuggest}
                            disabled={aiLoading || !activeKey}
                        >
                            {aiLoading ? (
                                <>⏳ Thinking...</>
                            ) : (
                                <>✨ Suggest Ideas ({AI_PROVIDERS.find((p) => p.id === aiProvider)?.name})</>
                            )}
                        </button>
                    </>
                ) : (
                    <div className="ai-no-selection">
                        Select a node to get AI-powered branch suggestions. You can also click ✨ on any node directly.
                    </div>
                )}

                {aiLoading && (
                    <div className="ai-loading">
                        <div className="ai-loading-bar" />
                        <div className="ai-loading-bar" style={{ width: '80%' }} />
                        <div className="ai-loading-bar" style={{ width: '60%' }} />
                    </div>
                )}

                <div className="ai-suggestions-list">
                    {suggestions.map((text, i) => (
                        <div
                            key={i}
                            className="ai-suggestion-card"
                            style={{ animationDelay: `${i * 0.05}s` }}
                            onClick={() => handleAddSuggestion(text)}
                        >
                            <div className="suggestion-text">{text}</div>
                            <div className="suggestion-add">Click to add as branch →</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* New Map Modal */}
            {showNewMapModal && (
                <div className="modal-overlay" onClick={() => setShowNewMapModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>New Mind Map</h3>
                        <input
                            type="text"
                            placeholder="Enter a topic or central idea..."
                            value={newMapName}
                            onChange={(e) => setNewMapName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNewMap()}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowNewMapModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleNewMap}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
