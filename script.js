// =====================================================
// NUMBER MISSION - ここを変更すると問題を自由に変更できます
// =====================================================
const questionPool = [
  { number: "47",  answer: "A" },
  { number: "431", answer: "B" },
  { number: "23",  answer: "C" },
  { number: "71",  answer: "D" },
  { number: "283", answer: "E" },
  { number: "7",   answer: "F" },
  { number: "67",  answer: "G" },
  { number: "701", answer: "H" },
  { number: "37",  answer: "I" },
  { number: "31",  answer: "J" },
  { number: "643", answer: "K" },
  { number: "101", answer: "L" },
  { number: "103", answer: "M" },
  { number: "107", answer: "N" },
  { number: "59",  answer: "O" },
  { number: "11",  answer: "P" },
  { number: "43",  answer: "Q" },
  { number: "61",  answer: "R" },
  { number: "97",  answer: "S" },
  { number: "17",  answer: "T" },
  { number: "83",  answer: "U" },
  { number: "337", answer: "V" },
  { number: "29",  answer: "W" },
  { number: "53",  answer: "X" },
  { number: "41",  answer: "Y" },
  { number: "997", answer: "Z" }
];

// 1つのMISSIONに何問出すか
const questionsPerMission = 1;

// 制限時間（秒）
const LIMIT_SECONDS = 150;

// =====================================================

const screens = document.querySelectorAll(".screen");
const stageStart = document.getElementById("stageStart");
const toExample = document.getElementById("toExample");
const exampleAnswer = document.getElementById("exampleAnswer");
const exampleKeyboard = document.getElementById("exampleKeyboard");
const exampleMessage = document.getElementById("exampleMessage");
const gameStart = document.getElementById("gameStart");
const countdownNumber = document.getElementById("countdownNumber");
const missionTitle = document.getElementById("missionTitle");
const timerEl = document.getElementById("timer");
const targetNumber = document.getElementById("targetNumber");
const answer = document.getElementById("answer");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");

let missionIndex = 0;
let questionIndex = 0;
let missions = [];
let timeLeft = LIMIT_SECONDS;
let timerId = null;
let countdownId = null;
let currentQuestion = null;
let acceptingInput = false;
let audioContext = null;
let timerDeadline = null;
let timerPenaltyAnimating = false;
let penaltyAnimationId = null;
let thirtySecondWarningPlayed = false;
let lastCountdownSecondAnnounced = null;

// 効果音（外部の音声ファイル不要・ブラウザだけで再生）

function getAudioContext() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  } catch (e) {
    return null;
  }
}

// 残り30秒：焦りを生む警告音（高めの警告→低めの警告）
function playThirtySecondWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [
      { freq: 880, start: 0.00, duration: 0.18 },
      { freq: 660, start: 0.22, duration: 0.18 },
      { freq: 880, start: 0.44, duration: 0.18 },
      { freq: 660, start: 0.66, duration: 0.28 }
    ].forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    });
  } catch (e) {}
}

// 残り10秒以下：1秒ごとのカウントダウン音
function playFinalCountdownSound(second) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = second <= 3 ? "square" : "triangle";
    const freq = second <= 3 ? 760 : 520;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(second <= 3 ? 0.22 : 0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) {}
}

function updateTimeWarningEffects(remaining) {
  if (remaining <= 30 && !thirtySecondWarningPlayed) {
    thirtySecondWarningPlayed = true;
    playThirtySecondWarningSound();
    timerEl.classList.remove("thirtyWarning");
    void timerEl.offsetWidth;
    timerEl.classList.add("thirtyWarning");
  }

  if (remaining <= 10 && remaining >= 1 && lastCountdownSecondAnnounced !== remaining) {
    lastCountdownSecondAnnounced = remaining;
    playFinalCountdownSound(remaining);
    timerEl.classList.remove("finalCountdown");
    void timerEl.offsetWidth;
    timerEl.classList.add("finalCountdown");
  }
}

function playCorrectSound() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    // 正解：明るい2音の「ピン・ポン」
    [523.25, 783.99].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.11 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.24);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.25);
    });
  } catch (e) {}
}

