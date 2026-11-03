import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_TEST_LIMIT, parseCookieTestAmount, connectCookieTesting } from '../cookie-testing.js';

class Element {
  constructor(doc) { this.ownerDocument=doc; this.listeners=new Map(); this.attributes=new Map(); this.isConnected=true; this.value='10000'; this.textContent=''; this.open=false; }
  addEventListener(type,listener) { const listeners=this.listeners.get(type)||new Set();listeners.add(listener);this.listeners.set(type,listeners); }
  removeEventListener(type,listener) { this.listeners.get(type)?.delete(listener); }
  emit(type,properties={}) { const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...properties};for(const listener of this.listeners.get(type)||[])listener(event);return event; }
  setAttribute(name,value) { this.attributes.set(name,value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.ownerDocument.activeElement=this; }
  select() { this.selected=true; }
  closest() { return null; }
  showModal() { this.open=true; }
  close() { this.open=false;this.emit('close'); }
  remove() { this.isConnected=false; }
  querySelector(selector) { return this.parts[selector]; }
  append(element) { this.child=element; }
}

function setup() {
  const doc=new Element();doc.hidden=false;doc.ownerDocument=doc;
  doc.createElement=()=>{const element=new Element(doc);element.parts=Object.fromEntries(['form','input','.cc-testing-error','[data-testing-cancel]','[type="submit"]'].map(key=>[key,new Element(doc)]));return element;};
  const wrapper=new Element(doc),original=new Element(doc);original.focus();
  const grants=[],messages=[];let active=true;
  const dispose=connectCookieTesting(wrapper,{canOpen:()=>active,grant:amount=>{grants.push(amount);return amount;},announce:message=>messages.push(message)});
  const dialog=wrapper.child,input=dialog.querySelector('input'),form=dialog.querySelector('form');
  return {doc,wrapper,original,dialog,input,form,grants,messages,dispose,setActive:value=>active=value,press:properties=>doc.emit('keydown',{key:'p',target:original,...properties})};
}

test('test cookie amounts accept whole counts and reject invalid, negative, fractional, and excessive values',()=>{
  for(const [text,amount] of [['1',1],[' 5000 ',5000],['1,000,000',1000000],['0010',10],[String(COOKIE_TEST_LIMIT),COOKIE_TEST_LIMIT]])assert.equal(parseCookieTestAmount(text),amount);
  for(const text of ['',null,undefined,'0','-1','1.1','NaN','Infinity','1e6','1,23','1,000,','1 000',String(COOKIE_TEST_LIMIT+1)])assert.equal(parseCookieTestAmount(text),null);
});

test('P is scoped to an active connected bakery and leaves typing, modified keys, and repeated keys alone',()=>{
  const state=setup();
  for(const event of [{key:'x'},{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{defaultPrevented:true},{target:{isContentEditable:true}},{target:{closest:()=>({})}}]){
    state.press(event);assert.equal(state.dialog.open,false);
  }
  state.setActive(false);state.press();assert.equal(state.dialog.open,false);
  state.setActive(true);state.doc.hidden=true;state.press();assert.equal(state.dialog.open,false);
  state.doc.hidden=false;state.wrapper.isConnected=false;state.press();assert.equal(state.dialog.open,false);
  state.wrapper.isConnected=true;const event=state.press();assert.equal(event.defaultPrevented,true);assert.equal(state.dialog.open,true);assert.equal(state.doc.activeElement,state.input);assert.equal(state.input.selected,true);
  state.dispose();
});

test('valid submission grants the entered amount once, closes, and restores keyboard focus',()=>{
  const state=setup();state.press();state.input.value='50,000';state.form.emit('submit');state.form.emit('submit');
  assert.deepEqual(state.grants,[50000]);assert.equal(state.dialog.open,false);assert.equal(state.doc.activeElement,state.original);assert.match(state.messages[0],/50,000 cookies/);assert.match(state.messages[0],/No arcade coins awarded/);
  state.dispose();
});

test('invalid input, losing the bakery lease, cancellation, and disposal cannot grant cookies',()=>{
  const state=setup();state.press();state.input.value='-200';state.form.emit('submit');assert.equal(state.dialog.open,true);assert.equal(state.input.attributes.get('aria-invalid'),'true');
  state.input.value='200';state.input.emit('input');assert.equal(state.input.attributes.has('aria-invalid'),false);
  state.setActive(false);state.form.emit('submit');assert.deepEqual(state.grants,[]);
  state.dialog.emit('cancel');assert.equal(state.dialog.open,false);assert.equal(state.doc.activeElement,state.original);
  state.setActive(true);state.press();state.dialog.querySelector('[data-testing-cancel]').emit('click');assert.equal(state.dialog.open,false);
  state.press();state.dispose();assert.equal(state.dialog.open,false);assert.equal(state.dialog.isConnected,false);state.press();state.form.emit('submit');assert.equal(state.dialog.open,false);assert.deepEqual(state.grants,[]);
});
