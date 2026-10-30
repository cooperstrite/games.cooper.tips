import test from "node:test";
import { posePetMarkings } from "../cats-dogs-pose-paint.js";
import { nativePoseRig } from "../cats-dogs-pose-rigs.js";
import assert from "node:assert/strict";
import { TUG_ITEMS, TUG_BREEDS, normalizeTugPet, readTugWardrobe, writeTugWardrobe, TUG_REWARDS, tugCoats, tugCoat, TUG_WARDROBE_KEY } from "../cats-dogs-customization.js";
import { MAX_PET_MARKINGS, normalizePetMarkings, petPatchAt, petPattern } from "../cats-dogs-coat.js";
import { CharacterBuilder } from "../arcade/characters.js";
import { rewardTotal, createRewardSession } from "../arcade/game-services.js";
import { createArcadeWallet } from "../arcade/wallet.js";
import { studioCharacter } from "../arcade/studio-preview.js";
import { endingAppearance, endingSource } from "../cats-dogs-ending-poses.js";
import { petRig } from "../cats-dogs-pet-rig.js";
import { existsSync } from "node:fs";
const storage=()=>{const v=new Map();return{getItem:k=>v.get(k)||null,setItem:(k,x)=>v.set(k,x)};};
test("all ten breeds are free and cannot cross cat/dog teams",()=>{
  for(const [breed,b] of Object.entries(TUG_BREEDS)){assert.equal(normalizeTugPet(b.side,{breed}).breed,breed);assert.notEqual(normalizeTugPet(b.side==="cats"?"dogs":"cats",{breed}).breed,breed);}
  assert.equal(Object.keys(TUG_BREEDS).length,10);
});
test("locked accessories normalize safely, and an unlock works on either pet",()=>{
  for(const item of TUG_ITEMS)for(const side of ["cats","dogs"]){assert.equal(normalizeTugPet(side,{[item.setting]:item.value})[item.setting],"none");assert.equal(normalizeTugPet(side,{[item.setting]:item.value},[item.id])[item.setting],item.value);}
  assert.equal(normalizeTugPet("cats",{breed:"__proto__",hat:"__proto__",accent:"red"}).accent,"#cf7455");
});
test("cat and dog names, breeds and accessories survive saving independently",()=>{
  const store=storage(),pets=readTugWardrobe([],store);pets.cats=normalizeTugPet("cats",{name:"Miso",breed:"siamese",hat:"cap",accent:"#6699aa"});pets.dogs=normalizeTugPet("dogs",{name:"Peanut",breed:"pitbull",eyewear:"round"});
  assert.equal(writeTugWardrobe(pets,store),true);assert.deepEqual(readTugWardrobe([],store),pets);
  const pet=studioCharacter("catsdogs",pets.cats);assert.equal(pet.family,"pet");assert.equal(pet.key,"siamese");assert.equal(pet.features.hat,"cap");assert.equal(pet.colors.accessory,"#6699aa");
  assert.equal(normalizeTugPet("cats",{name:"<Miso>\n"}).name,"Miso");assert.equal(normalizeTugPet("cats",{name:""}).name,"Whiskers");
});
test("coin rates scale with difficulty and only completed computer matches qualify",()=>{
  for(const [difficulty,r] of Object.entries(TUG_REWARDS)){
    const p={mode:"ai",finished:true,difficulty,roundsWon:2,won:true,pulls:10};assert.equal(rewardTotal("catsdogs",p),r.round*2+r.win);
    for(const changes of [{mode:"local"},{finished:false},{roundsWon:3},{roundsWon:-1},{pulls:0},{difficulty:"__proto__"},{won:true,roundsWon:0}])assert.equal(rewardTotal("catsdogs",{...p,...changes}),0);
    assert.equal(rewardTotal("catsdogs",{...p,roundsWon:1,won:false}),r.round);
  }
});
test("named coats include four Labradors and flame point Siamese, without purchases",()=>{
  assert.deepEqual(tugCoats("labrador").map(c=>c.id),["chocolate","yellow","white","black"]);
  assert.equal(tugCoats("siamese").find(c=>c.id==="flame").name,"Flame point Siamese");
  for(const [breed,b] of Object.entries(TUG_BREEDS))for(const coat of tugCoats(breed)){
    const pet=normalizeTugPet(b.side,{breed,coat:coat.id});
    assert.equal(pet.coat,coat.id);assert.equal(tugCoat(pet).image,coat.image);
    assert.equal(studioCharacter("catsdogs",pet).colors.body,coat.coat);
  }
  assert.equal(normalizeTugPet("cats",{breed:"siamese",coat:"chocolate"}).coat,"seal");
});
test("old wardrobes retain their names and accessories while new coats and patches save independently",()=>{
  const store=storage();store.setItem(TUG_WARDROBE_KEY,JSON.stringify({selected:"dogs",cats:{breed:"siamese",name:"Miso",hat:"cap"},dogs:{breed:"labrador",name:"Cocoa",eyewear:"round"}}));
  const pets=readTugWardrobe([],store);
  assert.equal(pets.cats.coat,"seal");assert.equal(pets.dogs.coat,"chocolate");assert.deepEqual(pets.cats.markings,[]);assert.equal(pets.cats.hat,"cap");assert.equal(pets.dogs.eyewear,"round");
  pets.cats.coat="flame";pets.cats.markings=petPattern("cats","splotches","#ab5422");
  pets.dogs.coat="white";pets.dogs.coatColor="#869aab";pets.dogs.markings=petPattern("dogs","spots","#332419");
  assert.equal(writeTugWardrobe(pets,store),true);assert.deepEqual(readTugWardrobe([],store),pets);
  assert.equal(studioCharacter("catsdogs",pets.dogs).colors.body,"#869aab");
});
test("invalid saved paint is bounded, colors are validated, and overlapping patches pick the top layer",()=>{
  const markings=normalizePetMarkings([{id:1,x:-1,y:2,size:20,rotation:500,color:"red",shape:"__proto__"},{id:1,x:.5,y:.5,size:.1,shape:"stripe",rotation:90,color:"#AABBCC"},{x:NaN,y:.4},null]);
  assert.deepEqual(markings[0],{id:1,x:0,y:1,size:.22,rotation:180,shape:"splotch",color:"#4a3027",textureScale:1,undertone:.28});
  assert.equal(markings.length,2);assert.equal(markings[1].id,2);assert.equal(markings[1].color,"#aabbcc");
  assert.equal(petPatchAt(markings,.63,.5)?.id,2);assert.equal(petPatchAt(markings,.5,.63),null);
  assert.equal(petPatchAt([{...markings[1],id:3},markings[1]],.5,.5)?.id,2);
  assert.equal(normalizePetMarkings(Array.from({length:100},()=>({x:.5,y:.5}))).length,MAX_PET_MARKINGS);
  assert.equal(normalizeTugPet("dogs",{coatColor:"url(unsafe)"}).coatColor,null);
  assert.equal(normalizeTugPet("dogs",{coatColor:"#A1B2C3"}).coatColor,"#a1b2c3");
});
test("shared pet characters retain immutable patch positions without exposing them to other games",()=>{
  const marks=petPattern("cats","splotches"),dogMarks=petPattern("dogs","splotches");
  marks.forEach((mark,i)=>assert.ok(Math.abs(mark.x+dogMarks[i].x-1)<1e-12));
  const builder=new CharacterBuilder("catsdogs","british").withMarkings(marks),pet=builder.build();
  marks[0].x=.99;assert.notEqual(pet.markings[0].x,.99);
  assert.throws(()=>{pet.markings[0].x=.2;},TypeError);
  assert.throws(()=>new CharacterBuilder("flappy","sparrow").withMarkings(marks),TypeError);
  assert.throws(()=>builder.withMarkings({}),TypeError);
  const appearance=normalizeTugPet("cats",{breed:"british",markings:pet.markings});
  assert.deepEqual(studioCharacter("catsdogs",appearance).markings,pet.markings);
});
test("a match reward is banked once and buys cosmetics through the shared wallet",async()=>{
  const store=storage(),wallet=createArcadeWallet({storage:store}),session=createRewardSession("catsdogs",wallet),progress={mode:"ai",finished:true,difficulty:"expert",roundsWon:2,won:true,pulls:20};
  assert.equal((await session.award(progress)).coins,69);assert.equal((await session.award(progress)).coins,0);assert.equal(wallet.getState().coins,69);
  await wallet.claim("archery","other-game",60);await wallet.claim("archery","another-game",60);
  const result=await wallet.purchase("catsdogs:medal");assert.equal(result.ok,true);assert.equal(wallet.getState().coins,9);assert.ok(wallet.getState().owned.includes("catsdogs:medal"));
  assert.equal(createArcadeWallet({storage:store}).getState().coins,9);
});
test("independent coat pigments and bandanas migrate, save, and reach the 3D character without recoloring accessories",()=>{
  const store=storage(),wardrobe=readTugWardrobe([],store);
  for(const side of ["cats","dogs"]){
    for(const key of ["secondaryColor","patternColor","bandanaColor"])assert.equal(wardrobe[side][key],null);
    wardrobe[side]=normalizeTugPet(side,{...wardrobe[side],coatColor:"#446677",secondaryColor:"#FFEEDD",patternColor:"#443322",bandanaColor:"#AABBCC",accent:"#229955"});
    const mesh=studioCharacter("catsdogs",wardrobe[side]);
    assert.equal(mesh.colors.body,"#446677");assert.equal(mesh.colors.belly,"#ffeedd");assert.equal(mesh.colors.dark,"#443322");assert.equal(mesh.colors.bandana,"#aabbcc");assert.equal(mesh.colors.accessory,"#229955");
    const invalid=normalizeTugPet(side,{secondaryColor:"red",patternColor:"url(bad)",bandanaColor:{}});
    assert.equal(invalid.secondaryColor,null);assert.equal(invalid.patternColor,null);assert.equal(invalid.bandanaColor,null);
  }
  writeTugWardrobe(wardrobe,store);assert.deepEqual(readTugWardrobe([],store),wardrobe);
  const mainOnly=studioCharacter("catsdogs",normalizeTugPet("dogs",{breed:"husky",coatColor:"#ff5500"}));
  assert.equal(mainOnly.colors.belly,TUG_BREEDS.husky.light);assert.equal(mainOnly.colors.dark,TUG_BREEDS.husky.dark);
});
test("every ending pose keeps the selected coat and cosmetics without changing saved markings",()=>{
  for(const [breed,b] of Object.entries(TUG_BREEDS))for(const coat of tugCoats(breed)){
    const pet=normalizeTugPet(b.side,{breed,coat:coat.id,name:"Peanut",hat:"cap",eyewear:"round",bandanaColor:"#668899",coatColor:"#aabbcc",secondaryColor:"#ddeeff",patternColor:"#445566",markings:petPattern(b.side,"splotches","#664422")});
    const saved=JSON.stringify(pet),poses=["win","sad"].map(pose=>endingAppearance(pet,pose));
    for(const posed of poses){
      for(const key of ["breed","coat","name","hat","eyewear","bandanaColor","coatColor","secondaryColor","patternColor"])assert.equal(posed[key],pet[key]);
      assert.ok(existsSync(new URL("../"+endingSource(posed),import.meta.url)));
      assert.deepEqual(posed.markings,pet.markings);assert.notEqual(posed.markings,pet.markings);
      posed.markings.forEach((m,i)=>{assert.equal(m.color,pet.markings[i].color);assert.ok(m.x>=0&&m.x<=1&&m.y>=0&&m.y<=1&&m.size>0);});
      assert.notEqual(endingSource(posed),tugCoat(pet).image,"The ending uses a complete natural body, not a bent pulling sprite");
      const rig=petRig(posed);for(const point of [...rig.eyes,rig.nose,rig.hat,rig.neck])assert.ok(point[0]>0&&point[0]<1&&point[1]>0&&point[1]<1);
    }
    assert.notDeepEqual(petRig(poses[0]).eyes,petRig(poses[1]).eyes);
    assert.equal(JSON.stringify(pet),saved);
  }
});
test("paint material controls migrate safely and persist through all presentations",()=>{
  const old=normalizePetMarkings([{id:1,x:.5,y:.5,size:.1}])[0];
  assert.equal(old.textureScale,1);assert.equal(old.undertone,.28);
  const limited=normalizePetMarkings([{...old,textureScale:100,undertone:-1}])[0];
  assert.equal(limited.textureScale,2);assert.equal(limited.undertone,0);
  const store=storage(),wardrobe=readTugWardrobe([],store);
  wardrobe.cats.markings=[{...old,textureScale:1.65,undertone:.43}];writeTugWardrobe(wardrobe,store);
  const saved=readTugWardrobe([],store).cats;
  for(const pose of ["win","sad"])assert.deepEqual(endingAppearance(saved,pose).markings,wardrobe.cats.markings);
  assert.deepEqual(studioCharacter("catsdogs",saved).markings,wardrobe.cats.markings);
});
test("posing repositions complete markings without losing their shapes or saved material",()=>{
  for(const [breed,b] of Object.entries(TUG_BREEDS))for(const pose of ["win","sad"]){
    const pet=normalizeTugPet(b.side,{breed,markings:petPattern(b.side,"splotches","#93764a")}),before=JSON.stringify(pet);
    const mapped=posePetMarkings(pet.markings,petRig(pet),nativePoseRig({...pet,pose}),pose);
    assert.equal(mapped.length,pet.markings.length);
    mapped.forEach((mark,i)=>{
      for(const key of ["id","color","shape","textureScale","undertone"])assert.equal(mark[key],pet.markings[i][key]);
      for(const key of ["x","y","size","rotation"])assert.ok(Number.isFinite(mark[key]));
      assert.ok(mark.size>0&&mark.size<pet.markings[i].size*1.5);
    });
    assert.equal(JSON.stringify(pet),before);
  }
});
