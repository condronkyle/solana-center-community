export const AUDIENCES = {
  jurisdictions: {label:'Jurisdictions',title:'Make policy work for your community.',description:'Connect public goals with practical education, food recovery support, and the people who put programs into action.',steps:['Equip staff and local businesses with clear guidance.','Build food recovery knowledge and local capacity.','Prepare residents for reuse and material recovery.'],themes:['food','organics','education']},
  businesses: {label:'Businesses',title:'Less waste. More possibility.',description:'Understand your materials, support your team, and find practical changes that fit your operation.',steps:['Start with a waste assessment and staff education.','Prevent waste and recover edible surplus food.','Explore reusable options and producer responsibilities.'],themes:['food','packaging','textiles']},
  farms: {label:'Farms & ranches',title:'Keep the value in your soil.',description:'Explore composting, manure management, and water stewardship with educators who connect environmental knowledge to everyday practice.',steps:['Understand manure, bedding, and compost options.','Build practical skills for soil and water stewardship.','Explore demonstrations and local learning opportunities.'],themes:['soil','organics','water']},
  residents: {label:'Residents',title:'Small changes. Shared progress.',description:'Learn with your neighbors, make things last longer, and bring practical climate solutions into your home.',steps:['Learn to compost and prevent food waste.','Repair, share, and reuse before buying new.','Build confidence through workshops and community events.'],themes:['organics','textiles','education']}
};
export const THEMES = {all:'All topics',food:'Food recovery',organics:'Composting',soil:'Farms & soil',textiles:'Textiles',packaging:'Packaging & reuse',water:'Water',education:'Learning & sharing'};

export function filterPrograms(programs, {audience='all',theme='all',query=''} = {}) {
  const needle = String(query).trim().toLowerCase();
  return programs.filter(p => (audience==='all'||p.audiences.includes(audience)) && (theme==='all'||p.theme===theme) && (!needle || [p.title,p.summary,...p.offerings].join(' ').toLowerCase().includes(needle)));
}
export function recommendedPrograms(programs, audience) {
  if (!AUDIENCES[audience]) return [];
  const themes = AUDIENCES[audience].themes;
  return programs.filter(p=>p.audiences.includes(audience)&&p.status==='available').sort((a,b)=>Number(themes.includes(b.theme))-Number(themes.includes(a.theme))).slice(0,3);
}
export function buildPlan(programs, ids, audience, checkedAt='2026-11-07') {
  const selected = [...new Set(ids)].map(id=>programs.find(p=>p.id===id)).filter(Boolean);
  const role = AUDIENCES[audience]?.label || 'Community';
  return ['SOLANA CENTER — MY NEXT STEPS',`Audience: ${role}`,`Source snapshot checked: ${checkedAt}`,'','This is a local planning list. It is not a booking, message, or compliance assessment.','',...selected.flatMap((p,i)=>{
    const sources=[...new Map([{title:p.sourceTitle,url:p.sourceUrl},...(p.sources||[])].map(s=>[s.url,s])).values()];
    return [`${i+1}. ${p.title}`,`Status: ${p.status}${p.statusNote ? ' — '+p.statusNote : ''}`,p.summary,`Next step: ${p.nextStep}`,`Official program: ${p.ctaUrl}`,...sources.map(s=>`Evidence — ${s.title}: ${s.url}`),''];
  }),'Check current service arrangements: https://www.solanacenter.org/contact',''].join('\n');
}
export function safeUrl(value) {
  try {const u=new URL(value); return u.protocol==='https:'||u.protocol==='http:' ? u.href : '#';} catch {return '#';}
}
export function milestoneState(date, kind, asOf='2026-11-07') {
  if (kind==='target') return 'Target';
  const normalized=String(date).match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  if (!normalized) return 'See schedule';
  const parsed=new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==normalized) return 'See schedule';
  return normalized>asOf ? 'Upcoming' : 'Date passed';
}
