/** Source-aware appearance: observations affect roof color only, never footprint or height. */
export function roofAppearance(feature,observations={}){
 const sample=observations.buildings?.[feature.type+'/'+feature.id];
 const usable=sample&&/^#[0-9a-f]{6}$/i.test(sample.color)&&sample.samples>=40&&sample.spread<=35;
 return {color:usable?sample.color:feature.tags.building==='church'?'#6b8590':['#a65337','#b16943','#777a72','#a88753'][feature.id%4],
  observed:!!usable,shape:feature.tags['roof:shape']||null};
}
export function shade(hex,amount){return '#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,parseInt(v,16)+amount)).toString(16).padStart(2,'0')).join('');}
