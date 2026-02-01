'use client';

import React, { useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, NodeTypes, BackgroundVariant, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TopologyBuilderNode from './nodes/TopologyBuilderNode';

const nodeTypes: NodeTypes = {
  device: TopologyBuilderNode,
  input: TopologyBuilderNode,
  mcu: TopologyBuilderNode,
  gateway: TopologyBuilderNode,
  // Fallback for any unknown types
  default: TopologyBuilderNode,
};

interface TopologyCanvasProps {
  nodes: any[];
  edges: any[];
}

export default function TopologyCanvas({ nodes: initialNodes }: TopologyCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track selection manually to preserve it during refreshes
  // We use a ref to hold the latest selection state
  const selectionRef = useRef<Set<string>>(new Set());

  // Update selection ref whenever nodes change (user interaction)
  useEffect(() => {
    // Only update if we have nodes (avoid clearing on init)
    if (nodes.length > 0) {
        // Clear and rebuild based on current state
        selectionRef.current.clear();
        nodes.forEach(n => {
            if (n.selected) selectionRef.current.add(n.id);
        });
    }
  }, [nodes]);

  useEffect(() => {
    if (!initialNodes.length) return;

    // --- Custom Hierarchy Layout Algorithm ---
    // 1. Find the Center Node (Gateway/Server) -> Left Side
    let centerNodeId = initialNodes.find(n => n.type === 'input' || n.id.toLowerCase().includes('gateway') || n.id === 'homeforge-gateway')?.id;
    
    // Fallback if no specific type
    if (!centerNodeId && initialNodes.length > 0) centerNodeId = initialNodes[0].id;

    // 2. Separate
    const centerNode = initialNodes.find(n => n.id === centerNodeId);
    const satellites = initialNodes.filter(n => n.id !== centerNodeId);

    // 3. Calculate Positions
    // Server at Left
    const serverX = 0;
    const serverY = 0;
    
    const layoutedNodes = [];
    const layoutedEdges: any[] = [];

    // Place Center (Server)
    if (centerNode) {
      layoutedNodes.push({
        ...centerNode,
        type: 'gateway', 
        selected: selectionRef.current.has(centerNode.id), // Restore selection
        position: { x: serverX, y: serverY }, 
        data: { ...centerNode.data, label: centerNode.data?.label || 'Gateway' },
        style: { width: 'auto', background: 'transparent', border: 'none' },
      });
    }

    // Place Satellites (Devices) in a column to the right
    const childXOffset = 450; 
    const childSpacingY = 180; // Increased to 180px
    
    const totalHeight = satellites.length * childSpacingY;
    const startY = serverY - (totalHeight / 2) + (childSpacingY / 2);

    satellites.forEach((node, index) => {
      const x = serverX + childXOffset;
      const y = startY + (index * childSpacingY);

      layoutedNodes.push({
        ...node,
        position: { x: x, y: y },
        selected: selectionRef.current.has(node.id), // Restore selection
        type: 'device',
        style: { width: 'auto', background: 'transparent', border: 'none' },
      });
      
      const isOnline = node.data?.status === 'online' || node.data?.is_online === true;
      const strokeColor = isOnline ? '#22c55e' : (node.data?.status === 'offline' ? '#ef4444' : '#71717a');

      if (centerNodeId) {
          layoutedEdges.push({
            id: `edge-${centerNodeId}-${node.id}`,
            source: centerNodeId,
            target: String(node.id),
            animated: isOnline,
            style: { 
                stroke: strokeColor,
                strokeWidth: 2,
            },
            type: 'default',
          });
      }
    });

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [initialNodes, setNodes, setEdges]); 

  return (
    <div className="w-full h-full bg-background overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false} 
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnDrag={true}
      >
        <Background color="var(--muted-foreground)" gap={32} size={2} variant={BackgroundVariant.Dots} className="opacity-[0.15]" />
        <Controls 
          className="!bg-card/90 !border !border-border !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&_svg]:!fill-muted-foreground [&>button:hover]:!bg-muted [&>button:hover_svg]:!fill-foreground" 
        />
      </ReactFlow>
    </div>
  );
}
