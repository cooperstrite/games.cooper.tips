const games = [
  {
    id: "guess",
    name: "Hot & Cold",
    description:
      "Guess the hidden number between 1 and 100. Each attempt gives you warmer or colder hints as you zero in.",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "guess-game";

      const state = {
        secret: getSecret(),
        attempts: [],
        finished: false,
        bestScore: null,
      };

      const controls = document.createElement("div");
      controls.className = "controls";

      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = "100";
      input.placeholder = "Enter a number";
      input.setAttribute("inputmode", "numeric");

      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "primary-btn";
      actionBtn.textContent = "Take a guess";

      controls.append(input, actionBtn);

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.innerHTML = "<strong>Ready?</strong><span>Type a number to get started.</span>";

      const historyTitle = document.createElement("h3");
      historyTitle.textContent = "Your guesses";

      const historyList = document.createElement("ul");
      historyList.className = "list-inline";

      const info = document.createElement("p");
      info.className = "help-text";
      info.textContent = "Tip: Use the arrow keys or enter key to make quick adjustments.";

      wrapper.append(controls, feedback, historyTitle, historyList, info);
      root.appendChild(wrapper);

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          actionBtn.click();
        }
      });

      actionBtn.addEventListener("click", () => {
        if (state.finished) {
          reset();
          return;
        }
        const value = Number.parseInt(input.value, 10);
        if (Number.isNaN(value) || value < 1 || value > 100) {
          renderFeedback("Try a valid number between 1 and 100.", "status-bad");
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
                : ` Best so far: ${state.bestScore} tries.`)
          );
          actionBtn.textContent = "Play again";
          input.disabled = true;
        } else {
          const diff = Math.abs(value - state.secret);
          let tone = "Chilly";
          if (diff <= 2) tone = "Scorching";
          else if (diff <= 5) tone = "Hot";
          else if (diff <= 10) tone = "Warm";
          else if (diff <= 20) tone = "Cool";

          const direction = value > state.secret ? "Too high" : "Too low";
          renderFeedback(
            `${tone}! ${direction}.`,
            diff <= 10 ? "status-good" : "status-bad",
            `Attempt #${state.attempts.length}. Keep going!`
          );
          input.value = "";
          input.focus();
        }
      });

      function renderFeedback(message, statusClass, detail) {
        const lines = [`<strong class="${statusClass}">${message}</strong>`];
        if (detail) {
          lines.push(`<span>${detail}</span>`);
        }
        feedback.innerHTML = lines.join("");
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

      function reset() {
        state.secret = getSecret();
        state.attempts = [];
        state.finished = false;
        renderHistory();
        renderFeedback("New number ready. Fire away!", "status-good");
        actionBtn.textContent = "Take a guess";
        input.disabled = false;
        input.value = "";
        input.focus();
      }

      function getSecret() {
        return Math.floor(Math.random() * 100) + 1;
      }

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "reaction",
    name: "Flash Reflex",
    description:
      "Test how fast you can click when the screen flashes. Wait for the glow, then tap as quickly as possible.",
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
        const delay = Math.random() * 2200 + 1200;
        timeoutId = window.setTimeout(() => {
          phase = "go";
          startTime = performance.now();
          timer.textContent = "GO!";
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
    id: "lights",
    name: "Lights Down",
    description:
      "Tap the tiles to toggle them and their neighbors. Turn every tile off in as few moves as possible.",
    init(root) {
      const size = 5;
      const wrapper = document.createElement("div");
      wrapper.className = "lights-out";

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
      grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

      const note = document.createElement("p");
      note.className = "help-text";
      note.textContent = "Each tap flips the tile plus its neighbors. Can you zero the board?";

      wrapper.append(meta, grid, note);
      root.appendChild(wrapper);

      let board = createBoard();
      let moves = 0;
      render();

      grid.addEventListener("click", (event) => {
        const target = event.target.closest("button.light-cell");
        if (!target) return;
        if (isSolved()) return;
        const row = Number(target.dataset.row);
        const col = Number(target.dataset.col);
        toggle(row, col);
        moves += 1;
        render();
        if (isSolved()) {
          note.textContent = `Lights out! Cleared in ${moves} ${moves === 1 ? "move" : "moves"}.`;
          note.classList.add("status-good");
        }
      });

      resetBtn.addEventListener("click", () => {
        board = createBoard();
        moves = 0;
        note.textContent = "Each tap flips the tile plus its neighbors. Can you zero the board?";
        note.classList.remove("status-good");
        render();
      });

      function createBoard() {
        let newBoard;
        do {
          newBoard = Array.from({ length: size }, () =>
            Array.from({ length: size }, () => Math.random() < 0.5)
          );
        } while (newBoard.every((row) => row.every((cell) => cell === false)));
        return newBoard;
      }

      function render() {
        moveCounter.textContent = `Moves: ${moves}`;
        grid.textContent = "";
        board.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const button = document.createElement("button");
            button.className = "light-cell";
            if (cell) button.classList.add("on");
            button.dataset.row = String(rowIndex);
            button.dataset.col = String(colIndex);
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
          if (r >= 0 && r < size && c >= 0 && c < size) {
            board[r][c] = !board[r][c];
          }
        });
      }

      function isSolved() {
        return board.every((row) => row.every((cell) => cell === false));
      }

      return () => {
        wrapper.remove();
      };
    },
  },
];

const nav = document.querySelector(".game-nav");
const titleEl = document.getElementById("game-title");
const descEl = document.getElementById("game-description");
const rootEl = document.getElementById("game-root");
const buttonTemplate = document.getElementById("nav-button-template");

let activeId = null;
let cleanup = null;

if (nav && titleEl && descEl && rootEl && buttonTemplate) {
  buildNavigation();
  setActiveGame(games[0].id);
}

function buildNavigation() {
  games.forEach((game) => {
    const button = buttonTemplate.content.firstElementChild.cloneNode(true);
    button.textContent = game.name;
    button.setAttribute("data-game", game.id);
    button.addEventListener("click", () => {
      if (game.id !== activeId) {
        setActiveGame(game.id);
      }
    });
    nav.appendChild(button);
  });
}

function setActiveGame(id) {
  const game = games.find((item) => item.id === id);
  if (!game) return;

  if (typeof cleanup === "function") {
    cleanup();
    cleanup = null;
  }
  rootEl.innerHTML = "";

  titleEl.textContent = game.name;
  descEl.textContent = game.description;
  cleanup = game.init(rootEl);
  activeId = id;
  refreshNav();
}

function refreshNav() {
  const buttons = nav.querySelectorAll(".nav-button");
  buttons.forEach((button) => {
    const isActive = button.getAttribute("data-game") === activeId;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}
