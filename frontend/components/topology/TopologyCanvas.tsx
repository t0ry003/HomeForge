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
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false} // Enforce layout
        zoomOnScroll={true}
        panOnDrag={true}
        zoomOnPinch={true}
      >
        <Background color="#27272a" gap={24} size={1} variant="dots" />
        <Controls 
          className="!bg-zinc-900/80 !border-zinc-800 !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!fill-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!fill-zinc-100" 
        />
      </ReactFlow>
    </div>
  );
}
