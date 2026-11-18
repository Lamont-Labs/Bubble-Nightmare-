import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

const MeshBuilder = { CreateBox, CreateCylinder, CreateSphere };

export type Obstacle = { x: number; z: number; w: number; d: number; height?: number };
export const LIMIT = 43;
export const SPAWN = { x: 0, z: -15, yaw: 0, pitch: 0.32 };
export const WISP_SAVE_KEY = "hollow-harvest:progress:v1";
export const WISP_LOCATIONS = [
  { id: "pumpkin-row", name: "Pumpkin Row", x: -7, z: -8 },
  { id: "barn-lantern", name: "Old Barn", x: 7, z: 1 },
  { id: "stone-well", name: "Stone Well", x: -10, z: 2 },
] as const;
export const FAMILY_MEMBERS = [
  { id: "father", name: "Dad", x: -6, z: 5.3, color: "#353541", line: "Those lights belong to all of us. Bring every last one home." },
  { id: "mother", name: "Mom", x: -2.2, z: 4.1, color: "#39303b", line: "Listen between the rows. The lost embers are still calling." },
  { id: "rabbit-teen", name: "Rabbit Teen", x: 2.2, z: 4.1, color: "#55404d", line: "I saw a little light drift past the pumpkins. It looked scared." },
  { id: "pig-teen", name: "Pig Teen", x: 6, z: 5.3, color: "#393746", line: "The old well keeps secrets. One of those lights is down there." },
] as const;
export const obstacles: Obstacle[] = [
  { x: 0, z: 15, w: 13, d: 10, height: 7.6 },
  { x: -14, z: 2, w: 2.8, d: 2.8, height: 3.55 },
  { x: 0, z: -29, w: 26, d: 0.5 },
  { x: -13, z: -22, w: 0.5, d: 14 },
  { x: 13, z: -22, w: 0.5, d: 14 },
  ...FAMILY_MEMBERS.map(({ x, z }) => ({ x, z, w: 0.55, d: 0.55, height: 2.6 })),
];

