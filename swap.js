// ===== Échange Jupiter (Swap API v2 /build) avec frais du site =====
// Les frais vont sur le compte USDC de Loïc (propriétaire BSxnWLQadUHMW3uS1uiG7EbEdLbdfdX72Wq4RJ7bd13q).
const FEE_ACCOUNT = "FdmsMDUwUQ5fcouLXKrwuc8gLuMLYVm5qxtuYHa7bmeg";
const FEE_BPS = 255; // 2,55 %
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JETONS = [
  ["SOL","So11111111111111111111111111111111111111112",9],
  ["JUP","JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",6],
  ["BONK","DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",5],
  ["WIF","EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",6],
  ["TRUMP","6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",6],
  ["RAY","4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",6],
  ["USDT","Es9vMFrzaCERmJfrF4H2FYD4KCoNkY5ywGQhD8vgNqG",6]];
const API = "https://api.jup.ag/swap/v2/build";
(function(){
const $=id=>document.getElementById(id);
let wallet=null, sens="achat", devis=null;
$("frais").textContent="Frais du site : "+(FEE_BPS/100).toLocaleString("fr-FR")+" % par échange (payés en USDC), + frais réseau Solana";
$("jeton").innerHTML=JETONS.map((j,i)=>`<option value="${i}">${j[0]}</option>`).join("");
function majSens(){$("btnAchat").classList.toggle("on",sens==="achat");$("btnVente").classList.toggle("on",sens==="vente");
 $("lblMontant").textContent=sens==="achat"?"Je paie (USDC)":"Je vends (quantité de "+JETONS[$("jeton").value][0]+")";devis=null;$("devis").textContent="";}
$("btnAchat").onclick=()=>{sens="achat";majSens()};$("btnVente").onclick=()=>{sens="vente";majSens()};$("jeton").onchange=majSens;majSens();
window.ajouterJeton=function(sym,mint,dec){let i=JETONS.findIndex(j=>j[1]===mint);
 if(i<0){JETONS.push([sym,mint,dec]);i=JETONS.length-1;$("jeton").insertAdjacentHTML("beforeend",`<option value="${i}">${sym}</option>`)}
 $("jeton").value=i;sens="achat";majSens();if(!$("montant").value)$("montant").value="10";$("swap").scrollIntoView({behavior:"smooth"});msg("Vérifiez le prix puis échangez. Token risqué !",true)};
function msg(t,err){$("swapMsg").textContent=t;$("swapMsg").className=err?"err":""}
function provider(){return window.phantom&&window.phantom.solana&&window.phantom.solana.isPhantom?window.phantom.solana:null}
$("connect").onclick=async()=>{const p=provider();
 if(!p){location.href="https://phantom.app/ul/browse/"+encodeURIComponent(location.href)+"?ref="+encodeURIComponent(location.origin);return}
 try{const r=await p.connect();wallet=r.publicKey.toString();$("connect").textContent="Phantom connecté : "+wallet.slice(0,4)+"…"+wallet.slice(-4);msg("")}catch(e){msg("Connexion refusée",true)}};
function params(){const j=JETONS[$("jeton").value],n=parseFloat(String($("montant").value).replace(",","."));
 if(!(n>0))throw new Error("Entrez un montant");
 const inMint=sens==="achat"?USDC:j[1],outMint=sens==="achat"?j[1]:USDC,dec=sens==="achat"?6:j[2];
 return {j,inMint,outMint,amount:BigInt(Math.round(n*10**dec)).toString()}}
async function build(taker){const p=params();
 const q=new URLSearchParams({inputMint:p.inMint,outputMint:p.outMint,amount:p.amount,taker,slippageBps:"100",platformFeeBps:String(FEE_BPS),feeAccount:FEE_ACCOUNT});
 const r=await fetch(API+"?"+q);if(r.status===429)throw new Error("Jupiter est saturé, réessayez dans 1 minute");
 const d=await r.json();if(!r.ok||d.error)throw new Error(d.error||("Erreur Jupiter "+r.status));return {p,d}}
$("devisBtn").onclick=async()=>{try{msg("Calcul du prix…");
 const {p,d}=await build(wallet||"9yj3zvLS3fDMqi1F8zhkaWfq8TZpZWHe6cz1Sgt7djXf");
 const outDec=sens==="achat"?p.j[2]:6,inDec=sens==="achat"?6:p.j[2];
 const recu=Number(d.outAmount)/10**outDec,donne=Number(d.inAmount)/10**inDec;
 const usdc=sens==="achat"?donne:recu/(1-FEE_BPS/1e4),fee=usdc*FEE_BPS/1e4;
 $("devis").innerHTML=`Vous recevez ≈ <b>${recu.toLocaleString("fr-FR",{maximumFractionDigits:6})} ${sens==="achat"?p.j[0]:"USDC"}</b><br>Frais du site : ${fee.toLocaleString("fr-FR",{maximumFractionDigits:4})} USDC`;msg("")}catch(e){msg("⚠ "+e.message,true)}};
$("echanger").onclick=async()=>{try{
 if(!wallet){msg("Connectez d'abord Phantom",true);return}
 msg("Préparation…");const {d}=await build(wallet);const W=window.solanaWeb3;
 const ix=x=>new W.TransactionInstruction({programId:new W.PublicKey(x.programId),keys:x.accounts.map(a=>({pubkey:new W.PublicKey(a.pubkey),isSigner:a.isSigner,isWritable:a.isWritable})),data:Uint8Array.from(atob(x.data),c=>c.charCodeAt(0))});
 const list=[W.ComputeBudgetProgram.setComputeUnitLimit({units:600000}),...d.computeBudgetInstructions.map(ix),...d.setupInstructions.map(ix),ix(d.swapInstruction),...(d.cleanupInstruction?[ix(d.cleanupInstruction)]:[]),...(d.otherInstructions||[]).map(ix)];
 const alts=Object.entries(d.addressesByLookupTableAddress||{}).map(([k,v])=>new W.AddressLookupTableAccount({key:new W.PublicKey(k),state:{deactivationSlot:BigInt("18446744073709551615"),lastExtendedSlot:0,lastExtendedSlotStartIndex:0,addresses:v.map(a=>new W.PublicKey(a))}}));
 const hash=new W.PublicKey(Uint8Array.from(d.blockhashWithMetadata.blockhash)).toBase58();
 const m=new W.TransactionMessage({payerKey:new W.PublicKey(wallet),recentBlockhash:hash,instructions:list}).compileToV0Message(alts);
 const tx=new W.VersionedTransaction(m);msg("Validez dans Phantom…");
 const r=await provider().signAndSendTransaction(tx);
 $("swapMsg").innerHTML=`✅ Échange envoyé ! <a href="https://solscan.io/tx/${r.signature}" target="_blank">Voir sur Solscan</a>`;$("swapMsg").className="";
}catch(e){msg("⚠ "+(e.message||"Échange annulé"),true)}};
})();
