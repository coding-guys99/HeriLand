/* HeriLand discovery: real SQLite API, clear demo attribution. */
const DISCOVERY_MODES=[
 {name:'Explore',sub:'Places & landscapes',symbol:'↗'},
 {name:'Taste',sub:'Food & local flavours',symbol:'◒'},
 {name:'Experience',sub:'Markets & everyday life',symbol:'✳'},
 {name:'Culture',sub:'Heritage & traditions',symbol:'⌁'}
];
const discoveryState={mode:'Explore',guide:null,items:[],loaded:false,exploreType:'All',homeCity:'All Sarawak',homeType:'All'};
async function loadHeritage(){
 try{
  let r=await get('/heritage');
  discoveryState.items=r.items||[];
  discoveryState.loaded=true;
 }catch(err){discoveryState.loaded=false;console.warn('Heritage catalog unavailable',err)}
}
function topicImg(t){return t.image_url||'/assets/sarawak-09.webp'}
function discoveryCards(items){
 return items.length?'<div class="discovery-grid">'+items.map(t=>'<button class="discovery-card" data-guide="'+t.id+'"><span class="discovery-photo"><img loading="lazy" src="'+esc(topicImg(t))+'" alt="Illustrative demo image" /></span><span class="discovery-copy"><small>'+esc(t.kind.toUpperCase())+' · '+esc(t.city)+'</small><strong>'+esc(t.title)+'</strong><span class="discovery-open">Read the guide ↗</span></span></button>').join('')+'</div>':
 '<div class="empty"><strong>No guides found</strong><p>There are no published guides in this selection yet.</p></div>';
}
function discoveryModes(){return '<div class="discovery-modes">'+DISCOVERY_MODES.map(t=>'<button class="discovery-mode '+(discoveryState.mode===t.name?'selected':'')+'" data-discovery-mode="'+t.name+'"><span class="disc-symbol">'+t.symbol+'</span><strong>'+t.name+'</strong><small>'+t.sub+'</small></button>').join('')+'</div>'}
function editorialStory(t,variant=''){
 return '<button class="ed-story '+variant+'" data-guide="'+t.id+'"><span class="ed-story-image"><img src="'+esc(topicImg(t))+'" loading="lazy" alt="Illustrative Sarawak editorial artwork"/></span><span class="ed-story-shade"></span><span class="ed-story-copy"><small>'+esc(t.type)+' / '+esc(t.city)+'</small><strong>'+esc(t.title)+'</strong><span>Discover the story <b>↗</b></span></span></button>';
}
function discoveryHome(){
 const items=discoveryState.items;
 const selected=items.filter(t=>(discoveryState.homeCity==='All Sarawak'||t.city===discoveryState.homeCity)&&(discoveryState.homeType==='All'||t.type===discoveryState.homeType));
 const top=selected.slice(0,3);
 const featured=items.find(t=>t.legacy_key==='heriland:food:sarawak-laksa')||items[0];
 const cities=['All Sarawak',...state.cities.map(c=>c.name)];
 return '<div class="editorial-home home-discovery">'+
 '<header class="ed-masthead"><button class="ed-wordmark" data-discovery-nav="home" aria-label="HeriLand home">heri<span>land</span><i>.</i></button><div class="ed-mast-links"><button data-discovery-nav="home" class="active">Discover</button><button data-discovery-nav="explore">Explore places</button><button data-discovery-mode="Taste">Food</button><button data-discovery-mode="Culture">Culture</button><button data-nav="create">Share your story</button></div><button class="ed-account" data-nav="profile" aria-label="My account">'+ico('profile')+'</button></header>'+
 '<section class="ed-hero ed-action-hero"><div class="ed-hero-picture"><img src="/assets/sarawak-10.webp" alt="Illustrative Sarawak riverside scene"/></div><div class="ed-hero-scrim"></div>'+
 '<div class="ed-hero-content ed-action-content"><span class="ed-hero-kicker">YOUR JOURNEY STARTS HERE · SARAWAK</span><h1>What would you<br/><em>like to discover?</em></h1><p>Choose a city and something you love. Find local food, places and cultural stories in seconds.</p>'+
 '<form id="homeExploreForm" class="home-quick-form"><label class="home-quick-field"><span>WHERE IN SARAWAK?</span><select name="city" id="homeCitySelect" aria-label="Choose a city">'+cities.map(c=>'<option value="'+esc(c)+'" '+(c===discoveryState.homeCity?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label class="home-quick-field"><span>WHAT INTERESTS YOU?</span><select name="type" id="homeTypeSelect" aria-label="Choose what to discover">'+[['All','Everything'],['Explore','Places & nature'],['Taste','Food & flavours'],['Experience','Local experiences'],['Culture','Culture & heritage']].map(([v,t])=>'<option value="'+v+'" '+(v===discoveryState.homeType?'selected':'')+'>'+t+'</option>').join('')+'</select></label><button type="submit" class="home-explore-submit">Show me Sarawak <span>→</span></button></form>'+
 '<div class="home-quick-hints"><span>OR JUMP STRAIGHT IN</span><button data-discovery-city="Kuching">Kuching</button><button data-discovery-city="Sibu">Sibu</button><button data-discovery-mode="Taste">Food</button><button data-discovery-mode="Culture">Culture</button></div></div></section>'+
 '<section class="home-live-results" id="home-live-results" aria-live="polite"><div class="home-live-heading"><div><span class="ed-overline">A GOOD PLACE TO START</span><h2>'+esc(discoveryState.homeCity==='All Sarawak'?'Pick your first discovery':discoveryState.homeCity+' discoveries')+'</h2><p>'+selected.length+' sample guides match your interests. Select a story below or open all discoveries.</p></div><button data-home-show-all class="home-see-all">See all results <span>→</span></button></div>'+
 '<div class="home-picks">'+(top.length?top.map((t,i)=>'<button class="home-pick" data-guide="'+t.id+'"><img src="'+esc(topicImg(t))+'" alt="Illustrative scene" loading="lazy"/><span class="home-pick-info"><small>'+esc(t.type)+' · '+esc(t.city)+'</small><strong>'+esc(t.title)+'</strong><span>Open this story ↗</span></span></button>').join(''):'<div class="home-no-picks"><strong>No guides in this selection yet.</strong><p>Try another city or interest to discover more.</p><button data-home-reset>Show all Sarawak guides →</button></div>')+'</div></section>'+
 '<section class="home-route-section"><div class="home-route-intro"><span class="ed-overline">EXPLORE YOUR WAY</span><h2>Not sure where to begin?</h2><p>Tap a topic to see stories you can actually open and save.</p></div><div class="home-route-grid">'+[
 ['Explore','See places & nature','sarawak-03.webp'],
 ['Taste','Find local food','sarawak-01.webp'],
 ['Experience','Experience everyday life','sarawak-04.webp'],
 ['Culture','Meet Sarawak cultures','sarawak-11.webp']
 ].map(x=>'<button data-discovery-mode="'+x[0]+'" class="home-route"><img src="/assets/'+x[2]+'" loading="lazy" alt="Illustrative '+x[0]+'"/><span class="home-route-overlay"></span><span class="home-route-text"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><em>Browse now →</em></span></button>').join('')+'</div></section>'+
 '<section class="home-community-cta"><div><span class="ed-overline">FROM PEOPLE WHO KNOW THE PLACE</span><h2>Every place has a story.</h2><p>Explore local voices and share your own Sarawak moments.</p></div><div class="home-community-actions"><button data-discovery-nav="explore">Explore community stories →</button><button data-nav="create">Share a story ↗</button></div></section>'+
 '<footer class="ed-footer"><span class="ed-wordmark-static">heri<span>land</span><i>.</i></span><p>Discover the Heart of Sarawak.</p><small>Illustrative content · Sarawak, Borneo, Malaysia</small></footer></div>';
}
function discoveryExplore(){
 const byCity=discoveryState.items.filter(t=>(state.exploreCity==='All Sarawak'||t.city===state.exploreCity)&&(!discoveryState.exploreType||discoveryState.exploreType==='All'||t.type===discoveryState.exploreType)&&(!state.search||[t.title,t.summary,t.body,t.city,...t.tags].join(' ').toLowerCase().includes(state.search.toLowerCase())));
 return '<div class="discovery-explore-intro"><span class="eyebrow">PLACES · PEOPLE · CULTURE</span><h2>Every place has a story.</h2><p>Find food, nature and cultural discoveries across Sarawak. All editorial content currently shown is labelled demo, and map pins represent city centres.</p></div>'+
 '<input class="search-input" id="searchInput" placeholder="Search stories, culture, places and local flavours" value="'+esc(state.search)+'"/>'+
 '<div class="ed-explore-filters"><span class="eyebrow">DISCOVER BY INTEREST</span><div class="ed-filter-chips">'+['All','Explore','Taste','Experience','Culture'].map(v=>'<button data-explore-type="'+v+'" class="'+((discoveryState.exploreType||'All')===v?'selected':'')+'">'+v+'</button>').join('')+'</div></div>'+
 '<div class="section-row"><h2 class="section-title">Choose a city</h2><span class="small-note">12 cities across Sarawak</span></div>'+
 '<div class="city-grid">'+state.cities.map(c=>'<button data-filter-city="'+esc(c.name)+'" class="city-card '+(state.exploreCity===c.name?'selected':'')+'"><strong>'+esc(c.name)+'</strong><span>Explore local stories ↗</span></button>').join('')+'</div>'+
 '<div class="section-row"><div><span class="eyebrow">HERILAND GUIDES</span><h2 class="section-title">'+esc(state.exploreCity)+' · Discoveries</h2></div><span class="demo-pill">EDITORIAL DEMO</span></div>'+
 discoveryCards(byCity)+
 '<div class="section-row"><div><span class="eyebrow">FROM THE COMMUNITY</span><h2 class="section-title">'+esc(state.exploreCity)+' · Local voices</h2></div><button class="text-btn" data-city-to-feed>See all ↗</button></div>'+
 '<div id="exploreFeed">'+feedHTML()+'</div>'+
 '<h2 class="section-title" style="margin-top:30px">City map</h2><p class="small-note">OpenStreetMap city-centre overview. Demo posts do not represent verified locations.</p><iframe title="City map" class="map-frame" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox='+mapBBox()+'&layer=mapnik&marker='+encodeURIComponent(mapMarker())+'"></iframe>';
}
function guideOverlay(t){
 const shops=discoveryState.guideShops||[];
 return '<div class="modal-backdrop" data-guide-close-backdrop><div class="modal discovery-guide-dialog" role="dialog" aria-modal="true" aria-label="Culture and lifestyle guide"><button class="modal-close" data-guide-close aria-label="Close">×</button><img class="discovery-guide-hero" src="'+esc(topicImg(t))+'" alt="Generated illustrative scene"/><div class="discovery-guide-content"><span class="eyebrow">'+esc(t.kind.toUpperCase())+' · '+esc(t.city)+'</span><h2>'+esc(t.title)+'</h2><span class="demo-pill">EDITORIAL DEMO · '+esc(t.source)+'</span><p>'+esc(t.body)+'</p>'+
 '<div class="hashtags">'+(t.tags||[]).map(tag=>'<span>#'+esc(tag)+'</span>').join('')+'</div>'+
 '<div class="tool-row" style="margin:20px 0"><button class="action-btn" data-discovery-city="'+esc(t.city)+'">Explore '+esc(t.city)+' ↗</button><button class="action-btn secondary" data-heritage-save="'+t.id+'">'+(t.saved?'★ Saved':'☆ Save guide')+'</button></div>'+
 '<div class="guide-related"><h3>Recommended local places</h3>'+(shops.length?shops.map(s=>'<div class="panel"><strong>'+esc(s.name)+'</strong><p class="small-note">'+esc(s.city)+' · '+(s.is_verified?'Verified listing':'Unverified information')+'</p>'+(s.address?'<p>'+esc(s.address)+'</p>':'')+'</div>').join(''):'<p class="small-note">No verified shop or venue is connected to this guide yet. You can still explore community stories by city.</p>')+'</div>'+
 '<p class="small-note">Images are illustrative. Old HeriLand examples are not independently verified venue listings or recommendations.</p></div></div></div>';
}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='homeExploreForm')return;
 e.preventDefault();e.stopImmediatePropagation();
 discoveryState.homeCity=e.target.elements.city.value;discoveryState.homeType=e.target.elements.type.value;
 discoveryState.exploreType=discoveryState.homeType;state.exploreCity=discoveryState.homeCity;state.search='';state.modal=null;
 await switchPage('explore');
},true);
document.addEventListener('change',e=>{
 if(e.target.id==='homeCitySelect'||e.target.id==='homeTypeSelect'){
  discoveryState.homeCity=document.getElementById('homeCitySelect').value;
  discoveryState.homeType=document.getElementById('homeTypeSelect').value;
  render();
 }
},true);
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-guide],[data-discovery-mode],[data-discovery-nav],[data-discovery-city],[data-guide-close],[data-heritage-save],[data-explore-type],[data-home-show-all],[data-home-reset]');
 if(!b){if(e.target.matches('[data-guide-close-backdrop]')){discoveryState.guide=null;state.modal=null;render()}return}
 e.preventDefault();e.stopPropagation();
 if(b.hasAttribute('data-guide-close')){discoveryState.guide=null;state.modal=null;render();return}
 if(b.dataset.guide){
  try{const r=await get('/heritage/'+b.dataset.guide);discoveryState.guide=r.item;discoveryState.guideShops=r.shops||[];state.modal='guide';render()}catch(err){toast(err.message)}
  return;
 }
 if(b.dataset.heritageSave){
  if(needAuth())return;
  try{const r=await send('/heritage/'+b.dataset.heritageSave+'/save',{});discoveryState.guide.saved=r.saved;const item=discoveryState.items.find(x=>x.id===+b.dataset.heritageSave);if(item)item.saved=r.saved;render();toast(r.saved?'Guide saved to your account':'Guide removed from saved items')}catch(err){toast(err.message)}
  return;
 }
 if(b.hasAttribute('data-home-reset')){discoveryState.homeCity='All Sarawak';discoveryState.homeType='All';render();return}
 if(b.hasAttribute('data-home-show-all')){discoveryState.exploreType=discoveryState.homeType;state.exploreCity=discoveryState.homeCity;state.search='';await switchPage('explore');return}
 if(b.dataset.exploreType){discoveryState.exploreType=b.dataset.exploreType;render();return}
 if(b.dataset.discoveryMode){discoveryState.mode=b.dataset.discoveryMode;discoveryState.exploreType=b.dataset.discoveryMode;state.modal=null;state.exploreCity='All Sarawak';await switchPage('explore');return}
 if(b.dataset.discoveryNav){state.modal=null;await switchPage(b.dataset.discoveryNav);return}
 if(b.dataset.discoveryCity){state.exploreCity=b.dataset.discoveryCity;state.modal=null;discoveryState.guide=null;if(state.page==='explore')await fetchPosts();else await switchPage('explore');return}
},true);
