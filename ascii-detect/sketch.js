// Stable, responsive ASCII + COCO objects OR Pose features (skeleton/keypoints + head box + head circle).
// Desktop: right panel. Mobile: overlay panel via ⚙. No Unlock button.
// 25fps PNG sequence with cap. Multiple ASCII styles. Palette LUT. One-detector-at-a-time.

// ------- Config -------
let CAM_W = 640, CAM_H = 480; // default landscape; can be toggled via UI
let COLS = 160, ROWS = 120, FONT_PX = 12;
const PNG_MAX_FRAMES = 900; // ~36s at 25 fps
const MAX_BOX_FRAC = 0.9;   // drop detections that cover ~whole frame to avoid full-screen glitches

// ------- State -------
let cv, dbg, vid, vidReady=false;
let charW=8, lineH=10;
let DENSITY = "Ñ@#W$9876543210?!abc;:+=-,._          ";
let CHAR_LUT = new Array(256);        // 0..255 -> char
let PAL_LUT  = new Array(256);        // 0..255 -> [r,g,b]

// UI refs
let ui;
let selCam, selRes, bUse, bRescan, bNext;

let chkVideo, chkAscii, chkAsciiOnly, chkThr, rngThr, chkInv;
let selDet, rngConf;

let chkBoxes, clrBorder, rngBorder, chkLabels, lblTpl, lblSize, lblDec, clrLabel;

let chkPoseBox, clrPoseBox, rngPoseBox;
let chkPoseSkel, clrSkel, rngSkelW;
let chkPosePts, clrPts, rngPtSize, chkPoseNames;
let chkHeadBox, clrHeadBox, rngHeadBox;
let chkHeadCircle, clrHeadCircle, rngHeadCircleW; // NEW: head circle

let chkLines, clrLine, rngLineW, rngCurv;

let chkVideoColors, selPalette, clrA, clrB, wrapA, wrapB, clrBG;

let bRecStart, bRecStop, recStatus, recLink;

let selStyle, inpCustom, chkAutoRows, rngCols, rngFont, rngCellH;

// Detections
let coco=null, cocoLoopId=null, cocoBusy=false, objects=[];
let poseNet=null, poses=[], poseReady=false;

// Cameras
let devices=[], lastCamId=null, camIndex=0;

// PNG recorder
let pngRec={ active:false, frames:[], nextIdx:0, lastMs:0, intervalMs:40, pending:false };

// ------- Setup -------
function setup(){
  frameRate(30);

  dbg = select('#dbg');
  cv = createCanvas(10,10);
  // speed hint for heavy getImageData readback inside p5
  try { cv.elt.getContext('2d', { willReadFrequently:true }); } catch(e){}
  cv.parent("stage");
  cv.style("image-rendering","pixelated");
  cv.style("transform-origin","top left");

  textFont('Cascadia Mono, Menlo, Consolas, monospace');
  applyFontMetrics();
  precomputeCharLUT();
  pixelDensity(1);

  buildUI();
  fitCanvasToViewport();

  // Start camera
  initCamera();

  if (navigator.mediaDevices?.addEventListener){
    navigator.mediaDevices.addEventListener('devicechange', async ()=>{
      await listCams();
      if (lastCamId && devices.some(d=>d.deviceId===lastCamId)) selCam.value(lastCamId);
    });
  }

  // Debounced resize
  let rT;
  window.addEventListener('resize', ()=>{ clearTimeout(rT); rT=setTimeout(fitCanvasToViewport, 120); }, {passive:true});
  window.addEventListener('orientationchange', ()=>setTimeout(fitCanvasToViewport, 200), {passive:true});

  // Cleanup
  window.addEventListener('beforeunload', ()=>{
    stopCocoLoop();
    stopAllTracks();
  });
}

// ------- Responsive scaling -------
function fitCanvasToViewport(){
  if (chkAutoRows && chkAutoRows.checked() && vidReady) recomputeRowsToMatchAspect();
  const W = Math.max(1, Math.floor(charW*COLS));
  const H = Math.max(1, Math.floor(lineH*ROWS) + FONT_PX);
  resizeCanvas(W, H);

  const stage = document.getElementById('stage');
  const availW = stage.clientWidth || window.innerWidth;
  const availH = stage.clientHeight || window.innerHeight;
  const scale = Math.min(availW/W, availH/H);
  cv.style("transform", `scale(${scale})`);
  const padX = Math.max(0, (availW - W*scale) * 0.5);
  const padY = Math.max(0, (availH - H*scale) * 0.5);
  cv.position(padX, padY);
}

