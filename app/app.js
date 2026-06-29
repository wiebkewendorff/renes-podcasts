// API: vollstaendiger Datensatz, damit jedes Thema genug Episoden hat
const PODCASTS_URL = "../api/podcasts.json";
const TOPICS_URL = "../config/topics.json";
const RANDOM_COLOR = "#e3be4d";
const EPISODES_PER_TOPIC = 3;
const VISIBLE_TOPICS = 4;
const FALLBACK_PALETTE = ["#7a5ce6", "#2c8c8c", "#c0562d", "#5a7d2c", "#a83a72", "#3a72a8"];
const HEARD_KEY = "renes-podcasts-heard";       // localStorage: gehoerte Episoden
const HEARD_COOLDOWN_DAYS = 21;                  // so lange werden gehoerte ausgeblendet

let podcastData = [];
let topics = [];
let activeTopics = [];
let renderedEpisodes = [];
let autoplay = false;
const audioPlayer = document.getElementById("global-player");
const episodeSection = document.getElementById("episode-section");
const episodeList = document.getElementById("episode-list");
const categoryGrid = document.getElementById("category-grid");

// --- gehoerte Episoden merken (Karenzzeit) ---
function loadHeard() {
    try { return JSON.parse(localStorage.getItem(HEARD_KEY) || "{}"); } catch { return {}; }
}
function markHeard(id) {
    if (!id) return;
    const heard = loadHeard();
    heard[id] = Date.now();
    try { localStorage.setItem(HEARD_KEY, JSON.stringify(heard)); } catch { /* ignore */ }
}
function recentlyHeard(id) {
    const heard = loadHeard();
    const ts = heard[id];
    if (!ts) return false;
    return (Date.now() - ts) < HEARD_COOLDOWN_DAYS * 86400000;
}

// --- Multimodales Feedback ---
let audioCtx = null;
function playFeedbackSound(type = "click") {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === "stop") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(200, t + 0.12);
        gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
    } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(520, t + 0.09);
        gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
        osc.start(t); osc.stop(t + 0.09);
    }
}

async function fetchPodcasts() {
    try {
        const [pRes, tRes] = await Promise.all([
            fetch(PODCASTS_URL, { cache: "no-store" }),
            fetch(TOPICS_URL, { cache: "no-store" })
        ]);
        if (!pRes.ok) throw new Error(`API ${pRes.status}`);
        podcastData = await pRes.json();
        topics = tRes.ok ? await tRes.json() : [];
        assignPrimaryTopics();
        initApp();
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
    }
}

function tagsOf(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const cats = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    return [...tags, ...cats].map(t => String(t).toLowerCase());
}

// Jede Episode wird GENAU einem Thema zugeordnet (erstes passendes Topic in
// Reihenfolge der topics.json), damit keine Episode doppelt erscheint.
function assignPrimaryTopics() {
    podcastData.forEach(it => {
        const set = tagsOf(it);
        const hit = topics.find(t => t.tags.some(x => set.includes(String(x).toLowerCase())));
        it._primary = hit ? hit.id : (set[0] || "");
    });
}

function topicEpisodes(topic) {
    return podcastData.filter(it => it._primary === topic.id);
}

function buildActiveTopics() {
    const result = topics.filter(t => topicEpisodes(t).length > 0).slice(0, VISIBLE_TOPICS);
    const used = new Set(result.map(t => t.id));
    if (result.length < VISIBLE_TOPICS) {
        const extra = [...new Set(podcastData.map(it => it._primary).filter(Boolean))].filter(id => !used.has(id));
        for (let i = extra.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [extra[i], extra[j]] = [extra[j], extra[i]]; }
        let p = 0;
        for (const id of extra) {
            if (result.length >= VISIBLE_TOPICS) break;
            result.push({ id, label: id, color: FALLBACK_PALETTE[p % FALLBACK_PALETTE.length], tags: [id] });
            used.add(id); p++;
        }
    }
    return result.slice(0, VISIBLE_TOPICS);
}

function renderTopics() {
    activeTopics = buildActiveTopics();
    const tpl = document.getElementById("category-item-template");
    categoryGrid.innerHTML = "";
    activeTopics.forEach(topic => {
        const item = tpl.content.firstElementChild.cloneNode(true);
        item.querySelector('[data-field="label"]').textContent = topic.label;
        const btn = item.querySelector(".cat-btn");
        btn.style.backgroundColor = topic.color;
        btn.setAttribute("aria-label", topic.label);
        btn.addEventListener("click", () => { playFeedbackSound("click"); showTopic(topic); });
        categoryGrid.appendChild(item);
    });
}

function initApp() {
    renderTopics();
    document.getElementById("btn-random").addEventListener("click", () => { playFeedbackSound("click"); showRandom(); });
    document.getElementById("btn-back").addEventListener("click", () => { playFeedbackSound("stop"); goBack(); });
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".episode-card")) {
            document.querySelectorAll(".episode-card.expanded").forEach(c => c.classList.remove("expanded"));
        }
    });
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

