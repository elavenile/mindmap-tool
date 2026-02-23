import React, { useState, useCallback } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useAppStore } from '../../store/appStore';
import { suggestBranches } from '../../services/aiService';

export default function ListView() {
    const nodes = useMindMapStore((s) => s.nodes);
    const edges = useMindMapStore((s) => s.edges);
    const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
    const selectNode = useMindMapStore((s) => s.selectNode);
    const addNode = useMindMapStore((s) => s.addNode);
    const deleteNode = useMindMapStore((s) => s.deleteNode);
    const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);
    const updateNodeNotes = useMindMapStore((s) => s.updateNodeNotes);
    const updateNodeColor = useMindMapStore((s) => s.updateNodeColor);

    const aiProvider = useAppStore((s) => s.aiProvider);
    const getActiveApiKey = useAppStore((s) => s.getActiveApiKey);
    const addToast = useAppStore((s) => s.addToast);

    const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
    const [editingNodeId, setEditingNodeId] = useState(null);
    const [editingNotesId, setEditingNotesId] = useState(null);

    const toggleExpand = useCallback((nodeId) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const getChildren = useCallback((nodeId) => {
        return edges
            .filter((e) => e.source === nodeId)
            .map((e) => nodes.find((n) => n.id === e.target))
            .filter(Boolean);
    }, [nodes, edges]);

    const handleAddChild = useCallback((e, nodeId) => {
        e.stopPropagation();
        addNode(nodeId);
        setExpandedNodes((prev) => new Set(prev).add(nodeId));
        addToast('Node added', 'success');
    }, [addNode, addToast]);

    const handleDelete = useCallback((e, nodeId) => {
        e.stopPropagation();
        if (nodeId === 'root') return;
        deleteNode(nodeId);
        addToast('Node deleted', 'info');
    }, [deleteNode, addToast]);

    const handleLabelEdit = useCallback((nodeId, newLabel) => {
        updateNodeLabel(nodeId, newLabel.trim() || 'Untitled');
        setEditingNodeId(null);
    }, [updateNodeLabel]);

    const handleAISuggest = useCallback(async (e, nodeId) => {
        e.stopPropagation();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const apiKey = getActiveApiKey();
        if (!apiKey) {
            addToast('Set an API key first', 'error');
            return;
        }

        // Build parent path
        const path = [];
        let current = nodeId;
        while (current) {
            const n = nodes.find((nd) => nd.id === current);
            if (n) path.unshift(n.data.label);
            const edge = edges.find((e) => e.target === current);
            current = edge ? edge.source : null;
        }

        const childLabels = getChildren(nodeId).map((c) => c.data.label);

        try {
            addToast('Generating suggestions...', 'info');
            const results = await suggestBranches(aiProvider, apiKey, node.data.label, path.slice(0, -1), childLabels);
            results.forEach((label) => addNode(nodeId, label));
            setExpandedNodes((prev) => new Set(prev).add(nodeId));
            addToast(`Added ${results.length} ideas!`, 'success');
        } catch (err) {
            addToast(err.message, 'error');
        }
    }, [nodes, edges, aiProvider, getActiveApiKey, addNode, getChildren, addToast]);

    const colorLabels = {
        '': 'Default', blue: '🔵', purple: '🟣', green: '🟢',
        orange: '🟠', pink: '🩷', teal: '🩵',
    };

    const renderNode = (node, depth = 0) => {
        const children = getChildren(node.id);
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = children.length > 0;
        const isSelected = selectedNodeId === node.id;
        const isEditing = editingNodeId === node.id;
        const isEditingNotes = editingNotesId === node.id;

        return (
            <div key={node.id} className="list-node-wrapper">
                <div
                    className={`list-node ${isSelected ? 'selected' : ''} ${node.data.isRoot ? 'root' : ''} ${node.data.color ? `color-${node.data.color}` : ''}`}
                    style={{ paddingLeft: `${depth * 24 + 12}px` }}
                    onClick={() => selectNode(node.id)}
                >
                    {/* Expand/collapse toggle */}
                    <button
                        className={`list-expand-btn ${hasChildren ? '' : 'invisible'}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                    >
                        {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
                    </button>

                    {/* Color dot */}
                    {node.data.color && (
                        <span className="list-color-dot" style={{
                            background: node.data.color === 'blue' ? '#3b82f6' :
                                node.data.color === 'purple' ? '#8b5cf6' :
                                    node.data.color === 'green' ? '#22c55e' :
                                        node.data.color === 'orange' ? '#f59e0b' :
                                            node.data.color === 'pink' ? '#ec4899' :
                                                '#14b8a6'
                        }} />
                    )}

                    {/* Label */}
                    {isEditing ? (
                        <input
                            className="list-node-input"
                            defaultValue={node.data.label}
                            autoFocus
                            onBlur={(e) => handleLabelEdit(node.id, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleLabelEdit(node.id, e.target.value);
                                if (e.key === 'Escape') setEditingNodeId(null);
                                e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="list-node-label"
                            onDoubleClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
                        >
                            {node.data.isRoot ? '🧠 ' : ''}{node.data.label}
                        </span>
                    )}

                    {/* Node meta badges */}
                    {node.data.notes && (
                        <span className="list-node-badge notes" title={node.data.notes}>📝</span>
                    )}
                    {node.data.attachments?.length > 0 && (
                        <span className="list-node-badge">📎 {node.data.attachments.length}</span>
                    )}
                    {hasChildren && (
                        <span className="list-node-badge count">{children.length}</span>
                    )}

                    {/* Actions */}
                    <div className="list-node-actions">
                        <button onClick={(e) => handleAddChild(e, node.id)} title="Add child">+</button>
                        <button onClick={(e) => handleAISuggest(e, node.id)} title="AI Suggest">✨</button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditingNotesId(isEditingNotes ? null : node.id); }}
                            title="Notes"
                        >📝</button>
                        {!node.data.isRoot && (
                            <button onClick={(e) => handleDelete(e, node.id)} title="Delete" className="delete">×</button>
                        )}
                    </div>
                </div>

                {/* Inline notes editor */}
                {isEditingNotes && (
                    <div className="list-notes-editor" style={{ paddingLeft: `${depth * 24 + 44}px` }}>
                        <textarea
                            className="list-notes-textarea"
                            placeholder="Add notes..."
                            value={node.data.notes || ''}
                            onChange={(e) => updateNodeNotes(node.id, e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            rows={3}
                            autoFocus
                        />
                    </div>
                )}

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div className="list-children">
                        {children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const rootNode = nodes.find((n) => n.id === 'root');
    if (!rootNode) return null;

    return (
        <div className="list-view-container">
            <div className="list-view-header">
                <span>Outline View</span>
                <span className="list-view-count">{nodes.length} nodes</span>
            </div>
            <div className="list-view-content">
                {renderNode(rootNode)}
            </div>
        </div>
    );
}
