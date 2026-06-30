let CHAPTERS = [];
let currentChapter = null;
let QUESTIONS = [];
let mode = "all";
let order = [];
let pos = 0;
let selected = null;
let answered = false;

const els = {
  subtitle: document.getElementById("subtitle"),
  homeView: document.getElementById("homeView"),
  quizView: document.getElementById("quizView"),
  chapterGrid: document.getElementById("chapterGrid"),
  totalCount: document.getElementById("totalCount"),
  doneCount: document.getElementById("doneCount"),
  wrongCount: document.getElementById("wrongCount"),
  flagCount: document.getElementById("flagCount"),
  accuracy: document.getElementById("accuracy"),
  progressText: document.getElementById("progressText"),
  chapterBadge: document.getElementById("chapterBadge"),
  qidBadge: document.getElementById("qidBadge"),
  questionText: document.getElementById("questionText"),
  choices: document.getElementById("choices"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  flagBtn: document.getElementById("flagBtn"),
  resultBox: document.getElementById("resultBox"),
  modeAll: document.getElementById("modeAll"),
  modeWrong: document.getElementById("modeWrong"),
  modeFlag: document.getElementById("modeFlag"),
  modeRandom: document.getElementById("modeRandom"),
  resetBtn: document.getElementById("resetBtn"),
  jumpBox: document.getElementById("jumpBox"),
  jumpBtn: document.getElementById("jumpBtn"),
  backHome: document.getElementById("backHome"),
};

function stateKey() {
  return currentChapter ? `stroke_quest_${currentChapter.id}_v3` : "stroke_quest_home_v3";
}

function getState(chapterId = null) {
  const key = chapterId ? `stroke_quest_${chapterId}_v3` : stateKey();
  return JSON.parse(localStorage.getItem(key) || '{"answered":{},"wrongIds":[],"flagIds":[]}');
}

function setState(state) {
  localStorage.setItem(stateKey(), JSON.stringify(state));
}

let state = getState();

async function loadChapters() {
  const res = await fetch("chapters.json", { cache: "no-store" });
  CHAPTERS = await res.json();
  renderHome();
}

function renderHome() {
  currentChapter = null;
  QUESTIONS = [];
  els.homeView.classList.remove("hidden");
  els.quizView.classList.add("hidden");
  els.subtitle.textContent = "章を選んで学習開始";
  els.totalCount.textContent = "-";
  updateStatsForHome();
  els.chapterGrid.innerHTML = "";

  CHAPTERS.forEach(ch => {
    const st = getState(ch.id);
    const done = Object.keys(st.answered).length;
    const wrong = st.wrongIds.length;
    const flag = st.flagIds.length;
    const card = document.createElement("div");
    card.className = "chapter-card" + (ch.status !== "available" ? " disabled" : "");
    card.innerHTML = `
      <h3>${ch.title}</h3>
      <p>${ch.description}</p>
      <div class="chapter-meta">
        <span class="pill ${ch.status === "available" ? "good" : "soon"}">${ch.status === "available" ? "利用可" : "準備中"}</span>
        <span class="pill">回答済 ${done}</span>
        <span class="pill">間違い ${wrong}</span>
        <span class="pill">要復習 ${flag}</span>
      </div>
    `;
    if (ch.status === "available") {
      card.addEventListener("click", () => openChapter(ch));
    }
    els.chapterGrid.appendChild(card);
  });
}

function updateStatsForHome() {
  els.doneCount.textContent = "0";
  els.wrongCount.textContent = "0";
  els.flagCount.textContent = "0";
  els.accuracy.textContent = "-";
}

async function openChapter(chapter) {
  currentChapter = chapter;
  state = getState(chapter.id);
  els.subtitle.textContent = chapter.title;
  els.homeView.classList.add("hidden");
  els.quizView.classList.remove("hidden");
  els.chapterBadge.textContent = chapter.title.replace("　", " ");
  els.questionText.textContent = "読み込み中...";
  els.choices.innerHTML = "";

  const res = await fetch(chapter.file, { cache: "no-store" });
  QUESTIONS = await res.json();
  order = QUESTIONS.map((_, i) => i);
  pos = 0;
  mode = "all";
  els.totalCount.textContent = QUESTIONS.length;
  els.jumpBox.max = QUESTIONS.length;
  setActiveButton();
  render();
}

function save() {
  setState(state);
  updateStats();
}

function updateStats() {
  const records = Object.values(state.answered);
  const done = records.length;
  const correct = records.filter(r => r.correct).length;
  els.doneCount.textContent = done;
  els.wrongCount.textContent = state.wrongIds.length;
  els.flagCount.textContent = state.flagIds.length;
  els.accuracy.textContent = done ? Math.round(correct / done * 100) + "%" : "-";
}

function setActiveButton() {
  document.querySelectorAll(".toolbar button").forEach(b => b.classList.remove("active"));
  if (mode === "all") els.modeAll.classList.add("active");
  if (mode === "wrong") els.modeWrong.classList.add("active");
  if (mode === "flag") els.modeFlag.classList.add("active");
  if (mode === "random") els.modeRandom.classList.add("active");
}

function setMode(nextMode) {
  mode = nextMode;
  pos = 0;
  selected = null;
  answered = false;

  if (mode === "all") {
    order = QUESTIONS.map((_, i) => i);
  } else if (mode === "wrong") {
    order = QUESTIONS.map((q, i) => state.wrongIds.includes(q.id) ? i : -1).filter(i => i >= 0);
  } else if (mode === "flag") {
    order = QUESTIONS.map((q, i) => state.flagIds.includes(q.id) ? i : -1).filter(i => i >= 0);
  } else {
    order = QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 10);
  }

  setActiveButton();
  render();
}

