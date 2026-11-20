/* Sol Desk MP-4 : lecture seule, simulation explicite, pas de portefeuille. */
(function () {
"use strict";
var E=window.SolDeskSix;
if (!E) return;
var bySym=Object.fromEntries(E.ASSETS.map(function(a){return [a.symbol,a]}));
var market=Object.create(null),selected="BTC",busy=false,lastRefresh=0,lastPaint=0;
var key="soldesk_mp4_paper_v1";
var $=function(id){return document.getElementById(id)};
var nf=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:6});
var money=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:2});
var paper;
try {paper=JSON.parse(localStorage.getItem(key)||"null");}
catch (e){paper=null;}
if (!paper || paper.version!==1 || !paper.positions || !Array.isArray(paper.trades)) paper=E.initialPaper(1000);
function save(){paper.trades=paper.trades.slice(0,150);try{localStorage.setItem(key,JSON.stringify(paper));}catch(e){}}
function pct(v){return Number.isFinite(v)?(v>=0?"+":"")+v.toFixed(2)+" %":"—";}
function fmt(v){return Number.isFinite(v)?(Math.abs(v)<1?v.toLocaleString("fr-FR",{maximumFractionDigits:8}):nf.format(v))+" €":"—";}
function status(t,error){$("status").textContent=t;$("status").style.color=error?"#ff9b9b":"#9caec8";}
function tag(s){return '<span class="tag '+s+'">'+({ok:"OK",non:"REFUS",attente:"INCOMPLET",attention:"PRUDENCE"}[s]||"?")+"</span>";}
function maybeDraw(){if(Date.now()-lastPaint>=1500)draw();}
function draw(){
 lastPaint=Date.now();
 var filter=$("search").value.toLowerCase().trim(), count=0,now=Date.now();
 var list=[];
 E.ASSETS.forEach(function(a){
   var r=market[a.symbol], ev=E.evaluate(a,r,now);
   if (ev.freshPrice) count++;
   if (filter && !(a.symbol+" "+a.network+" "+a.kind).toLowerCase().includes(filter))return;
   var trend=r&&r.p24h,pctcls=trend==null?"unknown":trend>=0?"gain":"loss";
   var price=r&&ev.freshPrice?fmt(r.price):"—";
   var source=r&&ev.freshPrice?r.source:"Non disponible";
   var priceAt=r&&r.priceAt&&ev.freshPrice?new Date(r.priceAt).toLocaleTimeString("fr-FR"):"";
   var score=ev.experts.filter(function(x){return x.status==="ok"}).length;
   var pos=paper.positions[a.symbol],can=ev.freshPrice&&ev.freshMarket;
   list.push('<tr data-symbol="'+a.symbol+'" class="'+(selected===a.symbol?"sel":"")+'">'+
     '<td><b>'+a.symbol+'</b> <small>'+a.network+'</small></td>'+
     '<td><b>'+price+'</b></td>'+
     '<td class="'+(r&&r.p1h>=0?"gain":"loss")+'">'+(r&&ev.freshMarket?pct(r.p1h):"—")+'</td>'+
     '<td class="'+pctcls+'">'+(r&&ev.freshMarket?pct(r.p24h):"—")+'</td>'+
     '<td>'+(r&&ev.freshMarket?money.format(r.volume||0):"—")+'</td>'+
     '<td><small>'+source+(priceAt?" · "+priceAt:"")+'</small></td>'+
     '<td>'+score+'/6 · '+tag(ev.experts[4].status)+'</td>'+
     '<td><button data-action="'+(pos?"sell":"buy")+'" data-sym="'+a.symbol+'" '+(!can?"disabled":"")+'>'+
     (pos?"Vendre (SIM)":"Acheter (SIM)")+'</button></td></tr>');
 });
 $("count").textContent=count+" / 16";
 $("equity").textContent=money.format(E.paperEquity(paper,market));
 $("cash").textContent=money.format(paper.cash);
 $("positions").textContent=Object.keys(paper.positions).length+" / 3";
 $("assets").innerHTML=list.join("");
 $("assets").querySelectorAll("tr[data-symbol]").forEach(function(tr){
   tr.addEventListener("click",function(e){
     if (e.target.closest("button"))return;
     selected=tr.dataset.symbol;draw();
   });
 });
 $("assets").querySelectorAll("button").forEach(function(b){
   b.addEventListener("click",function(){simulate(b.dataset.sym,b.dataset.action);});
 });
 showSelected();
 showPaper();
}
function showSelected(){
 var a=bySym[selected],r=market[selected],assessment=E.evaluate(a,r);
 $("selectedTitle").textContent=selected+" — analyse des six experts";
 $("selectedText").textContent=assessment.verdict+". "+(r&&assessment.freshMarket?"Variations observées, non prédictives.":"Données absentes ou périmées.");
 $("details").innerHTML=assessment.experts.map(function(e){
    return '<div class="expert"><h3>'+e.name+' '+tag(e.status)+'</h3><p>'+e.reason+'</p></div>';
 }).join("");
}
function showPaper(){
 var sym=Object.keys(paper.positions);
 $("paper").textContent=sym.length
   ?sym.map(function(s){var p=paper.positions[s],r=market[s],v=r&&E.evaluate(bySym[s],r).freshPrice?r.price:p.entry;
      return s+" : "+nf.format(p.qty)+" tokens, valeur fictive ≈ "+money.format(p.qty*v);}).join(" · ")
   :"Aucune position fictive. Cliquer « Acheter (SIM) » pour tester une transaction fictive.";
 var logs=paper.trades.slice(0,25);
 $("log").replaceChildren();
 logs.forEach(function(t){
   var div=document.createElement("div");
   div.textContent=new Date(t.at).toLocaleString("fr-FR")+" · "+t.symbol+" · "+
      (t.side==="buy"?"achat fictif "+money.format(t.amount):
       "vente fictive "+money.format(t.amount)+" / résultat net "+money.format(t.pnl))+
       " · "+t.reason;
   $("log").appendChild(div);
 });
 if(!logs.length)$("log").textContent="Aucune simulation enregistrée.";
}
function simulate(symbol,side){
 var a=bySym[symbol],r=market[symbol];
 try{
  var equity=E.paperEquity(paper,market);
  var amount=Math.round(equity*0.10*100)/100;
  var t=E.paperTrade(paper,a,r,side,side==="buy"?amount:null,market,Date.now(),
    side==="buy"?"Achat manuel (simulation)":"Vente manuelle (simulation)");
  save();draw();
  status(side==="buy"?"Achat fictif de "+money.format(t.spent)+" confirmé (aucun ordre réel).":
         "Vente fictive, résultat net "+money.format(t.pnl)+" (aucun ordre réel).");
 }catch(e){status("Simulation refusée : "+e.message,true);}
}
async function refresh(){
 if(busy)return;
 busy=true;$("refresh").disabled=true;
 var ctrl=new AbortController(),timeout=setTimeout(function(){ctrl.abort()},12000);
 try{
  var ids=E.ASSETS.map(function(a){return a.id}).join(",");
  var url="https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids="+encodeURIComponent(ids)+
    "&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d";
  var response=await fetch(url,{cache:"no-store",signal:ctrl.signal});
  if(!response.ok)throw Error("CoinGecko HTTP "+response.status);
  var result=await response.json();
  if(!Array.isArray(result))throw Error("Réponse invalide");
  var seen=new Set();
  result.forEach(function(c){
    var a=E.ASSETS.find(function(x){return x.id===c.id});
    if(!a)return;
    var row=E.normalize(c);
    if(row){market[a.symbol]=row;seen.add(a.symbol);}
  });
  lastRefresh=Date.now();
  var stops=E.checkStops(paper,bySym,market,lastRefresh);
  if(stops.length)save();
  status("CoinGecko : "+seen.size+"/16 reçus à "+new Date().toLocaleTimeString("fr-FR")+
    ". Flux WebSocket optionnel pour BTC, ETH et SOL."+(stops.length?" Stops fictifs : "+stops.length:""),seen.size!==16);
 }catch(e){
  status("Données indisponibles : "+e.message+". Les anciens cours seront marqués périmés.",true);
 }finally{clearTimeout(timeout);busy=false;$("refresh").disabled=false;draw();}
}
var ws=null,retry=0,wsEnd=false;
function connectWs(){
 if(wsEnd || typeof WebSocket==="undefined")return;
 var pairs=["btceur","etheur","soleur"];
 try{
  ws=new WebSocket("wss://data-stream.binance.vision/stream?streams="+
    pairs.map(function(p){return p+"@miniTicker";}).join("/"));
  ws.onopen=function(){retry=0;};
  ws.onmessage=function(event){
   try{
    var msg=JSON.parse(event.data),d=msg.data||msg;
    var sym={BTCEUR:"BTC",ETHEUR:"ETH",SOLEUR:"SOL"}[d.s];
    if(!sym || !(+d.c>0) || !market[sym])return;
    market[sym].price=+d.c;
    market[sym].priceAt=new Date(d.E||Date.now()).toISOString();
    market[sym].source="Binance WS (prix) / CoinGecko (analyse)";
    maybeDraw();
   }catch(e){}
  };
  ws.onclose=function(){
    if(wsEnd)return;
    retry=Math.min(retry+1,6);
    setTimeout(connectWs,Math.min(60000,1000*Math.pow(2,retry)));
  };
  ws.onerror=function(){try{ws.close();}catch(e){}};
 }catch(e){retry++;setTimeout(connectWs,Math.min(60000,1000*Math.pow(2,retry)));}
}
$("refresh").addEventListener("click",refresh);
$("search").addEventListener("input",draw);
$("reset").addEventListener("click",function(){
 if(!confirm("Réinitialiser uniquement le portefeuille fictif ?"))return;
 paper=E.initialPaper(1000);save();draw();status("Simulation réinitialisée. Aucun portefeuille réel touché.");
});
document.addEventListener("visibilitychange",function(){if(!document.hidden&&Date.now()-lastRefresh>=60000)refresh();});
window.addEventListener("beforeunload",function(){wsEnd=true;if(ws)ws.close();});
draw();refresh();connectWs();
setInterval(function(){if(!document.hidden)draw();},5000);
setInterval(function(){if(!document.hidden)refresh();},60000);
})();