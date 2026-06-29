// API liegt relativ zum Frontend unter /api (lokal via dev-server und auf GitHub Pages)
const API_URL = "../api/latest-20.json";

// Farb-Mapping passend zu den CSS-Klassen/Buttons (Schluessel = data-category bzw. Tag)
const colors = {
    politik: "#a84343",
    geschichte: "#3b52ab",
    interview: "#3b52ab",
    kunst: "#5ce676",
    musik: "#b55ce6"
};
const RANDOM_COLOR = "#e3be4d"; // Hintergrundfarbe des Zufall-Buttons

let podcastData = [];
let renderedEpisodes = [];
let autoplay = false; // Zufallsmodus: nach Ende automatisch naechste Episode
const audioPlayer = document.getElementById("global-player");
const episodeSection = document.getElementById("episode-section");
const episodeList = document.getElementById("episode-list");

// --- Multimodales Feedback: kurzer Ton bei Klick (einmaliger AudioContext) ---
let audioCtx = null;
function playFeedbackSound(type = "click") {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
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
        const response = await fetch(API_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        podcastData = await response.json();
        initApp();
    } catch (error) {
        console.error("Fehler beim Laden der Podcast-Daten:", error);
    }
}

function initApp() {
    document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            playFeedbackSound("click");
            showCategory(e.currentTarget.getAttribute("data-category"));
        });
    });

    document.getElementById("btn-random").addEventListener("click", () => {
        playFeedbackSound("click");
        showRandom();
    });

    document.getElementById("btn-back").addEventListener("click", () => {
        playFeedbackSound("stop");
        goBack();
    });

    // Karten zusammenklappen, wenn ausserhalb geklickt wird
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".episode-card")) {
            document.querySelectorAll(".episode-card.expanded").forEach(c => c.classList.remove("expanded"));
        }
    });
}

function matchesCategory(item, category) {
    const needle = category.toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const cats = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    return [...tags, ...cats].some(t => String(t).toLowerCase() === needle);
}

function showCategory(category) {
    stopGlobalAudio();
    autoplay = false;
    const filtered = podcastData.filter(item => matchesCategory(item, category)).slice(0, 3);
    if (filtered.length === 0) {
        renderedEpisodes = [];
        episodeList.innerHTML = `<p class="empty-note">Keine aktuellen Episoden zu diesem Thema gefunden.</p>`;
    } else {
        renderEpisodes(filtered);
    }
    openSection(colors[category] || "#7cd1e8");
}

function showRandom() {
    stopGlobalAudio();
    autoplay = true;
    const shuffled = [...podcastData].sort(() => Math.random() - 0.5).slice(0, 5);
    renderEpisodes(shuffled);
    openSection(RANDOM_COLOR);
    if (shuffled.length) {
        setTimeout(() => playEpisode(0), 100);
    }
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
            if (e.currentTarget.classList.contains("playing")) {
                playFeedbackSound("stop");
                stopGlobalAudio();
            } else {
                playFeedbackSound("click");
                playEpisode(index);
            }
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
        if (autoplay && index + 1 < renderedEpisodes.length) {
            playEpisode(index + 1);
        } else {
            stopGlobalAudio();
        }
    };
}

function resetButtons() {
    document.querySelectorAll(".play-stop-btn").forEach(btn => {
        btn.textContent = "HÖREN";
        btn.classList.remove("playing");
    });
}

function stopGlobalAudio() {
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.onended = null;
    resetButtons();
    document.querySelectorAll(".episode-card").forEach(card => card.classList.remove("disabled"));
}

window.addEventListener("DOMContentLoaded", fetchPodcasts);
