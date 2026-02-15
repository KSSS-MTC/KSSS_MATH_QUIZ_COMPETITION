// Extract grade from URL or filename
const pageName = window.location.pathname.split("/").pop() || "";
const urlParams = new URLSearchParams(window.location.search);
const gradeFromQuery = urlParams.get("grade");
const gradeFromFile = (pageName.match(/grade(\d+)/i) || [])[1];
const grade = gradeFromQuery || gradeFromFile || "10";
const DATA_VERSION = "2.1.0";
const jsonFile = `../data/competition-grade${grade}.json?v=${encodeURIComponent(DATA_VERSION)}`;
const THEME_STORAGE_KEY = "ksss-user-theme";

// Initialize theme before content loads
initializeTheme();

// Update page title
const pageTitle = document.getElementById("page-title");
if (pageTitle) {
  pageTitle.textContent = `Grade ${grade} – Math Quiz Competition`;
  document.title = `Grade ${grade} Math Quiz Bracket`;
}

fetch(jsonFile)
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load data for Grade ${grade}`);
    }
    return res.json();
  })
  .then((data) => {
    try {
      const bracket = document.getElementById("bracket");
      if (!bracket) return;

      const rounds = Array.isArray(data?.rounds) ? data.rounds : [];

      rounds.forEach((round) => {
        const roundDiv = document.createElement("div");
        roundDiv.className = "round";

        const title = document.createElement("div");
        title.className = "round-title";
        title.textContent = round?.name || "Unnamed Round";
        roundDiv.appendChild(title);

        const matchList = Array.isArray(round?.matches) ? [...round.matches] : [];
        const sortedMatches = matchList.sort((a, b) => {
          const isPendingA = isMatchPending(a);
          const isPendingB = isMatchPending(b);

          if (isPendingA && !isPendingB) return 1;
          if (!isPendingA && isPendingB) return -1;
          if (isPendingA && isPendingB) return 0;

          const dateA = parseScheduleDate(a?.schedule);
          const dateB = parseScheduleDate(b?.schedule);
          return dateA - dateB;
        });

        sortedMatches.forEach((match) => {
          const matchDiv = document.createElement("div");
          matchDiv.className = "match";

          const isBestLoser = match?.type === "best_loser";
          if (isBestLoser) {
            matchDiv.classList.add("best-loser-match");
            const badge = document.createElement("div");
            badge.className = "best-loser-badge";
            badge.textContent = "🏆 BEST LOSER PLAYOFF";
            matchDiv.appendChild(badge);
          }

          if (match?.schedule) {
            const scheduleDiv = document.createElement("div");
            scheduleDiv.className = "match-schedule";
            scheduleDiv.innerHTML = `
              <div class="schedule-date">${match.schedule.date ?? "Pending"}</div>
              <div class="schedule-time">${match.schedule.time ?? "TBD"}</div>
              <div class="schedule-location">${match.schedule.location ?? "Maths Lab"}</div>
            `;
            matchDiv.appendChild(scheduleDiv);
          }

          const teamAData = match?.teamA ?? {};
          const teamBData = match?.teamB ?? {};
          const teamA = createTeam(teamAData);
          const teamB = createTeam(teamBData);

          const vs = document.createElement("div");
          vs.className = "vs";
          vs.textContent = "VS";

          if (teamAData.points !== null && teamAData.points !== undefined && teamBData.points !== null && teamBData.points !== undefined) {
            teamA.querySelector(".points").style.display = "inline-block";
            teamB.querySelector(".points").style.display = "inline-block";

            if (teamAData.points > teamBData.points) {
              teamA.classList.add("leading");
            } else if (teamBData.points > teamAData.points) {
              teamB.classList.add("leading");
            }
          }

          if (match?.winner === teamAData?.name) teamA.classList.add("winner");
          if (match?.winner === teamBData?.name) teamB.classList.add("winner");

          const matchTeamsDiv = document.createElement("div");
          matchTeamsDiv.className = "match-teams";
          matchTeamsDiv.appendChild(teamA);
          matchTeamsDiv.appendChild(vs);
          matchTeamsDiv.appendChild(teamB);

          matchDiv.appendChild(matchTeamsDiv);
          roundDiv.appendChild(matchDiv);
        });

        bracket.appendChild(roundDiv);
      });
    } catch (error) {
      renderBracketError(`Could not render bracket for Grade ${grade}.`);
    }
  })
  .catch((error) => {
    renderBracketError(error?.message || `Failed to load data for Grade ${grade}.`);
  });

// Render error message for bracket loading failures
function renderBracketError(message) {
  const bracket = document.getElementById("bracket");
  if (!bracket) return;
  bracket.innerHTML = `
    <div style="text-align: center; padding: 50px; color: var(--danger, #ef4444);">
      <h2 style="color: var(--danger, #ef4444);">⚠️ Error Loading Bracket</h2>
      <p>${message}</p>
      <p>Please check if Grade ${grade} data exists.</p>
    </div>
  `;
}

// Helper function to create team element
function createTeam(team) {
  const div = document.createElement("div");
  div.className = "team";

  const name = document.createElement("span");
  name.className = "team-name";
  name.textContent = team?.name || "TBD";

  const points = document.createElement("span");
  points.className = "points";
  points.textContent = team?.points !== null && team?.points !== undefined ? `${team.points} pts` : "";

  div.appendChild(name);
  div.appendChild(points);

  return div;
}

// Helper to check if a match has pending schedule
function isMatchPending(match) {
  return isPendingSchedule(match?.schedule);
}

// Check if schedule contains pending or TBD values
function isPendingSchedule(schedule) {
  const dateValue = String(schedule?.date ?? "").toLowerCase().trim();
  const timeValue = String(schedule?.time ?? "").toLowerCase().trim();
  return (
    dateValue === "" ||
    dateValue.includes("pending") ||
    dateValue.includes("tbd") ||
    timeValue.includes("pending") ||
    timeValue.includes("tbd")
  );
}

// Parse schedule date with fallback handling
function parseScheduleDate(schedule) {
  if (!schedule || isPendingSchedule(schedule)) {
    return new Date("9999-12-31T23:59:59");
  }

  const rawDate = String(schedule.date ?? "").trim();
  const rawTime = String(schedule.time ?? "").trim();

  // Try direct parsing (supports ISO and other standard formats)
  const directCandidate = `${rawDate} ${rawTime}`.trim();
  const directDate = new Date(directCandidate);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  // Fallback: normalize date and add current year
  const normalizedDate = rawDate.includes(",") ? rawDate.split(",").slice(1).join(",").trim() : rawDate;
  const currentYear = new Date().getFullYear();
  const fallbackCandidate = `${normalizedDate} ${currentYear} ${rawTime}`.trim();
  const fallbackDate = new Date(fallbackCandidate);

  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return new Date("9999-12-31T23:59:59");
}

// Initialize and manage theme toggle
function initializeTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = storedTheme || (prefersDark ? "dark" : "light");

  applyTheme(initialTheme);

  const toggleButton = document.getElementById("theme-toggle");
  if (!toggleButton) return;

  toggleButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  });
}

// Apply theme to document and update toggle icon
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

