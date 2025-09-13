/* app.js 修正版: 日付を dd<br>(曜) に統合、曜日列削除対応 */

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const key = 'core_sim_v3_x'; // キャッシュ用キーは適宜変更

function fmt(n){
  if(!isFinite(n)) return '0';
  return new Intl.NumberFormat('ja-JP',{minimumFractionDigits:0, maximumFractionDigits:0})
    .format(Math.round(n));
}
function getParams(){
  const ym = $('#ym').value || new Date().toISOString().slice(0,7);
  const monthlyTarget = Math.max(0, Math.round(+($('#monthlyTarget').value||0)));
  const setupDays = Math.min(2, Math.max(0, +($('#setupDays').value||0)));
  let invDays = +($('#invDays').value||0);
  invDays = Math.min(1.0, Math.max(0.0, Math.round(invDays*10)/10));
  const workdays = getSelectedWeekdays();
  return {ym, monthlyTarget, setupDays, invDays, workdays};
}
function getSelectedWeekdays(){ return $$('#wdbar button').filter(b=>b.classList.contains('on')).map(b=>+b.dataset.wd); }
function setSelectedWeekdays(arr){ $$('#wdbar button').forEach(b=> b.classList.toggle('on', arr.includes(+b.dataset.wd)) ); }

function save(){
  const p = getParams();
  p.sDays = $$('#tbl tbody tr').filter(tr=>tr.dataset.s==='1').map(tr=>+tr.dataset.d);
  p.hDays = $$('#tbl tbody tr').filter(tr=>tr.dataset.h==='1').map(tr=>+tr.dataset.d);
  localStorage.setItem(key, JSON.stringify(p));
  alert('保存しました');
}
function load(){
  const v = localStorage.getItem(key);
  if(!v){ alert('保存データがありません'); return; }
  const p = JSON.parse(v);
  $('#ym').value = p.ym; $('#monthlyTarget').value = p.monthlyTarget;
  $('#setupDays').value = p.setupDays; $('#invDays').value = p.invDays ?? 0;
  setSelectedWeekdays(p.workdays||[1,2,3,4,5]);
  buildTable();
  if(Array.isArray(p.hDays)) p.hDays.forEach(d=>toggleHoliday(d, true));
  if(Array.isArray(p.sDays)) p.sDays.forEach(d=>toggleS(d, true));
  alert('読込みました');
}
function clearSaved(){ localStorage.removeItem(key); alert('初期化しました'); }

function weekdayJP(y,m,d){ return ['日','月','火','水','木','金','土'][new Date(y,m-1,d).getDay()]; }
function getLastDay(y,m){ return new Date(y,m,0).getDate(); }

function bindWeekdayBar(){
  $$('#wdbar button').forEach(btn=> btn.addEventListener('click', ()=>{ btn.classList.toggle('on'); sim(); }) );
  $('#preset-weekdays').addEventListener('click', ()=>{ setSelectedWeekdays([1,2,3,4,5]); sim(); });
  $('#preset-all').addEventListener('click', ()=>{ setSelectedWeekdays([0,1,2,3,4,5,6]); sim(); });
  $('#preset-none').addEventListener('click', ()=>{ setSelectedWeekdays([]); sim(); });
}

