
(function(){
"use strict";
const EVM={
ethereum:{name:"Ethereum",api:"https://eth.blockscout.com",view:"https://eth.blockscout.com",symbol:"ETH"},
base:{name:"Base",api:"https://base.blockscout.com",view:"https://base.blockscout.com",symbol:"ETH"},
polygon:{name:"Polygon",api:"https://polygon.blockscout.com",view:"https://polygonscan.com",symbol:"POL"},
arbitrum:{name:"Arbitrum",api:"https://arbitrum.blockscout.com",view:"https://arbiscan.io",symbol:"ETH"},
optimism:{name:"Optimism",api:"https://optimism.blockscout.com",view:"https://optimistic.etherscan.io",symbol:"ETH"},
bnb:{name:"BNB Chain",view:"https://bscscan.com"},
avalanche:{name:"Avalanche",view:"https://snowtrace.io"},
zora:{name:"Zora",view:"https://explorer.zora.energy"},
solana:{name:"Solana",view:"https://solscan.io"},
bitcoin:{name:"Bitcoin",view:"https://mempool.space"},
litecoin:{name:"Litecoin",view:"https://blockchair.com/litecoin"},
polkadot:{name:"Polkadot",view:"https://polkadot.subscan.io"},
aleo:{name:"Aleo",view:"https://explorer.aleo.org"}
};
const $=id=>document.getElementById(id);
const fmtInt=n=>Number(n).toLocaleString("fr-FR",{maximumFractionDigits:6});
const input=$("chainInput"),network=$("chainNetwork"),status=$("chainStatus"),summary=$("chainOverview"),results=$("chainContent");
let panels={}, active="tx", requestNumber=0,activeAddress="";
function short(v){v=String(v||"");return v.length>23?v.slice(0,12)+"…"+v.slice(-8):v}
function link(text,href){const a=document.createElement("a");a.textContent=text;a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a}
function basic(text){const el=document.createElement("div");el.className="exnote";el.textContent=text;return el}
function row(title,sub,url){const d=document.createElement("div");d.className="exrow";const left=document.createElement("div"),b=document.createElement("b"),s=document.createElement("small");b.textContent=title;s.textContent=sub||"";left.append(b,s);d.append(left);if(url)d.append(link("Ouvrir ↗",url));return d}
function appendRows(list){results.replaceChildren();if(!list||!list.length){results.append(basic("Aucune donnée affichée pour cette catégorie."));return}results.append(...list)}
function selectTab(tab){active=tab;document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));appendRows(panels[tab]||[])}
function units(raw,dec){if(raw==null)return "—";try{const v=BigInt(raw),sg=v<0n?"-":"",digits=(v<0n?-v:v).toString(),d=Math.max(0,Math.min(36,Number(dec)||0));const fill=digits.padStart(d+1,"0");const left=fill.slice(0,fill.length-d)||"0";const after=d?fill.slice(-d).replace(/0+$/,"").slice(0,8):"";return sg+left+(after?","+after:"")}catch(e){return "—"}}
function externalURL(n,q){const u=EVM[n].view; if(n==="solana")return u+"/"+(/^[0-9A-Za-z]{80,100}$/.test(q)?"tx":"account")+"/"+encodeURIComponent(q);
if(n==="bitcoin")return u+"/"+(/^[a-fA-F0-9]{64}$/.test(q)?"tx":"address")+"/"+encodeURIComponent(q);
if(n==="litecoin")return u+"/"+(/^[a-fA-F0-9]{64}$/.test(q)?"transaction":"address")+"/"+encodeURIComponent(q);
if(n==="polkadot")return u+"/account/"+encodeURIComponent(q);
if(n==="aleo")return u+"/search?q="+encodeURIComponent(q);
return u+"/"+(/^(0x[0-9a-fA-F]{64})$/.test(q)?"tx":"address")+"/"+encodeURIComponent(q)}
function external(n,q,message){status.textContent=message||"Pour ce réseau, ouvre l'explorateur officiel. Aucune donnée inventée.";summary.replaceChildren();panels={tx:[basic("Recherche ouverte dans un explorateur externe.")],tokens:[],nft:[]};selectTab("tx");const a=link("Voir sur "+EVM[n].name+" ↗",externalURL(n,q));summary.append(a)}
async function json(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),14000);try{const r=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(timer)}}
function fact(label,value){const el=document.createElement("div");el.className="fact";const small=document.createElement("small"),b=document.createElement("b");small.textContent=label;b.textContent=value;el.append(small,b);return el}
function isAddr(q){return /^0x[0-9a-fA-F]{40}$/.test(q)}function isHash(q){return /^0x[0-9a-fA-F]{64}$/.test(q)}
async function scan(){const n=network.value, conf=EVM[n],q=input.value.trim();const id=++requestNumber;if(!q){status.textContent="Saisis une adresse ou un hash pour commencer.";return}
activeAddress=q;results.replaceChildren(basic("Interrogation du réseau…"));summary.replaceChildren();status.textContent=conf.name+" • Recherche en cours • "+new Date().toLocaleTimeString("fr-FR");
if(!conf.api){external(n,q,"Explorateur externe pour "+conf.name+" : accès aux données directement sur la blockchain.");return}
if(!isAddr(q)&&!isHash(q)){status.textContent="Format invalide : adresse EVM 0x + 40 caractères, ou transaction 0x + 64 caractères.";results.replaceChildren();return}
try{
if(isHash(q)){const tx=await json(conf.api+"/api/v2/transactions/"+q);if(id!==requestNumber)return;
summary.append(fact("Réseau",conf.name),fact("Statut",tx.status||"—"),fact("Bloc",tx.block_number||"—"));
panels={tx:[row(short(tx.hash),"De "+short(tx.from&&tx.from.hash)+" vers "+short(tx.to&&tx.to.hash),externalURL(n,q))],tokens:[],nft:[]};
status.textContent="Transaction chargée • "+new Date().toLocaleTimeString("fr-FR");selectTab("tx");return}
const root=conf.api+"/api/v2/addresses/"+q;
const out=await Promise.allSettled([json(root),json(root+"/token-balances"),json(root+"/nft"),json(root+"/transactions")]);if(id!==requestNumber)return;
if(out[0].status!=="fulfilled")throw out[0].reason;
const addr=out[0].value;const ok=i=>out[i].status==="fulfilled";const tokens=ok(1)&&Array.isArray(out[1].value)?out[1].value:[];const nfts=ok(2)?out[2].value.items||[]:[];const txs=ok(3)?out[3].value.items||[]:[];
summary.append(fact("Réseau",conf.name),fact("Solde natif",units(addr.coin_balance,18)+" "+conf.symbol),fact("Transactions",String(addr.transactions_count==null?"—":addr.transactions_count)));
panels.tokens=tokens.map(t=>{const token=t.token||{},d=token.decimals||0;return row((token.symbol||token.name||"Token")+" • "+units(t.value,d),"Contrat : "+short(token.address)+" · "+(token.type||"ERC-20"),conf.view+"/address/"+encodeURIComponent(token.address||q))});
panels.nft=nfts.map(t=>{const token=t.token||{},n=t.id||t.token_id||"—";return row(token.name||"NFT "+short(token.address),"ID : "+short(n)+" · "+(token.type||"NFT"),conf.view+"/address/"+encodeURIComponent(token.address||q))});
panels.tx=txs.map(t=>row(short(t.hash),(t.timestamp||"") +" · "+(t.status||"—")+" · "+short(t.from&&t.from.hash)+" → "+short(t.to&&t.to.hash),conf.view+"/tx/"+encodeURIComponent(t.hash)));
if(!ok(1))panels.tokens=[basic("Tokens momentanément indisponibles depuis cette source.")];if(!ok(2))panels.nft=[basic("NFT momentanément indisponibles depuis cette source.")];if(!ok(3))panels.tx=[basic("Historique momentanément indisponible depuis cette source.")];
status.textContent=conf.name+" • Réponse API reçue à "+new Date().toLocaleTimeString("fr-FR")+" • Blockscout • Certaines catégories peuvent être limitées";
selectTab(active);
}catch(e){if(id!==requestNumber)return;status.textContent="Source temporairement inaccessible : "+e.message+" (aucun solde estimé).";summary.replaceChildren(link("Vérifier sur "+conf.name+" ↗",externalURL(n,q)));results.replaceChildren(basic("Les données de cette blockchain n'ont pas pu être chargées. Réessaie ou ouvre l'explorateur."))}
}
$("scan").addEventListener("click",scan);input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();scan()}});network.addEventListener("change",()=>{if(activeAddress){input.value=activeAddress;scan()}});
document.querySelectorAll(".tab-btn").forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.tab)));selectTab("tx");
const cmap={Bitcoin:"BTCEUR",Ethereum:"ETHEUR",Solana:"SOLEUR",Litecoin:"LTCEUR","Avalanche":"AVAXEUR",BTC:"BTCEUR",ETH:"ETHEUR",SOL:"SOLEUR",LTC:"LTCEUR"};
let lastKey="",drawCount=0,interval="1h",candles=[];
function painter(){const c=$("candles");if(!c||c.hidden)return;const ratio=Math.min(2,window.devicePixelRatio||1);const w=Math.max(100,c.clientWidth),h=Math.max(100,c.clientHeight);c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);const ctx=c.getContext("2d");if(!ctx)return;ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);
if(!candles.length){ctx.fillStyle="#96aac1";ctx.font="14px sans-serif";ctx.fillText("Aucune bougie disponible pour cette paire",16,40);return}
const pad={l:14,r:67,t:18,b:24},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;const lows=candles.map(a=>a[3]),highs=candles.map(a=>a[2]);let lo=Math.min(...lows),hi=Math.max(...highs),span=hi-lo||1;let y=v=>pad.t+(hi-v)/span*(ch-10);
ctx.strokeStyle="#1e354a";ctx.lineWidth=1;for(let i=0;i<=5;i++){const yy=pad.t+ch*i/5;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r+4,yy);ctx.stroke();ctx.fillStyle="#819bb2";ctx.font="11px monospace";ctx.fillText((hi-span*i/5).toLocaleString("fr-FR",{maximumFractionDigits:hi>10?2:6}),w-pad.r+8,yy+4)}
const step=cw/candles.length,bodyWidth=Math.max(2,Math.min(13,step*.67));candles.forEach((a,i)=>{const x=pad.l+step*(i+.5),up=a[4]>=a[1],top=Math.min(y(a[1]),y(a[4])),bot=Math.max(y(a[1]),y(a[4]));ctx.strokeStyle=up?"#39dca2":"#ff6e87";ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x,y(a[2]));ctx.lineTo(x,y(a[3]));ctx.stroke();ctx.fillRect(x-bodyWidth/2,top,bodyWidth,Math.max(1,bot-top))});ctx.fillStyle="#8aa2b9";ctx.font="11px sans-serif";ctx.fillText(new Date(candles[0][0]).toLocaleDateString("fr-FR"),pad.l,h-8);ctx.fillText(new Date(candles[candles.length-1][0]).toLocaleString("fr-FR"),Math.max(pad.l,w-150),h-8)}
async function loadCandles(){const name=$("titreGraph").textContent.trim(),symbol=cmap[name],activeButton=document.querySelector(".chart-switch .on");if(!activeButton||activeButton.dataset.view!=="candles")return;
const ticket=++drawCount;$("candleSource").textContent="Chargement des bougies • "+name;
if(!symbol){candles=[];painter();$("candleSource").textContent="Bougies indisponibles pour cette crypto • consulter la courbe";return}
const key=symbol+"-"+interval;lastKey=key;
try{const r=await fetch("https://data-api.binance.vision/api/v3/klines?symbol="+symbol+"&interval="+interval+"&limit=90",{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();if(ticket!==drawCount||lastKey!==key)return;if(!Array.isArray(d)||!d.length)throw Error("vide");candles=d.map(a=>[+a[0],+a[1],+a[2],+a[3],+a[4]]);painter();$("candleSource").textContent="Bougies "+symbol+" • "+interval+" • Binance • réponse "+new Date().toLocaleTimeString("fr-FR")}
catch(e){if(ticket!==drawCount)return;candles=[];painter();$("candleSource").textContent="Source de bougies indisponible ("+e.message+") • consulter la courbe"}}
function switchView(view){document.querySelectorAll(".chart-switch button").forEach(b=>b.classList.toggle("on",b.dataset.view===view));$("candles").hidden=view!=="candles";$("canvas").style.display=view==="candles"?"none":"block";$("candleSource").style.display=view==="candles"?"":"none";if(view==="candles")loadCandles();else if(typeof window.graph==="function")window.graph()}
document.querySelectorAll(".chart-switch button").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
const head=$("titreGraph");if(head)new MutationObserver(()=>{if($("candles")&&!$("candles").hidden)loadCandles()}).observe(head,{childList:true,characterData:true,subtree:true});
document.querySelectorAll(".periodes button").forEach(b=>b.addEventListener("click",()=>{interval=({1:"15m",7:"1h",30:"4h",365:"1d"})[b.dataset.j]||"1h";if(!$("candles").hidden)loadCandles()}));
window.addEventListener("resize",()=>{if(!$("candles").hidden)painter()});switchView("candles");setInterval(()=>{if(!document.hidden&&!$("candles").hidden)loadCandles()},60000);
})();
