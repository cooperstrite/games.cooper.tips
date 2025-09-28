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
    summary: "Spot three differences before the timer runs out.",
    description:
      "Compare two vibrant scenes and tap the subtle changes. Find every difference to set a new best time!",
    logo: "assets/spot-difference.svg",
    init(root) {
      const encodeSvg = (svg) =>
        `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

      const modes = {
        easy: { label: "Easy", timeLimit: 240, radiusScale: 1.35, extension: 60, differences: 3 },
        mild: { label: "Mild", timeLimit: 210, radiusScale: 1.2, extension: 45, differences: 4 },
        medium: { label: "Medium", timeLimit: 180, radiusScale: 1, extension: 30, differences: 5 },
        hard: { label: "Hard", timeLimit: 150, radiusScale: 0.85, extension: 25, differences: 6 },
        expert: { label: "Expert", timeLimit: 120, radiusScale: 0.7, extension: 20, differences: 6 },
      };

      const puzzles = [
        {
          id: "reef",
          title: "Kelp Reef",
          left: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0" stop-color="#7fe3ff" />
                  <stop offset="1" stop-color="#003a66" />
                </linearGradient>
              </defs>
              <rect width="400" height="300" fill="url(#bg)" />
              <circle cx="70" cy="70" r="30" fill="#ffd972" />
              <path d="M40 280c0-60 30-90 30-140 10 30 40 60 40 140" fill="none" stroke="#38c172" stroke-width="14" stroke-linecap="round" />
              <path d="M320 260c0-70-25-90-25-140-16 32-44 64-44 140" fill="none" stroke="#f36f98" stroke-width="14" stroke-linecap="round" />
              <ellipse cx="280" cy="160" rx="26" ry="18" fill="#8c6ff8" />
              <ellipse cx="280" cy="160" rx="12" ry="9" fill="#fff3ff" />
              <polygon points="150,210 170,250 130,250" fill="#ff9d72" />
              <circle cx="210" cy="110" r="12" fill="#ffffff" opacity="0.4" />
              <circle cx="230" cy="95" r="8" fill="#ffffff" opacity="0.35" />
            </svg>
          `),
          right: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0" stop-color="#7fe3ff" />
                  <stop offset="1" stop-color="#003a66" />
                </linearGradient>
              </defs>
              <rect width="400" height="300" fill="url(#bg)" />
              <path d="M40 280c0-60 30-90 30-140 10 30 40 60 40 140" fill="none" stroke="#38c172" stroke-width="14" stroke-linecap="round" />
              <path d="M320 260c0-70-25-90-25-140-16 32-44 64-44 140" fill="none" stroke="#f36f98" stroke-width="14" stroke-linecap="round" />
              <ellipse cx="280" cy="160" rx="26" ry="18" fill="#2bd9ff" />
              <ellipse cx="280" cy="160" rx="12" ry="9" fill="#ffffff" opacity="0.55" />
              <polygon points="150,210 170,250 130,250" fill="#6242ff" />
              <circle cx="210" cy="110" r="12" fill="#ffffff" opacity="0.4" />
            </svg>
          `),
          differences: [
            { x: 18, y: 23, radius: 9 },
            { x: 70, y: 35, radius: 8 },
            { x: 37, y: 79, radius: 8 },
            { x: 52, y: 58, radius: 7 },
            { x: 82, y: 64, radius: 7 },
            { x: 58, y: 14, radius: 7 },
          ],
        },
        {
          id: "city",
          title: "Neon Skyline",
          left: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#0b1a38" />
                <stop offset="1" stop-color="#031126" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#sky)" />
              <circle cx="320" cy="70" r="26" fill="#ffd1f7" />
              <g fill="#141f3c">
                <rect x="40" y="140" width="80" height="160" />
                <rect x="140" y="110" width="70" height="190" />
                <rect x="230" y="130" width="90" height="170" />
                <rect x="330" y="150" width="40" height="150" />
              </g>
              <rect x="60" y="170" width="12" height="18" fill="#72f6ff" />
              <rect x="90" y="200" width="12" height="18" fill="#72f6ff" />
              <rect x="155" y="140" width="14" height="24" fill="#ffd972" />
              <rect x="255" y="170" width="16" height="40" fill="#ff9d72" />
              <circle cx="110" cy="80" r="12" fill="#f36f98" />
            </svg>
          `),
          right: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#0b1a38" />
                <stop offset="1" stop-color="#031126" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#sky)" />
              <circle cx="320" cy="70" r="26" fill="#ffd972" />
              <g fill="#141f3c">
                <rect x="40" y="140" width="80" height="160" />
                <rect x="140" y="110" width="70" height="190" />
                <rect x="230" y="130" width="90" height="170" />
                <rect x="330" y="150" width="40" height="150" />
              </g>
              <rect x="60" y="170" width="12" height="18" fill="#72f6ff" />
              <rect x="90" y="200" width="12" height="18" fill="#72f6ff" />
              <rect x="155" y="140" width="14" height="24" fill="#8c6ff8" />
              <rect x="255" y="170" width="16" height="40" fill="#ff9d72" />
              <circle cx="110" cy="80" r="12" fill="#f36f98" />
              <rect x="350" y="200" width="12" height="28" fill="#72f6ff" />
            </svg>
          `),
          differences: [
            { x: 80, y: 23, radius: 8 },
            { x: 39, y: 56, radius: 7 },
            { x: 88, y: 63, radius: 7 },
            { x: 62, y: 74, radius: 7 },
            { x: 50, y: 46, radius: 7 },
            { x: 20, y: 72, radius: 7 },
          ],
        },
        {
          id: "lab",
          title: "Stellar Lab",
          left: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <rect width="400" height="300" fill="#101728" />
              <circle cx="320" cy="60" r="16" fill="#ffd972" />
              <circle cx="60" cy="70" r="6" fill="#72f6ff" />
              <circle cx="120" cy="40" r="4" fill="#72f6ff" />
              <g fill="#18253b">
                <rect x="40" y="140" width="120" height="120" rx="16" />
                <rect x="190" y="160" width="170" height="100" rx="20" />
              </g>
              <rect x="60" y="160" width="80" height="60" rx="10" fill="#2bd9ff" />
              <circle cx="220" cy="200" r="30" fill="#8c6ff8" />
              <circle cx="220" cy="200" r="16" fill="#ffffff" opacity="0.6" />
              <rect x="300" y="190" width="40" height="24" rx="6" fill="#f36f98" />
              <rect x="300" y="220" width="40" height="12" rx="6" fill="#ffd972" />
              <circle cx="90" cy="220" r="8" fill="#ffffff" opacity="0.5" />
            </svg>
          `),
          right: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <rect width="400" height="300" fill="#101728" />
              <circle cx="320" cy="60" r="16" fill="#ffd972" />
              <circle cx="60" cy="70" r="6" fill="#72f6ff" />
              <circle cx="120" cy="40" r="4" fill="#ffd972" />
              <g fill="#18253b">
                <rect x="40" y="140" width="120" height="120" rx="16" />
                <rect x="190" y="160" width="170" height="100" rx="20" />
              </g>
              <rect x="60" y="160" width="80" height="60" rx="10" fill="#2bd9ff" />
              <circle cx="220" cy="200" r="30" fill="#8c6ff8" />
              <circle cx="220" cy="200" r="16" fill="#ffffff" opacity="0.6" />
              <rect x="300" y="190" width="40" height="24" rx="6" fill="#f36f98" />
              <rect x="300" y="220" width="40" height="12" rx="6" fill="#72f6ff" />
              <circle cx="90" cy="220" r="8" fill="#ffffff" opacity="0.5" />
              <circle cx="260" cy="120" r="10" fill="#ff9d72" />
            </svg>
          `),
          differences: [
            { x: 30, y: 20, radius: 8 },
            { x: 75, y: 24, radius: 7 },
            { x: 80, y: 75, radius: 7 },
            { x: 65, y: 40, radius: 7 },
            { x: 50, y: 60, radius: 7 },
            { x: 70, y: 68, radius: 7 },
          ],
        },
        {
          id: "panel",
          title: "Pixel Panels",
          left: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="panel-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#0f1a32" />
                <stop offset="1" stop-color="#050915" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#panel-bg)" />
              <rect x="40" y="60" width="80" height="80" rx="12" fill="#ffd972" />
              <rect x="160" y="60" width="80" height="80" rx="12" fill="#72f6ff" />
              <rect x="280" y="60" width="80" height="80" rx="12" fill="#8c6ff8" />
              <rect x="40" y="170" width="80" height="80" rx="12" fill="#ff9d72" />
              <rect x="160" y="170" width="80" height="80" rx="12" fill="#2bd9ff" />
              <rect x="280" y="170" width="80" height="80" rx="12" fill="#f36f98" />
            </svg>
          `),
          right: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="panel-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#0f1a32" />
                <stop offset="1" stop-color="#050915" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#panel-bg)" />
              <rect x="40" y="60" width="80" height="80" rx="12" fill="#ffe7b3" />
              <rect x="160" y="60" width="80" height="80" rx="12" fill="#ff9d72" />
              <rect x="280" y="60" width="80" height="80" rx="12" fill="#ffd972" />
              <rect x="40" y="170" width="80" height="80" rx="12" fill="#2bd9ff" />
              <rect x="160" y="170" width="80" height="80" rx="12" fill="#8c6ff8" />
              <rect x="280" y="170" width="80" height="80" rx="12" fill="#72f6ff" />
            </svg>
          `),
          differences: [
            { x: 20, y: 33, radius: 9 },
            { x: 50, y: 33, radius: 9 },
            { x: 80, y: 33, radius: 9 },
            { x: 20, y: 70, radius: 9 },
            { x: 50, y: 70, radius: 9 },
            { x: 80, y: 70, radius: 9 },
          ],
        },
        {
          id: "arcade",
          title: "Retro Arcade",
          left: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="arcade-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#15072b" />
                <stop offset="1" stop-color="#02111f" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#arcade-bg)" />
              <rect x="70" y="200" width="260" height="60" rx="20" fill="#141f3c" />
              <rect x="110" y="210" width="30" height="60" rx="10" fill="#ffd972" />
              <circle cx="125" cy="180" r="18" fill="#ffd972" />
              <circle cx="120" cy="110" r="30" fill="#ff9d72" />
              <rect x="200" y="90" width="60" height="40" rx="8" fill="#72f6ff" />
              <circle cx="290" cy="120" r="14" fill="#ffd972" />
              <circle cx="220" cy="220" r="14" fill="#8c6ff8" />
              <circle cx="260" cy="220" r="14" fill="#2bd9ff" />
              <circle cx="300" cy="220" r="14" fill="#f36f98" />
            </svg>
          `),
          right: encodeSvg(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <linearGradient id="arcade-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0" stop-color="#15072b" />
                <stop offset="1" stop-color="#02111f" />
              </linearGradient>
              <rect width="400" height="300" fill="url(#arcade-bg)" />
              <rect x="70" y="200" width="260" height="60" rx="20" fill="#141f3c" />
              <rect x="110" y="210" width="30" height="60" rx="10" fill="#8c6ff8" />
              <circle cx="125" cy="180" r="18" fill="#8c6ff8" />
              <circle cx="120" cy="110" r="30" fill="#72f6ff" />
              <rect x="200" y="90" width="60" height="40" rx="8" fill="#ffd972" />
              <circle cx="290" cy="120" r="14" fill="#f36f98" />
              <circle cx="220" cy="220" r="14" fill="#ffd972" />
              <circle cx="260" cy="220" r="14" fill="#f36f98" />
              <circle cx="300" cy="220" r="14" fill="#2bd9ff" />
            </svg>
          `),
          differences: [
            { x: 30, y: 36, radius: 8 },
            { x: 57, y: 36, radius: 8 },
            { x: 73, y: 40, radius: 8 },
            { x: 31, y: 60, radius: 8 },
            { x: 55, y: 73, radius: 8 },
            { x: 65, y: 73, radius: 8 },
          ],
        },
      ];

      const state = {
        puzzleIndex: 0,
        found: new Set(),
        startTime: null,
        timerId: null,
        bestTimes: new Map(),
        mode: "medium",
        timeRemaining: modes.medium.timeLimit,
        timerRunning: false,
        failed: false,
        lastTick: 0,
        activeDiffs: [],
      };

      const container = document.createElement("div");
      container.className = "spotdiff-root";

      const header = document.createElement("div");
      header.className = "spotdiff-header";

      const score = document.createElement("div");
      score.className = "spotdiff-score";
      score.innerHTML = `
        <div>Found: <span id="spotdiffFound">0</span> / <span id="spotdiffTotal">0</span></div>
        <div>Time: <span id="spotdiffTimer">00:00</span></div>
      `;

      const modeBar = document.createElement("div");
      modeBar.className = "spotdiff-mode-buttons";

      const addPuzzleButton = (puzzle, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "spotdiff-puzzle-btn";
        button.textContent = puzzle.title;
        button.setAttribute("aria-pressed", index === state.puzzleIndex ? "true" : "false");
        button.addEventListener("click", () => selectPuzzle(index));
        puzzleList.appendChild(button);
      };

      const puzzleList = document.createElement("div");
      puzzleList.className = "spotdiff-puzzle-list";
      puzzles.forEach((puzzle, index) => addPuzzleButton(puzzle, index));

      Object.entries(modes).forEach(([key, info]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "spotdiff-mode-btn";
        button.textContent = info.label;
        button.dataset.mode = key;
        button.setAttribute("aria-pressed", key === state.mode ? "true" : "false");
        button.addEventListener("click", () => changeMode(key));
        modeBar.appendChild(button);
      });

      header.append(score, modeBar, puzzleList);

      const board = document.createElement("div");
      board.className = "spotdiff-board";

      const leftPanel = document.createElement("div");
      leftPanel.className = "spotdiff-panel spotdiff-panel-left";
      const leftImg = document.createElement("img");
      leftImg.alt = "Left scene";
      leftPanel.appendChild(leftImg);

      const rightPanel = document.createElement("div");
      rightPanel.className = "spotdiff-panel spotdiff-panel-right";
      const rightImg = document.createElement("img");
      rightImg.alt = "Right scene";
      rightPanel.appendChild(rightImg);

      board.append(leftPanel, rightPanel);

      const controls = document.createElement("div");
      controls.className = "spotdiff-controls";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "spotdiff-puzzle-btn";
      resetBtn.textContent = "Restart puzzle";
      resetBtn.addEventListener("click", () => selectPuzzle(state.puzzleIndex, true));

      const extendWrap = document.createElement("div");
      extendWrap.className = "spotdiff-extend";

      const extendLabel = document.createElement("span");
      extendLabel.textContent = "Extend timer:";

      const extendSelect = document.createElement("select");
      [15, 30, 45, 60].forEach((seconds) => {
        const option = document.createElement("option");
        option.value = String(seconds);
        option.textContent = `${seconds}s`;
        if (seconds === modes[state.mode].extension) option.selected = true;
        extendSelect.appendChild(option);
      });

      const extendBtn = document.createElement("button");
      extendBtn.type = "button";
      extendBtn.className = "spotdiff-puzzle-btn";
      extendBtn.textContent = "Add time";
      extendBtn.addEventListener("click", () => {
        const amount = Number.parseInt(extendSelect.value, 10);
        state.timeRemaining += amount;
        updateTimerDisplay();
        message.textContent = `Added ${amount} seconds to the clock.`;
      });

      extendWrap.append(extendLabel, extendSelect, extendBtn);

      const message = document.createElement("div");
      message.className = "spotdiff-message";
      message.textContent = "Pick a difference to begin.";

      controls.append(resetBtn, extendWrap, message);

      const customSection = document.createElement("details");
      customSection.className = "spotdiff-custom";
      const summary = document.createElement("summary");
      summary.textContent = "Create custom puzzle";
      customSection.appendChild(summary);

      const customTitle = document.createElement("input");
      customTitle.type = "text";
      customTitle.placeholder = "Puzzle title";

      const customLeft = document.createElement("input");
      customLeft.type = "file";
      customLeft.accept = "image/*";

      const customRight = document.createElement("input");
      customRight.type = "file";
      customRight.accept = "image/*";

      const differencesLabel = document.createElement("small");
      differencesLabel.textContent = "Differences (one per line, format: xPercent,yPercent,radiusPercent).";

      const customDiffs = document.createElement("textarea");
      customDiffs.placeholder = "Example:\n50,40,8\n72,65,6";

      const customModeNote = document.createElement("small");
      customModeNote.textContent = "AI automation isn't available in this build — upload two scenes with your own differences and outline them.";

      const customActions = document.createElement("div");
      customActions.className = "spotdiff-controls";

      const saveCustomBtn = document.createElement("button");
      saveCustomBtn.type = "button";
      saveCustomBtn.className = "spotdiff-puzzle-btn";
      saveCustomBtn.textContent = "Load puzzle";

      const clearCustomBtn = document.createElement("button");
      clearCustomBtn.type = "button";
      clearCustomBtn.className = "spotdiff-puzzle-btn";
      clearCustomBtn.textContent = "Clear";

      customActions.append(saveCustomBtn, clearCustomBtn);

      customSection.append(customTitle, customLeft, customRight, differencesLabel, customDiffs, customModeNote, customActions);

      container.append(header, board, controls, customSection);
      root.appendChild(container);

      const foundEl = score.querySelector("#spotdiffFound");
      const totalEl = score.querySelector("#spotdiffTotal");
      const timerEl = score.querySelector("#spotdiffTimer");

      function getMode() {
        return modes[state.mode];
      }

      function shuffle(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      function pickActiveDifferences(puzzle) {
        const target = Math.min(getMode().differences, puzzle.differences.length);
        const pool = shuffle(puzzle.differences.slice());
        return pool.slice(0, target);
      }

      function renderOverlays() {
        rightPanel.querySelectorAll(".spotdiff-overlay").forEach((overlay) => overlay.remove());
        state.activeDiffs.forEach((diff, idx) => {
          const overlay = document.createElement("div");
          overlay.className = "spotdiff-overlay";
          overlay.dataset.index = String(idx);
          overlay.style.left = `${diff.x}%`;
          overlay.style.top = `${diff.y}%`;
          overlay.style.width = `${diff.radius * 2}%`;
          overlay.style.height = `${diff.radius * 2}%`;
          rightPanel.appendChild(overlay);
        });
      }

      function selectPuzzle(index, forceRestart = false) {
        if (!forceRestart && index === state.puzzleIndex && state.timerRunning) return;
        cleanupTimer();
        state.puzzleIndex = index;
        state.found = new Set();
        state.startTime = null;
        state.failed = false;
        state.activeDiffs = pickActiveDifferences(puzzles[index]);
        state.timeRemaining = getMode().timeLimit;
        state.timerRunning = false;
        updateButtons();
        const puzzle = puzzles[index];
        leftImg.src = puzzle.left;
        rightImg.src = puzzle.right;
        extendSelect.value = String(getMode().extension);
        removeMarkers();
        renderOverlays();
        totalEl.textContent = String(state.activeDiffs.length);
        foundEl.textContent = "0";
        updateTimerDisplay();
        message.textContent = "Can you spot all the differences?";
      }

      function updateButtons() {
        puzzleList.querySelectorAll(".spotdiff-puzzle-btn").forEach((button, idx) => {
          button.setAttribute("aria-pressed", idx === state.puzzleIndex ? "true" : "false");
        });
        modeBar.querySelectorAll(".spotdiff-mode-btn").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.mode === state.mode ? "true" : "false");
        });
      }

      function removeMarkers() {
        [...leftPanel.querySelectorAll(".spotdiff-marker"), ...rightPanel.querySelectorAll(".spotdiff-marker"), ...rightPanel.querySelectorAll(".spotdiff-overlay")].forEach((el) =>
          el.remove()
        );
      }

      function ensureTimer() {
        if (state.timerRunning || state.failed) return;
        state.startTime = performance.now();
        state.lastTick = state.startTime;
        state.timerRunning = true;
        state.timerId = window.setInterval(tickTimer, 250);
        updateTimerDisplay();
      }

      function cleanupTimer() {
        if (state.timerId) {
          window.clearInterval(state.timerId);
          state.timerId = null;
        }
        state.timerRunning = false;
      }

      function tickTimer() {
        if (!state.timerRunning) return;
        const now = performance.now();
        const delta = (now - state.lastTick) / 1000;
        state.lastTick = now;
        state.timeRemaining = Math.max(0, state.timeRemaining - delta);
        updateTimerDisplay();
        if (state.timeRemaining <= 0) {
          failPuzzle();
        }
      }

      function updateTimerDisplay() {
        timerEl.textContent = formatTime(Math.max(0, Math.ceil(state.timeRemaining)));
      }

      function handlePanelClick(event, panel) {
        if (state.failed) {
          message.textContent = "Time's up. Restart the puzzle to try again.";
          return;
        }
        ensureTimer();
        const rect = panel.getBoundingClientRect();
        const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

        const hitIndex = state.activeDiffs.findIndex((diff, idx) => {
          if (state.found.has(idx)) return false;
          const radius = diff.radius * getMode().radiusScale;
          const distance = Math.hypot(diff.x - xPercent, diff.y - yPercent);
          return distance <= radius;
        });

        if (hitIndex !== -1) {
          state.found.add(hitIndex);
          foundEl.textContent = String(state.found.size);
          renderMarker(hitIndex);
          message.textContent = ["Nice spot!", "Great eye!", "You found one!"][state.found.size % 3];
          if (state.found.size === state.activeDiffs.length) {
            finishPuzzle();
          }
        } else {
          panel.classList.add("shake");
          window.setTimeout(() => panel.classList.remove("shake"), 260);
          message.textContent = "Not quite. Try another spot.";
        }
      }

      function renderMarker(index) {
        const diff = state.activeDiffs[index];
        [leftPanel, rightPanel].forEach((panel) => {
          const marker = document.createElement("div");
          marker.className = "spotdiff-marker";
          marker.style.left = `${diff.x}%`;
          marker.style.top = `${diff.y}%`;
          marker.style.width = `${diff.radius * 2}%`;
          marker.style.height = `${diff.radius * 2}%`;
          panel.appendChild(marker);
        });
        const overlay = rightPanel.querySelector(`.spotdiff-overlay[data-index="${index}"]`);
        if (overlay) overlay.remove();
      }

      function finishPuzzle() {
        cleanupTimer();
        const elapsed = Math.floor((performance.now() - state.startTime) / 1000);
        const puzzle = puzzles[state.puzzleIndex];
        const key = `${state.mode}:${puzzle.id}`;
        const best = state.bestTimes.get(key);
        if (!best || elapsed < best) {
          state.bestTimes.set(key, elapsed);
        }
        message.textContent = `All differences found in ${formatTime(elapsed)}!${
          best && elapsed >= best ? " (Try to beat your best time.)" : " New record for this mode!"
        }`;
      }

      function formatTime(seconds) {
        const m = String(Math.floor(seconds / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");
        return `${m}:${s}`;
      }

      function failPuzzle() {
        cleanupTimer();
        state.failed = true;
        state.timeRemaining = 0;
        updateTimerDisplay();
        message.textContent = "Time expired! Hit Restart puzzle to try again.";
      }

      leftPanel.addEventListener("click", (event) => handlePanelClick(event, leftPanel));
      rightPanel.addEventListener("click", (event) => handlePanelClick(event, rightPanel));

      function changeMode(modeKey) {
        if (!modes[modeKey] || state.mode === modeKey) return;
        state.mode = modeKey;
        extendSelect.value = String(modes[modeKey].extension);
        updateButtons();
        selectPuzzle(state.puzzleIndex, true);
      }

      async function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      }

      function parseDifferences(text) {
        return text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [xVal, yVal, rVal] = line.split(/[, ]+/);
            const x = Number.parseFloat(xVal);
            const y = Number.parseFloat(yVal);
            const radius = Number.parseFloat(rVal);
            if (Number.isNaN(x) || Number.isNaN(y)) return null;
            return { x, y, radius: Number.isNaN(radius) ? 8 : radius };
          })
          .filter(Boolean);
      }

      saveCustomBtn.addEventListener("click", async () => {
        if (!customLeft.files?.[0] || !customRight.files?.[0]) {
          message.textContent = "Choose both left and right images to build a custom puzzle.";
          return;
        }
        const diffs = parseDifferences(customDiffs.value);
        if (!diffs.length) {
          message.textContent = "Add at least one difference (format: x,y,radius).";
          return;
        }
        try {
          const [leftData, rightData] = await Promise.all([
            readFileAsDataURL(customLeft.files[0]),
            readFileAsDataURL(customRight.files[0]),
          ]);
          const title = customTitle.value.trim() || `Custom Scene ${puzzles.length + 1}`;
          const newPuzzle = {
            id: `custom-${Date.now()}`,
            title,
            left: leftData,
            right: rightData,
            differences: diffs,
          };
          puzzles.push(newPuzzle);
          addPuzzleButton(newPuzzle, puzzles.length - 1);
          customLeft.value = "";
          customRight.value = "";
          customTitle.value = "";
          customDiffs.value = "";
          message.textContent = `Custom puzzle "${title}" loaded. Good luck!`;
          customSection.open = false;
          selectPuzzle(puzzles.length - 1, true);
        } catch (error) {
          message.textContent = "Unable to load images. Try smaller files or a different format.";
        }
      });

      clearCustomBtn.addEventListener("click", () => {
        customLeft.value = "";
        customRight.value = "";
        customTitle.value = "";
        customDiffs.value = "";
        message.textContent = "Cleared custom puzzle form.";
      });

      selectPuzzle(0, true);

      return () => {
        cleanupTimer();
        container.remove();
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
