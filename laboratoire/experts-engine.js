/* Sol Desk / Jira MP-4 : moteur deterministe, lecture seule + simulation.
   Aucune connexion de wallet, aucune signature et aucun ordre reel. */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SolDeskSix = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var ASSETS = [
    {symbol:"BTC", id:"bitcoin", network:"Bitcoin", kind:"native"},
    {symbol:"ETH", id:"ethereum", network:"Ethereum", kind:"native"},
    {symbol:"SOL", id:"solana", network:"Solana", kind:"native"},
    {symbol:"AVAX", id:"avalanche-2", network:"Avalanche", kind:"native"},
    {symbol:"LTC", id:"litecoin", network:"Litecoin", kind:"native"},
    {symbol:"ATOM", id:"cosmos", network:"Cosmos", kind:"native"},
    {symbol:"DOT", id:"polkadot", network:"Polkadot", kind:"native"},
    {symbol:"ALEO", id:"aleo", network:"Aleo", kind:"native"},
    {symbol:"USDC", id:"usd-coin", network:"Multichaine", kind:"stable"},
    {symbol:"USDT", id:"tether", network:"Multichaine", kind:"stable"},
    {symbol:"WBTC", id:"wrapped-bitcoin", network:"Token (reseau a verifier)", kind:"wrapped"},
    {symbol:"WETH", id:"weth", network:"Token (reseau a verifier)", kind:"wrapped"},
    {symbol:"JUP", id:"jupiter-exchange-solana", network:"Solana", kind:"token"},
    {symbol:"RAY", id:"raydium", network:"Solana", kind:"token"},
    {symbol:"BONK", id:"bonk", network:"Solana", kind:"token"},
    {symbol:"ZORA", id:"zora", network:"Base", kind:"token"}
  ];
  var COST = {feePct:0.03, slipPct:0.002, maxAllocationPct:0.15,
    reservePct:0.10, stopPct:0.04, dailyLimitPct:0.08,
    maxPositions:3, maxLossStreak:2, freshnessMs:120000};
  function num(n) { return typeof n === "number" && Number.isFinite(n) ? n : null; }
  function stamp(s) {
    var n = typeof s === "number" ? s : Date.parse(s || "");
    return Number.isFinite(n) ? n : null;
  }
  function fresh(time, now) {
    var t = stamp(time);
    return t !== null && t <= now + 5000 && now - t <= COST.freshnessMs;
  }
  function normalize(coin) {
    if (!coin || typeof coin !== "object") return null;
    return {
      id: coin.id,
      price: num(coin.current_price),
      priceAt: coin.last_updated || null,
      marketAt: coin.last_updated || null,
      source: "CoinGecko",
      p1h: num(coin.price_change_percentage_1h_in_currency),
      p24h: num(coin.price_change_percentage_24h_in_currency) === null
        ? num(coin.price_change_percentage_24h) : coin.price_change_percentage_24h_in_currency,
      p7d: num(coin.price_change_percentage_7d_in_currency),
      volume: num(coin.total_volume),
      marketCap: num(coin.market_cap)
    };
  }
  function evaluate(asset, row, now) {
    now = now == null ? Date.now() : now;
    var validPrice = !!row && num(row.price) !== null && row.price > 0 && fresh(row.priceAt, now);
    var validMarket = !!row && fresh(row.marketAt, now);
    var score = [];
    function record(name, status, reason) {
      score.push({name:name, status:status, reason:reason});
    }
    if (!validPrice) record("SCOUT", "non", "Prix manquant ou perime : pas de signal.");
    else if (!validMarket || num(row.volume) === null) record("SCOUT", "attente", "Volume indisponible ou trop ancien.");
    else if (row.volume < 1000000) record("SCOUT", "attention", "Volume 24 h faible (< 1 M EUR), ce n'est pas la liquidite d'un pool.");
    else record("SCOUT", "ok", "Prix et volume recents ; activite 24 h observee.");
    if (!validMarket || num(row.p1h) === null || num(row.p24h) === null)
      record("TREND", "attente", "Variations 1 h et 24 h indisponibles ; EMA/RSI non calcules.");
    else if (asset.kind === "stable")
      record("TREND", "attention", "Stablecoin : signal momentum non pertinent.");
    else if (row.p1h > 0 && row.p24h > 0)
      record("TREND", "ok", "Hausse observee sur 1 h et 24 h ; ce n'est pas une prevision.");
    else if (row.p1h < 0 && row.p24h < 0)
      record("TREND", "non", "Baisse observee sur 1 h et 24 h.");
    else record("TREND", "attention", "Signaux 1 h et 24 h divergents ou neutres.");
    record("ONCHAIN", "attente", "Pas de verification de contrat, holders ou transferts pour cet actif.");
    record("FILTER", "attente", "Profondeur du carnet, spread, pool et taxe de transfert non verifies.");
    record("RISK", "non", !validPrice ? "Cours perime : veto."
      : "Mode reel bloque : devis, frais, spread et risques non valides.");
    record("EXECUTOR", "non", "Signature et ordres reels absents ; simulation manuelle uniquement.");
    return {
      symbol: asset.symbol, freshPrice:validPrice, freshMarket:validMarket,
      verdict:validPrice && validMarket ? "Observation uniquement" : "Donnees insuffisantes",
      experts:score, realTradeAllowed:false
    };
  }
  function initialPaper(cash) {
    cash = cash == null ? 1000 : cash;
    if (!(num(cash) !== null && cash > 0)) throw Error("Capital fictif invalide.");
    return {version:1, starting:cash, cash:cash, positions:{}, trades:[],
      streak:0, dayKey:null, dayLoss:0};
  }
  function positionsValue(state, rows) {
    return Object.keys(state.positions).reduce(function(sum, symbol){
      var p=state.positions[symbol], r=rows && rows[symbol], price=r && num(r.price);
      return sum + p.qty * (price != null && price>0 ? price : p.entry);
    },0);
  }
  function paperEquity(state, rows) {
    return state.cash + positionsValue(state, rows);
  }
  function newDay(state, now) {
    var day = new Date(now).toISOString().slice(0,10);
    if (day !== state.dayKey) { state.dayKey=day; state.dayLoss=0; }
  }
  function paperTrade(state, asset, row, side, amount, rows, now, reason) {
    now = now == null ? Date.now() : now;
    if (!state || state.version !== 1) throw Error("Etat de simulation invalide.");
    if (!asset || !ASSETS.some(function(a){return a.symbol===asset.symbol;}))
      throw Error("Actif inconnu.");
    if (!row || num(row.price)===null || row.price<=0 || !fresh(row.priceAt,now)
      || !fresh(row.marketAt,now)) throw Error("Prix ou metriques perimes : simulation refusee.");
    newDay(state, now);
    if (side === "buy") {
      if (asset.kind === "stable") throw Error("Stablecoin : achat speculatif desactive en simulation.");
      if (state.streak >= COST.maxLossStreak || state.dayLoss >= state.starting*COST.dailyLimitPct)
        throw Error("Coupe-circuit de pertes active.");
      if (state.positions[asset.symbol]) throw Error("Deja en position.");
      if (Object.keys(state.positions).length >= COST.maxPositions)
        throw Error("Maximum de trois positions fictives.");
      var equity=paperEquity(state,rows);
      var cap=Math.min(state.cash-equity*COST.reservePct,equity*COST.maxAllocationPct);
      if (!(num(amount)!==null && amount>=5 && amount<=cap+0.000001))
        throw Error("Mise hors plafond (15 % du capital, reserve 10 %, minimum 5 EUR).");
      var qty=amount*(1-COST.feePct)/(row.price*(1+COST.slipPct));
      state.cash-=amount;
      state.positions[asset.symbol]={qty:qty, cost:amount, entry:amount/qty,
        openedAt:now, asset:asset.symbol};
      state.trades.unshift({at:now,symbol:asset.symbol,side:"buy",amount:amount,
        qty:qty, price:row.price, reason:reason||"Achat fictif manuel"});
      return {side:side,symbol:asset.symbol,spent:amount,qty:qty};
    }
    if (side === "sell") {
      var pos=state.positions[asset.symbol];
      if (!pos) throw Error("Aucune position fictive a cloturer.");
      var received=pos.qty*row.price*(1-COST.slipPct)*(1-COST.feePct);
      var pnl=received-pos.cost;
      state.cash+=received;
      delete state.positions[asset.symbol];
      state.streak=pnl<0 ? state.streak+1 : 0;
      if (pnl<0) state.dayLoss+=-pnl;
      state.trades.unshift({at:now,symbol:asset.symbol,side:"sell",
        amount:received,pnl:pnl,price:row.price, reason:reason||"Vente fictive manuelle"});
      return {side:side,symbol:asset.symbol,received:received,pnl:pnl};
    }
    throw Error("Sens de transaction fictive invalide.");
  }
  function checkStops(state, assetsBySymbol, rows, now) {
    now=now==null?Date.now():now;
    var done=[];
    Object.keys(state.positions).forEach(function(sym){
      var p=state.positions[sym],r=rows[sym], a=assetsBySymbol[sym];
      if (!r || !a || num(r.price)===null || r.price>p.entry*(1-COST.stopPct))
        return;
      try { done.push(paperTrade(state,a,r,"sell",null,rows,now,"Stop fictif -4 %")); }
      catch (e) { /* si cours perime, aucune cloture fictive inventee */ }
    });
    return done;
  }
  return {ASSETS:ASSETS,COST:COST,normalize:normalize,evaluate:evaluate,
    fresh:fresh,initialPaper:initialPaper,paperTrade:paperTrade,
    paperEquity:paperEquity,checkStops:checkStops};
});