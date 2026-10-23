import test from "node:test";
import assert from "node:assert/strict";
import { createRiddleDeck, makeRunePuzzle, permutations, obeysClue, isRiddleAnswer } from "../haunted-harvest-riddles.js";

const random = seed => () => ((seed = Math.imul(seed,1664525) + 1013904223 >>> 0) / 2 ** 32);
test("each difficulty has a separate puzzle bank and a progressively longer spell",()=>{
  const seen=new Set();
  for(const [mode,runes] of [["cozy",3],["eerie",4],["wicked",5]]){
    const deck=createRiddleDeck(mode,1,random(12));assert.equal(deck.sweet.length,8);assert.equal(deck.cursed.length,5);
    for(const q of deck.sweet){assert.equal(seen.has(q.id),false);seen.add(q.id);assert.equal(q.mode,mode);assert.ok(q.hint&&q.explain);}
    for(const q of deck.cursed)assert.equal(q.answer.length,runes);
    assert.equal(deck.sweet.some(q=>q.type==="number"),mode==="wicked");
  }
});
test("generated rune clues admit exactly one solution at every difficulty",()=>{
  for(const mode of ["cozy","eerie","wicked"])for(let seed=1;seed<=60;seed++){
    const q=makeRunePuzzle(mode,random(seed));
    const solutions=permutations(q.options.map((_,i)=>i)).filter(order=>q.constraints.every(c=>obeysClue(order,c)));
    assert.deepEqual(solutions,[q.answer],`${mode} seed ${seed}`);
    assert.equal(isRiddleAnswer(q,q.answer),true);assert.equal(isRiddleAnswer(q,q.answer.slice(1)),false);
    assert.equal(q.clues.length,q.constraints.length);
  }
});
test("numeric challenges have exact whole-number answers and reject guesses with trailing text",()=>{
  for(let seed=1;seed<=30;seed++)for(const night of [0,1,2]){
    const deck=createRiddleDeck("wicked",night,random(seed));
    for(const q of deck.sweet.filter(q=>q.type==="number")){
      assert.ok(Number.isInteger(q.value)&&q.value>0);assert.equal(isRiddleAnswer(q,String(q.value)),true);
      assert.equal(isRiddleAnswer(q,String(q.value+1)),false);assert.equal(isRiddleAnswer(q,q.value+" ghosts"),false);
    }
  }
});
test("the vault, remainder, truth plaques, and clock answers follow their stated constraints",()=>{
  const wicked=createRiddleDeck("wicked",0,random(1)).sweet;
  const vault=[];for(let code=111;code<1000;code++){const [a,b,c]=String(code).split("").map(Number);if(!a||!b||!c)continue;if(a+b+c===14&&a===2*c&&code-(100*c+10*b+a)===297)vault.push(code);}
  assert.deepEqual(vault,[wicked.find(q=>q.id==="wicked-code").value]);
  const bats=[];for(let n=11;n<20;n++)if(n%3===2&&n%4===2)bats.push(n);assert.deepEqual(bats,[14]);
  const truthCounts=[0,1,2,3].map(key=>[key===1||key===2,key===0,key!==2,key===3].filter(Boolean).length);
  assert.equal(truthCounts.filter(n=>n===2).length,3);assert.equal(wicked.find(q=>q.id==="wicked-truth").answer[0],4);
  assert.equal(wicked.find(q=>q.id==="wicked-clock").value*65/60,390);
});
test("decks vary numbers and rune arrangements without repeating a family inside one deck",()=>{
  const a=createRiddleDeck("eerie",0,random(20)),b=createRiddleDeck("eerie",2,random(420));
  assert.equal(new Set(a.sweet.map(q=>q.id)).size,a.sweet.length);
  assert.notEqual(a.sweet.find(q=>q.id==="eerie-sequence").prompt,b.sweet.find(q=>q.id==="eerie-sequence").prompt);
  assert.notDeepEqual(a.cursed.map(q=>q.answer),b.cursed.map(q=>q.answer));
});