function render() {
  updateStats();
  els.resultBox.className = "result hidden";
  els.resultBox.innerHTML = "";
  els.nextBtn.disabled = true;
  els.submitBtn.disabled = false;
  selected = null;
  answered = false;

  if (!QUESTIONS.length) return;

  if (order.length === 0) {
    els.progressText.textContent = "";
    els.qidBadge.textContent = "";
    els.questionText.textContent = mode === "wrong" ? "間違い集は空です。いまのところ優秀。" : mode === "flag" ? "要復習は空です。" : "問題がありません。";
    els.choices.innerHTML = "";
    els.submitBtn.disabled = true;
    return;
  }

  if (pos >= order.length) {
    els.progressText.textContent = "";
    els.qidBadge.textContent = "";
    els.questionText.textContent = "このセットは終了です。";
    els.choices.innerHTML = '<p class="subtitle">別モードを押すと再開できます。</p>';
    els.submitBtn.disabled = true;
    return;
  }

  const q = QUESTIONS[order[pos]];
  els.progressText.textContent = `${pos + 1} / ${order.length}`;
  els.qidBadge.textContent = q.id.replace("ch1-", "No.");
  els.questionText.textContent = q.question;
  els.flagBtn.textContent = state.flagIds.includes(q.id) ? "要復習から外す" : "要復習に入れる";
  els.choices.innerHTML = "";

  q.choices.forEach((choice, idx) => {
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `<input type="radio" name="choice" value="${idx}"><strong>${String.fromCharCode(65+idx)}.</strong><span>${choice}</span>`;
    label.addEventListener("click", () => {
      if (answered) return;
      selected = idx;
      document.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
      label.classList.add("selected");
      label.querySelector("input").checked = true;
    });
    els.choices.appendChild(label);
  });
}

function submit() {
  if (selected === null || answered) return;
  const q = QUESTIONS[order[pos]];
  answered = true;
  const correct = selected === q.answer;

  state.answered[q.id] = { correct, selected, at: new Date().toISOString() };
  if (!correct && !state.wrongIds.includes(q.id)) state.wrongIds.push(q.id);
  if (correct) state.wrongIds = state.wrongIds.filter(id => id !== q.id);
  save();

  els.resultBox.className = "result " + (correct ? "right" : "wrong");
  els.resultBox.innerHTML = `
    <strong>${correct ? "正解！" : "不正解"}</strong><br>
    あなたの回答：${String.fromCharCode(65 + selected)}. ${q.choices[selected]}<br>
    正解：${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}<br>
    <hr>
    <strong>解説</strong><br>${q.explanation}
  `;
  els.submitBtn.disabled = true;
  els.nextBtn.disabled = false;
}

function next() {
  pos++;
  render();
}

function toggleFlag() {
  if (order.length === 0 || pos >= order.length) return;
  const q = QUESTIONS[order[pos]];
  if (state.flagIds.includes(q.id)) {
    state.flagIds = state.flagIds.filter(id => id !== q.id);
  } else {
    state.flagIds.push(q.id);
  }
  save();
  render();
}

els.submitBtn.addEventListener("click", submit);
els.nextBtn.addEventListener("click", next);
els.flagBtn.addEventListener("click", toggleFlag);
els.modeAll.addEventListener("click", () => setMode("all"));
els.modeWrong.addEventListener("click", () => setMode("wrong"));
els.modeFlag.addEventListener("click", () => setMode("flag"));
els.modeRandom.addEventListener("click", () => setMode("random"));
els.backHome.addEventListener("click", renderHome);
els.jumpBtn.addEventListener("click", () => {
  const n = Number(els.jumpBox.value);
  if (!n || n < 1 || n > QUESTIONS.length) return;
  mode = "all";
  order = QUESTIONS.map((_, i) => i);
  pos = n - 1;
  setActiveButton();
  render();
});
els.resetBtn.addEventListener("click", () => {
  if (!confirm("この章の回答記録・間違い集・要復習をリセットしますか？")) return;
  state = {"answered":{},"wrongIds":[],"flagIds":[]};
  save();
  setMode(mode);
});

loadChapters().catch(e => {
  els.chapterGrid.innerHTML = `<div class="chapter-card disabled"><h3>読み込み失敗</h3><p>${e.message}</p></div>`;
});
