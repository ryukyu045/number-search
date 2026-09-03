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
const LIMIT_SECONDS = 90;

// =====================================================

const screens = document.querySelectorAll(".screen");
const stageStart = document.getElementById("stageStart");
const toConditions = document.getElementById("toConditions");
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

// 効果音（外部の音声ファイル不要・ブラウザだけで再生）
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

function typeLetter(letter) {
  if (!acceptingInput) return;
  answer.value = letter;
  checkAnswer();
}

// スタート → ルール
stageStart.addEventListener("click", () => {
  showScreen("rules");
});

// ルール → クリア条件
toConditions.addEventListener("click", () => {
  showScreen("conditions");
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

  // A〜Zの26問から、重複なしで5問をランダムに選ぶ。
  const shuffled = [...questionPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  missions = shuffled.slice(0, 5);

  startTimer();
  loadMission();
}

// 120秒タイマー
function startTimer() {
  clearInterval(timerId);
  updateTimer();

  timerId = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimer();
      clearInterval(timerId);
      acceptingInput = false;
      showScreen("failed");
      return;
    }

    updateTimer();
  }, 1000);
}

function updateTimer() {
  timerEl.textContent = timeLeft;
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

        if (missionIndex >= 5) {
          clearInterval(timerId);
          showScreen("clear");
        } else {
          loadMission();
        }
      } else {
        loadMission();
      }
    }, 650);

  } else {
    // 誤答はペナルティなし。
    // 入力した文字を一度表示してから、赤い演出で間違いを知らせる。
    acceptingInput = false;
    playWrongSound();
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

// CLEAR / FAILED から戻る
document.getElementById("retryFromClear").addEventListener("click", resetToStage);
document.getElementById("retryFromFailed").addEventListener("click", resetToStage);

function resetToStage() {
  clearInterval(timerId);
  clearInterval(countdownId);
  acceptingInput = false;
  showScreen("stage");
}

// ブラウザを閉じたり再読み込みした場合もタイマーはリセットされます。
