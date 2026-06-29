// API: vollstaendiger Datensatz, damit jedes Thema genug Episoden hat
const PODCASTS_URL = "../api/podcasts.json";
const TOPICS_URL = "../config/topics.json";
const RANDOM_COLOR = "#e3be4d"; // Hintergrundfarbe des Zufall-Buttons
const EPISODES_PER_TOPIC = 3;
const VISIBLE_TOPICS = 4;
const FALLBACK_PALETTE = ["#7a5ce6", "#2c8c8c", "#c0562d", "#5a7d2c", "#a83a72", "#3a72a8"];

let podcastData = [];
let topics = [];          // bevorzugte Themen aus config/topics.json
let activeTopics = [];     // tatsaechlich angezeigte 4 Themen (mit Inhalt)
let renderedEpisodes = [];
let autoplay = false;
const audioPlayer = document.getElementById("global-player");
const episodeSection = document.getElementById("episode-section");
const episodeList = document.getElementById("episode-list");
const categoryGrid = document.getElementById("category-grid");

// --- Multimodales Feedback: kurzer Ton bei Klick (einmaliger AudioContext) ---
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
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(200, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
    } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(520, t + 0.09);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
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

function topicMatches(item, topic) {
    const set = tagsOf(item);
    return topic.tags.some(t => set.includes(String(t).toLowerCase()));
}

function countEpisodes(topic) {
    return podcastData.filter(it => topicMatches(it, topic)).length;
}

// Waehlt 4 Themen, die garantiert Episoden haben. Reicht die Wunschliste nicht,
// werden zufaellige Themen aus den vorhandenen Feed-Tags ergaenzt.
function buildActiveTopics() {
    const used = new Set();
    const result = topics.filter(t => countEpisodes(t) > 0).slice(0, VISIBLE_TOPICS);
    result.forEach(t => used.add(t.id));

    if (result.length < VISIBLE_TOPICS) {
        const allTags = [...new Set(podcastData.flatMap(tagsOf))]
            .filter(tag => !result.some(t => t.tags.map(x => x.toLowerCase()).includes(tag)));
        for (let i = allTags.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTags[i], allTags[j]] = [allTags[j], allTags[i]];
        }
        let p = 0;
        for (const tag of allTags) {
            if (result.length >= VISIBLE_TOPICS) break;
            if (used.has(tag)) continue;
            result.push({ id: tag, label: tag, color: FALLBACK_PALETTE[p % FALLBACK_PALETTE.length], tags: [tag] });
            used.add(tag); p++;
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

function showTopic(topic) {
    stopGlobalAudio();
    autoplay = false;
    const filtered = podcastData.filter(it => topicMatches(it, topic)).slice(0, EPISODES_PER_TOPIC);
    if (filtered.length === 0) {
        renderedEpisodes = [];
        episodeList.innerHTML = `<p class="empty-note">Keine aktuellen Episoden zu diesem Thema gefunden.</p>`;
    } else {
        renderEpisodes(filtered);
    }
    openSection(topic.color || "#7cd1e8");
}

function showRandom() {
    stopGlobalAudio();
    autoplay = true;
    const shuffled = [...podcastData].sort(() => Math.random() - 0.5).slice(0, 5);
    renderEpisodes(shuffled);
    openSection(RANDOM_COLOR);
    if (shuffled.length) setTimeout(() => playEpisode(0), 100);
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
