const CG="https://api.coingecko.com/api/v3";
const BASE=["bitcoin","ethereum","solana","litecoin","zora"];
const BIN={bitcoin:"BTCEUR",ethereum:"ETHEUR",solana:"SOLEUR",litecoin:"LTCEUR"};
let liste=JSON.parse(localStorage.getItem("liste")||"null")||BASE.slice();
let data={},sel="bitcoin",jours=1;
const $=id=>document.getElementById(id);
const eur=v=>v==null?"—":v.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:v<1?6:2});
function etat(t,e){$("etat").textContent=t;$("etat").className=e?"err":""}
async function get(u){const r=await fetch(u);if(r.status===429)throw new Error("Trop de demandes, on réessaie bientôt");if(!r.ok)throw new Error("Erreur "+r.status);return r.json()}
function carte(c){const p=c.price_change_percentage_24h,d=document.createElement("div");d.className="c";
d.innerHTML=`<div><button class="star">${liste.includes(c.id)?"★":"☆"}</button><b>${(c.symbol||"").toUpperCase()}</b> ${c.name||""}</div><div class="prix">${eur(c.current_price)}<br><span class="${p>=0?"up":"down"}">${p==null?"":(p>=0?"▲ +":"▼ ")+p.toFixed(2)+" %"}</span></div>`;
d.querySelector(".star").onclick=e=>{e.stopPropagation();basculer(c.id)};d.onclick=()=>choisir(c.id,c.name);return d}
function basculer(id){liste=liste.includes(id)?liste.filter(x=>x!==id):[...liste,id];localStorage.setItem("liste",JSON.stringify(liste));maj()}
async function maj(){try{
 const top=await get(`${CG}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20`);top.forEach(c=>data[c.id]=c);
 const manq=liste.filter(i=>!data[i]||!top.find(t=>t.id===i));
 if(manq.length){(await get(`${CG}/coins/markets?vs_currency=eur&ids=${manq.join(",")}`)).forEach(c=>data[c.id]=c)}
 $("top").replaceChildren(...top.map(carte));
 etat("Mis à jour à "+new Date().toLocaleTimeString("fr-FR"));
}catch(e){etat("⚠ CoinGecko : "+e.message+" — prix Binance utilisés",true);await secours()}
 $("liste").replaceChildren(...liste.map(i=>data[i]||{id:i,name:i}).map(carte));}
async function graph(){try{const d=await get(`${CG}/coins/${sel}/market_chart?vs_currency=eur&days=${jours}`);dessine(d.prices.map(p=>p[1]))}
catch(e){try{const s=SECOURS[sel];if(!s)throw e;const iv={1:"15m",7:"2h",30:"8h",365:"3d"}[jours];
 const k=await get(`${BV}/klines?symbol=${s[0]}EUR&interval=${iv}&limit=120`);dessine(k.map(x=>+x[4]))}catch(_){etat("⚠ Graphique indisponible, nouvel essai bientôt",true)}}}
