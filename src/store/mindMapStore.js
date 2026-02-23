import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_NODE = {
    id: 'root',
    type: 'mindMapNode',
    position: { x: 400, y: 300 },
    data: {
        label: 'Central Idea',
        color: '',
        isRoot: true,
        attachments: [],
        notes: '',
    },
};

const createMindMapStore = (set, get) => ({
    // Current map
    currentMapId: null,
    mapName: 'Untitled Mind Map',
    nodes: [INITIAL_NODE],
    edges: [],

    // History for undo/redo
    history: [{ nodes: [INITIAL_NODE], edges: [] }],
    historyIndex: 0,

    // Selection
    selectedNodeId: null,

    // Save status
    saveStatus: 'saved', // 'saved' | 'saving' | 'unsaved'

    // ------ Node operations ------

    setNodes: (nodes) => set({ nodes, saveStatus: 'unsaved' }),
    setEdges: (edges) => set({ edges, saveStatus: 'unsaved' }),

    onNodesChange: (changes) => {
        const { nodes } = get();
        // Apply position changes
        const updated = nodes.map((node) => {
            const change = changes.find((c) => c.id === node.id);
            if (!change) return node;
            if (change.type === 'position' && change.position) {
                return { ...node, position: change.position };
            }
            if (change.type === 'select') {
                return node; // handled separately
            }
            if (change.type === 'remove') {
                return null;
            }
            return node;
        }).filter(Boolean);
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    onEdgesChange: (changes) => {
        const { edges } = get();
        const updated = edges.filter((edge) => {
            const removeChange = changes.find((c) => c.type === 'remove' && c.id === edge.id);
            return !removeChange;
        });
        set({ edges: updated, saveStatus: 'unsaved' });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    addNode: (parentId, label = 'New Idea', color = '') => {
        const { nodes, edges } = get();
        const parent = nodes.find((n) => n.id === parentId);
        if (!parent) return;

        // Calculate position offset from parent
        const childCount = edges.filter((e) => e.source === parentId).length;
        const angle = (childCount * 45 + 30) * (Math.PI / 180);
        const distance = 200;
        const position = {
            x: parent.position.x + Math.cos(angle) * distance,
            y: parent.position.y + Math.sin(angle) * distance,
        };

        const newId = uuidv4();
        const newNode = {
            id: newId,
            type: 'mindMapNode',
            position,
            data: { label, color, isRoot: false, attachments: [], notes: '' },
        };
        const newEdge = {
            id: `e-${parentId}-${newId}`,
            source: parentId,
            target: newId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'var(--accent-secondary)', strokeWidth: 2 },
        };

        const newNodes = [...nodes, newNode];
        const newEdges = [...edges, newEdge];
        set({ nodes: newNodes, edges: newEdges, saveStatus: 'unsaved' });
        get().pushHistory(newNodes, newEdges);
        return newId;
    },

    deleteNode: (nodeId) => {
        if (nodeId === 'root') return; // Don't delete root
        const { nodes, edges } = get();

        // Find all descendant nodes
        const toDelete = new Set();
        const findDescendants = (id) => {
            toDelete.add(id);
            edges.filter((e) => e.source === id).forEach((e) => findDescendants(e.target));
        };
        findDescendants(nodeId);

        const newNodes = nodes.filter((n) => !toDelete.has(n.id));
        const newEdges = edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
        set({ nodes: newNodes, edges: newEdges, selectedNodeId: null, saveStatus: 'unsaved' });
        get().pushHistory(newNodes, newEdges);
    },

    updateNodeLabel: (nodeId, label) => {
        const { nodes } = get();
        const updated = nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        );
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    updateNodeColor: (nodeId, color) => {
        const { nodes } = get();
        const updated = nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, color } } : n
        );
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    updateNodeNotes: (nodeId, notes) => {
        const { nodes } = get();
        const updated = nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, notes } } : n
        );
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    addAttachment: (nodeId, attachment) => {
        const { nodes } = get();
        const updated = nodes.map((n) => {
            if (n.id !== nodeId) return n;
            return {
                ...n,
                data: {
                    ...n.data,
                    attachments: [...(n.data.attachments || []), attachment],
                },
            };
        });
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    removeAttachment: (nodeId, attachmentIndex) => {
        const { nodes } = get();
        const updated = nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const attachments = [...n.data.attachments];
            attachments.splice(attachmentIndex, 1);
            return { ...n, data: { ...n.data, attachments } };
        });
        set({ nodes: updated, saveStatus: 'unsaved' });
    },

    // ------ History ------

    pushHistory: (nodes, edges) => {
        const { history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },

    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const prev = history[historyIndex - 1];
        set({
            nodes: JSON.parse(JSON.stringify(prev.nodes)),
            edges: JSON.parse(JSON.stringify(prev.edges)),
            historyIndex: historyIndex - 1,
            saveStatus: 'unsaved',
        });
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const next = history[historyIndex + 1];
        set({
            nodes: JSON.parse(JSON.stringify(next.nodes)),
            edges: JSON.parse(JSON.stringify(next.edges)),
            historyIndex: historyIndex + 1,
            saveStatus: 'unsaved',
        });
    },

    // ------ Map management ------

    setMapName: (name) => set({ mapName: name, saveStatus: 'unsaved' }),

    newMap: (name = 'Untitled Mind Map') => {
        const id = uuidv4();
        const nodes = [{
            ...INITIAL_NODE,
            data: { ...INITIAL_NODE.data, label: name },
        }];
        set({
            currentMapId: id,
            mapName: name,
            nodes,
            edges: [],
            history: [{ nodes, edges: [] }],
            historyIndex: 0,
            selectedNodeId: null,
            saveStatus: 'unsaved',
        });
        return id;
    },

    loadMap: (id, data) => {
        set({
            currentMapId: id,
            mapName: data.name || 'Untitled',
            nodes: data.nodes || [INITIAL_NODE],
            edges: data.edges || [],
            history: [{ nodes: data.nodes || [INITIAL_NODE], edges: data.edges || [] }],
            historyIndex: 0,
            selectedNodeId: null,
            saveStatus: 'saved',
        });
    },

    getMapData: () => {
        const { mapName, nodes, edges } = get();
        return {
            name: mapName,
            nodes,
            edges,
            updatedAt: new Date().toISOString(),
        };
    },

    setSaveStatus: (status) => set({ saveStatus: status }),
});

export const useMindMapStore = create(createMindMapStore);
