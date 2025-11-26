
import { AppState, SketchController } from "../types";

// Access global p5 loaded from script tag (v1.9.3) to avoid ESM/bundler issues with p5 v2+ and gifenc
const p5 = (window as any).p5;

// @ts-ignore
declare const ml5: any;
// @ts-ignore
declare const JSZip: any;

export const createSketch = (
  container: HTMLElement,
  initialParams: AppState,
  onStatusUpdate: (status: string) => void
) => {
  let params: AppState = JSON.parse(JSON.stringify(initialParams));
  let p5Instance: any;

  // --- Internal Sketch Variables ---
  let vid: any;
  let vidReady = false;
  let coco: any = null;
  let cocoLoopId: any = null;
  let cocoBusy = false;
  let objects: any[] = [];
  let poseNet: any = null;
  let poses: any[] = [];
  let poseReady = false;

  let COLS = 120;
  let ROWS = 90;
  let FONT_PX = 12;
  let charW = 8;
  let lineH = 10;
  
  // Viewport/Crop Logic
  let scaleX = 1;
  let scaleY = 1;
  let offsetX = 0;
  let offsetY = 0;
  
  let DENSITY = "Ñ@#W$9876543210?!abc;:+=-,._          ";
  const CHAR_LUT: string[] = new Array(256);
  const PAL_LUT: number[][] = new Array(256);

  // Recording State
  const MP4_MAX_DURATION = 60000;
  let mp4Rec = { active: false, recorder: null as any, chunks: [] as any[], stream: null as any, startTime: 0 };
  let pngRec = { active: false, frames: [] as any[], frameCount: 0, startTime: 0, targetFPS: 30, lastFrameTime: 0, processing: false };

  // --- Helpers ---
  const applyFontMetrics = (p: any) => {
    p.textSize(params.ascii.fontSize);
    lineH = Math.max(6, params.ascii.fontSize * params.ascii.cellHeightRatio);
    charW = Math.max(6, p.textWidth("M"));
    FONT_PX = params.ascii.fontSize;
  };

  const setDensity = (s: string) => {
    if (!s || s.length < 2) return;
    DENSITY = s;
    precomputeCharLUT();
  };

  const precomputeCharLUT = () => {
    const L = DENSITY.length;
    for (let v = 0; v < 256; v++) {
      const idx = Math.max(0, Math.min(L - 1, Math.floor((v * (L - 1)) / 255)));
      CHAR_LUT[v] = DENSITY.charAt(idx);
    }
  };

  const updateStyle = () => {
    const name = params.ascii.style;
    let s = "";
    if (name === "classic") s = "Ñ@#W$9876543210?!abc;:+=-,._          ";
    else if (name === "dense") s = "$@B%8&WM#*oahkbdpqwmZ0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
    else if (name === "blocks") s = "█▓▒░ .";
    else if (name === "minimal") s = "@%#*+=-:. ";
    else if (name === "binary") s = "01 ";
    else if (name === "geometric") s = "■▲●◆◼◾◽▫▪▫· ";
    else if (name === "shaded") s = "▓▒░▄▀█▌▐▬▭▮▯ ";
    else if (name === "custom") s = params.ascii.customDensity;
    setDensity(s);
  };

  const getTargetAspectRatio = (vidW: number, vidH: number) => {
    switch (params.source.aspectRatio) {
      case '1:1': return 1;
      case '16:9': return 16/9;
      case '9:16': return 9/16;
      case '4:3': return 4/3;
      case '21:9': return 21/9;
      case 'native': default: return vidW / vidH;
    }
  };

  const fitCanvas = (p: any) => {
    if (!vidReady || vid.width === 0) return;
    
    const vw = vid.width;
    const vh = vid.height;
    
    // 1. Determine Target Aspect Ratio
    const targetAR = getTargetAspectRatio(vw, vh);

    // 2. Set Grid Cols based on slider
    COLS = params.ascii.cols;
    
    // 3. Calculate Canvas Width based on Cols * CharWidth
    const canvasW = Math.max(1, Math.floor(charW * COLS));
    
    // 4. Calculate Canvas Height based on AR
    const canvasH = Math.max(1, Math.floor(canvasW / targetAR));

    // 5. Calculate Rows that fit in that height
    ROWS = Math.floor(canvasH / lineH);
    
    // Refine Canvas Height to match exact lines (optional, avoids partial lines)
    // const finalH = ROWS * lineH + (params.ascii.enabled ? 0 : 0); 
    // Actually better to keep strict AR for export, so let's stick to calculated H
    
    p.resizeCanvas(canvasW, canvasH);
  };

  // --- Palette ---
  const hexToRgb = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#ffffff");
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
  };

  const sampleStops = (stops: number[][], t: number) => {
    const seg = (stops.length - 1) * t;
    const i = Math.max(0, Math.min(stops.length - 2, Math.floor(seg)));
    const u = seg - i;
    const a = stops[i], b = stops[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * u),
      Math.round(a[1] + (b[1] - a[1]) * u),
      Math.round(a[2] + (b[2] - a[2]) * u),
    ];
  };

  const pickPalette = (name: string, t: number, A: number[], B: number[]) => {
    t = Math.max(0, Math.min(1, t));
    if (name === "custom") {
      return [
        Math.round(A[0] + (B[0] - A[0]) * t),
        Math.round(A[1] + (B[1] - A[1]) * t),
        Math.round(A[2] + (B[2] - A[2]) * t),
      ];
    }
    if (name === "monotone") return sampleStops([[0, 0, 0], [255, 255, 255]], t);
    if (name === "toxic") return sampleStops([[0, 10, 0], [20, 200, 40], [180, 255, 60], [230, 255, 200]], t);
    if (name === "neon") return sampleStops([[0, 10, 30], [0, 200, 255], [50, 120, 255], [220, 240, 255]], t);
    if (name === "sunset") return sampleStops([[20, 0, 60], [255, 90, 40], [255, 170, 80], [255, 230, 180]], t);
    return [255, 255, 255];
  };

  const updatePalLut = () => {
    const palName = params.ascii.palette;
    const A = hexToRgb(params.ascii.customColorA);
    const B = hexToRgb(params.ascii.customColorB);
    for (let v = 0; v < 256; v++) {
      const t = v / 255;
      PAL_LUT[v] = pickPalette(palName, t, A, B);
    }
  };

  // --- Detectors ---
  const startCoco = () => {
    if (cocoLoopId) clearInterval(cocoLoopId);
    cocoLoopId = setInterval(() => {
      if (!coco || cocoBusy || !vidReady) return;
      cocoBusy = true;
      try {
        coco.detect(vid, (err: any, res: any) => {
          if (!cocoLoopId) return;
          if (!err && res) objects = res;
          cocoBusy = false;
        });
      } catch (e) { cocoBusy = false; }
    }, 160);
  };

  const stopCoco = () => {
    if (cocoLoopId) clearInterval(cocoLoopId);
    cocoLoopId = null;
    cocoBusy = false;
  };

  // Random word generator for luma labels - persistent storage by box position
  const randomWords = ['DETECT', 'SIGNAL', 'PULSE', 'BEAM', 'FLUX', 'WAVE', 'CORE', 'NODE', 'GRID', 'CELL', 'ZONE', 'FIELD', 'SPACE', 'POINT', 'LINE', 'AREA', 'BLOCK', 'UNIT', 'BASE', 'EDGE'];
  const lumaLabelCache: Map<string, string> = new Map();
  
  const getLumaLabel = (box: any) => {
    const mode = params.detection.luma.labelMode || 'default';
    if (mode === 'default') return 'Luma';
    if (mode === 'random') {
      // Use box position as key for consistent random assignment
      const key = `${Math.round(box.x)}_${Math.round(box.y)}_${Math.round(box.w)}_${Math.round(box.h)}`;
      if (!lumaLabelCache.has(key)) {
        lumaLabelCache.set(key, randomWords[Math.floor(Math.random() * randomWords.length)]);
      }
      return lumaLabelCache.get(key) || 'Luma';
    }
    if (mode === 'custom') return params.detection.luma.labelText || 'Luma';
    return 'Luma';
  };

  // Luma detection now happens in VIDEO coordinates
  const getLumaBoxes = (vw: number, vh: number, p: any): any[] => {
    const out: any[] = [];
    if (!vidReady) return out;
    const thr = params.detection.luma.threshold;
    const gridVal = params.detection.luma.grid;
    // Adjust grid aspect to match video aspect to keep cells square-ish
    const Gx = gridVal;
    const Gy = Math.max(6, Math.round(gridVal * (vh / Math.max(1, vw))));
    const cellW = vw / Gx;
    const cellH = vh / Gy;
    const mask = new Array(Gx * Gy).fill(0);

    vid.loadPixels();
    const pix = vid.pixels;
    if (!pix.length) return [];

    for (let gy = 0; gy < Gy; gy++) {
      const sy = Math.min(vh - 1, Math.floor((gy + 0.5) * cellH));
      const rowBase = sy * vw * 4;
      for (let gx = 0; gx < Gx; gx++) {
        const sx = Math.min(vw - 1, Math.floor((gx + 0.5) * cellW));
        const k = rowBase + sx * 4;
        if (k + 2 >= pix.length) continue;
        const v = ((pix[k] + pix[k + 1] + pix[k + 2]) / 3) | 0;
        if (v >= thr) mask[gy * Gx + gx] = 1;
      }
    }

    const seen = new Array(Gx * Gy).fill(0);
    const minCells = params.detection.luma.minCells;
    const inBounds = (x: number, y: number) => x >= 0 && x < Gx && y >= 0 && y < Gy;

    for (let gy = 0; gy < Gy; gy++) {
      for (let gx = 0; gx < Gx; gx++) {
        const idx = gy * Gx + gx;
        if (!mask[idx] || seen[idx]) continue;
        let minX = gx, maxX = gx, minY = gy, maxY = gy, size = 0;
        const stack = [[gx, gy]];
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          const cidx = cy * Gx + cx;
          if (!inBounds(cx, cy) || !mask[cidx] || seen[cidx]) continue;
          seen[cidx] = 1; size++;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]].forEach(([nx, ny]) => {
             if(inBounds(nx,ny)) stack.push([nx,ny]);
          });
        }
        if (size >= minCells) {
          out.push({
            x: minX * cellW, y: minY * cellH,
            w: Math.max(1, (maxX - minX + 1) * cellW),
            h: Math.max(1, (maxY - minY + 1) * cellH),
            label: 'luma', 
            score: 1,
            labelIndex: out.length
          });
        }
      }
    }
    return out;
  };

  const pointInAnyBox = (x: number, y: number, boxes: any[]) => {
    // boxes are in video coordinates
    for (const b of boxes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  };

  const getPoseBoxes = (vw: number, vh: number, conf: number) => {
     const out = [];
     for(const pr of poses){
       const kps = pr?.pose?.keypoints||[];
       let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
       let valid=false;
       for(const kp of kps){
         if((kp.score??kp.confidence??0) < conf) continue;
         valid=true;
         minX=Math.min(minX, kp.position.x); minY=Math.min(minY, kp.position.y);
         maxX=Math.max(maxX, kp.position.x); maxY=Math.max(maxY, kp.position.y);
       }
       if(!valid || !isFinite(minX)) continue;
       const pad=20;
       minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
       maxX=Math.min(vw,maxX+pad); maxY=Math.min(vh,maxY+pad);
       out.push({x:minX, y:minY, w:maxX-minX, h:maxY-minY, label:'person', score:1});
     }
     return out;
  };

  // --- Sketch ---
  const sketch = (p: any) => {
    p.setup = () => {
      p.createCanvas(640, 480);
      p.pixelDensity(1);
      p.textFont('JetBrains Mono, monospace');
      updateStyle();
      applyFontMetrics(p);

      // Start with camera
      vid = p.createCapture(p.VIDEO, () => {
        vidReady = true;
        vid.size(640, 480);
        vid.hide();
        fitCanvas(p);
        initDetectors();
      });
    };

    const initDetectors = () => {
       if(typeof ml5 !== 'undefined') {
         try {
           coco = ml5.objectDetector('cocossd', () => { 
             if(params.detection.mode === 'objects') startCoco(); 
           });
           poseNet = ml5.poseNet(vid, { detectionType:'multiple', flipHorizontal:false }, () => {});
           poseNet.on('pose', (r: any) => { poses = r || []; poseReady = true; });
         } catch(e) { console.error(e); }
       }
    };

    p.draw = () => {
      if (!vidReady) {
        p.background(0);
        p.fill(100);
        p.text("Initializing Camera/Video...", 20, 20);
        return;
      }
      
      const cw = p.width;
      const ch = p.height;
      const vw = vid.width;
      const vh = vid.height;

      // Calculate "Cover" fit
      // We want the video to cover the canvas completely.
      // Scale factor
      const scale = Math.max(cw / vw, ch / vh);
      
      // Update global vars for drawing logic
      scaleX = scale;
      scaleY = scale;
      
      // Calculate offsets to center the video
      const scaledW = vw * scale;
      const scaledH = vh * scale;
      offsetX = (cw - scaledW) / 2;
      offsetY = (ch - scaledH) / 2;

      // Helper to transform video coord to canvas coord
      const toCanvas = (vx: number, vy: number) => ({
         x: vx * scale + offsetX,
         y: vy * scale + offsetY
      });
      
      function drawBox(b:any, colorHex:string, w:number, label?:string, showLabel?:boolean, isLuma?:boolean) {
         const pos = toCanvas(b.x, b.y);
         const bw = b.w * scale;
         const bh = b.h * scale;
         
         const c = hexToRgb(colorHex);
         p.noFill();
         p.stroke(c[0], c[1], c[2]);
         p.strokeWeight(w);
         p.rect(pos.x, pos.y, bw, bh);
         
         if (label && showLabel) {
            p.noStroke();
            const labelColor = isLuma ? hexToRgb(params.detection.luma.labelColor) : hexToRgb(params.detection.objects.labelColor);
            const labelSize = isLuma ? params.detection.luma.labelSize : params.detection.objects.labelSize;
            p.fill(labelColor[0], labelColor[1], labelColor[2]);
            p.textSize(labelSize);
            p.text(label, pos.x, pos.y - labelSize - 2);
         }
      }

      const bg = hexToRgb(params.ascii.backgroundColor);
      p.background(bg[0], bg[1], bg[2]);

      // If ASCII is disabled OR if showVideo is true, draw the raw video
      if (!params.ascii.enabled || params.ascii.showVideo) {
         const videoOpacity = params.ascii.showVideo ? (params.ascii.videoOpacity || 1.0) : 1.0;
         p.tint(255, 255, 255, videoOpacity * 255);
         p.image(vid, offsetX, offsetY, scaledW, scaledH);
         p.tint(255, 255, 255, 255); // Reset tint
      }

      // Detection
      let boxesVid: any[] = [];
      const mode = params.detection.mode;
      const conf = params.detection.confidence;

      if (mode !== 'off') {
        if (mode === 'objects' && objects.length) {
           boxesVid = objects.filter((o:any) => (o.confidence??o.score??0) >= conf).map((o:any) => ({
               x:o.x, y:o.y, w:o.width, h:o.height, label:o.label||o.class, score:o.confidence??o.score
           }));
        } else if (mode === 'features' && poseReady) {
           boxesVid = getPoseBoxes(vw, vh, conf);
        }
        
        let lumaBoxes: any[] = [];
        if (mode === 'luma' || params.detection.luma.enabled) {
           lumaBoxes = getLumaBoxes(vw, vh, p);
           if (mode === 'luma') boxesVid = lumaBoxes;
           else if (params.detection.luma.feedAscii) boxesVid = [...boxesVid, ...lumaBoxes];
        }

        if (params.detection.luma.enabled && params.detection.luma.showBoxes) {
           lumaBoxes.forEach((b) => {
             const labelText = params.detection.luma.showLabels ? getLumaLabel(b) : undefined;
             drawBox(b, params.detection.luma.strokeColor, params.detection.luma.strokeWeight, labelText, true, true);
           });
        }
      }

      // ASCII Processing
      if (params.ascii.enabled) {
        vid.loadPixels();
        const pix = vid.pixels;
        if (pix.length > 0) {
          p.noStroke();
          p.textSize(params.ascii.fontSize);
          p.textLeading(lineH);
          p.textAlign(p.LEFT, p.TOP);

          if (!params.ascii.useVideoColors) updatePalLut();

          // We iterate through canvas rows/cols
          for (let j = 0; j < ROWS; j++) {
             // Canvas Y
             const yCanvas = j * lineH;
             // Sample center of the cell
             const cy = yCanvas + lineH/2;
             
             // Map back to video Y
             // yCanvas = vy * scale + offsetY  =>  vy = (yCanvas - offsetY) / scale
             const vy = Math.floor((cy - offsetY) / scale);
             
             // If out of video bounds, skip (cropping)
             if (vy < 0 || vy >= vh) continue;
             
             const rowBase = vy * vw * 4;
             let xCanvas = 0;
            
            const density = params.ascii.density || 1.0;
            const densityStep = Math.max(1, Math.round(1 / density));
            
            for (let i = 0; i < COLS; i += densityStep) {
               // Canvas X current pos
               const cx = xCanvas + charW/2;
               
               // Map back to video X
               const vx = Math.floor((cx - offsetX) / scale);

               if (vx < 0 || vx >= vw) {
                  xCanvas += charW * densityStep;
                  continue; 
               }
               
               // Check boxes in video coordinates
               if (params.ascii.asciiOnlyInBox && mode !== 'off') {
                  if (!pointInAnyBox(vx, vy, boxesVid)) { xCanvas += charW; continue; }
               }
               
               const k = rowBase + vx * 4;
               const r = pix[k];
               const g = pix[k+1];
               const b = pix[k+2];
               const v = ((r+g+b)/3)|0;

               if (params.ascii.useThreshold && v < params.ascii.threshold) { xCanvas += charW; continue; }

               const vv = params.ascii.invert ? (255 - v) : v;
               const ch = CHAR_LUT[vv] || " ";
               
               let col = [r, g, b];
               if (!params.ascii.useVideoColors) col = PAL_LUT[vv] || col;

               p.fill(col[0], col[1], col[2]);
               p.text(ch, xCanvas, yCanvas); // Draw at canvas coordinates
               xCanvas += charW * densityStep;
            }
          }
        }
      }

      // Draw Object/Pose Boxes if mode is active (Overlays)
      if (mode !== 'off') {
        if (mode === 'objects' && params.detection.objects.showBoxes) {
           boxesVid.forEach((b:any) => {
               if (b.label === 'luma') return;
               let lbl = params.detection.objects.labelTemplate.replace('{class}', b.label)
                         .replace('{score}', (b.score||0).toFixed(1))
                         .replace('{pct}', Math.round((b.score||0)*100)+'%');
               drawBox(b, params.detection.objects.borderColor, params.detection.objects.borderWidth, lbl, params.detection.objects.showLabels);
           });
        }

        if (mode === 'features') {
            if (params.detection.pose.showBodyBox) {
               boxesVid.forEach(b => drawBox(b, params.detection.pose.bodyBoxColor, params.detection.pose.bodyBoxWidth));
            }
            if (params.detection.pose.showSkeleton && poses.length) {
               const c = hexToRgb(params.detection.pose.skeletonColor);
               p.stroke(c[0], c[1], c[2]);
               p.strokeWeight(params.detection.pose.skeletonWidth);
               p.noFill();
               poses.forEach((pr:any) => {
                  if (pr.skeleton) {
                     pr.skeleton.forEach((seg:any) => {
                        const p1v = seg[0].position; // video coord
                        const p2v = seg[1].position;
                        const p1 = toCanvas(p1v.x, p1v.y);
                        const p2 = toCanvas(p2v.x, p2v.y);
                        p.line(p1.x, p1.y, p2.x, p2.y);
                     });
                  }
               });
            }
        }
      }

      // Lines between
      if (params.overlay.showLines && boxesVid.length > 1 && mode !== 'off') {
         const c = hexToRgb(params.overlay.lineColor);
         p.stroke(c[0], c[1], c[2]);
         p.strokeWeight(params.overlay.lineWidth);
         p.noFill();
         
         // Convert all centers to canvas space
         const centers = boxesVid.map(b => toCanvas(b.x + b.w/2, b.y + b.h/2));

         for (let i = 0; i < centers.length; i++) {
            for (let j = i + 1; j < centers.length; j++) {
               const p1 = centers[i];
               const p2 = centers[j];
               if (params.overlay.straightLines) {
                  p.line(p1.x, p1.y, p2.x, p2.y);
               } else {
                  const mx = (p1.x + p2.x) / 2;
                  const my = (p1.y + p2.y) / 2 - (params.overlay.curve * 50);
                  p.beginShape();
                  p.vertex(p1.x, p1.y);
                  p.quadraticVertex(mx, my, p2.x, p2.y);
                  p.endShape();
               }
            }
         }
      }

      // --- Recording ---
      if (mp4Rec.active) {
          if (p.millis() - mp4Rec.startTime >= MP4_MAX_DURATION) {
             stopMp4Rec();
          } else {
             const s = Math.floor((p.millis() - mp4Rec.startTime)/1000);
             onStatusUpdate(`Recording MP4... ${s}s`);
          }
      }

      if (pngRec.active && !pngRec.processing) {
          const now = p.millis();
          if (now - pngRec.lastFrameTime >= (1000 / pngRec.targetFPS)) {
             p.drawingContext.canvas.toBlob((blob: Blob) => {
                 if (blob && pngRec.active) {
                     pngRec.frames.push({blob, index: pngRec.frameCount++, timestamp: now - pngRec.startTime});
                     onStatusUpdate(`Recording PNG... ${pngRec.frameCount} frames`);
                 }
             }, 'image/png', 1.0);
             pngRec.lastFrameTime = now;
          }
      }
    };
  };

  // --- External Control ---
  const stopMp4Rec = () => {
    if (!mp4Rec.active) return;
    if (mp4Rec.recorder.state !== 'inactive') mp4Rec.recorder.stop();
    mp4Rec.active = false;
    onStatusUpdate('Processing MP4...');
  };

  const controller: SketchController = {
    updateParams: (newParams) => {
      params = JSON.parse(JSON.stringify(newParams));
      updateStyle();
      if(p5Instance) fitCanvas(p5Instance);
      if(params.detection.mode === 'objects') startCoco(); else stopCoco();
    },
    loadVideo: (file) => {
      try {
        const url = URL.createObjectURL(file);
        if (vid) vid.remove();
        vid = p5Instance.createVideo(url, () => {
          vidReady = true;
          vid.hide();
          vid.loop();
          vid.volume(0);
          fitCanvas(p5Instance);
          onStatusUpdate('Video loaded');
        }, (err: any) => {
          console.error('Video load error:', err);
          onStatusUpdate('Error: Failed to load video file');
          URL.revokeObjectURL(url);
        });
      } catch (err) {
        console.error('Video error:', err);
        onStatusUpdate('Error: Invalid video file');
      }
    },
    toggleCamera: () => {
       if(vid) vid.remove();
       vid = p5Instance.createCapture(p5Instance.VIDEO, () => {
          vidReady = true;
          vid.hide();
          fitCanvas(p5Instance);
          onStatusUpdate('Camera active');
       }, (err: any) => {
          console.error('Camera error:', err);
          onStatusUpdate('Error: Camera access denied or unavailable');
       });
    },
    startMp4: () => {
      if(mp4Rec.active) return;
      const stream = p5Instance.canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mp4Rec.recorder = recorder;
      mp4Rec.chunks = [];
      recorder.ondataavailable = (e: any) => { if(e.data.size > 0) mp4Rec.chunks.push(e.data); };
      recorder.onstop = () => {
         const blob = new Blob(mp4Rec.chunks, { type: mime });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `ascii-rec-${Date.now()}.webm`;
         a.click();
         onStatusUpdate('MP4 Saved');
      };
      recorder.start();
      mp4Rec.active = true;
      mp4Rec.startTime = p5Instance.millis();
    },
    stopMp4: stopMp4Rec,
    startPng: () => {
       pngRec.active = true;
       pngRec.frames = [];
       pngRec.frameCount = 0;
       pngRec.startTime = p5Instance.millis();
       pngRec.processing = false;
    },
    stopPng: async () => {
       if(!pngRec.active) return;
       pngRec.active = false;
       pngRec.processing = true;
       onStatusUpdate(`Zipping ${pngRec.frames.length} frames...`);
       
       const zip = new JSZip();
       pngRec.frames.forEach((f) => {
          const name = `frame_${String(f.index).padStart(6, '0')}.png`;
          zip.file(name, f.blob);
       });
       const content = await zip.generateAsync({type:'blob'});
       const url = URL.createObjectURL(content);
       const a = document.createElement('a');
       a.href = url;
       a.download = `ascii-seq-${Date.now()}.zip`;
       a.click();
       onStatusUpdate('PNG Sequence Saved');
       pngRec.processing = false;
    },
    cleanup: () => {
       stopCoco();
       if(vid) vid.remove();
       if(p5Instance) p5Instance.remove();
    }
  };

  p5Instance = new p5(sketch, container);
  return controller;
};
