
import React from 'react';
import { AppState, GraphNode } from '../types';
import { Label, Select, Slider, Toggle, ColorPicker, TextInput, Button } from './ui/Controls';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const Inspector = ({
  node,
  params,
  setParams,
  controller,
  onClose
}: {
  node: GraphNode | undefined;
  params: AppState;
  setParams: (fn: (prev: AppState) => AppState) => void;
  controller: any;
  onClose: () => void;
}) => {
  const update = (path: string[], value: any) => {
    // Perform deep clone to avoid mutating state directly
    setParams((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let ptr: any = next;
      for (let i = 0; i < path.length - 1; i++) ptr = ptr[path[i]];
      ptr[path[path.length - 1]] = value;
      return next;
    });
  };

  const renderSourceContent = () => {
    if (!controller) {
      return <div className="text-gray-900 text-xs mt-4 text-center font-semibold">INITIALIZING CONTROLLER...</div>;
    }

    if (!params.source.active) {
      return (
        <div className="flex flex-col gap-3 mt-4">
          <div className="p-4 bg-gray-200 border-2 border-gray-500 rounded text-gray-900 text-xs text-center mb-2 font-bold">
            SELECT INPUT SOURCE
          </div>
          
          <Label>Output Aspect Ratio</Label>
          <Select 
             value={params.source.aspectRatio || 'native'} 
             options={['native', '1:1', '16:9', '9:16', '4:3', '21:9']}
             onChange={(v) => update(['source', 'aspectRatio'], v)}
          />
          
          <Label>Zoom</Label>
          <Slider
            label="Zoom Out"
            value={params.source.zoom || 1.0}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => update(['source', 'zoom'], v)}
          />
          
          <Button onClick={() => {
            update(['source', 'active'], true);
            update(['source', 'type'], 'camera');
            controller.toggleCamera();
          }}>
            USE WEBCAM
          </Button>
          <div className="relative">
            <Button variant="secondary" onClick={() => document.getElementById('upload-video-init')?.click()}>
              UPLOAD VIDEO FILE
            </Button>
            <input 
              id="upload-video-init"
              type="file" 
              accept="video/*" 
              className="hidden"
              onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 
                 // Size validation
                 if (file.size > MAX_VIDEO_SIZE) {
                   alert(`Video file too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
                   e.target.value = '';
                   return;
                 }
                 
                 // MIME type validation
                 if (!file.type.startsWith('video/')) {
                   alert('Invalid file type. Please select a video file.');
                   e.target.value = '';
                   return;
                 }
                 
                 update(['source', 'active'], true);
                 update(['source', 'type'], 'video');
                 controller.loadVideo(file);
                 e.target.value = ''; 
              }} 
            />
          </div>
        </div>
      );
    }

    return (
      <>
        <Label>Active Source</Label>
        <div className="flex gap-2 mb-4">
          <Button 
            variant={params.source.type === 'camera' ? 'primary' : 'secondary'}
            onClick={() => {
               update(['source', 'type'], 'camera');
               controller.toggleCamera();
            }}
          >
            CAMERA
          </Button>
          <Button 
            variant={params.source.type === 'video' ? 'primary' : 'secondary'}
            onClick={() => document.getElementById('switch-video')?.click()}
          >
            VIDEO FILE
          </Button>
          <input 
              id="switch-video"
              type="file" 
              accept="video/*" 
              className="hidden"
              onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 
                 // Size validation
                 if (file.size > MAX_VIDEO_SIZE) {
                   alert(`Video file too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
                   e.target.value = '';
                   return;
                 }
                 
                 // MIME type validation
                 if (!file.type.startsWith('video/')) {
                   alert('Invalid file type. Please select a video file.');
                   e.target.value = '';
                   return;
                 }
                 
                 update(['source', 'type'], 'video');
                 controller.loadVideo(file);
                 e.target.value = '';
              }} 
          />
        </div>
        
        <Label>Output Aspect Ratio</Label>
        <Select 
           value={params.source.aspectRatio || 'native'} 
           options={['native', '1:1', '16:9', '9:16', '4:3', '21:9']}
           onChange={(v) => update(['source', 'aspectRatio'], v)}
        />
        
        <Label>Zoom</Label>
        <Slider
          label="Zoom Out"
          value={params.source.zoom || 1.0}
          min={0.1}
          max={1.0}
          step={0.05}
          onChange={(v) => update(['source', 'zoom'], v)}
        />
      </>
    );
  };

  const renderContent = () => {
    if (!node) return null;

    switch (node.type) {
      case 'source': return renderSourceContent();
      case 'detection':
        return (
          <>
            <Label>AI Model</Label>
            <Select
              value={params.detection.mode === 'off' ? 'luma' : params.detection.mode}
              options={['luma', 'objects', 'features']}
              onChange={(v) => update(['detection', 'mode'], v)}
            />
            
            <Label>Confidence Threshold</Label>
            <Slider
              value={params.detection.confidence}
              min={0} max={1} step={0.01}
              onChange={(v) => update(['detection', 'confidence'], v)}
              label="Min Score"
            />

            {(params.detection.mode === 'luma' || params.detection.mode === 'off') && (
               <div className="mt-4 border-t border-gray-800 pt-2">
                 <Label>Luma Settings</Label>
                 <Toggle label="Feed ASCII" checked={params.detection.luma.feedAscii} onChange={(v)=>update(['detection','luma','feedAscii'], v)} />
                 <Slider label="Threshold" value={params.detection.luma.threshold} min={0} max={255} step={1} onChange={(v)=>update(['detection','luma','threshold'], v)} />
                 <Slider label="Grid Size" value={params.detection.luma.grid} min={10} max={100} step={1} onChange={(v)=>update(['detection','luma','grid'], v)} />
                 <Slider label="Min Cells" value={params.detection.luma.minCells} min={1} max={20} step={1} onChange={(v)=>update(['detection','luma','minCells'], v)} />
                 <div className="mt-2">
                   <Label>Visuals</Label>
                   <Toggle label="Show Boxes" checked={params.detection.luma.showBoxes} onChange={(v)=>update(['detection','luma','showBoxes'], v)} />
                   <Toggle label="Show Labels" checked={params.detection.luma.showLabels} onChange={(v)=>update(['detection','luma','showLabels'], v)} />
                   {params.detection.luma.showLabels && (
                     <>
                       <Label>Label Mode</Label>
                       <Select 
                         value={params.detection.luma.labelMode || 'default'} 
                         options={['default', 'random', 'custom']} 
                         onChange={(v)=>update(['detection','luma','labelMode'], v)} 
                       />
                       {params.detection.luma.labelMode === 'custom' && (
                         <TextInput 
                           value={params.detection.luma.labelText || ''} 
                           onChange={(v)=>update(['detection','luma','labelText'], v)} 
                         />
                       )}
                       <Slider 
                         label="Label Size" 
                         value={params.detection.luma.labelSize} 
                         min={8} 
                         max={32} 
                         step={1} 
                         onChange={(v)=>update(['detection','luma','labelSize'], v)} 
                       />
                       <ColorPicker 
                         label="Label Color" 
                         value={params.detection.luma.labelColor} 
                         onChange={(v)=>update(['detection','luma','labelColor'], v)} 
                       />
                     </>
                   )}
                   <ColorPicker label="Box Color" value={params.detection.luma.strokeColor} onChange={(v)=>update(['detection','luma','strokeColor'], v)} />
                 </div>
               </div>
            )}

            {params.detection.mode === 'objects' && (
               <div className="mt-4 border-t border-gray-800 pt-2">
                 <Label>Object Settings</Label>
                 <Toggle label="Show Boxes" checked={params.detection.objects.showBoxes} onChange={(v)=>update(['detection','objects','showBoxes'], v)} />
                 <Toggle label="Show Labels" checked={params.detection.objects.showLabels} onChange={(v)=>update(['detection','objects','showLabels'], v)} />
                 <ColorPicker label="Border Color" value={params.detection.objects.borderColor} onChange={(v)=>update(['detection','objects','borderColor'], v)} />
               </div>
            )}
             
            {params.detection.mode === 'features' && (
               <div className="mt-4 border-t border-gray-800 pt-2">
                 <Label>Pose Settings</Label>
                 <Toggle label="Body Box" checked={params.detection.pose.showBodyBox} onChange={(v)=>update(['detection','pose','showBodyBox'], v)} />
                 <Toggle label="Skeleton" checked={params.detection.pose.showSkeleton} onChange={(v)=>update(['detection','pose','showSkeleton'], v)} />
                 <ColorPicker label="Skeleton Color" value={params.detection.pose.skeletonColor} onChange={(v)=>update(['detection','pose','skeletonColor'], v)} />
               </div>
            )}
          </>
        );

      case 'ascii':
        return (
          <>
            <Label>Render Settings</Label>
            <Toggle label="Show Video" checked={params.ascii.showVideo} onChange={(v)=>update(['ascii','showVideo'], v)} />
            {params.ascii.showVideo && (
              <Slider 
                label="Video Opacity" 
                value={params.ascii.videoOpacity || 1.0} 
                min={0} 
                max={1} 
                step={0.05} 
                onChange={(v)=>update(['ascii','videoOpacity'], v)} 
              />
            )}
            <Toggle label="Only In Boxes" checked={params.ascii.asciiOnlyInBox} onChange={(v)=>update(['ascii','asciiOnlyInBox'], v)} />
            
            <Label>Style</Label>
            <Select value={params.ascii.style} options={['classic','dense','blocks','minimal','binary','geometric','shaded','custom']} onChange={(v)=>update(['ascii','style'], v)} />
            {params.ascii.style === 'custom' && (
               <TextInput value={params.ascii.customDensity} onChange={(v)=>update(['ascii','customDensity'], v)} />
            )}

            <Label>Grid</Label>
            <Slider label="Columns" value={params.ascii.cols} min={20} max={360} step={1} onChange={(v)=>update(['ascii','cols'], v)} />
            <Slider label="Density" value={params.ascii.density || 1.0} min={0.1} max={2.0} step={0.1} onChange={(v)=>update(['ascii','density'], v)} />
            <Slider label="Font Size" value={params.ascii.fontSize} min={6} max={32} step={1} onChange={(v)=>update(['ascii','fontSize'], v)} />
            <Toggle label="Auto Rows" checked={params.ascii.autoRows} onChange={(v)=>update(['ascii','autoRows'], v)} />

            <Label>Color Palette</Label>
            <Toggle label="Use Video Colors" checked={params.ascii.useVideoColors} onChange={(v)=>update(['ascii','useVideoColors'], v)} />
            {!params.ascii.useVideoColors && (
               <>
               <Select value={params.ascii.palette} options={['monotone','toxic','neon','sunset','custom']} onChange={(v)=>update(['ascii','palette'], v)} />
               {params.ascii.palette === 'custom' && (
                  <div className="flex gap-2">
                     <ColorPicker label="A" value={params.ascii.customColorA} onChange={(v)=>update(['ascii','customColorA'], v)} />
                     <ColorPicker label="B" value={params.ascii.customColorB} onChange={(v)=>update(['ascii','customColorB'], v)} />
                  </div>
               )}
               </>
            )}
            
            <Label>Threshold</Label>
            <Toggle label="Enable Threshold" checked={params.ascii.useThreshold} onChange={(v)=>update(['ascii','useThreshold'], v)} />
            <Slider value={params.ascii.threshold} min={0} max={255} step={1} onChange={(v)=>update(['ascii','threshold'], v)} />
            <Toggle label="Invert" checked={params.ascii.invert} onChange={(v)=>update(['ascii','invert'], v)} />
          </>
        );

      case 'overlay':
        return (
          <>
            <Label>Line Connections</Label>
            <Toggle label="Draw Lines" checked={params.overlay.showLines} onChange={(v)=>update(['overlay','showLines'], v)} />
            <Toggle label="Straight Lines" checked={params.overlay.straightLines} onChange={(v)=>update(['overlay','straightLines'], v)} />
            <Slider label="Curvature" value={params.overlay.curve} min={0} max={1.5} step={0.1} onChange={(v)=>update(['overlay','curve'], v)} />
            <Slider label="Width" value={params.overlay.lineWidth} min={1} max={10} step={1} onChange={(v)=>update(['overlay','lineWidth'], v)} />
            <ColorPicker label="Color" value={params.overlay.lineColor} onChange={(v)=>update(['overlay','lineColor'], v)} />
          </>
        );

      case 'output':
        return (
          <>
            <Label>Recording</Label>
            <div className="flex flex-col gap-2">
               <Button 
                  onClick={params.output.mp4RecActive ? controller.stopMp4 : controller.startMp4}
                  variant={params.output.mp4RecActive ? 'danger' : 'primary'}
               >
                  {params.output.mp4RecActive ? 'STOP MP4 RECORDING' : 'START MP4 RECORDING'}
               </Button>
               <Button 
                  onClick={params.output.pngRecActive ? controller.stopPng : controller.startPng}
                  variant={params.output.pngRecActive ? 'danger' : 'primary'}
               >
                  {params.output.pngRecActive ? 'STOP PNG SEQUENCE' : 'START PNG SEQUENCE (25FPS)'}
               </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-800">
               <Label>Network (Placeholder)</Label>
               <Toggle label="Enable OSC" checked={params.output.oscEnabled} onChange={(v)=>update(['output','oscEnabled'], v)} />
               <TextInput value={params.output.oscHost} onChange={(v)=>update(['output','oscHost'], v)} />
               <Toggle label="Enable Spout" checked={params.output.spoutEnabled} onChange={(v)=>update(['output','spoutEnabled'], v)} />
            </div>
          </>
        );
        
      default: return null;
    }
  };

  return (
    <div className="h-full w-full bg-white border-l-2 border-gray-500 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-gray-500 bg-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${node ? 'bg-gray-900 animate-pulse' : 'bg-gray-500'}`} />
          <h2 className="text-sm font-bold tracking-widest text-gray-900">
            {node?.title.toUpperCase() || 'SETTINGS'}
          </h2>
        </div>
        <button 
           onClick={onClose} 
           className="text-gray-700 hover:text-gray-900 transition-colors p-1 font-bold"
        >
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
           </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};
