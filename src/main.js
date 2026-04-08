// Reminders app — local-first, no backend.
const tickUrl = new URL("./assets/tick-mark.svg", import.meta.url).href;
const arrowInUrl = new URL("./assets/arrow-in.svg", import.meta.url).href;
const arrowOutUrl = new URL("./assets/arrow-out.svg", import.meta.url).href;

const SEED_PEOPLE = ["Setal", "Rahul", "Pragadees", "Aman", "Anand", "Ashil", "Neeraj", "Vishnu"];
// Small dictionary of common task-related words used for typo correction.
const COMMON_WORDS = new Set([
  // verbs
  "fix","finish","complete","send","review","update","check","write","call","email","message","ping","remind","ask","tell","share","sync","schedule","book","buy","get","make","build","create","design","draft","prepare","plan","organize","clean","clear","close","open","start","stop","add","remove","delete","edit","read","reply","respond","follow","upload","download","push","pull","merge","deploy","test","fixed","finished","completed","sent","reviewed","updated","checked","wrote","called","emailed","messaged","pinged","reminded","asked","told","shared","synced","scheduled","booked","bought","got","made","built","created","designed","drafted","prepared","planned","organized","cleaned","cleared","closed","opened","started","stopped","added","removed","deleted","edited","replied","responded","followed","uploaded","downloaded","pushed","pulled","merged","deployed","tested","pay","paid","print","printed","return","returned","pick","picked","drop","dropped","watch","watched","read","wrote","talk","talked","meet","met","attend","join","joined",
  // nouns
  "flow","layout","page","screen","screens","photo","photos","photo","video","videos","album","app","mobile","web","login","signup","onboarding","payment","email","emails","mail","message","messages","note","notes","doc","docs","document","report","deck","slide","slides","ticket","issue","bug","feature","release","branch","pr","commit","build","invoice","bill","contract","agreement","quote","offer","client","clients","user","users","team","meeting","call","calls","plan","budget","price","cost","date","time","day","week","month","year","morning","evening","night","tomorrow","today","weekend","party","trip","ride","cab","ola","uber","food","lunch","dinner","breakfast","cake","flowers","gift","mom","dad","brother","sister","friend","family","house","home","office","shop","store","market","bank","atm","key","keys","car","bike","laptop","phone","charger","cable","book","books","class","exam","test","project","task","tasks","list","reminder","reminders","alarm","update",
  // glue
  "the","a","an","of","to","for","with","and","or","by","on","in","at","from","into","about","up","down","out","off","over","under","this","that","these","those","my","your","our","their","his","her","its","be","is","are","was","were","been","being","do","does","did","done","doing","have","has","had","not","no","yes","very","just","also","still","yet","soon","later","before","after","while","when","where","why","how","what","who","which","then","than","so","but","if","as","because","new","old","good","bad","big","small","next","last","first","second","third","more","less","most","least","all","some","any","each","every","other","another","same","different","high","low","fast","slow","easy","hard","important","main","best","top","bottom","left","right","front","back",
]);

const PERSON_ALIASES = {
  "prag": "Pragadees",
  "praga": "Pragadees",
  "pragadeesh": "Pragadees",
};

const DIR = { THEM: "they_owe_me", ME: "i_owe_them" };
const BUCKET = { TODAY: "today", AGENDA: "agenda" };

const state = {
  people: [],
  tasks: [], // {id, text, person, direction, bucket, deadline, done, links, createdAt}
  filterDate: null, // yyyy-mm-dd or null — filters Agendas to this day only
};

// ---------- persistence ----------
function load() {
  const raw = localStorage.getItem("reminders.state");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.people = parsed.people || SEED_PEOPLE;
      state.tasks = (parsed.tasks || []).map(migrateTask).filter(Boolean);
      return;
    } catch (e) {}
  }
  state.people = [...SEED_PEOPLE];
  state.tasks = [];
}

