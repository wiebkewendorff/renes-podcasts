// API: vollstaendiger Datensatz, damit jedes Thema genug Episoden hat
const PODCASTS_URL = "../api/podcasts.json";
const TOPICS_URL = "../config/topics.json";
const RANDOM_COLOR = "#e3be4d";
const EPISODES_PER_TOPIC = 3;
const VISIBLE_TOPICS = 6;
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
const randomButton = document.getElementById("btn-random");

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
    // Episoden-eigene category/tags bestimmen die Prioritaet:
    // iteriere die episode-tags in ihrer Reihenfolge und suche das erste Topic, das passt.
    // So landet eine Episode mit ["Musik","Geschichte"] bei Musik, nicht bei Geschichte.
    podcastData.forEach(it => {
        const epTags = [
            ...(Array.isArray(it.category) ? it.category : it.category ? [it.category] : []),
            ...(Array.isArray(it.tags) ? it.tags : [])
        ].map(t => String(t).toLowerCase());

        let primary = "";
        for (const epTag of epTags) {
            const hit = topics.find(t => t.tags.some(x => String(x).toLowerCase() === epTag));
            if (hit) { primary = hit.id; break; }
        }
        it._primary = primary || epTags[0] || "";
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
    updateRandomWheel();
}

function initApp() {
    setupProgressBar();
    setupProgressBarClick();
    renderTopics();
    setupRandomButton();
    randomButton.addEventListener("click", () => { playFeedbackSound("click"); showRandom(); });
    document.getElementById("btn-back").addEventListener("click", () => { playFeedbackSound("stop"); goBack(); });
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".episode-card")) {
            document.querySelectorAll(".episode-card.expanded").forEach(c => c.classList.remove("expanded"));
        }
    });
}

function updateRandomWheel() {
    const wheelTopics = activeTopics.length ? activeTopics : topics.slice(0, VISIBLE_TOPICS);
    const colors = wheelTopics.map(topic => topic.color).filter(Boolean);
    if (colors.length === 0) return;
    const step = 100 / colors.length;
    const gradientStops = colors.map((color, index) => {
        const start = (index * step).toFixed(2);
        const end = ((index + 1) * step).toFixed(2);
        return `${color} ${start}% ${end}%`;
    }).join(", ");
    randomButton.style.setProperty("--wheel-gradient", gradientStops);
}

function setupRandomButton() {
    let spinResetTimer = 0;

    const triggerSpinBurst = () => {
        randomButton.classList.remove("spin-burst");
        void randomButton.offsetWidth;
        randomButton.classList.add("spin-burst");
        window.clearTimeout(spinResetTimer);
        spinResetTimer = window.setTimeout(() => {
            randomButton.classList.remove("spin-burst");
        }, 900);
    };

    randomButton.addEventListener("pointerenter", () => randomButton.classList.add("is-spinning"));
    randomButton.addEventListener("pointerleave", () => randomButton.classList.remove("is-spinning"));
    randomButton.addEventListener("focus", () => randomButton.classList.add("is-spinning"));
    randomButton.addEventListener("blur", () => randomButton.classList.remove("is-spinning"));
    randomButton.addEventListener("pointerdown", triggerSpinBurst);
    randomButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") triggerSpinBurst();
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

function smoothScrollToTop(duration = 600) {
    return new Promise((resolve) => {
        const start = window.scrollY;
        const startTime = performance.now();
        
        function easeOutQuad(t) {
            return t * (2 - t); // smooth deceleration
        }
        
        function scroll(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = easeOutQuad(progress);
            window.scrollTo(0, start * (1 - easeProgress));
            
            if (progress < 1) {
                requestAnimationFrame(scroll);
            } else {
                resolve();
            }
        }
        
        requestAnimationFrame(scroll);
    });
}

async function goBack() {
    stopGlobalAudio();
    autoplay = false;
    await smoothScrollToTop(700);
    episodeSection.classList.add("hidden");
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
        const sumEl = card.querySelector('[data-field="summary"]');
        if (sumEl) sumEl.innerHTML = summary;
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
    markHeard(ep.id);
    const url = ep.audio || ep.url;
    const cards = document.querySelectorAll(".episode-card");
    cards.forEach((c, i) => c.classList.toggle("disabled", i !== index));
    resetButtons();
    hideProgressBars();
    const playingCard = episodeList.querySelector(`.episode-card:nth-child(${index + 1})`);
    showProgressBar(playingCard);
    const btn = episodeList.querySelector(`.play-stop-btn[data-index="${index}"]`);
    if (btn) {
        const playIcon = btn.querySelector(".play-icon");
        const stopIcon = btn.querySelector(".stop-icon");
        if (playIcon) playIcon.classList.add("hidden");
        if (stopIcon) stopIcon.classList.remove("hidden");
        btn.classList.add("playing");
    }
    audioPlayer.src = url;
    audioPlayer.play();
    audioPlayer.onended = () => {
        if (autoplay && index + 1 < renderedEpisodes.length) playEpisode(index + 1);
        else stopGlobalAudio();
    };
}


function resetButtons() {
    document.querySelectorAll(".play-stop-btn").forEach(btn => {
        const playIcon = btn.querySelector(".play-icon");
        const stopIcon = btn.querySelector(".stop-icon");
        if (playIcon) playIcon.classList.remove("hidden");
        if (stopIcon) stopIcon.classList.add("hidden");
        btn.classList.remove("playing");
    });
}

function stopGlobalAudio() {
    hideProgressBars();
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.onended = null;
    resetButtons();
    document.querySelectorAll(".episode-card").forEach(card => card.classList.remove("disabled"));
}



// --- Progress Bar Helpers ---
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function setupProgressBar() {
    audioPlayer.addEventListener('timeupdate', () => {
        const container = document.querySelector('.progress-container:not(.hidden)');
        if (!container) return;
        const playingCard = container.closest('.episode-card');
        if (!playingCard) return;
        const fillEl = playingCard.querySelector('.progress-fill');
        const currEl = playingCard.querySelector('.current-time');
        const totalEl = playingCard.querySelector('.total-time');
        
        if (audioPlayer.duration && fillEl) {
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            fillEl.style.width = percent + '%';
            currEl.textContent = formatTime(audioPlayer.currentTime);
            totalEl.textContent = formatTime(audioPlayer.duration);
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        const container = document.querySelector('.progress-container:not(.hidden)');
        if (!container) return;
        const playingCard = container.closest('.episode-card');
        if (!playingCard) return;
        const totalEl = playingCard.querySelector('.total-time');
        totalEl.textContent = formatTime(audioPlayer.duration);
    });
}

function showProgressBar(card) {
    if (!card) return;
    card.querySelectorAll('.progress-container').forEach(c => c.classList.remove('hidden'));
}

function hideProgressBars() {
    document.querySelectorAll('.progress-container').forEach(c => c.classList.add('hidden'));
}


// Progress Bar Click Handler (Spulen)
function setupProgressBarClick() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.progress-bar') || e.target.closest('.progress-fill')) return;
        const bar = e.target.closest('.progress-bar');
        if (!bar || !audioPlayer.duration) return;
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = Math.max(0, Math.min(percent * audioPlayer.duration, audioPlayer.duration));
    });
}

window.addEventListener("DOMContentLoaded", fetchPodcasts);
