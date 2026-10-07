/* ÖDEVIO v2 – mevcut index.html'e dokunmadan çalışır.
   Eklenenler: hamburger menü, genişletilmiş ödev formu, filtre+sıralama, durumlar,
   Yanlış Defteri, Genel/Mini deneme takibi, son 5 genel deneme analizi, istatistikler. */
(function () {
const $ = id => document.getElementById(id);
const WK = "odevio_wrongs_v1", TK = "odevio_trials_v1";
const ld = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
let wrongs = ld(WK), trials = ld(TK);
const sv = () => { localStorage.setItem(WK, JSON.stringify(wrongs)); localStorage.setItem(TK, JSON.stringify(trials)); saveTasks(); };
const fmt = n => (Math.round(n * 100) / 100).toLocaleString("tr-TR");
const todayStr = () => new Date().toISOString().split("T")[0];
const DIFF = { kolay: "🟢 Kolay", orta: "🟡 Orta", zor: "🔴 Zor" };
const REASONS = ["Bilgi eksikliği", "Dikkat hatası", "Çeldiriciye düştüm", "İşlem hatası", "Soruyu anlayamadım", "Süre problemi", "Kavram yanılgısı", "Diğer"];
const LESSONS = ["Türkçe", "Matematik", "Fen Bilimleri", "İnkılap", "İngilizce", "Din Kültürü"];
const V2 = window.V2 = {};
let view = "tasks", F = { subject: "", diff: "", status: "", sort: "date" }, WF = "all";

/* ---------- CSS ---------- */
const st = document.createElement("style");
st.textContent = `
.v2-drawer-bg{position:fixed;inset:0;background:rgba(19,27,24,.4);opacity:0;visibility:hidden;transition:.2s;z-index:400}
.v2-drawer-bg.open{opacity:1;visibility:visible}
.v2-drawer{position:fixed;top:0;bottom:0;left:0;width:270px;background:var(--surface);padding:24px 14px;transform:translateX(-100%);transition:.25s;z-index:450;box-shadow:var(--shadow)}
.v2-drawer.open{transform:none}
.v2-drawer h3{font-family:Manrope,sans-serif;font-size:22px;margin:0 10px 18px}
.v2-item{display:block;width:100%;text-align:left;padding:14px;border:0;border-radius:13px;background:transparent;color:var(--text);font-weight:700;font-size:14px}
.v2-item:hover{background:var(--primary-soft)}
.v2-bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.v2-sel{width:auto;flex:1;min-width:120px;padding:10px}
.v2-card{background:var(--primary-soft);border:1px solid var(--border);border-radius:16px;padding:15px;margin-bottom:11px}
.v2-card.done{opacity:.6}
.v2-t{font-weight:800;font-size:15px;margin-bottom:5px}
.v2-m{color:var(--muted);font-size:12px;line-height:1.6}
.v2-note{margin-top:7px;padding:8px 10px;background:var(--surface);border-radius:10px;font-size:12px}
.v2-badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:var(--surface);color:var(--primary-dark)}
.v2-badge.late{color:var(--danger)}
.v2-acts{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
.v2-btn{padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);font-size:12px;font-weight:700;color:var(--text)}
.v2-btn.main{background:var(--primary);color:#fff;border-color:var(--primary)}
.v2-btn.red{color:var(--danger)}
.v2-chip{padding:9px 14px;border:1px solid var(--border);border-radius:20px;background:var(--surface);font-size:12px;font-weight:700}
.v2-chip.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.v2-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.v2-box{background:var(--primary-soft);border-radius:16px;padding:14px}
.v2-box b{display:block;font-family:Manrope,sans-serif;font-size:24px;color:var(--primary-dark)}
.v2-box span{font-size:12px;color:var(--muted)}
.v2-h{font-family:Manrope,sans-serif;font-size:17px;font-weight:800;margin:20px 0 10px}
.v2-err{color:var(--danger);font-size:12px;margin-top:8px;min-height:16px}
.v2-table{width:100%;border-collapse:collapse;font-size:13px}
.v2-table th,.v2-table td{padding:9px 6px;border-bottom:1px solid var(--border);text-align:center}
.v2-table th:first-child,.v2-table td:first-child{text-align:left}
.v2-scroll{overflow-x:auto}
.v2-trow{display:grid;grid-template-columns:1.6fr repeat(3,1fr) .9fr;gap:6px;align-items:center;margin-bottom:7px}
.v2-trow input{padding:9px 6px;text-align:center}
.v2-empty{text-align:center;color:var(--muted);padding:40px 10px;font-size:13px}
.v2-coach{padding:10px 12px;background:var(--surface);border-left:3px solid var(--primary);border-radius:8px;font-size:13px;margin-top:8px}
`;
document.head.appendChild(st);

/* ---------- DOM: menü, sayfa, modal, form alanları ---------- */
const burger = document.createElement("button");
burger.className = "theme-button"; burger.textContent = "☰"; burger.style.fontSize = "22px";
burger.onclick = () => { $("v2Drawer").classList.add("open"); $("v2DrawerBg").classList.add("open"); };
document.querySelector(".header-actions").prepend(burger);

document.body.insertAdjacentHTML("beforeend", `
<div class="v2-drawer-bg" id="v2DrawerBg" onclick="V2.closeDrawer()"></div>
<div class="v2-drawer" id="v2Drawer"><h3>ödev<span style="color:var(--primary)">io</span></h3>
 <button class="v2-item" onclick="V2.go('home')">🏠 Ana sayfa</button>
 <button class="v2-item" onclick="V2.go('tasks')">📚 Ödevler</button>
 <button class="v2-item" onclick="V2.go('wrongs')">📕 Yanlış Defteri</button>
 <button class="v2-item" onclick="V2.go('trials')">📝 Deneme Takibi</button>
 <button class="v2-item" onclick="V2.go('stats')">📊 İstatistikler</button>
 <button class="v2-item" onclick="V2.go('plan')">📅 Haftalık Plan</button>
</div>
<div class="modal-background" id="v2Modal" onclick="if(event.target===this)V2.closeModal()"><div class="modal" id="v2Box"></div></div>`);

document.querySelector(".app").insertAdjacentHTML("beforeend", `
<main id="v2Page" class="subject-page"><div class="weekly-container">
 <div class="weekly-header"><button class="weekly-back" onclick="goHome()" aria-label="Geri">←</button>
 <div class="weekly-title"><h2 id="v2Title"></h2><p id="v2Sub"></p></div></div>
 <div id="v2Body"></div></div></main>`);

$("taskDate").closest(".form-group").querySelector("label").textContent = "Son teslim tarihi";
$("taskDate").closest(".form-group").insertAdjacentHTML("beforebegin", `
<div class="form-group"><label class="form-label">Konu</label><input class="form-input" id="taskTopic" placeholder="Örn. Kareköklü ifadeler" maxlength="80"></div>
<div class="form-group"><label class="form-label">Veriliş tarihi</label><input class="form-input" id="taskGiven" type="date"></div>`);
document.querySelector("#modal .form-row").insertAdjacentHTML("afterend", `
<div class="form-group"><label class="form-label">Zorluk</label><select class="form-select" id="taskDiff"><option value="kolay">🟢 Kolay</option><option value="orta" selected>🟡 Orta</option><option value="zor">🔴 Zor</option></select></div>
<div class="form-group"><label class="form-label">Öğretmen</label><input class="form-input" id="taskTeacher" maxlength="60"></div>
<div class="form-group"><label class="form-label">Öğretmen notu</label><input class="form-input" id="taskNote" maxlength="200" placeholder="Örn. Fotokopiyi bütün hafta getirin"></div>`);

/* ---------- yardımcılar ---------- */
const status = t => t.completed ? "Tamamlandı" : getDaysLeft(t.date) < 0 ? "Gecikti" : t.inProgress ? "Devam ediyor" : "Bekliyor";
const E = escapeHTML;
const active = () => $("v2Page").classList.contains("active");
function refreshAll() {
  sv(); updateStats(); renderSubjects();
  if (currentSubject) renderNotebookTasks();
  if ($("weeklyPage").classList.contains("active")) renderWeeklyPlan();
  if (active()) render();
}
V2.closeDrawer = () => { $("v2Drawer").classList.remove("open"); $("v2DrawerBg").classList.remove("open"); };
V2.closeModal = () => $("v2Modal").classList.remove("open");
const openBox = html => { $("v2Box").innerHTML = html; $("v2Modal").classList.add("open"); };
document.addEventListener("keydown", e => { if (e.key === "Escape") V2.closeModal(); });

V2.go = v => {
  V2.closeDrawer();
  if (v === "home") { goHome(); return; }
  if (v === "plan") { $("v2Page").classList.remove("active"); openWeeklyPlan(); return; }
  view = v; currentSubject = null;
  $("homePage").style.display = "none";
  $("subjectPage").classList.remove("active");
  $("weeklyPage").classList.remove("active");
  $("v2Page").classList.add("active");
  render(); window.scrollTo(0, 0);
};
const _gh = goHome;
window.goHome = function () { $("v2Page").classList.remove("active"); _gh(); };

/* ---------- ödev ekleme (genişletilmiş) ---------- */
const _om = openModal;
window.openModal = function () { _om(); $("taskGiven").value = todayStr(); };
window.closeModal = function () {
  $("modal").classList.remove("open");
  $("taskTitle").value = ""; $("taskTopic").value = ""; $("taskTeacher").value = ""; $("taskNote").value = "";
  $("taskDiff").value = "orta"; $("taskQuestions").value = 10; $("taskMinutes").value = 30;
};
window.addTask = function () {
  const title = $("taskTitle").value.trim(), date = $("taskDate").value, subject = $("taskSubject").value;
  if (!title) { $("taskTitle").focus(); return; }
  if (!date) { alert("Lütfen son teslim tarihini seç."); return; }
  tasks.push({
    id: Date.now(), title, subject, date,
    topic: $("taskTopic").value.trim(), given: $("taskGiven").value || todayStr(),
    diff: $("taskDiff").value, teacher: $("taskTeacher").value.trim(), note: $("taskNote").value.trim(),
    questions: Math.max(0, parseInt($("taskQuestions").value) || 0),
    minutes: Math.max(0, parseInt($("taskMinutes").value) || 0),
    completed: false, inProgress: false, createdAt: Date.now()
  });
  closeModal(); refreshAll();
};
window.deleteTask = function (id) {
  tasks = tasks.filter(t => t.id !== id);
  wrongs = wrongs.filter(w => w.taskId !== id);
  weekDays.forEach(d => { weeklyPlan[d] = (weeklyPlan[d] || []).filter(x => Number(x) !== Number(id)); });
  saveWeeklyPlan(); refreshAll();
};

/* ---------- tamamlama: doğru/yanlış/boş + yanlış analizi ---------- */
window.toggleTask = function (id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  if (t.completed) { t.completed = false; delete t.result; delete t.completedAt; wrongs = wrongs.filter(w => w.taskId !== id); refreshAll(); return; }
  if (!(t.questions > 0)) { t.completed = true; t.completedAt = Date.now(); refreshAll(); return; }
  openBox(`<div class="modal-header"><div class="modal-title">Sonuçların</div><button class="close-button" onclick="V2.closeModal()">×</button></div>
  <p class="v2-m" style="margin-bottom:14px">${E(t.title)} · ${t.questions} soru</p>
  <div class="form-row">
   <div class="form-group"><label class="form-label">✅ Doğru</label><input class="form-input" id="rc" type="number" min="0" value="0"></div>
   <div class="form-group"><label class="form-label">❌ Yanlış</label><input class="form-input" id="rw" type="number" min="0" value="0"></div>
   <div class="form-group"><label class="form-label">⬜ Boş</label><input class="form-input" id="rb" type="number" min="0" value="0"></div>
  </div><div class="v2-err" id="rerr"></div>
  <div class="modal-actions"><button class="cancel-button" onclick="V2.closeModal()">Vazgeç</button><button class="save-button" onclick="V2.step1(${id})">Devam Et</button></div>`);
};
V2.step1 = id => {
  const t = tasks.find(x => x.id === id);
  const c = +$("rc").value || 0, w = +$("rw").value || 0, b = +$("rb").value || 0;
  if (c < 0 || w < 0 || b < 0 || c + w + b !== t.questions) { $("rerr").textContent = `Toplam ${t.questions} olmalı (şu an ${c + w + b}).`; return; }
  t.pending = { c, w, b };
  if (w === 0) { V2.finish(id, []); return; }
  let rows = "";
  for (let i = 0; i < w; i++) rows += `<div class="v2-card"><div class="v2-t">Yanlış ${i + 1}</div>
   <select class="form-select" id="rs${i}" onchange="$('rc${i}').style.display=this.value==='Diğer'?'block':'none'">${REASONS.map(r => `<option>${r}</option>`).join("")}</select>
   <input class="form-input" id="rc${i}" placeholder="Kendi nedenin" style="display:none;margin-top:7px">
   <input class="form-input" id="rn${i}" placeholder="Not (ne olduğunu kısaca yaz)" style="margin-top:7px"></div>`;
  openBox(`<div class="modal-header"><div class="modal-title">Yanlışlarından ne öğrendin?</div><button class="close-button" onclick="V2.closeModal()">×</button></div>
   ${rows}<div class="modal-actions"><button class="save-button" onclick="V2.finish(${id})">Kaydet</button></div>`);
};
window.$ = $;
V2.finish = (id, list) => {
  const t = tasks.find(x => x.id === id), p = t.pending; delete t.pending;
  for (let i = 0; i < p.w; i++) {
    let reason = $("rs" + i).value;
    if (reason === "Diğer" && $("rc" + i).value.trim()) reason = $("rc" + i).value.trim();
    wrongs.push({ id: Date.now() + i, taskId: id, source: "ödev", priority: false, attention: reason === "Dikkat hatası",
      subject: t.subject, topic: t.topic || "", title: t.title, reason, note: $("rn" + i).value.trim(), count: 1, date: todayStr() });
  }
  t.result = p; t.completed = true; t.completedAt = Date.now();
  V2.closeModal(); refreshAll();
};

/* ---------- görünümler ---------- */
function render() {
  const T = { tasks: ["Ödevler", "Filtrele, sırala, durumlarını takip et."], wrongs: ["Yanlış Defteri", "Gerçek öğrenme eksiklerin."],
    trials: ["Deneme Takibi", "Genel ve mini denemelerin."], stats: ["İstatistikler", "Tüm verilerin bir arada."] }[view];
  $("v2Title").textContent = T[0]; $("v2Sub").textContent = T[1];
  $("v2Body").innerHTML = { tasks: rTasks, wrongs: rWrongs, trials: rTrials, stats: rStats }[view]();
}
V2.set = (k, v) => { F[k] = v; render(); };
V2.wf = v => { WF = v; render(); };
V2.progress = id => { const t = tasks.find(x => x.id === id); t.inProgress = !t.inProgress; refreshAll(); };

function rTasks() {
  const l = tasks.filter(t => (!F.subject || t.subject === F.subject) && (!F.diff || t.diff === F.diff) && (!F.status || status(t) === F.status));
  l.sort(F.sort === "q" ? (a, b) => (b.questions || 0) - (a.questions || 0) : (a, b) => dateValue(a.date) - dateValue(b.date));
  const sel = (k, o) => `<select class="form-select v2-sel" onchange="V2.set('${k}',this.value)">${o.map(x => `<option value="${x[0]}"${F[k] === x[0] ? " selected" : ""}>${x[1]}</option>`).join("")}</select>`;
  const bar = `<div class="v2-bar">
   ${sel("subject", [["", "Tüm dersler"], ...subjects.map(s => [s.name, s.name])])}
   ${sel("diff", [["", "Tüm zorluklar"], ["kolay", "🟢 Kolay"], ["orta", "🟡 Orta"], ["zor", "🔴 Zor"]])}
   ${sel("status", [["", "Tüm durumlar"], ["Bekliyor", "Bekliyor"], ["Devam ediyor", "Devam ediyor"], ["Tamamlandı", "Tamamlandı"], ["Gecikti", "Gecikti"]])}
   ${sel("sort", [["date", "Sırala: Son teslim (yakından uzağa)"], ["q", "Sırala: Soru sayısı (çoktan aza)"]])}</div>`;
  if (!l.length) return bar + `<div class="v2-empty">Bu filtrelere uyan ödev yok.</div>`;
  return bar + l.map(t => {
    const s = status(t);
    return `<div class="v2-card ${t.completed ? "done" : ""}">
     <div class="v2-t">${E(t.title)} <span class="v2-badge ${s === "Gecikti" ? "late" : ""}">${s}</span></div>
     <div class="v2-m">${E(t.subject)}${t.topic ? " · " + E(t.topic) : ""} · ${DIFF[t.diff] || "🟡 Orta"}<br>
      ${t.given ? "Veriliş: " + formatDate(t.given) + " · " : ""}Teslim: ${formatDate(t.date)} (${deadlineText(t.date)}) · ${t.questions || 0} soru · ${t.minutes || 0} dk
      ${t.teacher ? "<br>Öğretmen: " + E(t.teacher) : ""}
      ${t.result ? `<br>✅ ${t.result.c} · ❌ ${t.result.w} · ⬜ ${t.result.b}` : ""}</div>
     ${t.note ? `<div class="v2-note">📌 ${E(t.note)}</div>` : ""}
     <div class="v2-acts">
      ${t.completed ? "" : `<button class="v2-btn" onclick="V2.progress(${t.id})">${t.inProgress ? "Beklemeye al" : "Başladım"}</button>`}
      <button class="v2-btn main" onclick="toggleTask(${t.id})">${t.completed ? "Geri al" : "Tamamla"}</button>
      <button class="v2-btn red" onclick="if(confirm('Silinsin mi?'))deleteTask(${t.id})">Sil</button></div></div>`;
  }).join("");
}

function rWrongs() {
  const chips = [["all", "Tümü"], ["pri", "🔴 Öncelikli"], ["ödev", "Ödev"], ["deneme", "Genel Deneme"]];
  const bar = `<div class="v2-bar">${chips.map(c => `<button class="v2-chip ${WF === c[0] ? "on" : ""}" onclick="V2.wf('${c[0]}')">${c[1]}</button>`).join("")}</div>`;
  const l = wrongs.filter(w => !w.attention && (WF === "all" || (WF === "pri" && w.priority) || w.source === WF))
    .sort((a, b) => (b.priority - a.priority) || b.id - a.id);
  const hidden = wrongs.filter(w => w.attention).length;
  const note = hidden ? `<p class="v2-m" style="margin-top:12px">Dikkat hatası olarak işaretlenen ${hidden} yanlış defterde görünmez, istatistiklerde kayıtlı.</p>` : "";
  if (!l.length) return bar + `<div class="v2-empty">Burada gösterilecek yanlış yok.</div>` + note;
  return bar + l.map(w => `<div class="v2-card">
    <div class="v2-t">${w.priority ? "🔴 " : ""}${E(w.subject)}${w.topic ? " · " + E(w.topic) : ""}${w.count > 1 ? " ×" + w.count : ""}</div>
    <div class="v2-m">${w.source === "deneme" ? "Genel deneme" : "Ödev"}: ${E(w.title)} · ${formatDate(w.date)}<br>Neden: <b>${E(w.reason)}</b></div>
    ${w.note ? `<div class="v2-note">${E(w.note)}</div>` : ""}
    <div class="v2-acts"><button class="v2-btn red" onclick="V2.delWrong(${w.id})">Sil</button></div></div>`).join("") + note;
}
V2.delWrong = id => { wrongs = wrongs.filter(w => w.id !== id); sv(); render(); };

/* ---------- deneme takibi ---------- */
const net = l => l.c - l.w / 3;
const tNet = t => t.lessons.reduce((s, l) => s + net(l), 0);
function rTrials() {
  const btn = `<button class="add-button" style="margin-bottom:16px" onclick="V2.newTrial()"><span style="font-size:22px;padding:0 6px">＋</span>Deneme ekle</button>`;
  const genel = trials.filter(t => t.type === "genel").sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
  let analysis = "";
  if (genel.length) {
    const names = [...new Set(genel.flatMap(t => t.lessons.map(l => l.name)))];
    let rows = "", coach = "";
    names.forEach(n => {
      const v = genel.map(t => { const l = t.lessons.find(x => x.name === n); return l ? net(l) : null; });
      const nums = v.filter(x => x !== null);
      let tr = "—";
      if (nums.length >= 2) {
        const d = nums[nums.length - 1] - nums[0];
        const dipped = Math.min(...nums.slice(0, -1)) < nums[0] || nums[nums.length - 2] < nums[nums.length - 3];
        if (d >= 0.5) { tr = "📈 Yükseliş"; coach += `<div class="v2-coach">${n}: ${dipped ? "Yaşadığın düşüşten sonra tekrar yükselişe geçmen harika." : "Son denemelerde düzenli yükseliyorsun, böyle devam."}</div>`; }
        else if (d <= -0.5) { tr = "📉 Düşüş"; coach += `<div class="v2-coach">${n}: Son denemelerde düşüş görünüyor. Bu dersteki yanlışlarının konu dağılımını incelemek iyi olabilir.</div>`; }
        else tr = "➡️ Sabit";
      }
      rows += `<tr><td>${E(n)}</td>${v.map(x => `<td>${x === null ? "–" : fmt(x)}</td>`).join("")}<td>${tr}</td></tr>`;
    });
    analysis = `<div class="v2-h">Son ${genel.length} genel deneme (net)</div><div class="v2-scroll"><table class="v2-table">
     <tr><th>Ders</th>${genel.map((_, i) => `<th>D${i + 1}</th>`).join("")}<th>Trend</th></tr>${rows}</table></div>${coach}
     <p class="v2-m" style="margin-top:8px">Bu analiz yalnızca genel denemeleri kullanır.</p>`;
  }
  const list = [...trials].sort((a, b) => b.date.localeCompare(a.date)).map(t => `<div class="v2-card">
    <div class="v2-t">${t.type === "genel" ? "🔵" : "🟡"} ${E(t.name || (t.type === "genel" ? "Genel deneme" : "Mini deneme"))} · ${fmt(tNet(t))} net</div>
    <div class="v2-m">${formatDate(t.date)} · ${t.lessons.reduce((s, l) => s + l.total, 0)} soru<br>
     ${t.lessons.map(l => `${E(l.name)}: ${l.c}D ${l.w}Y ${l.b}B (${fmt(net(l))})`).join(" · ")}</div>
    <div class="v2-acts"><button class="v2-btn red" onclick="V2.delTrial(${t.id})">Sil</button></div></div>`).join("");
  return btn + (trials.length ? list + analysis : `<div class="v2-empty">Henüz deneme eklemedin.</div>`);
}
V2.delTrial = id => { trials = trials.filter(t => t.id !== id); wrongs = wrongs.filter(w => w.trialId !== id); sv(); render(); };
V2.newTrial = () => {
  const rows = LESSONS.map((n, i) => `<div class="v2-trow"><input class="form-input" id="tn${i}" value="${n}" style="text-align:left">
    ${["t", "c", "w"].map(k => `<input class="form-input" id="t${k}${i}" type="number" min="0" placeholder="${{ t: "Soru", c: "D", w: "Y" }[k]}" oninput="V2.calc(${i})">`).join("")}
    <span class="v2-m" id="tx${i}">–</span></div>`).join("");
  openBox(`<div class="modal-header"><div class="modal-title">Yeni deneme</div><button class="close-button" onclick="V2.closeModal()">×</button></div>
   <div class="form-row"><div class="form-group"><label class="form-label">Tür</label><select class="form-select" id="trType"><option value="genel">🔵 Genel Deneme</option><option value="mini">🟡 Mini Deneme</option></select></div>
   <div class="form-group"><label class="form-label">Tarih</label><input class="form-input" id="trDate" type="date" value="${todayStr()}"></div></div>
   <div class="form-group"><label class="form-label">Ad (isteğe bağlı)</label><input class="form-input" id="trName" maxlength="60"></div>
   <p class="v2-m" style="margin-bottom:8px">Ders · Toplam soru · Doğru · Yanlış · Boş otomatik · kullanmadığın dersi boş bırak.</p>${rows}
   <div class="v2-err" id="trErr"></div>
   <div class="modal-actions"><button class="cancel-button" onclick="V2.closeModal()">Vazgeç</button><button class="save-button" onclick="V2.saveTrial()">Kaydet</button></div>`);
  $("v2Box").querySelectorAll(".v2-trow").forEach((r, i) => { r.children[4].textContent = "–"; });
};
const gv = id => Math.max(0, parseInt($(id).value) || 0);
V2.calc = i => {
  const t = gv("tt" + i), c = gv("tc" + i), w = gv("tw" + i);
  $("tx" + i).innerHTML = c + w > t ? `<span style="color:var(--danger)">Aşıldı</span>` : t ? `B:${t - c - w} · ${fmt(c - w / 3)}` : "–";
};
V2.saveTrial = () => {
  const lessons = [];
  for (let i = 0; i < LESSONS.length; i++) {
    const total = gv("tt" + i), c = gv("tc" + i), w = gv("tw" + i);
    if (!total && !c && !w) continue;
    if (c + w > total) { $("trErr").textContent = `${$("tn" + i).value}: doğru + yanlış toplam soruyu aşamaz.`; return; }
    lessons.push({ name: $("tn" + i).value.trim() || LESSONS[i], total, c, w, b: total - c - w });
  }
  if (!lessons.length) { $("trErr").textContent = "En az bir ders gir."; return; }
  const t = { id: Date.now(), type: $("trType").value, date: $("trDate").value || todayStr(), name: $("trName").value.trim(), lessons };
  trials.push(t);
  if (t.type === "genel") lessons.filter(l => l.w > 0).forEach((l, i) => wrongs.push({ id: t.id + i + 1, trialId: t.id, source: "deneme", priority: true,
    attention: false, subject: l.name, topic: "", title: t.name || "Genel deneme", reason: "Deneme yanlışı", note: "", count: l.w, date: t.date }));
  sv(); V2.closeModal(); render();
};

/* ---------- istatistikler ---------- */
function agg(from) {
  const l = tasks.filter(t => t.result && (!from || (t.completedAt || 0) >= from));
  const c = l.reduce((s, t) => s + t.result.c, 0), w = l.reduce((s, t) => s + t.result.w, 0), b = l.reduce((s, t) => s + t.result.b, 0);
  return { n: l.length, c, w, b, solved: c + w, min: l.reduce((s, t) => s + (t.minutes || 0), 0) };
}
function rStats() {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const periods = [["Bugün", d0.getTime()], ["Bu hafta", Date.now() - 6 * 864e5], ["Bu ay", new Date(d0.getFullYear(), d0.getMonth(), 1).getTime()], ["Genel", 0]];
  const blocks = periods.map(([n, f]) => { const a = agg(f); return `<div class="v2-h">${n}</div><div class="v2-grid">
    <div class="v2-box"><b>${a.solved}</b><span>Çözülen soru</span></div><div class="v2-box"><b>${a.c}</b><span>Doğru</span></div>
    <div class="v2-box"><b>${a.w}</b><span>Yanlış</span></div><div class="v2-box"><b>${a.min}</b><span>Süre (dk)</span></div>
    <div class="v2-box"><b>${a.n}</b><span>Tamamlanan ödev</span></div></div>`; }).join("");
  const g = agg(0), rate = tasks.length ? Math.round(tasks.filter(t => t.completed).length / tasks.length * 100) : 0;
  const succ = g.solved + g.b ? Math.round(g.c / (g.solved + g.b) * 100) : 0;
  const count = (arr, key) => { const m = {}; arr.forEach(x => m[x[key] || "—"] = (m[x[key] || "—"] || 0) + (x.count || 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const list = arr => arr.length ? arr.map(([k, v]) => `<tr><td>${E(k)}</td><td>${v}</td></tr>`).join("") : `<tr><td colspan="2" class="v2-m">Veri yok</td></tr>`;
  const topics = count(wrongs.filter(w => w.topic), "topic").slice(0, 5);
  const gen = trials.filter(t => t.type === "genel");
  return `<div class="v2-grid"><div class="v2-box"><b>%${rate}</b><span>Ödev tamamlama</span></div><div class="v2-box"><b>%${succ}</b><span>Genel başarı</span></div>
    <div class="v2-box"><b>${gen.length ? fmt(gen.reduce((s, t) => s + tNet(t), 0) / gen.length) : "–"}</b><span>Genel deneme ort. net</span></div></div>
    ${blocks}
    <div class="v2-h">Yanlış türleri (dikkat hataları dahil)</div><table class="v2-table">${list(count(wrongs, "reason"))}</table>
    <div class="v2-h">Derse göre yanlış</div><table class="v2-table">${list(count(wrongs, "subject"))}</table>
    <div class="v2-h">En çok yanlış yapılan konular</div><table class="v2-table">${list(topics)}</table>`;
}

refreshAll();
})();