function buildTable(){
  const {ym} = getParams();
  const [y,m] = ym.split('-').map(n=>+n);
  const last = getLastDay(y,m);
  const tbody = document.querySelector('#tbl tbody');
  tbody.innerHTML='';
  for(let d=1; d<=last; d++){
    const wdNum = new Date(y,m-1,d).getDay();
    const wd = weekdayJP(y,m,d);
    const tr = document.createElement('tr');
    tr.dataset.d = d; tr.dataset.h='0'; tr.dataset.s='0';
    tr.innerHTML = `
      <td class="${wdNum===6?'sat':''} ${wdNum===0?'sun':''}">
        ${String(d).padStart(2,'0')}<br>(${wd})
      </td>
      <td class="tcell"><input type="checkbox" class="h"></td>
      <td class="tcell"><input type="checkbox" class="s"></td>
      <td>0</td><td>0</td><td>0</td><td>0</td><td></td>`;
    tbody.appendChild(tr);
  }
  bindRowEvents();
  sim();
}
function bindRowEvents(){
  $$('#tbl tbody .h').forEach(cb=> cb.addEventListener('change', e=>{
    const d=+e.target.closest('tr').dataset.d;
    toggleHoliday(d, e.target.checked); sim();
  }));
  $$('#tbl tbody .s').forEach(cb=> cb.addEventListener('change', e=>{
    const d=+e.target.closest('tr').dataset.d;
    toggleS(d, e.target.checked); normalizeS(); sim();
  }));
}
function toggleHoliday(d, on){
  const tr = document.querySelector(`tbody tr[data-d="${d}"]`);
  tr.dataset.h = on ? '1' : '0'; tr.classList.toggle('holiday', !!on);
  if(on){ tr.dataset.s='0'; tr.querySelector('.s').checked=false; tr.classList.remove('shighlight','setup'); }
}
function toggleS(d, on){
  const tr = document.querySelector(`tbody tr[data-d="${d}"]`);
  if(tr.dataset.h==='1') return;
  tr.dataset.s = on ? '1' : '0'; tr.classList.toggle('shighlight', !!on);
}
function normalizeS(){
  const rows = $$('#tbl tbody tr');
  const sDays = rows.filter(tr=>tr.dataset.s==='1').map(tr=>+tr.dataset.d);
  if(sDays.length===0){ rows.forEach(tr=>tr.classList.remove('setup')); return; }
  const minD = Math.min(...sDays), maxD = Math.max(...sDays);
  for(let d=minD; d<=maxD; d++){
    const tr = document.querySelector(`tbody tr[data-d="${d}"]`);
    if(tr && tr.dataset.h!=='1'){
      tr.dataset.s='1'; tr.querySelector('.s').checked=true; tr.classList.add('shighlight');
    }
  }
}

function isWork(y,m,d, workdays){
  const wd = new Date(y,m-1,d).getDay();
  const tr = document.querySelector(`tbody tr[data-d="${d}"]`);
  const userHoliday = tr.dataset.h==='1';
  return workdays.includes(wd) && !userHoliday;
}
function findPrevWorkday(y,m,startD, workdays){
  for(let d=startD-1; d>=1; d--){ if(isWork(y,m,d,workdays)) return d; } return null;
}
function findNextWorkday(y,m,startD, last, workdays){
  for(let d=startD+1; d<=last; d++){ if(isWork(y,m,d,workdays)) return d; } return null;
}

