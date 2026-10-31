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
}catch(e){etat("⚠ "+e.message+" — prix Binance en direct",true)}
 $("liste").replaceChildren(...liste.map(i=>data[i]||{id:i,name:i}).map(carte));}
async function graph(){try{const d=await get(`${CG}/coins/${sel}/market_chart?vs_currency=eur&days=${jours}`);dessine(d.prices.map(p=>p[1]))}
catch(e){etat("⚠ Graphique : "+e.message,true)}}
function dessine(v){const cv=$("canvas"),r=devicePixelRatio||1,W=cv.clientWidth*r,H=cv.clientHeight*r;cv.width=W;cv.height=H;
const x=cv.getContext("2d"),mn=Math.min(...v),mx=Math.max(...v),up=v[v.length-1]>=v[0];
x.strokeStyle=up?"#3f6":"#f55";x.lineWidth=3*r;x.beginPath();
v.forEach((p,i)=>{const X=i/(v.length-1)*W,Y=H-10*r-(p-mn)/(mx-mn||1)*(H-50*r);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();
x.fillStyle="#fff";x.font=`${18*r}px monospace`;x.fillText("max "+eur(mx),5,22*r);x.fillText("min "+eur(mn),5,H-14*r)}
function choisir(id,nom){sel=id;$("titreGraph").textContent=nom||id;graph();scrollTo({top:$("graph").offsetTop-10,behavior:"smooth"})}
document.querySelectorAll(".periodes button").forEach(b=>b.onclick=()=>{jours=+b.dataset.j;document.querySelectorAll(".periodes button").forEach(o=>o.classList.toggle("on",o===b));graph()});
document.querySelector('[data-j="1"]').classList.add("on");
let t;$("recherche").oninput=e=>{clearTimeout(t);const q=e.target.value.trim();if(!q){$("resultats").replaceChildren();return}
t=setTimeout(async()=>{try{const r=await get(`${CG}/search?query=${encodeURIComponent(q)}`);const ids=r.coins.slice(0,6).map(c=>c.id);
if(!ids.length){$("resultats").textContent="Rien trouvé";return}
const m=await get(`${CG}/coins/markets?vs_currency=eur&ids=${ids.join(",")}`);m.forEach(c=>data[c.id]=c);$("resultats").replaceChildren(...m.map(carte))}catch(e){etat("⚠ "+e.message,true)}},600)};
// Binance temps réel
try{const ws=new WebSocket("wss://stream.binance.com:9443/stream?streams="+Object.values(BIN).map(s=>s.toLowerCase()+"@miniTicker").join("/"));
ws.onmessage=m=>{const d=JSON.parse(m.data).data,id=Object.keys(BIN).find(k=>BIN[k]===d.s);if(!id||!data[id])return;
data[id].current_price=+d.c;data[id].price_change_percentage_24h=(d.c-d.o)/d.o*100};
setInterval(()=>{$("liste").replaceChildren(...liste.map(i=>data[i]||{id:i,name:i}).map(carte))},3000)}catch(e){}
maj();graph();setInterval(maj,60000);setInterval(graph,300000);