// ------- Camera -------
function stopAllTracks(){
  if (!vid?.elt?.srcObject) return;
  for (const t of vid.elt.srcObject.getTracks()) try{ t.stop(); }catch(_){}
}
async function listCams(){
  const list=await navigator.mediaDevices.enumerateDevices();
  devices=list.filter(d=>d.kind==='videoinput');
  const current=lastCamId||selCam?.value();
  selCam.elt.innerHTML="";
  devices.forEach((d,i)=>{
    const label=d.label?.trim()||`Camera ${i+1}`;
    const short=(d.deviceId||'').slice(0,8);
    const o=createElement('option', `${label} [${short}]`); o.attribute('value', d.deviceId); selCam.child(o);
  });
  if (devices.length===0){ const o=createElement('option','No cameras'); o.attribute('value',''); selCam.child(o); }
  if (current && devices.some(d=>d.deviceId===current)) selCam.value(current);
  log(`cams: ${devices.length}`);
}
function nextCam(){
  if(!devices.length) return;
  camIndex=(camIndex+1)%devices.length;
  const id=devices[camIndex].deviceId;
  selCam.value(id); lastCamId=id; initCamera(id);
}
async function initCamera(deviceId=null){
  stopCocoLoop();
  if (vid){
    try{ stopAllTracks(); }catch(_){}
    try{ vid.remove(); }catch(_){}
  }
  vidReady=false;

  const constraints={ audio:false, video: deviceId?{width:CAM_W,height:CAM_H,deviceId:{exact:deviceId}}:{width:CAM_W,height:CAM_H} };
  vid=createCapture(constraints, async()=>{ await listCams(); });
  vid.size(CAM_W, CAM_H);
  vid.elt.playsInline=true; vid.elt.autoplay=true;
  vid.hide();
  vid.elt.addEventListener('loadeddata', onVideoReady, {once:true});
  lastCamId=deviceId||null;
}
async function onVideoReady(){
  vidReady=true;
  initPose();                // init pose once
  maybeStartCoco();          // start coco if mode=objects
  if (chkAutoRows && chkAutoRows.checked()) recomputeRowsToMatchAspect();
  fitCanvasToViewport();
}

// ------- Detectors -------
function initPose(){
  if (poseNet) return; // reuse
  try{
    poseNet = ml5.poseNet(vid, { detectionType:'multiple', flipHorizontal:false }, ()=>{ /* ready */ });
    poseNet.on('pose', r=>{ poses=r||[]; poseReady=true; });
  }catch(e){ log("PoseNet unavailable"); }
}
function maybeStartCoco(){
  if ((selDet?.value()||"off")!=="objects") { stopCocoLoop(); return; }
  if (coco) { startCocoLoop(); return; }
  try{
    coco = ml5.objectDetector('cocossd', ()=>{ startCocoLoop(); });
  }catch(e){ log("COCO-SSD unavailable"); }
}
function startCocoLoop(){
  stopCocoLoop();
  cocoLoopId = setInterval(async ()=>{
    if (!coco || cocoBusy || !videoHasData()) return;
    cocoBusy = true;
    try{
      coco.detect(vid, (err,res)=>{
        if (!cocoLoopId) return;
        if (!err && res) objects = res;
        cocoBusy = false;
      });
    }catch(_){ cocoBusy=false; }
  }, 160); // ~6 fps
}
function stopCocoLoop(){
  if (cocoLoopId){ clearInterval(cocoLoopId); cocoLoopId=null; }
  cocoBusy=false;
}
function videoHasData(){ const v=vid?.elt; return !!(v && v.readyState>=2 && v.videoWidth>0); }

