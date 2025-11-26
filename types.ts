
export type DetectionMode = 'off' | 'objects' | 'features' | 'luma';
export type AsciiStyle = 'classic' | 'dense' | 'blocks' | 'minimal' | 'binary' | 'geometric' | 'shaded' | 'custom';
export type PaletteName = 'monotone' | 'toxic' | 'neon' | 'sunset' | 'custom';

export type NodeType = 'source' | 'detection' | 'ascii' | 'overlay' | 'output';

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
}

export interface GraphConnection {
  from: string;
  to: string;
}

export interface AppState {
  source: {
    active: boolean; // Has the user selected an input?
    type: 'camera' | 'video';
    fileUrl: string | null;
    aspectRatio: 'native' | '16:9' | '9:16' | '4:3' | '1:1' | '21:9';
    zoom: number; // Zoom level (0.1 to 1.0, where 1.0 = 100%)
  };
  detection: {
    mode: DetectionMode; // If 'off', the node is effectively missing/disabled
    confidence: number;
    luma: {
      enabled: boolean;
      feedAscii: boolean;
      threshold: number;
      grid: number;
      minCells: number;
      strokeWeight: number;
      strokeColor: string;
      showBoxes: boolean;
      showLabels: boolean;
      labelSize: number;
      labelColor: string;
      labelMode: 'default' | 'random' | 'custom';
      labelText: string;
    };
    objects: {
      showBoxes: boolean;
      borderColor: string;
      borderWidth: number;
      showLabels: boolean;
      labelTemplate: string;
      labelSize: number;
      labelDecimals: number;
      labelColor: string;
    };
    pose: {
      showBodyBox: boolean;
      bodyBoxColor: string;
      bodyBoxWidth: number;
      showSkeleton: boolean;
      skeletonColor: string;
      skeletonWidth: number;
    };
  };
  ascii: {
    enabled: boolean;
    showVideo: boolean;
    videoOpacity: number;
    asciiOnlyInBox: boolean;
    useThreshold: boolean;
    threshold: number;
    invert: boolean;
    backgroundColor: string;
    style: AsciiStyle;
    customDensity: string;
    cols: number;
    density: number;
    autoRows: boolean;
    fontSize: number;
    cellHeightRatio: number;
    palette: PaletteName;
    useVideoColors: boolean;
    customColorA: string;
    customColorB: string;
  };
  overlay: {
    showLines: boolean;
    straightLines: boolean;
    lineColor: string;
    lineWidth: number;
    curve: number;
    maxPairs: number;
  };
  output: {
    oscEnabled: boolean;
    oscHost: string;
    oscPort: number;
    spoutEnabled: boolean;
    spoutName: string;
    pngRecActive: boolean;
    mp4RecActive: boolean;
    statusText: string;
  };
}

// For UI selection in Inspector
export type NodeId = string;

export interface SketchController {
  updateParams: (params: AppState) => void;
  loadVideo: (file: File) => void;
  toggleCamera: () => void;
  startMp4: () => void;
  stopMp4: () => void;
  startPng: () => void;
  stopPng: () => void;
  cleanup: () => void;
}
