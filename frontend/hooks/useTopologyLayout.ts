import { useEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled';
import { Edge, Node, Position, useNodesState, useEdgesState } from '@xyflow/react';

let elkInstance: ELK | null = null;

const getElk = () => {
  if (!elkInstance) {
    elkInstance = new ELK();
  }
  return elkInstance;
};

export interface DeviceData {
  id: string;
  name: string;
  device_type: 'gateway' | 'switch' | 'ap' | 'client';
  uplink_device?: string | null;
  ip_address?: string;
  is_online: boolean;
  [key: string]: any;
}

export const useTopologyLayout = (devices: DeviceData[]) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!devices.length) return;

    // 1. Convert Devices to Graph Elements
    const rawNodes = devices.map(d => ({
      id: d.id,
      width: 220, // Approximate width of Glass Card
      height: 100,
      data: { ...d }
    }));
    
    const rawEdges = devices
     .filter(d => d.uplink_device)
     .map(d => ({
        id: `e-${d.uplink_device}-${d.id}`,
        sources: [d.uplink_device!],
        targets: [d.id]
      }));

    // 2. Configure ELK Graph
    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '60',
        'elk.layered.spacing.nodeNodeBetweenLayers': '150',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.edgeRouting': 'SPLINES'
      },
      children: rawNodes,
      edges: rawEdges
    };

    // 3. Run Layout Algorithm
    getElk().layout(graph as any).then((layoutedGraph) => {
      if (!layoutedGraph.children) return;

      // 4. Map back to React Flow format
      const flowNodes: Node[] = layoutedGraph.children.map(n => ({
        id: n.id,
        position: { x: n.x || 0, y: n.y || 0 }, // ELK coordinates
        type: 'glassDevice', // Custom Node Type
        data: { ...n.data }
      }));

      const flowEdges: Edge[] = (layoutedGraph.edges || []).map(e => ({
        id: e.id,
        source: (e as any).sources[0],
        target: (e as any).targets[0],
        type: 'default', // Bezier curve for flexible look
        animated: true, 
        style: { stroke: '#52525b', strokeWidth: 2 } 
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }).catch(console.error);
  }, [devices]);

  return { nodes, edges, onNodesChange, onEdgesChange };
};