export function createFarm(scene: Scene) {
  scene.clearColor = Color4.FromHexString("#15243dff");
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = Color3.FromHexString("#19263d");
  scene.fogDensity = 0.014;
  scene.skipPointerMovePicking = true;
  const sky = new HemisphericLight("night-sky", new Vector3(0.15, 1, -0.3), scene);
  sky.diffuse = Color3.FromHexString("#bbcfff"); sky.groundColor = Color3.FromHexString("#544264"); sky.intensity = 1.05;
  const moonlight = new DirectionalLight("moonlight", new Vector3(-0.65, -1, 0.35), scene);
  moonlight.diffuse = Color3.FromHexString("#b3cbff"); moonlight.intensity = 1.05;
  const materials = new Map<string, StandardMaterial>();
  function mat(hex: string, emit = false) {
    const key = hex + emit;
    let m = materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = Color3.Black();
      if (emit) { m.emissiveColor = m.diffuseColor; m.disableLighting = true; }
      materials.set(key, m);
    }
    return m;
  }
  const batches = new Map<StandardMaterial, Mesh[]>();
  function place(mesh: Mesh, x: number, y: number, z: number, hex: string, emit = false, batch = true) {
    const m = mat(hex, emit); mesh.material = m; mesh.position.set(x,y,z);
    mesh.isPickable = false;
    if (batch) { const group = batches.get(m) ?? []; group.push(mesh); batches.set(m, group); }
    return mesh;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, c: string) {
    return place(MeshBuilder.CreateBox("timber", { width: w, height: h, depth: d }, scene), x,y,z,c);
  }
  function cone(x: number, y: number, z: number, bottom: number, height: number, c: string, top = 0, sides = 6) {
    return place(MeshBuilder.CreateCylinder("taper", { diameterTop: top, diameterBottom: bottom, height, tessellation: sides }, scene),x,y,z,c);
  }
  function sphere(x: number,y: number,z: number,d: number,c: string, emit = false, batch = true) {
    return place(MeshBuilder.CreateSphere("orb",{diameter:d,segments:6},scene),x,y,z,c,emit,batch);
  }
  let seed = 348129;
  const rand = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const moon = sphere(15, 14, 77, 7, "#edf2d8", true, false);
  moon.material!.fogEnabled = false;
  for (let i=0;i<90;i++) {
    const t=rand()*Math.PI*2, h=8+rand()*57;
    const star=sphere(Math.cos(t)*96,h,Math.sin(t)*96,0.09+rand()*0.20, i%3===0?"#8097b4":"#b1c3db",true,false);
    star.material!.fogEnabled=false;
    const m=star.material as StandardMaterial; const group=batches.get(m)??[];group.push(star);batches.set(m,group);
  }
  box(0,-0.3,0,170,0.6,170,"#273733");
  box(0,0.005,-9,5,0.015,54,"#53504a");
  box(-9,0.006,2,16,0.017,3.2,"#48483e");
  for(let i=0;i<155;i++){
    const x=(rand()-0.5)*89,z=(rand()-0.5)*87;
    if(Math.abs(x)<2.6) continue;
    const m=box(x,0.022,z,0.2+rand()*0.65,0.032,0.12+rand()*0.4,i%2?"#394239":"#252f2d"); m.rotation.y=rand()*6;
  }
  // Barn, plank cladding, gabled roof and lit windows.
  box(0,2.4,15,13,4.8,10,"#51302e");
  for (let x=-6.35;x<6.5;x+=0.45) box(x,2.45,9.94,0.075,4.68,0.11,"#3b282b");
  for (const dir of [-1,1]) {
    const roof=box(dir*3.52,6.05,15,7.85,0.24,11.15,"#303849"); roof.rotation.z=-dir*0.47;
    const trim=box(dir*3.52,6.04,9.38,7.85,0.25,0.19,"#646367"); trim.rotation.z=-dir*0.47;
    box(dir*6.34,2.5,9.79,0.27,5,0.29,"#a38a6a");
    place(MeshBuilder.CreateBox("lit-window",{width:1.24,height:1.15,depth:0.12},scene),dir*3.92,3.06,9.79,"#ffbd60",true);
    box(dir*3.92,3.06,9.67,0.10,1.15,0.14,"#422c24");
    box(dir*3.92,3.06,9.66,1.24,0.10,0.14,"#422c24");
  }
  const gable=cone(0,5.66,15,13.05,2.1,"#51302e",0,4); gable.scaling.z=0.77;
  box(0,1.53,9.78,3.35,3.04,0.22,"#30262b");
  for (const dir of [-1,1]) {
    const brace=box(dir*0.76,1.56,9.63,0.15,3.28,0.1,"#886949");brace.rotation.z=dir*0.48;
  }
  // Well, pumpkin beds, tree line and fences.
  cone(-14,0.48,2,2.8,0.96,"#5f6570",2.7,10);
  cone(-14,0.95,2,2.18,0.08,"#141d2a",2.18,10);
  for(const dx of [-1.1,1.1]) box(-14+dx,1.7,2,0.16,2.6,0.16,"#766448");
  cone(-14,3.0,2,3.16,0.95,"#293440",0,4).rotation.y=Math.PI/4;
  for(const side of [-1,1]){
    for(let row=0;row<5;row++) {
      const x=side*(5+row*1.65);box(x,0.03,-14,0.92,0.06,16,"#3e322e");
      for(let p=0;p<8;p++){
        const z=-21+p*2.12+rand()*0.9, px=x+(rand()-0.5)*0.5;
        const pumpkin=sphere(px,0.27,z,0.5+rand()*0.32,p%3?"#b46b32":"#dd9041");pumpkin.scaling.y=0.74;
        cone(px,0.53,z,0.09,0.21,"#5f5f35",0.068,5).rotation.z=0.34;
      }
    }
    for(let z=-29;z<=-15;z+=2.8) {
      box(side*13,0.74,z,0.22,1.48,0.22,"#71624e");
      if(z<-16) for(const y of [0.54,1.04]) box(side*13,y,z+1.4,0.12,0.14,2.8,"#5b4d40");
    }
  }
  for(let x=-13;x<=13;x+=2.6){
    box(x,0.74,-29,0.22,1.48,0.22,"#71624e");
    if(x<12)for(const y of [0.54,1.04])box(x+1.3,y,-29,2.6,0.14,0.12,"#5b4d40");
  }
  for(const [x,z] of [[-3,-18],[3,-18],[-3,-3],[3,-3],[-3,7],[3,7],[-15,4]]) {
    box(x,0.72,z,0.15,1.44,0.15,"#736047");
    box(x,1.46,z,0.32,0.12,0.32,"#43372e");
    sphere(x,1.73,z,0.39,"#ffd084",true);
    box(x,1.94,z,0.30,0.09,0.30,"#43372e");
    const glow=sphere(x,1.71,z,0.59,"#bd6639");glow.scaling.y=0.12;glow.position.y=0.075;
  }
  for(let i=0;i<57;i++){
    const theta=i*2*Math.PI/57+rand()*0.13, r=47+rand()*13;
    const x=Math.cos(theta)*r,z=Math.sin(theta)*r,h=5+rand()*6;
    cone(x,h*0.225,z,0.62,h*0.45,"#342e35",0.36,5);
    for(let j=0;j<3;j++) cone(x,h*(0.43+j*0.18),z,h*(0.53-j*0.10),h*0.56,j%2?"#202f37":"#253a40");
  }
  for (let i=0;i<36;i++){
    const x=-26+rand()*52,z=-25+rand()*57;
    const mote=sphere(x,0.6+rand()*1.6,z,0.055+rand()*0.055,"#d7bf78",true);
    mote.scaling.y=1.5;
  }
  for(const meshes of batches.values()){
    const merged=Mesh.MergeMeshes(meshes,true,true);
    if(merged){merged.isPickable=false;merged.freezeWorldMatrix();}
  }

  const wisps = WISP_LOCATIONS.map((spot, index) => {
    const root = new TransformNode(`lost-ember-${spot.id}`, scene);
    root.position.set(spot.x, 0, spot.z);
    const orb = sphere(0, 1.12, 0, 0.48, "#ffd67a", true, false);
    orb.parent = root;
    orb.position.set(0, 1.12, 0);
    const ring = place(
      CreateTorus("ember-ring", { diameter: 0.86, thickness: 0.055, tessellation: 16 }, scene),
      0, 1.12, 0, "#e99f50", true, false,
    );
    ring.parent = root;
    ring.position.set(0, 1.12, 0);
    return { ...spot, root, ring, phase: index * 2.1 };
  });

  const actor = new TransformNode("scarecrow",scene);
  function part(parent: TransformNode, x:number,y:number,z:number,w:number,h:number,d:number,c:string) {
    const m=place(MeshBuilder.CreateBox("scarecrow-part",{width:w,height:h,depth:d},scene),x,y,z,c,false,false);m.parent=parent;return m;
  }
  const torso=part(actor,0,1.24,0,0.64,0.76,0.39,"#6e4c63");
  for(const side of [-1,1]){
    part(actor,side*0.19,1.17,-0.21,0.08,0.65,0.04,"#a77848").rotation.z=side*0.15;
    part(actor,side*0.21,1.60,0,0.12,0.15,0.46,"#b98b53");
  }
  part(actor,0,0.96,0,0.68,0.10,0.43,"#ae7451");
  const head=sphere(0,1.88,0,0.61,"#a48052",false,false);head.parent=actor;head.scaling.set(1,1.08,0.88);
  for(const s of [-1,1]){
    const eye=sphere(s*0.12,1.92,0.252,0.12,"#ffc371",true,false);eye.parent=actor;eye.scaling.set(0.9,1.12,0.35);
  }
  const brim=place(MeshBuilder.CreateCylinder("hat-brim",{diameter:0.96,height:0.08,tessellation:9},scene),0,2.13,0,"#30283b",false,false);brim.parent=actor;brim.rotation.z=-0.12;
  const hat=place(MeshBuilder.CreateCylinder("hat-crown",{diameterTop:0.32,diameterBottom:0.58,height:0.35,tessellation:7},scene),0.03,2.27,0,"#493544",false,false);hat.parent=actor;hat.rotation.z=-0.14;
  const scarf=part(actor,0.28,1.59,-0.23,0.43,0.15,0.06,"#a9423c"); scarf.rotation.z=-0.25;
  const limbs = [-1,1].map(side=>{
    const arm=new TransformNode("arm",scene);arm.parent=actor;arm.position.set(side*0.39,1.48,0);arm.rotation.z=side*0.26;
    part(arm,0,-0.26,0,0.20,0.61,0.20,"#725268");
    part(arm,0,-0.62,0,0.16,0.16,0.16,"#b58d58");
    const leg=new TransformNode("leg",scene);leg.parent=actor;leg.position.set(side*0.18,0.89,0);
    part(leg,0,-0.32,0,0.24,0.69,0.26,"#524860");
    part(leg,0,-0.76,0.07,0.27,0.23,0.41,"#2c2935");
    return {arm,leg};
  });
  const family = FAMILY_MEMBERS.map(member => {
    const root = new TransformNode(`family-${member.id}`,scene);
    root.position.set(member.x,0,member.z);
    const chest=part(root,0,1.2,0,0.62,0.78,0.38,member.color);
    const head=sphere(0,0,0,0.58,"#aa875f",false,false);
    head.parent=root;head.position.set(0,1.91,0);
    const eyeColor=member.id==="mother"?"#ffb06f":member.id==="pig-teen"?"#ffbdc4":"#ffcf82";
    for(const side of [-1,1]){
      const eye=sphere(0,0,0,0.105,eyeColor,true,false);
      eye.parent=root;eye.position.set(side*0.12,1.94,0.248);
    }
    const belt=part(root,0,0.91,-0.2,0.64,0.13,0.08,"#a9423c");
    belt.rotation.z=member.id==="mother"?0.04:0;
    for(const side of [-1,1]){
      const arm=new TransformNode(`${member.id}-arm`,scene);
      arm.parent=root;arm.position.set(side*0.38,1.48,0);
      part(arm,0,-0.27,0,0.18,0.58,0.18,member.color);
      part(arm,0,-0.58,0,0.16,0.16,0.16,"#b58d64");
      const leg=new TransformNode(`${member.id}-leg`,scene);
      leg.parent=root;leg.position.set(side*0.18,0.8,0);
      part(leg,0,-0.3,0,0.22,0.62,0.24,member.id==="mother"||member.id==="rabbit-teen"?"#292733":"#34303b");
      part(leg,0,-0.67,0.07,0.25,0.2,0.36,"#27252d");
    }
    if(member.id==="father"){
      for(const side of [-1,1]){
        const horn=cone(side*0.28,2.26,0,0.25,0.58,"#ded0ab",0,5);
        horn.parent=root;horn.position.set(side*0.28,2.26,0);horn.rotation.z=-side*0.42;
      }
      const muzzle=sphere(0,0,0,0.28,"#75533f",false,false);
      muzzle.parent=root;muzzle.position.set(0,1.78,0.28);muzzle.scaling.set(1.18,0.8,0.62);
      for(const side of [-1,1]){
        const nostril=sphere(0,0,0,0.045,"#251e20",false,false);
        nostril.parent=root;nostril.position.set(side*0.065,1.79,0.4);
      }
    } else if(member.id==="mother"){
      for(let i=0;i<9;i++){
        const angle=i*Math.PI*2/9;
        const strand=cone(Math.cos(angle)*0.26,2.08+Math.sin(i*2)*0.07,Math.sin(angle)*0.23,0.1,0.55,i%2?"#bc8247":"#d29b56",0.015,5);
        strand.parent=root;
        strand.position.set(Math.cos(angle)*0.26,2.08+Math.sin(i*2)*0.07,Math.sin(angle)*0.23);
        strand.rotation.z=-Math.cos(angle)*0.4;
      }
    } else if(member.id==="rabbit-teen"){
      for(const side of [-1,1]){
        const ear=part(root,side*0.17,2.29,0,0.19,0.72,0.15,"#998268");
        ear.rotation.z=-side*0.12;
        const inner=part(root,side*0.17,2.30,0.086,0.08,0.52,0.025,"#be7372");
        inner.rotation.z=-side*0.12;
      }
      part(root,0,0.82,-0.12,0.78,0.38,0.43,"#302c39");
    } else {
      for(const side of [-1,1]){
        const ear=part(root,side*0.22,2.09,0,0.2,0.25,0.16,"#a78165");
        ear.rotation.z=-side*0.42;
      }
      const snout=sphere(0,0,0,0.3,"#cd898c",false,false);
      snout.parent=root;snout.position.set(0,1.78,0.31);snout.scaling.set(1.2,0.8,0.68);
      for(const side of [-1,1]){
        const nostril=sphere(0,0,0,0.05,"#734f55",false,false);
        nostril.parent=root;nostril.position.set(side*0.08,1.79,0.48);
      }
      part(root,0,1.6,-0.22,0.16,0.48,0.055,"#ae4241");
    }
    return {...member,root,chest};
  });
  const shadow=sphere(0,0.025,0,1.35,"#1a2327",false,false);shadow.scaling.y=0.028;
  return { actor, wisps, family, pose(stride:number, phase:number, time=0, playerX=0, playerZ=0) {
    shadow.position.x=actor.position.x;shadow.position.z=actor.position.z;
    torso.position.y=1.24+Math.sin(phase*2)*stride*0.035;
    limbs.forEach(({arm,leg},i)=>{ const wave=Math.sin(phase+i*Math.PI)*stride;leg.rotation.x=wave*0.61;arm.rotation.x=-wave*0.48; });
    wisps.forEach(wisp=>{
      wisp.root.position.y=Math.sin(time*1.5+wisp.phase)*0.13;
      wisp.ring.rotation.y=time*0.55+wisp.phase;
    });
    family.forEach((member,index)=>{
      member.root.position.y=Math.sin(time*0.75+index*1.7)*0.025;
      const dx=playerX-member.x,dz=playerZ-member.z;
      if(Math.hypot(dx,dz)<10) member.root.rotation.y=Math.atan2(dx,dz);
      member.chest.position.y=1.2+Math.sin(time*0.8+index)*0.018;
    });
  }};
}
