import { createRocketBoost } from "./rocket-boost.js";
import { createBubbleRally } from "./bubble-rally.js";
import { createMemoryLoop } from "./memory-loop.js";
import { createSpotlight } from "./spotlight.js";
import { createCatsDogs } from "./cats-dogs.js";
import { createRunwayGlide } from "./runway-glide.js";
import { createFreeFlightGame } from "./free-flight.js";
import { createHauntedHarvest } from "./haunted-harvest.js";
import { createSwitchyardSignals } from "./switchyard-signals.js";
import { OPPONENT_LEVELS, createComputerOpponent, createOpponentScheduler } from "./arcade/opponents.js";
import { createNimDuel } from "./nim-duel.js";
import { createNeonDrift } from "./neon-drift.js";
import { createSnakeAudio } from "./snake-audio.js";
import { createAuroraArchery } from "./aurora-archery.js";
import { createFlappyBird } from "./flappy-bird.js";
import { createRedLightGreenLight } from "./red-light-green-light.js";
import { characterOptions } from "./arcade/characters.js";
import { createRewardSession, applyEquippedKit, mountGameWallet } from "./arcade/game-services.js";
import { getArcadeWallet } from "./arcade/wallet.js";
import { createArcadeShop, mountArcadeNavigation } from "./arcade/hub.js";
import { createCharacterLibrary } from "./arcade/editor-hub.js";

