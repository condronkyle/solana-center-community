import {AUDIENCES, THEMES, filterPrograms, recommendedPrograms, buildPlan, safeUrl, milestoneState} from './lib/core.js';

const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,title)=>`<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
const state={programs:[],policies:[],story:null,assets:[],audience:'jurisdictions',programAudience:'all',theme:'all',query:'',initiative:'food',policy:'sb1383',expanded:false,historyExpanded:false,saved:new Set()};
let toastTimer;
const media={food:{path:'food-recovery.png',alt:'Food recovery at a local business'},organics:{path:'compost.png',alt:'Community compost education outdoors'},soil:{path:'compost.png',alt:'Learning about composting and soil'},textiles:{path:'textiles.jpg',alt:'Textiles at a Solana Center community event'},packaging:{path:'mural.png',alt:'Environmental mural at Solana Center'},water:{path:'community.png',alt:'Learning together in a local garden'},education:{path:'community.png',alt:'Community members learning in a garden'}};
const programMedia=program=>media[program.id==='jurisdiction-organics'?'education':program.id==='business-organics'?'food':program.theme];
const featuredIds=['jurisdiction-organics','business-organics','manure-consultation','circular-textiles','plastic-prevention','school-youth'];
const initiatives=[
  {id:'food',icon:'◔',label:'Food recovery',eyebrow:'FEED PEOPLE FIRST',title:'Good food belongs on a table.',summary:'Preventing food waste and recovering edible surplus links local businesses, food recovery organizations, and jurisdiction programs. Composting has a different role for materials that cannot feed people.',path:['Prevent waste','Recover food','Recycle organics'],themes:['food','organics'],policy:'sb1383',note:'Solana Center offers education and technical help. It is not listed here as a food collection or public donation site.'},
  {id:'soil',icon:'❋',label:'Compost & soil',eyebrow:'RETURN VALUE TO THE SOIL',title:'The next chapter starts under our feet.',summary:'Composting skills, manure management, and soil education help connect organic materials to useful local practices. Farm and community learning can support a wider culture of resource recovery.',path:['Compost skills','Healthy soil','Local learning'],themes:['organics','soil'],policy:'sb1383',note:'The new state award identifies regional compost hubs as planned work. It does not establish an open network of drop-off sites.'},
  {id:'packaging',icon:'↻',label:'Packaging & reuse',eyebrow:'DESIGN WASTE OUT',title:'Keep the use. Lose the single use.',summary:'Reuse starts with practical choices: shared dishware, better purchasing, and staff education. Solana Center connects these habits with plastic-waste guidance as California puts SB 54 into practice.',path:['Prevent','Reuse','Recover'],themes:['packaging','education'],policy:'sb54',note:'Solana Center provides education and waste-reduction support. Circular Action Alliance administers the approved packaging PRO.'},
  {id:'textiles',icon:'▧',label:'Textiles',eyebrow:'GIVE MATERIALS MORE LIFE',title:'A second life can start with a stitch.',summary:'Swaps, mending, and upcycling make textile reuse visible and practical. These community skills matter now, while California develops its producer-funded textile recovery system.',path:['Repair','Share & reuse','Future recovery'],themes:['textiles'],policy:'sb707',note:'Existing Solana events are separate from the developing statewide collection program. Check current events and accepted items.'},
  {id:'water',icon:'◒',label:'Water stewardship',eyebrow:'CARE FOR THE WHOLE LANDSCAPE',title:'Healthy communities start with healthy places.',summary:'Rainwater education and watershed learning connect what happens in a garden, on a farm, and across a neighborhood. Workshops help people choose practices that fit their own site.',path:['Learn','Plan for your site','Care for water'],themes:['water','soil'],policy:null,note:'Rain-barrel and consultation programs can have location, event, funding, and eligibility limits. Read the specific program details.'},
  {id:'education',icon:'✳',label:'Education & sharing',eyebrow:'KNOWLEDGE MAKES THE CONNECTION',title:'Skills grow stronger when they are shared.',summary:'School programs, hands-on workshops, borrowed tools, and professional training give different parts of the community a way to act. Learning is the thread through the work.',path:['Learn together','Build confidence','Put it to use'],themes:['education','organics'],policy:null,note:'Published offerings are not a booking confirmation. Ask Solana Center about current dates, availability, and funding.'}
];
const iconPaths={city:'M5 29V12l10-5v22M15 29V3l13 6v20M2 29h29M9 15h2m-2 5h2m8-9h3m-3 5h3m-3 5h3',business:'M5 13v16h23V13M3 13l3-9h21l3 9M3 13q4 5 7 0q4 5 7 0q4 5 7 0q4 5 6 0M10 29v-9h7v9m5-8h3',farm:'M3 29h28M5 29V15l11-9 12 9v14M11 29V18h10v11m-10-11 10 11m0-11-10 11M3 15l13-11 15 11',home:'M3 15 16 4l13 11M7 13v16h18V13M13 29v-9h6v9M25 7V3h4v8'};

function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);}
function formatDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
function programSources(program){return uniqueSources([{title:program.sourceTitle,url:program.sourceUrl},...(program.sources||[])]);}
function uniqueSources(items){return [...new Map(items.filter(s=>s?.url).map(s=>[s.url,s])).values()];}
function sourceLinks(items){return items.map(s=>link(s.url,s.title)).join('');}
function openDetail(html){$('#detail-content').innerHTML=html;if(!$('#detail-dialog').open)$('#detail-dialog').showModal();else $('#detail-dialog').scrollTop=0;}

function setAudience(id){
  if(!AUDIENCES[id])return;
  state.audience=id;state.programAudience=id;state.expanded=false;
  $$('.audience-tabs button').forEach(button=>{const selected=button.dataset.audience===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  $('#audience-panel').setAttribute('aria-labelledby',`audience-${id}`);
  $('#program-audience').value=id;renderAudience();renderPrograms();renderPolicy();persistPlan();
}
function renderAudience(){
  const audience=AUDIENCES[state.audience];
  const programs=recommendedPrograms(state.programs,state.audience);
  $('#audience-panel').innerHTML=`<div class="audience-copy"><h3>${esc(audience.title)}</h3><p>${esc(audience.description)}</p><ol class="audience-steps">${audience.steps.map((step,i)=>`<li><span>${i+1}</span>${esc(step)}</li>`).join('')}</ol><button class="quiet-link" id="browse-audience">Explore programs for ${state.audience==='farms'?'farms & ranches':state.audience} <span>↗</span></button></div><div class="recommendations"><p>PLACES TO START</p>${programs.map(program=>`<article class="recommended-item"><button data-program="${esc(program.id)}"><h4>${esc(program.title)}</h4><small>${esc(THEMES[program.theme])} · Program details &amp; access</small></button><button class="add-mini" data-save="${esc(program.id)}" aria-label="${state.saved.has(program.id)?'Remove':'Save'} ${esc(program.title)}" aria-pressed="${state.saved.has(program.id)}">${state.saved.has(program.id)?'✓':'+'}</button></article>`).join('')}</div>`;
  $('#browse-audience').addEventListener('click',()=>{state.programAudience=state.audience;state.theme='all';state.query='';state.expanded=false;$('#program-audience').value=state.audience;$('#program-search').value='';renderPrograms();$('#programs').scrollIntoView({behavior:'smooth'});});
}
function renderInitiative(){
  $('#initiative-buttons').innerHTML=initiatives.map(item=>`<button class="initiative-button" data-initiative="${item.id}" aria-pressed="${item.id===state.initiative}"><span aria-hidden="true">${item.icon}</span>${item.label}</button>`).join('');
  const item=initiatives.find(i=>i.id===state.initiative),policy=state.policies.find(p=>p.id===item.policy);
  $('#initiative-detail').innerHTML=`<p class="eyebrow">${item.eyebrow}</p><h3>${item.title}</h3><p>${item.summary}</p><div class="initiative-path">${item.path.map((label,i)=>`${i?'<b aria-hidden="true">→</b>':''}<span>${label}</span>`).join('')}</div><button class="quiet-link" id="initiative-programs">Explore related programs <span>↗</span></button>${policy?`<button class="quiet-link initiative-policy-link" data-policy-jump="${policy.id}">${esc(policy.bill.split(' (')[0])} explained ↗</button>`:''}<p class="initiative-note">${item.note}</p>`;
  $('#initiative-programs').addEventListener('click',()=>{state.programAudience='all';state.theme=item.themes[0];state.query='';state.expanded=false;$('#program-audience').value='all';$('#program-search').value='';renderPrograms();$('#programs').scrollIntoView({behavior:'smooth'});});
}
function programCard(program){
  const image=programMedia(program),saved=state.saved.has(program.id);
  return `<article class="program-card"><div class="program-image"><img src="./assets/${image.path}" alt="${image.alt}" loading="lazy" width="400" height="240"><span class="theme-tag">${esc(THEMES[program.theme])}</span></div><div class="program-content"><p class="program-audience">${program.audiences.map(id=>AUDIENCES[id].label).join(' · ')}</p><h3>${esc(program.title)}</h3><p>${esc(program.summary)}</p><div class="program-card-actions"><button data-program="${esc(program.id)}">Program details &amp; access ↗</button><button class="save-program" data-save="${esc(program.id)}" aria-label="${saved?'Remove':'Save'} ${esc(program.title)}" aria-pressed="${saved}">${saved?'✓':'+'}</button></div></div></article>`;
}
function renderPrograms(){
  let programs=filterPrograms(state.programs,{audience:state.programAudience,theme:state.theme,query:state.query});
  if(state.programAudience==='all'&&state.theme==='all'&&!state.query.trim())programs=[...featuredIds.map(id=>programs.find(p=>p.id===id)).filter(Boolean),...programs.filter(p=>!featuredIds.includes(p.id))];
  $('#program-themes').innerHTML=Object.entries(THEMES).map(([id,label])=>`<button data-theme="${id}" aria-pressed="${state.theme===id}">${label}</button>`).join('');
  const shown=state.expanded?programs:programs.slice(0,6);
  $('#program-count').textContent=`${programs.length} ${programs.length===1?'program':'programs'} found${programs.length>shown.length?` · showing ${shown.length}`:''} · Check access and current availability in each program.`;
  $('#program-grid').innerHTML=shown.length?shown.map(programCard).join(''):'<div class="empty-state"><h3>Let’s try another path.</h3><p>No programs match these filters. Try a broader topic or reset your filters.</p></div>';
  $('#show-more').hidden=programs.length<=6;
  $('#show-more').innerHTML=state.expanded?'Show fewer programs ↑':`Show all ${programs.length} programs ↓`;
}
function showProgram(id){
  const program=state.programs.find(p=>p.id===id);if(!program)return;
  const image=programMedia(program);
  openDetail(`<img class="detail-hero-image" src="./assets/${image.path}" alt="${image.alt}"><p class="eyebrow">${esc(THEMES[program.theme])} · ${program.audiences.map(id=>esc(AUDIENCES[id].label)).join(' / ')}</p><h2>${esc(program.title)}</h2><p class="detail-summary">${esc(program.summary)}</p><div class="detail-status"><strong>Availability &amp; access</strong>${esc(program.statusNote)}</div><div class="detail-section"><h3>What the program offers</h3><ul>${program.offerings.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div class="detail-section"><h3>Your next step</h3><p>${esc(program.nextStep)}</p></div><div class="detail-actions"><a class="button button-gold" href="${esc(safeUrl(program.ctaUrl))}" target="_blank" rel="noopener noreferrer">${esc(program.ctaLabel)} ↗</a><button class="button button-outline detail-save" data-save="${esc(program.id)}" aria-pressed="${state.saved.has(program.id)}">${state.saved.has(program.id)?'Saved to your next steps ✓':'Save to your next steps +'}</button></div><div class="detail-sources">${sourceLinks(programSources(program))}<p>Sources checked ${esc(program.checkedAt)}. Visit the official page for current arrangements.</p></div>`);
}
function renderPolicy(){
  const policy=state.policies.find(p=>p.id===state.policy);if(!policy)return;
  $('#policy-tabs').innerHTML=state.policies.map(p=>`<button role="tab" data-policy="${p.id}" id="policy-tab-${p.id}" aria-controls="policy-content" aria-selected="${p.id===state.policy}" tabindex="${p.id===state.policy?0:-1}"><strong>${esc(p.bill.split(' (')[0])}</strong><span>${p.topic==='organics'?'Organics & food recovery':p.topic==='packaging'?'Packaging responsibility':'Textile responsibility'}</span><small>${esc(p.statusLabel)}</small></button>`).join('');
  $('#policy-content').setAttribute('aria-labelledby',`policy-tab-${policy.id}`);
  $('#policy-content').innerHTML=`<div><p class="eyebrow">${esc(policy.bill)} · ${esc(policy.statusLabel)}</p><h3>${esc(policy.title)}</h3><p class="policy-summary">${esc(policy.summary)}</p><div class="policy-role"><h4>Solana Center’s documented role</h4><p>${esc(policy.solanaRole)}</p></div><p class="policy-who"><strong>Who is responsible?</strong> ${esc(policy.who)}</p><div class="policy-sources">${policy.sources.slice(0,3).map(s=>link(s.url,s.title.replace(/^CalRecycle: /,'').replace(/^California Legislature: /,''))).join('')}</div><button class="quiet-link all-policy-sources" data-policy-sources="${policy.id}">All evidence for this policy ↗</button></div><div><ol class="policy-milestones">${policy.milestones.map(m=>`<li class="${milestoneState(m.date,m.kind)==='Upcoming'?'upcoming':''}"><span class="milestone-date">${esc(formatDate(m.date))} · ${esc(m.kind)}</span><strong>${esc(m.label)}</strong><p>${esc(m.detail)}</p></li>`).join('')}</ol><div class="policy-actions"><h4>Starting points for ${esc(AUDIENCES[state.audience].label.toLowerCase())}</h4><ul>${(policy.actions[state.audience]||[]).map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div></div><p class="policy-caveat">${esc(policy.caveat)}</p>`;
}
function jumpPolicy(id){state.policy=id;renderPolicy();$('#policy').scrollIntoView({behavior:'smooth'});}
function showPolicySources(id){const policy=state.policies.find(p=>p.id===id);if(!policy)return;openDetail(`<p class="eyebrow">STATE POLICY · PRIMARY SOURCES</p><h2>${esc(policy.bill)}</h2><p class="detail-summary">${esc(policy.summary)}</p><div class="detail-status">${esc(policy.caveat)}</div><div class="detail-sources">${sourceLinks(policy.sources)}<p>Checked ${policy.checkedAt}. These links support the specific policy statements shown on this site.</p></div>`);}
function showFunding(){
  const funding=state.story?.funding;if(!funding)return;
  openDetail(`<img class="detail-hero-image funding-photo" src="./assets/funding.png" alt="Solana Center's state funding presentation"><p class="eyebrow">${esc(funding.title)} · ${esc(funding.budgetYear)} STATE BUDGET</p><div class="funding-big">$${(funding.amount/1000000).toFixed(0)} million</div><h2>Investing in what comes next.</h2><p class="detail-summary">${esc(funding.summary)}</p><p class="funding-meta">${esc(funding.status)}<br>Signed ${formatDate(funding.enactedAt)} · Presented ${formatDate(funding.presentedAt)}</p><div class="detail-section"><h3>The enacted allocation</h3><p>${esc(funding.appropriation)}</p><p style="margin-top:9px">${esc(funding.purpose)}</p></div><div class="funding-initiatives">${(funding.initiatives||[]).map(i=>`<article><span>PLANNED AREA OF WORK</span><h3>${esc(i.title)}</h3><p>${esc(i.summary)}</p></article>`).join('')}</div><div class="detail-status">${esc(funding.limits)}</div><div class="detail-sources">${sourceLinks(funding.sources)}<p>AB 113 session: ${esc(funding.billSession)}. The chaptered text mirror is labeled because direct LegInfo access was unavailable during research.</p></div>`);
}
function renderStory(){
  if(!state.story)return;
  $('#funding-summary').textContent=`${state.story.funding.bill} allocates $1 million for waste diversion and environmental innovation. Explore the planned work and the enacted funding.`;
  $('#impact-stats').innerHTML=state.story.impact.map(item=>`<article class="impact-stat"><strong>${esc(item.value)}</strong><span>${esc(item.label)}</span><small>Reported by Solana Center · ${esc(item.period)}</small>${link(item.sourceUrl,'Impact report')}</article>`).join('');
  const history=state.historyExpanded?state.story.history:state.story.history.filter((_,i)=>[0,2,4,6].includes(i));
  $('#history-timeline').innerHTML=history.map(item=>`<article class="history-step"><span>${esc(item.year)}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p>${link(item.sourceUrl,'Source')}</article>`).join('');
  $('#history-more').hidden=state.story.history.length<=4;$('#history-more').textContent=state.historyExpanded?'Show timeline highlights ↑':'See the full timeline ↓';
}
function showInfluence(){
  if(!state.story)return toast(document.body.dataset.ready==='false'?'Source records are unavailable. Refresh to retry.':'Source records are still loading.');
  openDetail(`<p class="eyebrow">FROM LOCAL EXPERIENCE TO PUBLIC CHANGE</p><h2>A voice grounded<br>in practical work.</h2><p class="detail-summary">Solana Center’s published record includes advocacy, contracted implementation, and regional knowledge-sharing. These are different forms of influence.</p>${state.story.influence.map(item=>`<article class="influence-item"><small>${esc(item.evidenceType)}</small><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p>${link(item.sourceUrl,item.sourceTitle)}${(item.additionalSources||[]).map(s=>link(s.url,s.title)).join('')}</article>`).join('')}<p class="small-note">These sources do not establish authorship of SB 1383, SB 54, or SB 707, or formal producer responsibility organization duties.</p>`);
}
function toggleSave(id){
  const program=state.programs.find(p=>p.id===id);if(!program)return;
  const active=document.activeElement;
  const focusScope=active?.closest('#audience-panel')?'#audience-panel':active?.closest('#program-grid')?'#program-grid':null;
  if(state.saved.has(id)){state.saved.delete(id);toast('Removed from your next steps.');}else{state.saved.add(id);toast('Saved to your next steps.');}
  renderAudience();renderPrograms();updatePlan();persistPlan();
  if(focusScope)$(`${focusScope} [data-save="${id}"]`)?.focus({preventScroll:true});
  const detailButton=$('#detail-dialog .detail-save');if(detailButton){const saved=state.saved.has(detailButton.dataset.save);detailButton.setAttribute('aria-pressed',String(saved));detailButton.textContent=saved?'Saved to your next steps ✓':'Save to your next steps +';}
}
function persistPlan(){try{sessionStorage.setItem('solana-next-steps',JSON.stringify({ids:[...state.saved],audience:state.audience}));}catch{/* Saving and downloads still work when browser storage is unavailable. */}}
function restorePlan(){
  try{const stored=JSON.parse(sessionStorage.getItem('solana-next-steps')||'null');if(!stored)return;
    state.saved=new Set((Array.isArray(stored.ids)?stored.ids:[]).filter(id=>state.programs.some(p=>p.id===id)));
    if(AUDIENCES[stored.audience])setAudience(stored.audience);
  }catch{/* Ignore corrupt or unavailable tab storage. */}
}
function updatePlan(){
  $$('.plan-count').forEach(el=>el.textContent=state.saved.size);$('#plan-float').hidden=state.saved.size===0;
  const selected=[...state.saved].map(id=>state.programs.find(p=>p.id===id)).filter(Boolean);
  $('#plan-list').innerHTML=selected.length?selected.map((program,i)=>`<article class="plan-item"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(program.title)}</h3><p>${esc(program.nextStep)}</p>${link(program.ctaUrl,'Official program & access')}</div><button data-remove-plan="${esc(program.id)}" aria-label="Remove ${esc(program.title)} from next steps">×</button></article>`).join(''):'<div class="plan-empty"><h3>Start with one useful step.</h3><p>Use the + button on a program to add it here. Choose the ideas that fit your community or your work.</p><button class="button button-outline" id="plan-browse">Explore programs ↗</button></div>';
  $('#download-plan').disabled=!selected.length;$('#clear-plan').disabled=!selected.length;
  $('#plan-browse')?.addEventListener('click',()=>{$('#plan-dialog').close();$('#programs').scrollIntoView({behavior:'smooth'});});
}
function downloadPlan(){
  if(!state.saved.size)return;
  const text=buildPlan(state.programs,state.saved,state.audience),url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='solana-center-my-next-steps.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your next steps downloaded with sources.');
}
function showSources(){
  if(!state.story)return toast(document.body.dataset.ready==='false'?'Source records are unavailable. Refresh to retry.':'Source records are still loading.');
  const funding=state.story.funding;
  const groups=[
    {title:'Programs and access',sources:uniqueSources(state.programs.flatMap(programSources))},
    {title:'Policy and implementation',sources:uniqueSources(state.policies.flatMap(p=>p.sources))},
    {title:'State funding',sources:funding.sources},
    {title:'Giving, nonprofit funding, and brand message',sources:[{title:'Solana Center — official giving options (checked November 8, 2026)',url:'https://www.solanacenter.org/donate'},{title:'Solana Society — recurring giving',url:'https://secure.solanacenter.org/forms/solana-society-2627?campaignId=3486'},{title:'Donor-advised funds',url:'https://www.solanacenter.org/daf-pay'},{title:'Corporate and program sponsorship',url:'https://www.solanacenter.org/sponsorship'},{title:'Financial information and funding sources',url:'https://www.solanacenter.org/financial-information'},{title:'Our impact — making the possible practical',url:'https://www.solanacenter.org/impact'}]},
    {title:'History, outcomes, and influence',sources:uniqueSources([...state.story.history,...state.story.impact,...state.story.influence].flatMap(item=>[{url:item.sourceUrl,title:item.sourceTitle},...(item.additionalSources||[])]))}
  ];
  $('#sources-content').innerHTML=`<div class="source-method"><p><strong>Current and planned are separate.</strong> Program pages describe published offerings, with conditions shown in each detail. The state award names planned areas of work. A policy deadline is not evidence of a service launch or a target being met.</p><p><strong>How dates were handled.</strong> Current service changes use Solana Center’s November 2026 contact update. Impact figures use the 2025–2026 PDF cover, even though the website’s impact-page label is older. The figures are self-reported outputs.</p><p><strong>Funding verification.</strong> ${esc(funding.appropriation)} The $1 million recipient allocation is supported by the award announcements and chaptered text. An LAO summary groups a larger $3 million item; the statute splits it between two recipients. LegiScan is clearly labeled as a mirror.</p><p><strong>Scope.</strong> A selected overview, not a complete archive or a live compliance service. Solana Center’s education and advocacy are documented separately from government authority and PRO duties. This concept does not submit inquiries, enrollments, donations, or plans.</p></div>${groups.map(group=>`<section class="sources-group"><h3>${group.title}</h3>${group.sources.map(s=>`<article class="source-entry">${link(s.url,s.title)}</article>`).join('')}</section>`).join('')}<section class="sources-group"><h3>Reported outcomes</h3>${state.story.impact.map(item=>`<article class="source-entry"><strong>${esc(item.value)} ${esc(item.label)}</strong><p>${esc(item.period)} · ${esc(item.note)}</p>${link(item.sourceUrl,item.sourceTitle)}</article>`).join('')}</section><section class="sources-group"><h3>Brand and image credits</h3><p class="asset-credit">Solana Center logo and program photos come from its official website. This website concept uses its navy (#173347), gold (#f6b331), and Open Sans type. Ownership remains with the relevant rights holders.</p>${uniqueSources(state.assets.map(asset=>({url:asset.url,title:asset.alt||asset.file}))).map(s=>`<article class="source-entry">${link(s.url,s.title)}</article>`).join('')}<p class="asset-credit">Program and policy checks: November 7, 2026. Giving and brand-message checks: November 8, 2026. ${['localhost','127.0.0.1'].includes(location.hostname)?'The previous <a href="http://localhost:4173" target="_blank" rel="noopener noreferrer">regional resource atlas ↗</a> is a separate local research tool; its facility and SANDAG records do not imply Solana Center partnerships.':'Regional facility and SANDAG research does not establish Solana Center partnerships.'}</p></section>`;
  $('#sources-dialog').showModal();
}
function keyboardTabs(event, selector, choose){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=$$(selector),index=tabs.indexOf(event.target);if(index<0)return;
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  choose(tabs[next]);
}
function wire(){
  $$('[data-icon]').forEach(el=>el.innerHTML=`<svg viewBox="0 0 33 33" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[el.dataset.icon]}"/></svg>`);
  $$('.audience-tabs button').forEach(button=>button.addEventListener('click',()=>setAudience(button.dataset.audience)));
  $('.audience-tabs').addEventListener('keydown',event=>keyboardTabs(event,'.audience-tabs button',button=>{setAudience(button.dataset.audience);button.focus();}));
  $('#policy-tabs').addEventListener('keydown',event=>keyboardTabs(event,'#policy-tabs button',button=>{const id=button.dataset.policy;state.policy=id;renderPolicy();$(`#policy-tab-${id}`).focus();}));
  document.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.program)showProgram(target.dataset.program);
    if(target.dataset.save)toggleSave(target.dataset.save);
    if(target.dataset.removePlan)toggleSave(target.dataset.removePlan);
    if(target.dataset.initiative){state.initiative=target.dataset.initiative;renderInitiative();$(`[data-initiative="${state.initiative}"]`).focus({preventScroll:true});}
    if(target.dataset.theme){state.theme=target.dataset.theme;state.expanded=false;renderPrograms();$(`[data-theme="${state.theme}"]`).focus({preventScroll:true});}
    if(target.dataset.policy){state.policy=target.dataset.policy;renderPolicy();$(`#policy-tab-${state.policy}`).focus({preventScroll:true});}
    if(target.dataset.policyJump)jumpPolicy(target.dataset.policyJump);
    if(target.dataset.policySources)showPolicySources(target.dataset.policySources);
    if(target.hasAttribute('data-open-plan')){updatePlan();$('#plan-dialog').showModal();}
  });
  $('#program-search').addEventListener('input',event=>{state.query=event.target.value;state.expanded=false;renderPrograms();});
  $('#program-audience').addEventListener('change',event=>{state.programAudience=event.target.value;state.expanded=false;renderPrograms();});
  $('#reset-programs').addEventListener('click',()=>{state.programAudience='all';state.theme='all';state.query='';state.expanded=false;$('#program-search').value='';$('#program-audience').value='all';renderPrograms();});
  $('#show-more').addEventListener('click',()=>{state.expanded=!state.expanded;renderPrograms();});
  $('#history-more').addEventListener('click',()=>{state.historyExpanded=!state.historyExpanded;renderStory();});
  $('#funding-button').addEventListener('click',showFunding);$('#influence-button').addEventListener('click',showInfluence);$('#sources-button').addEventListener('click',showSources);
  $('#download-plan').addEventListener('click',downloadPlan);$('#clear-plan').addEventListener('click',()=>{state.saved.clear();renderAudience();renderPrograms();updatePlan();persistPlan();toast('Your list is clear.');});
  $('#menu-button').addEventListener('click',()=>{const open=$('#mobile-nav').hidden;$('#mobile-nav').hidden=!open;$('#menu-button').setAttribute('aria-expanded',String(open));$('#menu-button').setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{$('#mobile-nav').hidden=true;$('#menu-button').setAttribute('aria-expanded','false');$('#menu-button').setAttribute('aria-label','Open navigation');}));
  $$('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});});
}
async function init(){
  wire();
  try {
    const [programs,policies,story,assets]=await Promise.all(['programs','policies','story','assets'].map(async name=>{const response=await fetch(`./data/${name}.json`);if(!response.ok)throw Error('A source file could not load. Refresh the page to retry.');return response.json();}));
    state.programs=programs;state.policies=policies;state.story=story;state.assets=assets;restorePlan();
    renderAudience();renderInitiative();renderPrograms();renderPolicy();renderStory();updatePlan();document.body.dataset.ready='true';
  }catch(error){$('#load-error').textContent=`The researched content could not load. ${error.message}`;$('#load-error').hidden=false;document.body.dataset.ready='false';$$('.loading-state').forEach(el=>el.textContent='Source content is unavailable. Refresh the page to retry.');}
}
init();
