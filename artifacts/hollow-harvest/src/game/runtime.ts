import { Engine } from "@babylonjs/core/Engines/engine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createFarm, FAMILY_MEMBERS, LIMIT, obstacles, SPAWN, WISP_SAVE_KEY } from "./farm";

export const SAVE_KEY = "hollow-harvest:foundation:v1";
export type Mode = "webgl" | "webgpu";
export type NearbyAction = { id: string; kind: "wisp" | "family"; label: string };
export type Dialogue = { speaker: string; text: string };
export type Guidance = { name: string; distance: number; angle: number };
export type Stats = { fps: number; ms: number; backend: string; notice: string; location: string; wisps: number; totalWisps: number; nearby: NearbyAction | null; dialogue: Dialogue | null; guidance: Guidance | null };
type Checkpoint = typeof SPAWN;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const TAU = Math.PI * 2;
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function obstructed(x: number, z: number) {
  return obstacles.some(o => Math.abs(x-o.x) < o.w/2+0.38 && Math.abs(z-o.z) < o.d/2+0.38);
}
function restore(): Checkpoint {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
    if (p && [p.x,p.z,p.yaw,p.pitch].every(Number.isFinite) &&
        Math.abs(p.x)<=LIMIT && Math.abs(p.z)<=LIMIT && !obstructed(p.x,p.z)) {
      return {x:p.x,z:p.z,yaw:angle(p.yaw),pitch:clamp(p.pitch,0.10,0.88)};
    }
  } catch { /* A missing or unreadable save does not block play. */ }
  return {...SPAWN};
}
function restoreWisps(validIds: Set<string>) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(WISP_SAVE_KEY) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && validIds.has(id)) : []);
  } catch {
    return new Set<string>();
  }
}
function placeName(x: number, z: number) {
  if (z > 7 && Math.abs(x)<13) return "The Old Barn";
  if (Math.hypot(x+14,z-2)<7) return "The Stone Well";
  if (z < -10 && Math.abs(x)<14) return "The Pumpkin Rows";
  if (Math.abs(x)>25 || Math.abs(z)>34) return "The Tree Line";
  return "Moonlit Farm";
}
function cameraClearance(target: Vector3, end: Vector3) {
  const delta=end.subtract(target), len=delta.length();
  const ray=new Ray(target,delta.normalize(),len);
  let distance=len;
  for(const o of obstacles) {
    const height=o.height ?? 1.5;
    const lo=new Vector3(o.x-o.w/2-0.22,-0.25,o.z-o.d/2-0.22);
    const hi=new Vector3(o.x+o.w/2+0.22,height,o.z+o.d/2+0.22);
    if(!ray.intersectsBoxMinMax(lo,hi)) continue;
    let near=0,far=len;
    for(const k of ["x","y","z"] as const) {
      if(Math.abs(ray.direction[k])<1e-8) continue;
      const a=(lo[k]-target[k])/ray.direction[k], b=(hi[k]-target[k])/ray.direction[k];
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    }
    if(near<=far) distance=Math.min(distance,Math.max(0.35,near-0.26));
  }
  return target.add(ray.direction.scale(distance));
}

