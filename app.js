let CHAPTERS = [];
let currentChapter = null;
let QUESTIONS = [];
let mode = "all";
let order = [];
let pos = 0;
let selected = null;
let answered = false;
let activeTag = null;

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
  overallProgress: document.getElementById("overallProgress"),
  overallBar: document.getElementById("overallBar"),
  overallAccuracy: document.getElementById("overallAccuracy"),
  streakDays: document.getElementById("streakDays"),
  todayCount: document.getElementById("todayCount"),
  dueReviewCount: document.getElementById("dueReviewCount"),
  startDueReviewBtn: document.getElementById("startDueReviewBtn"),
  progressText: document.getElementById("progressText"),
  chapterBadge: document.getElementById("chapterBadge"),
  qidBadge: document.getElementById("qidBadge"),
  masteryBadge: document.getElementById("masteryBadge"),
  rankS: document.getElementById("rankS"),
  rankA: document.getElementById("rankA"),
  rankB: document.getElementById("rankB"),
  rankC: document.getElementById("rankC"),
  rankD: document.getElementById("rankD"),
  questionText: document.getElementById("questionText"),
  choices: document.getElementById("choices"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  flagBtn: document.getElementById("flagBtn"),
  resultBox: document.getElementById("resultBox"),
  modeAll: document.getElementById("modeAll"),
  modeDue: document.getElementById("modeDue"),
  modeWeak: document.getElementById("modeWeak"),
  modeMasteryD: document.getElementById("modeMasteryD"),
  modeWrong: document.getElementById("modeWrong"),
  modeFlag: document.getElementById("modeFlag"),
  modeRandom: document.getElementById("modeRandom"),
  resetBtn: document.getElementById("resetBtn"),
  jumpBox: document.getElementById("jumpBox"),
  jumpBtn: document.getElementById("jumpBtn"),
  backHome: document.getElementById("backHome"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  tagCloud: document.getElementById("tagCloud"),
  searchResults: document.getElementById("searchResults"),
  modeTag: document.getElementById("modeTag"),
  editorView: document.getElementById("editorView"),
  openEditorBtn: document.getElementById("openEditorBtn"),
  editorBackHome: document.getElementById("editorBackHome"),
  addQuestionBtn: document.getElementById("addQuestionBtn"),
  downloadJsonBtn: document.getElementById("downloadJsonBtn"),
  clearEditorBtn: document.getElementById("clearEditorBtn"),
  editorQuestion: document.getElementById("editorQuestion"),
  editorExplanation: document.getElementById("editorExplanation"),
  editorAnswer: document.getElementById("editorAnswer"),
  editorTags: document.getElementById("editorTags"),
  editorMessage: document.getElementById("editorMessage"),
  editorCountBadge: document.getElementById("editorCountBadge"),
  jsonPreview: document.getElementById("jsonPreview"),
};

function todayString() {
  return new Date().toISOString().slice(0,10);
}

function addDaysString(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function isDue(dateString) {
  if (!dateString) return true;
  return dateString <= todayString();
}

function stateKey(chapterId = null) {
  const id = chapterId || (currentChapter ? currentChapter.id : "home");
  return `stroke_quest_${id}_v4`;
}

function getState(chapterId = null) {
  return JSON.parse(localStorage.getItem(stateKey(chapterId)) || '{"answered":{},"wrongIds":[],"flagIds":[],"studyDates":[],"reviews":{},"mastery":{}}');
}

function setState(state) {
  localStorage.setItem(stateKey(), JSON.stringify(state));
}

let state = getState();

function recordStudyDay() {
  const t = todayString();
  if (!state.studyDates) state.studyDates = [];
  if (!state.studyDates.includes(t)) state.studyDates.push(t);
}

function calcStreak(allDates) {
  const set = new Set(allDates);
  let d = new Date();
  let streak = 0;
  while (true) {
    const s = d.toISOString().slice(0,10);
    if (!set.has(s)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function summarizeState(chapterId) {
  const st = getState(chapterId);
  const records = Object.values(st.answered || {});
  const done = records.length;
  const correct = records.filter(r => r.correct).length;
  const today = todayString();
  const todayAnswered = records.filter(r => (r.at || "").slice(0,10) === today).length;
  const reviews = st.reviews || {};
  const due = Object.values(reviews).filter(r => isDue(r.nextReview)).length;
  return {
    done,
    correct,
    wrong: (st.wrongIds || []).length,
    flag: (st.flagIds || []).length,
    due,
    accuracy: done ? Math.round(correct / done * 100) : null,
    todayAnswered,
    dates: st.studyDates || []
  };
}

async function loadChapters() {
  const res = await fetch("chapters.json", { cache: "no-store" });
  CHAPTERS = await res.json();
  renderHome();
}

function renderDashboard() {
  let totalTarget = 0;
  let totalDone = 0;
  let totalCorrect = 0;
  let todayTotal = 0;
  let dueTotal = 0;
  let allDates = [];

  CHAPTERS.forEach(ch => {
    const target = ch.targetCount || 0;
    const s = summarizeState(ch.id);
    totalTarget += target;
    totalDone += s.done;
    totalCorrect += s.correct;
    todayTotal += s.todayAnswered;
    dueTotal += s.due;
    allDates = allDates.concat(s.dates);
  });

  const progressPct = totalTarget ? Math.min(100, Math.round(totalDone / totalTarget * 100)) : 0;
  const acc = totalDone ? Math.round(totalCorrect / totalDone * 100) + "%" : "-";

  els.overallProgress.textContent = `${totalDone}/${totalTarget}問`;
  els.overallBar.style.width = `${progressPct}%`;
  els.overallAccuracy.textContent = acc;
  els.streakDays.textContent = `${calcStreak(allDates)}日`;
  els.todayCount.textContent = `${todayTotal}問`;
  if (els.dueReviewCount) els.dueReviewCount.textContent = `${dueTotal}問`;
  renderMasteryDashboard();
}

function renderHome() {
  currentChapter = null;
  QUESTIONS = [];
  els.homeView.classList.remove("hidden");
  els.quizView.classList.add("hidden");
  els.editorView.classList.add("hidden");
  els.subtitle.textContent = "学習ダッシュボード";
  els.totalCount.textContent = "-";
  updateStatsForHome();
  renderDashboard();
  loadSearchIndex();
  els.chapterGrid.innerHTML = "";

  CHAPTERS.forEach(ch => {
    const s = summarizeState(ch.id);
    const masteryCounts = summarizeMastery(ch.id);
    const target = ch.targetCount || 300;
    const progressPct = Math.min(100, Math.round(s.done / target * 100));
    const card = document.createElement("div");
    card.className = "chapter-card" + (ch.status !== "available" ? " disabled" : "");
    card.innerHTML = `
      <h3>${ch.title}</h3>
      <p>${ch.description}</p>
      <div class="chapter-progress">
        <div class="chapter-progress-top"><span>${s.done}/${target}問</span><span>${progressPct}%</span></div>
        <div class="progress-bar"><div style="width:${progressPct}%"></div></div>
      </div>
      <div class="chapter-meta">
        <span class="pill ${ch.status === "available" ? "good" : "soon"}">${ch.status === "available" ? "利用可" : "準備中"}</span>
        <span class="pill">正答率 ${s.accuracy === null ? "-" : s.accuracy + "%"}</span>
        <span class="pill">間違い ${s.wrong}</span>
        <span class="pill">要復習 ${s.flag}</span>
        <span class="pill">今日復習 ${s.due}</span>
        <span class="pill">S ${masteryCounts.S}</span>
        <span class="pill">C/D ${masteryCounts.C + masteryCounts.D}</span>
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
  const records = Object.values(state.answered || {});
  const done = records.length;
  const correct = records.filter(r => r.correct).length;
  els.doneCount.textContent = done;
  els.wrongCount.textContent = (state.wrongIds || []).length;
  els.flagCount.textContent = (state.flagIds || []).length;
  els.accuracy.textContent = done ? Math.round(correct / done * 100) + "%" : "-";
}

function setActiveButton() {
  document.querySelectorAll(".toolbar button").forEach(b => b.classList.remove("active"));
  if (mode === "all") els.modeAll.classList.add("active");
  if (mode === "due") els.modeDue.classList.add("active");
  if (mode === "weak") els.modeWeak.classList.add("active");
  if (mode === "masteryD") els.modeMasteryD.classList.add("active");
  if (mode === "wrong") els.modeWrong.classList.add("active");
  if (mode === "flag") els.modeFlag.classList.add("active");
  if (mode === "random") els.modeRandom.classList.add("active");
  if (mode === "tag") els.modeTag.classList.add("active");
}

function setMode(nextMode) {
  mode = nextMode;
  pos = 0;
  selected = null;
  answered = false;

  if (mode === "all") order = QUESTIONS.map((_, i) => i);
  else if (mode === "due") order = QUESTIONS.map((q, i) => ((state.reviews || {})[q.id] && isDue((state.reviews || {})[q.id].nextReview)) ? i : -1).filter(i => i >= 0);
  else if (mode === "weak") order = QUESTIONS.map((q, i) => ["C","D"].includes(masteryRank(q.id)) ? i : -1).filter(i => i >= 0);
  else if (mode === "masteryD") order = QUESTIONS.map((q, i) => masteryRank(q.id) === "D" ? i : -1).filter(i => i >= 0);
  else if (mode === "wrong") order = QUESTIONS.map((q, i) => (state.wrongIds || []).includes(q.id) ? i : -1).filter(i => i >= 0);
  else if (mode === "flag") order = QUESTIONS.map((q, i) => (state.flagIds || []).includes(q.id) ? i : -1).filter(i => i >= 0);
  else if (mode === "tag" && activeTag) order = QUESTIONS.map((q, i) => (q.tags || []).includes(activeTag) ? i : -1).filter(i => i >= 0);
  else order = QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 10);

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
    els.questionText.textContent = mode === "weak" ? "C/D問題は空です。かなり仕上がってる。" : mode === "masteryD" ? "D問題は空です。苦手、消滅。" : mode === "due" ? "今日の復習は空です。えらい。" : mode === "wrong" ? "間違い集は空です。いまのところ優秀。" : mode === "flag" ? "要復習は空です。" : "問題がありません。";
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
  const rank = masteryRank(q.id);
  if (els.masteryBadge) {
    els.masteryBadge.textContent = rank;
    els.masteryBadge.className = "badge mastery-badge rank-" + rank.toLowerCase();
  }
  els.questionText.textContent = q.question + ((q.tags && q.tags.length) ? "\n" : "");
  els.flagBtn.textContent = (state.flagIds || []).includes(q.id) ? "要復習から外す" : "要復習に入れる";
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


function currentReviewRecord(qid) {
  if (!state.reviews) state.reviews = {};
  return state.reviews[qid] || { intervalIndex: 0, nextReview: todayString(), history: [] };
}

function updateReviewSchedule(qid, correct) {
  if (!state.reviews) state.reviews = {};
  const intervals = [0, 3, 7, 30];
  const rec = currentReviewRecord(qid);

  let nextIndex;
  if (correct) {
    nextIndex = Math.min((rec.intervalIndex || 0) + 1, intervals.length - 1);
  } else {
    nextIndex = 0;
  }

  rec.intervalIndex = nextIndex;
  rec.nextReview = addDaysString(intervals[nextIndex]);
  rec.history = rec.history || [];
  rec.history.push({
    at: new Date().toISOString(),
    correct,
    nextReview: rec.nextReview,
    intervalDays: intervals[nextIndex]
  });

  state.reviews[qid] = rec;
  return rec;
}

function reviewPlanText(rec) {
  if (!rec) return "";
  const label = rec.intervalDays === 0 ? "今日もう一度" : `${rec.intervalDays}日後`;
  return `次回復習：${rec.nextReview}（${label}）`;
}


function currentMasteryRecord(qid) {
  if (!state.mastery) state.mastery = {};
  return state.mastery[qid] || {rank:"D", correctStreak:0, totalCorrect:0, totalWrong:0, lastAnswered:null};
}
function rankFromStreak(streak) {
  if (streak >= 5) return "S";
  if (streak >= 3) return "A";
  if (streak >= 2) return "B";
  if (streak >= 1) return "C";
  return "D";
}
function demoteRank(rank) {
  const order = ["D","C","B","A","S"];
  const idx = order.indexOf(rank || "D");
  return order[Math.max(0, idx - 1)];
}
function updateMastery(qid, correct) {
  if (!state.mastery) state.mastery = {};
  const rec = currentMasteryRecord(qid);
  if (correct) {
    rec.correctStreak = (rec.correctStreak || 0) + 1;
    rec.totalCorrect = (rec.totalCorrect || 0) + 1;
    rec.rank = rankFromStreak(rec.correctStreak);
  } else {
    rec.correctStreak = 0;
    rec.totalWrong = (rec.totalWrong || 0) + 1;
    rec.rank = demoteRank(rec.rank || "D");
  }
  rec.lastAnswered = new Date().toISOString();
  state.mastery[qid] = rec;
  return rec;
}
function masteryRank(qid) {
  return currentMasteryRecord(qid).rank || "D";
}
function masteryText(rec) {
  const labels = {S:"完全習得", A:"安定", B:"概ね理解", C:"要復習", D:"苦手"};
  return `習熟度：${rec.rank}（${labels[rec.rank]}）｜連続正解 ${rec.correctStreak || 0}｜正解 ${rec.totalCorrect || 0} / 誤答 ${rec.totalWrong || 0}`;
}
function summarizeMastery(chapterId) {
  const st = getState(chapterId);
  const counts = {S:0,A:0,B:0,C:0,D:0};
  Object.values(st.mastery || {}).forEach(rec => {
    const r = rec.rank || "D";
    if (counts[r] !== undefined) counts[r]++;
  });
  return counts;
}
function renderMasteryDashboard() {
  const total = {S:0,A:0,B:0,C:0,D:0};
  CHAPTERS.forEach(ch => {
    const c = summarizeMastery(ch.id);
    Object.keys(total).forEach(k => total[k] += c[k]);
  });
  if (els.rankS) els.rankS.textContent = total.S;
  if (els.rankA) els.rankA.textContent = total.A;
  if (els.rankB) els.rankB.textContent = total.B;
  if (els.rankC) els.rankC.textContent = total.C;
  if (els.rankD) els.rankD.textContent = total.D;
}

function submit() {
  if (selected === null || answered) return;
  const q = QUESTIONS[order[pos]];
  answered = true;
  const correct = selected === q.answer;

  if (!state.studyDates) state.studyDates = [];
  recordStudyDay();

  state.answered[q.id] = { correct, selected, at: new Date().toISOString() };
  const reviewRecord = updateReviewSchedule(q.id, correct);
  const masteryRecord = updateMastery(q.id, correct);
  if (!correct && !(state.wrongIds || []).includes(q.id)) state.wrongIds.push(q.id);
  if (correct) state.wrongIds = (state.wrongIds || []).filter(id => id !== q.id);
  save();

  els.resultBox.className = "result " + (correct ? "right" : "wrong");
  els.resultBox.innerHTML = `
    <strong>${correct ? "正解！" : "不正解"}</strong><br>
    あなたの回答：${String.fromCharCode(65 + selected)}. ${q.choices[selected]}<br>
    正解：${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}<br>
    <hr>
    <strong>解説</strong><br>${q.explanation}
    <div class="review-plan">${reviewPlanText(reviewRecord)}</div>
    <div class="mastery-detail">${masteryText(masteryRecord)}</div>
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
  if (!state.flagIds) state.flagIds = [];
  if (state.flagIds.includes(q.id)) state.flagIds = state.flagIds.filter(id => id !== q.id);
  else state.flagIds.push(q.id);
  save();
  render();
}


let searchIndex = [];

async function loadSearchIndex() {
  try {
    const ch = CHAPTERS.find(c => c.id === "chapter1");
    if (!ch) return;
    const res = await fetch(ch.file, { cache: "no-store" });
    const qs = await res.json();
    searchIndex = qs.map((q, i) => ({...q, chapterId: ch.id, chapterTitle: ch.title, index: i}));
    renderTagCloud();
  } catch (e) {
    // 検索は補助機能なので失敗しても本体は止めない
  }
}

function allTags() {
  const counts = {};
  searchIndex.forEach(q => (q.tags || []).forEach(t => counts[t] = (counts[t] || 0) + 1));
  return Object.entries(counts).sort((a,b) => b[1] - a[1]);
}

function renderTagCloud() {
  if (!els.tagCloud) return;
  const tags = allTags();
  els.tagCloud.innerHTML = tags.map(([tag, count]) =>
    `<button class="tag-button ${activeTag === tag ? "active-tag" : ""}" data-tag="${tag}">#${tag} ${count}</button>`
  ).join("");
  els.tagCloud.querySelectorAll(".tag-button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTag = btn.dataset.tag;
      renderTagCloud();
      renderSearchResults(searchIndex.filter(q => (q.tags || []).includes(activeTag)), `#${activeTag}`);
    });
  });
}

function searchTextOf(q) {
  return [
    q.id,
    q.question,
    ...(q.choices || []),
    q.explanation,
    ...(q.tags || [])
  ].join(" ").toLowerCase();
}

function doSearch() {
  const query = (els.searchInput.value || "").trim().toLowerCase();
  activeTag = null;
  renderTagCloud();
  if (!query) {
    els.searchResults.innerHTML = "";
    return;
  }
  const results = searchIndex.filter(q => searchTextOf(q).includes(query));
  renderSearchResults(results, query);
}

function renderSearchResults(results, label) {
  if (!els.searchResults) return;
  if (!results.length) {
    els.searchResults.innerHTML = `<div class="search-result"><h3>該当なし</h3><p>${label} に一致する問題はありません。</p></div>`;
    return;
  }
  const tagDrillButton = activeTag ? `<div class="search-result tag-start"><h3>#${activeTag} を周回</h3><p>ここをクリックすると、このタグだけの問題を順番に解きます。</p></div>` : "";
  els.searchResults.innerHTML = tagDrillButton + results.map(q => `
    <div class="search-result" data-index="${q.index}" data-chapter="${q.chapterId}">
      <h3>${q.id.replace("ch1-", "No.")}　${q.question}</h3>
      <p>${q.explanation.slice(0, 90)}${q.explanation.length > 90 ? "..." : ""}</p>
      <div class="question-tags">${(q.tags || []).map(t => `<span class="qtag">#${t}</span>`).join("")}</div>
    </div>
  `).join("");
  const starter = els.searchResults.querySelector(".tag-start");
  if (starter) starter.addEventListener("click", startTagDrill);
  els.searchResults.querySelectorAll(".search-result[data-index]").forEach(card => {
    card.addEventListener("click", async () => {
      const chapter = CHAPTERS.find(c => c.id === card.dataset.chapter);
      await openChapter(chapter);
      mode = "all";
      order = QUESTIONS.map((_, i) => i);
      pos = Number(card.dataset.index);
      activeTag = null;
      els.modeTag.classList.add("hidden");
      setActiveButton();
      render();
    });
  });
}

async function startTagDrill() {
  if (!activeTag) return;
  const chapter = CHAPTERS.find(c => c.id === "chapter1");
  await openChapter(chapter);
  mode = "tag";
  els.modeTag.textContent = `#${activeTag}`;
  els.modeTag.classList.remove("hidden");
  order = QUESTIONS.map((q, i) => (q.tags || []).includes(activeTag) ? i : -1).filter(i => i >= 0);
  pos = 0;
  setActiveButton();
  render();
}


els.submitBtn.addEventListener("click", submit);
els.nextBtn.addEventListener("click", next);
els.flagBtn.addEventListener("click", toggleFlag);
els.modeAll.addEventListener("click", () => setMode("all"));
els.modeDue.addEventListener("click", () => setMode("due"));
els.modeWeak.addEventListener("click", () => setMode("weak"));
els.modeMasteryD.addEventListener("click", () => setMode("masteryD"));
els.modeWrong.addEventListener("click", () => setMode("wrong"));
els.modeFlag.addEventListener("click", () => setMode("flag"));
els.modeRandom.addEventListener("click", () => setMode("random"));
els.modeTag.addEventListener("click", () => setMode("tag"));
els.backHome.addEventListener("click", renderHome);
els.startDueReviewBtn.addEventListener("click", async () => {
  const chapter = CHAPTERS.find(c => c.id === "chapter1");
  await openChapter(chapter);
  setMode("due");
});
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
  state = {"answered":{},"wrongIds":[],"flagIds":[],"studyDates":[],"reviews":{},"mastery":{}};
  save();
  setMode(mode);
});


let editableQuestions = [];

async function openEditor() {
  currentChapter = CHAPTERS.find(ch => ch.id === "chapter1");
  els.homeView.classList.add("hidden");
  els.quizView.classList.add("hidden");
  els.editorView.classList.remove("hidden");
  els.subtitle.textContent = "問題追加エディタ";

  const res = await fetch("questions/chapter1.json", { cache: "no-store" });
  editableQuestions = await res.json();
  updateEditorPreview();
}

function nextQuestionId() {
  const nums = editableQuestions
    .map(q => Number(String(q.id || "").replace("ch1-", "")))
    .filter(n => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return "ch1-" + String(next).padStart(3, "0");
}

function getEditorChoices() {
  return [0,1,2,3,4].map(i => document.getElementById("choice" + i).value.trim());
}

function showEditorMessage(text, ok=true) {
  els.editorMessage.className = "result " + (ok ? "right" : "wrong");
  els.editorMessage.textContent = text;
}

function clearEditor() {
  els.editorQuestion.value = "";
  els.editorExplanation.value = "";
  els.editorAnswer.value = "0";
  [0,1,2,3,4].forEach(i => document.getElementById("choice" + i).value = "");
  if (els.editorTags) els.editorTags.value = "";
  els.editorMessage.className = "result hidden";
  updateEditorPreview();
}

function addQuestionFromEditor() {
  const question = els.editorQuestion.value.trim();
  const choices = getEditorChoices();
  const answer = Number(els.editorAnswer.value);
  const explanation = els.editorExplanation.value.trim();
  const tags = (els.editorTags.value || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  if (!question) return showEditorMessage("問題文が空です。", false);
  if (choices.some(c => !c)) return showEditorMessage("A〜Eの選択肢をすべて入力してください。", false);
  if (!explanation) return showEditorMessage("解説が空です。", false);

  const newQuestion = {
    id: nextQuestionId(),
    chapter: "第1章 脳の解剖と機能",
    question,
    choices,
    answer,
    explanation,
    tags: ["第1章", ...tags]
  };

  editableQuestions.push(newQuestion);
  showEditorMessage(`${newQuestion.id} を追加しました。最後に chapter1.json をダウンロードしてください。`, true);
  clearEditor();
  updateEditorPreview();
}

function updateEditorPreview() {
  if (!editableQuestions.length) {
    els.editorCountBadge.textContent = "現在 - 問";
    els.jsonPreview.textContent = "読み込み中...";
    return;
  }
  els.editorCountBadge.textContent = `現在 ${editableQuestions.length} 問`;
  const latest = editableQuestions.slice(-3);
  els.jsonPreview.textContent = JSON.stringify(latest, null, 2);
}

function downloadChapterJson() {
  const blob = new Blob([JSON.stringify(editableQuestions, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chapter1.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


els.searchBtn.addEventListener("click", doSearch);
els.searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
els.clearSearchBtn.addEventListener("click", () => {
  els.searchInput.value = "";
  activeTag = null;
  renderTagCloud();
  els.searchResults.innerHTML = "";
});
els.searchResults.addEventListener("dblclick", startTagDrill);

els.openEditorBtn.addEventListener("click", openEditor);
els.editorBackHome.addEventListener("click", renderHome);
els.addQuestionBtn.addEventListener("click", addQuestionFromEditor);
els.downloadJsonBtn.addEventListener("click", downloadChapterJson);
els.clearEditorBtn.addEventListener("click", clearEditor);

loadChapters().catch(e => {
  els.chapterGrid.innerHTML = `<div class="chapter-card disabled"><h3>読み込み失敗</h3><p>${e.message}</p></div>`;
});
