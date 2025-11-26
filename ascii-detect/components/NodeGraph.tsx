
import React, { useState, useRef, useCallback } from 'react';
import { GraphNode, GraphConnection, NodeType, NodeId } from '../types';

interface NodeProps {
  data: GraphNode;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
}

const Node: React.FC<NodeProps> = ({ data, selected, onMouseDown, onDelete }) => (
  <g 
    transform={`translate(${data.x}, ${data.y})`} 
    onMouseDown={(e) => onMouseDown(e, data.id)} 
    className="cursor-grab active:cursor-grabbing group"
    style={{ opacity: 1 }}
  >
    {/* Glow for selected state */}
    {selected && (
      <rect 
        width="164" height="84" x="-2" y="-2" rx="8" 
        className="fill-gray-700/10" 
        style={{ filter: 'blur(4px)' }} 
      />
    )}
    
    <rect
      width="160"
      height="80"
      rx="6"
      fill="#d1d5db"
      strokeWidth="2"
      stroke={selected ? "#111827" : "#4b5563"}
      className="transition-colors hover:stroke-gray-700"
      style={{ opacity: 1 }}
    />
    
    {/* Header Background */}
    <path d="M 0 6 a 6 6 0 0 1 6 -6 h 148 a 6 6 0 0 1 6 6 v 18 h -160 v -18" fill="#9ca3af" style={{ opacity: 1 }} />
    
    <text x="80" y="18" textAnchor="middle" className="fill-gray-900 text-[11px] font-bold select-none pointer-events-none" style={{ opacity: 1 }}>
      {data.title}
    </text>
    
    <text x="80" y="56" textAnchor="middle" className="fill-gray-900 text-[10px] font-semibold select-none pointer-events-none uppercase tracking-wider" style={{ opacity: 1 }}>
      {data.type}
    </text>

    {/* Input Port */}
    {data.type !== 'source' && (
      <circle cx="0" cy="40" r="5" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.5" className="hover:fill-gray-900 hover:stroke-gray-900 transition-colors" style={{ opacity: 1 }} />
    )}
    {/* Output Port */}
    {data.type !== 'output' && (
      <circle cx="160" cy="40" r="5" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.5" className="hover:fill-gray-900 hover:stroke-gray-900 transition-colors" style={{ opacity: 1 }} />
    )}

    {/* Delete Button (visible on hover or selected) */}
    {data.type !== 'source' && (selected) && (
      <g 
        transform="translate(150, -10)" 
        className="cursor-pointer" 
        onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
        style={{ opacity: 1 }}
      >
        <circle r="8" className="fill-red-100 stroke-red-400 stroke-1 hover:fill-red-200" />
        <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke="#b91c1c" strokeWidth="1.5" />
      </g>
    )}
  </g>
);

interface ConnectionProps {
  start: {x:number, y:number};
  end: {x:number, y:number};
}

const Connection: React.FC<ConnectionProps> = ({ start, end }) => {
  const controlDist = Math.abs(end.x - start.x) * 0.5;
  const pathData = `M ${start.x} ${start.y} C ${start.x + controlDist} ${start.y}, ${end.x - controlDist} ${end.y}, ${end.x} ${end.y}`;

  return (
    <path
      d={pathData}
      fill="none"
      className="stroke-gray-600"
      strokeWidth="2.5"
      strokeDasharray="4 4"
    />
  );
};