function migrateTask(t) {
  if (!t) return null;
  if (t.owner && !t.person) {
    t.person = t.owner;
    t.direction = DIR.THEM;
  }
  if (!t.person) t.person = "Me";
  if (!t.direction) t.direction = DIR.THEM;
  if (!t.bucket) t.bucket = BUCKET.AGENDA;
  return t;
}

function save() {
  localStorage.setItem("reminders.state", JSON.stringify(state));
}

// ---------- parsing ----------
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const FILLER_PHRASES = [
  // delegation / direction phrases
  "told me to", "told me", "asked me to", "asked me",
  "wants me to", "wanted me to", "needs me to", "needed me to",
  "said to", "said i should", "said i have to", "said i need to",
  "i need to", "i have to", "i should", "i must", "i will", "i'll",
  "remind me to", "remind me", "reminder to", "remember to",
  "for me to", "for me", "gave me", "give me",
  "please", "pls", "plz",
  // temporal connectors
  "by next week", "next week", "this week", "by today", "by tomorrow",
  "by eod", "eod", "asap", "today", "tomorrow",
  "on monday", "on tuesday", "on wednesday", "on thursday", "on friday", "on saturday", "on sunday",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  // misc
  "about", "regarding", "re:", "hey", "btw",
  // urgency
  "urgent", "urgently", "asap", "right away", "immediately", "high priority", "priority",
];