// Auswahl: zufaellig mischen (auch aeltere Lieblinge erscheinen), gehoerte ausblenden.
// Bleiben zu wenige uebrig, werden gehoerte wieder zugelassen.
function pickEpisodes(pool, count) {
    let fresh = pool.filter(ep => !recentlyHeard(ep.id));
    if (fresh.length < count) fresh = pool;
    return shuffle(fresh).slice(0, count);
}

function showTopic(topic) {
    stopGlobalAudio();
    autoplay = false;
    const selection = pickEpisodes(topicEpisodes(topic), EPISODES_PER_TOPIC);
    if (selection.length === 0) {
        renderedEpisodes = [];
        episodeList.innerHTML = `<p class="empty-note">Keine aktuellen Episoden zu diesem Thema gefunden.</p>`;
    } else {
        renderEpisodes(selection);
    }
    openSection(topic.color || "#7cd1e8");
}

function showRandom() {
    stopGlobalAudio();
    autoplay = true;
    const selection = pickEpisodes(podcastData, 5);
    renderEpisodes(selection);
    openSection(RANDOM_COLOR);
    if (selection.length) setTimeout(() => playEpisode(0), 100);
}

function openSection(bgColor) {
    episodeSection.style.backgroundColor = bgColor;
    episodeSection.classList.remove("hidden");
    setTimeout(() => episodeSection.scrollIntoView({ behavior: "smooth" }), 50);
}

function goBack() {
    stopGlobalAudio();
    autoplay = false;
    episodeSection.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderEpisodes(episodes) {
    renderedEpisodes = episodes;
    episodeList.innerHTML = "";
    const template = document.getElementById("episode-card-template");
    episodes.forEach((ep, index) => {
        const title = ep.title || "Hörbeitrag ohne Titel";
        const host = ep.sourceTitle || ep.source || "Unbekannter Sender";
        const summary = ep.summary || "Keine Beschreibung verfügbar.";
        const image = ep.image || "";
        const link = ep.url || "";
        const card = template.content.firstElementChild.cloneNode(true);
        card.id = `ep-card-${index}`;
        card.querySelector('[data-field="title"]').textContent = title;
        card.querySelector('[data-field="meta"]').textContent = host;
        const durEl = card.querySelector('[data-field="duration"]');
        if (durEl) { if (ep.duration) durEl.textContent = ep.duration; else durEl.remove(); }
        card.querySelector('[data-field="summary"]').textContent = summary;
        const img = card.querySelector('[data-field="image"]');
        if (image) { img.src = image; } else { img.remove(); }
        const a = card.querySelector('[data-field="link"]');
        if (link) { a.href = link; } else { a.remove(); }
        const btn = card.querySelector(".play-stop-btn");
        btn.dataset.index = index;
        btn.setAttribute("aria-label", `Abspielen: ${title}`);
        card.addEventListener("click", (e) => {
            if (e.target.closest(".play-stop-btn") || e.target.closest(".source-link")) return;
            const open = card.classList.contains("expanded");
            document.querySelectorAll(".episode-card.expanded").forEach(c => c.classList.remove("expanded"));
            if (!open) card.classList.add("expanded");
        });
        episodeList.appendChild(card);
    });
    episodeList.querySelectorAll(".play-stop-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = Number(e.currentTarget.getAttribute("data-index"));
            if (e.currentTarget.classList.contains("playing")) { playFeedbackSound("stop"); stopGlobalAudio(); }
            else { playFeedbackSound("click"); playEpisode(index); }
        });
    });
}

function playEpisode(index) {
    const ep = renderedEpisodes[index];
    if (!ep) return;
    markHeard(ep.id); // gemerkt: wird Karenzzeit lang seltener gezeigt
    const url = ep.audio || ep.url;
    const cards = document.querySelectorAll(".episode-card");
    cards.forEach((c, i) => c.classList.toggle("disabled", i !== index));
    resetButtons();
    const btn = episodeList.querySelector(`.play-stop-btn[data-index="${index}"]`);
    if (btn) { btn.textContent = "STOPP"; btn.classList.add("playing"); }
    audioPlayer.src = url;
    audioPlayer.play();
    audioPlayer.onended = () => {
        if (autoplay && index + 1 < renderedEpisodes.length) playEpisode(index + 1);
        else stopGlobalAudio();
    };
}

function resetButtons() {
    document.querySelectorAll(".play-stop-btn").forEach(btn => { btn.textContent = "HÖREN"; btn.classList.remove("playing"); });
}

function stopGlobalAudio() {
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.onended = null;
    resetButtons();
    document.querySelectorAll(".episode-card").forEach(card => card.classList.remove("disabled"));
}

window.addEventListener("DOMContentLoaded", fetchPodcasts);