export const NodeGraph = ({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onNodesChange,
  onAddNode,
  onDeleteNode
}: {
  nodes: GraphNode[];
  connections: GraphConnection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onNodesChange: (nodes: GraphNode[]) => void;
  onAddNode: (type: NodeType) => void;
  onDeleteNode: (id: string) => void;
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    return {
      x: (clientX - CTM.e) / CTM.a,
      y: (clientY - CTM.f) / CTM.d
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectNode(id);
    
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    setDraggingId(id);
    const coords = getEventCoordinates(e);
    setDragOffset({
      x: coords.x - node.x,
      y: coords.y - node.y
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId) return;
    
    const coords = getEventCoordinates(e);
    const updatedNodes = nodes.map(n => {
      if (n.id === draggingId) {
        return {
          ...n,
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y
        };
      }
      return n;
    });
    onNodesChange(updatedNodes);
  }, [draggingId, dragOffset, nodes, onNodesChange]);

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleBgClick = () => {
    onSelectNode(null);
    setShowAddMenu(false);
  };

  const getNodePos = (id: string) => {
    const n = nodes.find(node => node.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  // Auto-generate visual connections based on order for now, OR rely on passed connections
  // Since we are simulating a linear graph, we can try to draw lines between nodes if they look sequential
  // But for this requirement, we'll assume linear left-to-right visual linking for simplicity in the 'simulated' graph
  const sortedNodes = [...nodes].sort((a,b) => a.x - b.x);
  
  return (
    <div className="w-full h-full bg-gray-300 relative overflow-hidden select-none group">
       <div className="absolute top-2 left-3 text-[10px] text-gray-900 tracking-widest uppercase pointer-events-none opacity-80 font-bold">
          Node Pipeline
       </div>
       <div className="absolute bottom-2 right-3 flex flex-col items-end gap-2 z-10">
          <div className="text-[10px] text-gray-800 font-semibold mb-1">
            ENJOYING THIS?
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://buymeacoffee.com/vikmil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded transition-colors border border-gray-400"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              BUY ME A COFFEE
            </a>
            <a
              href="https://instagram.com/iamviktor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded transition-colors border border-gray-400"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              INSTAGRAM
            </a>
          </div>
       </div>

       {/* Faded ASCII Logo - Centered */}
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-[0.40]">
          <pre className="text-[12px] leading-[0.9] text-gray-900 font-mono whitespace-pre">
{`$$$$$$$$\\ $$$$$$$$\\ $$\\   $$\\ $$$$$$$\\  $$$$$$$$\\ $$$$$$$$\\ $$$$$$$$\\ $$\\   $$\\ 
\\__$$  __|$$  _____|$$ | $$  |$$  __$$\\ $$  _____|\\__$$  __|$$  _____|$$ | $$  |
   $$ |   $$ |      $$ |$$  / $$ |  $$ |$$ |         $$ |   $$ |      $$ |$$  / 
   $$ |   $$$$$\\    $$$$$  /  $$ |  $$ |$$$$$\\       $$ |   $$$$$\\    $$$$$  /  
   $$ |   $$  __|   $$  $$<   $$ |  $$ |$$  __|      $$ |   $$  __|   $$  $$<   
   $$ |   $$ |      $$ |\\$$\\  $$ |  $$ |$$ |         $$ |   $$ |      $$ |\\$$\\  
   $$ |   $$$$$$$$\\ $$ | \\$$\\ $$$$$$$  |$$$$$$$$\\    $$ |   $$$$$$$$\\ $$ | \\$$\\ 
   \\__|   \\________|\\__|  \\__|\\_______/ \\________|   \\__|   \\________|\\__|  \\__|`}
          </pre>
       </div>

       {/* Floating Add Node Button */}
       <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
          <button 
             onClick={() => setShowAddMenu(!showAddMenu)}
             className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2 px-4 rounded shadow-xl border-2 border-gray-900"
          >
             + ADD NODE
          </button>
          
          {showAddMenu && (
             <div className="bg-white border-2 border-gray-500 rounded shadow-2xl flex flex-col min-w-[140px] overflow-hidden">
                {[
                  { type: 'detection', label: 'AI DETECT' },
                  { type: 'ascii', label: 'ASCII FX' },
                  { type: 'overlay', label: 'OVERLAY' },
                  { type: 'output', label: 'EXPORT' }
                ].map((item) => (
                  <button
                     key={item.type}
                     onClick={() => {
                        onAddNode(item.type as NodeType);
                        setShowAddMenu(false);
                     }}
                     className="text-left px-4 py-3 text-xs text-gray-900 hover:bg-gray-200 hover:text-gray-900 font-semibold border-b-2 border-gray-400 last:border-0"
                  >
                     {item.label}
                  </button>
                ))}
             </div>
          )}
       </div>
       
      <svg 
        ref={svgRef}
        className="w-full h-full min-w-[1000px]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleBgClick}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6b7280" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render Connections (Linear approximation for visual) */}
        {sortedNodes.map((node, i) => {
           if (i === sortedNodes.length - 1) return null;
           const nextNode = sortedNodes[i+1];
           // Only draw connection if they are somewhat close in Y to avoid crazy lines
           if (Math.abs(node.y - nextNode.y) > 200) return null;
           
           return (
              <Connection 
                 key={`conn-${node.id}-${nextNode.id}`}
                 start={{ x: node.x + 160, y: node.y + 40 }}
                 end={{ x: nextNode.x, y: nextNode.y + 40 }}
              />
           );
        })}

        {/* Render Nodes */}
        {nodes.map((node) => (
          <Node
            key={node.id}
            data={node}
            selected={selectedNodeId === node.id}
            onMouseDown={handleMouseDown}
            onDelete={onDeleteNode}
          />
        ))}
      </svg>
    </div>
  );
};