// ------- Draw -------
function draw(){
  try{
    if(!vidReady || !videoHasData()){ background(0); fill(200); text("Waiting for camera…", 12, 18); return; }

    const cw=width, ch=height, vw=vid.width, vh=vid.height;
    const bgHex = clrBG?.value() || "#000000";
    const bgc=color(bgHex); background(red(bgc),green(bgc),blue(bgc),255);

    if (chkVideo?.checked()) image(vid, 0, 0, cw, ch);

    const mode = selDet?.value() || "off";
    const conf = (rngConf && typeof rngConf.value==="function") ? rngConf.value() : 0.5;

    // Gather detections in video space
    let boxesVid = [];
    let headBoxesVid = [];
    let headCirclesVid = []; // NEW head circles
    if (mode==='objects' && coco){
      const src = Array.isArray(objects)?objects:[];
      boxesVid = src
        .map(o=>({x:o.x,y:o.y,w:o.width,h:o.height,label:o.label||o.class||'obj',score:o.confidence??o.score??0.99}))
        .map(b=>{
          // Clamp to valid video bounds to avoid NaN / negative / overshoot
          let x = Number.isFinite(b.x) ? b.x : 0;
          let y = Number.isFinite(b.y) ? b.y : 0;
          let w = Number.isFinite(b.w) ? b.w : 1;
          let h = Number.isFinite(b.h) ? b.h : 1;
          x = Math.max(0, Math.min(vw-1, x));
          y = Math.max(0, Math.min(vh-1, y));
          w = Math.max(1, Math.min(vw - x, w));
          h = Math.max(1, Math.min(vh - y, h));
          return { x, y, w, h, label:b.label, score:b.score };
        })
        // Ignore giant boxes that basically cover the whole frame (they look like glitches)
        .filter(b => !((b.w/vw)>=MAX_BOX_FRAC && (b.h/vh)>=MAX_BOX_FRAC));
    } else if (mode==='features' && poseReady){
      boxesVid = getPoseBoxes(vw, vh, conf);
      headBoxesVid = getHeadBoxes(vw, vh, conf);
      headCirclesVid = getHeadCircles(vw, vh, conf);
    }

    // If ASCII only inside detections, mask those regions first
    const asciiOnly = chkAsciiOnly?.checked();
    if (chkAscii?.checked() && asciiOnly && chkVideo?.checked()){
      noStroke(); fill(red(bgc),green(bgc),blue(bgc),255);
      for (const b of boxesVid){
        const x=(b.x/vw)*cw, y=(b.y/vh)*ch, w=(b.w/vw)*cw, h=(b.h/vh)*ch;
        rect(x,y,w,h);
      }
    }

    // Build palette LUT once per frame if not using video colors
    const useVideoCols = chkVideoColors?.checked();
    if (!useVideoCols){
      const palName = selPalette?.value() || "cyberpunk";
      const A = hexToRgb(clrA?.value() || "#00ff88");
      const B = hexToRgb(clrB?.value() || "#ffffff");
      for (let v=0; v<256; v++){
        const t = v/255;
        PAL_LUT[v] = pickPalette(palName, t, A, B);
      }
    }

    // ASCII pass
    if (chkAscii?.checked() && videoHasData()){
      vid.loadPixels();
      const pix=vid.pixels;
      const useThr = chkThr?.checked();
      const thr = rngThr?.value() ?? 128;
      const inv = chkInv?.checked();

      noStroke(); textSize(FONT_PX); textLeading(lineH); textAlign(LEFT,TOP);

      for (let j=0;j<ROWS;j++){
        let xCanvas=0; const yCanvas=j*lineH;
        const sy=Math.min(vh-1, Math.floor(j*vh/ROWS));
        const rowBase=sy*vw*4;
        for (let i=0;i<COLS;i++){
          const sx=Math.min(vw-1, Math.floor(i*vw/COLS));
          if (asciiOnly && mode!=='off' && !pointInAnyBox(sx, sy, boxesVid)) { xCanvas+=charW; continue; }

          const k=rowBase + sx*4;
          if (k+2 >= pix.length) { xCanvas+=charW; continue; }
          const r=pix[k], g=pix[k+1], b=pix[k+2];
          const v=((r+g+b)/3)|0;
          if (useThr && v < thr){ xCanvas+=charW; continue; }

          const vv = inv ? (255 - v) : v;
          const ch = CHAR_LUT[vv] || " ";

          let col = [r,g,b];
          if (!useVideoCols) col = PAL_LUT[vv] || col;

          fill(col[0], col[1], col[2]);
          text(ch, xCanvas, yCanvas);
          xCanvas += charW;
        }
      }
    }

    // Canvas-space boxes / circles
    const boxes = boxesVid.map(b=>({ x:(b.x/vw)*cw, y:(b.y/vh)*ch, w:(b.w/vw)*cw, h:(b.h/vh)*ch, label:b.label, score:b.score }));
    const headBoxes = headBoxesVid.map(b=>({ x:(b.x/vw)*cw, y:(b.y/vh)*ch, w:(b.w/vw)*cw, h:(b.h/vh)*ch }));
    const headCircles = headCirclesVid.map(c=>({ cx:(c.cx/vw)*cw, cy:(c.cy/vh)*ch, r:(c.r/vw)*cw })); // scale by width

    // Objects: boxes + labels
    if (mode==='objects'){
      if (chkBoxes?.checked()){
        const bc = clrBorder?.value() || "#00ff88";
        const bw = rngBorder?.value() || 3;
        noFill(); stroke(bc); strokeWeight(bw);
        for (const b of boxes) rect(b.x,b.y,b.w,b.h,4);
      }
      if (chkLabels?.checked()){
        const tc=color(clrLabel?.value() || "#ffffff");
        const fs=lblSize?.value() || 14;
        const dec=lblDec?.value() || 0;
        const tpl=(lblTpl?.value && lblTpl.value()) || "{class} {pct}%";
        noStroke(); fill(red(tc),green(tc),blue(tc)); textSize(fs); textAlign(LEFT,TOP);
        for (const b of boxes){
          const s = b.score ?? 0;
          const txt = tpl.replaceAll("{class}", b.label||"obj")
                         .replaceAll("{score}", String(s.toFixed(dec)))
                         .replaceAll("{pct}", String((s*100).toFixed(dec)));
          let tx=b.x+2, ty=b.y - (fs+4);
          if (ty < 2) ty = b.y + 2;
          text(txt, tx, ty);
        }
      }
    }

    // Pose: body box + skeleton + keypoints + head box + head circle
    if (mode==='features' && poseReady){
      if (chkPoseBox?.checked()){
        const bc = clrPoseBox?.value() || "#00ffaa";
        const bw = rngPoseBox?.value() || 3;
        noFill(); stroke(bc); strokeWeight(bw);
        for (const b of boxes) rect(b.x,b.y,b.w,b.h,4);
      }

      // Head box
      if (chkHeadBox?.checked()){
        const hc = clrHeadBox?.value() || "#ff66aa";
        const hw = rngHeadBox?.value() || 3;
        noFill(); stroke(hc); strokeWeight(hw);
        for (const hb of headBoxes) rect(hb.x, hb.y, hb.w, hb.h, 4);
      }

      // Head circle
      if (chkHeadCircle?.checked()){
        const cc = clrHeadCircle?.value() || "#00ffcc";
        const cwk = rngHeadCircleW?.value() || 3;
        noFill(); stroke(cc); strokeWeight(cwk);
        for (const hc of headCircles){
          circle(hc.cx, hc.cy, hc.r*2);
        }
      }

      const skelOn = chkPoseSkel?.checked();
      const ptsOn  = chkPosePts?.checked();
      if (skelOn || ptsOn){
        const skc = clrSkel?.value() || "#88ccff";
        const skw = rngSkelW?.value() || 3;
        const ptc = clrPts?.value() || "#ffd166";
        const psz = rngPtSize?.value() || 4;

        for (const pr of poses){
          const kps = pr?.pose?.keypoints || [];
          if (ptsOn){
            noStroke(); fill(ptc);
            for (const kp of kps){
              const s=kp.score??kp.confidence??0; if(s<rngConf.value()) continue;
              const x = (kp.position?.x||0)/vw*cw;
              const y = (kp.position?.y||0)/vh*ch;
              circle(x,y,psz);
              if (chkPoseNames?.checked()){
                const nm = kp.part || kp.name || "";
                textSize(11); fill(ptc); textAlign(LEFT,BOTTOM);
                text(nm, x+4, y-2);
              }
            }
          }
          if (skelOn){
            stroke(skc); strokeWeight(skw); noFill();
            if (Array.isArray(pr.skeleton) && pr.skeleton.length){
              for (const seg of pr.skeleton){
                const a=seg[0]?.position, b=seg[1]?.position;
                if (!a||!b) continue;
                line(a.x/vw*cw, a.y/vh*ch, b.x/vw*cw, b.y/vh*ch);
              }
            }else{
              const map = {}; for (const kp of kps){ map[kp.part||kp.name]=kp.position; }
              const pairs = [
                ["leftShoulder","rightShoulder"],
                ["leftShoulder","leftElbow"],["leftElbow","leftWrist"],
                ["rightShoulder","rightElbow"],["rightElbow","rightWrist"],
                ["leftHip","rightHip"],
                ["leftShoulder","leftHip"],["rightShoulder","rightHip"],
                ["leftHip","leftKnee"],["leftKnee","leftAnkle"],
                ["rightHip","rightKnee"],["rightKnee","rightAnkle"],
                ["nose","leftEye"],["leftEye","leftEar"],
                ["nose","rightEye"],["rightEye","rightEar"]
              ];
              for (const [p,q] of pairs){
                const A=map[p], B=map[q]; if(!A||!B) continue;
                line(A.x/vw*cw, A.y/vh*ch, B.x/vw*cw, B.y/vh*ch);
              }
            }
          }
        }
      }
    }

    // Lines between detections (body boxes)
    if (chkLines?.checked() && mode!=='off' && boxes.length>=2){
      const lc=color(clrLine?.value() || "#88ccff");
      const lw=rngLineW?.value() || 3;
      const curv=rngCurv?.value() || 0.6;
      stroke(red(lc),green(lc),blue(lc)); strokeWeight(lw); noFill();
      for (let i=0;i<boxes.length;i++){
        for (let j=i+1;j<boxes.length;j++){
          const a=center(boxes[i]), b=center(boxes[j]);
          if (curv===0){
            line(a.x,a.y,b.x,b.y);
          }else{
            const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
            const dx=b.x-a.x, dy=b.y-a.y;
            const len=Math.hypot(dx,dy)||1;
            const nx=-dy/len, ny=dx/len;
            const off = curv * len * 0.3;
            drawingContext.beginPath();
            drawingContext.moveTo(a.x,a.y);
            drawingContext.quadraticCurveTo(mx+nx*off,my+ny*off,b.x,b.y);
            drawingContext.stroke();
          }
        }
      }
    }

    // PNG 25fps with cap
    if (pngRec.active && !pngRec.pending && (millis() - pngRec.lastMs) >= pngRec.intervalMs){
      if (pngRec.nextIdx >= PNG_MAX_FRAMES){ stopPng(); }
      else {
        pngRec.pending = true;
        pngRec.lastMs = millis();
        const name = `frame_${String(pngRec.nextIdx).padStart(5,'0')}.png`;
        cv.elt.toBlob((blob)=>{
          if (blob){
            pngRec.frames.push({ name, blob });
            pngRec.nextIdx++;
            recStatus && recStatus.html(`PNG 25fps… ${pngRec.frames.length}`);
          }
          pngRec.pending = false;
        }, "image/png");
      }
    }
  }catch(e){
    log("draw error: "+e.message);
  }
}

