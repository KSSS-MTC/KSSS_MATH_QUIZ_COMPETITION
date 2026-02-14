const CONFIG = {
    owner: "KSSS-MTC",
    repo: "KSSS_MATH_QUIZ_COMPETITION"
};

let currentUser = "";
let githubToken = "";
let currentData = null;
let currentSha = "";

function login() {
    currentUser = document.getElementById("admin-name").value;
    githubToken = document.getElementById("gh-token").value.trim();

    if (!currentUser || !githubToken)
        return alert("Mr. President, please select your name and paste your token.");

    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("grade-section").classList.remove("hidden");
    document.getElementById("admin-display").innerHTML =
        `✅ Authenticated: ${currentUser}`;
}

async function loadMatches() {
    const grade = document.getElementById("grade-select").value;
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data/competition-grade${grade}.json`;

    document.getElementById("loading-overlay").classList.remove("hidden");
    document.getElementById("editor-section").classList.add("hidden");
    showStatus("Connecting to GitHub...", "#3b82f6");

    try {
        const res = await fetch(url, {
            headers: { Authorization: `token ${githubToken}` }
        });

        if (!res.ok) throw new Error(`GitHub Error: ${res.status}`);

        const json = await res.json();
        currentSha = json.sha;

        const decoded = decodeURIComponent(escape(atob(json.content)));
        currentData = JSON.parse(decoded);

        renderForm();

        document.getElementById("loading-overlay").classList.add("hidden");
        document.getElementById("editor-section").classList.remove("hidden");
        showStatus("Matches Loaded Successfully", "#16a34a");
    } catch (e) {
        document.getElementById("loading-overlay").classList.add("hidden");
        console.error(e);
        showStatus(`Error: ${e.message}`, "#ef4444");
    }
}

function renderForm() {
    const container = document.getElementById("matches-list");
    container.innerHTML = "";

    currentData.rounds.forEach((round, rIdx) => {
        const isLocked = round.status === "locked";

        const divider = document.createElement("div");
        divider.className = "round-divider";
        divider.innerHTML = `
            <span>${round.name}</span>
            <span>${isLocked ? "🔒 ARCHIVED" : "🔓 EDITABLE"}</span>
        `;
        container.appendChild(divider);

        round.matches.forEach((m, mIdx) => {
            const card = document.createElement("div");
            card.className = `match-card ${isLocked ? "locked" : "active"}`;

            if (isLocked) {
                card.innerHTML = `
                    <div style="font-size:12px; color:#64748b;">
                        ${m.schedule.date ?? "-"} |
                        ${m.schedule.time ?? "-"} |
                        ${m.schedule.location ?? "-"}
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-top:10px; font-weight:bold;">
                        <span>${m.teamA.name}: ${m.teamA.points ?? "-"}</span>
                        <span>VS</span>
                        <span>${m.teamB.name}: ${m.teamB.points ?? "-"}</span>
                    </div>

                    <div style="color:var(--primary); font-size:12px; margin-top:5px; font-weight:bold;">
                        🏆 Winner: ${m.winner ?? "Pending"}
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
                        <div>
                            <label>Date</label>
                            <input type="text"
                                value="${m.schedule.date ?? ""}"
                                onchange="updateSchedule(${rIdx},${mIdx},'date',this.value)">
                        </div>
                        <div>
                            <label>Time</label>
                            <input type="text"
                                value="${m.schedule.time ?? ""}"
                                onchange="updateSchedule(${rIdx},${mIdx},'time',this.value)">
                        </div>
                        <div>
                            <label>Location</label>
                            <input type="text"
                                value="${m.schedule.location ?? ""}"
                                onchange="updateSchedule(${rIdx},${mIdx},'location',this.value)">
                        </div>
                    </div>

                    <div class="score-row">
                        <div>
                            <label>${m.teamA.name}</label>
                            <input type="number"
                                value="${m.teamA.points ?? ""}"
                                oninput="updateScores(${rIdx},${mIdx},'teamA',this.value)">
                        </div>

                        <div class="vs-label">VS</div>

                        <div>
                            <label>${m.teamB.name}</label>
                            <input type="number"
                                value="${m.teamB.points ?? ""}"
                                oninput="updateScores(${rIdx},${mIdx},'teamB',this.value)">
                        </div>
                    </div>

                    <div id="win-${rIdx}-${mIdx}" class="winner-box">
                        🏆 Winner: ${m.winner ?? "Pending"}
                    </div>
                `;
            }

            container.appendChild(card);
        });
    });
}

function updateSchedule(rIdx, mIdx, field, value) {
    currentData.rounds[rIdx].matches[mIdx].schedule[field] = value;
}

function updateScores(rIdx, mIdx, team, val) {
    const m = currentData.rounds[rIdx].matches[mIdx];

    if (val === "") {
        if (team === "teamA") m.teamA.points = null;
        else m.teamB.points = null;
    } else {
        const pts = parseInt(val);
        if (team === "teamA") m.teamA.points = pts;
        else m.teamB.points = pts;
    }

    if (
        m.teamA.points !== null &&
        m.teamB.points !== null
    ) {
        if (m.teamA.points > m.teamB.points) m.winner = m.teamA.name;
        else if (m.teamB.points > m.teamA.points) m.winner = m.teamB.name;
        else m.winner = null;
    } else {
        m.winner = null;
    }

    const winBox = document.getElementById(`win-${rIdx}-${mIdx}`);
    if (winBox)
        winBox.innerText = `🏆 Winner: ${m.winner ?? "Pending"}`;
}

async function saveToGitHub() {
    const path = `data/competition-grade${currentData.grade}.json`;
    showStatus("Saving Changes...", "#f59e0b");

    try {
        const contentString = JSON.stringify(currentData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(contentString)));

        const res = await fetch(
            `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `token ${githubToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Update by President ${currentUser}`,
                    content: base64Content,
                    sha: currentSha
                })
            }
        );

        if (res.ok) {
            showStatus("✅ Saved Successfully!", "#16a34a");
            setTimeout(() => loadMatches(), 1500);
        } else {
            throw new Error("Failed to save. Check Token Permissions.");
        }
    } catch (e) {
        showStatus(`❌ ${e.message}`, "#ef4444");
    }
}

function showStatus(text, color) {
    const el = document.getElementById("status-msg");
    el.innerText = text;
    el.style.background = color;
    el.style.display = "block";

    if (color === "#16a34a")
        setTimeout(() => {
            el.style.display = "none";
        }, 4000);
}