function sim(){
  const {ym, monthlyTarget, setupDays, invDays, workdays} = getParams();
  const [y,m] = ym.split('-').map(n=>+n);
  const last = getLastDay(y,m);
  const rows = $$('#tbl tbody tr');
  rows.forEach(tr=> tr.classList.remove('setup') );

  // S block
  const sDays = rows.filter(tr=>tr.dataset.s==='1').map(tr=>+tr.dataset.d);
  let sStart = null, sEnd = null;
  if(sDays.length>0){ sStart = Math.min(...sDays); sEnd = Math.max(...sDays); }

  // Setup days
  let setupBefore = null, setupAfter = null;
  if(sStart && setupDays>0) setupBefore = findPrevWorkday(y,m,sStart, workdays);
  if(sEnd && setupDays>1)   setupAfter  = findNextWorkday(y,m,sEnd, last, workdays);
  if(setupBefore){ document.querySelector(`tbody tr[data-d="${setupBefore}"]`)?.classList.add('setup'); }
  if(setupAfter ){ document.querySelector(`tbody tr[data-d="${setupAfter}"]`)?.classList.add('setup'); }

  // First working day for inventory
  let firstWork = null;
  for(let d=1; d<=last; d++){ if(isWork(y,m,d,workdays)){ firstWork=d; break; } }
  const invFactor = Math.max(0, 1 - invDays);

  // Weighted slots
  let slots = [];
  for(let d=1; d<=last; d++){
    const work = isWork(y,m,d, workdays);
    if(!work) continue;

    // 機2
    let w2 = 1.0;
    if(firstWork && d===firstWork){ w2 *= invFactor; }
    slots.push({d, key:'m2', weight:w2});

    // 機1
    const isSday = (sStart && sEnd && d>=sStart && d<=sEnd && document.querySelector(`tbody tr[data-d="${d}"]`).dataset.s==='1');
    const blocked = (setupBefore && d===setupBefore) || (setupAfter && d===setupAfter) || isSday;
    if(!blocked){
      let w1 = 1.0;
      if(firstWork && d===firstWork && !isSday){ w1 *= invFactor; }
      slots.push({d, key:'m1', weight:w1});
    }
  }

  const totalWeight = slots.reduce((a,s)=>a+s.weight,0);
  let perWeight = totalWeight>0 ? monthlyTarget / totalWeight : 0;

  let dayAlloc = {};
  let residual = 0, producedTotal = 0;
  for(const s of slots){
    const raw = s.weight * perWeight;
    let integer = Math.floor(raw + residual);
    residual = (raw + residual) - integer;
    producedTotal += integer;
    if(!dayAlloc[s.d]) dayAlloc[s.d] = {m1:0, m2:0};
    dayAlloc[s.d][s.key] += integer;
  }
  let deficit = monthlyTarget - producedTotal;
  if(deficit>0){
    const sorted = [...slots].sort((a,b)=>b.weight-a.weight);
    for(const s of sorted){
      if(deficit<=0) break;
      dayAlloc[s.d][s.key] += 1; deficit -= 1;
    }
  }

  // Render (col index: 0 date,1 holiday,2 S,3 m1,4 m2,5 sum,6 cum,7 note)
  let total = 0, cum = 0;
  for(let d=1; d<=last; d++){
    const tr = document.querySelector(`tbody tr[data-d="${d}"]`);
    const work = isWork(y,m,d, workdays);
    const isSetup = work && ((setupBefore && d===setupBefore) || (setupAfter && d===setupAfter));
    const isS = work && (sStart && sEnd && d>=sStart && d<=sEnd && tr.dataset.s==='1');

    let m1=0, m2=0, note='';
    if(work){
      m2 = (dayAlloc[d]?.m2)||0;
      if(isSetup) note = '機1 段替え';
      else if(isS) note = '機1 S生産';
      else m1 = (dayAlloc[d]?.m1)||0;

      if(firstWork && d===firstWork && invDays>0){
        const text = `棚卸 ${invDays.toFixed(1)}日`;
        note = note ? `${note} / ${text}` : text;
      }
    }else{
      note = '非稼働日';
    }

    const daySum = m1+m2; total += daySum; cum += daySum;
    tr.children[3].textContent = fmt(m1);
    tr.children[4].textContent = fmt(m2);
    tr.children[5].textContent = fmt(daySum);
    tr.children[6].textContent = fmt(cum);
    tr.children[7].textContent = note;
  }

  $('#summary').innerHTML = `
    <div>月産（目標）：<b>${fmt(monthlyTarget)}</b> / 実配分合計：<b>${fmt(total)}</b></div>
  `;
  let hint = '';
  if(sDays.length>0){
    const contiguousLen = (Math.max(...sDays) - Math.min(...sDays) + 1);
    if(contiguousLen !== sDays.length) hint = 'Sは連続化しています。';
  }
  $('#hints').textContent = hint;
}

function clearS(){ $$('#tbl tbody tr').forEach(tr=>{ tr.dataset.s='0'; tr.classList.remove('shighlight','setup'); tr.querySelector('.s').checked=false; }); sim(); }
function clearH(){ $$('#tbl tbody tr').forEach(tr=>{ tr.dataset.h='0'; tr.classList.remove('holiday'); tr.querySelector('.h').checked=false; }); sim(); }

window.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  $('#ym').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  setSelectedWeekdays([1,2,3,4,5]);
  $('#run').addEventListener('click', sim);
  $('#save').addEventListener('click', save);
  $('#load').addEventListener('click', load);
  $('#clear').addEventListener('click', clearSaved);
  $('#clearS').addEventListener('click', clearS);
  $('#clearH').addEventListener('click', clearH);
  $('#ym').addEventListener('change', buildTable);
  bindWeekdayBar();
  buildTable();
});