// ------- Proportion helpers -------
function recomputeRowsToMatchAspect(){
  if (!vidReady) return;
  const vw = vid.width || CAM_W, vh = vid.height || CAM_H;
  const target = (COLS*charW) / (vw/vh) / lineH;
  // keep total cells under ~40k for stability
  ROWS = Math.max(8, Math.min( Math.round(target), Math.floor(40000/Math.max(1,COLS)) ));
}

// ------- UI -------
function buildUI(){
  ui = select('#ui');

  // Camera
  selCam=createSelect();
  selRes=createSelect();
  ["landscape","portrait"].forEach(x=>selRes.option(x));
  selRes.selected("landscape");
  selRes.changed(()=>{
    if (selRes.value()==="portrait"){
      CAM_W = 480; CAM_H = 640;
    } else {
      CAM_W = 640; CAM_H = 480;
    }
    initCamera(lastCamId);
  });
  section("Camera", [
    label("Cam"), selCam,
    bUse=btn("Use", ()=>{ const id=selCam.value(); lastCamId=id||null; initCamera(id); }),
    bRescan=btn("Rescan", listCams),
    bNext=btn("Next", nextCam),
    label("Res"), selRes
  ]);

  // Detection mode
  selDet=createSelect(); ["off","objects","features"].forEach(x=>selDet.option(x)); selDet.selected("features");
  rngConf=createSlider(0.1,0.9,0.5,0.01);
  section("Detection", [ label("Mode"), selDet, label("Conf"), rngConf ]);
  selDet.changed(()=>{ if (selDet.value()==="objects") maybeStartCoco(); else stopCocoLoop(); });

  // Objects
  chkBoxes=createCheckbox("Boxes", true);
  clrBorder=createColorPicker("#00ff88");
  rngBorder=createSlider(1,12,3,1);
  chkLabels=createCheckbox("Labels", true);
  lblTpl=createInput("{class} {pct}%");
  lblSize=createSlider(10,28,14,1);
  lblDec=createSlider(0,3,0,1);
  clrLabel=createColorPicker("#ffffff");
  section("Objects", [
    chkBoxes, label("Color"), clrBorder, label("px"), rngBorder,
    chkLabels, label("Tpl"), lblTpl, label("Size"), lblSize, label("Dec"), lblDec, label("Txt"), clrLabel
  ]);

  // Pose features + head box + head circle
  chkPoseBox=createCheckbox("Body box", false);
  clrPoseBox=createColorPicker("#00ffaa");
  rngPoseBox=createSlider(1,12,3,1);
  chkHeadBox=createCheckbox("Head box", true);
  clrHeadBox=createColorPicker("#ff66aa");
  rngHeadBox=createSlider(1,12,3,1);
  chkHeadCircle=createCheckbox("Head circle", true);
  clrHeadCircle=createColorPicker("#00ffcc");
  rngHeadCircleW=createSlider(1,12,3,1);
  chkPoseSkel=createCheckbox("Skeleton", true);
  clrSkel=createColorPicker("#88ccff");
  rngSkelW=createSlider(1,12,3,1);
  chkPosePts=createCheckbox("Keypoints", true);
  clrPts=createColorPicker("#ffd166");
  rngPtSize=createSlider(2,12,4,1);
  chkPoseNames=createCheckbox("Names", false);
  section("Pose features", [
    chkPoseBox, label("BoxCol"), clrPoseBox, label("px"), rngPoseBox,
    chkHeadBox, label("HeadCol"), clrHeadBox, label("px"), rngHeadBox,
    chkHeadCircle, label("CircCol"), clrHeadCircle, label("px"), rngHeadCircleW,
    chkPoseSkel, label("SkelCol"), clrSkel, label("px"), rngSkelW,
    chkPosePts, label("PtCol"), clrPts, label("size"), rngPtSize, chkPoseNames
  ]);

  // ASCII basics
  chkVideo=createCheckbox("Video", true);
  chkAscii=createCheckbox("ASCII", true);
  chkAsciiOnly=createCheckbox("ASCII-in-box", false);
  chkThr=createCheckbox("", false);
  rngThr=createSlider(0,255,128,1);
  chkInv=createCheckbox("Invert", false);
  clrBG=createColorPicker("#000000");
  section("ASCII", [
    chkVideo, chkAscii, chkAsciiOnly, label("Thr"), chkThr, rngThr, chkInv, label("BG"), clrBG
  ]);

  // ASCII styles and grid
  selStyle=createSelect(); ["classic","dense","blocks","minimal","binary","custom"].forEach(x=>selStyle.option(x));
  selStyle.selected("classic");
  inpCustom=createInput(DENSITY);
  chkAutoRows=createCheckbox("AutoRows", true);
  rngCols=createSlider(40, 360, COLS, 1);
  rngFont=createSlider(8, 28, FONT_PX, 1);
  rngCellH=createSlider(0.6, 1.2, 0.8, 0.01);
  section("ASCII styles & grid", [
    label("Style"), selStyle, inpCustom,
    label("Cols"), rngCols, chkAutoRows,
    label("Font"), rngFont, label("CellH×"), rngCellH
  ]);
  inpCustom.addClass("hide");
  selStyle.changed(()=>{
    const isCustom = selStyle.value()==="custom";
    (isCustom?inpCustom.removeClass:inpCustom.addClass).call(inpCustom,"hide");
    applyStyle();
    fitCanvasToViewport();
  });
  inpCustom.input(()=>{ if (selStyle.value()==="custom") setDensity(inpCustom.value()); });

  rngCols.input(()=>{
    COLS=rngCols.value();
    if (chkAutoRows.checked()) recomputeRowsToMatchAspect();
    fitCanvasToViewport();
  });
  rngFont.input(()=>{
    FONT_PX=rngFont.value(); applyFontMetrics(); fitCanvasToViewport();
  });
  rngCellH.input(()=>{
    const mul = rngCellH.value();
    lineH = Math.max(6, FONT_PX * mul);
    fitCanvasToViewport();
  });
  chkAutoRows.changed(()=>{ if (chkAutoRows.checked()) recomputeRowsToMatchAspect(); fitCanvasToViewport(); });

  // Palettes
  selPalette=createSelect(); ["cyberpunk","toxic","neon","sunset","custom"].forEach(x=>selPalette.option(x));
  selPalette.selected("cyberpunk");
  chkVideoColors=createCheckbox("Use video colors", false);
  clrA=createColorPicker("#00ff88");
  clrB=createColorPicker("#ffffff");
  wrapA = group([label("A"), clrA]);
  wrapB = group([label("B"), clrB]);
  const palRow = section("ASCII color palettes", [ chkVideoColors, label("Palette"), selPalette, wrapA, wrapB ]);
  wrapA.addClass("hide"); wrapB.addClass("hide");
  const toggleCustom = ()=>{
    const show = !chkVideoColors.checked() && selPalette.value()==="custom";
    (show?wrapA.removeClass:wrapA.addClass).call(wrapA,"hide");
    (show?wrapB.removeClass:wrapB.addClass).call(wrapB,"hide");
  };
  chkVideoColors.changed(toggleCustom); selPalette.changed(toggleCustom);

  // Lines
  chkLines=createCheckbox("Lines", false);
  clrLine=createColorPicker("#8cf");
  rngLineW=createSlider(1,8,3,1);
  rngCurv=createSlider(0,1.5,0.6,0.01);
  section("Lines between detections", [ chkLines, label("Curv"), rngCurv, label("Color"), clrLine, label("px"), rngLineW ]);

  // PNG recorder
  bRecStart=btn("Start PNG 25fps", startPng);
  bRecStop=btn("Stop", stopPng); bRecStop.attribute("disabled", true);
  recStatus=createSpan(" Idle "); recLink=createA("#","");
  section("PNG sequence (25 fps)", [ bRecStart, bRecStop, recStatus, recLink ]);

  // Kick detectors according to current mode
  maybeStartCoco();
}

