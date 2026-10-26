import test from "node:test";
import assert from "node:assert/strict";
import { TUG_ITEMS, TUG_BREEDS, normalizeTugPet, readTugWardrobe, writeTugWardrobe, TUG_REWARDS } from "../cats-dogs-customization.js";
import { rewardTotal, createRewardSession } from "../arcade/game-services.js";
import { createArcadeWallet } from "../arcade/wallet.js";
import { studioCharacter } from "../arcade/studio-preview.js";
const storage=()=>{const v=new Map();return{getItem:k=>v.get(k)||null,setItem:(k,x)=>v.set(k,x)};};
test("all six breeds are free and cannot cross cat/dog teams",()=>{
  for(const [breed,b] of Object.entries(TUG_BREEDS)){assert.equal(normalizeTugPet(b.side,{breed}).breed,breed);assert.notEqual(normalizeTugPet(b.side==="cats"?"dogs":"cats",{breed}).breed,breed);}
  assert.equal(Object.keys(TUG_BREEDS).length,6);
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
test("a match reward is banked once and buys cosmetics through the shared wallet",async()=>{
  const store=storage(),wallet=createArcadeWallet({storage:store}),session=createRewardSession("catsdogs",wallet),progress={mode:"ai",finished:true,difficulty:"expert",roundsWon:2,won:true,pulls:20};
  assert.equal((await session.award(progress)).coins,69);assert.equal((await session.award(progress)).coins,0);assert.equal(wallet.getState().coins,69);
  await wallet.claim("archery","other-game",60);await wallet.claim("archery","another-game",60);
  const result=await wallet.purchase("catsdogs:medal");assert.equal(result.ok,true);assert.equal(wallet.getState().coins,9);assert.ok(wallet.getState().owned.includes("catsdogs:medal"));
  assert.equal(createArcadeWallet({storage:store}).getState().coins,9);
});
