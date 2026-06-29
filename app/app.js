// API liegt relativ zum Frontend unter /api (lokal via dev-server und auf GitHub Pages)
const API_URL = "../api/latest-20.json";

// Farb-Mapping passend zu den CSS-Klassen/Buttons (Schluessel = data-category bzw. Tag)
const colors = {
    politik: "#a84343",
    geschichte: "#3b52ab",
    interview: "#3b52ab", // Fallback, falls statt "geschichte" ein anderer Tag genutzt wird
    kunst: "#5ce676",
    musik: "#b55ce6"
};

let podcastData = [];
const audioPlayer = document.getElementById("global-player");
const episodeSection = document.getElementById("episode-section");
const episodeList = document.getElementById("episode-list");

// 1. Daten laden beim Start
async function fetchPodcasts() {
    try {
        const response = await fetch(API_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`API ${response.status}`);
        }
        podcastData = await response.json();
        initApp();
    } catch (error) {
        console.error("Fehler beim Laden der Podcast-Daten:", error);
    }
}

function initApp() {
    document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const cat = e.target.getAttribute("data-category");
            showCategory(cat);
        });
    });

    document.getElementById("btn-random").addEventListener("click", () => {
        stopGlobalAudio();
        const categories = Object.keys(colors).filter(c => c !== "interview");
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        showCategory(randomCat);
    });
}

// Tags und Kategorien der API sind Arrays -> normalisiert auf Kleinbuchstaben pruefen
function matchesCategory(item, category) {
    const needle = category.toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const cats = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    return [...tags, ...cats].some(t => String(t).toLowerCase() === needle);
}

// 2. Kategorie anzeigen und rendern
function showCategory(category) {
    stopGlobalAudio();

    const filtered = podcastData.filter(item => matchesCategory(item, category)).slice(0, 3);

    if (filtered.length === 0) {
        episodeList.innerHTML = `<p style="font-size:2rem; text-align:center;">Keine aktuellen Episoden zu diesem Thema gefunden.</p>`;
    } else {
        renderEpisodes(filtered);
    }

    episodeSection.style.backgroundColor = colors[category] || "#7cd1e8";
    episodeSection.classList.remove("hidden");

    setTimeout(() => {
        episodeSection.scrollIntoView({ behavior: "smooth" });
    }, 50);
}

// 3. Episoden-Karten generieren
function renderEpisodes(episodes) {
    episodeList.innerHTML = "";

    episodes.forEach((ep, index) => {
        const card = document.createElement("div");
        card.className = "episode-card";
        card.id = `ep-card-${index}`;

        const title = ep.title || "Hörbeitrag ohne Titel";
        const host = ep.sourceTitle || ep.source || "Unbekannter Sender";
        const audioUrl = ep.audio || ep.url;
        const link = ep.url;

        card.innerHTML = `
            <div class="episode-info">
                <h3 class="episode-title">${title}</h3>
                <p class="episode-meta">${host}</p>
            </div>
            <div class="controls">
                <button class="play-stop-btn" data-url="${audioUrl}" data-index="${index}">HÖREN</button>
                ${link ? `<a href="${link}" target="_blank" rel="noopener" class="source-link">Zur Originalseite</a>` : ""}
            </div>
        `;

        episodeList.appendChild(card);
    });

    episodeList.querySelectorAll(".play-stop-btn").forEach(btn => {
        btn.addEventListener("click", handlePlayClick);
    });
}

// 4. Player-Steuerung (Exklusiver Fokus)
function handlePlayClick(e) {
    const btn = e.target;
    const url = btn.getAttribute("data-url");
    const currentIndex = btn.getAttribute("data-index");
    const cards = document.querySelectorAll(".episode-card");

    if (btn.classList.contains("playing")) {
        stopGlobalAudio();
        return;
    }

    cards.forEach(card => {
        if (card.id !== `ep-card-${currentIndex}`) {
            card.classList.add("disabled");
        }
    });

    audioPlayer.src = url;
    audioPlayer.play();

    btn.textContent = "STOPP";
    btn.classList.add("playing");

    audioPlayer.onended = () => {
        stopGlobalAudio();
    };
}

function stopGlobalAudio() {
    audioPlayer.pause();
    audioPlayer.src = "";

    document.querySelectorAll(".play-stop-btn").forEach(btn => {
        btn.textContent = "HÖREN";
        btn.classList.remove("playing");
    });

    document.querySelectorAll(".episode-card").forEach(card => {
        card.classList.remove("disabled");
    });
}

// Starten
window.addEventListener("DOMContentLoaded", fetchPodcasts);