function section(title, nodes){
  const wrap = createDiv(); wrap.addClass('row');
  const h = createDiv(title); h.addClass('h'); wrap.child(h);
  const line = createDiv(); line.addClass('g');
  nodes.forEach(n=>line.child(n));
  wrap.child(line); ui.child(wrap);
  return wrap;
}
function group(children){ const d=createDiv(); d.addClass('g'); children.forEach(c=>d.child(c)); return d; }
function label(t){ const s=createSpan(t); s.style("margin","0 4px"); return s; }
function btn(t,fn){ const b=createButton(t); b.mousePressed(fn); return b; }

// ------- PNG -------
function startPng(){
  if (pngRec.active) return;
  pngRec = { active:true, frames:[], nextIdx:0, lastMs:0, intervalMs:40, pending:false };
  bRecStart.attribute("disabled", true);
  bRecStop.removeAttribute("disabled");
  recLink.html(""); recLink.attribute("href","#");
  recStatus.html(" PNG 25fps…");
}
async function stopPng(){
  if (!pngRec.active) return;
  pngRec.active = false;
  bRecStart.removeAttribute("disabled");
  bRecStop.attribute("disabled", true);
  if (!pngRec.frames.length){ recStatus.html(" No frames"); return; }
  recStatus.html(" Zipping…");
  try{
    const zip = new JSZip();
    for (const f of pngRec.frames) zip.file(f.name, f.blob);
    const blob = await zip.generateAsync({ type:"blob" });
    const url = URL.createObjectURL(blob);
    recLink.attribute("href", url);
    recLink.attribute("download", "ascii_png_25fps.zip");
    recLink.html("Download ZIP");
    recStatus.html(` Saved ${pngRec.frames.length} frames`);
  }catch(e){ console.error(e); recStatus.html(" Zip error"); }
}

