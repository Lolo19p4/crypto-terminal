/* Executer avec : node tests/experts-engine.test.cjs */
"use strict";
const E=require("../laboratoire/experts-engine.js");
const check=(condition,message)=>{if(!condition)throw Error(message);};
const now=Date.UTC(2026,10,20,12,0,0);
function snap(symbol,price,change1=1,change24=2){
 const a=E.ASSETS.find(x=>x.symbol===symbol);
 return E.normalize({id:a.id,current_price:price,last_updated:new Date(now).toISOString(),
   price_change_percentage_1h_in_currency:change1,
   price_change_percentage_24h_in_currency:change24,
   total_volume:4000000,market_cap:20000000});
}
check(E.ASSETS.length===16,"16 actifs");
check(new Set(E.ASSETS.map(a=>a.symbol)).size===16,"symboles uniques");
let b=E.ASSETS.find(a=>a.symbol==="BTC");
let r=snap("BTC",100);
let a=E.evaluate(b,r,now);
check(a.experts.length===6,"six modules");
check(a.realTradeAllowed===false,"aucun ordre reel");
check(a.freshPrice===true,"prix frais");
check(E.evaluate(b,r,now+180000).freshPrice===false,"peremption");
check(E.evaluate(b,null,now).realTradeAllowed===false,"donnees absentes");
check(E.evaluate(b,r,now).experts[2].status==="attente","onchain non simule");
const rows={BTC:r,ETH:snap("ETH",100),SOL:snap("SOL",100),AVAX:snap("AVAX",100)};
let paper=E.initialPaper(1000);
let buy=E.paperTrade(paper,b,r,"buy",100,rows,now);
check(buy.qty>0 && paper.cash===900,"achat fictif");
let blocked=false;
try{E.paperTrade(paper,b,r,"buy",200,rows,now);}catch(e){blocked=true;}
check(blocked,"pas de double position");
blocked=false;
try{E.paperTrade(paper,E.ASSETS.find(a=>a.symbol==="ETH"),rows.ETH,"buy",200,rows,now);}
catch(e){blocked=true;}
check(blocked,"plafond 15 pct");
let sell=E.paperTrade(paper,b,r,"sell",null,rows,now);
check(sell.pnl<0 && paper.trades.length===2,"frais A/R calcules");
blocked=false;
try{E.paperTrade(paper,b,r,"buy",20,rows,now+180000);}catch(e){blocked=true;}
check(blocked,"pas de simulation avec cours perime");
paper=E.initialPaper(1000);
for(const sym of ["BTC","ETH","SOL"]){
 E.paperTrade(paper,E.ASSETS.find(a=>a.symbol===sym),rows[sym],"buy",60,rows,now);
}
blocked=false;
try{E.paperTrade(paper,E.ASSETS.find(a=>a.symbol==="AVAX"),rows.AVAX,"buy",60,rows,now);}
catch(e){blocked=true;}
check(blocked,"max 3 positions");
rows.BTC.price=90;
const stopped=E.checkStops(paper,Object.fromEntries(E.ASSETS.map(a=>[a.symbol,a])),rows,now);
check(stopped.length===1 && !paper.positions.BTC,"stop fictif -4 pct");
check(E.paperEquity(paper,rows)>0,"valorisation");
paper=E.initialPaper(1000);
rows.BTC.price=100;
for(let i=0;i<2;i++){
 E.paperTrade(paper,b,r,"buy",60,rows,now);
 E.paperTrade(paper,b,r,"sell",null,rows,now);
}
check(paper.streak===2,"deux pertes");
blocked=false;
try{E.paperTrade(paper,b,r,"buy",60,rows,now);}catch(e){blocked=true;}
check(blocked,"coupe-circuit deux pertes");
console.log("OK : 16 actifs, 6 experts, simulation et blocages de risque.");