function parseInput(text) {
  const lower = text.toLowerCase();

  // person — exact, then aliases, then fuzzy (typo-tolerant)
  let person = null;
  let personMatchedToken = null;
  for (const p of state.people) {
    const re = new RegExp(`\\b${p.toLowerCase()}\\b`);
    if (re.test(lower)) { person = p; personMatchedToken = p.toLowerCase(); break; }
  }
  if (!person) {
    for (const [alias, full] of Object.entries(PERSON_ALIASES)) {
      const re = new RegExp(`\\b${alias}\\b`);
      if (re.test(lower) && state.people.includes(full)) {
        person = full;
        personMatchedToken = alias;
        break;
      }
    }
  }
  if (!person) {
    const tokens = lower.match(/[a-z]+/g) || [];
    let best = null;
    for (const tok of tokens) {
      if (tok.length < 3) continue;
      for (const p of state.people) {
        const pl = p.toLowerCase();
        const dist = levenshtein(tok, pl);
        const tol = Math.max(1, Math.floor(pl.length / 4)); // ~25% typos allowed
        if (dist <= tol && (!best || dist < best.dist)) {
          best = { person: p, token: tok, dist };
        }
      }
    }
    if (best) { person = best.person; personMatchedToken = best.token; }
  }

  // direction
  // Direction:
  //   DIR.ME    = incoming  (they pushed a task TO me — "asked me", "told me", ...)
  //   DIR.THEM  = outgoing  (I need to push to them — "remind", "tell X", "ask X", ...)
  let direction = DIR.THEM;
  const incomingRe = /\b(asked me|told me|wants me|wanted me|needs me|needed me|gave me|for me|i need to|i have to|i should|i must|remind me|reminder for me)\b/;
  const outgoingRe = /\b(remind|tell|ask|follow up|followup|ping|chase|nudge|reach out|get back to|message|msg|text|call|email|mail)\b/;
  if (incomingRe.test(lower)) direction = DIR.ME;
  else if (outgoingRe.test(lower)) direction = DIR.THEM;
  else {
    // Fuzzy fallback — handle typos like "tld me", "askd", "remmind"
    const tokens = lower.match(/[a-z']+/g) || [];
    const incomingVerbs = ["asked", "told", "wants", "wanted", "needs", "needed", "gave"];
    const outgoingVerbs = ["remind", "tell", "ask", "ping", "chase", "nudge", "message", "call", "email", "text", "mail", "followup", "reach"];
    if (fuzzyHasNear(tokens, incomingVerbs, "me")) direction = DIR.ME;
    else if (fuzzyHas(tokens, outgoingVerbs)) direction = DIR.THEM;
  }

  // deadline / bucket
  let bucket = BUCKET.AGENDA;
  let deadline = null;
  const today = new Date();
  let dateMatchRange = null; // [start, end] in original text to strip

  // explicit "30th april" / "april 30" / "30 apr"
  const monthNames = Object.keys(MONTHS).join("|");
  const dmY = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:\\s+(\\d{2,4}))?\\b`, "i");
  const mDy = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{2,4}))?\\b`, "i");
  let m = text.match(dmY);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = MONTHS[m[2].toLowerCase()];
    const yr = m[3] ? parseInt(m[3], 10) : inferYear(mo, day, today);
    deadline = ymd(new Date(yr, mo, day));
    dateMatchRange = [m.index, m.index + m[0].length];
  } else if ((m = text.match(mDy))) {
    const mo = MONTHS[m[1].toLowerCase()];
    const day = parseInt(m[2], 10);
    const yr = m[3] ? parseInt(m[3], 10) : inferYear(mo, day, today);
    deadline = ymd(new Date(yr, mo, day));
    dateMatchRange = [m.index, m.index + m[0].length];
  }

  // bare ordinal day like "30th", "21st", "3rd" (no month) → day in current/next month
  if (!deadline) {
    const ord = text.match(/\b(\d{1,2})(st|nd|rd|th)\b/i);
    if (ord) {
      const day = parseInt(ord[1], 10);
      if (day >= 1 && day <= 31) {
        let mo = today.getMonth();
        let yr = today.getFullYear();
        let candidate = new Date(yr, mo, day);
        if (candidate < new Date(yr, today.getMonth(), today.getDate())) {
          mo += 1;
          if (mo > 11) { mo = 0; yr += 1; }
          candidate = new Date(yr, mo, day);
        }
        deadline = ymd(candidate);
        dateMatchRange = [ord.index, ord.index + ord[0].length];
      }
    }
  }

  if (/\btoday\b/.test(lower)) { deadline = deadline || ymd(today); bucket = BUCKET.TODAY; }
  else if (/\btomorrow\b/.test(lower)) deadline = deadline || ymd(addDays(today, 1));
  else if (/\bnext week\b/.test(lower)) deadline = deadline || ymd(addDays(today, 7));

  // Urgency (with fuzzy fallback for typos like "urgnt", "asp")
  let urgent = false;
  if (/\b(urgent|urgently|asap|right away|immediately|priority|high priority)\b/.test(lower)) {
    urgent = true;
  } else {
    const tokens = lower.match(/[a-z]+/g) || [];
    if (fuzzyHas(tokens, ["urgent", "urgently", "asap", "immediately", "priority"])) urgent = true;
  }

  // build clean text
  let cleanText = text;
  if (dateMatchRange) {
    cleanText = cleanText.slice(0, dateMatchRange[0]) + " " + cleanText.slice(dateMatchRange[1]);
  }
  if (person) {
    const tokenToStrip = personMatchedToken || person;
    cleanText = cleanText.replace(new RegExp(`\\b${tokenToStrip}\\b`, "i"), " ");
  }
  // strip filler phrases (longest first to avoid partial overlap)
  const sorted = [...FILLER_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    cleanText = cleanText.replace(re, " ");
  }
  // strip leading "to" / "the" left dangling
  cleanText = cleanText
    .replace(/\s+/g, " ")
    .replace(/^[,.\s\-:;]+|[,.\s\-:;]+$/g, "")
    .replace(/^(to|the|a|that|and)\s+/i, "")
    .trim();

  cleanText = correctSpelling(cleanText);
  return { text: cleanText || text, person, direction, bucket, deadline, urgent };
}

