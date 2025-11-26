
import React, { useState, useEffect, useRef } from 'react';
import { AppState, NodeId, SketchController, GraphNode, GraphConnection, NodeType } from './types';
import { createSketch } from './services/sketch';
import { TopBar } from './components/TopBar';
import { NodeGraph } from './components/NodeGraph';
import { Inspector } from './components/Inspector';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PRESET_SIZE = 5 * 1024 * 1024; // 5MB

const validatePreset = (preset: any): boolean => {
  if (!preset || typeof preset !== 'object') return false;
  if (!preset.params || !preset.nodes) return false;
  if (!Array.isArray(preset.nodes)) return false;
  
  // Basic structure validation
  try {
    // Check if params has required structure
    if (!preset.params.source || !preset.params.detection || !preset.params.ascii) return false;
    // Check nodes structure
    for (const node of preset.nodes) {
      if (!node.id || !node.type || typeof node.x !== 'number' || typeof node.y !== 'number') {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

const INITIAL_STATE: AppState = {
  source: { active: false, type: 'camera', fileUrl: null, aspectRatio: 'native', zoom: 1.0 },
  detection: {
    mode: 'off', // Start off
    confidence: 0.5,
    luma: { enabled: true, feedAscii: true, threshold: 170, grid: 40, minCells: 3, strokeWeight: 2, strokeColor: '#00ffd5', showBoxes: true, showLabels: true, labelSize: 12, labelColor: '#00ffd5', labelMode: 'default', labelText: '' },
    objects: { showBoxes: true, borderColor: '#00ff88', borderWidth: 2, showLabels: true, labelTemplate: '{class} {pct}', labelSize: 12, labelDecimals: 0, labelColor: '#ffffff' },
    pose: { showBodyBox: true, bodyBoxColor: '#00ffaa', bodyBoxWidth: 2, showSkeleton: true, skeletonColor: '#88ccff', skeletonWidth: 2 },
  },
  ascii: {
    enabled: true, showVideo: false, videoOpacity: 1.0, asciiOnlyInBox: false, useThreshold: false, threshold: 128, invert: false, backgroundColor: '#000000',
    style: 'classic', customDensity: '', cols: 120, density: 1.0, autoRows: true, fontSize: 12, cellHeightRatio: 0.8,
    palette: 'monotone', useVideoColors: false, customColorA: '#00ff88', customColorB: '#ffffff'
  },
  overlay: { showLines: true, straightLines: false, lineColor: '#88ccff', lineWidth: 2, curve: 0.6, maxPairs: 10 },
  output: { oscEnabled: false, oscHost: '127.0.0.1', oscPort: 8000, spoutEnabled: false, spoutName: 'ASCII_OUT', pngRecActive: false, mp4RecActive: false, statusText: 'Idle' }
};

const INITIAL_NODES: GraphNode[] = [
  { id: 'source-1', type: 'source', title: 'INPUT', x: 40, y: 60 }
];

export default function App() {
  const [params, setParams] = useState<AppState>(INITIAL_STATE);
  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [status, setStatus] = useState('Idle');
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [isSketchReady, setIsSketchReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Store user preference for mode so it persists when node is removed/added
  const [userDetectionMode, setUserDetectionMode] = useState<AppState['detection']['mode']>('luma');

  // Initialize online tracker
  useEffect(() => {
    import('./services/onlineTracker').then(({ initOnlineTracker }) => {
      initOnlineTracker(setOnlineCount);
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SketchController | null>(null);

  // Initialize Sketch
  useEffect(() => {
    if (containerRef.current && !controllerRef.current) {
      controllerRef.current = createSketch(containerRef.current, params, (msg) => {
         setStatus(msg);
         if(msg.includes('Recording MP4')) setParams(p => { const n = JSON.parse(JSON.stringify(p)); n.output.mp4RecActive = true; return n; });
         if(msg.includes('MP4 Saved')) setParams(p => { const n = JSON.parse(JSON.stringify(p)); n.output.mp4RecActive = false; return n; });
         if(msg.includes('Recording PNG')) setParams(p => { const n = JSON.parse(JSON.stringify(p)); n.output.pngRecActive = true; return n; });
         if(msg.includes('PNG Sequence Saved')) setParams(p => { const n = JSON.parse(JSON.stringify(p)); n.output.pngRecActive = false; return n; });
      });
      // Force re-render to ensure Inspector gets the controller
      setIsSketchReady(true);
    }
    return () => controllerRef.current?.cleanup();
  }, []);

  // Update Sketch params when state changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateParams(params);
    }
  }, [params]);

  // Sync Node Graph existence to Params
  useEffect(() => {
    setParams(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      
      const hasDetection = nodes.some(n => n.type === 'detection');
      const hasAscii = nodes.some(n => n.type === 'ascii');
      const hasOverlay = nodes.some(n => n.type === 'overlay');
      
      if (hasDetection) {
        if (next.detection.mode === 'off') {
           next.detection.mode = userDetectionMode;
        }
      } else {
        if (next.detection.mode !== 'off') {
           setUserDetectionMode(next.detection.mode); 
           next.detection.mode = 'off';
        }
      }

      next.ascii.enabled = hasAscii;
      next.overlay.showLines = hasOverlay;
      
      return next;
    });
  }, [nodes]);

  // Update user preference if params change manually via inspector while active
  useEffect(() => {
     if (params.detection.mode !== 'off') {
        setUserDetectionMode(params.detection.mode);
     }
  }, [params.detection.mode]);

  const handleAddNode = (type: NodeType) => {
    const id = `${type}-${Date.now()}`;
    const labels: Record<NodeType, string> = {
      source: 'INPUT',
      detection: 'AI DETECT',
      ascii: 'ASCII FX',
      overlay: 'OVERLAY',
      output: 'EXPORT'
    };
    
    // Auto-position logic
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? lastNode.x + 180 : 40;
    const newY = lastNode ? lastNode.y : 60;

    setNodes(prev => [...prev, {
      id,
      type,
      title: labels[type],
      x: newX,
      y: newY
    }]);
    
    // Select the new node to slide open inspector
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Save preset as JSON file to user's PC
  const handleSavePreset = () => {
    const preset = {
      params,
      nodes,
      version: '0.5',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tekdetek-preset-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Preset Saved to File');
    setTimeout(() => setStatus('Idle'), 2000);
  };

  // Load preset from JSON file on user's PC
  const handleLoadPreset = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Size check
      if (file.size > MAX_PRESET_SIZE) {
        setStatus(`Error: Preset file too large (max ${MAX_PRESET_SIZE / 1024 / 1024}MB)`);
        setTimeout(() => setStatus('Idle'), 3000);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const preset = JSON.parse(event.target?.result as string);
          if (validatePreset(preset)) {
            setParams(preset.params);
            setNodes(preset.nodes);
            setStatus('Preset Loaded');
            setTimeout(() => setStatus('Idle'), 2000);
          } else {
            throw new Error('Invalid preset format');
          }
        } catch (e) {
          setStatus('Error: Invalid Preset File');
          setTimeout(() => setStatus('Idle'), 3000);
        }
      };
      reader.onerror = () => {
        setStatus('Error: Failed to read preset file');
        setTimeout(() => setStatus('Idle'), 3000);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen w-screen bg-gray-200 text-gray-900 overflow-hidden relative">
        {showWelcome && <WelcomeOverlay onClose={() => setShowWelcome(false)} />}
        
        <TopBar onlineCount={onlineCount} onSavePreset={handleSavePreset} onLoadPreset={handleLoadPreset} />
      
      {/* Middle Section: Canvas + Overlay Inspector */}
      <div className="relative flex-1 w-full overflow-hidden bg-gray-300">
        
        {/* Canvas Area (Centered) */}
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="absolute top-4 left-4 text-[10px] text-gray-800 tracking-widest pointer-events-none z-10 font-semibold">
              VIEWPORT // {params.detection.mode.toUpperCase()}
           </div>
           
           <div 
             ref={containerRef} 
             className="shadow-xl rounded-sm overflow-hidden border-2 border-gray-500"
             style={{ transform: `scale(${params.source.zoom})`, transformOrigin: 'center' }}
           />
        </div>

        {/* Slide-In Inspector Panel */}
        <div 
          className={`
            absolute top-0 right-0 h-full bg-white border-l-2 border-gray-500 shadow-2xl z-20 
            transition-transform duration-300 ease-in-out transform
            w-full md:w-80
            ${selectedNodeId ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <Inspector 
            node={selectedNode} 
            params={params} 
            setParams={setParams} 
            controller={controllerRef.current} 
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      </div>

      {/* Bottom: Node Graph */}
      <div className="h-56 min-h-[150px] border-t-2 border-gray-500 bg-gray-300 relative z-10">
        <NodeGraph 
           nodes={nodes}
           connections={[]} 
           selectedNodeId={selectedNodeId} 
           onSelectNode={setSelectedNodeId}
           onNodesChange={setNodes}
           onAddNode={handleAddNode}
           onDeleteNode={handleDeleteNode}
        />
      </div>
      </div>
    </ErrorBoundary>
  );
}