// ------- Palettes / LUT -------
function hexToRgb(hex){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||"#ffffff");
  return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [255,255,255];
}
function pickPalette(name, t, A, B){
  t = Math.max(0, Math.min(1, t));
  if (name==="custom"){
    return [
      Math.round(A[0] + (B[0]-A[0])*t),
      Math.round(A[1] + (B[1]-A[1])*t),
      Math.round(A[2] + (B[2]-A[2])*t),
    ];
  }
  if (name==="cyberpunk"){
    return sampleStops([[10,0,20],[180,0,140],[255,60,180],[255,220,40]], t);
  }
  if (name==="toxic"){
    return sampleStops([[0,10,0],[20,200,40],[180,255,60],[230,255,200]], t);
  }
  if (name==="neon"){
    return sampleStops([[0,10,30],[0,200,255],[50,120,255],[220,240,255]], t);
  }
  if (name==="sunset"){
    return sampleStops([[20,0,60],[255,90,40],[255,170,80],[255,230,180]], t);
  }
  return [255,255,255];
}
function sampleStops(stops, t){
  const seg = (stops.length-1)*t;
  const i = Math.max(0, Math.min(stops.length-2, Math.floor(seg)));
  const u = seg - i;
  const a=stops[i], b=stops[i+1];
  return [
    Math.round(a[0] + (b[0]-a[0])*u),
    Math.round(a[1] + (b[1]-a[1])*u),
    Math.round(a[2] + (b[2]-a[2])*u),
  ];
}

