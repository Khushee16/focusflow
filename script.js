/* ============ FocusFlow — Pomodoro timer ============ */
(function () {
  "use strict";

  var MODES = {
    focus: { label: "Focus session", inputId: "focusLen" },
    short: { label: "Short break", inputId: "shortLen" },
    long: { label: "Long break", inputId: "longLen" }
  };
  var CYCLE = 4; // focus sessions before a long break

  var state = {
    mode: "focus",
    total: 25 * 60,
    remaining: 25 * 60,
    running: false,
    timerId: null,
    cycleCount: 0
  };

  var timeDisplay = document.getElementById("timeDisplay");
  var modeLabel = document.getElementById("modeLabel");
  var ringFg = document.getElementById("ringFg");
  var ringWrap = document.querySelector(".ring-wrap");
  var startPauseBtn = document.getElementById("startPauseBtn");
  var resetBtn = document.getElementById("resetBtn");
  var cycleNote = document.getElementById("cycleNote");
  var CIRC = 2 * Math.PI * 96;

  ringFg.style.strokeDasharray = CIRC;
  ringFg.style.strokeDashoffset = 0;

  /* ---------- Persistence ---------- */
  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }
  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* unavailable */ }
  }
  var stats = loadJSON("focusflow-stats", { date: todayKey(), pomodoros: 0, focusMinutes: 0 });
  if (stats.date !== todayKey()) stats = { date: todayKey(), pomodoros: 0, focusMinutes: 0 };
  var tasks = loadJSON("focusflow-tasks", []);
  if (!Array.isArray(tasks)) tasks = [];
  var lengths = loadJSON("focusflow-lengths", { focus: 25, short: 5, long: 15 });

  /* ---------- Timer core ---------- */
  function fmt(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
  }
  function updateDisplay() {
    timeDisplay.textContent = fmt(state.remaining);
    var frac = state.total > 0 ? state.remaining / state.total : 0;
    ringFg.style.strokeDashoffset = CIRC * (1 - frac);
    document.title = fmt(state.remaining) + " — FocusFlow";
  }
  function setMode(mode, resetTimer) {
    state.mode = mode;
    state.total = getLength(mode) * 60;
    if (resetTimer !== false) {
      pause();
      state.remaining = state.total;
    }
    var tabs = document.querySelectorAll(".mode-tab");
    tabs.forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-mode") === mode); });
    modeLabel.textContent = MODES[mode].label;
    ringWrap.classList.toggle("break", mode !== "focus");
    updateCycleNote();
    updateDisplay();
  }
  function getLength(mode) {
    var v = parseInt(lengths[mode], 10);
    return (isNaN(v) || v < 1) ? 25 : v;
  }
  function updateCycleNote() {
    var left = CYCLE - (state.cycleCount % CYCLE);
    cycleNote.textContent = state.mode === "focus"
      ? (left === CYCLE ? "Complete 4 focus sessions to earn a long break." : left + (left === 1 ? " session" : " sessions") + " to go until your long break.")
      : "Recharge — your next focus session starts when you press Start.";
  }
  function tick() {
    if (state.remaining > 0) {
      state.remaining--;
      updateDisplay();
      if (state.remaining === 0) onComplete();
    }
  }
  function start() {
    if (state.running) return;
    state.running = true;
    startPauseBtn.textContent = "Pause";
    state.timerId = setInterval(tick, 1000);
  }
  function pause() {
    state.running = false;
    startPauseBtn.textContent = state.remaining < state.total && state.remaining > 0 ? "Resume" : "Start";
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 660;
      o.type = "sine";
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.start();
      o.stop(ctx.currentTime + 0.65);
    } catch (e) { /* audio unavailable */ }
  }
  function onComplete() {
    pause();
    beep();
    if (state.mode === "focus") {
      state.cycleCount++;
      stats.pomodoros++;
      stats.focusMinutes += Math.round(state.total / 60);
      saveJSON("focusflow-stats", stats);
      renderStats();
      var next = (state.cycleCount % CYCLE === 0) ? "long" : "short";
      setMode(next);
    } else {
      setMode("focus");
    }
  }

  startPauseBtn.addEventListener("click", function () {
    if (state.running) pause();
    else start();
  });
  resetBtn.addEventListener("click", function () {
    pause();
    state.remaining = state.total;
    startPauseBtn.textContent = "Start";
    updateDisplay();
  });
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });

  /* ---------- Adjustable lengths ---------- */
  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }
  function applyLengths() {
    saveJSON("focusflow-lengths", lengths);
    if (!state.running && state.remaining === state.total) {
      state.total = getLength(state.mode) * 60;
      state.remaining = state.total;
    } else if (!state.running) {
      state.total = getLength(state.mode) * 60;
      if (state.remaining > state.total) state.remaining = state.total;
    }
    updateDisplay();
  }
  document.querySelectorAll(".stepper").forEach(function (stepper) {
    var input = stepper.querySelector("input");
    var key = input.id === "focusLen" ? "focus" : input.id === "shortLen" ? "short" : "long";
    input.value = lengths[key];
    stepper.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = parseInt(input.step, 10) || 1;
        var dir = parseInt(btn.getAttribute("data-dir"), 10);
        input.value = clamp(parseInt(input.value, 10) + dir * step,
          parseInt(input.min, 10), parseInt(input.max, 10));
        lengths[key] = parseInt(input.value, 10);
        applyLengths();
      });
    });
    input.addEventListener("change", function () {
      input.value = clamp(parseInt(input.value, 10) || parseInt(input.min, 10),
        parseInt(input.min, 10), parseInt(input.max, 10));
      lengths[key] = parseInt(input.value, 10);
      applyLengths();
    });
  });

  /* ---------- Stats ---------- */
  var statPomodoros = document.getElementById("statPomodoros");
  var statMinutes = document.getElementById("statMinutes");
  var statTasks = document.getElementById("statTasks");
  function renderStats() {
    statPomodoros.textContent = stats.pomodoros;
    statMinutes.textContent = stats.focusMinutes;
    var done = tasks.filter(function (t) { return t.done; }).length;
    statTasks.textContent = done + "/" + tasks.length;
  }

  /* ---------- Task list ---------- */
  var taskForm = document.getElementById("taskForm");
  var taskInput = document.getElementById("taskInput");
  var taskList = document.getElementById("taskList");
  var tasksEmpty = document.getElementById("tasksEmpty");

  function saveTasks() { saveJSON("focusflow-tasks", tasks); }
  function renderTasks() {
    taskList.innerHTML = "";
    tasks.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");
      var check = document.createElement("button");
      check.className = "task-check";
      check.innerHTML = "&#10003;";
      check.setAttribute("aria-label", task.done ? "Mark as not done" : "Mark as done");
      check.addEventListener("click", function () {
        task.done = !task.done;
        saveTasks(); renderTasks(); renderStats();
      });
      var span = document.createElement("span");
      span.className = "task-text";
      span.textContent = task.text;
      var del = document.createElement("button");
      del.className = "task-del";
      del.innerHTML = "&times;";
      del.setAttribute("aria-label", "Delete task");
      del.addEventListener("click", function () {
        tasks = tasks.filter(function (t) { return t.id !== task.id; });
        saveTasks(); renderTasks(); renderStats();
      });
      li.appendChild(check);
      li.appendChild(span);
      li.appendChild(del);
      taskList.appendChild(li);
    });
    tasksEmpty.style.display = tasks.length ? "none" : "block";
  }
  taskForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = taskInput.value.trim();
    if (!text) return;
    tasks.push({ id: Date.now(), text: text, done: false });
    taskInput.value = "";
    taskInput.focus();
    saveTasks(); renderTasks(); renderStats();
  });

  /* ---------- Init ---------- */
  var dateLabel = document.getElementById("dateLabel");
  if (dateLabel) {
    dateLabel.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }
  setMode("focus");
  renderTasks();
  renderStats();
})();
