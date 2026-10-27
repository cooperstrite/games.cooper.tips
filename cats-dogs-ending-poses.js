// Each sprite sheet contains a waving celebration and a seated, sad pose.
// Measurements are in the original square cells before the protective margin.
export const END_POSE_SCALE=.84,END_POSE_PAD=.10;
const measured={
  tabby:[[.49,.26,.61,.21,.58,.264,.58,.32,.50,.145,.51,.414],[.52,.407,.63,.428,.582,.465,.573,.495,.49,.312,.50,.549]],
  siamese:[[.512,.27,.632,.218,.612,.274,.613,.33,.523,.15,.533,.435],[.64,.435,.745,.448,.712,.50,.701,.528,.61,.339,.61,.58]],
  calico:[[.536,.267,.654,.22,.63,.274,.621,.329,.54,.155,.535,.435],[.592,.421,.699,.441,.66,.482,.646,.514,.56,.327,.58,.57]],
  british:[[.542,.266,.663,.212,.64,.265,.636,.324,.55,.145,.55,.43],[.58,.435,.69,.447,.646,.49,.631,.52,.56,.338,.58,.574]],
  mainecoon:[[.526,.264,.64,.216,.614,.269,.611,.323,.53,.15,.525,.423],[.58,.432,.68,.449,.63,.49,.62,.518,.55,.328,.55,.57]],
  golden:[[.602,.169,.519,.129,.472,.179,.506,.249,.571,.075,.548,.35],[.385,.337,.290,.374,.322,.452,.343,.48,.37,.232,.46,.526]],
  labrador:[[.61,.14,.515,.102,.487,.154,.518,.225,.568,.055,.56,.323],[.44,.412,.335,.397,.331,.495,.374,.532,.42,.287,.48,.59]],
  pitbull:[[.572,.18,.47,.138,.431,.197,.494,.278,.55,.075,.54,.37],[.395,.39,.292,.414,.321,.492,.361,.525,.37,.267,.47,.573]],
  corgi:[[.519,.241,.44,.207,.392,.26,.442,.326,.52,.159,.52,.427],[.41,.444,.315,.449,.308,.53,.356,.57,.42,.343,.48,.63]],
  husky:[[.553,.213,.474,.176,.416,.235,.466,.298,.536,.137,.53,.397],[.344,.426,.255,.461,.285,.53,.33,.572,.33,.317,.43,.607]],
};
const position=v=>END_POSE_PAD+v*END_POSE_SCALE;
const raisedPaw={tabby:[.81,.16],siamese:[.82,.16],calico:[.82,.17],british:[.82,.15],mainecoon:[.80,.17],golden:[.335,.15],labrador:[.34,.155],pitbull:[.30,.19],corgi:[.315,.245],husky:[.34,.22]};
export function endingRig(pet){
  const cat=["tabby","siamese","calico","british","mainecoon"].includes(pet.breed),sad=pet.pose==="sad";
  const [nx,ny,fx,fy,nox,noy,mx,my,hx,hy,cx,cy]=(measured[pet.breed]||measured.tabby)[sad?1:0];
  const eye=(x,y,rx,ry)=>[position(x),position(y),rx*END_POSE_SCALE,ry*END_POSE_SCALE,Math.atan2(fy-ny,fx-nx)+(cat?0:Math.PI),"oval"];
  return {pose:pet.pose,cat,eyes:[eye(nx,ny,cat?.045:.032,sad?.025:cat?.035:.029),eye(fx,fy,cat?.029:.022,sad?.024:.029)],
    nose:[position(nox),position(noy),(cat?.022:.034)*END_POSE_SCALE,(cat?.013:.025)*END_POSE_SCALE],
    mouth:[position(mx),position(my),(sad?.034:cat?.060:.076)*END_POSE_SCALE,(sad?.017:cat?.047:.039)*END_POSE_SCALE,0],
    hat:[position(hx),position(hy),.27*END_POSE_SCALE],neck:[position(cx),position(cy)],
    bandanaBounds:[position(cx-.24),position(cy-.12),.48*END_POSE_SCALE,.23*END_POSE_SCALE],
    pawPads:sad?null:(raisedPaw[pet.breed]||raisedPaw.tabby).map(position).concat(.078*END_POSE_SCALE),
  };
}
export function endingAppearance(pet,pose){
  return {...pet,pose,markings:(pet.markings||[]).map(mark=>{
    const cat=["tabby","siamese","calico","british","mainecoon"].includes(pet.breed),rig=endingRig({...pet,pose}),near=rig.eyes[0];
    let x,y,size=mark.size;
    if(mark.y<.33){x=near[0]+(mark.x-(cat?.437:.545))*.78;y=near[1]+(mark.y-(cat?.231:.175))*.78;size*=.78;}
    else if(pose==="sad"){x=position(.52+(mark.x-.53)*.65);y=position(.58+(mark.y-.4)*.62);size*=.72;}
    else{x=position(.58+(mark.x-.53)*.72);y=position(.42+(mark.y-.4)*.89);size*=.82;}
    return {...mark,x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y)),size};
  })};
}
export function endingSource(pet){return pet.pose?`assets/cats-dogs-ending-${Object.hasOwn(measured,pet.breed)?pet.breed:"tabby"}.png`:null;}
