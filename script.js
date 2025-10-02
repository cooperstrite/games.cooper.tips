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
    id: "redlight",
    name: "Red Light Green Light",
    summary: "Sprint to the finish without moving on red.",
    description:
      "Hold to sprint across the track, but freeze the instant the stoplight turns red. Reach the finish line without getting caught!",
    logo: "assets/stoplight.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "rlgl-game";

      const status = document.createElement("div");
      status.className = "rlgl-status";
      status.textContent = "Race to the finish. Stay absolutely still on red.";

      const stats = document.createElement("div");
      stats.className = "rlgl-stats";

      const timerBadge = document.createElement("span");
      timerBadge.className = "badge rlgl-timer";
      timerBadge.textContent = "Time: –";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge rlgl-best";
      bestBadge.textContent = "Best: –";

      stats.append(timerBadge, bestBadge);

      const light = document.createElement("div");
      light.className = "rlgl-stoplight";
      light.setAttribute("role", "img");
      light.setAttribute("aria-label", "Stoplight showing the current signal");

      const redLamp = document.createElement("span");
      redLamp.className = "rlgl-lamp rlgl-lamp-red";
      redLamp.setAttribute("aria-hidden", "true");

      const amberLamp = document.createElement("span");
      amberLamp.className = "rlgl-lamp rlgl-lamp-amber";
      amberLamp.setAttribute("aria-hidden", "true");

      const greenLamp = document.createElement("span");
      greenLamp.className = "rlgl-lamp rlgl-lamp-green";
      greenLamp.setAttribute("aria-hidden", "true");

      light.append(redLamp, amberLamp, greenLamp);

      const track = document.createElement("div");
      track.className = "rlgl-track";

      const lane = document.createElement("div");
      lane.className = "rlgl-lane";

      const trackFill = document.createElement("div");
      trackFill.className = "rlgl-track-fill";

      const finishLine = document.createElement("div");
      finishLine.className = "rlgl-finish";

      const runner = document.createElement("div");
      runner.className = "rlgl-runner";
      runner.setAttribute("aria-hidden", "true");

      lane.append(trackFill, finishLine, runner);
      track.appendChild(lane);

      const controls = document.createElement("div");
      controls.className = "rlgl-controls";

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start round";

      const runBtn = document.createElement("button");
      runBtn.type = "button";
      runBtn.className = "rlgl-run-btn";
      runBtn.textContent = "Hold to run";
      runBtn.disabled = true;
      runBtn.setAttribute("aria-pressed", "false");

      controls.append(startBtn, runBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Hold the run button or press space to sprint. Release the instant the light turns red.";

      wrapper.append(status, stats, light, track, controls, help);
      root.appendChild(wrapper);

      const state = {
        phase: "idle", // idle | countdown | green | red | finished | caught
        pointerDown: false,
        keyDown: false,
        running: false,
        progress: 0,
        startTime: 0,
        lastTick: 0,
        bestTime: null,
        rafId: null,
        lightTimeout: null,
        timerInterval: null,
        countdownInterval: null,
      };

      startBtn.addEventListener("click", startRound);

      runBtn.addEventListener("pointerdown", () => {
        state.pointerDown = true;
        updateRunningState();
      });
      runBtn.addEventListener("pointerup", () => {
        state.pointerDown = false;
        updateRunningState();
      });
      runBtn.addEventListener("pointerleave", () => {
        state.pointerDown = false;
        updateRunningState();
      });
      runBtn.addEventListener("pointercancel", () => {
        state.pointerDown = false;
        updateRunningState();
      });

      const handleKeyDown = (event) => {
        if (event.code !== "Space" && event.key !== " ") return;
        if (event.repeat) return;
        event.preventDefault();
        state.keyDown = true;
        updateRunningState();
      };

      const handleKeyUp = (event) => {
        if (event.code !== "Space" && event.key !== " ") return;
        event.preventDefault();
        state.keyDown = false;
        updateRunningState();
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      const handleResize = () => updateRunner();
      window.addEventListener("resize", handleResize);

      updateRunner();
      updateLight("idle");

      function startRound() {
        resetRound();
        state.phase = "countdown";
        startBtn.disabled = true;
        startBtn.textContent = "Counting down…";
        status.textContent = "Go in 3";
        updateLight("amber");
        let counter = 3;
        state.countdownInterval = window.setInterval(() => {
          counter -= 1;
          if (counter > 0) {
            status.textContent = `Go in ${counter}`;
          } else {
            clearInterval(state.countdownInterval);
            state.countdownInterval = null;
            launchSprint();
          }
        }, 1000);
      }

      function launchSprint() {
        state.phase = "green";
        state.startTime = performance.now();
        status.textContent = "Green light! Hold to sprint.";
        startBtn.textContent = "Racing…";
        runBtn.disabled = false;
        runBtn.focus();
        updateLight("green");
        startTimer();
        queueRedLight();
        updateRunningState();
      }

      function queueRedLight() {
        clearTimeout(state.lightTimeout);
        const delay = randomBetween(1500, 3500);
        state.lightTimeout = window.setTimeout(() => {
          if (state.phase === "green") {
            switchToRed();
          }
        }, delay);
      }

      function switchToRed() {
        state.phase = "red";
        updateLight("red");
        status.textContent = "Red light! Freeze.";
        if (state.running) {
          caught("Caught moving on red!");
          return;
        }
        clearTimeout(state.lightTimeout);
        const delay = randomBetween(900, 2200);
        state.lightTimeout = window.setTimeout(() => {
          if (state.phase === "red") {
            switchToGreen();
          }
        }, delay);
      }

      function switchToGreen() {
        state.phase = "green";
        updateLight("green");
        status.textContent = "Green again! Sprint!";
        queueRedLight();
        updateRunningState();
      }

      function updateRunningState() {
        const wantsRun = (state.pointerDown || state.keyDown) && !runBtn.disabled;
        if (!wantsRun && state.running) {
          stopRunning();
          return;
        }
        if (!wantsRun || state.running) return;
        if (state.phase === "red") {
          state.pointerDown = false;
          state.keyDown = false;
          caught("Moved during red light.");
          return;
        }
        if (state.phase !== "green") return;
        startRunning();
      }

      function startRunning() {
        state.running = true;
        state.lastTick = 0;
        runBtn.classList.add("is-active");
        runBtn.setAttribute("aria-pressed", "true");
        wrapper.classList.add("rlgl-running");
        state.rafId = window.requestAnimationFrame(stepRunner);
      }

      function stopRunning() {
        state.running = false;
        state.lastTick = 0;
        runBtn.classList.remove("is-active");
        runBtn.setAttribute("aria-pressed", "false");
        wrapper.classList.remove("rlgl-running");
        if (state.rafId) {
          window.cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      }

      function stepRunner(timestamp) {
        if (!state.running) return;
        if (!state.lastTick) {
          state.lastTick = timestamp;
        }
        const delta = timestamp - state.lastTick;
        state.lastTick = timestamp;
        state.progress = Math.min(100, state.progress + delta * 0.018);
        updateRunner();
        if (state.progress >= 100) {
          finishRace();
          return;
        }
        state.rafId = window.requestAnimationFrame(stepRunner);
      }

      function updateRunner() {
        const clamped = Math.max(0, Math.min(100, state.progress));
        trackFill.style.width = `${clamped}%`;
        const trackWidth = lane.clientWidth;
        const runnerWidth = runner.offsetWidth || 0;
        const maxTravel = Math.max(0, trackWidth - runnerWidth);
        const offset = (clamped / 100) * maxTravel;
        runner.style.setProperty("--offset", `${offset}px`);
      }

      function finishRace() {
        if (state.phase === "finished") return;
        state.phase = "finished";
        stopRunning();
        clearTimeout(state.lightTimeout);
        clearInterval(state.timerInterval);
        updateLight("green");
        const elapsed = performance.now() - state.startTime;
        timerBadge.textContent = `Time: ${formatTime(elapsed)}`;
        if (!state.bestTime || elapsed < state.bestTime) {
          state.bestTime = elapsed;
          bestBadge.textContent = `Best: ${formatTime(elapsed)}`;
        }
        status.textContent = "Made it! You crossed the line.";
        startBtn.disabled = false;
        startBtn.textContent = "Race again";
        runBtn.disabled = true;
        state.pointerDown = false;
        state.keyDown = false;
      }

      function caught(message) {
        if (state.phase === "finished" || state.phase === "caught") return;
        state.phase = "caught";
        stopRunning();
        clearTimeout(state.lightTimeout);
        clearInterval(state.timerInterval);
        updateLight("red");
        status.textContent = message;
        startBtn.disabled = false;
        startBtn.textContent = "Try again";
        runBtn.disabled = true;
        state.pointerDown = false;
        state.keyDown = false;
        timerBadge.textContent = "Time: –";
      }

      function resetRound() {
        stopRunning();
        clearTimeout(state.lightTimeout);
        clearInterval(state.timerInterval);
        clearInterval(state.countdownInterval);
        state.lightTimeout = null;
        state.timerInterval = null;
        state.countdownInterval = null;
        state.phase = "idle";
        state.progress = 0;
        state.pointerDown = false;
        state.keyDown = false;
        state.startTime = 0;
        state.lastTick = 0;
        timerBadge.textContent = "Time: –";
        startBtn.textContent = "Start round";
        status.textContent = "Race to the finish. Stay absolutely still on red.";
        runBtn.disabled = true;
        runner.style.setProperty("--offset", "0px");
        trackFill.style.width = "0%";
        updateLight("idle");
      }

      function startTimer() {
        clearInterval(state.timerInterval);
        timerBadge.textContent = "Time: 0.00 s";
        state.timerInterval = window.setInterval(() => {
          if (state.phase === "green" || state.phase === "red") {
            const elapsed = performance.now() - state.startTime;
            timerBadge.textContent = `Time: ${formatTime(elapsed)}`;
          }
        }, 120);
      }

      function updateLight(signal) {
        light.dataset.state = signal;
      }

      function formatTime(ms) {
        return `${(ms / 1000).toFixed(2)} s`;
      }

      function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
      }

      return () => {
        stopRunning();
        clearTimeout(state.lightTimeout);
        clearInterval(state.timerInterval);
        clearInterval(state.countdownInterval);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("resize", handleResize);
        wrapper.remove();
      };
    },
  },
  {
    id: "memory",
    name: "Memory Loop",
    summary: "Flip cards to match every pair.",
    description:
      "Sharpen your recall by pairing symbols across the board. Choose a tile count, clear every match, and chase a faster personal best.",
    logo: "assets/memory-loop.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "memory-game";

      const status = document.createElement("div");
      status.className = "memory-status";
      status.textContent = "Flip cards to match every pair.";

      const controls = document.createElement("div");
      controls.className = "memory-controls";

      const tileLabel = document.createElement("label");
      tileLabel.className = "range-select";
      const tileLabelText = document.createElement("span");
      tileLabelText.textContent = "Tiles";

      const tileSelect = document.createElement("select");
      tileSelect.setAttribute("aria-label", "Tile count");

      const tileOptions = [8, 12, 16, 20, 24];
      tileOptions.forEach((count) => {
        const option = document.createElement("option");
        option.value = String(count);
        option.textContent = `${count} tiles (${count / 2} pairs)`;
        tileSelect.appendChild(option);
      });

      tileLabel.append(tileLabelText, tileSelect);

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.textContent = "Shuffle";

      controls.append(tileLabel, resetButton);

      const stats = document.createElement("div");
      stats.className = "memory-stats";

      const movesBadge = document.createElement("span");
      movesBadge.className = "badge memory-moves";
      movesBadge.textContent = "Moves: 0";

      const matchesBadge = document.createElement("span");
      matchesBadge.className = "badge memory-matches";
      matchesBadge.textContent = "Matches: 0 / 0";

      const timerBadge = document.createElement("span");
      timerBadge.className = "badge memory-timer";
      timerBadge.textContent = "Time: 0:00.00";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge memory-best";
      bestBadge.textContent = "Best: –";

      stats.append(movesBadge, matchesBadge, timerBadge, bestBadge);

      const grid = document.createElement("div");
      grid.className = "memory-grid";

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Select a tile count and clear the board. The timer starts on your first flip.";

      wrapper.append(status, controls, stats, grid, help);
      root.appendChild(wrapper);

      const symbols = [
        { id: "astronaut", icon: "assets/memory-astronaut.svg", label: "Astronaut" },
        { id: "compass", icon: "assets/memory-compass.svg", label: "Compass" },
        { id: "lantern", icon: "assets/memory-lantern.svg", label: "Lantern" },
        { id: "rocket", icon: "assets/memory-rocket.svg", label: "Rocket" },
        { id: "shell", icon: "assets/memory-shell.svg", label: "Shell" },
        { id: "potion", icon: "assets/memory-potion.svg", label: "Potion" },
        { id: "camera", icon: "assets/memory-camera.svg", label: "Camera" },
        { id: "tent", icon: "assets/memory-tent.svg", label: "Tent" },
        { id: "leaf", icon: "assets/memory-leaf.svg", label: "Leaf" },
        { id: "watch", icon: "assets/memory-watch.svg", label: "Watch" },
        { id: "sun", icon: "assets/memory-sun.svg", label: "Sun" },
        { id: "star", icon: "assets/memory-star.svg", label: "Star" },
      ];

      const state = {
        tileCount: 16,
        deck: [],
        flipped: [],
        matched: new Set(),
        moves: 0,
        matches: 0,
        totalPairs: 8,
        timerRunning: false,
        timerStart: 0,
        timerInterval: null,
        elapsed: 0,
        busy: false,
        hideTimeout: null,
        bestTimes: new Map(),
        cardEls: [],
      };

      tileSelect.value = String(state.tileCount);

      tileSelect.addEventListener("change", () => {
        const value = Number.parseInt(tileSelect.value, 10);
        if (!Number.isNaN(value) && tileOptions.includes(value)) {
          state.tileCount = value;
          initializeBoard(true);
        }
      });

      resetButton.addEventListener("click", () => {
        initializeBoard(true);
      });

      initializeBoard();

      function initializeBoard(announce = false) {
        stopTimer();
        clearTimeout(state.hideTimeout);
        state.hideTimeout = null;
        state.deck = buildDeck(state.tileCount);
        state.flipped = [];
        state.matched = new Set();
        state.moves = 0;
        state.matches = 0;
        state.totalPairs = state.tileCount / 2;
        state.elapsed = 0;
        state.timerRunning = false;
        state.busy = false;
        applyGridColumns();
        renderStats();
        renderDeck();
        status.textContent = announce
          ? `New layout ready with ${state.tileCount} tiles.`
          : "Flip cards to match every pair.";
      }

      function buildDeck(count) {
        const pairsNeeded = count / 2;
        const pool = [...symbols];
        if (pairsNeeded > pool.length) {
          throw new Error("Not enough symbol definitions for the requested tile count");
        }
        shuffle(pool);
        const selected = pool.slice(0, pairsNeeded);
        const deck = selected.flatMap((entry) => [
          { ...entry, key: `${entry.id}-a` },
          { ...entry, key: `${entry.id}-b` },
        ]);
        shuffle(deck);
        return deck;
      }

      function renderDeck() {
        state.cardEls = [];
        grid.textContent = "";
        state.deck.forEach((card, index) => {
          const cardBtn = document.createElement("button");
          cardBtn.type = "button";
          cardBtn.className = "memory-card";
          cardBtn.dataset.index = String(index);
          cardBtn.setAttribute("aria-label", "Hidden card");

          const inner = document.createElement("span");
          inner.className = "memory-card-inner";

          const front = document.createElement("span");
          front.className = "memory-card-face memory-card-front";
          front.textContent = "?";

          const back = document.createElement("span");
          back.className = "memory-card-face memory-card-back";
          back.innerHTML = `<img src="${card.icon}" alt="${card.label}" />`;

          inner.append(front, back);
          cardBtn.appendChild(inner);
          cardBtn.addEventListener("click", () => handleCardClick(index));

          state.cardEls[index] = cardBtn;
          updateCardAppearance(index);
          grid.appendChild(cardBtn);
        });
      }

      function handleCardClick(index) {
        if (state.busy) return;
        if (state.matched.has(index)) return;
        if (state.flipped.includes(index)) return;

        if (!state.timerRunning) {
          startTimer();
        }

        state.flipped.push(index);
        updateCardAppearance(index);

        if (state.flipped.length === 2) {
          state.moves += 1;
          renderStats();
          evaluatePair();
        } else {
          status.textContent = "Pick another card.";
        }
      }

      function evaluatePair() {
        const [firstIndex, secondIndex] = state.flipped;
        if (typeof firstIndex !== "number" || typeof secondIndex !== "number") return;

        const firstCard = state.deck[firstIndex];
        const secondCard = state.deck[secondIndex];

        if (firstCard.id === secondCard.id) {
          state.matched.add(firstIndex);
          state.matched.add(secondIndex);
          state.flipped = [];
          state.matches += 1;
          status.textContent = `Matched ${firstCard.label}!`;
          updateCardAppearance(firstIndex);
          updateCardAppearance(secondIndex);
          renderStats();
          if (state.matches === state.totalPairs) {
            handleWin();
          }
          return;
        }

        state.busy = true;
        status.textContent = "Not quite. Try again.";
        clearTimeout(state.hideTimeout);
        state.hideTimeout = window.setTimeout(() => {
          state.flipped = [];
          updateCardAppearance(firstIndex);
          updateCardAppearance(secondIndex);
          state.busy = false;
        }, 700);
      }

      function handleWin() {
        stopTimer();
        renderStats();
        const completion = formatElapsed(state.elapsed);
        const summary = `Cleared ${state.tileCount} tiles in ${completion} with ${state.moves} moves.`;
        const best = state.bestTimes.get(state.tileCount);
        if (!best || state.elapsed < best) {
          state.bestTimes.set(state.tileCount, state.elapsed);
          status.textContent = `${summary} New personal best!`;
        } else {
          status.textContent = summary;
        }
        renderStats();
      }

      function updateCardAppearance(index) {
        const cardEl = state.cardEls[index];
        if (!cardEl) return;
        const isMatched = state.matched.has(index);
        const isFlipped = isMatched || state.flipped.includes(index);
        cardEl.classList.toggle("is-flipped", isFlipped);
        cardEl.classList.toggle("is-matched", isMatched);
        const card = state.deck[index];
        if (!card) return;
        if (isMatched) {
          cardEl.setAttribute("aria-label", `Matched ${card.label}`);
        } else if (isFlipped) {
          cardEl.setAttribute("aria-label", `Showing ${card.label}`);
        } else {
          cardEl.setAttribute("aria-label", "Hidden card");
        }
      }

      function renderStats() {
        movesBadge.textContent = `Moves: ${state.moves}`;
        matchesBadge.textContent = `Matches: ${state.matches} / ${state.totalPairs}`;
        timerBadge.textContent = `Time: ${formatElapsed(state.elapsed)}`;
        const best = state.bestTimes.get(state.tileCount);
        bestBadge.textContent = best ? `Best: ${formatElapsed(best)}` : "Best: –";
      }

      function applyGridColumns() {
        const columnsByCount = new Map([
          [8, 4],
          [12, 4],
          [16, 4],
          [20, 5],
          [24, 6],
        ]);
        const columns = columnsByCount.get(state.tileCount) ?? Math.ceil(Math.sqrt(state.tileCount));
        grid.style.setProperty("--memory-columns", String(columns));
      }

      function startTimer() {
        state.timerRunning = true;
        state.timerStart = performance.now();
        state.timerInterval = window.setInterval(() => {
          state.elapsed = performance.now() - state.timerStart;
          renderStats();
        }, 150);
      }

      function stopTimer() {
        if (state.timerInterval) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
        }
        if (state.timerRunning) {
          state.elapsed = performance.now() - state.timerStart;
        }
        state.timerRunning = false;
      }

      function formatElapsed(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const hundredths = Math.floor((ms % 1000) / 10);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths
          .toString()
          .padStart(2, "0")}`;
      }

      function shuffle(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      return () => {
        stopTimer();
        clearTimeout(state.hideTimeout);
        wrapper.remove();
      };
    },
  },
  {
    id: "tower",
    name: "Tower Stack",
    summary: "Drop moving blocks to build the tallest tower.",
    description:
      "Time your drops to stack each moving block on the tower. Perfect overlaps keep your tower wide—misses shave it down until it topples.",
    logo: "assets/tower-stack.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "tower-game";

      const status = document.createElement("div");
      status.className = "tower-status";
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

      const tower = document.createElement("div");
      tower.className = "tower-stack";
      field.appendChild(tower);

      const controls = document.createElement("div");
      controls.className = "tower-controls";

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start";

      const dropBtn = document.createElement("button");
      dropBtn.type = "button";
      dropBtn.className = "tower-drop-btn";
      dropBtn.textContent = "Drop";
      dropBtn.disabled = true;

      controls.append(startBtn, dropBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Press Drop or hit space to lock the moving block in place.";

      wrapper.append(status, stats, field, controls, help);
      root.appendChild(wrapper);

      const config = {
        blockHeight: 28,
        initialSpeed: 0.6,
        speedIncrement: 0.055,
        maxSpeed: 1.6,
        minOverlap: 0.045,
        maxLayers: 12,
      };

      const state = {
        stack: [],
        activeBlock: null,
        direction: 1,
        speed: config.initialSpeed,
        running: false,
        readyForDrop: false,
        animationId: null,
        spawnTimeout: null,
        lastTimestamp: 0,
        bestHeight: 0,
        fieldWidth: 0,
      };

      startBtn.addEventListener("click", () => {
        startGame();
      });

      dropBtn.addEventListener("click", () => {
        dropBlock();
      });

      field.addEventListener("click", () => {
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

      window.addEventListener("keydown", handleKey);
      window.addEventListener("resize", handleResize);

      renderStats();

      function startGame() {
        resetGame();
        measureField();
        state.running = true;
        state.speed = config.initialSpeed;
        startBtn.textContent = "Restart";
        dropBtn.disabled = false;
        status.textContent = "Drop blocks to build your tower.";
        const base = createBlock({ widthRatio: 0.75, leftRatio: 0.125, bottom: 0 });
        base.element.classList.add("is-base");
        state.stack.push(base);
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
        tower.textContent = "";
        measureField();
        dropBtn.disabled = true;
        status.textContent = "Click start to build your tower.";
        renderStats();
      }

      function measureField() {
        state.fieldWidth = tower.clientWidth || tower.offsetWidth || 260;
      }

      function spawnMovingBlock() {
        if (!state.running) return;
        const previous = state.stack[state.stack.length - 1];
        if (!previous) return;
        state.direction = state.stack.length % 2 === 0 ? -1 : 1;
        const widthRatio = previous.widthRatio;
        const leftRatio = state.direction === 1 ? 0 : 1 - widthRatio;
        const bottom = state.stack.length * config.blockHeight;
        const block = createBlock({ widthRatio, leftRatio, bottom });
        block.element.classList.add("is-active");
        state.activeBlock = block;
        state.readyForDrop = true;
        state.lastTimestamp = 0;
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
        active.widthRatio = overlap;
        active.leftRatio = overlapLeft;
        updateBlockVisuals(active);
        active.element.classList.remove("is-active");
        active.element.classList.add("is-locked");
        state.stack.push(active);
        state.activeBlock = null;
        const currentHeight = state.stack.length - 1;
        if (currentHeight > state.bestHeight) {
          state.bestHeight = currentHeight;
        }
        renderStats();
        state.speed = Math.min(config.maxSpeed, state.speed + config.speedIncrement);
        status.textContent = currentHeight % 4 === 0 ? "Stack looks sharp!" : "Nice drop!";
        if (currentHeight >= config.maxLayers) {
          handleVictory();
          return;
        }
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = window.setTimeout(() => {
          spawnMovingBlock();
        }, 260);
      }

      function handleFail() {
        state.running = false;
        state.activeBlock = null;
        state.readyForDrop = false;
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = null;
        dropBtn.disabled = true;
        startBtn.textContent = "Try again";
        status.textContent = `Tower toppled at ${state.stack.length - 1} blocks.`;
        renderStats();
      }

      function handleVictory() {
        state.running = false;
        state.activeBlock = null;
        state.readyForDrop = false;
        window.clearTimeout(state.spawnTimeout ?? 0);
        state.spawnTimeout = null;
        dropBtn.disabled = true;
        startBtn.textContent = "Play again";
        status.textContent = `Sky high! ${state.stack.length - 1} blocks tall.`;
      }

      function createBlock({ widthRatio, leftRatio, bottom }) {
        const block = document.createElement("div");
        block.className = "tower-block";
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

      function updateBlockVisuals(block) {
        const width = block.widthRatio * state.fieldWidth;
        block.element.style.width = `${width}px`;
        block.element.style.left = `${block.leftRatio * state.fieldWidth}px`;
        block.element.style.bottom = `${block.bottom}px`;
      }

      function renderStats() {
        const height = state.stack.length - 1;
        heightBadge.textContent = `Height: ${Math.max(0, height)}`;
        bestBadge.textContent = `Best: ${state.bestHeight}`;
      }

      return () => {
        cancelAnimationFrame(state.animationId ?? 0);
        window.clearTimeout(state.spawnTimeout ?? 0);
        window.removeEventListener("keydown", handleKey);
        window.removeEventListener("resize", handleResize);
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
    logo: "assets/food-chain.svg",
    init(root) {
      const chains = [
        {
          id: "prairie",
          title: "Prairie Loop",
          prompt: "Arrange this grassland food chain from bottom to top.",
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
          prompt: "Who eats whom in this freshwater chain?",
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
          prompt: "Stack this marine chain in the right order.",
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
          prompt: "Line up this woodland chain from producer to hunter.",
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
          prompt: "Can you keep this polar chain in order?",
          energyFlow: [
            { id: "icephyto", name: "Sea Ice Phytoplankton", role: "Producer" },
            { id: "cod", name: "Arctic Cod", role: "Primary consumer" },
            { id: "seal", name: "Ringed Seal", role: "Secondary consumer" },
            { id: "bear", name: "Polar Bear", role: "Apex predator" },
          ],
        },
      ];

      const RACE_TARGETS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150];

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
      };

      const wrapper = document.createElement("div");
      wrapper.className = "foodchain";

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

      const controls = document.createElement("div");
      controls.className = "foodchain-controls";

      const hardToggle = document.createElement("button");
      hardToggle.type = "button";
      hardToggle.className = "foodchain-toggle";
      hardToggle.textContent = "Hard mode off";
      hardToggle.setAttribute("aria-pressed", "false");

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

      controls.append(hardToggle, raceLabel, submitBtn, shuffleBtn, nextBtn);

      const status = document.createElement("p");
      status.className = "foodchain-status";
      status.textContent = "Reorder the cards so energy flows from producer (bottom) to apex predator (top).";

      wrapper.append(header, stats, list, controls, status);
      root.appendChild(wrapper);

      submitBtn.addEventListener("click", () => {
        if (state.solved) {
          loadChain();
          return;
        }
        checkOrder();
      });

      shuffleBtn.addEventListener("click", () => {
        if (state.solved) return;
        state.order = shuffle(state.order);
        renderChain();
        status.textContent = "Cards reshuffled. Rebuild the chain from producer upward.";
      });

      const handleNext = (event) => {
        if (event) event.preventDefault();
        if (state.raceCompleted) {
          resetRaceProgress();
          submitBtn.disabled = false;
          shuffleBtn.disabled = false;
          submitBtn.textContent = "Check order";
          state.raceCompleted = false;
        }
        loadChain(true);
      };
      nextBtn.addEventListener("click", handleNext);

      hardToggle.addEventListener("click", () => {
        setHardMode(!state.hardMode);
      });

      raceSelect.addEventListener("change", () => {
        setRaceTarget(raceSelect.value ? Number.parseInt(raceSelect.value, 10) : null);
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
        status.textContent = state.hardMode
          ? "Hard mode active—roles hidden. Rebuild the chain from producer upward."
          : state.chain.prompt;
      }

      function renderChain() {
        wrapper.classList.toggle("foodchain-hard", state.hardMode);
        title.textContent = state.chain.title;
        updatePrompt();
        list.textContent = "";
        state.order.forEach((item, index) => {
          const li = document.createElement("li");
          li.className = "foodchain-item";
          li.dataset.role = item.role;
          li.dataset.index = String(index);

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
        if (state.solved) return;
        const target = index + delta;
        if (target < 0 || target >= state.order.length) return;
        const items = state.order.slice();
        const [moved] = items.splice(index, 1);
        items.splice(target, 0, moved);
        state.order = items;
        renderChain();
      }

      function checkOrder() {
        clearFeedback();
        let correct = true;
        state.order.forEach((item, idx) => {
          const li = list.children[idx];
          if (item.id === state.chain.energyFlow[idx].id) {
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
          submitBtn.textContent = "Play again";
          shuffleBtn.disabled = true;
          status.textContent = state.hardMode
            ? "Perfect flow! Nailed the chain with roles hidden."
            : "Perfect flow! Producers power every bite above them.";
          handleRaceProgress(true);
        } else {
          state.streak = 0;
          status.textContent = "Not quite. Producers belong at the bottom—adjust and try again.";
          handleRaceProgress(false);
        }
        updateStats();
      }

      function clearFeedback() {
        Array.from(list.children).forEach((child) => {
          child.classList.remove("is-correct", "is-wrong");
        });
      }

      function updateStats() {
        solvedBadge.textContent = `Solved: ${state.solvedCount}`;
        streakBadge.textContent = `Streak: ${state.streak}`;
        bestBadge.textContent = `Best streak: ${state.bestStreak}`;
        raceBadge.textContent = state.raceTarget
          ? `Race: first to ${state.raceTarget}`
          : "Race: –";
        aiBadge.textContent = `AI streak: ${state.aiStreak}`;
      }

      function setHardMode(active) {
        state.hardMode = Boolean(active);
        hardToggle.classList.toggle("is-active", state.hardMode);
        hardToggle.setAttribute("aria-pressed", state.hardMode ? "true" : "false");
        hardToggle.textContent = state.hardMode ? "Hard mode on" : "Hard mode off";
        renderChain();
        status.textContent = state.hardMode
          ? "Hard mode active—roles hidden. Rebuild the chain from producer upward."
          : state.chain.prompt;
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
      }

      function setRaceTarget(target) {
        if (target && Number.isFinite(target)) {
          state.raceTarget = target;
          resetRaceProgress();
          nextBtn.textContent = "New chain";
          status.textContent = `Race mode: First to ${target} correct chains wins.`;
          raceSelect.value = String(target);
        } else {
          state.raceTarget = null;
          resetRaceProgress();
          nextBtn.textContent = "New chain";
          raceSelect.value = "";
          if (!state.hardMode && state.chain) status.textContent = state.chain.prompt;
        }
        submitBtn.disabled = false;
        shuffleBtn.disabled = false;
        updateStats();
      }

      function handleRaceProgress(userSucceeded) {
        if (!state.raceTarget || state.raceCompleted) return;

        if (userSucceeded && state.streak >= state.raceTarget) {
          finishRace("You");
          return;
        }

        const aiSucceeded = Math.random() < 0.7;
        if (aiSucceeded) {
          state.aiStreak += 1;
        } else {
          state.aiStreak = 0;
        }
        if (state.aiStreak >= state.raceTarget) {
          finishRace("The AI");
        } else {
          updateStats();
        }
      }

      function finishRace(winner) {
        state.raceCompleted = true;
        submitBtn.disabled = true;
        shuffleBtn.disabled = true;
        submitBtn.textContent = "Race finished";
        status.textContent = `${winner} reached ${state.raceTarget} in a row first!`;
        nextBtn.textContent = "Restart race";
      }

      loadChain();
      setRaceTarget(null);

      return () => {
        wrapper.remove();
      };
    },
  },
  {
    id: "neondrift",
    name: "Neon Drift",
    summary: "Race neon lanes and dodge pylons in first-person.",
    description:
      "Steer your hover car between three glowing lanes, boost to build distance, and weave around incoming pylons. Reach the finish before you take a hit!",
    logo: "assets/neon-drift.svg",
    init(root) {
      const VIEWPORT_WIDTH = 640;
      const VIEWPORT_HEIGHT = 360;
      const BASE_SPEED = 36;
      const BOOST_SPEED = 54;
      const FINISH_DISTANCE = 1800;
      const LANE_X = [-1, 0, 1];
      const MAX_DEPTH = 42;

      const state = {
        running: false,
        rafId: null,
        lane: 1,
        visualLane: 1,
        speed: BASE_SPEED,
        targetSpeed: BASE_SPEED,
        distance: 0,
        bestDistance: 0,
        startTime: 0,
        obstacles: [],
        lastFrame: 0,
        lastSpawn: 0,
        spawnInterval: 1100,
        accelerating: false,
      };

      const wrapper = document.createElement("div");
      wrapper.className = "neondrift";

      const topRow = document.createElement("div");
      topRow.className = "neondrift-top";

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "primary-btn";
      startBtn.textContent = "Start run";

      const status = document.createElement("p");
      status.className = "neondrift-status";
      status.textContent = "Strafe between lanes and avoid the pylons.";
      status.setAttribute("role", "status");

      topRow.append(startBtn, status);

      const metrics = document.createElement("div");
      metrics.className = "neondrift-metrics";

      const distanceBadge = document.createElement("span");
      distanceBadge.className = "badge neondrift-distance";
      distanceBadge.textContent = "Distance: 0 m";

      const speedBadge = document.createElement("span");
      speedBadge.className = "badge neondrift-speed";
      speedBadge.textContent = "Speed: 0 km/h";

      const bestBadge = document.createElement("span");
      bestBadge.className = "badge neondrift-best";
      bestBadge.textContent = "Best: 0";

      metrics.append(distanceBadge, speedBadge, bestBadge);

      const viewport = document.createElement("div");
      viewport.className = "neondrift-viewport";

      const canvas = document.createElement("canvas");
      canvas.className = "neondrift-canvas";
      viewport.appendChild(canvas);

      const pad = document.createElement("div");
      pad.className = "neondrift-pad";

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "neondrift-pad-btn";
      leftBtn.textContent = "⟵";
      leftBtn.setAttribute("aria-label", "Move left");

      const boostBtn = document.createElement("button");
      boostBtn.type = "button";
      boostBtn.className = "neondrift-pad-btn neondrift-pad-boost";
      boostBtn.textContent = "Boost";
      boostBtn.setAttribute("aria-label", "Boost");

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "neondrift-pad-btn";
      rightBtn.textContent = "⟶";
      rightBtn.setAttribute("aria-label", "Move right");

      pad.append(leftBtn, boostBtn, rightBtn);

      const hint = document.createElement("p");
      hint.className = "help-text neondrift-hint";
      hint.textContent = "Controls: A/← and D/→ to steer, hold Space (or Boost) to accelerate.";

      wrapper.append(topRow, metrics, viewport, pad, hint);
      root.appendChild(wrapper);

      const ctx = canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = VIEWPORT_WIDTH * dpr;
      canvas.height = VIEWPORT_HEIGHT * dpr;
      canvas.style.width = "100%";
      canvas.style.aspectRatio = "16 / 9";
      ctx.scale(dpr, dpr);

      const width = VIEWPORT_WIDTH;
      const height = VIEWPORT_HEIGHT;
      const horizon = 68;
      const roadHalfNear = width * 0.42;
      const roadHalfFar = width * 0.13;

      function formatDistance(meters) {
        if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
        return `${Math.round(meters)} m`;
      }

      function updateHUD() {
        distanceBadge.textContent = `Distance: ${formatDistance(state.distance)}`;
        const speedKmh = state.running ? Math.round(state.speed * 3.6) : 0;
        speedBadge.textContent = `Speed: ${speedKmh} km/h`;
        bestBadge.textContent = `Best: ${formatDistance(state.bestDistance)}`;
      }

      function drawScene() {
        ctx.clearRect(0, 0, width, height);

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#040c1e");
        sky.addColorStop(0.5, "#07122d");
        sky.addColorStop(1, "#02040a");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        ctx.beginPath();
        ctx.moveTo(width / 2 - roadHalfFar, horizon);
        ctx.lineTo(width / 2 + roadHalfFar, horizon);
        ctx.lineTo(width / 2 + roadHalfNear, height);
        ctx.lineTo(width / 2 - roadHalfNear, height);
        ctx.closePath();
        const road = ctx.createLinearGradient(0, horizon, 0, height);
        road.addColorStop(0, "#10162a");
        road.addColorStop(1, "#050912");
        ctx.fillStyle = road;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(114, 246, 255, 0.35)";
        ctx.stroke();

        ctx.setLineDash([14, 18]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.beginPath();
        ctx.moveTo(width / 2, horizon);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        ctx.setLineDash([]);

        const sorted = [...state.obstacles].sort((a, b) => b.z - a.z);
        sorted.forEach((obstacle) => {
          if (obstacle.z > MAX_DEPTH) return;
          const progress = 1 - obstacle.z / MAX_DEPTH;
          const roadHalf = roadHalfFar + (roadHalfNear - roadHalfFar) * progress;
          const x = width / 2 + LANE_X[obstacle.lane] * roadHalf * 0.6;
          const y = horizon + (height - horizon) * progress;
          const scale = Math.max(progress, 0.2);
          const obsWidth = 48 * scale;
          const obsHeight = 110 * scale;
          const radius = Math.min(14 * scale, obsWidth / 2);
          ctx.fillStyle = "rgba(255, 217, 114, 0.8)";
          ctx.strokeStyle = "rgba(14, 16, 28, 0.4)";
          ctx.lineWidth = Math.max(1.2, 2.4 * scale);
          ctx.beginPath();
          ctx.moveTo(x - obsWidth / 2 + radius, y - obsHeight);
          ctx.lineTo(x + obsWidth / 2 - radius, y - obsHeight);
          ctx.quadraticCurveTo(x + obsWidth / 2, y - obsHeight, x + obsWidth / 2, y - obsHeight + radius);
          ctx.lineTo(x + obsWidth / 2, y - radius);
          ctx.quadraticCurveTo(x + obsWidth / 2, y, x + obsWidth / 2 - radius, y);
          ctx.lineTo(x - obsWidth / 2 + radius, y);
          ctx.quadraticCurveTo(x - obsWidth / 2, y, x - obsWidth / 2, y - radius);
          ctx.lineTo(x - obsWidth / 2, y - obsHeight + radius);
          ctx.quadraticCurveTo(x - obsWidth / 2, y - obsHeight, x - obsWidth / 2 + radius, y - obsHeight);
          ctx.fill();
          ctx.stroke();
        });

        const carLaneOffset = state.visualLane - 1;
        const carPos = {
          progress: 0.05,
          roadHalf: roadHalfFar + (roadHalfNear - roadHalfFar) * 0.95,
        };
        const carX = width / 2 + carLaneOffset * carPos.roadHalf * 0.6;
        const carY = horizon + (height - horizon) * 0.95;
        const carScale = 0.9;
        const carWidth = 48 * carScale;
        const carHeight = 120 * carScale;

        ctx.save();
        ctx.translate(carX, carY);
        ctx.fillStyle = "rgba(114, 246, 255, 0.92)";
        ctx.beginPath();
        ctx.moveTo(0, -carHeight);
        ctx.lineTo(carWidth / 2, -carHeight * 0.4);
        ctx.lineTo(carWidth * 0.45, 0);
        ctx.lineTo(-carWidth * 0.45, 0);
        ctx.lineTo(-carWidth / 2, -carHeight * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(14, 16, 28, 0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(14, 16, 28, 0.65)";
        ctx.beginPath();
        ctx.moveTo(0, -carHeight * 0.85);
        ctx.lineTo(carWidth * 0.24, -carHeight * 0.45);
        ctx.lineTo(-carWidth * 0.24, -carHeight * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      function shiftLane(delta) {
        const next = Math.min(Math.max(state.lane + delta, 0), LANE_X.length - 1);
        state.lane = next;
      }

      function spawnObstacle(now) {
        let lane = Math.floor(Math.random() * LANE_X.length);
        if (state.obstacles.length) {
          const lastLane = state.obstacles[state.obstacles.length - 1].lane;
          if (lane === lastLane) {
            lane = (lane + (Math.random() < 0.5 ? 1 : -1) + LANE_X.length) % LANE_X.length;
          }
        }
        state.obstacles.push({
          lane,
          z: MAX_DEPTH,
        });
        state.lastSpawn = now;
        state.spawnInterval = Math.max(420, 1100 - state.distance / 3);
      }

      function updateObstacles(delta, now) {
        if (now - state.lastSpawn > state.spawnInterval) {
          spawnObstacle(now);
        }
        const speedFactor = state.speed * delta * 0.09;
        let crashed = false;
        state.obstacles.forEach((obstacle) => {
          obstacle.z -= speedFactor;
          if (!crashed && obstacle.z <= 2 && obstacle.lane === state.lane) {
            crashed = true;
          }
        });
        state.obstacles = state.obstacles.filter((obstacle) => obstacle.z > 0.6);
        if (crashed) {
          endRun("Impact! You clipped a pylon.", true);
          return true;
        }
        return false;
      }

      function tick(now) {
        if (!state.running) return;
        const delta = Math.min((now - state.lastFrame) / 1000, 0.12);
        state.lastFrame = now;

        state.speed += (state.targetSpeed - state.speed) * Math.min(delta * 4, 1);
        state.distance += state.speed * delta;
        state.visualLane += (state.lane - state.visualLane) * Math.min(delta * 12, 1);

        if (state.distance >= FINISH_DISTANCE) {
          state.distance = FINISH_DISTANCE;
          drawScene();
          updateHUD();
          const elapsed = ((now - state.startTime) / 1000).toFixed(2);
          endRun(`Finish line reached! Time: ${elapsed}s`, false);
          return;
        }

        const crashed = updateObstacles(delta, now);
        drawScene();
        updateHUD();

        if (!crashed) {
          state.rafId = window.requestAnimationFrame(tick);
        }
      }

      function startRun() {
        if (state.running) {
          endRun("Run reset.");
        }
        state.running = true;
        state.lane = 1;
        state.visualLane = 1;
        state.speed = BASE_SPEED;
        state.targetSpeed = BASE_SPEED;
        state.distance = 0;
        state.obstacles = [];
        state.lastSpawn = performance.now();
        state.lastFrame = state.lastSpawn;
        state.startTime = state.lastSpawn;
        startBtn.textContent = "Reset run";
        status.textContent = "Boost with Space and weave through the pylons!";
        drawScene();
        updateHUD();
        state.rafId = window.requestAnimationFrame(tick);
      }

      function endRun(message, crashed = false) {
        if (!state.running) return;
        state.running = false;
        if (state.rafId !== null) {
          window.cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        if (!crashed && state.distance > state.bestDistance) {
          state.bestDistance = state.distance;
        }
        startBtn.textContent = "Start run";
        status.textContent = message;
        updateHUD();
      }

      function setBoost(active) {
        state.accelerating = active;
        state.targetSpeed = active ? BOOST_SPEED : BASE_SPEED;
      }

      const onKeyDown = (event) => {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        if (key === "a" || key === "arrowleft") {
          event.preventDefault();
          shiftLane(-1);
        } else if (key === "d" || key === "arrowright") {
          event.preventDefault();
          shiftLane(1);
        } else if (key === " " || key === "w" || key === "arrowup") {
          event.preventDefault();
          setBoost(true);
        } else if (key === "enter" && !state.running) {
          event.preventDefault();
          startRun();
        }
      };

      const onKeyUp = (event) => {
        const key = event.key.toLowerCase();
        if (key === " " || key === "w" || key === "arrowup") {
          event.preventDefault();
          setBoost(false);
        }
      };

      startBtn.addEventListener("click", startRun);

      const handleLeft = (event) => {
        if (event) event.preventDefault();
        shiftLane(-1);
      };
      const handleRight = (event) => {
        if (event) event.preventDefault();
        shiftLane(1);
      };
      leftBtn.addEventListener("pointerdown", handleLeft);
      rightBtn.addEventListener("pointerdown", handleRight);

      boostBtn.addEventListener("pointerdown", () => setBoost(true));
      boostBtn.addEventListener("pointerup", () => setBoost(false));
      boostBtn.addEventListener("pointerleave", () => setBoost(false));
      boostBtn.addEventListener("click", (event) => {
        event.preventDefault();
        setBoost(true);
        window.setTimeout(() => setBoost(false), 150);
      });

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      drawScene();
      updateHUD();

      return () => {
        if (state.rafId !== null) {
          window.cancelAnimationFrame(state.rafId);
        }
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        wrapper.remove();
      };
    },
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
    logo: "assets/pop-dash.svg",
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
    summary: "Empty the piles and leave none for the AI.",
    description:
      "Take turns removing matches from the piles. Leave the AI with no moves to claim victory—but beware, it plays a perfect endgame!",
    logo: "assets/nim-duel.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "nim-game";

      const status = document.createElement("div");
      status.className = "nim-status";
      status.textContent = "Choose a pile and remove 1–3 matches to start.";

      const stats = document.createElement("div");
      stats.className = "nim-stats";

      const playerBadge = document.createElement("span");
      playerBadge.className = "badge nim-player";
      playerBadge.textContent = "You: 0";

      const aiBadge = document.createElement("span");
      aiBadge.className = "badge nim-ai";
      aiBadge.textContent = "AI: 0";

      const roundsBadge = document.createElement("span");
      roundsBadge.className = "badge nim-rounds";
      roundsBadge.textContent = "Rounds: 0";

      stats.append(playerBadge, aiBadge, roundsBadge);

      const piles = document.createElement("div");
      piles.className = "nim-piles";

      const controls = document.createElement("div");
      controls.className = "nim-controls";

      const pileLabel = document.createElement("label");
      pileLabel.className = "nim-select";
      const pileLabelText = document.createElement("span");
      pileLabelText.textContent = "Pile";

      const pileSelect = document.createElement("select");
      pileSelect.setAttribute("aria-label", "Choose pile");
      pileLabel.append(pileLabelText, pileSelect);

      const countLabel = document.createElement("label");
      countLabel.className = "nim-select";
      const countLabelText = document.createElement("span");
      countLabelText.textContent = "Matches";

      const countSelect = document.createElement("select");
      countSelect.setAttribute("aria-label", "Matches to remove");
      countLabel.append(countLabelText, countSelect);

      const takeBtn = document.createElement("button");
      takeBtn.type = "button";
      takeBtn.className = "primary-btn";
      takeBtn.textContent = "Remove";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "New round";

      controls.append(pileLabel, countLabel, takeBtn, resetBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Select a pile, choose how many (1–3) to remove, then hit Remove. Whoever takes the final match wins the round.";

      wrapper.append(status, stats, piles, controls, help);
      root.appendChild(wrapper);

      const config = {
        maxTake: 3,
        pileRange: [3, 6],
        matchesRange: [3, 9],
        aiDelay: 650,
      };

      const state = {
        piles: [],
        running: false,
        playerWins: 0,
        aiWins: 0,
        rounds: 0,
        lastMove: null,
        aiTimer: null,
      };

      pileSelect.addEventListener("change", () => {
        updateCountOptions();
      });

      takeBtn.addEventListener("click", () => {
        playerMove();
      });

      resetBtn.addEventListener("click", () => {
        startRound();
      });

      startRound();

      function startRound() {
        clearTimeout(state.aiTimer ?? 0);
        state.running = true;
        state.lastMove = null;
        state.piles = buildPiles();
        state.rounds += 1;
        status.textContent = "Your turn: pick a pile, remove 1–3 matches, and try to leave the AI without a smart reply.";
        renderPiles();
        updateControls();
        renderStats();
      }

      function buildPiles() {
        const [minPiles, maxPiles] = config.pileRange;
        const [minMatches, maxMatches] = config.matchesRange;
        const totalPiles = Math.floor(Math.random() * (maxPiles - minPiles + 1)) + minPiles;
        const result = [];
        while (result.length < totalPiles) {
          const matches = Math.floor(Math.random() * (maxMatches - minMatches + 1)) + minMatches;
          result.push(matches);
        }
        if (result.every((count) => count === 0)) {
          result[0] = minMatches;
        }
        return result;
      }

      function renderStats() {
        playerBadge.textContent = `You: ${state.playerWins}`;
        aiBadge.textContent = `AI: ${state.aiWins}`;
        roundsBadge.textContent = `Rounds: ${state.rounds}`;
      }

      function renderPiles() {
        piles.textContent = "";
        state.piles.forEach((count, index) => {
          const pile = document.createElement("div");
          pile.className = "nim-pile";
          if (state.lastMove && state.lastMove.pile === index) {
            pile.classList.add(`last-${state.lastMove.by}`);
          }

          const label = document.createElement("div");
          label.className = "nim-pile-label";
          label.textContent = `Pile ${index + 1} · ${count}`;

          const matches = document.createElement("div");
          matches.className = "nim-matches";
          for (let i = 0; i < count; i += 1) {
            const match = document.createElement("span");
            match.className = "nim-match";
            matches.appendChild(match);
          }

          pile.append(label, matches);
          piles.appendChild(pile);
        });
        updateControls();
      }

      function updateControls() {
        pileSelect.textContent = "";
        state.piles.forEach((count, index) => {
          const option = document.createElement("option");
          option.value = String(index);
          option.textContent = `Pile ${index + 1}`;
          option.disabled = count === 0;
          pileSelect.appendChild(option);
        });

        const firstEnabled = [...pileSelect.options].find((option) => !option.disabled);
        if (firstEnabled) {
          pileSelect.value = firstEnabled.value;
        }

        updateCountOptions();
        takeBtn.disabled = !state.running || !firstEnabled;
      }

      function updateCountOptions() {
        const selectedIndex = Number.parseInt(pileSelect.value, 10);
        const available = Number.isInteger(selectedIndex) ? state.piles[selectedIndex] ?? 0 : 0;
        countSelect.textContent = "";
        const limit = Math.min(config.maxTake, available);
        for (let i = 1; i <= limit; i += 1) {
          const option = document.createElement("option");
          option.value = String(i);
          option.textContent = String(i);
          countSelect.appendChild(option);
        }
        if (countSelect.options.length > 0) {
          countSelect.value = countSelect.options[0].value;
        }
      }

      function playerMove() {
        if (!state.running) return;
        const pileIndex = Number.parseInt(pileSelect.value, 10);
        const take = Number.parseInt(countSelect.value, 10);
        if (!Number.isInteger(pileIndex) || !Number.isInteger(take)) return;
        if (take < 1 || take > config.maxTake) return;
        if (state.piles[pileIndex] < take) {
          status.textContent = "Not enough matches in that pile.";
          return;
        }
        applyMove({ pile: pileIndex, amount: take, by: "player" });
        if (isRoundOver()) {
          finishRound("player");
          return;
        }
        status.textContent = "AI is thinking…";
        takeBtn.disabled = true;
        state.aiTimer = window.setTimeout(aiMove, config.aiDelay);
      }

      function aiMove() {
        if (!state.running) return;
        const move = calculateAiMove();
        applyMove({ ...move, by: "ai" });
        if (isRoundOver()) {
          finishRound("ai");
          return;
        }
        status.textContent = "Your turn. Aim for a zero nim-sum.";
        takeBtn.disabled = false;
      }

      function calculateAiMove() {
        const maxTake = config.maxTake;
        const nimSum = state.piles.reduce((acc, pile) => acc ^ pile, 0);
        if (nimSum === 0) {
          const pileIndex = state.piles.findIndex((pile) => pile > 0);
          const amount = Math.min(maxTake, state.piles[pileIndex]);
          return { pile: pileIndex, amount };
        }
        for (let index = 0; index < state.piles.length; index += 1) {
          const pile = state.piles[index];
          const target = pile ^ nimSum;
          if (target < pile) {
            const amount = pile - target;
            if (amount >= 1 && amount <= maxTake) {
              return { pile: index, amount };
            }
          }
        }
        const fallback = state.piles.findIndex((pile) => pile > 0);
        return { pile: fallback, amount: Math.min(maxTake, state.piles[fallback]) };
      }

      function applyMove({ pile, amount, by }) {
        clearTimeout(state.aiTimer ?? 0);
        state.aiTimer = null;
        state.piles[pile] -= amount;
        state.piles[pile] = Math.max(0, state.piles[pile]);
        state.lastMove = { pile, amount, by };
        renderPiles();
        const mover = by === "player" ? "You" : "AI";
        status.textContent = `${mover} took ${amount} ${amount === 1 ? "match" : "matches"} from pile ${
          pile + 1
        }.`;
      }

      function isRoundOver() {
        return state.piles.every((pile) => pile === 0);
      }

      function finishRound(winner) {
        state.running = false;
        takeBtn.disabled = true;
        clearTimeout(state.aiTimer ?? 0);
        state.aiTimer = null;
        if (winner === "player") {
          state.playerWins += 1;
          status.textContent = "You win the round!";
        } else {
          state.aiWins += 1;
          status.textContent = "AI claimed the last match. Try again!";
        }
        renderStats();
      }

      return () => {
        clearTimeout(state.aiTimer ?? 0);
        window.removeEventListener("resize", handleResize);
        wrapper.remove();
      };
    },
  },
  {
    id: "bubble",
    name: "Bubble Rally",
    summary: "Pop the orb and race around the loop first.",
    description:
      "Pulse the bubble roller to dash along the neon track. Time your landing on boosts, dodge slow zones, and bump rivals back to start to win the rally.",
    logo: "assets/bubble-rally.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "bubble-game";

      const status = document.createElement("div");
      status.className = "bubble-status";
      status.textContent = "Pop the orb to take the first move.";

      const stats = document.createElement("div");
      stats.className = "bubble-stats";

      const playerBadge = document.createElement("span");
      playerBadge.className = "badge bubble-player";
      playerBadge.textContent = "Wins: 0";

      const aiBadge = document.createElement("span");
      aiBadge.className = "badge bubble-ai";
      aiBadge.textContent = "AI Wins: 0";

      stats.append(playerBadge, aiBadge);

      const board = document.createElement("div");
      board.className = "bubble-board";

      const controls = document.createElement("div");
      controls.className = "bubble-controls";

      const popBtn = document.createElement("button");
      popBtn.type = "button";
      popBtn.className = "bubble-pop-btn";
      popBtn.textContent = "Pop";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "Reset";

      controls.append(popBtn, resetBtn);

      const help = document.createElement("p");
      help.className = "help-text";
      help.textContent = "Rolls go from 1 to 6. Land exactly on the finish to win. Boost tiles push you forward; slowdown tiles tug you back.";

      wrapper.append(status, stats, board, controls, help);
      root.appendChild(wrapper);

      const track = [
        { x: 8, y: 8 },
        { x: 32, y: 8 },
        { x: 58, y: 8 },
        { x: 82, y: 10 },
        { x: 90, y: 28 },
        { x: 92, y: 48 },
        { x: 88, y: 68 },
        { x: 74, y: 84 },
        { x: 52, y: 90 },
        { x: 28, y: 86 },
        { x: 10, y: 74 },
        { x: 8, y: 54 },
        { x: 10, y: 34 },
        { x: 26, y: 24 },
        { x: 48, y: 24 },
        { x: 70, y: 26 },
        { x: 76, y: 46 },
        { x: 68, y: 64 },
        { x: 48, y: 70 },
        { x: 38, y: 52 },
        { x: 46, y: 36 },
        { x: 60, y: 44 },
      ];

      const tileTypes = new Map([
        [2, "boost"],
        [5, "slow"],
        [7, "boost"],
        [10, "slow"],
        [13, "boost"],
        [16, "slow"],
      ]);
      const finishIndex = track.length - 1;

      const state = {
        playerPos: 0,
        aiPos: 0,
        playerWins: 0,
        aiWins: 0,
        turn: "player",
        running: true,
        lastRoll: null,
        lastMove: null,
        aiTimer: null,
      };

      renderBoard();
      renderStats();
      updateStatus();
      updateControls();

      popBtn.addEventListener("click", () => {
        if (!state.running || state.turn !== "player") return;
        processRoll("player", rollDie());
      });

      resetBtn.addEventListener("click", startRound);

      function startRound() {
        clearTimeout(state.aiTimer ?? 0);
        state.playerPos = 0;
        state.aiPos = 0;
        state.turn = "player";
        state.running = true;
        state.lastRoll = null;
        state.lastMove = null;
        renderBoard();
        updateStatus("New rally! Pop the orb to move first.");
        updateControls();
      }

      function rollDie() {
        return Math.floor(Math.random() * 6) + 1;
      }

      function processRoll(actor, value) {
        state.lastRoll = value;
        const startPos = getPosition(actor);
        let target = startPos + value;
        if (target > finishIndex) {
          target = startPos; // overshoot: stay put
          updateStatus(
            `${actor === "player" ? "You" : "AI"} rolled ${value} but needs an exact finish.`
          );
          concludeTurn(actor);
          return;
        }

        setPosition(actor, target);
        const tileEffect = applyTileEffect(actor);
        if (!state.running) return;
        const collisionEffect = handleCollision(actor);
        renderBoard();
        if (!state.running) return;

        if (getPosition(actor) === finishIndex) {
          handleWin(actor);
          return;
        }

        const mover = actor === "player" ? "You" : "AI";
        let message = `${mover} moved ${value} ${value === 1 ? "step" : "steps"}.`;
        if (tileEffect) {
          message += ` ${tileEffect}`;
        }
        if (collisionEffect) {
          message += ` ${collisionEffect}`;
        }
        updateStatus(message);
        concludeTurn(actor);
      }

      function concludeTurn(actor) {
        if (!state.running) return;
        if (actor === "player") {
          state.turn = "ai";
          updateControls();
          state.aiTimer = window.setTimeout(() => {
            processRoll("ai", chooseAiRoll());
          }, 900);
        } else {
          state.turn = "player";
          updateControls();
          updateStatus("Your turn. Pop the orb!");
        }
      }

      function chooseAiRoll() {
        const pos = state.aiPos;
        const remaining = finishIndex - pos;
        if (remaining <= 6 && remaining > 0) return remaining;

        const safeRolls = [];
        for (let roll = 1; roll <= 6; roll += 1) {
          let next = pos + roll;
          if (next > finishIndex) continue;
          const type = tileTypes.get(next);
          if (type !== "slow") {
            safeRolls.push(roll);
          }
        }
        if (safeRolls.length > 0) {
          return safeRolls[Math.floor(Math.random() * safeRolls.length)];
        }
        return rollDie();
      }

      function handleWin(actor) {
        state.running = false;
        clearTimeout(state.aiTimer ?? 0);
        state.aiTimer = null;
        if (actor === "player") {
          state.playerWins += 1;
          updateStatus("Victory! You crossed the finish first.");
        } else {
          state.aiWins += 1;
          updateStatus("AI scooped the win. Reset to challenge again.");
        }
        renderStats();
        updateControls();
      }

      function applyTileEffect(actor) {
        const pos = getPosition(actor);
        const type = tileTypes.get(pos);
        if (!type) return "";
        if (type === "boost" && pos < finishIndex) {
          setPosition(actor, Math.min(finishIndex, pos + 1));
          renderBoard();
          if (getPosition(actor) === finishIndex) {
            handleWin(actor);
            return "Boosted into the finish!";
          }
          return "Hit a boost +1!";
        }
        if (type === "slow" && pos > 0) {
          setPosition(actor, Math.max(0, pos - 1));
          return "Slowed down −1.";
        }
        return "";
      }

      function handleCollision(actor) {
        const playerPos = state.playerPos;
        const aiPos = state.aiPos;
        if (playerPos === aiPos && playerPos !== finishIndex) {
          if (actor === "player") {
            state.aiPos = 0;
            return "Bumped the AI back to start!";
          }
          state.playerPos = 0;
          return "AI bumped you back to start.";
        }
        return "";
      }

      function getPosition(actor) {
        return actor === "player" ? state.playerPos : state.aiPos;
      }

      function setPosition(actor, value) {
        if (actor === "player") {
          state.playerPos = value;
        } else {
          state.aiPos = value;
        }
      }

      function renderBoard() {
        board.textContent = "";
        track.forEach((coords, index) => {
          const node = document.createElement("div");
          node.className = "bubble-node";
          node.style.setProperty("--x", `${coords.x}%`);
          node.style.setProperty("--y", `${coords.y}%`);
          if (tileTypes.has(index)) {
            node.classList.add(`bubble-${tileTypes.get(index)}`);
          }
          if (index === finishIndex) {
            node.classList.add("bubble-finish");
          }

          const label = document.createElement("span");
          label.className = "bubble-node-index";
          label.textContent = String(index + 1);
          node.appendChild(label);

          if (state.playerPos === index) {
            const token = document.createElement("span");
            token.className = "bubble-token bubble-token-player";
            node.appendChild(token);
          }
          if (state.aiPos === index) {
            const token = document.createElement("span");
            token.className = "bubble-token bubble-token-ai";
            node.appendChild(token);
          }

          board.appendChild(node);
        });
      }

      function renderStats() {
        playerBadge.textContent = `Wins: ${state.playerWins}`;
        aiBadge.textContent = `AI Wins: ${state.aiWins}`;
      }

      function updateControls() {
        popBtn.disabled = !state.running || state.turn !== "player";
        resetBtn.disabled = false;
        popBtn.textContent = state.running && state.turn === "player" ? "Pop" : "Pop";
      }

      function updateStatus(message) {
        if (message) {
          status.textContent = message;
        }
      }

      return () => {
        clearTimeout(state.aiTimer ?? 0);
        wrapper.remove();
      };
    },
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
    logo: "assets/harmonic-echo.svg",
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
    logo: "assets/spot-clash.svg",
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

      const difficulties = {
        chill: { label: "Chill", reaction: 2300, accuracy: 0.55, cardSize: 4, target: 6 },
        easy: { label: "Easy", reaction: 2000, accuracy: 0.7, cardSize: 5, target: 7 },
        medium: { label: "Medium", reaction: 1650, accuracy: 0.82, cardSize: 6, target: 8 },
        hard: { label: "Hard", reaction: 1300, accuracy: 0.9, cardSize: 7, target: 9 },
        spicy: { label: "Spicy", reaction: 950, accuracy: 0.95, cardSize: 7, target: 10 },
        expert: { label: "Expert", reaction: 700, accuracy: 0.98, cardSize: 8, target: 10 },
      };

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
        aiTimeout: null,
      };

      startBtn.addEventListener("click", () => {
        resetGame();
        startRound();
      });

      function setDifficulty(key) {
        if (!difficulties[key]) return;
        state.difficulty = key;
        state.winTarget = difficulties[key].target;
        difficultyButtons.forEach((button, valueKey) => {
          button.setAttribute("aria-pressed", valueKey === key ? "true" : "false");
        });
        resetGame(false);
        status.textContent = `${difficulties[key].label} locked in. Press Start to play.`;
        renderScoreboard();
      }

      function resetGame(updateStatus = true) {
        clearTimeout(state.aiTimeout ?? 0);
        state.aiTimeout = null;
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
        clearTimeout(state.aiTimeout ?? 0);
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
          clearTimeout(state.aiTimeout ?? 0);
          state.aiTimeout = null;
          state.playerScore += 1;
          status.textContent = "You spotted it first!";
          checkForWinner();
        } else {
          state.roundActive = false;
          clearTimeout(state.aiTimeout ?? 0);
          state.aiTimeout = null;
          state.aiScore += 1;
          status.textContent = "Wrong symbol—AI scores the point.";
          checkForWinner();
        }
      }

      function scheduleAiMove() {
        const config = difficulties[state.difficulty];
        state.aiTimeout = window.setTimeout(() => {
          performAiMove();
        }, config.reaction);
      }

      function performAiMove() {
        if (!state.roundActive) return;
        const config = difficulties[state.difficulty];
        const correct = Math.random() <= config.accuracy;
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
        const timeoutId = window.setTimeout(() => {
          startRound();
        }, 1100);
        state.aiTimeout = timeoutId;
      }

      function shuffle(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      return () => {
        clearTimeout(state.aiTimeout ?? 0);
        wrapper.remove();
      };
    },
  },
  {
    id: "catsdogs",
    name: "Cats vs Dogs",
    summary: "Claim the park tile-by-tile before the hounds do.",
    description:
      "Lead the clever cats in a turf tug-of-war against the dogs. Each tile’s terrain changes the odds—choose wisely, win the majority, and control the park!",
    logo: "assets/cats-vs-dogs.svg",
    init(root) {
      const wrapper = document.createElement("div");
      wrapper.className = "catsdogs-game";

      const status = document.createElement("div");
      status.className = "catsdogs-status";
      status.textContent = "Welcome to Meadow Park. Pick a tile to deploy the cats.";

      const scoreboard = document.createElement("div");
      scoreboard.className = "catsdogs-scoreboard";
      const catBadge = document.createElement("span");
      catBadge.className = "badge catsdogs-cats";
      const dogBadge = document.createElement("span");
      dogBadge.className = "badge catsdogs-dogs";
      const tilesBadge = document.createElement("span");
      tilesBadge.className = "badge catsdogs-tiles";
      scoreboard.append(catBadge, dogBadge, tilesBadge);

      const board = document.createElement("div");
      board.className = "catsdogs-board";

      const controls = document.createElement("div");
      controls.className = "catsdogs-controls";
      const restartBtn = document.createElement("button");
      restartBtn.type = "button";
      restartBtn.textContent = "Reset Park";
      restartBtn.addEventListener("click", () => {
        setupGame(true);
      });
      controls.appendChild(restartBtn);

      wrapper.append(status, scoreboard, board, controls);
      root.appendChild(wrapper);

      const terrains = [
        {
          id: "harbor",
          name: "Fish Wharf",
          cat: 3.4,
          dog: 1.6,
          className: "tile-harbor",
          blurb: "Fishy scent gives cats +2.",
          icon: "assets/terrain-fish.svg",
        },
        {
          id: "kennel",
          name: "Bone Yard",
          cat: 1.5,
          dog: 3.6,
          className: "tile-kennel",
          blurb: "Bones everywhere—dogs gain +2.",
          icon: "assets/terrain-bone.svg",
        },
        {
          id: "plaza",
          name: "Sun Plaza",
          cat: 2.4,
          dog: 2.2,
          className: "tile-plaza",
          blurb: "Neutral ground, almost even odds.",
          icon: "assets/terrain-sun.svg",
        },
        {
          id: "fountain",
          name: "Fountain Run",
          cat: 2.9,
          dog: 2.4,
          className: "tile-fountain",
          blurb: "Water play favors nimble paws.",
          icon: "assets/terrain-fountain.svg",
        },
        {
          id: "trail",
          name: "Scent Trail",
          cat: 1.8,
          dog: 3.1,
          className: "tile-trail",
          blurb: "Trail patrol boosts dog instincts.",
          icon: "assets/terrain-trail.svg",
        },
        {
          id: "market",
          name: "Snack Market",
          cat: 2.6,
          dog: 2.6,
          className: "tile-market",
          blurb: "Treats for all—pure toss-up.",
          icon: "assets/terrain-market.svg",
        },
      ];

      const terrainById = new Map(terrains.map((terrain) => [terrain.id, terrain]));
      const totalTiles = 25;
      const target = Math.floor(totalTiles / 2) + 1;

      const state = {
        board: [],
        catScore: 0,
        dogScore: 0,
        locked: false,
        finished: false,
        aiTimeout: null,
      };

      setupGame(false);

      function setupGame(announce) {
        clearTimeout(state.aiTimeout ?? 0);
        state.aiTimeout = null;
        state.board = generateBoard();
        state.catScore = 0;
        state.dogScore = 0;
        state.locked = false;
        state.finished = false;
        renderBoard();
        renderScoreboard();
        if (announce) {
          status.textContent = "Fresh park layout ready. Cats take the first move.";
        }
      }

      function generateBoard() {
        const collection = [];
        for (let i = 0; i < totalTiles; i += 1) {
          const terrain = terrains[Math.floor(Math.random() * terrains.length)];
          collection.push({
            terrain: terrain.id,
            owner: null,
          });
        }
        return collection;
      }

      function renderBoard() {
        board.textContent = "";
        state.board.forEach((tile, index) => {
          const terrain = terrainById.get(tile.terrain);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "catsdogs-tile";
          button.classList.add(terrain.className);
          if (tile.owner === "player") button.classList.add("tile-cat");
          if (tile.owner === "ai") button.classList.add("tile-dog");
          button.disabled = state.locked || state.finished || tile.owner !== null;
          button.innerHTML = `
            <img src="${terrain.icon}" alt="" class="tile-icon" />
            <span class="tile-name">${terrain.name}</span>
          `;
          button.setAttribute(
            "aria-label",
            `${terrain.name}. ${tile.owner ? (tile.owner === "player" ? "Cats control" : "Dogs control") : "Unclaimed"}`
          );
          button.addEventListener("click", () => handlePlayerMove(index));
          board.appendChild(button);
        });
      }

      function renderScoreboard() {
        catBadge.textContent = `Cats: ${state.catScore}`;
        dogBadge.textContent = `Dogs: ${state.dogScore}`;
        const remaining = totalTiles - (state.catScore + state.dogScore);
        tilesBadge.textContent = `Tiles left: ${remaining}`;
      }

      function handlePlayerMove(index) {
        if (state.locked || state.finished) return;
        const tile = state.board[index];
        if (!tile || tile.owner) return;
        state.locked = true;
        const outcome = resolveBattle(index, "player");
        status.textContent = `${outcome} Dogs are preparing a counter move...`;
        renderBoard();
        renderScoreboard();
        if (checkVictory()) return;
        state.aiTimeout = window.setTimeout(() => {
          aiMove();
        }, 700);
      }

      function aiMove() {
        if (state.finished) return;
        const choices = state.board
          .map((tile, index) => ({ tile, index }))
          .filter((entry) => entry.tile.owner === null);
        if (!choices.length) {
          concludeMatch();
          return;
        }
        const scored = choices.map((choice) => {
          const terrain = terrainById.get(choice.tile.terrain);
          const preference = terrain.dog - terrain.cat + Math.random() * 0.5;
          return { ...choice, preference };
        });
        scored.sort((a, b) => b.preference - a.preference);
        const targetChoice = scored[0];
        const outcome = resolveBattle(targetChoice.index, "ai");
        renderBoard();
        renderScoreboard();
        const finished = checkVictory();
        if (!finished) {
          state.locked = false;
          status.textContent = `${outcome} Your turn—choose the next tile.`;
        }
      }

      function resolveBattle(index, attacker) {
        const tile = state.board[index];
        const terrain = terrainById.get(tile.terrain);
        const catRoll = terrain.cat + Math.random() * 2 + (attacker === "player" ? 0.35 : 0);
        const dogRoll = terrain.dog + Math.random() * 2 + (attacker === "ai" ? 0.35 : 0);
        let winner;
        let detail = terrain.blurb;
        if (Math.abs(catRoll - dogRoll) < 0.25) {
          if (terrain.cat >= terrain.dog) {
            winner = "player";
            detail += " Cats edged the tie.";
          } else if (terrain.dog > terrain.cat) {
            winner = "ai";
            detail += " Dogs took the tiebreak.";
          } else {
            winner = Math.random() < 0.5 ? "player" : "ai";
            detail += winner === "player" ? " Cats won the scramble." : " Dogs won the scramble.";
          }
        } else if (catRoll > dogRoll) {
          winner = "player";
        } else {
          winner = "ai";
        }

        tile.owner = winner;
        if (winner === "player") {
          state.catScore += 1;
          return `${terrain.name}: Cats claimed the tile. ${detail}`;
        }
        state.dogScore += 1;
        return `${terrain.name}: Dogs took control. ${detail}`;
      }

      function checkVictory() {
        if (state.catScore >= target || state.dogScore >= target) {
          concludeMatch();
          return true;
        }
        if (state.catScore + state.dogScore === totalTiles) {
          concludeMatch();
          return true;
        }
        return false;
      }

      function concludeMatch() {
        clearTimeout(state.aiTimeout ?? 0);
        state.aiTimeout = null;
        state.finished = true;
        state.locked = true;
        const result = state.catScore === state.dogScore
          ? "It’s a stalemate. Reset to play again."
          : state.catScore > state.dogScore
          ? "Cats dominate the park!"
          : "Dogs overrun the park!";
        status.textContent = result;
        renderBoard();
        renderScoreboard();
      }

      return () => {
        clearTimeout(state.aiTimeout ?? 0);
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

      const modeStyles = {
        easy: { sizeScale: 1.35, opacity: 0.55, blur: 8 },
        mild: { sizeScale: 1.2, opacity: 0.45, blur: 7 },
        medium: { sizeScale: 1, opacity: 0.38, blur: 6 },
        hard: { sizeScale: 0.85, opacity: 0.32, blur: 5 },
        expert: { sizeScale: 0.75, opacity: 0.28, blur: 4 },
      };

      const puzzles = [
        {
          id: "reef",
          title: "Reef Snapshot",
          left: "assets/reef-kelp.png",
          right: "assets/reef-kelp.png",
          differences: [
            { x: 16, y: 52, radius: 7, overlay: { color: "rgba(255, 217, 114, 0.4)", size: 14 } },
            { x: 37, y: 41, radius: 6, overlay: { color: "rgba(114, 246, 255, 0.38)", size: 12 } },
            { x: 48, y: 27, radius: 5, overlay: { color: "rgba(140, 111, 248, 0.35)", size: 10 } },
            { x: 24, y: 66, radius: 5, overlay: { color: "rgba(247, 116, 116, 0.38)", size: 11 } },
            { x: 63, y: 74, radius: 5, overlay: { color: "rgba(45, 217, 255, 0.36)", size: 11 } },
            { x: 82, y: 62, radius: 5, overlay: { color: "rgba(255, 157, 114, 0.38)", size: 11 } },
          ],
        },
        {
          id: "city",
          title: "Neon Skyline",
          left: "assets/city-original.png",
          right: "assets/city-original.png",
          differences: [
            { x: 14, y: 66, radius: 6, overlay: { color: "rgba(247, 116, 116, 0.4)", size: 13 } },
            { x: 31, y: 43, radius: 5, overlay: { color: "rgba(114, 246, 255, 0.36)", size: 11 } },
            { x: 48, y: 28, radius: 5, overlay: { color: "rgba(140, 111, 248, 0.33)", size: 9 } },
            { x: 63, y: 63, radius: 5, overlay: { color: "rgba(255, 217, 114, 0.34)", size: 10 } },
            { x: 78, y: 44, radius: 5, overlay: { color: "rgba(45, 217, 255, 0.33)", size: 10 } },
            { x: 91, y: 55, radius: 5, overlay: { color: "rgba(255, 157, 114, 0.34)", size: 10 } },
          ],
        },
        {
          id: "lab",
          title: "Stellar Lab",
          left: "assets/lab-original.png",
          right: "assets/lab-original.png",
          differences: [
            { x: 20, y: 56, radius: 6, overlay: { color: "rgba(114, 246, 255, 0.34)", size: 12 } },
            { x: 38, y: 33, radius: 5, overlay: { color: "rgba(255, 217, 114, 0.34)", size: 11 } },
            { x: 56, y: 48, radius: 5, overlay: { color: "rgba(140, 111, 248, 0.34)", size: 10 } },
            { x: 71, y: 41, radius: 5, overlay: { color: "rgba(247, 116, 116, 0.34)", size: 10 } },
            { x: 80, y: 64, radius: 5, overlay: { color: "rgba(45, 217, 255, 0.32)", size: 10 } },
            { x: 52, y: 72, radius: 5, overlay: { color: "rgba(255, 157, 114, 0.34)", size: 10 } },
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
          left: "assets/arcade-original.png",
          right: "assets/arcade-original.png",
          differences: [
            { x: 28, y: 62, radius: 6, overlay: { color: "rgba(255, 217, 114, 0.4)", size: 12 } },
            { x: 44, y: 30, radius: 6, overlay: { color: "rgba(114, 246, 255, 0.32)", size: 11 } },
            { x: 61, y: 36, radius: 6, overlay: { color: "rgba(140, 111, 248, 0.34)", size: 10 } },
            { x: 74, y: 31, radius: 6, overlay: { color: "rgba(247, 116, 116, 0.34)", size: 11 } },
            { x: 84, y: 60, radius: 6, overlay: { color: "rgba(45, 217, 255, 0.32)", size: 11 } },
            { x: 52, y: 54, radius: 6, overlay: { color: "rgba(255, 157, 114, 0.34)", size: 11 } },
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
        targetCount: 0,
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
        if (state.failed) {
          message.textContent = "Timer already expired—restart the puzzle to try again.";
          return;
        }
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

      function selectActiveDiffs(puzzle) {
        const target = Math.min(getMode().differences, puzzle.differences.length);
        const pool = shuffle(puzzle.differences.slice());
        return pool.slice(0, target);
      }

      function selectPuzzle(index, forceRestart = false) {
        if (!forceRestart && index === state.puzzleIndex && state.timerRunning) return;
        cleanupTimer();
        state.puzzleIndex = index;
        state.found = new Set();
        state.startTime = null;
        state.failed = false;
        state.activeDiffs = selectActiveDiffs(puzzles[index]);
        state.targetCount = state.activeDiffs.length;
        state.timeRemaining = getMode().timeLimit;
        state.timerRunning = false;
        updateButtons();
        const puzzle = puzzles[index];
        leftImg.src = puzzle.left;
        rightImg.src = puzzle.right;
        extendSelect.value = String(getMode().extension);
        removeMarkers();
        renderOverlays();
        totalEl.textContent = String(state.targetCount);
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

      function renderOverlays() {
        const style = modeStyles[state.mode] ?? modeStyles.medium;
        rightPanel.querySelectorAll(".spotdiff-overlay").forEach((overlay) => overlay.remove());
        state.activeDiffs.forEach((diff, idx) => {
          if (!diff.overlay) return;
          const overlay = document.createElement("div");
          overlay.className = "spotdiff-overlay";
          overlay.dataset.index = String(idx);
          overlay.style.left = `${diff.x}%`;
          overlay.style.top = `${diff.y}%`;
          const baseSize = diff.overlay.size ?? diff.radius * 2;
          const size = baseSize * style.sizeScale;
          overlay.style.width = `${size}%`;
          overlay.style.height = `${size}%`;
          overlay.style.background = diff.overlay.color ?? "rgba(255, 217, 114, 0.35)";
          overlay.style.opacity = String(style.opacity);
          overlay.style.filter = `blur(${style.blur}px)`;
          rightPanel.appendChild(overlay);
        });
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
          const foundCount = Math.min(state.found.size, state.targetCount);
          foundEl.textContent = String(foundCount);
          renderMarker(hitIndex);
          message.textContent = ["Nice spot!", "Great eye!", "You found one!"][foundCount % 3];
          if (foundCount === state.targetCount) {
            finishPuzzle();
          }
        } else {
          panel.classList.add("shake");
          window.setTimeout(() => panel.classList.remove("shake"), 260);
          message.textContent = "Not quite. Try another spot.";
        }
      }

      function renderMarker(index) {
        const overlay = rightPanel.querySelector(`.spotdiff-overlay[data-index="${index}"]`);
        if (overlay) overlay.classList.add("found");
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
const homeView = document.querySelector(".home-view");
const gameCard = document.querySelector(".game-card");
const titleEl = document.getElementById("game-title");
const descEl = document.getElementById("game-description");
const rootEl = document.getElementById("game-root");
const listTemplate = document.getElementById("game-list-item-template");
const backButton = document.querySelector(".back-button");

const LOCK_PASSWORD = "1108";
const LOCKED_GAME_IDS = new Set(["memory", "skyport", "orbit", "catsdogs", "spotdiff"]);
let lockedUnlocked = false;
lockedUnlocked = false;

let comingList = null;
let lockedHint = null;
let lockedInput = null;
let passButton = null;

let activeId = null;
let cleanup = null;

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
  const game = games.find((entry) => entry.id === hash);
  if (!game) {
    showHome(true);
    return;
  }
  if (LOCKED_GAME_IDS.has(game.id) && !lockedUnlocked) {
    handleLockedAttempt();
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

function handleLockedAttempt() {
  if (lockedUnlocked) return;
  if (lockedHint) lockedHint.textContent = "These games are still baking. Enter your access key above to peek behind the curtain.";
  lockedInput?.focus();
}