const games = [
  {
    id: "guess",
    name: "Hot & Cold",
    summary: "Guess the number with hot/cold hints.",
    description:
      "Guess the hidden number between 1 and 100. Each attempt gives you warmer or colder hints as you zero in.",
    logo: "assets/hot-and-cold-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "guess-game";

      const ranges = [
        10,
        50,
        100,
        500,
        1000,
        5000,
        10000,
        50000,
        100000,
        500000,
        1000000,
      ];

      const state = {
        maxRange: 100,
        secret: 0,
        attempts: [],
        finished: false,
        bestScore: null,
      };

      const controls = document.createElement("div");
      controls.className = "controls";

      const rangeLabel = document.createElement("label");
      rangeLabel.className = "range-select";
      const rangeLabelText = document.createElement("span");
      rangeLabelText.textContent = "Range";

      const rangeSelect = document.createElement("select");
      rangeSelect.name = "range";
      rangeSelect.setAttribute("aria-label", "Guessing range");
      ranges.forEach((max) => {
        const option = document.createElement("option");
        option.value = String(max);
        option.textContent = `1 – ${formatNumber(max)}`;
        if (max === state.maxRange) {
          option.selected = true;
        }
        rangeSelect.appendChild(option);
      });
      rangeLabel.append(rangeLabelText, rangeSelect);

      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.placeholder = "Enter a number";
      input.setAttribute("inputmode", "numeric");

      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "primary-btn";
      actionBtn.textContent = "Take a guess";

      controls.append(rangeLabel, input, actionBtn);

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.innerHTML = "<strong>Ready?</strong><span>Type a number to get started.</span>";

      const historyTitle = document.createElement("h3");
      historyTitle.textContent = "Your guesses";

      const historyList = document.createElement("ul");
      historyList.className = "list-inline";

      const info = document.createElement("p");
      info.className = "help-text";
      info.textContent = getRangeHelpText();

      wrapper.append(controls, feedback, historyTitle, historyList, info);
      root.appendChild(wrapper);

      resetGame({ message: "Ready? Type a number to get started." });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          actionBtn.click();
        }
      });

      rangeSelect.addEventListener("change", () => {
        const newRange = Number.parseInt(rangeSelect.value, 10);
        if (!Number.isNaN(newRange)) {
          state.maxRange = newRange;
          resetGame({
            message: `Range set to 1 – ${formatNumber(state.maxRange)}.`,
            clearBest: true,
          });
        }
      });

      actionBtn.addEventListener("click", () => {
        if (state.finished) {
          resetGame();
          return;
        }
        const value = Number.parseInt(input.value, 10);
        if (
          Number.isNaN(value) ||
          value < 1 ||
          value > state.maxRange ||
          !Number.isFinite(value)
        ) {
          renderFeedback(
            `Try a valid number between 1 and ${formatNumber(state.maxRange)}.`,
            "status-bad"
          );
          return;
        }
        if (state.attempts.includes(value)) {
          renderFeedback("You already tried that number. Pick a fresh one!", "status-bad");
          return;
        }

        state.attempts.push(value);
        renderHistory();

        if (value === state.secret) {
          state.finished = true;
          const attempts = state.attempts.length;
          if (!state.bestScore || attempts < state.bestScore) {
            state.bestScore = attempts;
          }
          renderFeedback(
            `Bullseye! ${value} was the secret number.`,
            "status-good",
            `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}.` +
              (state.bestScore === attempts
                ? " New personal best!"
                : state.bestScore
                ? ` Best so far: ${state.bestScore} tries.`
                : "")
          );
          actionBtn.textContent = "Play again";
          input.disabled = true;
        } else {
          const diff = Math.abs(value - state.secret);
          const { toneLabel, toneClass } = getTone(diff);
          const isHigh = value > state.secret;
          const directionText = isHigh ? "Too high" : "Too low";
          const directionIcon = isHigh ? "↓" : "↑";
          renderFeedback(
            `${toneLabel}!`,
            diff <= 10 ? "status-good" : "status-bad",
            `Attempt #${state.attempts.length}. Keep going!`,
            {
              direction: {
                text: directionText,
                type: isHigh ? "high" : "low",
                icon: directionIcon,
              },
              tone: {
                text: `${toneLabel} zone` + (diff <= 2 ? " (within ±2)" : ""),
                className: toneClass,
              },
            }
          );
          input.value = "";
          input.focus();
        }
      });

      function renderFeedback(message, statusClass, detail, extras = {}) {
        feedback.textContent = "";

        const heading = document.createElement("strong");
        heading.className = statusClass;
        heading.textContent = message;
        feedback.appendChild(heading);

        if (extras.direction) {
          const direction = document.createElement("span");
          direction.className = `feedback-direction direction-${extras.direction.type}`;

          const icon = document.createElement("span");
          icon.className = "direction-icon";
          icon.textContent = extras.direction.icon;

          const label = document.createElement("span");
          label.textContent = extras.direction.text;

          direction.append(icon, label);
          feedback.appendChild(direction);
        }

        if (extras.tone) {
          const tone = document.createElement("span");
          tone.className = `feedback-tone ${extras.tone.className}`;
          tone.textContent = extras.tone.text;
          feedback.appendChild(tone);
        }

        if (detail) {
          const detailLine = document.createElement("span");
          detailLine.textContent = detail;
          feedback.appendChild(detailLine);
        }
      }

      function renderHistory() {
        historyList.textContent = "";
        state.attempts.forEach((guess, index) => {
          const item = document.createElement("li");
          item.className = "badge";
          item.textContent = `#${index + 1}: ${guess}`;
          historyList.appendChild(item);
        });
      }

      function resetGame({ message, clearBest = false } = {}) {
        if (clearBest) {
          state.bestScore = null;
        }
        state.secret = getSecret();
        state.attempts = [];
        state.finished = false;
        renderHistory();
        actionBtn.textContent = "Take a guess";
        input.disabled = false;
        input.value = "";
        input.max = String(state.maxRange);
        input.placeholder = `Guess between 1 and ${formatNumber(state.maxRange)}`;
        info.textContent = getRangeHelpText();
        updateDescription();
        if (message) {
          renderFeedback(message, "status-good");
        } else {
          renderFeedback("New number ready. Fire away!", "status-good");
        }
        input.focus();
        rangeSelect.value = String(state.maxRange);
      }

      function getSecret() {
        return Math.floor(Math.random() * state.maxRange) + 1;
      }

      function getTone(diff) {
        if (diff <= 2) return { toneLabel: "Scorching", toneClass: "tone-scorching" };
        if (diff <= 5) return { toneLabel: "Hot", toneClass: "tone-hot" };
        if (diff <= 10) return { toneLabel: "Warm", toneClass: "tone-warm" };
        if (diff <= 20) return { toneLabel: "Cool", toneClass: "tone-cool" };
        return { toneLabel: "Chilly", toneClass: "tone-chilly" };
      }

      function formatNumber(value) {
        return value.toLocaleString("en-US");
      }

      function getRangeHelpText() {
        return `Range: 1 – ${formatNumber(state.maxRange)}. Tip: Use the arrow keys or enter key to make quick adjustments.`;
      }

      function getDescriptionText() {
        return `Guess the hidden number between 1 and ${formatNumber(
          state.maxRange
        )}. Each attempt gives you warmer or colder hints as you zero in.`;
      }

      function updateDescription() {
        if (typeof descEl !== "undefined" && descEl && activeId === "guess") {
          descEl.textContent = getDescriptionText();
        }
      }

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "reaction",
    name: "Flash Reflex",
    summary: "Click as soon as the panel glows.",
    description:
      "Test how fast you can click when the screen flashes. Wait for the glow, then tap as quickly as possible.",
    logo: "assets/cats-vs-dogs-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "reaction-panel";

      const display = document.createElement("div");
      display.className = "reaction-display";

      const status = document.createElement("p");
      status.className = "help-text";
      status.textContent = "Press start and wait for the glow.";

      const timer = document.createElement("div");
      timer.className = "reaction-time";
      timer.textContent = "–";

      const best = document.createElement("div");
      best.className = "reaction-best";
      best.textContent = "Personal best: –";

      display.append(timer, status);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-btn";
      button.textContent = "Start";

      wrapper.append(display, button, best);
      root.appendChild(wrapper);

      let timeoutId = null;
      let startTime = 0;
      let bestScore = null;
      let phase = "idle"; // idle | waiting | go | too-soon

      button.addEventListener("click", () => {
        if (phase === "idle") {
          beginRound();
        } else if (phase === "waiting") {
          tooSoon();
        } else if (phase === "go") {
          recordReaction();
        } else if (phase === "too-soon") {
          beginRound();
        }
      });

      function beginRound() {
        clearTimeout(timeoutId);
        phase = "waiting";
        timer.textContent = "…";
        status.textContent = "Wait for it…";
        button.textContent = "Stop";
        display.classList.remove("go", "too-soon");
        display.classList.add("ready");
        const delay = Math.random() * (10000 - 100) + 100;
        timeoutId = window.setTimeout(() => {
          phase = "go";
          startTime = performance.now();
          timer.textContent = "";
          status.textContent = "Tap now!";
          button.textContent = "Tap!";
          display.classList.remove("ready");
          display.classList.add("go");
        }, delay);
      }

      function tooSoon() {
        clearTimeout(timeoutId);
        phase = "too-soon";
        timer.textContent = "Too early";
        status.textContent = "You clicked before the glow. Try again.";
        button.textContent = "Reset";
        display.classList.remove("ready", "go");
        display.classList.add("too-soon");
      }

      function recordReaction() {
        const reaction = Math.round(performance.now() - startTime);
        timer.textContent = `${reaction} ms`;
        status.textContent = reaction < 200 ? "Lightning quick!" : "Nice one.";
        button.textContent = "Go again";
        display.classList.remove("ready", "too-soon", "go");
        phase = "idle";
        if (!bestScore || reaction < bestScore) {
          bestScore = reaction;
          best.textContent = `Personal best: ${bestScore} ms`;
        }
      }

      return () => {
        clearTimeout(timeoutId);
        wrapper.remove();
      };
    },
  },
  {
    id: "flappy",
    name: "Flappy Bird",
    summary: "A little flap. A big adventure.",
    description:
      "Fly a bird or baby dragon through a sky of pipes. Customize your creature, accessories, colors, and world, or try a first-person 3D (Beta) flight.",
    logo: "assets/flappy-bird-cover.svg",
    init: createFlappyBird,
  },
  {
    id: "snake",
    name: "Snake",
    summary: "Grow the snake without hitting walls.",
    description:
      "Guide the snake with arrow keys or WASD. Eat the apples to grow longer and avoid crashing into walls or yourself.",
    logo: "assets/ChatGPT Image Feb 4, 2026, 06_33_02 PM.png",
    init(root, { editorOnly = false, onAppearanceChange } = {}) {
      const config = {
        gridSize: 16,
        startLength: 4,
      };

      const difficulties = [
        { id: "sloth", label: "Sloth", speedMs: 220 },
        { id: "easy", label: "Easy", speedMs: 180 },
        { id: "classic", label: "Classic", speedMs: 140 },
        { id: "fast", label: "Fast", speedMs: 110 },
        { id: "blitz", label: "Blitz", speedMs: 90 },
      ];
      const defaultDifficulty = difficulties[1];
      const skins = [
        { id: "generic", label: "Generic", note: "Soft scales, bright eyes, and a tapered tail." },
        { id: "gardener", label: "Gardener", note: "Sunny stripes, with a straw hat by default." },
        { id: "python", label: "Python", note: "Bold saddle spots and curious, catlike eyes." },
        { id: "rattlesnake", label: "Rattlesnake", note: "Diamond markings and a little segmented rattle." },
      ];
      const sharedSkins = characterOptions("snake");
      skins.forEach(skin => { skin.label = sharedSkins[skin.id]; });
      const colors = [
        { id: "green", label: "Leaf green", shades: ["#c1e783", "#83c85c", "#55a148", "#367b3d", "#2d6337"] },
        { id: "blue", label: "Ocean blue", shades: ["#c1edff", "#71bfe8", "#438fc4", "#2d6493", "#244b70"] },
        { id: "teal", label: "Mint teal", shades: ["#b9f1d8", "#68d1b6", "#3aa890", "#277c70", "#205b55"] },
        { id: "purple", label: "Lavender", shades: ["#e5d0ff", "#b899ed", "#886ac5", "#614796", "#49376e"] },
        { id: "pink", label: "Rose pink", shades: ["#ffd4e5", "#ed98bb", "#c96493", "#98446e", "#713454"] },
        { id: "orange", label: "Coral orange", shades: ["#ffe0b7", "#f5ae76", "#d77b52", "#a5553c", "#774031"] },
        { id: "gold", label: "Golden honey", shades: ["#fff1b4", "#e9cc75", "#bf9b43", "#8e702e", "#66512a"] },
        { id: "slate", label: "Midnight slate", shades: ["#c3d2e5", "#849ab8", "#586c91", "#3c4b6b", "#2b354e"] },
      ];
      const accessories = {
        hat: [
          { id: "skin", label: "Match skin" },
          { id: "none", label: "None" },
          { id: "straw", label: "Straw hat" },
          { id: "crown", label: "Royal crown" },
          { id: "party", label: "Party hat" },
          { id: "flowers", label: "Flower crown" },
        ],
        eyewear: [
          { id: "none", label: "None" },
          { id: "round", label: "Round glasses" },
          { id: "shades", label: "Sunglasses" },
        ],
        neckwear: [
          { id: "none", label: "None" },
          { id: "bandana", label: "Red bandana" },
          { id: "bow", label: "Blue bow tie" },
          { id: "scarf", label: "Purple scarf" },
        ],
      };
      const settingsKey = "snake-garden-settings-v1";
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(settingsKey)) || {}; } catch { /* Use defaults when storage is unavailable. */ }
      const settings = applyEquippedKit("snake", {
        skin: skins.some((skin) => skin.id === saved.skin) ? saved.skin : "generic",
        color: colors.some((color) => color.id === saved.color) ? saved.color : "green",
        hat: accessories.hat.some((item) => item.id === saved.hat) ? saved.hat : "skin",
        eyewear: accessories.eyewear.some((item) => item.id === saved.eyewear) ? saved.eyewear : "none",
        neckwear: accessories.neckwear.some((item) => item.id === saved.neckwear) ? saved.neckwear : "none",
        music: saved.music === true,
        effects: saved.effects !== false,
      });
      const audio = createSnakeAudio(settings);
      let rewardSession = createRewardSession("snake");
      let rewardedApples = {};
      const unmountWallet = editorOnly ? () => {} : mountGameWallet(root, "snake");

      const directions = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };

      const rng = () => Math.random();

      const wrapper = document.createElement("div");
      wrapper.className = "snake-game";
      wrapper.dataset.editorOnly = String(editorOnly);

      const header = document.createElement("div");
      header.className = "snake-meta";

      const scoreCard = document.createElement("div");
      scoreCard.className = "snake-score";
      const scoreLabel = document.createElement("span");
      scoreLabel.textContent = "Score";
      const scoreValue = document.createElement("strong");
      scoreValue.textContent = "0";
      scoreCard.append(scoreLabel, scoreValue);

      const speedCard = document.createElement("div");
      speedCard.className = "snake-score";
      const speedLabel = document.createElement("span");
      speedLabel.textContent = "Speed";
      const speedValue = document.createElement("strong");
      speedValue.textContent = defaultDifficulty.label;
      speedCard.append(speedLabel, speedValue);

      header.append(scoreCard, speedCard);

      const status = document.createElement("p");
      status.className = "help-text";
      status.textContent =
        "Press Start to begin. Use arrow keys, WASD, or the on-screen arrows to steer.";

      const boardWrap = document.createElement("div");
      boardWrap.className = "snake-board-wrap";
      boardWrap.tabIndex = 0;
      boardWrap.setAttribute("role", "group");
      boardWrap.setAttribute("aria-label", "Snake play area. Use arrow keys or WASD to steer, and Space to pause.");

      const board = document.createElement("div");
      board.className = "snake-board";
      board.style.setProperty("--grid-size", String(config.gridSize));
      board.setAttribute("aria-hidden", "true");

      const art = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      art.classList.add("snake-art");
      art.setAttribute("viewBox", "0 0 512 512");
      art.setAttribute("role", "img");
      art.setAttribute("aria-label", "A green snake with a tapered tail and bright eyes, hunting a red apple in a garden.");
      art.innerHTML = `
        <defs>
          <linearGradient id="snake-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--snake-light)"/>
            <stop offset="0.35" stop-color="var(--snake-color)"/>
            <stop offset="0.74" stop-color="var(--snake-mid)"/>
            <stop offset="1" stop-color="var(--snake-dark)"/>
          </linearGradient>
          <linearGradient id="snake-body-color" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512">
            <stop offset="0" stop-color="var(--snake-body-light)"/>
            <stop offset="0.5" stop-color="var(--snake-body-color)"/>
            <stop offset="1" stop-color="var(--snake-body-dark)"/>
          </linearGradient>
          <linearGradient id="snake-tail-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--snake-body-light)"/>
            <stop offset="0.55" stop-color="var(--snake-body-color)"/>
            <stop offset="1" stop-color="var(--snake-dark)"/>
          </linearGradient>
          <pattern id="snake-scales" width="13" height="11" patternUnits="userSpaceOnUse">
            <path d="M-6 2Q0 10 6 2M7 2Q13 10 19 2M0-4Q6 4 13-4M0 7Q6 15 13 7"
              fill="none" stroke="var(--snake-edge)" stroke-width="0.8" opacity="0.22"/>
          </pattern>
          <pattern id="snake-markings" width="36" height="32" patternUnits="userSpaceOnUse"></pattern>
          <radialGradient id="snake-apple-skin" cx="30%" cy="25%" r="80%">
            <stop offset="0" stop-color="#ff9b7b"/>
            <stop offset="0.32" stop-color="#f45c55"/>
            <stop offset="0.72" stop-color="#d92e3d"/>
            <stop offset="1" stop-color="#9c2035"/>
          </radialGradient>
          <linearGradient id="snake-apple-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#cae57a"/><stop offset="1" stop-color="#5d9a42"/>
          </linearGradient>
        </defs>
        <g class="snake-apple">
          <ellipse cx="0" cy="13" rx="13" ry="4" fill="#081d15" opacity="0.32"/>
          <path d="M0-7C-7-14-17-8-14 3C-12 12-6 16 0 12C6 16 12 12 14 3C17-8 7-14 0-7Z"
            fill="url(#snake-apple-skin)" stroke="#852d32" stroke-width="0.8"/>
          <path d="M-8-4Q-12 1-8 6" fill="none" stroke="#ffe0b9" stroke-width="2.5"
            stroke-linecap="round" opacity="0.7"/>
          <ellipse cx="-6.5" cy="-5.5" rx="2.4" ry="1.4" fill="#fff0d7" opacity="0.75"/>
          <path d="M0-7Q-2-12 2-16" fill="none" stroke="#76533a" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M2-12Q5-20 12-16Q11-9 2-12Z" fill="url(#snake-apple-leaf)"/>
          <path d="M3-12L10-16" fill="none" stroke="#608d41" stroke-width="0.8"/>
          <path d="M-3 11Q0 9 3 11" fill="none" stroke="#9a2e38" stroke-width="1" opacity="0.65"/>
        </g>
        <g class="snake-tail-art">
          <path d="M0-12C-16-11-31-6-43 0C-31 6-16 11 0 12Z"
            fill="url(#snake-tail-skin)" stroke="var(--snake-edge)" stroke-width="1.2"/>
          <path d="M0-12C-16-11-31-6-43 0C-31 6-16 11 0 12Z" fill="url(#snake-markings)"/>
          <path d="M-3-7Q-20-7-35 0" fill="none" stroke="var(--snake-light)" stroke-width="2.5" opacity="0.45" stroke-linecap="round"/>
          <path class="snake-gardener-detail" d="M0 0H-32" fill="none" stroke="#f4e8a3" stroke-width="4" opacity="0.85"/>
          <g class="snake-rattle">
            <path d="M-29-4L-43-5Q-50 0-43 5L-29 4Z" fill="#e8ce8b" stroke="#81663e" stroke-width="1"/>
            <path d="M-33-4Q-36 0-33 4M-38-4.5Q-41 0-38 4.5M-43-4Q-46 0-43 4" fill="none" stroke="#a78850" stroke-width="1.5"/>
            <path d="M-31-2H-43" stroke="#fff0ba" stroke-width="1.2" opacity="0.8"/>
          </g>
        </g>
        <path class="snake-body-shadow" fill="none" stroke="#081d15" stroke-width="27"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.3" transform="translate(0 3)"/>
        <path class="snake-body-outline" fill="none" stroke="var(--snake-edge)" stroke-width="27"
          stroke-linecap="butt" stroke-linejoin="round"/>
        <path class="snake-body-skin" fill="none" stroke="url(#snake-body-color)" stroke-width="24"
          stroke-linecap="round" stroke-linejoin="round"/>
        <path class="snake-body-shine" fill="none" stroke="var(--snake-light)" stroke-width="11"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.3" transform="translate(0 -3)"/>
        <path class="snake-body-markings" fill="none" stroke="url(#snake-markings)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="snake-body-stripe snake-gardener-detail" fill="none" stroke="#f4e8a3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
        <path class="snake-body-stripe-center snake-gardener-detail" fill="none" stroke="var(--snake-edge)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
        <path class="snake-body-scales" fill="none" stroke="url(#snake-scales)" stroke-width="23"
          stroke-linecap="round" stroke-linejoin="round"/>
        <g class="snake-head-art">
          <g class="snake-tongue">
            <path d="M13 0H22M22 0L26-2M22 0L26 2" fill="none" stroke="#dc8290" stroke-width="1.7" stroke-linecap="round"/>
          </g>
          <path d="M-13-9C-8-15 2-16 10-11C17-9 19-5 19 0C19 6 16 10 9 12C1 16-8 15-13 9Z"
            fill="#0b2419" opacity="0.28" transform="translate(0 2.5)"/>
          <path d="M-13-9C-8-15 2-16 10-11C17-9 19-5 19 0C19 6 16 10 9 12C1 16-8 15-13 9Z"
            fill="url(#snake-skin)" stroke="var(--snake-edge)" stroke-width="1.3"/>
          <path d="M-11-8Q-7-13-1-11" fill="none" stroke="var(--snake-light)" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>
          <path d="M-10-4Q-6 0-10 4M-6-7Q-2-4-6-1M-6 2Q-2 5-6 8" fill="none" stroke="var(--snake-dark)" stroke-width="0.8" opacity="0.5"/>
          <path class="snake-patterned-detail" d="M-12-5Q-3-9-1 0Q-3 9-12 5Z" fill="var(--snake-edge)" opacity="0.35"/>
          <ellipse cx="7" cy="10" rx="3.3" ry="1.6" fill="#d4b36e" opacity="0.5"/>
          <g class="snake-eye">
            <ellipse cx="4" cy="-8" rx="5.3" ry="5.6" fill="#f6f5d6" stroke="var(--snake-dark)" stroke-width="0.7"/>
            <ellipse class="snake-pupil" cx="5.7" cy="-7.6" rx="2.5" ry="3.2" fill="#233b2a"/>
            <circle cx="6.4" cy="-8.8" r="1" fill="#fffef3"/>
          </g>
          <g class="snake-eye">
            <ellipse cx="4" cy="8" rx="5.3" ry="5.6" fill="#f6f5d6" stroke="var(--snake-dark)" stroke-width="0.7"/>
            <ellipse class="snake-pupil" cx="5.7" cy="7.6" rx="2.5" ry="3.2" fill="#233b2a"/>
            <circle cx="6.4" cy="6.4" r="1" fill="#fffef3"/>
          </g>
          <ellipse cx="14" cy="-3" rx="0.8" ry="1.1" fill="var(--snake-dark)"/>
          <ellipse cx="14" cy="3" rx="0.8" ry="1.1" fill="var(--snake-dark)"/>
          <path class="snake-mouth" d="M11 5Q14 5 15 2" fill="none" stroke="var(--snake-edge)" stroke-width="1.1" stroke-linecap="round"/>
          <g class="snake-accessory snake-neckwear-bandana">
            <g transform="translate(-12 0)">
            <path d="M-17-11Q-12-14-9-11L-9 11Q-12 14-17 11Z" fill="#ec6b6d" stroke="#9b3d50" stroke-width="0.9"/>
            <path d="M-14 9L-9 21-21 17Z" fill="#d94b5a" stroke="#9b3d50" stroke-width="0.8"/>
            <path d="M-14-8V8" stroke="#ffe0ce" stroke-width="1.5" stroke-dasharray="2 3"/>
            </g>
          </g>
          <g class="snake-accessory snake-neckwear-bow">
            <g transform="translate(-12 0)">
            <path d="M-17 0L-23-12Q-13-14-10-8L-14 0L-10 8Q-13 14-23 12Z" fill="#75c5ed" stroke="#386a9c" stroke-width="1"/>
            <path d="M-18-2L-18-8M-18 2L-18 8" stroke="#b7e8ff" stroke-width="1.4"/>
            <ellipse cx="-16" cy="0" rx="3.2" ry="3.5" fill="#4999d5" stroke="#386a9c" stroke-width="0.8"/>
            </g>
          </g>
          <g class="snake-accessory snake-neckwear-scarf">
            <g transform="translate(-12 0)">
            <path d="M-18 7L-31 13-27 19-13 12Z" fill="#af83d9" stroke="#674887" stroke-width="0.8"/>
            <path d="M-28 13L-25 18M-25 12L-22 17" stroke="#e2c1f6" stroke-width="1.3"/>
            <path d="M-18-11Q-12-15-10-10L-10 10Q-14 15-18 11Z" fill="#c69ae8" stroke="#674887" stroke-width="0.9"/>
            <path d="M-14-10V10" stroke="#e2c1f6" stroke-width="1.7"/>
            </g>
          </g>
          <g class="snake-accessory snake-hat-straw">
            <ellipse cx="-13" cy="1" rx="11" ry="17" fill="#765833" opacity="0.25"/>
            <ellipse cx="-14" cy="0" rx="10" ry="17" fill="#e7c986" stroke="#9e7846" stroke-width="0.9"/>
            <ellipse cx="-16" cy="0" rx="7" ry="11" fill="#f2dca2" stroke="#c5a165" stroke-width="0.9"/>
            <path d="M-11-10Q-7 0-11 10" fill="none" stroke="#8caa62" stroke-width="3"/>
            <path d="M-11-7Q-7-14-5-9Q-5-5-11-7Z" fill="#4f8f4a"/>
          </g>
          <g class="snake-accessory snake-hat-crown">
            <path d="M-9-10L-24-14-19-5-27 0-19 5-24 14-9 10Z" fill="#f4cc65" stroke="#a77836" stroke-width="1" stroke-linejoin="round"/>
            <path d="M-10-10V10" stroke="#ffe9a1" stroke-width="3"/>
            <circle cx="-19" cy="0" r="2.2" fill="#e47285"/>
            <circle cx="-17" cy="-8" r="1.5" fill="#6dbce1"/>
            <circle cx="-17" cy="8" r="1.5" fill="#6dbce1"/>
          </g>
          <g class="snake-accessory snake-hat-party">
            <path d="M-10-12L-30 0-10 12Q-5 0-10-12Z" fill="#a28ae5" stroke="#66539d" stroke-width="0.9"/>
            <path d="M-23-4L-21 5M-17-8L-14 9" stroke="#f3ce80" stroke-width="3"/>
            <path d="M-10-11Q-6 0-10 11" fill="none" stroke="#e7c6f5" stroke-width="2.3"/>
            <circle cx="-30" cy="0" r="3.6" fill="#f7dc9a"/>
          </g>
          <g class="snake-accessory snake-hat-flowers">
            <path d="M-12-13Q-22 0-12 13" fill="none" stroke="#417c46" stroke-width="3"/>
            <path d="M-15-6Q-23-10-21-3ZM-15 6Q-23 10-21 3Z" fill="#87b95f"/>
            <g fill="#f4b0ca" stroke="#c67999" stroke-width="0.5">
              <path d="M-12-12C-19-18-20-8-13-9C-8-4-5-13-12-12Z"/>
              <path d="M-18-2C-25-8-26 2-19 1C-14 6-11-3-18-2Z"/>
              <path d="M-12 9C-19 3-20 13-13 12C-8 17-5 8-12 9Z"/>
            </g>
            <g fill="#ffe59c"><circle cx="-13" cy="-11" r="1.8"/><circle cx="-19" cy="0" r="1.8"/><circle cx="-13" cy="11" r="1.8"/></g>
          </g>
          <g class="snake-accessory snake-eyewear-round">
            <g fill="#a2ddf5" fill-opacity="0.18" stroke="#684f48" stroke-width="1.3">
              <ellipse cx="5" cy="-8" rx="6.2" ry="6"/><ellipse cx="5" cy="8" rx="6.2" ry="6"/>
            </g>
            <path d="M5-2V2M-1-10L-7-11M-1 10L-7 11" fill="none" stroke="#684f48" stroke-width="1.3"/>
            <path d="M2-11L5-13M2 5L5 3" stroke="#fff" stroke-width="1.2" opacity="0.65"/>
          </g>
          <g class="snake-accessory snake-eyewear-shades">
            <path d="M-1-13H11V-7Q11-1 5-2Q-1-2-1-7ZM-1 13H11V7Q11 1 5 2Q-1 2-1 7Z" fill="#243648" stroke="#141f2d" stroke-width="1.2"/>
            <path d="M5-2V2M0-11H-6M0 11H-6" stroke="#141f2d" stroke-width="1.7"/>
            <path d="M2-10H8M2 6H8" stroke="#a5d3e7" stroke-width="1.5" opacity="0.65"/>
          </g>
        </g>`;
      const appleArt = art.querySelector(".snake-apple");
      const headArt = art.querySelector(".snake-head-art");
      const tailArt = art.querySelector(".snake-tail-art");
      const bodyPaths = art.querySelectorAll(".snake-body-shadow, .snake-body-outline, .snake-body-skin, .snake-body-shine, .snake-body-scales, .snake-body-markings, .snake-body-stripe, .snake-body-stripe-center");

      const countdown = document.createElement("div");
      countdown.className = "snake-countdown";
      countdown.setAttribute("aria-live", "polite");
      countdown.hidden = true;
      const countdownText = document.createElement("span");
      countdown.appendChild(countdownText);

      const cells = [];
      for (let i = 0; i < config.gridSize * config.gridSize; i += 1) {
        const cell = document.createElement("div");
        cell.className = "snake-cell";
        cell.classList.toggle("is-dark", (i % config.gridSize + Math.floor(i / config.gridSize)) % 2 === 1);
        board.appendChild(cell);
        cells.push(cell);
      }

      boardWrap.append(board, art, countdown);

      const controls = document.createElement("div");
      controls.className = "snake-controls";

      const difficultyLabel = document.createElement("label");
      difficultyLabel.className = "range-select";
      const difficultyText = document.createElement("span");
      difficultyText.textContent = "Difficulty";
      const difficultySelect = document.createElement("select");
      difficultySelect.name = "difficulty";
      difficultySelect.setAttribute("aria-label", "Snake difficulty");
      difficulties.forEach((difficulty) => {
        const option = document.createElement("option");
        option.value = difficulty.id;
        option.textContent = difficulty.label;
        if (difficulty.id === defaultDifficulty.id) {
          option.selected = true;
        }
        difficultySelect.appendChild(option);
      });
      difficultyLabel.append(difficultyText, difficultySelect);

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      const pauseBtn = document.createElement("button");
      pauseBtn.type = "button";
      pauseBtn.textContent = "Pause";
      pauseBtn.disabled = true;

      controls.append(difficultyLabel, startBtn, pauseBtn);

      const customization = document.createElement("fieldset");
      customization.className = "snake-customization";
      const customizationTitle = document.createElement("legend");
      customizationTitle.textContent = "Customize your snake";

      const skinLabel = document.createElement("label");
      skinLabel.className = "range-select";
      const skinLabelText = document.createElement("span");
      skinLabelText.textContent = "Skin";
      const skinSelect = document.createElement("select");
      skinSelect.setAttribute("aria-label", "Snake skin");
      skins.forEach((skin) => {
        const option = document.createElement("option");
        option.value = skin.id;
        option.textContent = skin.label;
        skinSelect.appendChild(option);
      });
      skinSelect.value = settings.skin;
      const skinNote = document.createElement("p");
      skinNote.className = "snake-setting-note";
      skinNote.id = "snake-skin-note";
      skinSelect.setAttribute("aria-describedby", skinNote.id);
      skinLabel.append(skinLabelText, skinSelect);

      const colorGroup = document.createElement("fieldset");
      colorGroup.className = "snake-color-group";
      const colorLegend = document.createElement("legend");
      const colorName = document.createElement("span");
      colorLegend.append("Color ", colorName);
      const colorGrid = document.createElement("div");
      colorGrid.className = "snake-color-grid";
      colors.forEach((color) => {
        const label = document.createElement("label");
        label.className = "snake-color-choice";
        label.title = color.label;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "snake-color";
        input.value = color.id;
        input.checked = color.id === settings.color;
        input.setAttribute("aria-label", color.label);
        const swatch = document.createElement("span");
        swatch.className = "snake-color-swatch";
        swatch.style.setProperty("--swatch", color.shades[1]);
        swatch.setAttribute("aria-hidden", "true");
        input.addEventListener("change", () => {
          if (!input.checked) return;
          settings.color = input.value;
          getArcadeWallet().equip(null, "snake");
          applyAppearance();
          persistSettings();
        });
        label.append(input, swatch);
        colorGrid.appendChild(label);
      });
      colorGroup.append(colorLegend, colorGrid);

      const accessoryGroup = document.createElement("fieldset");
      accessoryGroup.className = "snake-accessories";
      const accessoryLegend = document.createElement("legend");
      accessoryLegend.textContent = "Accessories";
      const accessoryNote = document.createElement("p");
      accessoryNote.className = "snake-setting-note";
      accessoryNote.textContent = "Mix hats, glasses, and neckwear with any skin.";
      const accessoryFields = document.createElement("div");
      accessoryFields.className = "snake-accessory-fields";
      Object.entries(accessories).forEach(([key, choices]) => {
        const label = document.createElement("label");
        label.className = "range-select";
        const title = document.createElement("span");
        title.textContent = { hat: "Hat", eyewear: "Eyewear", neckwear: "Neckwear" }[key];
        const select = document.createElement("select");
        select.setAttribute("aria-label", `Snake ${key}`);
        choices.forEach((choice) => {
          const option = document.createElement("option");
          option.value = choice.id;
          option.textContent = choice.label;
          select.appendChild(option);
        });
        select.value = settings[key];
        select.addEventListener("change", () => {
          settings[key] = select.value;
          applyAppearance();
          persistSettings();
        });
        label.append(title, select);
        accessoryFields.appendChild(label);
      });
      accessoryGroup.append(accessoryLegend, accessoryNote, accessoryFields);

      const soundGroup = document.createElement("fieldset");
      soundGroup.className = "snake-sound-group";
      const soundLegend = document.createElement("legend");
      soundLegend.textContent = "Audio";
      const soundButtons = document.createElement("div");
      soundButtons.className = "snake-sound-buttons";
      const musicButton = document.createElement("button");
      const effectsButton = document.createElement("button");
      musicButton.type = effectsButton.type = "button";
      soundButtons.append(musicButton, effectsButton);
      const soundNote = document.createElement("p");
      soundNote.className = "snake-setting-note";
      soundNote.textContent = "A mellow garden tune while you play, with bites, turns, and countdown sounds.";
      soundGroup.append(soundLegend, soundButtons, soundNote);
      const savedNote = document.createElement("p");
      savedNote.className = "snake-setting-note";
      savedNote.textContent = "Changes apply instantly and are saved in this browser.";
      customization.append(customizationTitle, skinLabel, skinNote, colorGroup, accessoryGroup, soundGroup, savedNote);

      const pad = document.createElement("div");
      pad.className = "snake-pad";

      const createPadButton = (label, dirKey, title) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "snake-pad-btn";
        button.dataset.dir = dirKey;
        button.setAttribute("aria-label", title);
        button.textContent = label;
        button.addEventListener("click", () => {
          handleDirectionInput(dirKey);
          boardWrap.focus({ preventScroll: true });
        });
        return button;
      };

      pad.append(
        createPadButton("↑", "up", "Move up"),
        createPadButton("←", "left", "Move left"),
        createPadButton("→", "right", "Move right"),
        createPadButton("↓", "down", "Move down")
      );

      const playArea = document.createElement("div");
      playArea.className = "snake-play-area";
      const playfield = document.createElement("div");
      playfield.className = "snake-playfield";
      playfield.append(boardWrap, controls, pad);
      playArea.append(playfield, customization);
      wrapper.append(header, status, playArea);
      root.appendChild(wrapper);
      if (!editorOnly) {
        customization.hidden = true;
        const link = document.createElement("a"); link.className = "arcade-editor-link"; link.href = "#characters/snake"; link.textContent = "Customize your snake"; controls.append(link);
        playfield.append(soundGroup);
      } else boardWrap.tabIndex = -1;

      let difficultyId = defaultDifficulty.id;
      let state = createInitialState(getDifficulty(difficultyId));
      let queuedDirection = state.direction;
      let tickId = null;
      let countdownId = null;
      let countdownTimeout = null;
      let animationFrameId = null;
      let motionFrom = state.snake.map(pointAt);
      let motionTo = motionFrom;
      let motionTailFrom = motionFrom[motionFrom.length - 2];
      let motionTailTo = motionTailFrom;
      let motionStarted = performance.now();
      let motionDuration = state.speedMs;
      let motionAngleFrom = 0;
      let motionAngleTo = 0;
      let motionEatenApple = null;
      let animationPausedAt = null;

      applyAppearance();
      updateSoundButtons();
      render();
      updateUI();

      startBtn.addEventListener("click", () => {
        if (state.phase === "ready") {
          startCountdown();
        } else {
          resetGame(true);
        }
      });

      pauseBtn.addEventListener("click", () => {
        togglePause();
        boardWrap.focus({ preventScroll: true });
      });

      skinSelect.addEventListener("change", () => {
        settings.skin = skinSelect.value;
        applyAppearance();
        persistSettings();
      });

      musicButton.addEventListener("click", () => {
        settings.music = !settings.music;
        audio.setMusic(settings.music);
        updateSoundButtons();
        persistSettings();
      });

      effectsButton.addEventListener("click", () => {
        settings.effects = !settings.effects;
        audio.setEffects(settings.effects);
        if (settings.effects) audio.effect("turn");
        updateSoundButtons();
        persistSettings();
      });

      difficultySelect.addEventListener("change", () => {
        difficultyId = difficultySelect.value;
        const difficulty = getDifficulty(difficultyId);
        state = { ...state, speedMs: difficulty.speedMs, difficulty: difficulty.id };
        if (state.phase === "running") {
          startTimer();
        }
        updateUI();
      });

      const handleKeydown = (event) => {
        if (editorOnly) return;
        if (event.target instanceof Element && event.target.closest("input, select, textarea")) return;
        const key = event.key.toLowerCase();
        const dirKey = {
          arrowup: "up",
          w: "up",
          arrowdown: "down",
          s: "down",
          arrowleft: "left",
          a: "left",
          arrowright: "right",
          d: "right",
        }[key];

        if (dirKey) {
          event.preventDefault();
          handleDirectionInput(dirKey);
          return;
        }

        if (event.code === "Space") {
          if (event.target instanceof Element && event.target.closest("button")) return;
          if (state.phase === "running" || state.phase === "paused") {
            event.preventDefault();
            togglePause();
          }
        }
      };

      window.addEventListener("keydown", handleKeydown);
      boardWrap.addEventListener("pointerdown", () => boardWrap.focus({ preventScroll: true }));

      function persistSettings() {
        try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { /* The game also works without storage. */ }
      }

      function updateSoundButtons() {
        musicButton.textContent = `Music: ${settings.music ? "On" : "Off"}`;
        effectsButton.textContent = `Sound FX: ${settings.effects ? "On" : "Off"}`;
        musicButton.setAttribute("aria-pressed", String(settings.music));
        effectsButton.setAttribute("aria-pressed", String(settings.effects));
      }

      function applyAppearance() {
        const skin = skins.find((entry) => entry.id === settings.skin);
        const color = colors.find((entry) => entry.id === settings.color);
        wrapper.dataset.skin = skin.id;
        wrapper.dataset.color = color.id;
        const hat = settings.hat === "skin" ? (skin.id === "gardener" ? "straw" : "none") : settings.hat;
        wrapper.dataset.hat = hat;
        wrapper.dataset.eyewear = settings.eyewear;
        wrapper.dataset.neckwear = settings.neckwear;
        skinNote.textContent = skin.note;
        colorName.textContent = color.label;
        ["light", "color", "mid", "dark", "edge"].forEach((name, index) => {
          art.style.setProperty(`--snake-${name}`, color.shades[index]);
        });
        // Preserve the original green skin's soft body shading.
        const bodyColors = color.id === "green" ? ["#a8d974", "#79ba54", "#4b9344"] : [color.shades[0], color.shades[1], color.shades[2]];
        ["light", "color", "dark"].forEach((name, index) => {
          art.style.setProperty(`--snake-body-${name}`, bodyColors[index]);
        });
        const markings = art.querySelector("#snake-markings");
        if (skin.id === "python") {
          markings.innerHTML = `<path d="M2 7Q7-2 14 5L18 11Q26 8 28 16Q27 25 18 22L11 27Q3 26 5 19Z" fill="var(--snake-edge)" stroke="var(--snake-light)" stroke-width="1.4" opacity="0.65"/>
            <ellipse cx="33" cy="2" rx="4" ry="5" fill="var(--snake-edge)" opacity="0.5"/>`;
        } else if (skin.id === "rattlesnake") {
          markings.innerHTML = `<path d="M18 1L31 16 18 31 5 16Z" fill="var(--snake-edge)" stroke="#f4e8bd" stroke-width="1.8" opacity="0.8"/>
            <path d="M18 8L25 16 18 24 11 16Z" fill="var(--snake-dark)" opacity="0.6"/>`;
        } else {
          markings.replaceChildren();
        }
        art.querySelectorAll(".snake-pupil").forEach((pupil) => {
          pupil.setAttribute("rx", skin.id === "python" || skin.id === "rattlesnake" ? "1.4" : "2.5");
        });
        const wornAccessories = [
          hat === "none" ? null : accessories.hat.find((item) => item.id === hat).label.toLowerCase(),
          settings.eyewear === "none" ? null : accessories.eyewear.find((item) => item.id === settings.eyewear).label.toLowerCase(),
          settings.neckwear === "none" ? null : accessories.neckwear.find((item) => item.id === settings.neckwear).label.toLowerCase(),
        ].filter(Boolean);
        const accessoryDescription = wornAccessories.length ? `, wearing ${wornAccessories.join(", ")},` : "";
        art.setAttribute("aria-label", `A ${color.label.toLowerCase()} ${skin.label.toLowerCase()} snake${accessoryDescription} hunting a red apple in a garden.`);
        onAppearanceChange?.({ ...settings, palette: [...color.shades], resolvedHat: hat, portrait2D(host) {
          const portrait = document.createElement("div"); portrait.className = "snake-game arcade-snake-portrait";
          for (const name of ["skin", "color", "hat", "eyewear", "neckwear"]) portrait.dataset[name] = wrapper.dataset[name];
          const sprite = art.cloneNode(true); sprite.querySelector(".snake-apple").remove();
          sprite.setAttribute("viewBox", "170 210 195 125");
          sprite.setAttribute("aria-label", `Your customized ${skin.label.toLowerCase()} snake in the game's original artwork`);
          // Keep the hidden game's gradients separate from the visible portrait.
          sprite.querySelectorAll("[id]").forEach(node => { node.id = `portrait-${node.id}`; });
          sprite.querySelectorAll("*").forEach(node => {
            for (const attr of [...node.attributes]) if (attr.value.includes("url(#")) node.setAttribute(attr.name, attr.value.replace(/url\(#([^)]*)\)/g, "url(#portrait-$1)"));
          });
          portrait.append(sprite); host.append(portrait);
        } });
      }

      function handleDirectionInput(dirKey) {
        if (!directions[dirKey]) return;
        if (state.phase === "over" || state.phase === "won") return;
        if (state.phase === "ready") startCountdown();
        queueDirection(dirKey);
      }

      function queueDirection(dirKey) {
        const next = directions[dirKey];
        if (!next || isOpposite(next, state.direction)) return;
        queuedDirection = next;
      }

      function isOpposite(a, b) {
        return a.x === -b.x && a.y === -b.y;
      }

      function getDifficulty(id) {
        return difficulties.find((entry) => entry.id === id) ?? defaultDifficulty;
      }

      function createInitialState(difficulty = defaultDifficulty) {
        const snake = createStartSnake(config.gridSize, config.startLength);
        const food = spawnFood(config.gridSize, snake, rng);
        return {
          snake,
          direction: directions.right,
          food,
          score: 0,
          speedMs: difficulty.speedMs,
          difficulty: difficulty.id,
          phase: "ready",
        };
      }

      function createStartSnake(gridSize, length) {
        const centerY = Math.floor(gridSize / 2);
        const headX = Math.floor(gridSize / 2) + Math.floor(length / 2) - 1;
        const snake = [];
        for (let i = 0; i < length; i += 1) {
          snake.push((headX - i) + centerY * gridSize);
        }
        return snake;
      }

      function spawnFood(gridSize, snake, randomFn) {
        const total = gridSize * gridSize;
        const occupied = new Set(snake);
        const available = total - occupied.size;
        if (available <= 0) return null;
        const target = Math.floor(randomFn() * available);
        let count = -1;
        for (let i = 0; i < total; i += 1) {
          if (occupied.has(i)) continue;
          count += 1;
          if (count === target) return i;
        }
        return null;
      }

      function startTimer() {
        stopTimer();
        tickId = window.setInterval(tick, state.speedMs);
      }

      function stopTimer() {
        if (tickId) {
          window.clearInterval(tickId);
          tickId = null;
        }
      }

      function startGame() {
        if (state.phase === "running") return;
        state = { ...state, phase: "running" };
        startTimer();
        updateUI();
      }

      function resetGame(autoStart = false) {
        rewardSession = createRewardSession("snake");
        rewardedApples = {};
        stopTimer();
        clearCountdown();
        stopAnimation();
        audio.setPlaying(false);
        const difficulty = getDifficulty(difficultyId);
        difficultySelect.value = difficulty.id;
        state = createInitialState(difficulty);
        queuedDirection = state.direction;
        resetArtwork();
        if (autoStart) {
          startCountdown();
        }
        render();
        updateUI();
      }

      function togglePause() {
        if (state.phase === "running") {
          animationPausedAt = performance.now();
          drawArtwork(getMotion(animationPausedAt));
          stopAnimation();
          stopTimer();
          state = { ...state, phase: "paused" };
        } else if (state.phase === "paused") {
          const paused = getMotion(animationPausedAt);
          motionFrom = paused.points;
          motionTailFrom = paused.points[paused.points.length - 2];
          motionAngleFrom = paused.angle;
          motionStarted = performance.now();
          motionDuration = state.speedMs;
          animationPausedAt = null;
          state = { ...state, phase: "running" };
          startTimer();
          startAnimation();
        }
        updateUI();
      }

      function startCountdown() {
        if (state.phase === "countdown") return;
        clearCountdown();
        audio.unlock();
        boardWrap.focus({ preventScroll: true });
        state = { ...state, phase: "countdown" };
        let remaining = 3;
        updateCountdownDisplay(remaining);
        audio.effect("count");
        updateUI();
        countdownId = window.setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            window.clearInterval(countdownId);
            countdownId = null;
            countdownText.textContent = "GO!";
            countdown.classList.add("is-go");
            audio.effect("go");
            countdownTimeout = window.setTimeout(() => {
              clearCountdown();
              startGame();
            }, 500);
          } else {
            updateCountdownDisplay(remaining);
            audio.effect("count");
          }
        }, 1000);
      }

      function updateCountdownDisplay(value) {
        countdownText.textContent = String(value);
        countdown.classList.remove("is-go");
        countdown.hidden = false;
      }

      function clearCountdown() {
        if (countdownId) {
          window.clearInterval(countdownId);
          countdownId = null;
        }
        if (countdownTimeout) {
          window.clearTimeout(countdownTimeout);
          countdownTimeout = null;
        }
        countdown.hidden = true;
        countdown.classList.remove("is-go");
      }

      function tick() {
        if (state.phase !== "running") return;
        const now = performance.now();
        const previousVisual = getMotion(now);
        const previousFood = state.food;
        const previousScore = state.score;
        const previousDirection = state.direction;
        state = stepState(state, queuedDirection);
        if (state.score > previousScore) {
          rewardedApples[state.difficulty] = (rewardedApples[state.difficulty] || 0) + state.score - previousScore;
          rewardSession.award({ applesByDifficulty: rewardedApples });
        }
        queuedDirection = state.direction;
        motionFrom = previousVisual.points;
        motionTo = state.snake.map(pointAt);
        motionTailFrom = previousVisual.points[previousVisual.points.length - 2];
        motionTailTo = motionTo[motionTo.length - 2];
        motionAngleFrom = previousVisual.angle;
        const angle = Math.atan2(state.direction.y, state.direction.x) * 180 / Math.PI;
        const turn = ((angle - motionAngleFrom + 540) % 360 + 360) % 360 - 180;
        motionAngleTo = motionAngleFrom + turn;
        motionEatenApple = state.score > previousScore ? previousFood : null;
        motionStarted = now;
        motionDuration = state.speedMs;
        render();
        updateUI();
        startAnimation();
        if (state.phase === "over" || state.phase === "won") {
          stopTimer();
          audio.effect(state.phase === "won" ? "win" : "crash");
        } else if (state.score > previousScore) {
          audio.effect("eat");
        } else if (state.direction !== previousDirection) {
          audio.effect("turn");
        }
      }

      function stepState(current, nextDirection) {
        const direction = isOpposite(nextDirection, current.direction)
          ? current.direction
          : nextDirection;
        const head = current.snake[0];
        const headX = head % config.gridSize;
        const headY = Math.floor(head / config.gridSize);
        const nextX = headX + direction.x;
        const nextY = headY + direction.y;

        if (
          nextX < 0 ||
          nextX >= config.gridSize ||
          nextY < 0 ||
          nextY >= config.gridSize
        ) {
          return { ...current, direction, phase: "over" };
        }

        const nextIndex = nextY * config.gridSize + nextX;
        const snakeSet = new Set(current.snake);
        const tail = current.snake[current.snake.length - 1];
        const willEat = nextIndex === current.food;
        const hitSelf = snakeSet.has(nextIndex) && !(!willEat && nextIndex === tail);
        if (hitSelf) {
          return { ...current, direction, phase: "over" };
        }

        const nextSnake = [nextIndex, ...current.snake];
        if (!willEat) nextSnake.pop();

        let nextFood = current.food;
        let nextScore = current.score;
        let nextPhase = current.phase;
        if (willEat) {
          nextScore += 1;
          nextFood = spawnFood(config.gridSize, nextSnake, rng);
          if (nextFood === null) {
            nextPhase = "won";
          }
        }

        return {
          ...current,
          snake: nextSnake,
          direction,
          food: nextFood,
          score: nextScore,
          phase: nextPhase,
        };
      }

      function pointAt(index) {
        return {
          x: (index % config.gridSize + 0.5) * 32,
          y: (Math.floor(index / config.gridSize) + 0.5) * 32,
        };
      }

      function resetArtwork() {
        motionFrom = state.snake.map(pointAt);
        motionTo = motionFrom;
        motionTailFrom = motionFrom[motionFrom.length - 2];
        motionTailTo = motionTailFrom;
        motionAngleFrom = motionAngleTo = 0;
        motionStarted = performance.now();
        motionDuration = state.speedMs;
        motionEatenApple = null;
        animationPausedAt = null;
      }

      function getMotion(now) {
        const time = animationPausedAt ?? now;
        const progress = Math.max(0, Math.min(1, (time - motionStarted) / motionDuration));
        const interpolate = (from, to) => ({
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        });
        const points = motionTo.map((target, index) => interpolate(motionFrom[index] ?? motionFrom[motionFrom.length - 1], target));
        // When an apple adds a segment, the tail stays put while the neck grows.
        points[points.length - 2] = interpolate(motionTailFrom, motionTailTo);
        const turn = Math.min(1, progress * 1.6);
        const easedTurn = turn * turn * (3 - 2 * turn);
        return { points, progress, angle: motionAngleFrom + (motionAngleTo - motionAngleFrom) * easedTurn };
      }

      function startAnimation() {
        if (animationFrameId !== null) return;
        animationFrameId = window.requestAnimationFrame(animate);
      }

      function stopAnimation() {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      function animate(now) {
        animationFrameId = null;
        const motion = getMotion(now);
        drawArtwork(motion);
        if (state.phase === "running" || (state.phase !== "paused" && motion.progress < 1)) {
          animationFrameId = window.requestAnimationFrame(animate);
        }
      }

      function render() {
        cells.forEach((cell) => {
          cell.classList.remove(
            "snake",
            "snake-head",
            "snake-body",
            "snake-tail",
            "snake-food"
          );
        });
        state.snake.forEach((index, idx) => {
          const cell = cells[index];
          if (!cell) return;
          cell.classList.add("snake");
          if (idx === 0) {
            cell.classList.add("snake-head");
          } else {
            cell.classList.add("snake-body");
          }
          if (idx === state.snake.length - 1) {
            cell.classList.add("snake-tail");
          }
        });
        if (state.food !== null && cells[state.food]) {
          cells[state.food].classList.add("snake-food");
        }

        drawArtwork(getMotion(performance.now()));
      }

      function drawArtwork(motion) {
        const points = motion.points.slice(0, -1).reverse();
        let path = `M${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length - 1; i += 1) {
          const point = points[i];
          const next = points[i + 1];
          path += `Q${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
        }
        const head = motion.points[0];
        path += `L${head.x} ${head.y}`;
        bodyPaths.forEach((bodyPath) => bodyPath.setAttribute("d", path));
        headArt.setAttribute("transform", `translate(${head.x} ${head.y}) rotate(${motion.angle})`);
        const tail = motion.points[motion.points.length - 1];
        const tailRoot = motion.points[motion.points.length - 2];
        const tailAngle = Math.atan2(tailRoot.y - tail.y, tailRoot.x - tail.x) * 180 / Math.PI;
        tailArt.setAttribute("transform", `translate(${tailRoot.x} ${tailRoot.y}) rotate(${tailAngle})`);
        const eating = motionEatenApple !== null && motion.progress < 0.65;
        const foodIndex = eating ? motionEatenApple : state.food;
        appleArt.style.display = foodIndex === null ? "none" : "";
        if (foodIndex !== null) {
          const apple = pointAt(foodIndex);
          const scale = eating ? 1 - Math.max(0, motion.progress - 0.25) / 0.4 * 0.9 : 1;
          appleArt.setAttribute("transform", `translate(${apple.x} ${apple.y}) scale(${scale})`);
        }
      }

      function updateUI() {
        wrapper.dataset.phase = state.phase;
        audio.setPlaying(state.phase === "running" || state.phase === "countdown");
        const difficulty = getDifficulty(state.difficulty);
        scoreValue.textContent = String(state.score);
        speedValue.textContent = difficulty.label;
        if (state.phase === "ready") {
          status.textContent =
            "Press Start to begin. Use arrow keys, WASD, or the on-screen arrows to steer.";
        } else if (state.phase === "countdown") {
          status.textContent = "Get ready... Snake launches in 3 seconds.";
        } else if (state.phase === "running") {
          status.textContent = "Eat the apples, avoid the walls, and don't bite yourself.";
        } else if (state.phase === "paused") {
          status.textContent = "Paused. Press Resume or Space to continue.";
        } else if (state.phase === "won") {
          status.textContent = `You cleared the board! Final score: ${state.score}.`;
        } else {
          status.textContent = `Game over. Final score: ${state.score}.`;
        }

        startBtn.textContent = state.phase === "ready" ? "Start" : "Restart";
        pauseBtn.textContent = state.phase === "paused" ? "Resume" : "Pause";
        pauseBtn.disabled =
          state.phase === "ready" ||
          state.phase === "countdown" ||
          state.phase === "over" ||
          state.phase === "won";
        startBtn.disabled = state.phase === "countdown";
      }

      return () => {
        stopTimer();
        clearCountdown();
        stopAnimation();
        audio.dispose();
        unmountWallet();
        window.removeEventListener("keydown", handleKeydown);
        wrapper.remove();
      };
    },
  },
  {
    id: "runway",
    name: "Runway Glide",
    summary: "Fly four aircraft through eight 3D landing approaches.",
    description:
      "Take the controls of a passenger jet, cargo aircraft, bush plane, or military fighter. Follow tower guidance through crosswinds, night arrivals, and an extreme aircraft-carrier landing.",
    logo: "assets/runway-glide-cover.png",
    init: createRunwayGlide,
  },
  {
    id: "freeflight",
    name: "Free Flight",
    summary: "Open skies, endless exploring. Fly your own way.",
    description:
      "Fly a passenger jet, cargo aircraft, bush plane, or fighter through an open 3D world of coastlines, forests, and mountains. Find optional runways, stop for a while, and take off again. No missions. No time limit.",
    logo: "assets/free-flight-cover.png",
    init: createFreeFlightGame,
  },
  {
    id: "rocket",
    name: "Rocket Boost",
    summary: "Build, launch, orbit, and return. 3D spaceflight (Beta).",
    description: "Pilot a custom launch vehicle from Earth into space. Manage power and staging, protect your crew or cargo, and return through the atmosphere across six missions or free play.",
    logo: "assets/rocket-boost-cover.png",
    init: createRocketBoost,
  },
  {
    id: "switchyard",
    name: "Switchyard Signals",
    summary: "Route little trains. Bring every passenger home.",
    description:
      "Run a colorful railway across six districts. Set junctions, watch the signals, and deliver passengers safely from the overhead map or any train's first-person cab.",
    logo: "assets/switchyard-signals-cover.svg",
    init: createSwitchyardSignals,
  },
  {
    id: "redlight",
    name: "Red Light Green Light",
    summary: "Sprint to the finish without moving on red.",
    description:
      "Hold to sprint across the track, but freeze the instant the stoplight turns red. Reach the finish line without getting caught!",
    logo: "assets/redlight-cover.png",
    init: createRedLightGreenLight,
  },
  {
    id: "memory",
    name: "Memory Loop",
    summary: "Beautiful pictures. Perfect pairs. A friendly rivalry.",
    description:
      "Turn over illustrated cards and find the pairs. Play solo, share the table with friends, or challenge four computer levels to earn coins for your collection.",
    logo: "assets/archery-cover.png",
    init: createMemoryLoop,
  },
  {
    id: "tower",
    name: "Tower Stack",
    summary: "Drop moving blocks to build the tallest tower.",
    description:
      "Time your drops to stack each moving block on the tower. Perfect overlaps keep your tower wide—misses shave it down until it topples.",
    logo: "assets/tower-stack-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "tower-game";
      wrapper.dataset.phase = "ready";

      const status = document.createElement("div");
      status.className = "tower-status";
      status.setAttribute("role", "status");
      status.textContent = "Click start to build your tower.";

      const stats = document.createElement("div");
      stats.className = "tower-stats";

      const heightBadge = document.createElement("span");
      heightBadge.className = "badge tower-height";
      heightBadge.textContent = "Height: 0";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge tower-best";
      bestBadge.textContent = "Best: 0";

      stats.append(heightBadge, bestBadge);

      const field = document.createElement("div");
      field.className = "tower-field";
      field.setAttribute("aria-label", "Tower building area. Tap to drop the moving block.");
      const scenery = document.createElement("div");
      scenery.className = "tower-scenery";
      scenery.setAttribute("aria-hidden", "true");
      scenery.innerHTML = `<div class="tower-sun"></div><div class="tower-cloud tower-cloud-one"></div><div class="tower-cloud tower-cloud-two"></div><svg class="tower-skyline" viewBox="0 0 600 180" preserveAspectRatio="none"><path fill="#679394" opacity=".22" d="M0 180V100H30V70H55V105H90V40H115V75H140V115H170V80H195V130H230V95H260V120H295V55H320V90H355V35H380V110H410V65H440V95H470V45H495V115H530V85H565V105H600V180Z"/><path fill="#406f79" opacity=".22" d="M0 180V140H45V115H75V155H125V125H155V150H210V110H240V145H290V130H335V155H375V120H410V145H460V105H490V150H545V130H575V155H600V180Z"/></svg>`;
      const fieldHeading = document.createElement("div");
      fieldHeading.className = "tower-field-heading";
      fieldHeading.innerHTML = '<span>BUILD YOUR SKYLINE</span><strong>One block at a time.</strong>';
      const preview = document.createElement("div");
      preview.className = "tower-preview";
      preview.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 6; i++) {
        const slab = document.createElement("i");
        slab.className = "tower-block";
        slab.style.cssText = `--block-hue:${195-i*14};width:${78-i*7}%;left:${11+i*3.5}%;bottom:${i*28}px`;
        preview.appendChild(slab);
      }
      field.append(scenery, fieldHeading, preview);

      const tower = document.createElement("div");
      tower.className = "tower-stack";
      field.appendChild(tower);

      const controls = document.createElement("div");
      controls.className = "tower-controls";

      const heightChoices = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000];
      const defaultMaxLayers = 10;
      const difficultyPresets = {
        easy: { id: "easy", label: "Easy", baseWidth: 0.92 },
        medium: { id: "medium", label: "Medium", baseWidth: 0.85 },
        hard: { id: "hard", label: "Hard", baseWidth: 0.75 },
        expert: { id: "expert", label: "Expert", baseWidth: 0.6 },
      };
      const defaultDifficulty = difficultyPresets.medium.id;
      const speedPresets = {
        slow: { id: "slow", label: "Slow", speed: 0.45 },
        medium: { id: "medium", label: "Medium", speed: 0.6 },
        fast: { id: "fast", label: "Fast", speed: 0.85 },
        nitro: { id: "nitro", label: "Nitro", speed: 1.1 },
      };
      const defaultSpeed = speedPresets.medium.id;

      const heightGroup = document.createElement("label");
      heightGroup.className = "tower-select";
      const heightLabel = document.createElement("span");
      heightLabel.textContent = "Tower cap";
      const heightSelect = document.createElement("select");
      heightSelect.setAttribute("aria-label", "Tower height limit");
      heightChoices.forEach((value) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = `${value} blocks`;
        heightSelect.appendChild(option);
      });
      const infiniteOption = document.createElement("option");
      infiniteOption.value = "__infinite";
      infiniteOption.textContent = "Infinite";
      heightSelect.appendChild(infiniteOption);
      heightGroup.append(heightLabel, heightSelect);

      const difficultyGroup = document.createElement("label");
      difficultyGroup.className = "tower-select";
      const difficultyLabel = document.createElement("span");
      difficultyLabel.textContent = "Difficulty";
      const difficultySelect = document.createElement("select");
      difficultySelect.setAttribute("aria-label", "Difficulty");
      Object.values(difficultyPresets).forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        difficultySelect.appendChild(option);
      });
      difficultyGroup.append(difficultyLabel, difficultySelect);

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      const dropBtn = document.createElement("button");
      dropBtn.type = "button";
      dropBtn.className = "tower-drop-btn";
      dropBtn.textContent = "Drop";
      dropBtn.disabled = true;

      const speedGroup = document.createElement("label");
      speedGroup.className = "tower-select";
      const speedLabel = document.createElement("span");
      speedLabel.textContent = "Speed";
      const speedSelect = document.createElement("select");
      speedSelect.setAttribute("aria-label", "Block speed");
      Object.values(speedPresets).forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        speedSelect.appendChild(option);
      });
      speedGroup.append(speedLabel, speedSelect);

      controls.append(heightGroup, difficultyGroup, speedGroup, startBtn, dropBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.innerHTML = '<kbd>SPACE</kbd><span>Press Space, tap the scene, or use Drop. Only the overlapping part stays.</span>';

      wrapper.append(status, stats, field, controls, help);
      root.appendChild(wrapper);

      const config = {
        blockHeight: 28,
        speedIncrement: 0.055,
        maxSpeed: 1.6,
        minOverlap: 0.045,
        defaultMaxLayers,
        heightChoices,
      };

      const state = {
        stack: [],
        activeBlock: null,
        direction: 1,
        speed: speedPresets[defaultSpeed].speed,
        running: false,
        readyForDrop: false,
        animationId: null,
        spawnTimeout: null,
        lastTimestamp: 0,
        bestHeight: 0,
        fieldWidth: 0,
        fieldHeight: 0,
        viewOffset: 0,
        maxLayers: config.defaultMaxLayers,
        difficulty: defaultDifficulty,
        baseWidthRatio: difficultyPresets[defaultDifficulty].baseWidth,
        speedMode: defaultSpeed,
      };

      startBtn.addEventListener("click", () => {
        startGame();
      });

      dropBtn.addEventListener("pointerdown", () => {
        dropBlock();
      });

      field.addEventListener("pointerdown", () => {
        dropBlock();
      });

      const handleKey = (event) => {
        if (event.code !== "Space" && event.key !== " ") return;
        event.preventDefault();
        dropBlock();
      };

      const handleResize = () => {
        measureField();
        state.stack.forEach(updateBlockVisuals);
        if (state.activeBlock) updateBlockVisuals(state.activeBlock);
      };

      const handleHeightChange = () => {
        syncMaxLayersFromSelect();
        updateTowerView();
        if (
          state.running &&
          Number.isFinite(state.maxLayers) &&
          state.stack.length - 1 >= state.maxLayers
        ) {
          handleVictory();
        }
      };

      heightSelect.addEventListener("change", handleHeightChange);

      const handleDifficultyChange = () => {
        const hadProgress = state.running || state.stack.length > 0;
        syncDifficultyFromSelect();
        if (hadProgress) {
          resetGame();
          state.speed = speedPresets[state.speedMode].speed;
          startBtn.textContent = "Start";
          status.textContent = "Difficulty updated. Click start to build your tower.";
        } else {
          measureField();
        }
      };

      difficultySelect.addEventListener("change", handleDifficultyChange);

      const handleSpeedChange = () => {
        syncSpeedFromSelect();
        if (state.running) {
          state.speed = speedPresets[state.speedMode].speed;
        }
      };

      speedSelect.addEventListener("change", handleSpeedChange);

      window.addEventListener("keydown", handleKey);
      window.addEventListener("resize", handleResize);

      heightSelect.value = String(config.defaultMaxLayers);
      difficultySelect.value = defaultDifficulty;
      speedSelect.value = defaultSpeed;
      syncMaxLayersFromSelect();
      syncDifficultyFromSelect();
      syncSpeedFromSelect();
      renderStats();

      function startGame() {
        resetGame();
        syncMaxLayersFromSelect();
        syncDifficultyFromSelect();
        syncSpeedFromSelect();
        measureField();
        state.running = true;
        wrapper.dataset.phase = "playing";
        fieldHeading.innerHTML = '<span>FIND YOUR RHYTHM</span><strong>Line up. Drop. Repeat.</strong>';
        state.speed = speedPresets[state.speedMode].speed;
        startBtn.textContent = "Restart";
        dropBtn.disabled = false;
        status.textContent = "Drop blocks to build your tower.";
        const base = createBlock({ widthRatio: 1, leftRatio: 0, bottom: 0 });
        base.element.classList.add("is-base");
        state.stack.push(base);
        updateTowerView();
        renderStats();
        spawnMovingBlock();
      }

      function resetGame() {
        cancelAnimationFrame(state.animationId ?? 0);
        state.animationId = null;
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = null;
        state.running = false;
        state.readyForDrop = false;
        state.activeBlock = null;
        state.stack = [];
        state.direction = 1;
        state.lastTimestamp = 0;
        state.viewOffset = 0;
        wrapper.dataset.phase = "ready";
        fieldHeading.innerHTML = '<span>BUILD YOUR SKYLINE</span><strong>One block at a time.</strong>';
        tower.textContent = "";
        tower.style.setProperty("--tower-offset", "0px");
        measureField();
        dropBtn.disabled = true;
        status.textContent = "Click start to build your tower.";
        renderStats();
      }

      function measureField() {
        const fallbackLayers = Number.isFinite(state.maxLayers) ? state.maxLayers : 20;
        state.fieldWidth = field.clientWidth || tower.clientWidth || tower.offsetWidth || 260;
        state.fieldHeight =
          field.clientHeight || field.offsetHeight || config.blockHeight * fallbackLayers;
        updateTowerView();
      }

      function spawnMovingBlock() {
        if (!state.running) return;
        const previous = state.stack[state.stack.length - 1];
        if (!previous) return;
        state.direction = state.stack.length % 2 === 0 ? -1 : 1;
        let widthRatio = previous.widthRatio;
        if (
          previous.element.classList.contains("is-base") &&
          widthRatio > state.baseWidthRatio
        ) {
          widthRatio = state.baseWidthRatio;
        }
        const leftRatio = state.direction === 1 ? 0 : Math.max(0, 1 - widthRatio);
        const bottom = state.stack.length * config.blockHeight;
        const block = createBlock({ widthRatio, leftRatio, bottom });
        block.element.classList.add("is-active");
        state.activeBlock = block;
        state.readyForDrop = true;
        state.lastTimestamp = 0;
        updateTowerView();
        runAnimation();
      }

      function runAnimation() {
        cancelAnimationFrame(state.animationId ?? 0);
        const step = (timestamp) => {
          if (!state.activeBlock || !state.running) return;
          if (!state.lastTimestamp) {
            state.lastTimestamp = timestamp;
          }
          const delta = (timestamp - state.lastTimestamp) / 1000;
          state.lastTimestamp = timestamp;
          const block = state.activeBlock;
          const maxLeft = 1 - block.widthRatio;
          let next = block.leftRatio + state.direction * state.speed * delta;
          if (next <= 0) {
            next = 0;
            state.direction = 1;
          } else if (next >= maxLeft) {
            next = maxLeft;
            state.direction = -1;
          }
          block.leftRatio = next;
          updateBlockVisuals(block);
          state.animationId = window.requestAnimationFrame(step);
        };
        state.animationId = window.requestAnimationFrame(step);
      }

      function dropBlock() {
        if (!state.running || !state.activeBlock || !state.readyForDrop) return;
        state.readyForDrop = false;
        cancelAnimationFrame(state.animationId ?? 0);
        state.animationId = null;
        const active = state.activeBlock;
        const previous = state.stack[state.stack.length - 1];
        const activeLeft = active.leftRatio;
        const activeRight = active.leftRatio + active.widthRatio;
        const prevLeft = previous.leftRatio;
        const prevRight = previous.leftRatio + previous.widthRatio;
        const overlapLeft = Math.max(activeLeft, prevLeft);
        const overlapRight = Math.min(activeRight, prevRight);
        const overlap = overlapRight - overlapLeft;
        if (overlap <= config.minOverlap) {
          active.element.classList.add("is-missed");
          handleFail();
          return;
        }
        showOffcut(active, activeLeft, overlapLeft - activeLeft, -1);
        showOffcut(active, overlapRight, activeRight - overlapRight, 1);
        const cleanDrop = active.widthRatio - overlap < .006;
        active.widthRatio = overlap;
        active.leftRatio = overlapLeft;
        updateBlockVisuals(active);
        active.element.classList.remove("is-active");
        active.element.classList.add("is-locked");
        if (cleanDrop) active.element.classList.add("is-perfect");
        state.stack.push(active);
        state.activeBlock = null;
        updateTowerView();
        const currentHeight = state.stack.length - 1;
        if (currentHeight > state.bestHeight) {
          state.bestHeight = currentHeight;
        }
        renderStats();
        const targetSpeed = speedPresets[state.speedMode].speed;
        const nextSpeed = Math.min(
          config.maxSpeed,
          Math.max(targetSpeed, state.speed + config.speedIncrement)
        );
        state.speed = nextSpeed;
        status.textContent = cleanDrop ? "Perfect alignment. Keep that rhythm!" : currentHeight % 4 === 0 ? "Stack looks sharp!" : "Nice drop!";
        if (Number.isFinite(state.maxLayers) && currentHeight >= state.maxLayers) {
          handleVictory();
          return;
        }
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = window.setTimeout(() => {
          spawnMovingBlock();
        }, 260);
      }

      function handleFail() {
        wrapper.dataset.phase = "failed";
        fieldHeading.innerHTML = '<span>A LITTLE TOO FAR</span><strong>Another skyline awaits.</strong>';
        state.running = false;
        state.activeBlock = null;
        state.readyForDrop = false;
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = null;
        dropBtn.disabled = true;
        startBtn.textContent = "Try again";
        status.textContent = `Tower toppled at ${state.stack.length - 1} blocks.`;
        updateTowerView();
        renderStats();
      }

      function handleVictory() {
        wrapper.dataset.phase = "complete";
        fieldHeading.innerHTML = '<span>TOWER COMPLETE</span><strong>A beautiful balance.</strong>';
        state.running = false;
        state.activeBlock = null;
        state.readyForDrop = false;
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = null;
        dropBtn.disabled = true;
        startBtn.textContent = "Play again";
        status.textContent = `Sky high! ${state.stack.length - 1} blocks tall.`;
        updateTowerView();
      }

      function syncMaxLayersFromSelect() {
        const raw = heightSelect.value;
        if (!raw) {
          state.maxLayers = config.defaultMaxLayers;
          heightSelect.value = String(config.defaultMaxLayers);
          return;
        }
        state.maxLayers = raw === "__infinite" ? Infinity : Number.parseInt(raw, 10) || Infinity;
      }

      function syncDifficultyFromSelect() {
        const raw = difficultySelect.value;
        if (!raw || !difficultyPresets[raw]) {
          state.difficulty = defaultDifficulty;
        } else {
          state.difficulty = raw;
        }
        state.baseWidthRatio = difficultyPresets[state.difficulty].baseWidth;
        applyDifficultyTheme();
      }

      function syncSpeedFromSelect() {
        const raw = speedSelect.value;
        if (!raw || !speedPresets[raw]) {
          state.speedMode = defaultSpeed;
        } else {
          state.speedMode = raw;
        }
        state.speed = speedPresets[state.speedMode].speed;
      }

      function applyDifficultyTheme() {
        wrapper.dataset.difficulty = state.difficulty;
      }

      function updateTowerView() {
        const fieldHeight = state.fieldHeight || field.clientHeight || 0;
        if (!fieldHeight) {
          return;
        }
        const peak = getTowerPeak();
        const headroom = Math.min(fieldHeight * 0.4, config.blockHeight * 3);
        const maxVisiblePeak = Math.max(0, fieldHeight - headroom);
        let offset = 0;
        if (peak > maxVisiblePeak) {
          offset = peak - maxVisiblePeak;
        }
        if (state.viewOffset === offset) {
          return;
        }
        state.viewOffset = offset;
        tower.style.setProperty("--tower-offset", `${offset}px`);
      }

      function getTowerPeak() {
        let highest = 0;
        if (state.stack.length) {
          const topBlock = state.stack[state.stack.length - 1];
          highest = Math.max(highest, topBlock.bottom + config.blockHeight);
        }
        if (state.activeBlock) {
          highest = Math.max(highest, state.activeBlock.bottom + config.blockHeight);
        }
        return highest;
      }

      function createBlock({ widthRatio, leftRatio, bottom }) {
        const block = document.createElement("div");
        block.className = "tower-block";
        block.style.setProperty("--block-hue", String((195 - (bottom / config.blockHeight) * 9 + 360) % 360));
        tower.appendChild(block);
        const data = {
          element: block,
          widthRatio,
          leftRatio,
          bottom,
        };
        updateBlockVisuals(data);
        return data;
      }

      function showOffcut(active, leftRatio, widthRatio, direction) {
        if (widthRatio * state.fieldWidth < 1) return;
        const piece = document.createElement("div");
        piece.className = "tower-block tower-offcut";
        piece.style.cssText = `width:${widthRatio*state.fieldWidth}px;left:${leftRatio*state.fieldWidth}px;bottom:${active.bottom}px;--block-hue:${active.element.style.getPropertyValue("--block-hue")};--cut-drift:${direction*42}px;--cut-turn:${direction*24}deg`;
        piece.setAttribute("aria-hidden", "true");
        tower.appendChild(piece);
        piece.addEventListener("animationend", () => piece.remove(), { once: true });
      }

      function updateBlockVisuals(block) {
        const width = block.widthRatio * state.fieldWidth;
        block.element.style.width = `${width}px`;
        block.element.style.left = `${block.leftRatio * state.fieldWidth}px`;
        block.element.style.bottom = `${block.bottom}px`;
      }

      function renderStats() {
        const height = state.stack.length - 1;
        heightBadge.innerHTML = `<span>TOWER HEIGHT</span><strong>${Math.max(0, height)}<small> blocks</small></strong>`;
        bestBadge.innerHTML = `<span>SESSION BEST</span><strong>${state.bestHeight}<small> blocks</small></strong>`;
      }

      return () => {
        cancelAnimationFrame(state.animationId ?? 0);
        window.clearTimeout(state.spawnTimeout ?? 0);
        heightSelect.removeEventListener("change", handleHeightChange);
        difficultySelect.removeEventListener("change", handleDifficultyChange);
        speedSelect.removeEventListener("change", handleSpeedChange);
        window.removeEventListener("keydown", handleKey);
        window.removeEventListener("resize", handleResize);
        delete wrapper.dataset.difficulty;
        wrapper.remove();
      };
    },
  },
  {
    id: "foodchain",
    name: "Food Chain Relay",
    summary: "Sort each food chain from producer to apex predator.",
    description:
      "Reorder the shuffled organisms so energy flows from the producer up to the apex predator. Watch your streak climb as you master different habitats!",
    logo: "assets/food-chain-cover.png",
    init(root) {
      const chains = [
        {
          id: "prairie",
          title: "Prairie Loop",
          prompt: "Stack this grassland food chain with producers at the bottom and the apex predator up top.",
          energyFlow: [
            { id: "grass", name: "Big Bluestem Grass", role: "Producer" },
            { id: "hopper", name: "Grasshopper", role: "Primary consumer" },
            { id: "lark", name: "Western Meadowlark", role: "Secondary consumer" },
            { id: "fox", name: "Red Fox", role: "Tertiary consumer" },
          ],
        },
        {
          id: "pond",
          title: "Pond Ripple",
          prompt: "Line up this freshwater chain so the apex hunter sits at the top of the stack.",
          energyFlow: [
            { id: "algae", name: "Duckweed", role: "Producer" },
            { id: "mayfly", name: "Mayfly Nymph", role: "Primary consumer" },
            { id: "sunfish", name: "Bluegill Sunfish", role: "Secondary consumer" },
            { id: "heron", name: "Great Blue Heron", role: "Tertiary consumer" },
          ],
        },
        {
          id: "ocean",
          title: "Open Ocean",
          prompt: "Build this marine chain with the top predator riding highest above the producers.",
          energyFlow: [
            { id: "phyto", name: "Phytoplankton", role: "Producer" },
            { id: "krill", name: "Krill", role: "Primary consumer" },
            { id: "mackerel", name: "Atlantic Mackerel", role: "Secondary consumer" },
            { id: "shark", name: "Blue Shark", role: "Apex predator" },
          ],
        },
        {
          id: "forest",
          title: "Forest Flight",
          prompt: "Let producers root the woodland base and the raptor soar at the very top.",
          energyFlow: [
            { id: "oak", name: "Oak Leaves", role: "Producer" },
            { id: "caterpillar", name: "Caterpillar", role: "Primary consumer" },
            { id: "robin", name: "American Robin", role: "Secondary consumer" },
            { id: "hawk", name: "Red-tailed Hawk", role: "Apex predator" },
          ],
        },
        {
          id: "arctic",
          title: "Arctic Chill",
          prompt: "Stack this polar web so the apex predator crowns the column.",
          energyFlow: [
            { id: "icephyto", name: "Sea Ice Phytoplankton", role: "Producer" },
            { id: "cod", name: "Arctic Cod", role: "Primary consumer" },
            { id: "seal", name: "Ringed Seal", role: "Secondary consumer" },
            { id: "bear", name: "Polar Bear", role: "Apex predator" },
          ],
        },
      ];

      const RACE_TARGETS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150];

      const AI_DIFFICULTIES = Object.fromEntries(OPPONENT_LEVELS.map(level => [level.id, level]));
      let computer = createComputerOpponent();

      const state = {
        chain: null,
        order: [],
        solved: false,
        solvedCount: 0,
        streak: 0,
        bestStreak: 0,
        hardMode: false,
        raceTarget: null,
        aiStreak: 0,
        raceCompleted: false,
        aiDifficulty: "medium",
        raceActive: false,
      };

      const wrapper = document.createElement("div");
      wrapper.className = "foodchain";

      let dragSourceIndex = null;

      const BADGE_FLASH_DURATION = 1100;

      function flashBadge(badge, variant = "player") {
        if (!badge) return;
        const className = variant === "ai" ? "badge-flash-ai" : "badge-flash-player";
        badge.classList.remove("badge-flash-player", "badge-flash-ai");
        void badge.offsetWidth;
        badge.classList.add(className);
        window.setTimeout(() => {
          badge.classList.remove(className);
        }, BADGE_FLASH_DURATION);
      }

      const header = document.createElement("div");
      header.className = "foodchain-header";

      const title = document.createElement("h3");
      title.className = "foodchain-title";

      const prompt = document.createElement("p");
      prompt.className = "foodchain-prompt";

      header.append(title, prompt);

      const stats = document.createElement("div");
      stats.className = "foodchain-stats";

      const solvedBadge = document.createElement("span");
      solvedBadge.className = "badge foodchain-solved";
      solvedBadge.textContent = "Solved: 0";

      const streakBadge = document.createElement("span");
      streakBadge.className = "badge foodchain-streak";
      streakBadge.textContent = "Streak: 0";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge foodchain-best";
      bestBadge.textContent = "Best streak: 0";

      const raceBadge = document.createElement("span");
      raceBadge.className = "badge foodchain-race";
      raceBadge.textContent = "Race: –";

      const aiBadge = document.createElement("span");
      aiBadge.className = "badge foodchain-ai";
      aiBadge.textContent = "AI streak: 0";

      stats.append(solvedBadge, streakBadge, bestBadge, raceBadge, aiBadge);

      const list = document.createElement("ul");
      list.className = "foodchain-list";
      list.addEventListener("dragover", (event) => {
        if (state.solved) return;
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        if (event.target === list) {
          clearDragIndicators();
        }
      });
      list.addEventListener("drop", (event) => {
        if (state.solved) return;
        event.preventDefault();
        clearDragIndicators();
        const from = getDragIndex(event);
        if (from == null) return;
        dragSourceIndex = null;
        moveItemToPosition(from, state.order.length);
      });

      const controls = document.createElement("div");
      controls.className = "foodchain-controls";

      const hardToggle = document.createElement("button");
      hardToggle.type = "button";
      hardToggle.className = "foodchain-toggle";
      hardToggle.textContent = "Hard mode off";
      hardToggle.setAttribute("aria-pressed", "false");

      const aiLabel = document.createElement("label");
      aiLabel.className = "foodchain-ai-select";
      const aiSpan = document.createElement("span");
      aiSpan.textContent = "AI level";

      const aiSelect = document.createElement("select");
      aiSelect.setAttribute("aria-label", "AI difficulty");
      Object.entries(AI_DIFFICULTIES).forEach(([key, config]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = config.label;
        aiSelect.appendChild(option);
      });
      aiSelect.value = state.aiDifficulty;
      aiLabel.append(aiSpan, aiSelect);

      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "primary-btn foodchain-submit";
      submitBtn.textContent = "Check order";

      const shuffleBtn = document.createElement("button");
      shuffleBtn.type = "button";
      shuffleBtn.className = "foodchain-ghost";
      shuffleBtn.textContent = "Shuffle";

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "foodchain-ghost";
      nextBtn.textContent = "New chain";

      const raceLabel = document.createElement("label");
      raceLabel.className = "foodchain-race-select";
      const raceSpan = document.createElement("span");
      raceSpan.textContent = "Race target";

      const raceSelect = document.createElement("select");
      raceSelect.setAttribute("aria-label", "Race target");
      const baseOption = document.createElement("option");
      baseOption.value = "";
      baseOption.textContent = "Standard play";
      raceSelect.appendChild(baseOption);
      RACE_TARGETS.forEach((target) => {
        const option = document.createElement("option");
        option.value = String(target);
        option.textContent = `${target} in a row`;
        raceSelect.appendChild(option);
      });
      raceLabel.append(raceSpan, raceSelect);

      const startRaceBtn = document.createElement("button");
      startRaceBtn.type = "button";
      startRaceBtn.className = "foodchain-ghost";
      startRaceBtn.textContent = "Start race";
      startRaceBtn.disabled = true;

      controls.append(hardToggle, aiLabel, raceLabel, startRaceBtn, submitBtn, shuffleBtn, nextBtn);

      const status = document.createElement("p");
      status.className = "foodchain-status";
      status.textContent = "Place apex predators at the top of the stack and keep producers anchored at the bottom.";

      wrapper.append(header, stats, list, controls, status);
      root.appendChild(wrapper);

      submitBtn.addEventListener("click", () => {
        if (state.solved) {
          handleNext();
          return;
        }
        checkOrder();
      });

      shuffleBtn.addEventListener("click", () => {
        if (state.solved) return;
        state.order = shuffle(state.order);
        renderChain();
        status.textContent = "Cards reshuffled. Rebuild it with producers low and predators high.";
      });

      function handleNext(event) {
        if (event) event.preventDefault();
        if (state.raceCompleted) {
          state.raceActive = false;
          resetRaceProgress();
          submitBtn.disabled = false;
          shuffleBtn.disabled = false;
          submitBtn.textContent = "Check order";
          state.raceCompleted = false;
          updateRaceButton();
          nextBtn.textContent = "New chain";
        }
        loadChain(true);
      }
      nextBtn.addEventListener("click", handleNext);

      hardToggle.addEventListener("click", () => {
        setHardMode(!state.hardMode);
      });

      raceSelect.addEventListener("change", () => {
        setRaceTarget(raceSelect.value ? Number.parseInt(raceSelect.value, 10) : null);
      });

      aiSelect.addEventListener("change", () => {
        setAIDifficulty(aiSelect.value);
      });

      startRaceBtn.addEventListener("click", () => {
        if (!state.raceTarget) return;
        startRace();
      });

      function shuffle(array) {
        const copy = array.slice();
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      }

      function loadChain(forceNew = false) {
        const pool = chains.filter((chain) => chain.id !== state.chain?.id);
        if (!state.chain || forceNew) {
          const choices = pool.length ? pool : chains;
          state.chain = choices[Math.floor(Math.random() * choices.length)];
        }
        state.order = shuffle(state.chain.energyFlow);
        state.solved = false;
        submitBtn.textContent = "Check order";
        submitBtn.disabled = false;
        shuffleBtn.disabled = false;
        renderChain();
        updatePrompt();
        state.raceCompleted = false;
        submitBtn.disabled = false;
        shuffleBtn.disabled = false;
        if (state.raceTarget) {
          const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
          status.textContent = state.raceActive
            ? `Race running: You vs ${difficulty.label} AI. First to ${state.raceTarget}.`
            : `Race ready: first to ${state.raceTarget}. Press Start to face the ${difficulty.label} AI.`;
        } else {
          status.textContent = state.hardMode
            ? "Hard mode active—roles hidden. Keep predators up high and producers down low."
            : state.chain.prompt;
        }
        updateRaceButton();
      }

      function renderChain() {
        dragSourceIndex = null;
        wrapper.classList.toggle("foodchain-hard", state.hardMode);
        title.textContent = state.chain.title;
        updatePrompt();
        list.textContent = "";
        state.order.forEach((item, index) => {
          const li = document.createElement("li");
          li.className = "foodchain-item";
          li.dataset.role = item.role;
          li.dataset.index = String(index);
          li.draggable = !state.solved;

          li.addEventListener("dragstart", handleDragStart);
          li.addEventListener("dragend", handleDragEnd);
          li.addEventListener("dragover", handleItemDragOver);
          li.addEventListener("dragleave", handleItemDragLeave);
          li.addEventListener("drop", handleItemDrop);

          const card = document.createElement("div");
          card.className = "foodchain-card";

          const label = document.createElement("strong");
          label.textContent = item.name;

          const role = document.createElement("span");
          role.className = "foodchain-role";
          role.textContent = state.hardMode ? "" : item.role;
          role.hidden = state.hardMode;

          const movers = document.createElement("div");
          movers.className = "foodchain-movers";

          const upBtn = document.createElement("button");
          upBtn.type = "button";
          upBtn.className = "foodchain-move";
          upBtn.textContent = "↑";
          upBtn.setAttribute("aria-label", `Move ${item.name} up`);
          upBtn.disabled = state.solved || index === 0;
          upBtn.addEventListener("click", () => moveItem(index, -1));

          const downBtn = document.createElement("button");
          downBtn.type = "button";
          downBtn.className = "foodchain-move";
          downBtn.textContent = "↓";
          downBtn.setAttribute("aria-label", `Move ${item.name} down`);
          downBtn.disabled = state.solved || index === state.order.length - 1;
          downBtn.addEventListener("click", () => moveItem(index, 1));

          movers.append(upBtn, downBtn);
          card.append(label, role);
          li.append(card, movers);
          list.appendChild(li);
        });
        updateStats();
      }

      function moveItem(index, delta) {
        if (delta === 0) return;
        if (delta > 0) {
          moveItemToPosition(index, index + delta + 1);
        } else {
          moveItemToPosition(index, index + delta);
        }
      }

      function moveItemToPosition(from, insertIndex) {
        if (state.solved) return;
        const length = state.order.length;
        if (from < 0 || from >= length) return;
        let target = Math.min(Math.max(insertIndex, 0), length);
        if (target === from || target === from + 1) return;
        const items = state.order.slice();
        const [moved] = items.splice(from, 1);
        if (target > from) target -= 1;
        items.splice(target, 0, moved);
        state.order = items;
        clearDragIndicators();
        clearFeedback();
        renderChain();
        if (state.raceActive && state.raceTarget) {
          const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
          status.textContent = `Race running: You vs ${difficulty.label} AI. First to ${state.raceTarget}.`;
        } else {
          status.textContent = "Cards rearranged. Keep apex predators high and producers low.";
        }
      }

      function getTargetSequence() {
        if (!state.chain) return [];
        return [...state.chain.energyFlow].reverse();
      }

      function getDragIndex(event) {
        if (dragSourceIndex !== null) return dragSourceIndex;
        if (!event.dataTransfer) return null;
        const raw = event.dataTransfer.getData("text/plain");
        if (!raw) return null;
        const parsed = Number.parseInt(raw, 10);
        return Number.isNaN(parsed) ? null : parsed;
      }

      function clearDragIndicators() {
        Array.from(list.children).forEach((child) => {
          child.classList.remove("is-dragging", "is-dragover");
        });
      }

      function handleDragStart(event) {
        if (state.solved) {
          event.preventDefault();
          return;
        }
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const index = Number.parseInt(target.dataset.index ?? "", 10);
        if (Number.isNaN(index)) return;
        dragSourceIndex = index;
        clearDragIndicators();
        target.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(index));
        }
      }

      function handleDragEnd() {
        dragSourceIndex = null;
        clearDragIndicators();
      }

      function handleItemDragOver(event) {
        if (state.solved) return;
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains("is-dragging")) return;
        clearDragIndicators();
        target.classList.add("is-dragover");
      }

      function handleItemDragLeave(event) {
        const target = event.currentTarget;
        if (target instanceof HTMLElement) {
          target.classList.remove("is-dragover");
        }
      }

      function handleItemDrop(event) {
        if (state.solved) return;
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        target.classList.remove("is-dragover");
        const index = Number.parseInt(target.dataset.index ?? "", 10);
        if (Number.isNaN(index)) return;
        const from = getDragIndex(event);
        if (from == null) return;
        const rect = target.getBoundingClientRect();
        const insertAfter = event.clientY - rect.top > rect.height / 2;
        const insertIndex = index + (insertAfter ? 1 : 0);
        dragSourceIndex = null;
        moveItemToPosition(from, insertIndex);
      }

      function checkOrder() {
        if (state.solved) {
          status.textContent = "This chain is already locked in. Load a new one to keep climbing.";
          return;
        }
        clearFeedback();
        let correct = true;
        const targetSequence = getTargetSequence();
        state.order.forEach((item, idx) => {
          const li = list.children[idx];
          if (item.id === targetSequence[idx]?.id) {
            li.classList.add("is-correct");
          } else {
            li.classList.add("is-wrong");
            correct = false;
          }
        });
        if (correct) {
          state.solved = true;
          state.solvedCount += 1;
          state.streak += 1;
          if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
          }
          submitBtn.textContent = "Load new chain";
          shuffleBtn.disabled = true;
          clearDragIndicators();
          Array.from(list.children).forEach((child) => {
            child.setAttribute("draggable", "false");
          });
          flashBadge(streakBadge, "player");
          flashBadge(solvedBadge, "player");
          if (state.raceActive && state.raceTarget) {
            flashBadge(raceBadge, "player");
          }
          const deltaMessage = state.streak === 1 ? "First point secured!" : `Streak +1! You're at ${state.streak}.`;
          const scoreLine = state.raceActive && state.raceTarget
            ? ` Score: You ${state.streak} - AI ${state.aiStreak}.`
            : "";
          status.textContent = state.hardMode
            ? `Perfect flow! Nailed the chain with roles hidden. ${deltaMessage}${scoreLine}`
            : `Perfect flow! Producers power every bite above them. ${deltaMessage}${scoreLine}`;
          handleRaceProgress(true);
        } else {
          state.streak = 0;
          status.textContent = "Not quite. Apex predators belong up top and producers should anchor the bottom.";
          handleRaceProgress(false);
        }
        updateStats();
      }

      function clearFeedback() {
        Array.from(list.children).forEach((child) => {
          child.classList.remove("is-correct", "is-wrong", "is-dragging", "is-dragover");
        });
      }

      function updateStats() {
        solvedBadge.textContent = `Solved: ${state.solvedCount}`;
        streakBadge.textContent = `Streak: ${state.streak}`;
        bestBadge.textContent = `Best streak: ${state.bestStreak}`;
        if (!state.raceTarget) {
          raceBadge.textContent = "Race: –";
        } else if (state.raceCompleted) {
          raceBadge.textContent = `Race: finished (first to ${state.raceTarget})`;
        } else if (state.raceActive) {
          raceBadge.textContent = `Race: first to ${state.raceTarget} (You ${state.streak} - AI ${state.aiStreak})`;
        } else {
          raceBadge.textContent = `Race: first to ${state.raceTarget} (not started)`;
        }
        const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
        aiBadge.textContent = `AI streak: ${state.aiStreak} (${difficulty.label})`;
      }

      function setHardMode(active) {
        state.hardMode = Boolean(active);
        hardToggle.classList.toggle("is-active", state.hardMode);
        hardToggle.setAttribute("aria-pressed", state.hardMode ? "true" : "false");
        hardToggle.textContent = state.hardMode ? "Hard mode on" : "Hard mode off";
        renderChain();
        if (state.raceTarget) {
          const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
          status.textContent = state.raceActive
            ? `Race running: You vs ${difficulty.label} AI. First to ${state.raceTarget}.`
            : `Race ready: first to ${state.raceTarget}. Press Start to face the ${difficulty.label} AI.`;
        } else {
          status.textContent = state.hardMode
            ? "Hard mode active—roles hidden. Keep predators up high and producers down low."
            : state.chain.prompt;
        }
      }

      function updatePrompt() {
        prompt.textContent = state.hardMode
          ? `${state.chain.prompt} (roles hidden)`
          : state.chain.prompt;
      }

      function resetRaceProgress() {
        state.streak = 0;
        state.aiStreak = 0;
        state.raceCompleted = false;
        updateStats();
        updateRaceButton();
      }

      function updateRaceButton() {
        if (!state.raceTarget) {
          startRaceBtn.textContent = "Start race";
          startRaceBtn.disabled = true;
        } else if (state.raceActive) {
          startRaceBtn.textContent = "Race running";
          startRaceBtn.disabled = true;
        } else if (state.raceCompleted) {
          startRaceBtn.textContent = "Restart race";
          startRaceBtn.disabled = false;
        } else {
          startRaceBtn.textContent = "Start race";
          startRaceBtn.disabled = false;
        }
      }

      function setRaceTarget(target) {
        if (target && Number.isFinite(target)) {
          state.raceTarget = target;
          state.raceActive = false;
          resetRaceProgress();
          nextBtn.textContent = "New chain";
          const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
          status.textContent = `Race ready: first to ${target}. Press Start to face the ${difficulty.label} AI.`;
          raceSelect.value = String(target);
        } else {
          state.raceTarget = null;
          state.raceActive = false;
          resetRaceProgress();
          nextBtn.textContent = "New chain";
          raceSelect.value = "";
          if (!state.hardMode && state.chain) {
            status.textContent = state.chain.prompt;
          } else if (state.hardMode) {
            status.textContent = "Hard mode active—roles hidden. Keep predators up high and producers down low.";
          }
        }
        submitBtn.disabled = false;
        shuffleBtn.disabled = false;
        updateStats();
        updateRaceButton();
      }

      function startRace() {
        if (!state.raceTarget) return;
        state.raceActive = true;
        state.raceCompleted = false;
        state.streak = 0;
        state.aiStreak = 0;
        nextBtn.textContent = "New chain";
        submitBtn.disabled = false;
        shuffleBtn.disabled = false;
        submitBtn.textContent = "Check order";
        loadChain(true);
        updateStats();
        updateRaceButton();
      }

      function setAIDifficulty(key) {
        const nextKey = key in AI_DIFFICULTIES ? key : "medium";
        const previous = state.aiDifficulty;
        if (previous === nextKey) return;
        state.aiDifficulty = nextKey;
        computer = createComputerOpponent({ difficulty: nextKey });
        aiSelect.value = nextKey;
        const difficulty = AI_DIFFICULTIES[nextKey];
        state.aiStreak = 0;
        if (state.raceActive) {
          state.raceActive = false;
          state.raceCompleted = false;
          resetRaceProgress();
          status.textContent = `Race paused—${difficulty.label} AI is ready when you restart.`;
        } else if (state.raceTarget) {
          resetRaceProgress();
          status.textContent = `AI difficulty set to ${difficulty.label}. Press Start to race.`;
        } else {
          updateStats();
          status.textContent = `AI difficulty set to ${difficulty.label}.`;
        }
        updateRaceButton();
      }

      function handleRaceProgress(userSucceeded) {
        if (!state.raceTarget || !state.raceActive || state.raceCompleted) return;

        if (userSucceeded && state.streak >= state.raceTarget) {
          finishRace("You");
          return;
        }

        const difficulty = AI_DIFFICULTIES[state.aiDifficulty] ?? AI_DIFFICULTIES.medium;
        const aiSucceeded = computer.attempt();
        state.aiStreak = aiSucceeded ? state.aiStreak + 1 : 0;
        if (aiSucceeded) {
          flashBadge(aiBadge, "ai");
          flashBadge(raceBadge, "ai");
        }
        if (state.aiStreak >= state.raceTarget) {
          finishRace("The AI");
        } else {
          updateStats();
          if (state.raceActive) {
            if (userSucceeded) {
              status.textContent = `Point for you! Score: You ${state.streak} - ${difficulty.label} AI ${state.aiStreak}.`;
            } else if (aiSucceeded) {
              status.textContent = `${difficulty.label} AI scores! Score: You ${state.streak} - ${difficulty.label} AI ${state.aiStreak}.`;
            }
          }
        }
      }

      function finishRace(winner) {
        state.raceActive = false;
        state.raceCompleted = true;
        submitBtn.disabled = true;
        shuffleBtn.disabled = true;
        submitBtn.textContent = "Race finished";
        status.textContent = `${winner} reached ${state.raceTarget} in a row first!`;
        nextBtn.textContent = "Restart race";
        updateRaceButton();
        updateStats();
      }

      loadChain();
      setRaceTarget(null);

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "archery",
    name: "Aurora Archery",
    summary: "Explore six archery trails in side view or first-person 3D (Beta).",
    description:
      "Customize your archer, choose side view or first-person 3D (Beta), and follow the arrow into the target. Explore six trails with moving targets, changing wind, and longer distances.",
    logo: "assets/memory-loop-cover.png",
    init: createAuroraArchery,
  },
  {
    id: "spotter",
    name: "Flight Spotter",
    summary: "Match each tail design to the correct airline.",
    description:
      "Study the tail art and spotter notes, then choose the airline that flies it. Keep your streak alive as new liveries roll up to the stand.",
    logo: "assets/flight-spotter-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "spotter";

      const status = document.createElement("p");
      status.className = "spotter-status";
      status.textContent = "Study the tail art, then pick the airline it belongs to.";

      const stats = document.createElement("div");
      stats.className = "spotter-stats";

      const roundBadge = document.createElement("span");
      roundBadge.className = "badge spotter-round";
      roundBadge.textContent = "Flight: 0";

      const scoreBadge = document.createElement("span");
      scoreBadge.className = "badge spotter-score";
      scoreBadge.textContent = "Cleared: 0";

      const streakBadge = document.createElement("span");
      streakBadge.className = "badge spotter-streak";
      streakBadge.textContent = "Streak: 0";

      stats.append(roundBadge, scoreBadge, streakBadge);

      const card = document.createElement("section");
      card.className = "spotter-card";

      const hintTitle = document.createElement("h3");
      hintTitle.className = "spotter-title";
      hintTitle.textContent = "Spotter notes";

      const photoWrap = document.createElement("div");
      photoWrap.className = "spotter-photo";
      const photo = document.createElement("img");
      photo.className = "spotter-image";
      photo.alt = "";
      photoWrap.appendChild(photo);

      const hintList = document.createElement("ul");
      hintList.className = "spotter-hints";

      card.append(hintTitle, photoWrap, hintList);

      const controls = document.createElement("div");
      controls.className = "spotter-controls";

      const airlineGroup = document.createElement("label");
      airlineGroup.className = "spotter-select";
      const airlineSpan = document.createElement("span");
      airlineSpan.textContent = "Airline";
      const airlineSelect = document.createElement("select");
      airlineSelect.setAttribute("aria-label", "Airline");
      airlineGroup.append(airlineSpan, airlineSelect);

      const buttons = document.createElement("div");
      buttons.className = "spotter-buttons";

      const checkBtn = document.createElement("button");
      checkBtn.type = "button";
      checkBtn.className = "primary-btn";
      checkBtn.textContent = "Confirm";

      const revealBtn = document.createElement("button");
      revealBtn.type = "button";
      revealBtn.className = "spotter-reveal";
      revealBtn.textContent = "Reveal answer";

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "spotter-next";
      nextBtn.textContent = "Next flight";
      nextBtn.disabled = true;

      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "spotter-skip";
      skipBtn.textContent = "Skip";

      buttons.append(checkBtn, nextBtn, revealBtn, skipBtn);

      controls.append(airlineGroup, buttons);

      wrapper.append(status, stats, card, controls);
      root.appendChild(wrapper);

      const flights = [
        {
          id: "dl-a321neo",
          aircraft: "Airbus A321neo",
          airline: "Delta Air Lines",
          registration: "N510DX",
          image: "assets/spotter/delta-tail.webp",
          hints: [
            "Single aisle jet with new generation PW1100G engines",
            "Blue tail with red widget, sky blue belly",
            "Typically deployed on transcon routes from ATL and JFK",
          ],
        },
        {
          id: "wn-73g",
          aircraft: "Boeing 737-700",
          airline: "Southwest Airlines",
          registration: "N7865A",
          image: "assets/spotter/southwest-tail.webp",
          hints: [
            "Heart livery with bright red and royal blue fuselage",
            "Single class layout, split scimitar winglets",
            "Often seen hopping between DAL, HOU, and DEN",
          ],
        },
        {
          id: "ua-78w",
          aircraft: "Boeing 787-9",
          airline: "United Airlines",
          registration: "N24979",
          image: "assets/spotter/united-tail.webp",
          hints: [
            "Composite twin with raked wingtips and chevron nacelles",
            "Blue swoop livery with globe tail",
            "Anchors evening departures from SFO to Asia",
          ],
        },
        {
          id: "aa-e190",
          aircraft: "Embraer 190",
          airline: "American Airlines",
          registration: "N948UW",
          image: "assets/spotter/american-tail.webp",
          hints: [
            "Mid-sized Embraer with a 2-2 cabin",
            "Silver fuselage with red, white, blue tail stripes",
            "Operates shuttle hops along the northeast corridor",
          ],
        },
        {
          id: "b6-a220",
          aircraft: "Airbus A220-300",
          airline: "JetBlue",
          registration: "N3146J",
          image: "assets/spotter/jetblue-tail.webp",
          hints: [
            "Quiet geared turbofan twin with tall horizontal stabilizer",
            "Dark blue tail featuring a mosaic pattern",
            "Common on BOS and LGA business runs",
          ],
        },
        {
          id: "nk-a320",
          aircraft: "Airbus A320",
          airline: "Spirit Airlines",
          registration: "N915NK",
          image: "assets/spotter/spirit-tail.webp",
          hints: [
            "Ultra-bright yellow fuselage catches the sun from miles away",
            "Simple blue Spirit titles near the tail",
            "Regular on leisure hops to Orlando and Las Vegas",
          ],
        },
        {
          id: "ac-77w",
          aircraft: "Boeing 777-300ER",
          airline: "Air Canada",
          registration: "C-FIVS",
          image: "assets/spotter/aircanada-tail.webp",
          hints: [
            "Long-haul twin with folding raked wingtips and GE90s",
            "Black mask cockpit and red maple leaf tail",
            "Frequent visitor on YYZ to HKG",
          ],
        },
        {
          id: "kl-789",
          aircraft: "Boeing 787-10",
          airline: "KLM",
          registration: "PH-BKH",
          image: "assets/spotter/klm-tail.webp",
          hints: [
            "Blue fuselage with white crown smile, long composite fuselage",
            "GE engines with chevrons and curved wingtips",
            "Arrives in AMS from SIN and JFK overnight",
          ],
        },
        {
          id: "ek-380",
          aircraft: "Airbus A380-800",
          airline: "Emirates",
          registration: "A6-EDP",
          image: "assets/spotter/emirates-tail.webp",
          hints: [
            "Full length double decker with four Engine Alliance GP7200s",
            "Gold tail swoosh and bold billboard titles",
            "Handles the evening DXB to LAX rotation",
          ],
        },
        {
          id: "ba-320",
          aircraft: "Airbus A320neo",
          airline: "British Airways",
          registration: "G-TTNA",
          image: "assets/spotter/british-tail.png",
          hints: [
            "Sharklets sporting red caps",
            "Union flag tail with dark blue belly",
            "Shuttles between LHR and European hubs",
          ],
        },
        {
          id: "qf-738",
          aircraft: "Boeing 737-800",
          airline: "Qantas",
          registration: "VH-VXM",
          image: "assets/spotter/qantas-tail.webp",
          hints: [
            "Red tail white kangaroo, blended winglets",
            "Cabin configured with Business and Economy",
            "Typical on SYD to MEL shuttle runs",
          ],
        },
        {
          id: "g4-a319",
          aircraft: "Airbus A319",
          airline: "Allegiant Air",
          registration: "N321NV",
          image: "assets/spotter/allegiant-tail.webp",
          hints: [
            "Sunburst orange tail fading into blue",
            "Budget carrier titles ahead of the tail",
            "Operates seasonal leisure flights from secondary airports",
          ],
        },
        {
          id: "ha-a321",
          aircraft: "Airbus A321neo",
          airline: "Hawaiian Airlines",
          registration: "N228HA",
          image: "assets/spotter/hawaiian-tail.webp",
          hints: [
            "Magenta and purple hibiscus blossoms sweeping across the tail",
            "White fuselage with purple titles near the front door",
            "Anchors inter-island hops and West Coast runs from HNL",
          ],
        },
        {
          id: "ke-77w",
          aircraft: "Boeing 777-300ER",
          airline: "Korean Air",
          registration: "HL8208",
          image: "assets/spotter/korean-tail.webp",
          hints: [
            "Sky-blue tail featuring the red and blue taegeuk swirl",
            "Year-round service between ICN and major global hubs",
            "Pristine light blue fuselage with grey underbelly",
          ],
        },
        {
          id: "af-a359",
          aircraft: "Airbus A350-900",
          airline: "Air France",
          registration: "F-HTYM",
          image: "assets/spotter/airfrance-tail.webp",
          hints: [
            "Tricolour stripes sweep diagonally across the tail",
            "Bright white fuselage with Air France titles over the windows",
            "Often seen taxiing into CDG after long-haul missions",
          ],
        },
        {
          id: "am-788",
          aircraft: "Boeing 787-8",
          airline: "Aeroméxico",
          registration: "XA-ADL",
          image: "assets/spotter/aeromexico-tail.webp",
          hints: [
            "Dark navy tail featuring the Aztec warrior silhouette",
            "Red cheatline curving toward the tailcone",
            "Evening departures from MEX bound for LAX and JFK",
          ],
        },
        {
          id: "as-739",
          aircraft: "Boeing 737-900",
          airline: "Alaska Airlines",
          registration: "N408AS",
          image: "assets/spotter/alaska-tail.webp",
          hints: [
            "Smiling Eskimo portrait fades from teal to deep blue",
            "Flowing green swoosh along the aft fuselage",
            "Busy linking SEA with West Coast cities",
          ],
        },
        {
          id: "ew-a320",
          aircraft: "Airbus A320",
          airline: "Eurowings",
          registration: "D-AEWM",
          image: "assets/spotter/eurowings-tail.webp",
          hints: [
            "Magenta and turquoise ribbons curl over the fin",
            "Grey lower fuselage with bold Eurowings lettering",
            "Leisure shuttle connecting German bases to Spain",
          ],
        },
        {
          id: "fi-a21n",
          aircraft: "Airbus A321neo",
          airline: "Finnair",
          registration: "OH-LZO",
          image: "assets/spotter/finnair-tail.webp",
          hints: [
            "Navy block letter F on a crisp white tail",
            "Minimalist Scandinavian livery with dark blue titles",
            "Links HEL with hubs across Europe",
          ],
        },
        {
          id: "ita-a339",
          aircraft: "Airbus A330-900",
          airline: "ITA Airways",
          registration: "EI-HJN",
          image: "assets/spotter/ita-tail.webp",
          hints: [
            "Deep Italian blue tail capped with the tricolour tip",
            "Fresh ITA titles by the front boarding door",
            "Handles FCO long-haul routes to South America",
          ],
        },
        {
          id: "ib-a350",
          aircraft: "Airbus A350-900",
          airline: "Iberia",
          registration: "EC-NJM",
          image: "assets/spotter/iberia-tail.webp",
          hints: [
            "Bold red and yellow bands wrap the tail like the Spanish flag",
            "Pearl white fuselage with crimson underbelly ahead of the wing",
            "Madrid departures bound for Latin America",
          ],
        },
        {
          id: "sk-a320",
          aircraft: "Airbus A320",
          airline: "SAS",
          registration: "SE-ROX",
          image: "assets/spotter/sas-tail.webp",
          hints: [
            "Royal blue tail with silver SAS block lettering",
            "Orange engine nacelles stand out against the grey fuselage",
            "Nordic connector linking CPH with European capitals",
          ],
        },
        {
          id: "u2-a319",
          aircraft: "Airbus A319",
          airline: "easyJet",
          registration: "G-EZBI",
          image: "assets/spotter/easyjet-tail.webp",
          hints: [
            "Bright orange tail featuring lowercase easyJet wordmark",
            "Matching orange winglets and engine nacelles",
            "Budget hops from LGW down to sun destinations",
          ],
        },
        {
          id: "vb-a321",
          aircraft: "Airbus A321",
          airline: "Viva Aerobus",
          registration: "XA-VSH",
          image: "assets/spotter/vivaaerobus-tail.webp",
          hints: [
            "White tail dotted with green circles and red titles",
            "Minimalist low-cost branding forward of the tail",
            "Moves holidaymakers from Mexico City to Cancun",
          ],
        },
        {
          id: "vy-a320",
          aircraft: "Airbus A320",
          airline: "Vueling",
          registration: "EC-MLE",
          image: "assets/spotter/vueling-tail.webp",
          hints: [
            "Grey tail speckled with yellow polka dots",
            "Yellow engines and nose cone highlight the livery",
            "Barcelona-based flights to city break hotspots",
          ],
        },
        {
          id: "ws-738",
          aircraft: "Boeing 737-800",
          airline: "WestJet",
          registration: "C-FZRM",
          image: "assets/spotter/westjet-tail.webp",
          hints: [
            "Teal maple leaf swoosh against a navy tail",
            "Updated WESTJET titles stretch across the forward fuselage",
            "Popular on Canadian routes from YYC to YVR",
          ],
        },
        {
          id: "vs-789",
          aircraft: "Boeing 787-9",
          airline: "Virgin Atlantic",
          registration: "G-VNEW",
          image: "assets/spotter/virgin-tail.webp",
          hints: [
            "Glossy red tail emblazoned with the Virgin script",
            "Metallic red engines and wingtips complement the design",
            "Departing LHR for transatlantic gateways",
          ],
        },
        {
          id: "fr-73h",
          aircraft: "Boeing 737-800",
          airline: "Ryanair",
          registration: "EI-DCL",
          image: "assets/spotter/ryanair-tail.webp",
          hints: [
            "Deep navy tail with yellow harp logo",
            "Bold Ryanair titles along the fuselage",
            "Ultra low-cost hops across Europe from DUB",
          ],
        },
        {
          id: "ms-789",
          aircraft: "Boeing 787-9",
          airline: "EgyptAir",
          registration: "SU-GEU",
          image: "assets/spotter/egyptair-tail.webp",
          hints: [
            "Deep blue tail crowned with the golden Horus falcon",
            "Blue wave sweeping down the fuselage",
            "Cairo departures heading overnight to Europe",
          ],
        },
        {
          id: "fi-7m8",
          aircraft: "Boeing 737 MAX 8",
          airline: "Icelandair",
          registration: "TF-ICE",
          image: "assets/spotter/icelandair-tail.jpg",
          hints: [
            "Royal blue tail with bold yellow stylised wing",
            "Cool blue belly matching Icelandic branding",
            "Stops through KEF bridging North America and Europe",
          ],
        },
        {
          id: "ca-a321",
          aircraft: "Airbus A321",
          airline: "Air China",
          registration: "B-5945",
          image: "assets/spotter/airchina-tail.webp",
          hints: [
            "Tail crowned by the red phoenix emblem",
            "Blue cheatline sweeping aft over a white fuselage",
            "Arrives from Beijing on evening long-haul runs",
          ],
        },
        {
          id: "ai-77w",
          aircraft: "Boeing 777-300ER",
          airline: "Air India",
          registration: "VT-ALQ",
          image: "assets/spotter/airindia-tail.webp",
          hints: [
            "Red lattice windows wrap the vertical stabiliser",
            "Orange sash accents the otherwise white fuselage",
            "Connects Delhi with North America overnight",
          ],
        },
        {
          id: "nz-789",
          aircraft: "Boeing 787-9",
          airline: "Air New Zealand",
          registration: "ZK-NZE",
          image: "assets/spotter/airnewzealand-tail.webp",
          hints: [
            "Black tail emblazoned with the silver fern koru",
            "Contrasting black-and-white fuselage styling",
            "Links Auckland with Los Angeles and beyond",
          ],
        },
        {
          id: "ts-a321",
          aircraft: "Airbus A321",
          airline: "Air Transat",
          registration: "C-GTQB",
          image: "assets/spotter/airtransat-tail.webp",
          hints: [
            "Turquoise starburst shining against a white tail",
            "Casual holiday branding along the fuselage",
            "Brings Canadians to Caribbean resorts seasonally",
          ],
        },
        {
          id: "nh-789",
          aircraft: "Boeing 787-9",
          airline: "ANA",
          registration: "JA873A",
          image: "assets/spotter/ana-tail.webp",
          hints: [
            "Dark blue ANA block letters on crisp white tail",
            "Blue cheatline sweeps forward from the tailcone",
            "Tokyo flights bound for Pacific gateway cities",
          ],
        },
        {
          id: "oz-332",
          aircraft: "Airbus A330-300",
          airline: "Asiana Airlines",
          registration: "HL7793",
          image: "assets/spotter/asiana-tail.webp",
          hints: [
            "Gradient tail fading from red into yellow",
            "Grey fuselage with understated Asiana titles",
            "Regional missions radiating from Seoul Incheon",
          ],
        },
        {
          id: "mx-e195",
          aircraft: "Embraer 195",
          airline: "Breeze Airways",
          registration: "N904BZ",
          image: "assets/spotter/breeze-tail.webp",
          hints: [
            "Soft blue tail carrying the playful Breeze chevron",
            "Lowercase titles tucked near the nose",
            "Point-to-point hops along the US Southeast",
          ],
        },
        {
          id: "cx-a359",
          aircraft: "Airbus A350-900",
          airline: "Cathay Pacific",
          registration: "B-LRC",
          image: "assets/spotter/cathay-tail.webp",
          hints: [
            "Teal brushwing logo arcing across the tail",
            "Muted green fuselage shading into white",
            "Long-hauls into Hong Kong from Europe",
          ],
        },
        {
          id: "ly-789",
          aircraft: "Boeing 787-9",
          airline: "El Al",
          registration: "4X-EDB",
          image: "assets/spotter/elal-tail.webp",
          hints: [
            "Blue Star of David emblem flanked by twin stripes",
            "Minimalist Hebrew and English titles",
            "Tel Aviv departures heading to New York",
          ],
        },
        {
          id: "ey-789",
          aircraft: "Boeing 787-9",
          airline: "Etihad Airways",
          registration: "A6-BLV",
          image: "assets/spotter/etihad-tail.webp",
          hints: [
            "Warm geometric mosaic shimmering across the tail",
            "Etihad titles in elegant gold script",
            "Abu Dhabi flights linking Europe and the US",
          ],
        },
        {
          id: "6e-a321",
          aircraft: "Airbus A321neo",
          airline: "IndiGo",
          registration: "VT-IUB",
          image: "assets/spotter/indigo-tail.webp",
          hints: [
            "Deep blue tail dotted with the IndiGo pattern",
            "Stylised dotted cheatline across the cabin",
            "High-frequency shuttle between Delhi and Mumbai",
          ],
        },
        {
          id: "jl-788",
          aircraft: "Boeing 787-8",
          airline: "Japan Airlines",
          registration: "JA828J",
          image: "assets/spotter/jal-tail.webp",
          hints: [
            "Crimson crane emblem on a pristine white tail",
            "Minimalist JAL titles near the forward door",
            "Tokyo departures bound for Pacific cities",
          ],
        },
        {
          id: "jq-a320",
          aircraft: "Airbus A320",
          airline: "Jetstar",
          registration: "VH-VFO",
          image: "assets/spotter/jetstar-tail.webp",
          hints: [
            "Silver tail capped with a bold orange star",
            "Charcoal Jetstar text alongside the fuselage",
            "Budget hops linking Australia and New Zealand",
          ],
        },
        {
          id: "lh-a359",
          aircraft: "Airbus A350-900",
          airline: "Lufthansa",
          registration: "D-AIXP",
          image: "assets/spotter/lufthansa-tail.webp",
          hints: [
            "Deep blue tail carrying the golden crane circle",
            "Elegant Lufthansa typeface across the forward cabin",
            "Frankfurt services headed for long-haul destinations",
          ],
        },
        {
          id: "pd-e195",
          aircraft: "Embraer E195-E2",
          airline: "Porter Airlines",
          registration: "C-GKQA",
          image: "assets/spotter/porter-tail.webp",
          hints: [
            "Midnight blue tail with the Porter logotype",
            "Blue raccoon mascot decal near the entry door",
            "Fresh E2 fleet shuttling from Toronto Pearson",
          ],
        },
        {
          id: "sv-789",
          aircraft: "Boeing 787-9",
          airline: "Saudia",
          registration: "HZ-AR24",
          image: "assets/spotter/saudia-tail.webp",
          hints: [
            "Royal blue tail with gold palm-tree and crossed swords",
            "Cream fuselage featuring Arabic titles",
            "Jeddah flights departing toward Europe",
          ],
        },
        {
          id: "tr-789",
          aircraft: "Boeing 787-9",
          airline: "Scoot",
          registration: "9V-OJE",
          image: "assets/spotter/scoot-tail.webp",
          hints: [
            "Bright yellow tail shouting scoot.com",
            "Playful yellow and white swirl livery",
            "Low-cost long-haul hops from Singapore",
          ],
        },
        {
          id: "sq-359",
          aircraft: "Airbus A350-900",
          airline: "Singapore Airlines",
          registration: "9V-SMF",
          image: "assets/spotter/singapore-tail.webp",
          hints: [
            "Deep blue tail with golden Singapore Girl logo",
            "Gold cheatline tracing the windows",
            "Flagship services out of Changi",
          ],
        },
        {
          id: "sy-73g",
          aircraft: "Boeing 737-700",
          airline: "Sun Country",
          registration: "N713SY",
          image: "assets/spotter/suncountry-tail.webp",
          hints: [
            "Radiant orange tail emblazoned with a sunburst",
            "Blue fuselage advertising holiday escapes",
            "Operates leisure charters from Minneapolis",
          ],
        },
        {
          id: "lx-77w",
          aircraft: "Boeing 777-300ER",
          airline: "Swiss",
          registration: "HB-JNK",
          image: "assets/spotter/swiss-tail.webp",
          hints: [
            "Crisp red tail carrying the Swiss cross",
            "Minimalist all-white fuselage",
            "Zurich departures to global financial hubs",
          ],
        },
        {
          id: "tg-359",
          aircraft: "Airbus A350-900",
          airline: "Thai Airways",
          registration: "HS-THB",
          image: "assets/spotter/thai-tail.webp",
          hints: [
            "Royal purple tail swirling into a golden orchid",
            "Purple belly fading into pearl white",
            "Bangkok flights bound for Europe and Australia",
          ],
        },
        {
          id: "tk-789",
          aircraft: "Boeing 787-9",
          airline: "Turkish Airlines",
          registration: "TC-LLI",
          image: "assets/spotter/turkish-tail.webp",
          hints: [
            "Red tail emblazoned with the white wild goose",
            "Flowing patterns sweep the rear fuselage",
            "Istanbul hub flights spanning the globe",
          ],
        },
        {
          id: "glf6-private",
          aircraft: "Gulfstream G650",
          airline: null,
          registration: "N711QS",
          image: "assets/spotter/private-gulfstream.avif",
          hints: [
            "Ultra-long range business jet with oval windows",
            "Polished bright silver stripe, no airline branding",
            "Operated by charter fractional ownership company",
          ],
        },
      ];

      const airlineSet = new Set(
        flights
          .map((flight) => flight.airline)
          .filter((name) => name && name.trim().length > 0)
      );
      const airlineOptions = Array.from(airlineSet).sort();

      const airlineNoneValue = "__none";

      airlineSelect.textContent = "";
      const airlinePlaceholder = document.createElement("option");
      airlinePlaceholder.value = "";
      airlinePlaceholder.textContent = "Select airline";
      airlinePlaceholder.disabled = true;
      airlinePlaceholder.selected = true;
      airlineSelect.appendChild(airlinePlaceholder);

      const optionRegistry = new Set();

      function addAirlineOption(value, label) {
        if (!value || optionRegistry.has(value)) {
          return;
        }
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        airlineSelect.appendChild(option);
        optionRegistry.add(value);
      }

      function normalizeAirlineName(name) {
        if (typeof name !== "string") {
          return null;
        }
        const trimmed = name.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      function ensureAirlineOption(flight) {
        if (!flight) return;
        const normalized = normalizeAirlineName(flight.airline);
        if (normalized) {
          addAirlineOption(normalized, normalized);
        } else {
          addAirlineOption(airlineNoneValue, "No airline / Private");
        }
      }

      airlineOptions.forEach((value) => {
        const normalized = normalizeAirlineName(value);
        if (normalized) {
          addAirlineOption(normalized, normalized);
        }
      });

      addAirlineOption(airlineNoneValue, "No airline / Private");

      const state = {
        pool: [...flights],
        seen: new Set(),
        round: 0,
        cleared: 0,
        streak: 0,
        bestStreak: 0,
        current: null,
        revealed: false,
      };

      function shufflePool() {
        const source = [...flights];
        for (let i = source.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [source[i], source[j]] = [source[j], source[i]];
        }
        state.pool = source;
      }

      shufflePool();
      loadFlight();

      function drawFlight() {
        if (!state.pool.length) {
          shufflePool();
        }
        return state.pool.pop();
      }

      function loadFlight() {
        state.current = drawFlight();
        ensureAirlineOption(state.current);
        state.round += 1;
        state.revealed = false;
        renderHints();
        airlineSelect.classList.remove("is-correct", "is-wrong");
        airlineSelect.selectedIndex = 0;
        checkBtn.disabled = false;
        revealBtn.disabled = false;
        nextBtn.disabled = true;
        status.textContent = "Lock in the airline for this tail.";
        renderStats();
      }

      function renderHints() {
        hintList.textContent = "";
        if (!state.current) return;
        if (state.current.image) {
          const airlineName =
            normalizeAirlineName(state.current.airline) ?? "Private operator";
          photo.src = state.current.image;
          photo.alt = `${airlineName} tail design`;
          photoWrap.hidden = false;
        } else {
          photo.src = "";
          photoWrap.hidden = true;
        }
        state.current.hints.forEach((hint) => {
          const item = document.createElement("li");
          item.textContent = hint;
          hintList.appendChild(item);
        });
        const tail = document.createElement("li");
        tail.className = "spotter-tail";
        tail.textContent = `Registration noted: ${state.current.registration}`;
        hintList.appendChild(tail);
      }

      function renderStats() {
        roundBadge.textContent = `Flight: ${state.round}`;
        scoreBadge.textContent = `Cleared: ${state.cleared}`;
        streakBadge.textContent = `Streak: ${state.streak}`;
      }

      function evaluateGuess() {
        if (!state.current) return;
        const airlineGuessRaw = airlineSelect.value;
        if (!airlineGuessRaw) {
          status.textContent = "Choose an airline before confirming.";
          return;
        }

        const airlineGuess =
          airlineGuessRaw === airlineNoneValue
            ? null
            : normalizeAirlineName(airlineGuessRaw);

        const airlineCorrect =
          airlineGuess === normalizeAirlineName(state.current.airline);

        state.revealed = true;
        checkBtn.disabled = true;
        revealBtn.disabled = true;
        nextBtn.disabled = false;

        const airlineLabel =
          normalizeAirlineName(state.current.airline) ?? "a private operator";

        if (airlineCorrect) {
          state.cleared += 1;
          state.streak += 1;
          if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
          }
          airlineSelect.classList.remove("is-wrong");
          airlineSelect.classList.add("is-correct");
          const regText = state.current.registration
            ? ` (${state.current.registration})`
            : "";
          status.textContent = `Cleared! That tail belongs to ${airlineLabel}${regText}.`;
        } else {
          status.textContent = `Not quite. That tail belongs to ${airlineLabel}.`;
          state.streak = 0;
          airlineSelect.classList.remove("is-correct");
          airlineSelect.classList.add("is-wrong");
        }
        renderStats();
      }

      function skipFlight() {
        state.streak = 0;
        renderStats();
        loadFlight();
      }

      function revealFlight() {
        if (!state.current || state.revealed) {
          return;
        }
        const normalizedAirline = normalizeAirlineName(state.current.airline);
        const airlineLabel = normalizedAirline ?? "a private operator";
        const regText = state.current.registration
          ? ` (${state.current.registration})`
          : "";
        state.streak = 0;
        state.revealed = true;
        renderStats();
        checkBtn.disabled = true;
        revealBtn.disabled = true;
        nextBtn.disabled = false;
        airlineSelect.classList.remove("is-correct", "is-wrong");
        if (normalizedAirline) {
          airlineSelect.value = normalizedAirline;
        } else {
          airlineSelect.value = airlineNoneValue;
        }
        status.textContent = `Revealed: That tail belongs to ${airlineLabel}${regText}.`;
      }

      const handleCheck = () => {
        evaluateGuess();
      };

      const handleNext = () => {
        if (!state.revealed) {
          status.textContent = "Confirm your guess before moving on.";
          return;
        }
        loadFlight();
      };

      const handleSkip = () => {
        status.textContent = "Skipping this one. New flight inbound.";
        skipFlight();
      };

      const handleReveal = () => {
        revealFlight();
      };

      checkBtn.addEventListener("click", handleCheck);
      revealBtn.addEventListener("click", handleReveal);
      nextBtn.addEventListener("click", handleNext);
      skipBtn.addEventListener("click", handleSkip);

      return () => {
        checkBtn.removeEventListener("click", handleCheck);
        revealBtn.removeEventListener("click", handleReveal);
        nextBtn.removeEventListener("click", handleNext);
        skipBtn.removeEventListener("click", handleSkip);
        wrapper.remove();
      };
    },
  },
  {
    id: "cookieclicker",
    name: "Cookie Clicker",
    summary: "Tap the giant cookie, buy upgrades, and rack up achievements.",
    description:
      "Crank out batches of cookies with every tap. Hire helpers, automate your bakery, and chase achievements as your cookie empire grows.",
    logo: "assets/cookie-clicker-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "cookieclicker";

      const header = document.createElement("section");
      header.className = "cookieclicker-header";

      const totalDisplay = document.createElement("p");
      totalDisplay.className = "cookieclicker-total";
      totalDisplay.textContent = "Cookies: 0";

      const metrics = document.createElement("div");
      metrics.className = "cookieclicker-metrics";

      const perSecondDisplay = document.createElement("span");
      perSecondDisplay.className = "cookieclicker-metric";
      perSecondDisplay.textContent = "Per second: 0";

      const perClickDisplay = document.createElement("span");
      perClickDisplay.className = "cookieclicker-metric";
      perClickDisplay.textContent = "Per click: 1";

      const lifetimeDisplay = document.createElement("span");
      lifetimeDisplay.className = "cookieclicker-metric";
      lifetimeDisplay.textContent = "Total baked: 0";

      metrics.append(perSecondDisplay, perClickDisplay, lifetimeDisplay);
      header.append(totalDisplay, metrics);

      const status = document.createElement("p");
      status.className = "cookieclicker-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Tap the cookie to start baking!";

      const main = document.createElement("div");
      main.className = "cookieclicker-main";

      const oven = document.createElement("div");
      oven.className = "cookieclicker-oven";

      const cookieButton = document.createElement("button");
      cookieButton.type = "button";
      cookieButton.className = "cookieclicker-btn";
      cookieButton.setAttribute("aria-label", "Bake a cookie");
      cookieButton.innerHTML = '<span aria-hidden="true">🍪</span><span class="cookieclicker-btn-label">Bake cookie</span>';

      oven.appendChild(cookieButton);
      main.appendChild(oven);

      const upgradesSection = document.createElement("section");
      upgradesSection.className = "cookieclicker-upgrades";
      const upgradesTitle = document.createElement("h3");
      upgradesTitle.textContent = "Upgrades";
      const upgradesSubtitle = document.createElement("p");
      upgradesSubtitle.className = "cookieclicker-help";
      upgradesSubtitle.textContent = "Spend cookies to boost clicks or automate production.";
      const upgradeGrid = document.createElement("div");
      upgradeGrid.className = "cookieclicker-upgrade-grid";
      upgradesSection.append(upgradesTitle, upgradesSubtitle, upgradeGrid);

      const achievementsSection = document.createElement("section");
      achievementsSection.className = "cookieclicker-achievements";
      const achievementsTitle = document.createElement("h3");
      achievementsTitle.textContent = "Achievements";
      const achievementsList = document.createElement("ul");
      achievementsList.className = "cookieclicker-achievement-list";
      achievementsSection.append(achievementsTitle, achievementsList);

      wrapper.append(header, status, main, upgradesSection, achievementsSection);
      root.appendChild(wrapper);

      const upgradeDefs = [
        {
          id: "mitts",
          name: "Extra Mitts",
          description: "+1 cookie per click.",
          type: "click",
          baseCost: 15,
          costScale: 1.25,
          value: 1,
        },
        {
          id: "rolling-pin",
          name: "Rolling Pin Set",
          description: "+2 cookies per click.",
          type: "click",
          baseCost: 120,
          costScale: 1.35,
          value: 2,
        },
        {
          id: "convection",
          name: "Convection Oven",
          description: "+1 cookie per second.",
          type: "cps",
          baseCost: 90,
          costScale: 1.3,
          value: 1,
        },
        {
          id: "bakery",
          name: "Mini Bakery",
          description: "+4 cookies per second.",
          type: "cps",
          baseCost: 420,
          costScale: 1.5,
          value: 4,
        },
        {
          id: "factory",
          name: "Cookie Factory",
          description: "+12 cookies per second.",
          type: "cps",
          baseCost: 1300,
          costScale: 1.6,
          value: 12,
        },
      ];

      const achievementDefs = [
        {
          id: "first-click",
          name: "First Crumbs",
          description: "Click the cookie once.",
          check: (state) => state.totalClicks >= 1,
        },
        {
          id: "dozen",
          name: "Dozen Delight",
          description: "Bake 50 cookies in total.",
          check: (state) => state.lifetime >= 50,
        },
        {
          id: "century",
          name: "Century Baker",
          description: "Bake 500 cookies in total.",
          check: (state) => state.lifetime >= 500,
        },
        {
          id: "click-master",
          name: "Click Master",
          description: "Tap the cookie 250 times.",
          check: (state) => state.totalClicks >= 250,
        },
        {
          id: "automation",
          name: "Automation Nation",
          description: "Reach 20 cookies per second.",
          check: (state) => state.perSecond >= 20,
        },
        {
          id: "upgrade-fan",
          name: "Upgrade Fanatic",
          description: "Buy 10 upgrades.",
          check: (state) => state.totalUpgrades >= 10,
        },
      ];

      const state = {
        cookies: 0,
        lifetime: 0,
        perSecond: 0,
        clickPower: 1,
        totalClicks: 0,
        totalUpgrades: 0,
        upgrades: new Map(),
        achievementsUnlocked: new Set(),
        rafId: null,
        lastTick: null,
      };

      const upgradeRefs = new Map();
      const achievementRefs = new Map();
      let pressTimeout = null;

      function formatNumber(value) {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
        if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`;
        if (value >= 100) return Math.floor(value).toLocaleString();
        return value.toFixed(1).replace(/\.0$/, "");
      }

      function computeCost(def) {
        const owned = state.upgrades.get(def.id) ?? 0;
        const rawCost = def.baseCost * def.costScale ** owned;
        return Math.ceil(rawCost);
      }

      function updateStats() {
        totalDisplay.textContent = `${formatNumber(state.cookies)} cookies`;
        perSecondDisplay.textContent = `Per second: ${formatNumber(state.perSecond)}`;
        perClickDisplay.textContent = `Per click: ${formatNumber(state.clickPower)}`;
        lifetimeDisplay.textContent = `Total baked: ${formatNumber(state.lifetime)}`;
      }

      function updateUpgrades() {
        upgradeDefs.forEach((def) => {
          const refs = upgradeRefs.get(def.id);
          if (!refs) return;
          const owned = state.upgrades.get(def.id) ?? 0;
          const cost = computeCost(def);
          refs.count.textContent = `Owned: ${owned}`;
          refs.cost.textContent = `Cost: ${formatNumber(cost)}`;
          refs.button.disabled = state.cookies < cost;
        });
      }

      function unlockAchievement(def) {
        if (state.achievementsUnlocked.has(def.id)) return;
        state.achievementsUnlocked.add(def.id);
        const item = achievementRefs.get(def.id);
        if (item) {
          item.classList.add("is-unlocked");
        }
        status.textContent = `Achievement unlocked: ${def.name}!`;
      }

      function checkAchievements() {
        achievementDefs.forEach((def) => {
          if (!state.achievementsUnlocked.has(def.id) && def.check(state)) {
            unlockAchievement(def);
          }
        });
      }

      function addCookies(amount) {
        if (amount <= 0) return;
        state.cookies += amount;
        state.lifetime += amount;
        updateStats();
        updateUpgrades();
        checkAchievements();
      }

      function purchaseUpgrade(def) {
        const cost = computeCost(def);
        if (state.cookies < cost) {
          const deficit = cost - state.cookies;
          status.textContent = `You need ${formatNumber(deficit)} more cookies for ${def.name}.`;
          return;
        }
        state.cookies -= cost;
        const owned = (state.upgrades.get(def.id) ?? 0) + 1;
        state.upgrades.set(def.id, owned);
        state.totalUpgrades += 1;
        if (def.type === "click") {
          state.clickPower += def.value;
        } else if (def.type === "cps") {
          state.perSecond += def.value;
        }
        updateStats();
        updateUpgrades();
        checkAchievements();
        status.textContent = `Purchased ${def.name}!`;
      }

      function startTicker() {
        state.lastTick = performance.now();
        const step = (timestamp) => {
          const delta = timestamp - (state.lastTick ?? timestamp);
          state.lastTick = timestamp;
          if (state.perSecond > 0) {
            addCookies((state.perSecond * delta) / 1000);
          }
          state.rafId = window.requestAnimationFrame(step);
        };
        state.rafId = window.requestAnimationFrame(step);
      }

      upgradeDefs.forEach((def) => {
        const card = document.createElement("article");
        card.className = "cookieclicker-upgrade";

        const name = document.createElement("h4");
        name.textContent = def.name;

        const description = document.createElement("p");
        description.className = "cookieclicker-upgrade-desc";
        description.textContent = def.description;

        const meta = document.createElement("div");
        meta.className = "cookieclicker-upgrade-meta";

        const cost = document.createElement("span");
        cost.className = "cookieclicker-upgrade-cost";

        const count = document.createElement("span");
        count.className = "cookieclicker-upgrade-count";

        meta.append(cost, count);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "cookieclicker-upgrade-btn";
        button.textContent = "Buy";

        const handleClick = () => purchaseUpgrade(def);
        button.addEventListener("click", handleClick);

        card.append(name, description, meta, button);
        upgradeGrid.appendChild(card);

        upgradeRefs.set(def.id, { cost, count, button, handler: handleClick });
      });

      achievementDefs.forEach((def) => {
        const item = document.createElement("li");
        item.className = "cookieclicker-achievement";

        const label = document.createElement("span");
        label.className = "cookieclicker-achievement-name";
        label.textContent = def.name;

        const desc = document.createElement("span");
        desc.className = "cookieclicker-achievement-desc";
        desc.textContent = def.description;

        item.append(label, desc);
        achievementsList.appendChild(item);
        achievementRefs.set(def.id, item);
      });

      const handleCookieClick = () => {
        state.totalClicks += 1;
        addCookies(state.clickPower);
        cookieButton.classList.add("is-pressed");
        if (pressTimeout) {
          window.clearTimeout(pressTimeout);
        }
        pressTimeout = window.setTimeout(() => {
          cookieButton.classList.remove("is-pressed");
        }, 120);
      };

      cookieButton.addEventListener("click", handleCookieClick);

      updateStats();
      updateUpgrades();
      checkAchievements();
      startTicker();

      return () => {
        if (state.rafId) {
          window.cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        if (pressTimeout) {
          window.clearTimeout(pressTimeout);
          pressTimeout = null;
        }
        cookieButton.removeEventListener("click", handleCookieClick);
        upgradeDefs.forEach((def) => {
          const refs = upgradeRefs.get(def.id);
          if (refs) {
            refs.button.removeEventListener("click", refs.handler);
          }
        });
        wrapper.remove();
      };
    },
  },
  {
    id: "neondrift",
    name: "Neon Drift",
    summary: "Choose your car, master wild roads, and outrun the traffic.",
    description:
      "Choose a route, a difficulty, and a car with a special ability. Traffic and speed build as you drive. How far can you go?",
    logo: "assets/neon-drift-cover.png",
    init: createNeonDrift,
  },
  {
    id: "orbit",
    name: "Orbit Dash",
    summary: "Dash through gates while orbiting the core.",
    description:
      "Ride a constant orbit and burst outward at the perfect moment to clear glowing gates. Keep the streak going—miss once and the run is over.",
    logo: "assets/orbit-dash.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "orbit-game";

      const status = document.createElement("div");
      status.className = "orbit-status";
      status.textContent = "Press Start, then start your dash just before the glowing gate to burst through it.";

      const stats = document.createElement("div");
      stats.className = "orbit-stats";

      const scoreBadge = document.createElement("span");
      scoreBadge.className = "badge orbit-score";
      scoreBadge.textContent = "Score: 0";

      const streakBadge = document.createElement("span");
      streakBadge.className = "badge orbit-streak";
      streakBadge.textContent = "Streak: 0";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge orbit-best";
      bestBadge.textContent = "Best: 0";

      stats.append(scoreBadge, streakBadge, bestBadge);

      const field = document.createElement("div");
      field.className = "orbit-field";

      const ring = document.createElement("div");
      ring.className = "orbit-ring";

      const player = document.createElement("div");
      player.className = "orbit-player";

      const gate = document.createElement("div");
      gate.className = "orbit-gate";

      field.append(ring, gate, player);

      const controls = document.createElement("div");
      controls.className = "orbit-controls";

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      const dashBtn = document.createElement("button");
      dashBtn.type = "button";
      dashBtn.className = "orbit-dash-btn";
      dashBtn.textContent = "Dash";
      dashBtn.disabled = true;

      controls.append(startBtn, dashBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Hold Dash/space a moment before the gate to flare outward, release right after you pass it. Drifting by without a burst ends the run.";

      wrapper.append(status, stats, field, controls, help);
      root.appendChild(wrapper);

      const config = {
        baseRadius: 0.42,
        dashRadius: 0.68,
        radiusEase: 0.18,
        angularVelocity: 2.35,
        angularStep: 0.08,
        maxAngularVelocity: 3.25,
        gateWidth: Math.PI / 10,
        hitWindow: Math.PI / 15,
        respawnDelay: 520,
        fieldPadding: 26,
      };

      const state = {
        running: false,
        angle: 0,
        currentRadius: config.baseRadius,
        targetRadius: config.baseRadius,
        dashing: false,
        score: 0,
        streak: 0,
        best: 0,
        gateCenter: 0,
        previousGateCenter: null,
        gateActive: false,
        gateTimeout: null,
        rafId: null,
        lastTimestamp: 0,
        fieldSize: 0,
        fieldRadius: 0,
        angularVelocity: config.angularVelocity,
        keyHeld: false,
      };

      startBtn.addEventListener("click", () => {
        startGame();
      });

      const pointerDownHandler = () => setDash(true);
      const pointerUpHandler = () => setDash(false);

      dashBtn.addEventListener("pointerdown", pointerDownHandler);
      dashBtn.addEventListener("pointerup", pointerUpHandler);
      dashBtn.addEventListener("pointerleave", pointerUpHandler);
      dashBtn.addEventListener("pointercancel", pointerUpHandler);

      field.addEventListener("pointerdown", pointerDownHandler);
      field.addEventListener("pointerup", pointerUpHandler);
      field.addEventListener("pointerleave", pointerUpHandler);
      field.addEventListener("pointercancel", pointerUpHandler);

      const handleKeyDown = (event) => {
        if ((event.code !== "Space" && event.key !== " ") || state.keyHeld) return;
        event.preventDefault();
        state.keyHeld = true;
        setDash(true);
      };

      const handleKeyUp = (event) => {
        if (event.code !== "Space" && event.key !== " ") return;
        event.preventDefault();
        state.keyHeld = false;
        setDash(false);
      };

      const handleResize = () => {
        measureField();
        updatePlayer();
        if (state.gateActive) {
          updateGateVisual();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("resize", handleResize);

      renderStats();
      measureField();
      runLoop();

      function startGame() {
        resetGame();
        state.running = true;
        state.angularVelocity = config.angularVelocity;
        dashBtn.disabled = false;
        startBtn.textContent = "Restart";
        status.textContent = "Dash through the gate glow.";
        spawnGate();
      }

      function resetGame() {
        state.running = false;
        clearTimeout(state.gateTimeout ?? 0);
        state.gateTimeout = null;
        state.angle = 0;
        state.currentRadius = config.baseRadius;
        state.targetRadius = config.baseRadius;
        state.dashing = false;
        state.keyHeld = false;
        state.score = 0;
        state.streak = 0;
        state.gateActive = false;
        gate.classList.remove("is-active", "is-hit");
        dashBtn.disabled = true;
        dashBtn.classList.remove("is-engaged");
        field.classList.remove("is-dashing");
        renderStats();
        measureField();
        updatePlayer();
      }

      function spawnGate() {
        clearTimeout(state.gateTimeout ?? 0);
        state.gateActive = true;
        gate.classList.remove("is-hit");
        gate.classList.add("is-active");
        state.gateCenter = getNewGateAngle();
        state.previousGateCenter = state.gateCenter;
        updateGateVisual();
      }

      function updateGateVisual() {
        const radiusPx = state.fieldRadius;
        gate.style.transform = `translate(-50%, -50%) rotate(${state.gateCenter}rad) translateX(${radiusPx}px)`;
      }

      function getNewGateAngle() {
        const last = state.previousGateCenter;
        let angle = Math.random() * Math.PI * 2;
        if (typeof last === "number") {
          let attempts = 0;
          while (Math.abs(shortestAngleDiff(angle, last)) < config.gateWidth * 0.7 && attempts < 20) {
            angle = Math.random() * Math.PI * 2;
            attempts += 1;
          }
        }
        return angle;
      }

      function setDash(active) {
        if (!state.running) {
          state.dashing = false;
          state.targetRadius = config.baseRadius;
          dashBtn.classList.remove("is-engaged");
          field.classList.remove("is-dashing");
          return;
        }
        state.dashing = active;
        state.targetRadius = active ? config.dashRadius : config.baseRadius;
        dashBtn.classList.toggle("is-engaged", active);
        field.classList.toggle("is-dashing", active);
      }

      function runLoop(timestamp = 0) {
        if (!state.lastTimestamp) {
          state.lastTimestamp = timestamp;
        }
        const delta = (timestamp - state.lastTimestamp) / 1000;
        state.lastTimestamp = timestamp;

        if (state.running) {
          state.angle = normalizeAngle(state.angle + state.angularVelocity * delta);
          checkGate();
        }

        const ease = Math.min(1, config.radiusEase + delta * 3);
        state.currentRadius += (state.targetRadius - state.currentRadius) * ease;
        updatePlayer();

        state.rafId = window.requestAnimationFrame(runLoop);
      }

      function updatePlayer() {
        const radiusPx = state.fieldRadius * state.currentRadius;
        player.style.transform = `translate(-50%, -50%) rotate(${state.angle}rad) translateX(${radiusPx}px)`;
        player.classList.toggle("is-dashing", state.dashing);
      }

      function checkGate() {
        if (!state.gateActive) return;
        const diff = shortestAngleDiff(state.angle, state.gateCenter);
        if (Math.abs(diff) <= config.hitWindow && state.dashing) {
          handleGateSuccess();
        } else if (diff < -config.hitWindow) {
          handleGateMiss();
        }
      }

      function handleGateSuccess() {
        state.gateActive = false;
        gate.classList.remove("is-active");
        gate.classList.add("is-hit");
        state.score += 1;
        state.streak += 1;
        state.best = Math.max(state.best, state.score);
        state.angularVelocity = Math.min(
          config.maxAngularVelocity,
          config.angularVelocity + state.streak * config.angularStep
        );
        status.textContent = state.streak % 5 === 0
          ? "Streak on fire! Burst before the gate and release after crossing."
          : "Clean hit—burst just before the gate and ease off once you’re past it.";
        renderStats();
        state.gateTimeout = window.setTimeout(() => {
          if (!state.running) return;
          spawnGate();
        }, config.respawnDelay);
      }

      function handleGateMiss() {
        state.gateActive = false;
        gate.classList.remove("is-active");
        clearTimeout(state.gateTimeout ?? 0);
        state.gateTimeout = null;
        state.running = false;
        setDash(false);
        dashBtn.disabled = true;
        startBtn.textContent = "Try again";
        status.textContent = `Run ended at ${state.score} ${state.score === 1 ? "gate" : "gates"}. Start your dash just before the gate and release after you cross it.`;
        renderStats();
      }

      function renderStats() {
        scoreBadge.textContent = `Score: ${state.score}`;
        streakBadge.textContent = `Streak: ${state.streak}`;
        bestBadge.textContent = `Best: ${state.best}`;
      }

      function measureField() {
        const size = field.clientWidth || field.offsetWidth || 280;
        state.fieldSize = size;
        state.fieldRadius = Math.max(40, size / 2 - config.fieldPadding);
      }

      function normalizeAngle(value) {
        const tau = Math.PI * 2;
        return ((value % tau) + tau) % tau;
      }

      function shortestAngleDiff(a, b) {
        const diff = a - b;
        return Math.atan2(Math.sin(diff), Math.cos(diff));
      }

      return () => {
        clearTimeout(state.gateTimeout ?? 0);
        cancelAnimationFrame(state.rafId ?? 0);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("resize", handleResize);
        dashBtn.removeEventListener("pointerdown", pointerDownHandler);
        dashBtn.removeEventListener("pointerup", pointerUpHandler);
        dashBtn.removeEventListener("pointerleave", pointerUpHandler);
        dashBtn.removeEventListener("pointercancel", pointerUpHandler);
        field.removeEventListener("pointerdown", pointerDownHandler);
        field.removeEventListener("pointerup", pointerUpHandler);
        field.removeEventListener("pointerleave", pointerUpHandler);
        field.removeEventListener("pointercancel", pointerUpHandler);
        wrapper.remove();
      };
    },
  },
  {
    id: "popdash",
    name: "Pop Dash",
    summary: "Pop bubbles before they fade away.",
    description:
      "Bubbles flash across the arena—click them before they burst on their own. Keep the streak alive, avoid misses, and rack up the highest score!",
    logo: "assets/pop-dash-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "popdash-game";

      const status = document.createElement("div");
      status.className = "popdash-status";
      status.textContent = "Press start and pop the glowing bubbles.";

      const stats = document.createElement("div");
      stats.className = "popdash-stats";

      const scoreBadge = document.createElement("span");
      scoreBadge.className = "badge popdash-score";
      scoreBadge.textContent = "Score: 0";

      const streakBadge = document.createElement("span");
      streakBadge.className = "badge popdash-streak";
      streakBadge.textContent = "Streak: 0";

      const livesBadge = document.createElement("span");
      livesBadge.className = "badge popdash-lives";
      livesBadge.textContent = "Lives: 3";

      const timerBadge = document.createElement("span");
      timerBadge.className = "badge popdash-timer";
      timerBadge.textContent = "Time: 30.0 s";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge popdash-best";
      bestBadge.textContent = "Best: 0";

      stats.append(scoreBadge, streakBadge, livesBadge, timerBadge, bestBadge);

      const field = document.createElement("div");
      field.className = "popdash-field";

      const controls = document.createElement("div");
      controls.className = "popdash-controls";

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      controls.append(startBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "React fast—each bubble only lingers for a moment.";

      wrapper.append(status, stats, field, controls, help);
      root.appendChild(wrapper);

      const config = {
        roundDuration: 30000,
        maxLives: 3,
        startLifetime: 1500,
        minLifetime: 600,
        decayPerPop: 40,
        spawnDelay: 220,
        fieldPadding: 24,
        timerInterval: 100,
      };

      const state = {
        running: false,
        score: 0,
        streak: 0,
        best: 0,
        lives: config.maxLives,
        currentLifetime: config.startLifetime,
        startTime: 0,
        remaining: config.roundDuration,
        timerIntervalId: null,
        bubbleTimeout: null,
        spawnTimeout: null,
        bubbleEl: null,
        fieldWidth: 0,
        fieldHeight: 0,
        cleanupHandlers: [],
      };

      startBtn.addEventListener("click", () => {
        startGame();
      });

      const handleResize = () => {
        measureField();
        repositionBubble();
      };

      window.addEventListener("resize", handleResize);

      measureField();
      renderStats();

      function startGame() {
        resetGame();
        state.running = true;
        state.startTime = performance.now();
        startBtn.textContent = "Restart";
        status.textContent = "Pop the bubbles before they disappear!";
        state.timerIntervalId = window.setInterval(updateTimer, config.timerInterval);
        spawnBubble();
      }

      function resetGame() {
        state.running = false;
        state.score = 0;
        state.streak = 0;
        state.lives = config.maxLives;
        state.currentLifetime = config.startLifetime;
        state.remaining = config.roundDuration;
        clearTimeout(state.bubbleTimeout ?? 0);
        clearTimeout(state.spawnTimeout ?? 0);
        clearInterval(state.timerIntervalId ?? 0);
        state.timerIntervalId = null;
        removeBubble();
        renderStats();
        timerBadge.textContent = `Time: ${formatTime(config.roundDuration)} s`;
      }

      function spawnBubble() {
        clearTimeout(state.spawnTimeout ?? 0);
        if (!state.running) return;
        removeBubble();
        const bubble = document.createElement("button");
        bubble.type = "button";
        bubble.className = "popdash-bubble";
        bubble.setAttribute("aria-label", "Bubble");
        bubble.addEventListener("click", handleBubblePop);
        field.appendChild(bubble);
        state.bubbleEl = bubble;
        positionBubble(bubble);
        state.bubbleTimeout = window.setTimeout(handleBubbleMiss, state.currentLifetime);
      }

      function removeBubble() {
        clearTimeout(state.bubbleTimeout ?? 0);
        state.bubbleTimeout = null;
        if (state.bubbleEl) {
          state.bubbleEl.removeEventListener("click", handleBubblePop);
          state.bubbleEl.remove();
          state.bubbleEl = null;
        }
      }

      function handleBubblePop(event) {
        event.preventDefault();
        if (!state.running) return;
        removeBubble();
        state.score += 1;
        state.streak += 1;
        state.best = Math.max(state.best, state.score);
        state.currentLifetime = Math.max(
          config.minLifetime,
          state.currentLifetime - config.decayPerPop
        );
        status.textContent = state.streak % 5 === 0 ? "Combo!" : "Nice pop.";
        renderStats();
        state.spawnTimeout = window.setTimeout(spawnBubble, config.spawnDelay);
      }

      function handleBubbleMiss() {
        removeBubble();
        if (!state.running) return;
        state.lives -= 1;
        state.streak = 0;
        status.textContent = state.lives > 0 ? "Missed! Focus up." : "All out of lives.";
        renderStats();
        if (state.lives <= 0) {
          endGame(false);
          return;
        }
        state.spawnTimeout = window.setTimeout(spawnBubble, config.spawnDelay);
      }

      function updateTimer() {
        if (!state.running) return;
        const elapsed = performance.now() - state.startTime;
        const remaining = Math.max(0, config.roundDuration - elapsed);
        state.remaining = remaining;
        timerBadge.textContent = `Time: ${formatTime(remaining)} s`;
        if (remaining <= 0) {
          endGame(true);
        }
      }

      function endGame(completed) {
        if (!state.running) return;
        state.running = false;
        clearTimeout(state.bubbleTimeout ?? 0);
        clearTimeout(state.spawnTimeout ?? 0);
        clearInterval(state.timerIntervalId ?? 0);
        state.timerIntervalId = null;
        removeBubble();
        const summary = `Final score: ${state.score}`;
        status.textContent = completed
          ? `${summary}. Time's up!`
          : `${summary}. Game over.`;
        renderStats();
      }

      function renderStats() {
        scoreBadge.textContent = `Score: ${state.score}`;
        streakBadge.textContent = `Streak: ${state.streak}`;
        livesBadge.textContent = `Lives: ${state.lives}`;
        bestBadge.textContent = `Best: ${state.best}`;
      }

      function positionBubble(bubble) {
        const bounds = field.getBoundingClientRect();
        const bubbleSize = bubble.offsetWidth || bubble.clientWidth || 48;
        const maxX = Math.max(0, bounds.width - bubbleSize - config.fieldPadding * 2);
        const maxY = Math.max(0, bounds.height - bubbleSize - config.fieldPadding * 2);
        const x = config.fieldPadding + Math.random() * (maxX || 1);
        const y = config.fieldPadding + Math.random() * (maxY || 1);
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
      }

      function repositionBubble() {
        if (!state.bubbleEl) return;
        positionBubble(state.bubbleEl);
      }

      function measureField() {
        state.fieldWidth = field.clientWidth;
        state.fieldHeight = field.clientHeight;
      }

      function formatTime(ms) {
        return (ms / 1000).toFixed(1);
      }

      return () => {
        clearTimeout(state.bubbleTimeout ?? 0);
        clearTimeout(state.spawnTimeout ?? 0);
        clearInterval(state.timerIntervalId ?? 0);
        window.removeEventListener("resize", handleResize);
        removeBubble();
        wrapper.remove();
      };
    },
  },
  {
    id: "nim",
    name: "Nim Duel",
    summary: "One pile. Up to three matches. The last match wins.",
    description:
      "Remove 1, 2, or 3 matches from one pile each turn. Take the final match on the table to win, against four computer difficulties or a friend on the same device.",
    logo: "assets/nim-duel-cover.png",
    init: createNimDuel,
  },
  {
    id: "bubble",
    name: "Bubble Rally",
    summary: "Boost, shield and pop your way to victory with 2-4 racers.",
    description:
      "Race luminous bubble circuits with up to four human or computer players. Roll fair dice, manage energy, protect your lead and send rivals back to their checkpoint. Every computer has its own difficulty.",
    logo: "assets/bubble-rally-cover.png",
    init: createBubbleRally,
  },
  {
    id: "skyport",
    name: "Skyport Command",
    summary: "Dispatch drones. Reinvest fast before the day ends.",
    description:
      "Balance energy, cargo, and credits while dispatching drones to fulfill contracts. Upgrade your fleet, chain missions, and keep the skyport thriving before time runs out.",
    logo: "assets/skyport.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "skyport-game";

      const status = document.createElement("div");
      status.className = "skyport-status";
      status.textContent = "Welcome commander. Pick any contract, make sure you have the energy, then dispatch a drone to begin.";

      const resources = document.createElement("div");
      resources.className = "skyport-resources";

      const energyBadge = document.createElement("span");
      energyBadge.className = "badge skyport-energy";

      const cargoBadge = document.createElement("span");
      cargoBadge.className = "badge skyport-cargo";

      const creditBadge = document.createElement("span");
      creditBadge.className = "badge skyport-credits";

      resources.append(energyBadge, cargoBadge, creditBadge);

      const layout = document.createElement("div");
      layout.className = "skyport-layout";

      const actionBar = document.createElement("div");
      actionBar.className = "skyport-actions";
      const newDayBtn = document.createElement("button");
      newDayBtn.type = "button";
      newDayBtn.textContent = "Start New Day";
      newDayBtn.addEventListener("click", () => {
        startNewDay();
      });
      actionBar.appendChild(newDayBtn);

      const missionPanel = document.createElement("section");
      missionPanel.className = "skyport-panel skyport-missions";
      const missionHeader = document.createElement("header");
      missionHeader.innerHTML = "<h3>Contracts</h3><p>Select a contract and send a drone before the window closes.</p>";
      const missionList = document.createElement("div");
      missionList.className = "skyport-mission-list";
      missionPanel.append(missionHeader, missionList);

      const dronePanel = document.createElement("section");
      dronePanel.className = "skyport-panel skyport-drones";
      const droneHeader = document.createElement("header");
      droneHeader.innerHTML = "<h3>Drones</h3><p>Manage fleet stamina and cooldowns.</p>";
      const droneList = document.createElement("div");
      droneList.className = "skyport-drone-list";
      dronePanel.append(droneHeader, droneList);

      const upgradePanel = document.createElement("section");
      upgradePanel.className = "skyport-panel skyport-upgrades";
      const upgradeHeader = document.createElement("header");
      upgradeHeader.innerHTML = "<h3>Upgrades</h3><p>Invest credits to unlock better efficiencies.</p>";
      const upgradeList = document.createElement("div");
      upgradeList.className = "skyport-upgrade-list";
      upgradePanel.append(upgradeHeader, upgradeList);

      layout.append(missionPanel, dronePanel, upgradePanel);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Loop: choose a contract, click Dispatch to send an idle drone (costs energy), wait for its return to gain cargo/credits, then reinvest in upgrades before the 3-minute day ends.";

      wrapper.append(status, resources, actionBar, layout, help);
      root.appendChild(wrapper);

      const config = {
        maxEnergy: 100,
        regenRate: 5,
        tickInterval: 2000,
        dayLength: 180000,
        contractSlots: 3,
        contractExpireMin: 20000,
        contractExpireMax: 45000,
        missionDurations: [14000, 18000, 24000, 30000],
        missionEnergyCosts: [15, 20, 28, 36],
        missionRewards: [
          { cargo: 6, credits: 9 },
          { cargo: 9, credits: 13 },
          { cargo: 12, credits: 18 },
          { cargo: 16, credits: 26 },
        ],
      };

      const upgradeCatalog = [
        {
          id: "autopilot",
          name: "Autopilot Algorithms",
          description: "Reduce mission duration by 15% for all drones.",
          cost: 40,
        },
        {
          id: "battery",
          name: "Nano Battery Cells",
          description: "Increase max energy to 130 and regen by +2.",
          cost: 55,
        },
        {
          id: "cargo",
          name: "Cargo Pods",
          description: "Earn +2 cargo on every successful mission.",
          cost: 65,
        },
        {
          id: "analytics",
          name: "Predictive Analytics",
          description: "Contracts expire 5 seconds slower.",
          cost: 75,
        },
      ];

      const baseDrones = [
        { id: "drone-1", name: "Aquila", stamina: 100, busyUntil: 0, level: 1 },
        { id: "drone-2", name: "Lyra", stamina: 100, busyUntil: 0, level: 1 },
        { id: "drone-3", name: "Vega", stamina: 100, busyUntil: 0, level: 1 },
      ];

      const state = {
        energy: 80,
        cargo: 20,
        credits: 25,
        drones: baseDrones.map((drone) => ({ ...drone })),
        upgrades: new Set(),
        contracts: [],
        tickTimer: null,
        dayTimer: null,
        missionTimers: new Set(),
        running: true,
        dayStarted: performance.now(),
      };

      populateContracts();
      renderResources();
      renderDrones();
      renderContracts();
      renderUpgrades();
      startTimers();

      function startTimers() {
        clearInterval(state.tickTimer ?? 0);
        clearTimeout(state.dayTimer ?? 0);
        state.tickTimer = window.setInterval(handleTick, config.tickInterval);
        state.dayTimer = window.setTimeout(endDay, config.dayLength);
      }

      function endDay() {
        state.running = false;
        clearInterval(state.tickTimer ?? 0);
        clearTimeout(state.dayTimer ?? 0);
        status.textContent = `Day complete. Final haul: ${state.cargo} cargo, ${state.credits} credits.`;
        missionList.querySelectorAll("button").forEach((btn) => {
          btn.disabled = true;
        });
      }

      function startNewDay() {
        state.missionTimers.forEach((timerId) => clearTimeout(timerId));
        state.missionTimers.clear();
        state.contracts = [];
        populateContracts();
        const baseEnergy = state.upgrades.has("battery") ? 110 : 80;
        state.energy = baseEnergy;
        state.dayStarted = performance.now();
        state.running = true;
        state.drones = state.drones.map((drone) => ({
          ...drone,
          busyUntil: 0,
          missionDuration: 0,
        }));
        renderContracts();
        renderDrones();
        renderResources();
        status.textContent = "Systems reset. Contracts refreshed for a new day.";
        startTimers();
      }

      function handleTick() {
        if (!state.running) return;
        const regenBoost = state.upgrades.has("battery") ? config.regenRate + 2 : config.regenRate;
        state.energy = Math.min(
          state.upgrades.has("battery") ? 130 : config.maxEnergy,
          state.energy + regenBoost
        );
        advanceContracts();
        updateDroneBusyStates();
        renderResources();
        renderContracts();
        renderDrones();
      }

      function advanceContracts() {
        const now = performance.now();
        state.contracts = state.contracts.filter((contract) => {
          if (contract.status !== "open") return false;
          if (now >= contract.expiresAt) return false;
          return true;
        });
        while (state.contracts.length < config.contractSlots) {
          state.contracts.push(generateContract());
        }
      }

      function updateDroneBusyStates() {
        const now = performance.now();
        state.drones.forEach((drone) => {
          if (drone.busyUntil && now >= drone.busyUntil) {
            drone.busyUntil = 0;
            drone.stamina = Math.max(50, drone.stamina - 15);
            drone.level = Math.min(3, drone.level + 0.2);
            renderDrones();
            status.textContent = `${drone.name} returned from mission.`;
          }
        });
      }

      function generateContract() {
        const difficulty = Math.floor(Math.random() * config.missionDurations.length);
        const duration = config.missionDurations[difficulty];
        const energyCost = config.missionEnergyCosts[difficulty];
        const reward = config.missionRewards[difficulty];
        const now = performance.now();
        const expireBuffer = state.upgrades.has("analytics") ? 5000 : 0;
        const expiresAt =
          now +
          Math.random() * (config.contractExpireMax - config.contractExpireMin) +
          config.contractExpireMin +
          expireBuffer;
        return {
          id: `contract-${crypto.randomUUID?.() ?? Date.now()}-${Math.random()}`,
          energyCost,
          duration,
          reward,
          difficulty,
          status: "open",
          assignedTo: null,
          startedAt: 0,
          expiresAt,
        };
      }

      function populateContracts() {
        state.contracts = [];
        for (let i = 0; i < config.contractSlots; i += 1) {
          state.contracts.push(generateContract());
        }
      }

      function renderResources() {
        energyBadge.textContent = `Energy: ${Math.round(state.energy)}`;
        cargoBadge.textContent = `Cargo: ${state.cargo}`;
        creditBadge.textContent = `Credits: ${state.credits}`;
      }

      function renderDrones() {
        droneList.textContent = "";
        state.drones.forEach((drone) => {
          const card = document.createElement("article");
          card.className = "skyport-drone";
          if (drone.busyUntil) card.classList.add("is-busy");

          const title = document.createElement("h4");
          title.textContent = drone.name;

          const meta = document.createElement("div");
          meta.className = "skyport-drone-meta";
          const stamina = document.createElement("span");
          stamina.textContent = `Stamina ${Math.round(drone.stamina)}`;
          const level = document.createElement("span");
          level.textContent = `Tier ${drone.level.toFixed(1)}`;
          meta.append(stamina, level);

          const progress = document.createElement("div");
          progress.className = "skyport-progress";
          const bar = document.createElement("div");
          bar.className = "skyport-progress-bar";
          if (drone.busyUntil) {
            const remaining = Math.max(0, drone.busyUntil - performance.now());
            const total = drone.missionDuration ?? 1;
            const percent = Math.max(0, 1 - remaining / total) * 100;
            bar.style.width = `${Math.min(100, percent)}%`;
          } else {
            bar.style.width = "0%";
          }
          progress.appendChild(bar);

          card.append(title, meta, progress);
          droneList.appendChild(card);
        });
      }

      function renderContracts() {
        missionList.textContent = "";
        const now = performance.now();
        state.contracts.forEach((contract) => {
          const card = document.createElement("article");
          card.className = "skyport-contract";
          if (contract.status !== "open") {
            card.classList.add("is-locked");
          }

          const tierLabel = ["Short Hop", "Regional", "Continental", "Deep Sky"];
          const header = document.createElement("header");
          header.innerHTML = `<h4>${tierLabel[contract.difficulty]} Duty</h4>`;

          const details = document.createElement("ul");
          details.className = "skyport-contract-details";

          const costItem = document.createElement("li");
          costItem.textContent = `Energy cost: ${contract.energyCost}`;
          const timeItem = document.createElement("li");
          const autopilot = state.upgrades.has("autopilot") ? " (15% less)" : "";
          timeItem.textContent = `Duration: ${Math.round(contract.duration / 1000)}s${autopilot}`;
          const rewardItem = document.createElement("li");
          rewardItem.textContent = `Reward: +${rewardWithBonus(contract.reward.cargo)} cargo, +${contract.reward.credits} credits`;
          const deadline = document.createElement("li");
          const remaining = Math.max(0, contract.expiresAt - now);
          deadline.textContent = `Expiry in ${Math.ceil(remaining / 1000)}s`;

          details.append(costItem, timeItem, rewardItem, deadline);

          const action = document.createElement("button");
          action.type = "button";
          action.className = "skyport-contract-action";
          action.textContent = "Dispatch";
          action.disabled = !state.running || contract.status !== "open" || state.energy < contract.energyCost || !hasIdleDrone();

          action.addEventListener("click", () => {
            dispatchContract(contract);
          });

          card.append(header, details, action);
          missionList.appendChild(card);
        });
      }

      function renderUpgrades() {
        upgradeList.textContent = "";
        upgradeCatalog.forEach((upgrade) => {
          const item = document.createElement("article");
          item.className = "skyport-upgrade";
          if (state.upgrades.has(upgrade.id)) {
            item.classList.add("is-owned");
          }

          const title = document.createElement("h4");
          title.textContent = upgrade.name;

          const description = document.createElement("p");
          description.textContent = upgrade.description;

          const footer = document.createElement("div");
          footer.className = "skyport-upgrade-footer";
          const cost = document.createElement("span");
          cost.textContent = `${upgrade.cost} credits`;

          const action = document.createElement("button");
          action.type = "button";
          action.textContent = state.upgrades.has(upgrade.id) ? "Purchased" : "Buy";
          action.disabled = state.upgrades.has(upgrade.id) || state.credits < upgrade.cost || !state.running;

          action.addEventListener("click", () => {
            if (state.upgrades.has(upgrade.id) || state.credits < upgrade.cost) return;
            state.credits -= upgrade.cost;
            state.upgrades.add(upgrade.id);
            applyUpgradeEffects(upgrade.id);
            renderResources();
            renderUpgrades();
            renderContracts();
            status.textContent = `${upgrade.name} installed.`;
          });

          footer.append(cost, action);
          item.append(title, description, footer);
          upgradeList.appendChild(item);
        });
      }

      function applyUpgradeEffects(id) {
        if (id === "battery") {
          state.energy = Math.min(130, state.energy + 20);
        }
      }

      function rewardWithBonus(baseCargo) {
        return state.upgrades.has("cargo") ? baseCargo + 2 : baseCargo;
      }

      function hasIdleDrone() {
        return state.drones.some((drone) => !drone.busyUntil);
      }

      function dispatchContract(contract) {
        if (!state.running || contract.status !== "open") return;
        const drone = state.drones.find((d) => !d.busyUntil);
        if (!drone) {
          status.textContent = "All drones are busy.";
          return;
        }
        if (state.energy < contract.energyCost) {
          status.textContent = "Insufficient energy for that contract.";
          return;
        }

        state.energy -= contract.energyCost;
        contract.status = "active";
        contract.assignedTo = drone.id;
        contract.startedAt = performance.now();
        const duration = state.upgrades.has("autopilot") ? contract.duration * 0.85 : contract.duration;
        contract.duration = duration;
        drone.busyUntil = contract.startedAt + duration;
        drone.missionDuration = duration;

        renderResources();
        renderContracts();
        renderDrones();
        status.textContent = `${drone.name} launched on ${Math.round(duration / 1000)}s contract.`;

        const timerId = window.setTimeout(() => {
          state.missionTimers.delete(timerId);
          completeContract(contract);
        }, duration + 10);
        state.missionTimers.add(timerId);
      }

      function completeContract(contract) {
        if (contract.status !== "active") return;
        const drone = state.drones.find((d) => d.id === contract.assignedTo);
        if (drone) {
          drone.busyUntil = 0;
        }
        state.cargo += rewardWithBonus(contract.reward.cargo);
        state.credits += contract.reward.credits;
        contract.status = "closed";
        advanceContracts();
        renderResources();
        renderContracts();
        renderDrones();
        status.textContent = `${drone?.name ?? "Drone"} completed the run. Rewards deposited.`;
      }

      return () => {
        clearInterval(state.tickTimer ?? 0);
        clearTimeout(state.dayTimer ?? 0);
        state.missionTimers.forEach((timerId) => clearTimeout(timerId));
        state.missionTimers.clear();
        wrapper.remove();
      };
    },
  },
  {
    id: "harmonic",
    name: "Harmonic Echo",
    summary: "Repeat the melody by tapping glowing instruments.",
    description:
      "Memorize the growing sequence of instruments and echo it back without a mistake. Choose your difficulty and see how long you can keep the groove alive.",
    logo: "assets/harmonic-echo-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "harmonic-game";

      const status = document.createElement("div");
      status.className = "harmonic-status";
      status.textContent = "Pick a mode and press Start to begin.";

      const controls = document.createElement("div");
      controls.className = "harmonic-controls";

      const modeGroup = document.createElement("div");
      modeGroup.className = "harmonic-mode-group";

      const modes = {
        easy: { label: "Easy", instruments: 3, winLength: 12, description: "3 instruments" },
        normal: { label: "Normal", instruments: 4, winLength: 20, description: "Classic quartet" },
        hard: { label: "Hard", instruments: 5, winLength: 15, description: "Adds more on streak" },
      };

      const modeButtons = new Map();
      Object.entries(modes).forEach(([key, config]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "harmonic-mode-btn";
        button.textContent = config.label;
        button.setAttribute("aria-pressed", key === "normal" ? "true" : "false");
        button.addEventListener("click", () => setMode(key));
        modeButtons.set(key, button);
        modeGroup.appendChild(button);
      });

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      controls.append(modeGroup, startBtn);

      const scoreboard = document.createElement("div");
      scoreboard.className = "harmonic-scoreboard";

      const roundBadge = document.createElement("span");
      roundBadge.className = "badge";
      const bestBadge = document.createElement("span");
      bestBadge.className = "badge";
      const modeBadge = document.createElement("span");
      modeBadge.className = "badge";
      scoreboard.append(roundBadge, bestBadge, modeBadge);

      const padGrid = document.createElement("div");
      padGrid.className = "harmonic-pad-grid";

      wrapper.append(status, controls, scoreboard, padGrid);
      root.appendChild(wrapper);

      const instrumentPool = [
        { id: "kick", name: "Bing", frequency: 180, className: "pad-kick" },
        { id: "snare", name: "Bang", frequency: 260, className: "pad-snare" },
        { id: "hat", name: "Boom", frequency: 320, className: "pad-hat" },
        { id: "chime", name: "Bop", frequency: 420, className: "pad-chime" },
        { id: "synth", name: "Bleep", frequency: 510, className: "pad-synth" },
        { id: "bell", name: "Blip", frequency: 580, className: "pad-bell" },
        { id: "clap", name: "Buzz", frequency: 640, className: "pad-clap" },
      ];

      const state = {
        mode: "normal",
        availableCount: modes.normal.instruments,
        sequence: [],
        inputIndex: 0,
        round: 0,
        best: 0,
        playing: false,
        waitingForInput: false,
        dynamismUnlocked: 0,
        timeouts: new Set(),
        audioCtx: null,
        pads: new Map(),
      };

      buildPads();
      renderScoreboard();
      updateModeBadge();
      updatePadVisibility();

      startBtn.addEventListener("click", () => {
        if (!state.audioCtx) {
          state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        startSequence();
      });

      function setMode(modeKey) {
        if (!modes[modeKey]) return;
        state.mode = modeKey;
        state.availableCount = modes[modeKey].instruments;
        state.sequence = [];
        state.round = 0;
        state.waitingForInput = false;
        state.playing = false;
        state.dynamismUnlocked = 0;
        state.timeouts.forEach((id) => clearTimeout(id));
        state.timeouts.clear();
        status.textContent = `Mode set to ${modes[modeKey].label}. Press Start to play.`;
        modeButtons.forEach((button, key) => {
          button.setAttribute("aria-pressed", key === modeKey ? "true" : "false");
        });
        updateModeBadge();
        updatePadVisibility();
        renderScoreboard();
      }

      function buildPads() {
        padGrid.textContent = "";
        instrumentPool.forEach((instrument) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `harmonic-pad ${instrument.className}`;
          button.textContent = instrument.name;
          button.dataset.instrument = instrument.id;
          button.addEventListener("click", () => handlePadPress(instrument.id));
          padGrid.appendChild(button);
          state.pads.set(instrument.id, button);
        });
      }

      function updatePadVisibility() {
        const activeIds = instrumentPool.slice(0, state.availableCount + state.dynamismUnlocked).map((ins) => ins.id);
        state.pads.forEach((pad, id) => {
          if (activeIds.includes(id)) {
            pad.disabled = false;
            pad.classList.remove("is-hidden");
          } else {
            pad.disabled = true;
            pad.classList.add("is-hidden");
          }
        });
      }

      function startSequence() {
        state.timeouts.forEach((id) => clearTimeout(id));
        state.timeouts.clear();
        state.sequence = [];
        state.round = 0;
        state.waitingForInput = false;
        state.playing = true;
        appendToSequence();
      }

      function appendToSequence() {
        const available = instrumentPool.slice(0, state.availableCount + state.dynamismUnlocked);
        const choice = available[Math.floor(Math.random() * available.length)];
        state.sequence.push(choice.id);
        state.round = state.sequence.length;
        renderScoreboard();
        playSequence();
      }

      function playSequence() {
        state.waitingForInput = false;
        let delay = 0;
        state.sequence.forEach((instrumentId, index) => {
          const timeoutId = window.setTimeout(() => {
            triggerPad(instrumentId);
            if (index === state.sequence.length - 1) {
              state.waitingForInput = true;
              state.inputIndex = 0;
              status.textContent = "Your turn—repeat the melody.";
            }
          }, delay);
          state.timeouts.add(timeoutId);
          delay += 600;
        });
      }

      function handlePadPress(instrumentId) {
        if (!state.waitingForInput) return;
        triggerPad(instrumentId);
        const expected = state.sequence[state.inputIndex];
        if (instrumentId !== expected) {
          failSequence();
          return;
        }
        state.inputIndex += 1;
        if (state.inputIndex === state.sequence.length) {
          state.waitingForInput = false;
          if (state.round > state.best) {
            state.best = state.round;
          }
          if (didWinRound()) {
            handleWin();
            return;
          }
          status.textContent = "Nice! Listen for the next note.";
          const timeoutId = window.setTimeout(() => {
            appendToSequence();
          }, 900);
          state.timeouts.add(timeoutId);
        }
      }

      function didWinRound() {
        const target = modes[state.mode].winLength;
        if (state.mode !== "hard") {
          return target && state.round >= target;
        }
        return state.round >= target;
      }

      function handleWin() {
        state.waitingForInput = false;
        state.playing = false;
        status.textContent = "Perfect streak! Sequence mastered.";
        if (state.mode === "hard") {
          if (state.availableCount + state.dynamismUnlocked < instrumentPool.length) {
            state.dynamismUnlocked += 1;
            status.textContent += " Extra instrument unlocked!";
            updatePadVisibility();
          }
        }
        renderScoreboard();
      }

      function failSequence() {
        state.waitingForInput = false;
        state.playing = false;
        state.sequence = [];
        state.round = 0;
        state.timeouts.forEach((id) => clearTimeout(id));
        state.timeouts.clear();
        renderScoreboard();
        status.textContent = "Missed a note. Press Start to try again.";
      }

      function triggerPad(instrumentId) {
        const instrument = instrumentPool.find((entry) => entry.id === instrumentId);
        if (!instrument) return;
        const pad = state.pads.get(instrumentId);
        if (pad) {
          pad.classList.add("is-active");
          const timeoutId = window.setTimeout(() => {
            pad.classList.remove("is-active");
            state.timeouts.delete(timeoutId);
          }, 260);
          state.timeouts.add(timeoutId);
        }
        playSound(instrument.frequency);
      }

      function playSound(frequency) {
        if (!state.audioCtx) {
          state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = state.audioCtx;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const harmonics = [frequency, frequency * 2, frequency * 3];
        const now = ctx.currentTime;

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.22;

        const harmonicOscillators = harmonics.slice(1).map((value, index) => {
          const osc = ctx.createOscillator();
          osc.type = index % 2 === 0 ? "triangle" : "square";
          osc.frequency.value = value;
          const harmonicGain = ctx.createGain();
          harmonicGain.gain.value = 0.04;
          osc.connect(harmonicGain);
          harmonicGain.connect(gain);
          osc.start(now);
          osc.stop(now + 0.45);
          return osc;
        });

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        oscillator.stop(now + 0.45);

        window.setTimeout(() => {
          harmonicOscillators.forEach((osc) => {
            try {
              osc.disconnect();
            } catch (error) {}
          });
        }, 500);
      }

      function updateModeBadge() {
        modeBadge.textContent = `Mode: ${modes[state.mode].label}`;
      }

      function renderScoreboard() {
        roundBadge.textContent = `Round: ${state.round}`;
        bestBadge.textContent = `Best: ${state.best}`;
      }

      return () => {
        state.timeouts.forEach((id) => clearTimeout(id));
        state.timeouts.clear();
        if (state.audioCtx && typeof state.audioCtx.close === "function") {
          state.audioCtx.close().catch(() => {});
        }
        wrapper.remove();
      };
    },
  },
  {
    id: "spotclash",
    name: "Spot Clash",
    summary: "Race the AI to find the shared symbol.",
    description:
      "Scan the twin glyph cards and tap the symbol they share before the AI locks it in. Dial up the difficulty for faster, sharper rivals.",
    logo: "assets/spot-clash-cover.png",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "spotclash-game";

      const status = document.createElement("div");
      status.className = "spotclash-status";
      status.textContent = "Select a difficulty and press Start to begin.";

      const controls = document.createElement("div");
      controls.className = "spotclash-controls";

      const difficultyGroup = document.createElement("div");
      difficultyGroup.className = "spotclash-difficulty";

      const difficulties = Object.fromEntries(OPPONENT_LEVELS.map((level, index) => [level.id, {
        label: level.label, cardSize: 5 + index, target: 7 + index,
      }]));
      let computer = createComputerOpponent();
      const computerClock = createOpponentScheduler();

      const difficultyButtons = new Map();
      Object.entries(difficulties).forEach(([key, value]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "spotclash-difficulty-btn";
        button.textContent = value.label;
        button.setAttribute("aria-pressed", key === "medium" ? "true" : "false");
        button.addEventListener("click", () => setDifficulty(key));
        difficultyButtons.set(key, button);
        difficultyGroup.appendChild(button);
      });

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      controls.append(difficultyGroup, startBtn);

      const scoreboard = document.createElement("div");
      scoreboard.className = "spotclash-scoreboard";
      const playerBadge = document.createElement("span");
      playerBadge.className = "badge";
      const aiBadge = document.createElement("span");
      aiBadge.className = "badge";
      const targetBadge = document.createElement("span");
      targetBadge.className = "badge";
      scoreboard.append(playerBadge, aiBadge, targetBadge);

      const board = document.createElement("div");
      board.className = "spotclash-board";

      const cardPlayer = document.createElement("div");
      cardPlayer.className = "spotclash-card spotclash-card-player";
      const cardAI = document.createElement("div");
      cardAI.className = "spotclash-card spotclash-card-ai";
      board.append(cardPlayer, cardAI);

      wrapper.append(status, controls, scoreboard, board);
      root.appendChild(wrapper);

      const symbolBank = [
        "★",
        "◆",
        "✿",
        "☂",
        "⚓",
        "♞",
        "☄",
        "♣",
        "♠",
        "⚡",
        "☕",
        "♨",
        "☯",
        "♻",
        "✈",
        "☀",
        "☾",
        "⚙",
        "♫",
        "⚗",
      ];

      const state = {
        difficulty: "medium",
        playerScore: 0,
        aiScore: 0,
        roundActive: false,
        sharedSymbol: null,
        playerSymbols: [],
        aiSymbols: [],
        winTarget: difficulties.medium.target,
        aiCorrect: false,
      };

      startBtn.addEventListener("click", () => {
        resetGame();
        startRound();
      });

      function setDifficulty(key) {
        if (!difficulties[key]) return;
        state.difficulty = key;
        computer = createComputerOpponent({ difficulty: key });
        state.winTarget = difficulties[key].target;
        difficultyButtons.forEach((button, valueKey) => {
          button.setAttribute("aria-pressed", valueKey === key ? "true" : "false");
        });
        resetGame(false);
        status.textContent = `${difficulties[key].label} locked in. Press Start to play.`;
        renderScoreboard();
      }

      function resetGame(updateStatus = true) {
        computerClock.cancel();
        state.playerScore = 0;
        state.aiScore = 0;
        state.roundActive = false;
        state.sharedSymbol = null;
        state.playerSymbols = [];
        state.aiSymbols = [];
        renderCards();
        renderScoreboard();
        if (updateStatus) {
          status.textContent = "Cards shuffled. Tap Start for the next rally.";
        }
      }

      function renderScoreboard() {
        playerBadge.textContent = `You: ${state.playerScore}`;
        aiBadge.textContent = `AI: ${state.aiScore}`;
        targetBadge.textContent = `First to ${state.winTarget}`;
      }

      function renderCards() {
        cardPlayer.textContent = "";
        cardAI.textContent = "";
        if (!state.playerSymbols.length) {
          cardPlayer.append(emptyCardMessage("Awaiting start"));
          cardAI.append(emptyCardMessage("Awaiting start"));
          return;
        }
        state.playerSymbols.forEach((symbol) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "spotclash-symbol";
          button.textContent = symbol;
          button.addEventListener("click", () => handlePlayerGuess(symbol));
          cardPlayer.appendChild(button);
        });
        state.aiSymbols.forEach((symbol) => {
          const slot = document.createElement("div");
          slot.className = "spotclash-symbol spotclash-symbol-ai";
          slot.textContent = symbol;
          cardAI.appendChild(slot);
        });
      }

      function emptyCardMessage(text) {
        const span = document.createElement("span");
        span.className = "spotclash-card-empty";
        span.textContent = text;
        return span;
      }

      function startRound() {
        computerClock.cancel();
        state.roundActive = true;
        const config = difficulties[state.difficulty];
        const { shared, playerCard, aiCard } = buildCards(config.cardSize);
        state.sharedSymbol = shared;
        state.playerSymbols = playerCard;
        state.aiSymbols = aiCard;
        renderCards();
        status.textContent = "Find the shared symbol before the AI does.";
        scheduleAiMove();
      }

      function buildCards(size) {
        const pool = [...symbolBank];
        shuffle(pool);
        const shared = pool.pop();
        const playerCard = new Set([shared]);
        const aiCard = new Set([shared]);
        while (playerCard.size < size) {
          playerCard.add(pool.pop());
        }
        while (aiCard.size < size) {
          const symbol = pool.pop();
          if (!playerCard.has(symbol) || symbol === shared) {
            aiCard.add(symbol);
          }
        }
        return {
          shared,
          playerCard: [...playerCard].sort(),
          aiCard: [...aiCard].sort(),
        };
      }

      function handlePlayerGuess(symbol) {
        if (!state.roundActive) return;
        if (symbol === state.sharedSymbol) {
          state.roundActive = false;
          computerClock.cancel();
          state.playerScore += 1;
          status.textContent = "You spotted it first!";
          checkForWinner();
        } else {
          state.roundActive = false;
          computerClock.cancel();
          state.aiScore += 1;
          status.textContent = "Wrong symbol—AI scores the point.";
          checkForWinner();
        }
      }

      function scheduleAiMove() {
        const plan = computer.planReaction();
        state.aiCorrect = plan.correct;
        computerClock.schedule(performAiMove, plan.delay);
      }

      function performAiMove() {
        if (!state.roundActive) return;
        const config = difficulties[state.difficulty];
        const correct = state.aiCorrect;
        const pick = correct
          ? state.sharedSymbol
          : pickIncorrectSymbol();
        state.roundActive = false;
        if (pick === state.sharedSymbol) {
          state.aiScore += 1;
          status.textContent = `${config.label} AI spotted it!`;
        } else {
          state.playerScore += 1;
          status.textContent = "AI slipped—your point!";
        }
        checkForWinner();
      }

      function pickIncorrectSymbol() {
        const distractors = state.aiSymbols.filter((symbol) => symbol !== state.sharedSymbol);
        if (distractors.length === 0) return state.sharedSymbol;
        return distractors[Math.floor(Math.random() * distractors.length)];
      }

      function checkForWinner() {
        renderScoreboard();
        if (state.playerScore >= state.winTarget || state.aiScore >= state.winTarget) {
          const winner = state.playerScore > state.aiScore ? "You" : "AI";
          status.textContent = `${winner} win the match! Press Start to challenge again.`;
          state.roundActive = false;
          return;
        }
        computerClock.schedule(startRound, 1100);
      }

      function shuffle(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      return () => {
        computerClock.dispose();
        wrapper.remove();
      };
    },
  },
  {
    id: "catsdogs",
    name: "Cats vs Dogs",
    summary: "Catch the beat. Win the tug. Rule the park.",
    description: "Personalize your cat and dog, then fight for the park. Hit moving targets, counter sabotage, and win a best-of-three tug championship against a computer or a friend.",
    logo: "assets/cats-dogs-cover-v3.jpg",
    init: createCatsDogs,
  },
  {
    id: "haunt",
    name: "Haunted Harvest",
    summary: "Solve spooky riddles, gather candle wax, and carve protective lanterns.",
    description:
      "Harvest three haunted paths before midnight. Outwit cursed pumpkins, avoid wandering ghosts, and carve your own glowing jack-o'-lanterns to keep the grove safe.",
    logo: "assets/haunted-harvest-cover.png",
    init: createHauntedHarvest,
  },
  {
    id: "lights",
    name: "Lights Down",
    summary: "Toggle tiles to switch off the board.",
    description:
      "Tap the tiles to toggle them and their neighbors. Turn every tile off in as few moves as possible.",
    logo: "assets/lights-down.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "lights-out";

      const sizes = [3, 4, 5, 6, 7];

      const controls = document.createElement("div");
      controls.className = "lights-controls";

      const sizeLabel = document.createElement("label");
      sizeLabel.className = "range-select";
      const sizeLabelText = document.createElement("span");
      sizeLabelText.textContent = "Grid";

      const sizeSelect = document.createElement("select");
      sizeSelect.setAttribute("aria-label", "Lights grid size");
      sizes.forEach((dimension) => {
        const option = document.createElement("option");
        option.value = String(dimension);
        option.textContent = `${dimension} × ${dimension}`;
        if (dimension === 5) option.selected = true;
        sizeSelect.appendChild(option);
      });
      sizeLabel.append(sizeLabelText, sizeSelect);

      const hintButton = document.createElement("button");
      hintButton.type = "button";
      hintButton.textContent = "Get answer";

      const confirmBar = document.createElement("div");
      confirmBar.className = "hint-confirm";
      confirmBar.hidden = true;

      const confirmText = document.createElement("span");
      confirmText.textContent = "Show solution tiles?";

      const confirmYes = document.createElement("button");
      confirmYes.type = "button";
      confirmYes.className = "hint-confirm-yes";
      confirmYes.textContent = "Yes";

      const confirmNo = document.createElement("button");
      confirmNo.type = "button";
      confirmNo.textContent = "Cancel";

      confirmBar.append(confirmText, confirmYes, confirmNo);
      controls.append(sizeLabel, hintButton, confirmBar);

      const meta = document.createElement("div");
      meta.className = "lights-meta";

      const moveCounter = document.createElement("span");
      moveCounter.className = "badge";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "Shuffle";

      meta.append(moveCounter, resetBtn);

      const grid = document.createElement("div");
      grid.className = "lights-grid";

      const note = document.createElement("p");
      note.className = "help-text";

      wrapper.append(controls, meta, grid, note);
      root.appendChild(wrapper);

      const state = {
        size: 5,
        board: [],
        moves: 0,
        toggleMatrix: buildToggleMatrix(5),
        hintActive: false,
        hintLookup: new Map(),
        hintMoves: [],
        hintUsed: false,
      };

      initializeBoard();

      grid.addEventListener("click", (event) => {
        const target = event.target.closest("button.light-cell");
        if (!target) return;
        if (isSolved()) return;
        const row = Number(target.dataset.row);
        const col = Number(target.dataset.col);
        toggle(row, col);
        state.moves += 1;
        render();
        if (isSolved()) {
          showVictory();
        }
      });

      resetBtn.addEventListener("click", () => {
        initializeBoard();
      });

      sizeSelect.addEventListener("change", () => {
        const dimension = Number.parseInt(sizeSelect.value, 10);
        if (!Number.isNaN(dimension) && sizes.includes(dimension)) {
          state.size = dimension;
          state.toggleMatrix = buildToggleMatrix(state.size);
          initializeBoard();
        }
      });

      hintButton.addEventListener("click", () => {
        confirmBar.hidden = false;
        confirmYes.focus();
      });

      confirmNo.addEventListener("click", () => {
        confirmBar.hidden = true;
      });

      confirmYes.addEventListener("click", () => {
        confirmBar.hidden = true;
        const success = refreshHints({ announce: true });
        render();
        if (!success) {
          note.classList.remove("status-good", "status-bad");
          note.textContent = "Couldn't compute a solution for this board state.";
        }
      });

      function createBoard() {
        let newBoard;
        do {
          newBoard = randomBoard(state.size);
        } while (!isSolvableBoard(newBoard, state.toggleMatrix, state.size));
        return newBoard;
      }

      function randomBoard(dimension) {
        let candidate;
        do {
          candidate = Array.from({ length: dimension }, () =>
            Array.from({ length: dimension }, () => Math.random() < 0.5)
          );
        } while (candidate.every((row) => row.every((cell) => cell === false)));
        return candidate;
      }

      function render() {
        moveCounter.textContent = `Moves: ${state.moves}`;
        grid.textContent = "";
        grid.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
        grid.classList.toggle(
          "has-hints",
          state.hintActive && state.hintLookup.size > 0
        );
        state.board.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const button = document.createElement("button");
            button.className = "light-cell";
            if (cell) button.classList.add("on");
            button.dataset.row = String(rowIndex);
            button.dataset.col = String(colIndex);
            const key = `${rowIndex}:${colIndex}`;
            if (state.hintActive && state.hintLookup.has(key)) {
              const stepIndex = state.hintLookup.get(key);
              if (stepIndex === 0) {
                button.classList.add("light-hint-primary");
              } else {
                button.classList.add("light-hint-queued");
              }
            }
            grid.appendChild(button);
          });
        });
      }

      function toggle(row, col) {
        const positions = [
          [row, col],
          [row - 1, col],
          [row + 1, col],
          [row, col - 1],
          [row, col + 1],
        ];
        positions.forEach(([r, c]) => {
          if (r >= 0 && r < state.size && c >= 0 && c < state.size) {
            state.board[r][c] = !state.board[r][c];
          }
        });
        if (state.hintActive) {
          refreshHints();
        }
      }

      function isSolved() {
        return state.board.every((row) => row.every((cell) => cell === false));
      }

      function isSolvableBoard(boardState, matrixSource, dimension) {
        const matrix = matrixSource.map((row) => row.slice());
        const vector = boardToVector(boardState);
        const total = dimension * dimension;
        let pivotRow = 0;

        for (let col = 0; col < total && pivotRow < total; col += 1) {
          let swapRow = pivotRow;
          while (swapRow < total && matrix[swapRow][col] === 0) {
            swapRow += 1;
          }
          if (swapRow === total) continue;

          if (swapRow !== pivotRow) {
            [matrix[pivotRow], matrix[swapRow]] = [matrix[swapRow], matrix[pivotRow]];
            [vector[pivotRow], vector[swapRow]] = [vector[swapRow], vector[pivotRow]];
          }

          for (let r = 0; r < total; r += 1) {
            if (r !== pivotRow && matrix[r][col] === 1) {
              for (let c = col; c < total; c += 1) {
                matrix[r][c] ^= matrix[pivotRow][c];
              }
              vector[r] ^= vector[pivotRow];
            }
          }

          pivotRow += 1;
        }

        for (let r = pivotRow; r < total; r += 1) {
          const hasCoefficient = matrix[r].some((value) => value === 1);
          if (!hasCoefficient && vector[r] === 1) {
            return false;
          }
        }

        return true;
      }

      function boardToVector(state) {
        const vector = [];
        state.forEach((row) => {
          row.forEach((cell) => {
            vector.push(cell ? 1 : 0);
          });
        });
        return vector;
      }

      function buildToggleMatrix(dimension) {
        const total = dimension * dimension;
        const matrix = Array.from({ length: total }, () =>
          Array.from({ length: total }, () => 0)
        );

        for (let row = 0; row < dimension; row += 1) {
          for (let col = 0; col < dimension; col += 1) {
            const index = row * dimension + col;
            const positions = [
              [row, col],
              [row - 1, col],
              [row + 1, col],
              [row, col - 1],
              [row, col + 1],
            ];

            positions.forEach(([r, c]) => {
              if (r >= 0 && r < dimension && c >= 0 && c < dimension) {
                const toggledIndex = r * dimension + c;
                matrix[index][toggledIndex] = 1;
              }
            });
          }
        }

        return matrix;
      }

      function refreshHints({ announce = false } = {}) {
        const solutionVector = solveBoard(state.board, state.toggleMatrix, state.size);
        if (!solutionVector) {
          clearHints();
          if (announce) {
            note.classList.remove("status-good", "status-bad");
            note.textContent = "Solution unavailable for this configuration.";
          }
          return false;
        }

        const hintLookup = new Map();
        const hintMoves = [];
        solutionVector.forEach((value, index) => {
          if (value === 1) {
            const row = Math.floor(index / state.size);
            const col = index % state.size;
            const step = hintMoves.length;
            hintMoves.push({ row, col });
            hintLookup.set(`${row}:${col}`, step);
          }
        });

        state.hintMoves = hintMoves;
        state.hintLookup = hintLookup;
        state.hintActive = hintMoves.length > 0;
        state.hintUsed = state.hintUsed || hintMoves.length > 0;

        if (announce) {
          note.classList.remove("status-good", "status-bad");
          if (hintMoves.length === 0) {
            note.classList.add("status-good");
            note.textContent = "Already solved! Tap Shuffle to play again.";
          } else {
            note.classList.add("status-good");
            note.textContent = `Highlighted tiles show one solution in ${hintMoves.length} ${
              hintMoves.length === 1 ? "move" : "moves"
            }.`;
          }
        }

        return true;
      }

      function clearHints() {
        state.hintActive = false;
        state.hintMoves = [];
        state.hintLookup = new Map();
      }

      function solveBoard(boardState, matrixSource, dimension) {
        const total = dimension * dimension;
        const vector = boardToVector(boardState);
        const augmented = matrixSource.map((row, rowIndex) => {
          const extended = row.slice();
          extended.push(vector[rowIndex]);
          return extended;
        });

        const pivotCols = new Array(total).fill(-1);
        let pivotRow = 0;

        for (let col = 0; col < total && pivotRow < total; col += 1) {
          let row = pivotRow;
          while (row < total && augmented[row][col] === 0) {
            row += 1;
          }
          if (row === total) continue;

          if (row !== pivotRow) {
            [augmented[pivotRow], augmented[row]] = [augmented[row], augmented[pivotRow]];
          }

          pivotCols[pivotRow] = col;

          for (let r = 0; r < total; r += 1) {
            if (r !== pivotRow && augmented[r][col] === 1) {
              for (let c = col; c <= total; c += 1) {
                augmented[r][c] ^= augmented[pivotRow][c];
              }
            }
          }

          pivotRow += 1;
        }

        for (let r = pivotRow; r < total; r += 1) {
          const hasCoefficient = augmented[r].slice(0, total).some((value) => value === 1);
          if (!hasCoefficient && augmented[r][total] === 1) {
            return null;
          }
        }

        const solution = new Array(total).fill(0);
        for (let r = 0; r < pivotRow; r += 1) {
          const pivotCol = pivotCols[r];
          if (pivotCol !== -1) {
            solution[pivotCol] = augmented[r][total];
          }
        }

        return solution;
      }

      function initializeBoard() {
        state.toggleMatrix = buildToggleMatrix(state.size);
        state.board = createBoard();
        state.moves = 0;
        state.hintUsed = false;
        clearHints();
        confirmBar.hidden = true;
        note.classList.remove("status-good", "status-bad");
        note.textContent = getHelpText();
        moveCounter.textContent = "Moves: 0";
        grid.setAttribute("data-dimension", String(state.size));
        render();
      }

      function getHelpText() {
        return `Each tap flips the tile plus its neighbors. Can you zero the ${state.size} × ${state.size} grid?`;
      }

      function showVictory() {
        note.classList.remove("status-bad");
        note.classList.add("status-good");
        const moveWord = state.moves === 1 ? "move" : "moves";
        note.textContent = state.hintUsed
          ? `Victory! Cleared the ${state.size} × ${state.size} grid in ${state.moves} ${moveWord} with a hint assist. Tap Shuffle for a new challenge.`
          : `Victory! Cleared the ${state.size} × ${state.size} grid in ${state.moves} ${moveWord}. Tap Shuffle for a new challenge.`;
        clearHints();
      }

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "submerged",
    name: "Submerged Explorer",
    summary: "Glide through ocean zones and complete underwater missions.",
    description:
      "Pilot a retro sub through five ocean zones, gather samples, and complete mission objectives while dodging hazards.",
    logo: "assets/submerged.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "submerged-frame";

      const iframe = document.createElement("iframe");
      iframe.src = "submerged.html";
      iframe.title = "Submerged Explorer game";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer";

      wrapper.appendChild(iframe);
      root.appendChild(wrapper);

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "spotdiff",
    name: "Spotlight",
    summary: "Beautiful pictures. Hidden differences. A closer look.",
    description: "Compare richly detailed pictures across four difficulty levels. Find the changes, earn shared coins, and build your picture collection.",
    logo: "assets/spotlight-cover.jpg",
    init: createSpotlight,
  },
];

