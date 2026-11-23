'use strict';

const views = Array.from(document.querySelectorAll('.view'));
const modules = Array.from(document.querySelectorAll('.module'));
const moduleLinks = Array.from(document.querySelectorAll('#modnav a'));
const stageLinks = Array.from(document.querySelectorAll('.navrow a'));
const filter = document.querySelector('#filter');
const searchText = modules.map(article => article.textContent.toLowerCase());

function filterModules() {
  const query = filter.value.toLowerCase().trim();
  moduleLinks.forEach((link, index) => { link.hidden = !searchText[index].includes(query); });
  document.querySelector('#no-match').hidden = moduleLinks.some(link => !link.hidden);
}

function showView(focusHeading) {
  const requested = location.hash.slice(1);
  const selected = modules.find(article => article.id === requested);
  const current = selected || requested === 'modules' ? 'modules' :
    (views.some(view => view.id === requested) ? requested : 'overview');
  for (const view of views) view.hidden = view.id !== current;
  for (const article of modules) article.hidden = article !== (selected || modules[0]);
  for (const link of stageLinks) {
    const active = link.hash === (current === 'modules' ? '#M01' : '#' + current);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const link of moduleLinks) {
    if (link.hash === '#' + (selected || modules[0]).id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (current === 'modules' && selected && moduleLinks.find(link => link.hash === '#' + selected.id).hidden) {
    filter.value = '';
    filterModules();
  }
  if (focusHeading) {
    const visible = selected || document.getElementById(current);
    const heading = visible.querySelector('h1,h2');
    heading.setAttribute('tabindex', '-1');
    heading.focus({preventScroll:true});
    if (selected && matchMedia('(max-width:680px)').matches) selected.scrollIntoView({block:'start'});
    else window.scrollTo(0,0);
  }
}
filter.addEventListener('input',filterModules);
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault(); document.querySelector('main').focus();
});
window.addEventListener('hashchange', () => showView(true));
showView(false);

const frames = [
  ['0 mm / 0°','NORMAL','未请求','帧 41 · 刚性模体位于光学参考位。六轴测量均有效，全部模拟条件满足。'],
  ['— / —','INVALID','已请求','帧 42 · 遮挡使 ROI 无效，六轴测量缺失。保留采集序号与原因，趋势留出缺口。'],
  ['— / —','INVALID','保持暂停','帧 43 · 心跳仍在，但图像序号不再前进。新鲜度检查超时，模拟端继续暂停。'],
  ['0 mm / 0°','NORMAL','已确认恢复','帧 44 起 · 本例假设模体回到参考位，重新捕获成功、稳定期满足且操作者已完成模拟确认。历史缺口保留。']
];
const frameLabels=['六轴测量','监测判断','模拟暂停'];
const buttons=Array.from(document.querySelectorAll('[data-frame]'));
function showFrame(index) {
  buttons.forEach((button,i) => button.setAttribute('aria-pressed',String(index === i)));
  const data = document.querySelector('#frame-data');
  const row = document.createElement('div'); row.className='readouts';
  frameLabels.forEach((label,i) => {
    const cell=document.createElement('div');
    const name=document.createElement('span'); name.textContent=label;
    const value=document.createElement('b'); value.textContent=frames[index][i];
    cell.append(name,value); row.append(cell);
  });
  const reason=document.createElement('p'); reason.className='frame-reason'; reason.textContent=frames[index][3];
  data.replaceChildren(row,reason);
}
buttons.forEach((button,i) => button.addEventListener('click',()=>showFrame(i)));
showFrame(0);

const canvas=document.querySelector('#cloud');
const ctx=canvas.getContext('2d');
const movement=document.querySelector('#motion');
function signed(value) { return (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value) + ' mm'; }

// Synthetic asymmetric phantom sampled in a common room frame. Both surfaces
// use the same scale; only the live surface moves along the room X axis.
function height(x,y) {
  const mound=(cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));
  return 23*mound(-13,2,30,28)+14*mound(17,4,21,21)+6*mound(-22,-16,10,11);
}
function drawSurface() {
  const value=Number(movement.value);
  document.querySelector('#delta').value=signed(value);
  document.querySelector('#inverse').value=signed(-value);
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if (!ctx || !w || !h) return;
  const dpr=Math.min(window.devicePixelRatio || 1,2);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=Math.min(w/146,h/70);
  const project=(x,y,z)=>[w*.50+s*(x*.94+y*.52),h*.71+s*(y*.47-x*.12-z*.98)];
  function stroke(a,b,color,width=1) {
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  for(let x=-60;x<=60;x+=10)stroke(project(x,-28,0),project(x,30,0),'#27454a');
  for(let y=-25;y<=30;y+=5)stroke(project(-60,y,0),project(60,y,0),'#27454a');
  for(const [dx,isLive] of [[0,false],[value,true]]) {
    for(let y=-25;y<=25;y+=1.55){
      let previous=null;
      for(let x=-48;x<=48;x+=1.6){
        if((x/49)**4+(y/26)**4>1)continue;
        const z=height(x,y);
        const point=project(x+dx,y,z);
        if(previous)stroke(previous,point,isLive?'rgba(81,221,189,.32)':'rgba(241,174,105,.29)',.65);
        previous=point;
        ctx.fillStyle=isLive?'rgba(122,244,208,.82)':'rgba(245,182,115,.74)';
        ctx.fillRect(point[0],point[1],Math.max(.85,s*.43),Math.max(.85,s*.43));
      }
    }
  }
  const axisStart=project(30,33,0),axisEnd=project(51,33,0);
  stroke(axisStart,axisEnd,'#c3dad2');
  ctx.fillStyle='#c3dad2';ctx.font='12px Consolas, monospace';ctx.fillText('+X',axisEnd[0]+3,axisEnd[1]+4);
}
movement.addEventListener('input',drawSurface);
if ('ResizeObserver' in window) new ResizeObserver(drawSurface).observe(canvas);
window.addEventListener('resize',drawSurface);
drawSurface();