// ------- ASCII LUT / metrics -------
function setDensity(s){
  if (!s || s.length<2) return;
  DENSITY = s;
  precomputeCharLUT();
}
function applyStyle(){
  const name = selStyle.value();
  let s = "";
  if (name==="classic") s = "Ñ@#W$9876543210?!abc;:+=-,._          ";
  else if (name==="dense") s = "$@B%8&WM#*oahkbdpqwmZ0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
  else if (name==="blocks") s = "█▓▒░ .";
  else if (name==="minimal") s = "@%#*+=-:. ";
  else if (name==="binary") s = "01 ";
  else if (name==="custom") s = inpCustom.value();
  setDensity(s);
}
function applyFontMetrics(){
  textSize(FONT_PX);
  lineH = Math.max(6, FONT_PX * 0.8);
  charW = Math.max(6, textWidth("M"));
}
function precomputeCharLUT(){
  const L=DENSITY.length;
  for(let v=0; v<256; v++){
    const idx=Math.max(0,Math.min(L-1,Math.floor((v*(L-1))/255)));
    CHAR_LUT[v]=DENSITY.charAt(idx);
  }
}

// ------- Helpers -------
function log(t){ if(dbg) dbg.html(t); }
function pointInAnyBox(x,y,boxes){ for(const b of boxes){ if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return true; } return false; }

