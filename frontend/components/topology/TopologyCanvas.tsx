'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import GlassDeviceNode from './nodes/GlassDeviceNode';
import { useTopologyLayout, DeviceData } from '@/hooks/useTopologyLayout';

const nodeTypes: NodeTypes = {
  glassDevice: GlassDeviceNode,
};

interface TopologyCanvasProps {
  devices: DeviceData[];
}

export default function TopologyCanvas({ devices }: TopologyCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange } = useTopologyLayout(devices);

  if (!nodes) return null;

  return (
    <div className="w-full h-full bg-background overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        translateExtent={[[-500, -500], [1500, 1500]]} // Limit canvas size
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false} // Enforce layout
        zoomOnScroll={true}
        panOnDrag={true}
        zoomOnPinch={true}
      >
        <Background color="var(--border)" gap={24} size={1} variant="dots" />
        <Controls 
          className="!bg-card/80 !border-border !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!fill-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!fill-foreground" 
        />
      </ReactFlow>
    </div>
  );
}