function correctSpelling(text) {
  // Per-token: if token is unknown and there's a unique close common word at distance 1, swap.
  return text.replace(/[A-Za-z']+/g, (tok) => {
    const lower = tok.toLowerCase();
    if (lower.length < 3) return tok;
    if (COMMON_WORDS.has(lower)) return tok;
    // never alter detected person names
    if (state.people.some((p) => p.toLowerCase() === lower)) return tok;
    let best = null;
    let bestCount = 0;
    for (const word of COMMON_WORDS) {
      if (Math.abs(word.length - lower.length) > 1) continue;
      const d = levenshtein(lower, word);
      if (d === 1) {
        if (!best) { best = word; bestCount = 1; }
        else if (word !== best) bestCount++;
      }
    }
    if (best && bestCount === 1) {
      // preserve capitalization of original first letter
      if (tok[0] === tok[0].toUpperCase()) return best[0].toUpperCase() + best.slice(1);
      return best;
    }
    return tok;
  });
}

function fuzzyMatchWord(token, target) {
  if (token === target) return true;
  if (target.length <= 3) return token === target;
  const tol = Math.max(1, Math.floor(target.length / 4));
  return levenshtein(token, target) <= tol;
}
function fuzzyHas(tokens, candidates) {
  for (const tok of tokens) {
    for (const c of candidates) {
      if (fuzzyMatchWord(tok, c)) return true;
    }
  }
  return false;
}
function fuzzyHasNear(tokens, candidates, nextWord) {
  for (let i = 0; i < tokens.length; i++) {
    for (const c of candidates) {
      if (fuzzyMatchWord(tokens[i], c)) {
        const next = tokens[i + 1];
        if (!nextWord || (next && fuzzyMatchWord(next, nextWord))) return true;
      }
    }
  }
  return false;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function inferYear(mo, day, today) {
  const y = today.getFullYear();
  const candidate = new Date(y, mo, day);
  // if the date already passed this year, assume next year
  if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return y + 1;
  return y;
}

function formatShortDate(ymdStr) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]}`;
}

function ymd(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// ---------- task ops ----------
function addTask({ text, person, direction, bucket, deadline, urgent }) {
  if (!person) {
    person = "Me";
    if (!state.people.includes("Me")) state.people.unshift("Me");
  }
  state.tasks.push({
    id: crypto.randomUUID(),
    text,
    person,
    direction: direction || DIR.THEM,
    bucket: bucket || BUCKET.AGENDA,
    deadline: deadline || null,
    urgent: !!urgent,
    done: false,
    links: [],
    createdAt: Date.now(),
  });
  save();
  render();
}

function moveTask(id, { person, bucket, urgent } = {}) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  if (person) t.person = person;
  if (bucket) t.bucket = bucket;
  if (urgent !== undefined) t.urgent = urgent;
  save();
  render();
}

function flipDirection(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.direction = t.direction === DIR.THEM ? DIR.ME : DIR.THEM;
  save();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  save();
  render();
}

function editTaskText(id, newText) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  const trimmed = (newText || "").trim();
  if (!trimmed) { deleteTask(id); return; }
  t.text = trimmed;
  save();
  render();
}

function toggleDone(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  // Ticking off an urgent item sends it back to its original list (strikethrough)
  if (t.done && t.urgent) t.urgent = false;
  save();
  render();
}

// ---------- rendering ----------
function renderBucket(bucketKey, container) {
  container.innerHTML = "";
  const blockTpl = document.getElementById("person-block-tpl");
  const itemTpl = document.getElementById("task-item-tpl");

  const orderedPeople = [...state.people].sort((a, b) => {
    if (a === "Me") return -1;
    if (b === "Me") return 1;
    return 0;
  });
  for (const person of orderedPeople) {
    const tasks = state.tasks.filter((t) => {
      if (t.person !== person) return false;
      if (t.urgent) return false;
      if (bucketKey === BUCKET.AGENDA && state.filterDate) {
        // When filtering by a date, include matching tasks from any bucket
        return t.deadline === state.filterDate;
      }
      if (t.bucket !== bucketKey) return false;
      return true;
    });
    if (tasks.length === 0) continue;

    const block = blockTpl.content.cloneNode(true);
    const blockEl = block.querySelector(".person-block");
    blockEl.dataset.person = person;
    blockEl.querySelector(".person-name").textContent = person === "Me" ? "My list" : person + "'s list";
    const ul = blockEl.querySelector(".person-tasks");

    for (const task of tasks) {
      const item = itemTpl.content.cloneNode(true);
      const li = item.querySelector(".task-item");
      li.dataset.id = task.id;
      if (task.done) li.classList.add("done");
      const check = li.querySelector(".check");
      check.checked = task.done;
      const tickImg = li.querySelector(".tick");
      if (tickImg) tickImg.src = tickUrl;
      check.addEventListener("change", () => toggleDone(task.id));

      const badge = li.querySelector(".badge");
      if (person === "Me") {
        badge.remove();
      } else {
        badge.innerHTML = "";
        const arrowImg = document.createElement("img");
        arrowImg.src = task.direction === DIR.ME ? arrowInUrl : arrowOutUrl;
        arrowImg.alt = task.direction === DIR.ME ? "incoming" : "outgoing";
        arrowImg.className = "dir-arrow";
        badge.appendChild(arrowImg);
        badge.title = task.direction === DIR.ME ? "Incoming — they asked you" : "Outgoing — you need to push";
        badge.style.cursor = "default";
      }

      const textEl = li.querySelector(".task-text");
      let displayText = task.text;
      if (bucketKey === BUCKET.AGENDA && task.deadline) {
        displayText += ` (${formatShortDate(task.deadline)})`;
      }
      textEl.textContent = displayText;
      textEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        startInlineEdit(textEl, task.id, task.text);
      });

      const delBtn = li.querySelector(".task-del");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteTask(task.id);
        });
      }

      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      });
      ul.appendChild(li);
    }
    container.appendChild(block);
  }
}

function wireDropZone(el, bucketKey) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/plain");
    // If dropped onto a person-block, set person too
    const block = e.target.closest(".person-block");
    const opts = { bucket: bucketKey, urgent: false };
    if (block) opts.person = block.dataset.person;
    moveTask(id, opts);
  });
}

function startInlineEdit(textEl, id, rawText) {
  if (rawText !== undefined) textEl.textContent = rawText;
  textEl.contentEditable = "true";
  textEl.classList.add("editing");
  const range = document.createRange();
  range.selectNodeContents(textEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  textEl.focus();
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    textEl.contentEditable = "false";
    textEl.classList.remove("editing");
    editTaskText(id, textEl.textContent);
  };
  textEl.addEventListener("blur", commit, { once: true });
  textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); textEl.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); committed = true; textEl.contentEditable = "false"; textEl.classList.remove("editing"); render(); }
  });
}

function renderUrgent() {
  const container = document.getElementById("urgent-body");
  if (!container) return;
  container.innerHTML = "";
  const itemTpl = document.getElementById("task-item-tpl");
  const urgentTasks = state.tasks.filter((t) => t.urgent && !t.done);
  for (const task of urgentTasks) {
    const item = itemTpl.content.cloneNode(true);
    const li = item.querySelector(".task-item");
    li.dataset.id = task.id;
    li.classList.add("urgent-item");
    const check = li.querySelector(".check");
    check.checked = task.done;
    const tickImg = li.querySelector(".tick");
    if (tickImg) tickImg.src = tickUrl;
    check.addEventListener("change", () => toggleDone(task.id));
    const badge = li.querySelector(".badge");
    badge.remove();
    const textEl = li.querySelector(".task-text");
    textEl.textContent = `${task.text} (${task.person})`;
    textEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      startInlineEdit(textEl, task.id, task.text);
    });
    const delBtn = li.querySelector(".task-del");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });
    }
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
    });
    container.appendChild(li);
  }
}

function render() {
  renderBucket(BUCKET.TODAY, document.getElementById("today-body"));
  renderBucket(BUCKET.AGENDA, document.getElementById("agenda-body"));
  renderUrgent();
  if (typeof window.renderCal === "function") window.renderCal();
}

// ---------- wire up ----------
function init() {
  load();
  // Date pill
  const d = new Date();
  document.getElementById("today-date").textContent =
    String(d.getDate()).padStart(2, "0") + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getFullYear()).slice(2);

  // Calendar
  let calView = new Date();
  calView.setDate(1);
  window.renderCal = function renderCal() {
    const grid = document.getElementById("cal-grid");
    const label = document.getElementById("cal-label");
    grid.innerHTML = "";
    const year = calView.getFullYear();
    const month = calView.getMonth();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    label.textContent = `${monthNames[month]} ${year}`;
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const cells = 42; // 6 weeks
    for (let i = 0; i < cells; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      let dayNum, cellMonth, cellYear;
      if (i < startDay) {
        dayNum = prevDays - startDay + i + 1;
        cellMonth = month - 1;
        cellYear = year;
        cell.classList.add("muted");
      } else if (i >= startDay + daysInMonth) {
        dayNum = i - startDay - daysInMonth + 1;
        cellMonth = month + 1;
        cellYear = year;
        cell.classList.add("muted");
      } else {
        dayNum = i - startDay + 1;
        cellMonth = month;
        cellYear = year;
      }
      if (
        cellYear === today.getFullYear() &&
        cellMonth === today.getMonth() &&
        dayNum === today.getDate()
      ) {
        cell.classList.add("today");
      }
      const ymdStr =
        cellYear + "-" +
        String(cellMonth + 1).padStart(2, "0") + "-" +
        String(dayNum).padStart(2, "0");
      const hasTask = state.tasks.some((t) => !t.done && t.deadline === ymdStr);
      if (hasTask) cell.classList.add("has-task");
      if (state.filterDate === ymdStr) cell.classList.add("selected");
      cell.dataset.ymd = ymdStr;
      const isToday =
        cellYear === today.getFullYear() &&
        cellMonth === today.getMonth() &&
        dayNum === today.getDate();
      if (hasTask && !isToday) {
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => {
          state.filterDate = state.filterDate === ymdStr ? null : ymdStr;
          render();
        });
      }
      cell.textContent = dayNum;
      grid.appendChild(cell);
    }
  };
  document.getElementById("cal-prev").addEventListener("click", () => {
    calView.setMonth(calView.getMonth() - 1);
    window.renderCal();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    calView.setMonth(calView.getMonth() + 1);
    window.renderCal();
  });
  window.renderCal();

  render();

  wireDropZone(document.getElementById("today-body"), BUCKET.TODAY);
  wireDropZone(document.getElementById("agenda-body"), BUCKET.AGENDA);

  // Urgent drop zone
  const urgentBody = document.getElementById("urgent-body");
  if (urgentBody) {
    urgentBody.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      urgentBody.classList.add("drag-over");
    });
    urgentBody.addEventListener("dragleave", () => urgentBody.classList.remove("drag-over"));
    urgentBody.addEventListener("drop", (e) => {
      e.preventDefault();
      urgentBody.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const t = state.tasks.find((x) => x.id === id);
      if (!t || t.done) return; // done tasks stay in their original list
      moveTask(id, { urgent: true });
    });
  }

  const input = document.getElementById("capture-input");
  function submit() {
    const text = input.value.trim();
    if (!text) return;
    addTask(parseInput(text));
    input.value = "";
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  document.getElementById("mic-btn").addEventListener("click", () => {
    alert("Voice capture coming next — will use whisper.cpp locally.");
  });

  // Drawer toggle for small screens
  const side = document.getElementById("side");
  const scrim = document.getElementById("drawer-scrim");
  const toggle = document.getElementById("drawer-toggle");
  function closeDrawer() {
    side.classList.remove("open");
    scrim.classList.remove("open");
  }
  toggle.addEventListener("click", () => {
    const opening = !side.classList.contains("open");
    side.classList.toggle("open", opening);
    scrim.classList.toggle("open", opening);
  });
  scrim.addEventListener("click", closeDrawer);
}

init();