function getPoseBoxes(vw,vh,conf){
  const out=[];
  for (const pr of poses){
    const kps=pr?.pose?.keypoints||[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const kp of kps){
      const s=kp.score??kp.confidence??0; if(s<conf) continue;
      const x=kp.position?.x??0, y=kp.position?.y??0;
      minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
    }
    if (!isFinite(minX)) continue;
    const pad=20;
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
    maxX=Math.min(vw,maxX+pad); maxY=Math.min(vh,maxY+pad);
    let w = Math.max(1,maxX-minX);
    let h = Math.max(1,maxY-minY);
    // Drop pose boxes that span almost the whole frame (occasional glitches)
    if ((w/vw)>=MAX_BOX_FRAC && (h/vh)>=MAX_BOX_FRAC) continue;
    out.push({x:minX,y:minY,w,h,label:'person',score:1});
  }
  return out;
}

// Head box from face keypoints (nose, eyes, ears). Pads to approximate forehead.
function getHeadBoxes(vw,vh,conf){
  const out=[];
  for (const pr of poses){
    const kps=pr?.pose?.keypoints||[];
    const want = ["nose","leftEye","rightEye","leftEar","rightEar"];
    const pts=[];
    for (const kp of kps){
      const s=kp.score??kp.confidence??0; if(s<conf) continue;
      const name = (kp.part||kp.name||"");
      if (want.includes(name)){
        const x=kp.position?.x??NaN, y=kp.position?.y??NaN;
        if (isFinite(x)&&isFinite(y)) pts.push({x,y});
      }
    }
    if (pts.length<2) continue;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const p of pts){
      minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
      maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y);
    }
    const w = maxX-minX, h = maxY-minY;
    const padX = Math.max(8, w*0.25);
    const padTop = Math.max(12, h*0.8);
    const padBottom = Math.max(6, h*0.3);
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padTop);
    const X2 = Math.min(vw, maxX + padX);
    const Y2 = Math.min(vh, maxY + padBottom);
    out.push({ x, y, w:Math.max(1, X2 - x), h:Math.max(1, Y2 - y) });
  }
  return out;
}

// Head circle from eyes/ears/nose. Radius from inter-eye or ear span; fallback to head box.
function getHeadCircles(vw,vh,conf){
  const out=[];
  for (const pr of poses){
    const kps=pr?.pose?.keypoints||[];
    const map={};
    for (const kp of kps){
      const s=kp.score??kp.confidence??0; if(s<conf) continue;
      const n=(kp.part||kp.name||"");
      map[n]=kp.position;
    }
    const L=map.leftEye, R=map.rightEye, N=map.nose, LE=map.leftEar, RE=map.rightEar;
    let cx, cy, r=null;

    if (L && R){
      cx=(L.x+R.x)/2; cy=(L.y+R.y)/2;
      r = Math.max(10, dist(L.x,L.y,R.x,R.y)*0.9);      // eye distance
    } else if (LE && RE){
      cx=(LE.x+RE.x)/2; cy=(LE.y+RE.y)/2;
      r = Math.max(10, dist(LE.x,LE.y,RE.x,RE.y)*0.7);  // ear distance smaller scale
    } else if ((N && L) || (N && R)){
      const P=L||R; cx=(N.x+P.x)/2; cy=(N.y+P.y)/2;
      r = Math.max(10, dist(N.x,N.y,P.x,P.y)*1.2);
    }

    if (!r){
      // fallback: approximate from head box
      const hb = getHeadBoxes(vw,vh,conf)[0];
      if (hb){ cx=hb.x+hb.w/2; cy=hb.y+hb.h*0.45; r=Math.max(10, Math.min(hb.w,hb.h)*0.45); }
    }

    if (r){
      out.push({ cx, cy, r });
    }
  }
  return out;
}

function center(b){ return {x:b.x + b.w/2, y:b.y + b.h/2}; }