const appRoot = document.getElementById("app");
const homeList = document.querySelector(".game-list");
const homeView = document.querySelector(".home-view");
const gameCard = document.querySelector(".game-card");
const titleEl = document.getElementById("game-title");
const descEl = document.getElementById("game-description");
const rootEl = document.getElementById("game-root");
const listTemplate = document.getElementById("game-list-item-template");
const backButton = document.querySelector(".back-button");

const LOCK_PASSWORD = "1108";
const LOCKED_GAME_IDS = new Set(["skyport", "orbit", "rocket"]);
let lockedUnlocked = false;
lockedUnlocked = false;

let comingList = null;
let lockedHint = null;
let lockedInput = null;
let passButton = null;

let activeId = null;
let cleanup = null;

mountArcadeNavigation(document.querySelector(".site-header"));

if (appRoot) {
  appRoot.dataset.state = "home";
}

if (homeView) {
  const comingSection = document.createElement("section");
  comingSection.className = "coming-strip";

  const heading = document.createElement("h2");
  heading.textContent = "Coming Soon";

  const infoRow = document.createElement("div");
  infoRow.className = "coming-info";

  lockedHint = document.createElement("p");
  lockedHint.className = "coming-text";
  lockedHint.textContent = lockedUnlocked
    ? "Access granted. Enjoy these prototypes!"
    : "Enter your access key to preview upcoming games.";

  const passForm = document.createElement("form");
  passForm.className = "coming-pass";
  lockedInput = document.createElement("input");
  lockedInput.type = "password";
  lockedInput.placeholder = "Access key";
  lockedInput.autocomplete = "off";
  passButton = document.createElement("button");
  passButton.type = "submit";
  passButton.textContent = lockedUnlocked ? "Unlocked" : "Unlock";
  if (lockedUnlocked) passButton.disabled = true;
  passForm.append(lockedInput, passButton);

  passForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (lockedUnlocked) return;
    if (lockedInput.value.trim() === LOCK_PASSWORD) {
      lockedUnlocked = true;
      lockedHint.textContent = "Access granted. Enjoy these prototypes!";
      passButton.textContent = "Unlocked";
      passButton.disabled = true;
      buildGameLists();
    } else {
      lockedHint.textContent = "Incorrect key. Try again.";
      lockedInput.value = "";
      lockedInput.focus();
    }
  });

  infoRow.append(lockedHint, passForm);

  comingList = document.createElement("ul");
  comingList.className = "coming-strip-list";

  comingSection.append(heading, infoRow, comingList);
  homeView.appendChild(comingSection);
}

