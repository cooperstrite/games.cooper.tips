import { MEMORY_LAYOUTS, memoryRewardTotal } from "./memory-config.js";

const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };
const coins = amount => `${amount} coin${amount === 1 ? "" : "s"}`;

// Read the existing payout calculation so the explanation always matches it.
export function memoryCoinOffer(settings) {
  const pairs = settings.tiles / 2;
  const perPair = memoryRewardTotal({ ...settings, humanMatches: 1, complete: false });
  const win = memoryRewardTotal({ ...settings, humanMatches: pairs, computerMatches: 0, complete: true }) - perPair * pairs;
  const mode = settings.mode === "computer" ? `${LEVEL_NAMES[settings.difficulty]} computer` : settings.mode === "solo" ? "Solo" : "Friends on one device";
  return { perPair, win, mode, pairs };
}

export function memoryCoinSummary(settings) {
  const { perPair, win, mode } = memoryCoinOffer(settings);
  return settings.mode === "local" ? "Friends on one device: no coins for pairs or wins. Solo and computer games earn coins for the shared shop."
    : `${mode}, ${settings.tiles} cards: ${coins(perPair)} for each pair YOU match.${win ? ` Win the finished game for ${win} extra coins.` : " No extra bonus for finishing."}`;
}

export function memoryCoinExample(settings) {
  const { perPair, win, pairs } = memoryCoinOffer(settings);
  if (settings.mode === "local") return "Play Solo or You vs computer to earn coins for your collection.";
  if (settings.mode === "solo") return `Clear all ${pairs} pairs: ${pairs} x ${perPair} = ${coins(pairs * perPair)}. Finishing adds no extra bonus.`;
  const matches = Math.floor(pairs / 2) + 1;
  return `Example on ${LEVEL_NAMES[settings.difficulty]}: you finish with ${matches} pairs and the computer has ${pairs - matches}. Your ${matches} pairs x ${perPair} = ${coins(matches * perPair)}, plus ${win} for winning = ${coins(matches * perPair + win)} total.`;
}

export function memoryCoinGuide(settings) {
  const { perPair, win, mode } = memoryCoinOffer(settings);
  return `<h4>Coins for this game</h4><p class="ml-coin-context">${mode} / ${settings.tiles} cards (${settings.tiles / 2} pairs)</p>
    <dl class="ml-coin-rates"><div><dt>Each pair YOU match</dt><dd>${coins(perPair)}</dd></div><div><dt>${settings.mode === "computer" ? "Extra for winning" : "Completion bonus"}</dt><dd>${win ? `+${coins(win)}` : "None"}</dd></div></dl>
    <p>A pair is two cards with the same picture.</p>
    ${settings.mode === "local" ? "<p>Games with friends award no coins, including for the winner.</p>" : `<p>${settings.mode === "computer" ? "To earn the win bonus, finish the entire board with more pairs than the computer. Ties and losses keep your pair coins, but earn no win bonus. The computer's pairs never earn coins for you." : "Every pair you match earns coins, even if you leave before finishing."}</p><p>Pair coins go into your wallet immediately. Misses cost nothing, and speed does not affect your coins.</p>`}
    <p class="ml-coin-example">${memoryCoinExample(settings)}</p>`;
}

export function memoryCoinBreakdown(progress) {
  if (progress.mode === "local") return "0 coins this game. Games with friends award no coins.";
  const pairCoins = memoryRewardTotal({ ...progress, complete: false });
  const total = memoryRewardTotal(progress), bonus = total - pairCoins;
  const { perPair, win } = memoryCoinOffer(progress);
  const bonusText = progress.mode !== "computer" ? "" : progress.complete ? `Win bonus: +${bonus}. ` : `Win bonus is pending: ${win} extra coins if you win. `;
  return `Your ${progress.humanMatches} pair${progress.humanMatches === 1 ? "" : "s"} x ${perPair} = ${coins(pairCoins)} from matches. ${bonusText}Total this game: ${coins(total)}.${progress.mode === "computer" && progress.complete && bonus === 0 ? " No win bonus for a tie or loss." : ""}`;
}

export function memoryShopCoinTable(tiles) {
  const settings = { mode: "computer", tiles, difficulty: "medium" };
  return `<table><caption>Coins for a ${tiles}-card game (${tiles / 2} pairs)</caption><thead><tr><th scope="col">Mode</th><th scope="col">Each pair YOU match</th><th scope="col">Extra for winning</th></tr></thead><tbody>
    <tr><th scope="row">Solo</th><td>1 coin</td><td>None</td></tr>
    ${Object.entries(LEVEL_NAMES).map(([difficulty, name]) => { const { perPair, win } = memoryCoinOffer({ ...settings, difficulty }); return `<tr><th scope="row">${name} computer</th><td>${coins(perPair)}</td><td>+${coins(win)}</td></tr>`; }).join("")}
    <tr><th scope="row">Friends</th><td>0 coins</td><td>None</td></tr></tbody></table>
    <p class="ml-coin-example">${memoryCoinExample(settings)}</p>`;
}

export function memoryShopCoinGuide(tiles = 16) {
  return `<section class="ml-shop-coin-guide"><h4>Memory Loop: how coins work</h4><p>One pair means two matching cards. Only the pairs you match earn coins for you.</p>
    <label>Choose a board size to see its exact win bonuses<select aria-label="Memory Loop reward board size">${MEMORY_LAYOUTS.map(layout => `<option value="${layout.tiles}" ${layout.tiles === tiles ? "selected" : ""}>${layout.label}</option>`).join("")}</select></label>
    <div class="ml-shop-coin-table">${memoryShopCoinTable(tiles)}</div>
    <p>Win bonuses are paid once, when the board is cleared and you have more pairs than the computer. A tie or loss pays only for your own pairs. Bigger boards increase the win bonus; the coins per pair stay the same.</p>
    <p>Pair coins save immediately. Misses cost nothing. Finishing faster does not pay extra. Your shared wallet includes coins earned in other games, while Memory Loop's game total shows only that round.</p></section>`;
}
