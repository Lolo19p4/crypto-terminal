// Trades SIMULÉS (paper). Données de marché réelles via l'API publique DexScreener, en lecture seule.
// Aucun portefeuille, aucune clé, aucune exécution.
const AG=[["SCANNER","nouvelles paires","blue"],["RUG CHECK","détection d'arnaques","red"],["SIZER","taille de la mise","yellow"],["EXECUTOR","achat/vente · slippage 2 %","green"],["LOGGER","journal","violet"],["EQUITY","courbe du solde","blue"],["YOU","toi, tu observes","yellow"]];
const STEPS=["SCAN","RUG CHECK","MISE","EXÉC","JOURNAL"];
const DEMO=["HONKR","ZAPCAT","KAPPU","DRIFTQ","MOOSH"];
const API="https://api.dexscreener.com",POLL=45000,SLIP=0.02;
const START=50;let bal=START,cnt=0,w=0,l=0,eq=[START],t0=Date.now();
let market={},live=false,seen=new Set(),checked=new Set();
const $=id=>document.getElementById(id),f=n=>"$"+n.toFixed(2);
const fp=p=>p>=1?"$"+p.toFixed(4):"$"+p.toPrecision(4);
const fk=n=>n>=1e6?"$"+(n/1e6).toFixed(2)+"M":n>=1e3?"$"+(n/1e3).toFixed(1)+"k":"$"+n.toFixed(0);
$("agents").innerHTML=AG.map((a,i)=>`<li id="a${i}"><b class="${a[2]}">${a[0]}</b><span>${a[1]}</span></li>`).join("");
$("pipe").innerHTML=STEPS.map((s,i)=>`<div id="p${i}">${s}</div>`).join("<span>→</span>");
$("start").textContent=f(START);
const hm=()=>new Date().toTimeString().slice(0,8);
function feed(t,c){const d=document.createElement("div");d.innerHTML=`<span class="violet">${hm()}</span> <span class="${c}">${t}</span>`;$("feed").prepend(d);while($("feed").children.length>9)$("feed").lastChild.remove();}
function jr(type,tk,det,good){const c=type==="ENTRY"?"blue":type==="FILTERED"?"yellow":good?"green":"red";const tr=document.createElement("tr");tr.innerHTML=`<td>${hm()}</td><td class="${c}">${type}</td><td>$${tk}</td><td class="${c}">${det}</td>`;$("jr").prepend(tr);while($("jr").children.length>6)$("jr").lastChild.remove();}
function step(i){STEPS.forEach((_,k)=>$("p"+k).classList.toggle("on",k===i));AG.forEach((_,k)=>$("a"+k).classList.toggle("on",k===i));}
function draw(){const c=$("eq"),x=c.getContext("2d"),W=c.width,H=c.height;x.clearRect(0,0,W,H);let mn=Math.min(...eq)*.95,mx=Math.max(...eq)*1.05;x.strokeStyle="#1f2a36";for(let g=0;g<5;g++){x.beginPath();x.moveTo(0,g*H/4);x.lineTo(W,g*H/4);x.stroke();}x.strokeStyle="#39ff88";x.lineWidth=3;x.beginPath();eq.forEach((v,i)=>{const px=i*W/Math.max(eq.length-1,1),py=H-(v-mn)/(mx-mn)*H;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();}
function stats(){$("bal").textContent=f(bal);$("cnt").textContent=cnt;$("wins").textContent=w;$("losses").textContent=l;$("now").textContent=f(bal);const p=(bal/START-1)*100;$("pct").textContent=(p>=0?"+":"")+p.toFixed(1)+" %";$("pct").className=p>=0?"green":"red";draw();}
function status(t,c){$("api").textContent=t;$("api").className=c;}
const wait=ms=>new Promise(s=>setTimeout(s,ms));

// --- Données réelles DexScreener (lecture seule) ---
async function refresh(){
 try{
  const prof=await (await fetch(API+"/token-profiles/latest/v1")).json();
  const addrs=[...new Set(prof.filter(p=>p.chainId==="solana").map(p=>p.tokenAddress))].slice(0,30);
  const keep=Object.keys(market).filter(a=>!addrs.includes(a)).slice(0,30-Math.min(addrs.length,30));
  const all=[...addrs,...keep].slice(0,30);
  const r=await (await fetch(API+"/latest/dex/tokens/"+all.join(","))).json();
  const best={};
  for(const p of (r.pairs||[])){if(p.chainId!=="solana"||!p.priceUsd)continue;const a=p.baseToken.address;if(!all.includes(a))continue;
   if(!best[a]||(p.liquidity?.usd||0)>(best[a].liquidity?.usd||0))best[a]=p;}
  for(const[a,p]of Object.entries(best))market[a]={addr:a,sym:p.baseToken.symbol,price:+p.priceUsd,liq:p.liquidity?.usd||0,vol:p.volume?.h24||0,ch1:p.priceChange?.h1??0,ageH:p.pairCreatedAt?(Date.now()-p.pairCreatedAt)/36e5:null,url:p.url};
  live=Object.keys(market).length>0;status(live?`DexScreener ✓ ${Object.keys(market).length} tokens · ${hm()}`:"aucune donnée","yellow");
  if(live)status($("api").textContent,"green");
 }catch(e){status(live?"API en erreur · dernières données":"API indisponible · mode démo","red");}
}

function rug(t){const r=[];if(t.liq<10000)r.push("liquidité faible "+fk(t.liq));if(t.ageH!==null&&t.ageH<1)r.push("paire trop jeune "+Math.round(t.ageH*60)+" min");if(t.ch1<-30)r.push("chute "+t.ch1+" % en 1 h");if(t.vol<5000)r.push("volume faible "+fk(t.vol));return r;}

async function cycle(){
 if(!live){ // Repli : démo si l'API ne répond pas
  const tk=DEMO[Math.floor(Math.random()*DEMO.length)];step(0);feed(`SCAN → $${tk} (DÉMO, API indisponible)`,"yellow");await wait(3000);return;}
 const pool=Object.values(market).filter(t=>!checked.has(t.addr));
 if(!pool.length){step(0);feed("SCAN → pas de nouvelle paire, on attend DexScreener…","blue");await wait(8000);return;}
 const t=pool[Math.floor(Math.random()*pool.length)];checked.add(t.addr);
 step(0);feed(`SCAN → $${t.sym} ${fp(t.price)} · liq ${fk(t.liq)} · vol 24h ${fk(t.vol)}`,"blue");await wait(1000);
 step(1);const bad=rug(t);
 if(bad.length){feed(`RUG CHECK → $${t.sym} rejeté : ${bad.join(", ")}`,"red");jr("FILTERED",t.sym,bad[0]);await wait(800);return;}
 feed(`RUG CHECK → $${t.sym} OK (liq ${fk(t.liq)}, ${t.ageH?t.ageH.toFixed(1)+" h":"âge ?"})`,"green");await wait(1000);
 step(2);const size=+(bal*.1).toFixed(2);feed(`MISE → ${f(size)} (10 % du solde fictif)`,"yellow");await wait(1000);
 step(3);const entry=t.price*(1+SLIP);feed(`EXÉC (papier) → achat $${t.sym} à ${fp(entry)} · slippage 2 %`,"green");jr("ENTRY",t.sym,`${f(size)} @ ${fp(entry)}`);
 const end=Date.now()+POLL+5000;
 while(Date.now()<end){const cur=market[t.addr].price,pl=(cur*(1-SLIP)/entry-1)*100;
  $("tradebody").innerHTML=`<b class="yellow">$${t.sym}</b><br>entrée ${fp(entry)}<br>prix réel ${fp(cur)}<br>P&L <b class="${pl>=0?"green":"red"}">${pl>=0?"+":""}${pl.toFixed(2)} %</b><br><span class="violet" style="font-size:15px">${t.addr.slice(0,6)}…${t.addr.slice(-4)}</span>`;await wait(1000);}
 const exit=market[t.addr].price*(1-SLIP),pnl=exit/entry-1,g=size*pnl;bal+=g;cnt++;g>=0?w++:l++;eq.push(bal);
 step(4);feed(`JOURNAL → sortie $${t.sym} à ${fp(exit)} ${g>=0?"+":""}${f(g)}`,g>=0?"green":"red");jr("EXIT",t.sym,(pnl>=0?"+":"")+(pnl*100).toFixed(2)+" %",g>=0);stats();
}
setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);$("timer").textContent=[s/3600,s/60%60,s%60].map(v=>String(Math.floor(v)).padStart(2,"0")).join(":")},1000);
stats();refresh().then(()=>{setInterval(refresh,POLL);(async()=>{for(;;){await cycle();await wait(1500);}})();});