function playWrongSound() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    // 不正解：低めの「ブッ」という短い音
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.16);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  } catch (e) {}
}

function playClearSound() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.24, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) {}
}

function playFailedSound() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    [220, 165, 110].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch (e) {}
}

function showResult(id) {
  showScreen(id);
  if (id === "clear") {
    playClearSound();
    const screen = document.getElementById("clear");
    screen.classList.remove("resultEnter");
    void screen.offsetWidth;
    screen.classList.add("resultEnter");
  } else if (id === "failed") {
    playFailedSound();
    const screen = document.getElementById("failed");
    screen.classList.remove("resultEnter");
    void screen.offsetWidth;
    screen.classList.add("resultEnter");
  }
}

// 画面切り替え
function showScreen(id) {
  screens.forEach(screen => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// キーボード作成
const rows = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"]
];

rows.forEach(rowLetters => {
  const row = document.createElement("div");
  row.className = "keyRow";

  rowLetters.forEach(letter => {
    const key = document.createElement("button");
    key.className = "key";
    key.textContent = letter;
    key.type = "button";
    key.addEventListener("click", () => typeLetter(letter));
    row.appendChild(key);
  });

  if (rowLetters[0] === "Z") {
    const back = document.createElement("button");
    back.className = "key backspace";
    back.textContent = "⌫";
    back.type = "button";
    back.addEventListener("click", () => {
      answer.value = answer.value.slice(0, -1);
      answer.focus();
    });
    row.appendChild(back);
  }

  keyboard.appendChild(row);
});

// 例題用キーボードも本番と同じ見た目で独立して作成。
// 例題は固定で「1を探せ」→「A」が正解。本番のランダム問題には一切影響しない。
rows.forEach(rowLetters => {
  const row = document.createElement("div");
  row.className = "keyRow";

  rowLetters.forEach(letter => {
    const key = document.createElement("button");
    key.className = "key";
    key.textContent = letter;
    key.type = "button";
    key.addEventListener("click", () => typeExampleLetter(letter));
    row.appendChild(key);
  });

  if (rowLetters[0] === "Z") {
    const back = document.createElement("button");
    back.className = "key backspace";
    back.textContent = "⌫";
    back.type = "button";
    back.addEventListener("click", () => {
      exampleAnswer.value = exampleAnswer.value.slice(0, -1);
      exampleAnswer.focus();
    });
    row.appendChild(back);
  }

  exampleKeyboard.appendChild(row);
});

function typeLetter(letter) {
  if (!acceptingInput) return;
  answer.value = letter;
  checkAnswer();
}

// スタート → ルール
stageStart.addEventListener("click", () => {
  showScreen("rules");
});

// ルール → 例題
toExample.addEventListener("click", () => {
  resetExample();
  showScreen("example");
  setTimeout(() => exampleAnswer.focus(), 50);
});

// クリア条件 → 3,2,1 → MISSION1
gameStart.addEventListener("click", () => {
  startCountdown();
});

function startCountdown() {
  clearInterval(countdownId);
  showScreen("countdown");

  let n = 3;
  countdownNumber.textContent = n;

  countdownId = setInterval(() => {
    n--;

    if (n <= 0) {
      clearInterval(countdownId);
      startGame();
      return;
    }

    countdownNumber.textContent = n;
  }, 1000);
}

// ゲーム開始
function startGame() {
  missionIndex = 0;
  questionIndex = 0;
  timeLeft = LIMIT_SECONDS;
  thirtySecondWarningPlayed = false;
  lastCountdownSecondAnnounced = null;
  timerEl.classList.remove("thirtyWarning", "finalCountdown", "penaltyFlash");

  // A〜Zの26問から、重複なしで8問をランダムに選ぶ。
  const shuffled = [...questionPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  missions = shuffled.slice(0, 8);

  startTimer();
  loadMission();
}

// 150秒タイマー
function startTimer() {
  clearInterval(timerId);
  if (timerDeadline === null || timeLeft === LIMIT_SECONDS) {
    timerDeadline = performance.now() + timeLeft * 1000;
  }

  timerPenaltyAnimating = false;
  updateTimer();

  timerId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((timerDeadline - performance.now()) / 1000));
    timeLeft = Math.min(LIMIT_SECONDS, remaining);

    updateTimeWarningEffects(remaining);

    if (!timerPenaltyAnimating) {
      updateTimer();
    }

    if (remaining <= 0) {
      timeLeft = 0;
      timerPenaltyAnimating = false;
      updateTimer();
      clearInterval(timerId);
      acceptingInput = false;
      showResult("failed");
    }
  }, 50);
}

