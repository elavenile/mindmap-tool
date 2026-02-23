import React, { useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindMapNode from './MindMapNode';
import { useMindMapStore } from '../../store/mindMapStore';

const nodeTypes = { mindMapNode: MindMapNode };

const defaultEdgeOptions = {
    type: 'smoothstep',
    style: { stroke: 'var(--accent-secondary)', strokeWidth: 2 },
    animated: false,
};

export default function MindMapCanvas() {
    const reactFlowWrapper = useRef(null);

    const nodes = useMindMapStore((s) => s.nodes);
    const edges = useMindMapStore((s) => s.edges);
    const setEdges = useMindMapStore((s) => s.setEdges);
    const onNodesChange = useMindMapStore((s) => s.onNodesChange);
    const onEdgesChange = useMindMapStore((s) => s.onEdgesChange);
    const selectNode = useMindMapStore((s) => s.selectNode);
    const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
    const addNode = useMindMapStore((s) => s.addNode);
    const deleteNode = useMindMapStore((s) => s.deleteNode);

    const onConnect = useCallback(
        (params) => {
            const newEdge = {
                ...params,
                id: `e-${params.source}-${params.target}`,
                type: 'smoothstep',
                style: { stroke: 'var(--accent-secondary)', strokeWidth: 2 },
            };
            setEdges([...edges, newEdge]);
        },
        [edges, setEdges]
    );

    const onNodeClick = useCallback(
        (event, node) => {
            selectNode(node.id);
        },
        [selectNode]
    );

    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const onKeyDown = useCallback(
        (e) => {
            if (e.target.contentEditable === 'true') return;
            if (e.key === 'Tab' && selectedNodeId) {
                e.preventDefault();
                addNode(selectedNodeId);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
                e.preventDefault();
                deleteNode(selectedNodeId);
            }
        },
        [selectedNodeId, addNode, deleteNode]
    );

    return (
        <div
            className="canvas-container"
            ref={reactFlowWrapper}
            onKeyDown={onKeyDown}
            tabIndex={0}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.1}
                maxZoom={2}
                deleteKeyCode={null}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="var(--text-muted)"
                    style={{ opacity: 0.3 }}
                />
                <Controls
                    showInteractive={false}
                    position="bottom-right"
                />
            </ReactFlow>
        </div>
    );
}
