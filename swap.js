// ===== Réglages des frais (Programme de parrainage Jupiter) =====
// Compte de parrainage Jupiter appartenant à Loïc (portefeuille BSxnWLQadUHMW3uS1uiG7EbEdLbdfdX72Wq4RJ7bd13q).
// À remplir après sa création sur https://referral.jup.ag (signée par Loïc dans son Phantom).
const REFERRAL_ACCOUNT = "";
const REFERRAL_FEE_BPS = 255; // maximum autorisé par Jupiter (50 à 255 points de base = 2,55 %)
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
(function(){
  const actif = REFERRAL_ACCOUNT.length > 30;
  document.getElementById("frais").textContent = actif
    ? "Frais du site : " + (REFERRAL_FEE_BPS/100).toLocaleString("fr-FR") + " % par échange (en plus des frais réseau Solana)"
    : "Frais du site : 0 % — seuls les frais Jupiter et réseau s'appliquent";
  const formProps = { initialInputMint: SOL, initialOutputMint: USDC };
  if (actif) { formProps.referralAccount = REFERRAL_ACCOUNT; formProps.referralFee = REFERRAL_FEE_BPS; }
  function go(){ if(!window.Jupiter) return setTimeout(go,300);
    window.Jupiter.init({ displayMode:"integrated", integratedTargetId:"jupiter", formProps,
      branding:{ name:"Terminal Crypto" }, containerStyles:{ width:"100%", height:"560px" } }); }
  go();
})();
