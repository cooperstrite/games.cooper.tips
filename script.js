const games = [
  {
    id: "guess",
    name: "Hot & Cold",
    summary: "Guess the number with hot/cold hints.",
    description:
      "Guess the hidden number between 1 and 100. Each attempt gives you warmer or colder hints as you zero in.",
    logo: "assets/hot-and-cold.svg",
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
    logo: "assets/flash-reflex.svg",
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
          note.textContent = `Lights out! Cleared the ${state.size} × ${state.size} grid in ${state.moves} ${
            state.moves === 1 ? "move" : "moves"
          }.`;
          note.classList.add("status-good");
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
              button.classList.add("light-hint");
              button.dataset.hintStep = String(state.hintLookup.get(key) + 1);
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

      return () => {
        wrapper.remove();
      };
    },
  },
];

const appRoot = document.getElementById("app");
const homeList = document.querySelector(".game-list");
const gameCard = document.querySelector(".game-card");
const titleEl = document.getElementById("game-title");
const descEl = document.getElementById("game-description");
const rootEl = document.getElementById("game-root");
const listTemplate = document.getElementById("game-list-item-template");
const backButton = document.querySelector(".back-button");

let activeId = null;
let cleanup = null;

if (appRoot) {
  appRoot.dataset.state = "home";
}

if (homeList && listTemplate) {
  buildGameList();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

if (backButton) {
  backButton.addEventListener("click", () => {
    window.location.hash = "";
  });
}

function buildGameList() {
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
    link.href = `#${game.id}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.location.hash === `#${game.id}`) {
        renderRoute();
      } else {
        window.location.hash = game.id;
      }
    });
    homeList.appendChild(item);
  });
}

function renderRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    showHome();
    return;
  }
  const game = games.find((entry) => entry.id === hash);
  if (!game) {
    showHome(true);
    return;
  }
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
