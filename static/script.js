import { DATA_VERSION } from '../common/constants.js';
import { initTheme, setupThemeToggle } from '../common/theme.js';
import { parseScheduleDate, isPendingSchedule } from '../common/dateParser.js';
import { showError, initGlobalErrorHandlers } from '../common/errorHandler.js';

// Determine grade from URL
const urlParams = new URLSearchParams(window.location.search);
const grade = urlParams.get("grade") || "10";

// Update page title
const pageTitle = document.getElementById("page-title");
if (pageTitle) {
  pageTitle.textContent = `Grade ${grade} – Math Quiz Competition`;
  document.title = `Grade ${grade} Math Quiz Bracket`;
}

// Theme setup
initTheme();
setupThemeToggle();

const bracketContainer = document.getElementById("bracket");
if (!bracketContainer) throw new Error("Bracket container not found");

// Set up global error catching – any uncaught error will show here
initGlobalErrorHandlers(bracketContainer);

const jsonFile = `../data/competition-grade${grade}.json?v=${DATA_VERSION}`;

fetch(jsonFile)
  .then(res => {
    if (!res.ok) throw new Error(`Failed to load data for Grade ${grade}`);
    return res.json();
  })
  .then(data => {
    try {
      const rounds = Array.isArray(data?.rounds) ? data.rounds : [];

      rounds.forEach((round, index) => {
        const roundDiv = document.createElement("div");
        roundDiv.className = "round";
        // Add a class for visual distinction (e.g., round-1, round-2)
        roundDiv.classList.add(`round-${round.id || index + 1}`);

        const title = document.createElement("div");
        title.className = "round-title";
        title.textContent = round?.name || "Unnamed Round";
        roundDiv.appendChild(title);

        const matchList = Array.isArray(round?.matches) ? [...round.matches] : [];
        const sortedMatches = matchList.sort((a, b) => {
          const pendingA = isMatchPending(a);
          const pendingB = isMatchPending(b);
          if (pendingA && !pendingB) return 1;
          if (!pendingA && pendingB) return -1;
          if (pendingA && pendingB) return 0;
          const dateA = parseScheduleDate(a?.schedule);
          const dateB = parseScheduleDate(b?.schedule);
          return dateA - dateB;
        });

        sortedMatches.forEach(match => {
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

          const teamA = createTeam(match?.teamA || {});
          const teamB = createTeam(match?.teamB || {});

          const vs = document.createElement("div");
          vs.className = "vs";
          vs.textContent = "VS";

          const teamAData = match?.teamA || {};
          const teamBData = match?.teamB || {};

          if (teamAData.points != null && teamBData.points != null) {
            teamA.querySelector(".points").style.display = "inline-block";
            teamB.querySelector(".points").style.display = "inline-block";
            if (teamAData.points > teamBData.points) teamA.classList.add("leading");
            else if (teamBData.points > teamAData.points) teamB.classList.add("leading");
          }

          if (match?.winner === teamAData.name) teamA.classList.add("winner");
          if (match?.winner === teamBData.name) teamB.classList.add("winner");

          const matchTeamsDiv = document.createElement("div");
          matchTeamsDiv.className = "match-teams";
          matchTeamsDiv.appendChild(teamA);
          matchTeamsDiv.appendChild(vs);
          matchTeamsDiv.appendChild(teamB);
          matchDiv.appendChild(matchTeamsDiv);
          roundDiv.appendChild(matchDiv);
        });

        bracketContainer.appendChild(roundDiv);
      });
    } catch (err) {
      showError(bracketContainer, `Could not render bracket for Grade ${grade}.`, false);
    }
  })
  .catch(err => {
    showError(bracketContainer, err.message || `Failed to load data for Grade ${grade}.`, true);
  });

function createTeam(team) {
  const div = document.createElement("div");
  div.className = "team";

  const name = document.createElement("span");
  name.className = "team-name";
  name.textContent = team?.name || "TBD";

  const points = document.createElement("span");
  points.className = "points";
  points.textContent = team?.points != null ? `${team.points} pts` : "";

  div.appendChild(name);
  div.appendChild(points);
  return div;
}

function isMatchPending(match) {
  return isPendingSchedule(match?.schedule);
}