const API_URL = 'https://johappel.github.io/selected-podcasts/api/latest.json';

// Farb-Mapping passend zu den CSS-Klassen/Buttons
const colors = {
    politik: '#a84343',
    geschichte: '#3b52ab',
    interview: '#3b52ab', // Fallback, falls im Feed "interview" statt "geschichte" steht
    kunst: '#5ce676',
    musik: '#b55ce6'
};

let podcastData = [];
const audioPlayer = document.getElementById('global-player');
const episodeSection = document.getElementById('episode-section');
const episodeList = document.getElementById('episode-list');

// 1. Daten laden beim Start
async function fetchPodcasts() {
    try {
        const response = await fetch(API_URL);
        podcastData = await response.json();
        initApp();
    } catch (error) {
        console.error("Fehler beim Laden der Podcast-Daten:", error);
    }
}

function initApp() {
    // Event-Listener für Kategorie-Buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.target.getAttribute('data-category');
            showCategory(cat);
        });
    });

    // Event-Listener für Zufall
    document.getElementById('btn-random').addEventListener('click', () => {
        // Stoppe eventuell laufende Musik vor dem Sprung
        stopGlobalAudio();
        
        // Zufällige Kategorie wählen
        const categories = Object.keys(colors).filter(c => c !== 'interview'); 
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        showCategory(randomCat);
    });
}

// 2. Kategorie anzeigen und rendern
function showCategory(category) {
    // Falls noch etwas spielt, stoppen
    stopGlobalAudio();

    // Filtere Episoden, die zur Kategorie gehören
    // (Bedenkt Groß-/Kleinschreibung aus der API)
    const filtered = podcastData.filter(item => 
        item.category && item.category.toLowerCase() === category.toLowerCase()
    ).slice(0, 3); // Maximal 3 Episoden anzeigen

    if (filtered.length === 0) {
        episodeList.innerHTML = `<p style="font-size:2rem; text-align:center;">Keine aktuellen Episoden zu diesem Thema gefunden.</p>`;
    } else {
        renderEpisodes(filtered);
    }

    // Design anpassen & Scrollen
    episodeSection.style.backgroundColor = colors[category] || '#7cd1e8';
    episodeSection.classList.remove('hidden');

    // Kurzer Timeout, damit das Display-None greift, bevor gescrollt wird
    setTimeout(() => {
        episodeSection.scrollIntoView({ behavior: 'smooth' });
    }, 50);
}

// 3. Episoden-Karten generieren
function renderEpisodes(episodes) {
    episodeList.innerHTML = '';

    episodes.forEach((ep, index) => {
        const card = document.createElement('div');
        card.className = 'episode-card';
        card.id = `ep-card-${index}`;

        // Fallbacks für fehlende Daten definieren
        const title = ep.title || 'Hörbeitrag ohne Titel';
        const host = ep.author || ep.podcast || 'Unbekannter Sender';
        const audioUrl = ep.audio || ep.url; // Je nachdem wie das Feld in der JSON heißt

        card.innerHTML = `
            <div class="episode-info">
                <h3 class="episode-title">${title}</h3>
                <p class="episode-meta">${host}</p>
            </div>
            <div class="controls">
                <button class="play-stop-btn" data-url="${audioUrl}" data-index="${index}">HÖREN</button>
                ${ep.link ? `<a href="${ep.link}" target="_blank" class="source-link">Zur Originalseite ↗</a>` : ''}
            </div>
        `;
        
        episodeList.appendChild(card);
    });

    // Event Listener für die neu erstellten Play-Buttons
    episodeList.querySelectorAll('.play-stop-btn').forEach(btn => {
        btn.addEventListener('click', handlePlayClick);
    });
}

// 4. Player-Steuerung (Exklusiver Fokus)
function handlePlayClick(e) {
    const btn = e.target;
    const url = btn.getAttribute('data-url');
    const currentIndex = btn.getAttribute('data-index');
    const cards = document.querySelectorAll('.episode-card');

    // Wenn dieser Button bereits spielt -> STOPPEN
    if (btn.classList.contains('playing')) {
        stopGlobalAudio();
        return;
    }

    // Ansonsten: Anderen Content sperren (Ausblenden/Deaktivieren)
    cards.forEach(card => {
        if (card.id !== `ep-card-${currentIndex}`) {
            card.classList.add('disabled');
        }
    });

    // Audio laden und abspielen
    audioPlayer.src = url;
    audioPlayer.play();

    // Button-Zustand ändern
    btn.textContent = 'STOPP';
    btn.classList.add('playing');

    // Falls das Audio von alleine endet, Zustand zurücksetzen
    audioPlayer.onended = () => {
        stopGlobalAudio();
    };
}

function stopGlobalAudio() {
    audioPlayer.pause();
    audioPlayer.src = '';

    // Alle Buttons zurücksetzen
    document.querySelectorAll('.play-stop-btn').forEach(btn => {
        btn.textContent = 'HÖREN';
        btn.classList.remove('playing');
    });

    // Alle Karten wieder freigeben
    document.querySelectorAll('.episode-card').forEach(card => {
        card.classList.remove('disabled');
    });
}



// Funktion erzeugt einen kurzen, barrierefreien Klick-Ton
function playFeedbackSound(type = 'click') {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'click') {
        // Sanfter, ansteigender Aktivierungston
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); // Startfrequenz
        oscillator.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // Lautstärke
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'stop') {
        // Dumpfer, abfallender Stopp-Ton
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12);
    }
}

// Starten
window.addEventListener('DOMContentLoaded', fetchPodcasts);
