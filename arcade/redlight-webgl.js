import { createWebGLScene } from "./babylon.js";
import { buildCharacterMesh, prepareCharacterAssets } from "./character-renderers.js";
import { runnerCharacter } from "../redlight-appearance.js";

// A view of RedlightRace. The renderer cannot move the runner or change a signal.
export async function createRedlightWebGL(canvas, appearance, { isCurrent = () => true } = {}) {
  const character=runnerCharacter(appearance);await prepareCharacterAssets(character);
  const world=await createWebGLScene(canvas,{quality:"high",isCurrent});
  try {
    const { B,scene,camera,material,shadows,sun }=world;
    scene.clearColor=B.Color4.FromHexString("#cde3e7ff");scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogColor=B.Color3.FromHexString("#cde3e7");scene.fogDensity=.012;
    scene.imageProcessingConfiguration.exposure=1.05;
    camera.position.set(0,2.8,-6.6);camera.setTarget(new B.Vector3(0,1.5,7));camera.fov=.84;camera.maxZ=180;
    sun.position.set(-12,18,-9);sun.direction.set(.5,-1,.5);sun.intensity=2;sun.diffuse=B.Color3.FromHexString("#fff3dc");sun.shadowMinZ=.1;sun.shadowMaxZ=60;sun.shadowFrustumSize=22;
    scene.getLightByName("sky-fill").intensity=.95;
    shadows.useBlurExponentialShadowMap=false;shadows.usePercentageCloserFiltering=true;shadows.bias=.001;shadows.normalBias=.02;
    const runner=buildCharacterMesh(world,character);runner.root.rotation.y=Math.PI;
    function paint(color){const result=material(color,{roughness:.86});result.albedoColor=B.Color3.FromHexString(color).toLinearSpace();return result;}
    function box(name,at,size,color,parent) {const mesh=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);mesh.position.set(...at);if(parent)mesh.parent=parent;mesh.material=paint(color);mesh.receiveShadows=true;return mesh;}
    function cylinder(name,at,height,top,bottom,color,parent) {const mesh=B.MeshBuilder.CreateCylinder(name,{height,diameterTop:top,diameterBottom:bottom,tessellation:12},scene);mesh.position.set(...at);if(parent)mesh.parent=parent;mesh.material=paint(color);return mesh;}
    box("park-ground",[0,-.15,65],[190,.2,200],"#88a77d");
    box("running-track",[0,-.025,65],[9,.05,200],"#b96451");
    for(let i=0;i<=5;i++)box("lane-line",[-4.5+i*1.8,.006,65],[.045,.012,200],"#f6e6cd");
    for(const side of [-1,1]) {
      box("track-border",[side*4.8,0,65],[.45,.12,200],"#dacdb5");
      box("side-path",[side*6,-.01,65],[1.8,.05,200],"#b5baa4");
      box("guardrail",[side*7.3,.9,65],[.07,.07,200],"#d0dcd6");
      box("lower-guardrail",[side*7.3,.42,65],[.05,.05,200],"#9caaa1");
    }
    const scenery=[];
    for(let i=0;i<14;i++) {
      const cluster=new B.TransformNode("repeating-park-section",scene);scenery.push(cluster);
      for(const side of [-1,1]) {
        cylinder("fence-post",[side*7.3,.5,0],1,.08,.08,"#a2b4aa",cluster);
        const tx=side*(10+(i%3)*2.3), h=4+(i%4)*.45;
        cylinder("tree-trunk",[tx,h*.32,0],h*.64,.21,.35,"#766352",cluster);
        for(let j=0;j<3;j++)cylinder("cedar-crown",[tx,h*.58+j*.65,0],2.9-j*.45,0,3.1-j*.55,i%2?"#507d65":"#66896c",cluster);
        if(i%3===0) {
          box("park-bench",[side*8.5,.54,2.5],[.6,.1,2],"#90704f",cluster);
          box("bench-back",[side*8.75,.9,2.5],[.08,.65,2],"#90704f",cluster);
          for(const z of [1.8,3.2])box("bench-leg",[side*8.5,.24,z],[.55,.5,.1],"#526764",cluster);
        }
      }
      for(let lane=-2;lane<=2;lane++)box("distance-stripe",[lane*1.8,.014,0],[1.35,.014,.12],"#e7cfb5",cluster);
    }
    const signalMaterials=["#ff5c66","#ffd163","#59ecc0"].map((color,i)=>{const m=new B.PBRMaterial(`traffic-light-${i}`,scene);m.albedoColor=B.Color3.FromHexString(color);m.metallic=0;m.roughness=.3;return m;});
    const signals=[];
    for(let i=0;i<4;i++)for(const side of [-1,1]) {
      const signal=new B.TransformNode("track-signal",scene);signal.position.x=side*5.6;signals.push({node:signal,index:i});
      cylinder("signal-pole",[0,1.3,0],2.6,.09,.12,"#43545a",signal);
      box("signal-housing",[0,2.9,0],[.6,1.45,.28],"#283940",signal);
      for(let j=0;j<3;j++) {const lamp=B.MeshBuilder.CreateSphere("signal-lamp",{diameter:.36,segments:16},scene);lamp.parent=signal;lamp.position.set(0,3.35-j*.45,-.155);lamp.scaling.z=.4;lamp.material=signalMaterials[j];}
    }
    const finish=new B.TransformNode("finish-gate",scene);
    for(const side of [-1,1])box("finish-upright",[side*4.8,2.3,0],[.18,4.6,.22],"#f3e7cd",finish);
    box("finish-banner",[0,4.35,0],[9.8,.6,.15],"#244c4d",finish);
    for(let i=0;i<18;i++)for(let j=0;j<2;j++)box("finish-checker",[-4.25+i*.5,.018,j*.5-.25],[.5,.022,.5],(i+j)%2?"#f6edd7":"#34484a",finish);
    for(let i=0;i<18;i++)box("banner-checker",[-4.25+i*.5,4.15,-.09],[.5,.19,.02],i%2?"#f6edd7":"#34484a",finish);
    const bannerTexture=new B.DynamicTexture("finish-label",{width:512,height:64},scene,false);bannerTexture.drawText("FINISH",null,48,"bold 46px sans-serif","#f5efd8","#244c4d",true);
    const bannerMat=new B.StandardMaterial("finish-label-material",scene);bannerMat.diffuseTexture=bannerTexture;bannerMat.emissiveColor=new B.Color3(1,1,1);bannerMat.disableLighting=true;
    const label=B.MeshBuilder.CreatePlane("finish-label",{width:4,height:.5},scene);label.parent=finish;label.position.set(0,4.39,-.09);label.material=bannerMat;
    let lastSignal;
    return {
      world,
      draw(race) {
        scenery.forEach((node,i)=>{node.position.z=((i*12-race.distance+24)%168+168)%168-24;});
        signals.forEach(({node,index})=>{node.position.z=((index*40-race.distance+12)%160+160)%160-12;});
        finish.setEnabled(Number.isFinite(race.target) && race.target-race.distance<145);finish.position.z=Number.isFinite(race.target)?race.target-race.distance:180;
        if(lastSignal!==race.signal) {lastSignal=race.signal;signalMaterials.forEach((mat,i)=>{const on=["red","amber","green"][i]===race.signal;mat.emissiveColor=mat.albedoColor.scale(on?1.4:.02);mat.alpha=1;});}
        runner.animate(0,{stride:race.stride,moving:race.running});world.render();
      },
      resize:world.resize,
      dispose() {runner.dispose();world.dispose();},
    };
  } catch(error) {world.dispose();throw error;}
}
