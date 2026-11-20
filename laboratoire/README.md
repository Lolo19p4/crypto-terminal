# Laboratoire MP-4 — 16 cryptos / 6 modules experts

Prototype **lecture seule et simulation** pour le ticket [Jira MP-4](https://loicm7059.atlassian.net/browse/MP-4). Ce dossier ne remplace pas le terminal **privé local** du ticket MP-3 et ne déploie ni robot ni stratégie automatique.

## Démarrage
Ouvrir \`laboratoire/experts.html\` dans un navigateur moderne ; si l'accès CORS / API échoue depuis un fichier local, servir le dépôt en local avec \`python -m http.server 8765 --bind 127.0.0.1\` depuis sa racine puis ouvrir \`http://127.0.0.1:8765/laboratoire/experts.html\`.

## Fonctionnement
- **16 actifs** : BTC, ETH, SOL, AVAX, LTC, ATOM, DOT, ALEO, USDC, USDT, WBTC, WETH, JUP, RAY, BONK, ZORA. Un identifiant CoinGecko est associé à chaque symbole ; un cours générique n'est **pas** le solde d'un contrat sur une blockchain précise.
- **Données marchés** : une requête groupée CoinGecko \`/coins/markets\` toutes les 60 secondes (toute donnée manquante reste indisponible). Streaming facultatif **BTCEUR / ETHEUR / SOLEUR** via Binance miniTicker pour le prix seulement. Analyse 1 h / 24 h CoinGecko distincte et horodatée.
- **Six modules explicables** : SCOUT (cours/volume), TREND (variations observées ; pas encore EMA/RSI), ONCHAIN (non connecté), FILTER (liquidité/spread non vérifiés), RISK (veto réel systématique), EXECUTOR (simulation seulement).
- **Données obsolètes** : au-delà de 120 secondes, les prix et les données d'analyse perdent leur statut de fraîcheur. Aucune estimation ne remplace une donnée inconnue.
- **Simulation**, opt-in manuel : solde fictif initial de 1 000 EUR, 15 % du capital max par achat, 10 % minimum en réserve, 3 positions maximum. 3 % de frais à l'achat et à la vente (conforme au paramètre du site actuel), glissement fictif 0,2 % par opération ; **hors frais réseau**. Stops fictifs −4 % exécutés seulement lorsque la page reçoit un prix récent, donc **pas une garantie d'exécution**. Coupe-circuit après deux pertes réalisées ou perte quotidienne réalisée de 8 % du capital initial.
- Sauvegarde de l'état fictif dans le navigateur (\`localStorage\`) sans adresse personnelle et sans clé secrète.

## Tests
\`node tests/experts-engine.test.cjs\`

Tests du moteur : nombre d'actifs et modules, absence de trading réel, rejet des cours anciens, frais de transaction simulés, limite d'allocation, plafond de trois positions, stop fictif, coupe-circuit après deux pertes.

## Limitations critiques
1. **Aucune automatisation d'achats/ventes réels**, API d'échange, signature, accès Phantom ou récupération de fonds.
2. Seule une vue **statique de laboratoire** existe ici. Jira MP-3 décrit un projet Python local différent, pas encore intégré/testé depuis le PC réel.
3. Pas de vérification contractuelle on-chain, profondeur de carnet, spread effectif, liquidité DEX, slippage réel, données EMA/RSI multi-timeframes ni backtest historique validé : **les six modules ne sont pas tous opérationnels**.
4. Ce dépôt GitHub est public : ne jamais y placer de mots de récupération, clés, tokens API personnels ou inventaires de portefeuille.
5. Le site principal et son fichier \`swap.js\` n'ont **pas** été modifiés. Aucune mise en production sans tests et accord explicite.

## Sources
- https://docs.coingecko.com/reference/coins-markets
- https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- https://github.com/ccxt/ccxt
- https://github.com/freqtrade/freqtrade
- https://github.com/hummingbot/hummingbot

Les exemples CCXT/Freqtrade/Hummingbot sont des références d'architecture **non intégrées** à ce prototype côté navigateur. Une phase backend Python distincte sera nécessaire pour un raccordement contrôlé à un moteur réel.