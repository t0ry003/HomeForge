'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import UnifiNode from './nodes/UnifiNode';
import { useTopologyLayout, DeviceData } from '@/hooks/useTopologyLayout';

const nodeTypes: NodeTypes = {
  unifiDevice: UnifiNode,
  // Fallbacks just in case
  device: UnifiNode,
  glassDevice: UnifiNode 
};

interface TopologyCanvasProps {
  devices?: DeviceData[]; // We accept raw devices again to run layout
  nodes?: any[]; // Or pre-calculated nodes (optional)
  edges?: any[]; // Or pre-calculated edges (optional)
}

export default function TopologyCanvas({ devices = [], nodes: propNodes, edges: propEdges }: TopologyCanvasProps) {
  // Always run the hook, it handles empty devices array gracefully
  const { nodes: layoutNodes, edges: layoutEdges, onNodesChange, onEdgesChange } = useTopologyLayout(devices);

  // Use props if provided (manual layout), otherwise use calculated layout
  const nodes = propNodes || layoutNodes;
  const edges = propEdges || layoutEdges;

  const types = useMemo(() => nodeTypes, []);

  if (!nodes) return null;

  return (
    <div className="w-full h-full bg-background overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={types}
        fitView
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false} // Enforce layout
        zoomOnScroll={true}
        panOnDrag={true}
        zoomOnPinch={true}
      >
        <Background color="var(--border)" gap={40} size={1} />
        <Controls 
          className="!bg-card/80 !border-border !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!fill-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!fill-foreground" 
        />
        <MiniMap 
            className="!bg-card/80 !border-border !shadow-xl !rounded-lg"
            nodeColor={(n) => {
               if (n.data?.is_online !== false && n.data?.status !== 'offline') return '#22c55e';
               return '#a1a1aa';
            }} 
        />
      </ReactFlow>
    </div>
  );
}