function updateTimer() {
  timerEl.textContent = timeLeft;
}

// 誤答ペナルティ：実時間を5秒削り、タイマー表示も5段階で減る
function applyWrongTimePenalty() {
  if (timerDeadline === null || timerPenaltyAnimating) return;

  const startDisplay = Math.max(0, Math.ceil((timerDeadline - performance.now()) / 1000));
  const penaltySeconds = Math.min(5, startDisplay);
  const endDisplay = Math.max(0, startDisplay - 5);

  // 実際の終了時刻を先に5秒早める（見た目だけではなく本当に5秒ペナルティ）
  timerDeadline -= 5000;
  timeLeft = endDisplay;
  timerPenaltyAnimating = true;

  // タイマーを赤く光らせ、「-5 SEC」を表示
  timerEl.classList.remove("penaltyFlash");
  void timerEl.offsetWidth;
  timerEl.classList.add("penaltyFlash");

  clearInterval(penaltyAnimationId);
  const startedAt = performance.now();
  penaltyAnimationId = setInterval(() => {
    const elapsed = performance.now() - startedAt;
    const step = Math.min(penaltySeconds, Math.floor(elapsed / 100));
    const displayed = Math.max(endDisplay, startDisplay - step);
    timerEl.textContent = displayed;

    if (step >= penaltySeconds || elapsed >= 550) {
      clearInterval(penaltyAnimationId);
      penaltyAnimationId = null;
      timerPenaltyAnimating = false;
      timeLeft = Math.max(0, Math.ceil((timerDeadline - performance.now()) / 1000));
      updateTimer();

      if (timeLeft <= 0) {
        clearInterval(timerId);
        acceptingInput = false;
        showResult("failed");
      }
    }
  }, 50);
}

// 問題を表示
function loadMission() {
  currentQuestion = missions[missionIndex];

  missionTitle.textContent = `MISSION ${missionIndex + 1}`;
  targetNumber.textContent = currentQuestion.number;
  answer.value = "";

  // 前の問題の正解・不正解演出を完全にリセット
  answer.classList.remove("wrongAnswer", "correctAnswer");
  message.classList.remove("wrongFlash", "correctFlash");
  message.textContent = "";

  acceptingInput = true;

  showScreen("game");
  setTimeout(() => answer.focus(), 50);
}

// 入力チェック
answer.addEventListener("input", () => {
  answer.value = answer.value.replace(/[^a-zA-Z]/g, "").slice(0, 1).toUpperCase();

  if (answer.value) {
    checkAnswer();
  }
});

answer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && answer.value) {
    checkAnswer();
  }
});

function checkAnswer() {
  if (!acceptingInput || !currentQuestion) return;

  const entered = answer.value.toUpperCase();
  if (!entered) return;

  if (entered === currentQuestion.answer.toUpperCase()) {
    // 正解演出：緑色に光って「CORRECT!」を表示
    acceptingInput = false;
    playCorrectSound();
    message.textContent = "CORRECT!";
    message.classList.remove("wrongFlash", "correctFlash");
    void message.offsetWidth;
    message.classList.add("correctFlash");

    answer.classList.remove("wrongAnswer", "correctAnswer");
    void answer.offsetWidth;
    answer.classList.add("correctAnswer");

    setTimeout(() => {
      questionIndex++;

      if (questionIndex >= questionsPerMission) {
        missionIndex++;
        questionIndex = 0;

        if (missionIndex >= 8) {
          clearInterval(timerId);
          showResult("clear");
        } else {
          loadMission();
        }
      } else {
        loadMission();
      }
    }, 650);

  } else {
    // 誤答：既存の赤い演出に加えて、制限時間を5秒減らす。
    acceptingInput = false;
    playWrongSound();
    applyWrongTimePenalty();
    answer.classList.remove("correctAnswer");
    message.classList.remove("correctFlash");
    message.textContent = "WRONG!";
    message.classList.remove("wrongFlash");
    void message.offsetWidth;
    message.classList.add("wrongFlash");

    answer.classList.remove("wrongAnswer");
    void answer.offsetWidth;
    answer.classList.add("wrongAnswer");

    setTimeout(() => {
      answer.value = "";
      answer.classList.remove("wrongAnswer");
      message.textContent = "";
      message.classList.remove("wrongFlash");
      acceptingInput = true;
      answer.focus();
    }, 500);
  }
}