export async function startGame(
  canvas: HTMLCanvasElement, stick: HTMLElement, interactButton: HTMLButtonElement, mode: Mode,
  onStats: (s:Stats)=>void, signal: AbortSignal,
): Promise<()=>void> {
  const initial=restore();
  let surface=canvas;
  let notice="";
  let engine: Engine | import("@babylonjs/core/Engines/webgpuEngine").WebGPUEngine | undefined;
  let cleanup=()=>{};
  const removeGpuSurface=()=>{
    if(surface===canvas) return;
    surface.remove();
    if(!canvas.parentElement?.querySelector("[data-hollow-gpu]")) canvas.style.visibility="";
  };
  // A failed WebGPU attempt can permanently associate a GPU context with
  // its canvas. Use a disposable sibling so WebGL can still use the original.
  try {
    if(mode==="webgpu") {
      try {
        const {WebGPUEngine}=await import("@babylonjs/core/Engines/webgpuEngine");
        signal.throwIfAborted();
        if(!await WebGPUEngine.IsSupportedAsync) throw new Error("Adapter unavailable");
        signal.throwIfAborted();
        surface=canvas.cloneNode(false) as HTMLCanvasElement;
        surface.removeAttribute("id"); surface.dataset.hollowGpu=""; canvas.after(surface); canvas.style.visibility="hidden";
        engine=new WebGPUEngine(surface,{antialias:true,enableAllFeatures:false});
        await engine.initAsync();
        signal.throwIfAborted();
      } catch (e) {
        engine?.dispose();engine=undefined;
        removeGpuSurface();surface=canvas;
        if(signal.aborted) throw e;
        notice="WebGPU unavailable. Running on WebGL.";
      }
    }
    signal.throwIfAborted();
    engine ??= new Engine(surface,true,{antialias:true,preserveDrawingBuffer:false,stencil:true});
    const renderer=engine;
    renderer.setHardwareScalingLevel(Math.max(1, Math.min(3, (window.devicePixelRatio || 1)/1.4)));
    const scene=new Scene(renderer);
    const farm=createFarm(scene);
    const collected=restoreWisps(new Set(farm.wisps.map(wisp=>wisp.id)));
    for(const wisp of farm.wisps) if(collected.has(wisp.id)) wisp.root.setEnabled(false);
    let nearby: NearbyAction | null = null;
    let dialogue: Dialogue | null = null;
    let dialogueExpiresAt = 0;
    let guidance: Guidance | null = null;
    const camera=new FreeCamera("third-person",Vector3.Zero(),scene);
    camera.minZ=0.08;camera.maxZ=170;camera.fov=0.91;
    scene.activeCamera=camera;
    let x=initial.x,z=initial.z,yaw=initial.yaw,pitch=initial.pitch,facing=yaw;
    let vx=0,vz=0,stride=0,phase=0,dirty=false,storageError=false;
    let lx=0,ly=0,stickPointer:number|null=null,lookPointer:number|null=null,actionPressed=false;
    let lookX=0,lookY=0,cx=0,cy=0;
    const keys=new Set<string>();
    const listeners=new AbortController();
    const opts={signal:listeners.signal};
    const keyset=new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyQ","KeyE","KeyF","ShiftLeft","ShiftRight"]);
    const setStick=(sx:number,sy:number)=>{
      lx=sx;ly=sy;
      stick.style.setProperty("--stick-x",`${sx*36}px`);
      stick.style.setProperty("--stick-y",`${-sy*36}px`);
    };
    const reset=()=>{ keys.clear();stickPointer=null;lookPointer=null;actionPressed=false;setStick(0,0);vx=0;vz=0; };
    const save=()=>{
      if(!dirty) return;
      try {localStorage.setItem(SAVE_KEY,JSON.stringify({x,z,yaw,pitch}));dirty=false;storageError=false;}
      catch {storageError=true;}
    };
    let progressDirty=false;
    const saveProgress=()=>{
      if(!progressDirty) return;
      try {localStorage.setItem(WISP_SAVE_KEY,JSON.stringify([...collected]));progressDirty=false;storageError=false;}
      catch {storageError=true;}
    };
    const blur=()=>{reset();save();saveProgress();};
    cleanup=()=>{listeners.abort();save();saveProgress();reset();};
    window.addEventListener("keydown",e=>{
      if(!keyset.has(e.code)||e.altKey||e.metaKey||e.ctrlKey ||
         (e.target instanceof HTMLElement && e.target.closest("button,select,input,textarea,[contenteditable],summary"))) return;
      if(e.code==="KeyF"){
        e.preventDefault();
        if(!e.repeat) actionPressed=true;
        return;
      }
      e.preventDefault();keys.add(e.code);
    },opts);
    window.addEventListener("keyup",e=>{keys.delete(e.code);},opts);
    window.addEventListener("blur",blur,opts);
    window.addEventListener("pagehide",blur,opts);
    document.addEventListener("visibilitychange",()=>{if(document.hidden) blur();},opts);
    document.addEventListener("focusin",e=>{if(e.target instanceof HTMLElement && e.target.closest("button,select,input,textarea,summary")) reset();},opts);
    interactButton.addEventListener("click",()=>{if(nearby) actionPressed=true;},opts);
    function updateStick(e:PointerEvent) {
      const dx=e.clientX-cx,dy=cy-e.clientY,d=Math.hypot(dx,dy);
      if(d<5) setStick(0,0);
      else {const scale=Math.min(1,(d-5)/31)/d;setStick(dx*scale,dy*scale);}
    }
    stick.addEventListener("pointerdown",e=>{
      if(stickPointer!==null||e.button!==0) return;
      e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);
      const rect=stick.getBoundingClientRect();cx=rect.left+rect.width/2;cy=rect.top+rect.height/2;
      surface.focus({preventScroll:true});updateStick(e);
    },opts);
    stick.addEventListener("pointermove",e=>{if(e.pointerId===stickPointer) updateStick(e);},opts);
    for(const event of ["pointerup","pointercancel","lostpointercapture"] as const) {
      stick.addEventListener(event,e=>{if(e.pointerId===stickPointer){stickPointer=null;setStick(0,0);}},opts);
      surface.addEventListener(event,e=>{if(e.pointerId===lookPointer)lookPointer=null;},opts);
    }
    surface.addEventListener("pointerdown",e=>{
      if(lookPointer!==null||e.button!==0) return;
      e.preventDefault();surface.focus({preventScroll:true});lookPointer=e.pointerId;
      surface.setPointerCapture(e.pointerId);lookX=e.clientX;lookY=e.clientY;
    },opts);
    surface.addEventListener("pointermove",e=>{
      if(lookPointer!==e.pointerId) return;
      yaw=(yaw+(e.clientX-lookX)*0.007)%TAU;pitch=clamp(pitch+(e.clientY-lookY)*0.006,0.10,0.88);
      lookX=e.clientX;lookY=e.clientY;dirty=true;
    },opts);
    const resize=()=>renderer.resize();
    const observer=new ResizeObserver(resize);observer.observe(surface);
    const oldCleanup=cleanup;
    cleanup=()=>{oldCleanup();observer.disconnect();};
    resize();
    surface.focus({preventScroll:true});
    const target=new Vector3(x,1.56,z), wanted=new Vector3();
    let camYaw=yaw,camPitch=pitch;
    let statTime=0,frames=0,frameTime=0,saveTime=0,fps=0,ms=0,lastLocation="";
    const backend=renderer instanceof Engine ? "WebGL" : "WebGPU";
    const publishStats=()=>onStats({
      fps,ms,backend,notice,location:placeName(x,z),
      wisps:collected.size,totalWisps:farm.wisps.length,nearby,dialogue,guidance,
    });
    publishStats();
    renderer.runRenderLoop(()=>{
      const raw=renderer.getDeltaTime()/1000,dt=Math.min(raw||0.016,0.05);
      if(document.hidden) return;
      const held=(...codes:string[])=>codes.some(key=>keys.has(key));
      const orbit=Number(held("KeyE"))-Number(held("KeyQ"));
      if(orbit){yaw=(yaw+orbit*1.85*dt)%TAU;dirty=true;}
      camYaw+=angle(yaw-camYaw)*(1-Math.exp(-18*dt));
      camPitch+=(pitch-camPitch)*(1-Math.exp(-18*dt));
      const mx=lx+Number(held("KeyD","ArrowRight"))-Number(held("KeyA","ArrowLeft"));
      const mz=ly+Number(held("KeyW","ArrowUp"))-Number(held("KeyS","ArrowDown"));
      const mag=Math.max(1,Math.hypot(mx,mz)),speed=held("ShiftLeft","ShiftRight")?9.8:5.6;
      const dx=(mx*Math.cos(camYaw)+mz*Math.sin(camYaw))/mag;
      const dz=(-mx*Math.sin(camYaw)+mz*Math.cos(camYaw))/mag;
      const damp=1-Math.exp(-15*dt);
      vx+=(dx*speed-vx)*damp;vz+=(dz*speed-vz)*damp;
      const nx=clamp(x+vx*dt,-LIMIT,LIMIT), nz=clamp(z+vz*dt,-LIMIT,LIMIT);
      if(!obstructed(nx,z)) x=nx; else vx=0;
      if(!obstructed(x,nz)) z=nz; else vz=0;
      if(Math.hypot(vx,vz)>0.025) dirty=true;
      if(Math.hypot(dx,dz)>0.04) facing+=angle(Math.atan2(dx,dz)-facing)*(1-Math.exp(-18*dt));
      farm.actor.position.set(x,0,z);farm.actor.rotation.y=facing;
      const groundSpeed=Math.hypot(vx,vz);
      stride+=(Math.min(1,groundSpeed/5)-stride)*damp;phase+=groundSpeed*1.65*dt;
       const time=performance.now()/1000;
       farm.pose(stride,phase,time,x,z);
       if(dialogue && time>=dialogueExpiresAt){
         dialogue=null;
         publishStats();
       }
       const candidates=[
         ...farm.wisps.filter(wisp=>!collected.has(wisp.id)).map(wisp=>({...wisp,kind:"wisp" as const,label:wisp.name})),
         ...farm.family.map(member=>({...member,kind:"family" as const,label:member.name})),
       ];
       const candidate=candidates
         .sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
       const actionTarget=candidate && Math.hypot(candidate.x-x,candidate.z-z)<3.1 ? candidate : undefined;
       const nextNearby=actionTarget ? {id:actionTarget.id,kind:actionTarget.kind,label:actionTarget.label} : null;
       if(nextNearby?.id!==nearby?.id || nextNearby?.kind!==nearby?.kind){
         nearby=nextNearby;
         interactButton.hidden=!nearby;
         interactButton.textContent=nearby ? `${nearby.kind==="wisp"?"Gather":"Talk to"} ${nearby.label} · F` : "Interact";
         publishStats();
       }
       if(actionPressed){
         actionPressed=false;
         if(actionTarget?.kind==="wisp"){
           collected.add(actionTarget.id);
           actionTarget.root.setEnabled(false);
           progressDirty=true;
           notice="A lost ember returns to the field.";
           publishStats();
         } else if(actionTarget?.kind==="family"){
           const member=FAMILY_MEMBERS.find(person=>person.id===actionTarget.id);
           if(member){
             dialogue={
               speaker:member.name,
               text:collected.size===farm.wisps.length
                 ? "The lights are home. And so are we."
                 : member.line,
             };
             dialogueExpiresAt=time+4.5;
             publishStats();
           }
         }
       }
      target.x+=(x-target.x)*(1-Math.exp(-16*dt));target.z+=(z-target.z)*(1-Math.exp(-16*dt));
      const back=Math.cos(camPitch)*6.3;
      wanted.set(target.x-Math.sin(camYaw)*back+Math.cos(camYaw)*0.58,target.y+Math.sin(camPitch)*6.3,target.z-Math.cos(camYaw)*back-Math.sin(camYaw)*0.58);
      camera.position.copyFrom(cameraClearance(target,wanted));camera.setTarget(target);
      scene.render();
      statTime+=raw;frameTime+=raw;frames++;saveTime+=raw;
       if(saveTime>=1.25){save();saveProgress();saveTime=0;}
      const location=placeName(x,z);
      if(statTime>=0.5){
        ms=1000*frameTime/frames;fps=ms>0?1000/ms:0;
         const nextEmber=farm.wisps
           .filter(wisp=>!collected.has(wisp.id))
           .reduce<typeof farm.wisps[number] | undefined>((closest,wisp)=>
             !closest || Math.hypot(wisp.x-x,wisp.z-z)<Math.hypot(closest.x-x,closest.z-z) ? wisp : closest,
           undefined);
         guidance=nextEmber ? {
           name:nextEmber.name,
           distance:Math.hypot(nextEmber.x-x,nextEmber.z-z),
           angle:Math.atan2(nextEmber.x-x,nextEmber.z-z)-camYaw,
         } : null;
         if(storageError) notice="Progress could not be saved in this browser.";
         publishStats();
        statTime=0;frames=0;frameTime=0;lastLocation=location;
      } else if(location!==lastLocation){
         lastLocation=location;
         if(storageError) notice="Progress could not be saved in this browser.";
         publishStats();
      }
    });
    const dispose=()=>{
      signal.removeEventListener("abort",dispose);
      cleanup();renderer.dispose();
      removeGpuSurface();
    };
    signal.addEventListener("abort",dispose,{once:true});
    return ()=>{if(!signal.aborted) dispose();};
  } catch(e) {
    cleanup();engine?.dispose();
    removeGpuSurface();
    throw e;
  }
}