function dessine(v){const cv=$("canvas"),r=devicePixelRatio||1,W=cv.clientWidth*r,H=cv.clientHeight*r;cv.width=W;cv.height=H;
const x=cv.getContext("2d"),mn=Math.min(...v),mx=Math.max(...v),up=v[v.length-1]>=v[0];
x.strokeStyle=up?"#3f6":"#f55";x.lineWidth=3*r;x.beginPath();
v.forEach((p,i)=>{const X=i/(v.length-1)*W,Y=H-10*r-(p-mn)/(mx-mn||1)*(H-50*r);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();
x.fillStyle="#fff";x.font=`${18*r}px monospace`;x.fillText("max "+eur(mx),5,22*r);x.fillText("min "+eur(mn),5,H-14*r)}
function choisir(id,nom){sel=id;$("titreGraph").textContent=nom||id;graph();scrollTo({top:$("graph").offsetTop-10,behavior:"smooth"})}
document.querySelectorAll(".periodes button").forEach(b=>b.onclick=()=>{jours=+b.dataset.j;document.querySelectorAll(".periodes button").forEach(o=>o.classList.toggle("on",o===b));graph()});
document.querySelector('[data-j="1"]').classList.add("on");
const norm=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
let t,num=0;
function montre(list,msg){const r=$("resultats");if(msg){const d=document.createElement("div");d.className="msg";d.textContent=msg;r.replaceChildren(d,...list.map(carte))}else r.replaceChildren(...list.map(carte))}
async function chercher(){const q=norm($("recherche").value),n=++num;if(!q){$("resultats").replaceChildren();return}
 if(!Object.keys(data).length)await secours();
 const loc=Object.values(data).filter(c=>norm(c.name).includes(q)||norm(c.symbol).includes(q)||norm(c.id).includes(q))
  .sort((a,b)=>(norm(b.symbol)===q)-(norm(a.symbol)===q)||(a.market_cap_rank||9999)-(b.market_cap_rank||9999)).slice(0,8);
 montre(loc,loc.length?"":"Recherche en cours…");
 try{const r=await get(`${CG}/search?query=${encodeURIComponent(q)}`);if(n!==num)return;
  const ids=r.coins.slice(0,8).map(c=>c.id).filter(id=>!loc.find(c=>c.id===id));
  if(ids.length){(await get(`${CG}/coins/markets?vs_currency=eur&ids=${ids.join(",")}`)).forEach(c=>data[c.id]=c)}
  if(n!==num)return;const all=[...loc,...ids.map(i=>data[i]).filter(Boolean)].slice(0,10);
  montre(all,all.length?"":"Aucun résultat pour « "+$("recherche").value+" »");
 }catch(e){if(n!==num)return;montre(loc,loc.length?"":(e.message.startsWith("Trop")?"Recherche en ligne saturée, réessaie dans 1 minute":"Aucun résultat"))}}
$("recherche").oninput=()=>{clearTimeout(t);t=setTimeout(chercher,400)};
$("form").onsubmit=e=>{e.preventDefault();clearTimeout(t);$("recherche").blur();chercher()};
const BV="https://data-api.binance.vision/api/v3";
const SECOURS={bitcoin:["BTC","Bitcoin"],ethereum:["ETH","Ethereum"],solana:["SOL","Solana"],litecoin:["LTC","Litecoin"],ripple:["XRP","XRP"],binancecoin:["BNB","BNB"],dogecoin:["DOGE","Dogecoin"],cardano:["ADA","Cardano"],tron:["TRX","TRON"],chainlink:["LINK","Chainlink"],"avalanche-2":["AVAX","Avalanche"]};
async function secours(){try{const ids=Object.keys(SECOURS);
 const r=await get(`${BV}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(ids.map(k=>SECOURS[k][0]+"EUR")))}`);
 r.forEach(t=>{const id=ids.find(k=>SECOURS[k][0]+"EUR"===t.symbol);data[id]=Object.assign(data[id]||{},{id,symbol:SECOURS[id][0],name:SECOURS[id][1],current_price:+t.lastPrice,price_change_percentage_24h:+t.priceChangePercent})});
 if(!$("top").children.length)$("top").replaceChildren(...Object.values(data).filter(c=>c.current_price!=null).map(carte));
}catch(e){etat("⚠ Prix indisponibles, nouvel essai dans 1 minute",true)}}
// Binance temps réel
try{const ws=new WebSocket("wss://data-stream.binance.vision/stream?streams="+Object.values(BIN).map(s=>s.toLowerCase()+"@miniTicker").join("/"));
ws.onmessage=m=>{const d=JSON.parse(m.data).data,id=Object.keys(BIN).find(k=>BIN[k]===d.s);if(!id||!data[id])return;
data[id].current_price=+d.c;data[id].price_change_percentage_24h=(d.c-d.o)/d.o*100};
setInterval(()=>{$("liste").replaceChildren(...liste.map(i=>data[i]||{id:i,name:i}).map(carte))},3000)}catch(e){}
maj();graph();setInterval(maj,60000);setInterval(graph,300000);
