document.addEventListener('DOMContentLoaded', () => {
    console.info("Designed with ❤️ by trchicuong.");

    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.querySelector('main');
    const backgroundMusic = document.getElementById('background-music');
    backgroundMusic.volume = 0.2;
    const canvas = document.getElementById('star-background');
    const ctx = canvas.getContext('2d');
    const titleElement = document.getElementById('main-title');
    const cursorLight = document.getElementById('cursor-light');
    const cursorDot = document.getElementById('cursor-dot');
    const volumeControl = document.getElementById('volume-control');
    const volumeOnIcon = document.getElementById('volume-on-icon');
    const volumeOffIcon = document.getElementById('volume-off-icon');

    let stars = [];
    let numStars = 500;
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let audioEnabled = false;
    let synth, noiseSynth;

    function setupAudio() {
        synth = new Tone.FMSynth({ harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }, modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 } }).toDestination();
        noiseSynth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        audioEnabled = true;
    }

    splashScreen.addEventListener('click', () => {
        backgroundMusic.play().catch(e => console.error("Audio play failed:", e));
        if (!audioEnabled && Tone.context.state !== 'running') { Tone.start().then(setupAudio); }

        document.body.style.overflow = 'auto';

        splashScreen.classList.add('fade-out');
        mainContent.classList.add('visible');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            titleElement.textContent = '';
            titleElement.classList.add('typing-cursor');
            setTimeout(typeWriter, 500);
        }, 1000);
    }, { once: true });

    volumeControl.addEventListener('click', () => {
        backgroundMusic.muted = !backgroundMusic.muted;
        volumeOnIcon.classList.toggle('hidden');
        volumeOffIcon.classList.toggle('hidden');
    });

    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX; mouse.y = e.clientY;
        cursorLight.style.left = `${mouse.x}px`; cursorLight.style.top = `${mouse.y}px`;
        cursorDot.style.left = `${mouse.x}px`; cursorDot.style.top = `${mouse.y}px`;
    });

    const textToType = titleElement.getAttribute('data-text');
    let i = 0;
    function typeWriter() {
        if (i < textToType.length) {
            titleElement.textContent += textToType.charAt(i); i++;
            setTimeout(typeWriter, 150);
        }
    }

    function setCanvasSize() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        numStars = Math.floor((canvas.width * canvas.height) / 3500);
    }

    class Star {
        constructor() { this.reset(); }
        reset() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = Math.random() * 2 + 0.5; this.speed = this.size * 0.05; this.opacity = Math.random() * 0.5 + 0.5; }
        update() {
            const dx = (mouse.x - canvas.width / 2) / (canvas.width / 2);
            const dy = (mouse.y - canvas.height / 2) / (canvas.height / 2);
            this.x -= dx * this.speed; this.y -= dy * this.speed;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) { this.reset(); }
        }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; ctx.fill(); }
    }

    function initStars() { stars = []; for (let i = 0; i < numStars; i++) stars.push(new Star()); }
    function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); stars.forEach(star => { star.update(); star.draw(); }); requestAnimationFrame(animate); }

    window.addEventListener('resize', () => { setCanvasSize(); initStars(); });

    setCanvasSize(); initStars(); animate();

    // --- LANYARD DISCORD ACTIVITY ---
    const DISCORD_ID = import.meta.env.VITE_ID_DISCORD;
    const activityContainer = document.getElementById('discord-activity');
    let lanyardSocket;
    let heartbeatInterval;
    let activityTimestampInterval = null;

    function connectLanyard() {
        if (lanyardSocket && lanyardSocket.readyState === WebSocket.OPEN) { return; }
        lanyardSocket = new WebSocket("wss://api.lanyard.rest/socket");

        lanyardSocket.onopen = () => {
            lanyardSocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
        };

        lanyardSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.op === 1) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => {
                    if (lanyardSocket.readyState === WebSocket.OPEN) {
                        lanyardSocket.send(JSON.stringify({ op: 3 }));
                    }
                }, data.d.heartbeat_interval);
            } else if (data.op === 0 && (data.t === "INIT_STATE" || data.t === "PRESENCE_UPDATE")) {
                updateActivity(data.d);
            }
        };

        lanyardSocket.onclose = () => {
            clearInterval(heartbeatInterval);
            clearInterval(activityTimestampInterval);
            setTimeout(connectLanyard, 5000);
        };

        lanyardSocket.onerror = (error) => {
            console.error("Lanyard WebSocket error:", error);
            lanyardSocket.close();
        };
    }

    function updateActivity(d) {
        if (!activityContainer || !d || !d.discord_user) return;

        clearInterval(activityTimestampInterval);

        const activity = d.activities?.find(act => act.type === 0);
        const spotify = d.spotify;

        const userAvatar = d.discord_user.avatar
            ? `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.webp`
            : `https://cdn.discordapp.com/embed/avatars/0.png`;

        let username = d.discord_user.username;
        let statusLine = '';
        let activityImageHtml = '';
        const startTime = spotify?.timestamps?.start || activity?.timestamps?.start;

        if (activity && activity.assets?.large_image) {
            const imageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.webp`;
            statusLine = `${activity.details || activity.name}`;
            activityImageHtml = `<img src="${imageUrl}" alt="${activity.assets?.large_text || activity.name}" class="activity-thumbnail">`;
        } else if (spotify) {
            statusLine = `Listening to ${spotify.song}`;
            activityImageHtml = `<img src="${spotify.album_art_url}" alt="Spotify Album Art" class="activity-thumbnail">`;
        } else {
            const statusMap = { 'online': 'Online', 'idle': 'Idle', 'dnd': 'Do Not Disturb', 'offline': 'Offline' };
            statusLine = statusMap[d.discord_status] || 'Offline';
        }

        const statusIconMap = {
            online: '🟢',
            idle: '🌙',
            dnd: '⛔',
            offline: '⚪'
        };
        const statusIcon = statusIconMap[d.discord_status] || '⚪';

        const content = `
                <div id="discord-activity-card">
                    <div class="relative flex-shrink-0">
                        <img src="${userAvatar}" alt="Discord Avatar" class="discord-avatar">
                        <span id="discord-status-icon" class="status-${d.discord_status}">${statusIcon}</span>
                    </div>
                    <div class="activity-text flex-grow">
                        <p class="font-bold text-white text-lg">${username}</p>
                        <p class="text-sm">${statusLine}</p>
                        ${startTime ? '<p class="text-xs text-green-400" id="activity-timestamp"></p>' : ''}
                    </div>
                    ${activityImageHtml}
                </div>
            `;

        activityContainer.innerHTML = content;
        activityContainer.style.opacity = '1';

        if (startTime) {
            const timestampElement = document.getElementById('activity-timestamp');

            const updateTimer = () => {
                if (!timestampElement) {
                    clearInterval(activityTimestampInterval);
                    return;
                }
                const elapsed = Date.now() - startTime;
                const totalSeconds = Math.floor(elapsed / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                const paddedMinutes = String(minutes).padStart(2, '0');
                const paddedSeconds = String(seconds).padStart(2, '0');

                let timeString = '';
                if (hours > 0) {
                    const paddedHours = String(hours).padStart(2, '0');
                    timeString = `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
                } else {
                    timeString = `${paddedMinutes}:${paddedSeconds}`;
                }
                timestampElement.textContent = `${timeString} elapsed`;
            };

            updateTimer();
            activityTimestampInterval = setInterval(updateTimer, 1000);
        }
    }

    if (DISCORD_ID && DISCORD_ID !== "YOUR_DISCORD_ID_HERE") {
        connectLanyard();
    }
});