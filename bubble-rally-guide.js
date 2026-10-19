import { MAX_ENERGY, RALLY_ACTIONS, rallyCourse } from "./bubble-rally-model.js";

// Explain the resolved move, so previews, touch controls and the race log agree.
export function rallyMoveDetails(state) {
  const move = state.last;
  if (!move) return null;
  const player = state.players[move.player];
  const action = RALLY_ACTIONS.find(entry => entry.id === move.action);
  const steps = [`Rolled ${move.roll}. ${action.name} moves from tile ${move.from} to tile ${move.landing}.`];
  const gained = move.energyAfterAction - move.energyBefore;
  if (action.cost) steps.push(`${action.name} spent ${action.cost} energy. ${move.energyAfterAction}/${MAX_ENERGY} left${action.id === "shield" ? "; shield raised" : ""}.`);
  else if (gained) steps.push(`${action.name} restored ${gained} energy${gained < action.gain ? " (limited by the 6-energy cap)" : ""}.`);
  else steps.push("Energy is already full at 6/6.");
  const effects = [];
  for (const event of move.events) {
    if (event.type === "boost") {
      steps.push(`Current: forward ${move.to - move.landing} spaces, from tile ${move.landing} to ${move.to}. The new tile does not trigger another effect.`);
      effects.push("Current +2 spaces");
    } else if (event.type === "charge") {
      const charged = player.energy - move.energyAfterAction;
      steps.push(charged ? `Charge tile: +${charged} energy${charged < 2 ? " (limited by the 6-energy cap)" : ""}.` : "Charge tile: no extra energy because you are already at the 6-energy cap.");
      effects.push(charged ? `Charge +${charged} energy` : "Charge: energy full");
    } else if (event.type === "storm") {
      const strength = state.course === "tempest" ? 3 : 2;
      const back = move.landing - move.to;
      steps.push(`Storm: back ${back} spaces to tile ${move.to}.${back < strength ? ` Your checkpoint at ${player.checkpoint} stops the ${strength}-space setback here.` : ""}`);
      effects.push(`Storm: back ${back}`);
    } else if (event.type === "blocked-storm") {
      steps.push(`Your shield blocked the storm and broke. Stay on tile ${move.landing}.`);
      effects.push("Storm blocked");
    } else if (event.type === "checkpoint") {
      steps.push(`Checkpoint ${event.position} saved. Storms and pops cannot send you behind it.`);
      effects.push(`Saved ${event.position}`);
    } else if (event.type === "pop") {
      steps.push(`${state.players[event.player].name} was popped back to checkpoint ${event.to}.`);
      effects.push(`Popped ${state.players[event.player].name}`);
    } else if (event.type === "blocked-pop") {
      steps.push(`${state.players[event.player].name}'s shield blocked the pop and broke. Both racers stay here.`);
      effects.push("Rival shield broke");
    }
  }
  const finish = state.winner === player.id;
  return {
    summary: `${player.name}: ${action.name}, tile ${move.from} to ${move.to}. ${player.energy}/${MAX_ENERGY} energy${finish ? `. Wins ${rallyCourse(state.course).name}!` : "."}`,
    destination: finish ? "Reach the finish!" : `Finish on tile ${move.to}`,
    result: `${player.energy}/${MAX_ENERGY} energy${effects.length ? " / " + effects.join(" / ") : ""}`,
    steps,
  };
}