// 例題：固定問題「1を探せ」→「A」。タイマーは存在せず、本番のmissions配列にも触れない。
let exampleAcceptingInput = true;

function resetExample() {
  exampleAcceptingInput = true;
  exampleAnswer.value = "";
  exampleAnswer.classList.remove("wrongAnswer", "correctAnswer");
  exampleMessage.textContent = "";
  exampleMessage.classList.remove("wrongFlash", "correctFlash");
}

function typeExampleLetter(letter) {
  if (!exampleAcceptingInput) return;
  exampleAnswer.value = letter;
  checkExampleAnswer();
}

function checkExampleAnswer() {
  if (!exampleAcceptingInput) return;
  const entered = exampleAnswer.value.toUpperCase();
  if (!entered) return;

  if (entered === "A") {
    exampleAcceptingInput = false;
    playCorrectSound();
    exampleMessage.textContent = "CORRECT!";
    exampleMessage.classList.remove("wrongFlash", "correctFlash");
    void exampleMessage.offsetWidth;
    exampleMessage.classList.add("correctFlash");
    exampleAnswer.classList.remove("wrongAnswer", "correctAnswer");
    void exampleAnswer.offsetWidth;
    exampleAnswer.classList.add("correctAnswer");

    setTimeout(() => {
      showScreen("conditions");
    }, 650);
  } else {
    exampleAcceptingInput = false;
    playWrongSound();
    exampleMessage.textContent = "WRONG!";
    exampleMessage.classList.remove("wrongFlash", "correctFlash");
    void exampleMessage.offsetWidth;
    exampleMessage.classList.add("wrongFlash");
    exampleAnswer.classList.remove("wrongAnswer", "correctAnswer");
    void exampleAnswer.offsetWidth;
    exampleAnswer.classList.add("wrongAnswer");

    setTimeout(() => {
      exampleAnswer.value = "";
      exampleAnswer.classList.remove("wrongAnswer");
      exampleMessage.textContent = "";
      exampleMessage.classList.remove("wrongFlash");
      exampleAcceptingInput = true;
      exampleAnswer.focus();
    }, 500);
  }
}

exampleAnswer.addEventListener("input", () => {
  exampleAnswer.value = exampleAnswer.value.replace(/[^a-zA-Z]/g, "").slice(0, 1).toUpperCase();
  if (exampleAnswer.value) checkExampleAnswer();
});

exampleAnswer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && exampleAnswer.value) checkExampleAnswer();
});

// CLEAR / FAILED から戻る
document.getElementById("retryFromClear").addEventListener("click", resetToStage);
document.getElementById("retryFromFailed").addEventListener("click", resetToStage);

function resetToStage() {
  clearInterval(timerId);
  clearInterval(countdownId);
  clearInterval(penaltyAnimationId);
  penaltyAnimationId = null;
  timerDeadline = null;
  timerPenaltyAnimating = false;
  thirtySecondWarningPlayed = false;
  lastCountdownSecondAnnounced = null;
  timerEl.classList.remove("thirtyWarning", "finalCountdown", "penaltyFlash");
  acceptingInput = false;
  resetExample();
  showScreen("stage");
}

// ブラウザを閉じたり再読み込みした場合もタイマーはリセットされます。