if (homeList && listTemplate) {
  buildGameLists();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

if (backButton) {
  backButton.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.hash = "";
    showHome();
  });
}

function buildGameLists() {
  if (homeList) homeList.textContent = "";
  if (comingList) comingList.textContent = "";

  games.forEach((game) => {
    const item = listTemplate.content.firstElementChild.cloneNode(true);
    const link = item.querySelector(".game-tile");
    const name = item.querySelector(".game-name");
    const blurb = item.querySelector(".game-blurb");
    const icon = item.querySelector(".game-icon");
    if (!link || !name || !blurb || !icon) return;

    name.textContent = game.name;
    blurb.textContent = game.summary ?? game.description;
    if (game.logo) {
      icon.src = game.logo;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
    } else {
      icon.remove();
    }

    if (LOCKED_GAME_IDS.has(game.id)) {
      if (lockedUnlocked) {
        link.href = `#${game.id}`;
        link.classList.remove("tile-locked");
        link.removeAttribute("aria-disabled");
        link.addEventListener("click", (event) => {
          event.preventDefault();
          if (window.location.hash === `#${game.id}`) {
            renderRoute();
          } else {
            window.location.hash = game.id;
          }
        });
      } else {
        link.href = "#";
        link.classList.add("tile-locked");
        link.setAttribute("aria-disabled", "true");
        link.addEventListener("click", (event) => {
          event.preventDefault();
          handleLockedAttempt();
        });
      }
      comingList?.appendChild(item);
    } else {
      link.href = `#${game.id}`;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (window.location.hash === `#${game.id}`) {
          renderRoute();
        } else {
          window.location.hash = game.id;
        }
      });
      homeList?.appendChild(item);
    }
  });
}

function renderRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    showHome();
    return;
  }
  const storeRoute = /^store(?:\/(flappy|archery|snake|neondrift|rocket|memory|spotdiff|catsdogs))?$/.exec(hash);
  if (storeRoute) {
    showGame({ id: hash, name: "The Arcade Shop", description: "Earn coins in one game. Find something you love for another.", init: root => createArcadeShop(root, storeRoute[1] || "all") });
    return;
  }
  if (hash === "flappy/customize") {
    history.replaceState(null, "", "#characters/flappy"); renderRoute(); return;
  }
  const characterRoute = /^characters(?:\/(flappy|archery|snake|neondrift|redlight|rocket|catsdogs))?$/.exec(hash);
  if (characterRoute) {
    if (activeId === "characters") return;
    showGame({ id: "characters", name: "Your Character Library", description: "Choose your game, then customize its characters, gear, and world.", init: root => createCharacterLibrary(root, { gameId: characterRoute[1], mountEditor: (id, host, onAppearanceChange) => games.find(game => game.id === id).init(host, { editorOnly: true, onAppearanceChange }) }) });
    return;
  }
  const gameId = /^flappy\/(shop|customize)$/.test(hash) ? "flappy" : hash;
  const game = games.find((entry) => entry.id === gameId);
  if (!game) {
    showHome(true);
    return;
  }
  if (LOCKED_GAME_IDS.has(game.id) && !lockedUnlocked) {
    handleLockedAttempt();
    showHome(true);
    return;
  }
  if (game.id === "flappy" && activeId === "flappy") return;
  showGame(game);
}

function showHome(replaceHash = false) {
  if (typeof cleanup === "function") {
    cleanup();
    cleanup = null;
  }
  if (rootEl) rootEl.innerHTML = "";
  if (titleEl) titleEl.textContent = "";
  if (descEl) descEl.textContent = "";
  activeId = null;
  if (appRoot) appRoot.dataset.state = "home";
  if (replaceHash) {
    replaceUrl(window.location.pathname + window.location.search);
  }
}

function showGame(game) {
  if (typeof cleanup === "function") {
    cleanup();
    cleanup = null;
  }
  if (!rootEl || !titleEl || !descEl) return;
  titleEl.textContent = game.name;
  descEl.textContent = game.description;
  rootEl.innerHTML = "";
  cleanup = game.init(rootEl);
  activeId = game.id;
  if (appRoot) appRoot.dataset.state = "game";
}

function replaceUrl(url) {
  try {
    history.replaceState(null, "", url);
  } catch (error) {
    window.location.hash = "";
  }
}

function handleLockedAttempt() {
  if (lockedUnlocked) return;
  if (lockedHint) lockedHint.textContent = "These games are still baking. Enter your access key above to peek behind the curtain.";
  lockedInput?.focus();
}
