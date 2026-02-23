import React, { useCallback, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useAppStore } from '../../store/appStore';
import { suggestBranches } from '../../services/aiService';

const COLORS = [
    { name: 'default', className: '' },
    { name: 'blue', className: 'color-blue' },
    { name: 'purple', className: 'color-purple' },
    { name: 'green', className: 'color-green' },
    { name: 'orange', className: 'color-orange' },
    { name: 'pink', className: 'color-pink' },
    { name: 'teal', className: 'color-teal' },
];

export default function MindMapNode({ id, data, selected }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const labelRef = useRef(null);
    const notesRef = useRef(null);

    const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);
    const updateNodeColor = useMindMapStore((s) => s.updateNodeColor);
    const updateNodeNotes = useMindMapStore((s) => s.updateNodeNotes);
    const addNode = useMindMapStore((s) => s.addNode);
    const deleteNode = useMindMapStore((s) => s.deleteNode);
    const selectNode = useMindMapStore((s) => s.selectNode);
    const nodes = useMindMapStore((s) => s.nodes);
    const edges = useMindMapStore((s) => s.edges);

    const aiProvider = useAppStore((s) => s.aiProvider);
    const getActiveApiKey = useAppStore((s) => s.getActiveApiKey);
    const addToast = useAppStore((s) => s.addToast);

    const handleDoubleClick = useCallback((e) => {
        e.stopPropagation();
        setIsEditing(true);
        selectNode(id);
        setTimeout(() => {
            if (labelRef.current) {
                labelRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(labelRef.current);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 0);
    }, [id, selectNode]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (labelRef.current) {
            updateNodeLabel(id, labelRef.current.innerText.trim() || 'Untitled');
        }
    }, [id, updateNodeLabel]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
        }
        e.stopPropagation();
    }, [handleBlur]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        selectNode(id);
    }, [id, selectNode]);

    const handleAddChild = useCallback((e) => {
        e.stopPropagation();
        addNode(id);
    }, [id, addNode]);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        deleteNode(id);
    }, [id, deleteNode]);

    const handleColorChange = useCallback((color) => {
        updateNodeColor(id, color);
    }, [id, updateNodeColor]);

    // Notes handling
    const handleNotesToggle = useCallback((e) => {
        e.stopPropagation();
        setShowNotes((prev) => !prev);
        if (!showNotes) {
            setTimeout(() => notesRef.current?.focus(), 50);
        }
    }, [showNotes]);

    const handleNotesChange = useCallback((e) => {
        e.stopPropagation();
        updateNodeNotes(id, e.target.value);
    }, [id, updateNodeNotes]);

    // AI Suggestions directly from node
    const handleAISuggest = useCallback(async (e) => {
        e.stopPropagation();
        const apiKey = getActiveApiKey();
        if (!apiKey) {
            addToast('Please set an API key in the sidebar', 'error');
            return;
        }

        // Build parent path
        const path = [];
        let current = id;
        while (current) {
            const n = nodes.find((nd) => nd.id === current);
            if (n) path.unshift(n.data.label);
            const edge = edges.find((e) => e.target === current);
            current = edge ? edge.source : null;
        }

        // Get sibling labels
        const parentEdge = edges.find((e) => e.target === id);
        const parentId = parentEdge ? parentEdge.source : id;
        const siblingEdges = edges.filter((e) => e.source === parentId);
        const siblingLabels = siblingEdges
            .map((e) => nodes.find((n) => n.id === e.target)?.data.label)
            .filter(Boolean);

        setAiLoading(true);
        setSuggestions([]);

        try {
            const results = await suggestBranches(aiProvider, apiKey, data.label, path.slice(0, -1), siblingLabels);
            setSuggestions(results);
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setAiLoading(false);
        }
    }, [id, data.label, nodes, edges, aiProvider, getActiveApiKey, addToast]);

    const handleAddSuggestion = useCallback((e, text) => {
        e.stopPropagation();
        addNode(id, text);
        setSuggestions((prev) => prev.filter((s) => s !== text));
        addToast(`Added: "${text}"`, 'success');
    }, [id, addNode, addToast]);

    const handleDismissSuggestions = useCallback((e) => {
        e.stopPropagation();
        setSuggestions([]);
    }, []);

    const nodeClassName = [
        'mindmap-node',
        data.isRoot ? 'root-node' : '',
        data.color ? `color-${data.color}` : '',
        selected ? 'selected' : '',
        'node-appear',
    ].filter(Boolean).join(' ');

    const hasNotes = data.notes && data.notes.trim().length > 0;

    return (
        <div className={nodeClassName} onClick={handleClick}>
            <Handle type="target" position={Position.Top} />
            <Handle type="target" position={Position.Left} />

            {/* Action buttons */}
            <div className="node-actions">
                <button className="node-action-btn" onClick={handleAddChild} title="Add child">+</button>
                <button className="node-action-btn ai-action" onClick={handleAISuggest} title="AI Suggest" disabled={aiLoading}>
                    {aiLoading ? '⏳' : '✨'}
                </button>
                <button className="node-action-btn" onClick={handleNotesToggle} title="Notes">
                    {hasNotes ? '📝' : '📄'}
                </button>
                {!data.isRoot && (
                    <button className="node-action-btn delete" onClick={handleDelete} title="Delete">×</button>
                )}
            </div>

            <div className="node-content">
                <div
                    ref={labelRef}
                    className="node-label"
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onDoubleClick={handleDoubleClick}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                >
                    {data.label}
                </div>

                {/* Notes indicator (collapsed) */}
                {hasNotes && !showNotes && (
                    <div className="node-notes-preview" onClick={handleNotesToggle}>
                        📝 {data.notes.slice(0, 40)}{data.notes.length > 40 ? '…' : ''}
                    </div>
                )}

                {/* Notes editor (expanded) */}
                {showNotes && (
                    <div className="node-notes-section" onClick={(e) => e.stopPropagation()}>
                        <textarea
                            ref={notesRef}
                            className="node-notes-textarea"
                            placeholder="Add notes here..."
                            value={data.notes || ''}
                            onChange={handleNotesChange}
                            onKeyDown={(e) => e.stopPropagation()}
                            onFocus={() => setIsEditingNotes(true)}
                            onBlur={() => setIsEditingNotes(false)}
                            rows={3}
                        />
                    </div>
                )}

                {/* Attachments */}
                {data.attachments && data.attachments.length > 0 && (
                    <div className="node-attachments">
                        {data.attachments.map((att, i) => (
                            <div key={i} className="node-attachment-chip">
                                {att.isImage ? (
                                    <img src={`data:image/${att.ext.replace('.', '')};base64,${att.base64}`} alt={att.name} />
                                ) : (
                                    <span>📎</span>
                                )}
                                <span>{att.name.length > 12 ? att.name.slice(0, 10) + '…' : att.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Suggestions dropdown */}
            {suggestions.length > 0 && (
                <div className="node-suggestions-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="node-suggestions-header">
                        <span>✨ Suggestions</span>
                        <button className="node-suggestions-close" onClick={handleDismissSuggestions}>×</button>
                    </div>
                    {suggestions.map((text, i) => (
                        <div
                            key={i}
                            className="node-suggestion-item"
                            onClick={(e) => handleAddSuggestion(e, text)}
                        >
                            <span>{text}</span>
                            <span className="node-suggestion-add">+ Add</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Color picker */}
            {!data.isRoot && (
                <div className="node-color-picker">
                    {COLORS.map((c) => (
                        <div
                            key={c.name}
                            className={`color-dot c-${c.name} ${data.color === c.name || (!data.color && c.name === 'default') ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleColorChange(c.name === 'default' ? '' : c.name); }}
                        />
                    ))}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
}
