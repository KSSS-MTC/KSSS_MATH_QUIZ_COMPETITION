let pageName = window.location.pathname.split("/").pop();
let grade = pageName.replace(".html", "");
// Use ../ to jump out of the 'grades' folder into the root where 'data' lives
let jsonFile = `../data/competition-${grade}.json`;

fetch(jsonFile)
  .then(res => res.json())
  .then(data => {
    const bracket = document.getElementById("bracket");

    data.rounds.forEach(round => {
      const roundDiv = document.createElement("div");
      roundDiv.className = "round";

      const title = document.createElement("div");
      title.className = "round-title";
      title.textContent = round.name;
      roundDiv.appendChild(title);

      // --- 🟢 NEW SORTING LOGIC STARTS HERE ---
      // We sort the matches BEFORE creating the HTML elements
      const sortedMatches = round.matches.sort((a, b) => {
        // 1. Check if matches are "Pending" or "Panding"
        const isPendingA = isMatchPending(a);
        const isPendingB = isMatchPending(b);

        // If A is pending and B is not, A goes to the bottom (return 1)
        if (isPendingA && !isPendingB) return 1;
        // If B is pending and A is not, B goes to the bottom (A stays top)
        if (!isPendingA && isPendingB) return -1;
        // If both are pending, keep them in their original order
        if (isPendingA && isPendingB) return 0;

        // 2. If neither is pending, sort by Date (Soonest first)
        const dateA = parseDate(a.schedule.date);
        const dateB = parseDate(b.schedule.date);

        return dateA - dateB;
      });
      // --- 🔴 END SORTING LOGIC ---

      sortedMatches.forEach(match => {
        const matchDiv = document.createElement("div");
        matchDiv.className = "match";

        // Schedule header
        if (match.schedule) {
          const scheduleDiv = document.createElement("div");
          scheduleDiv.className = "match-schedule";

          scheduleDiv.innerHTML = `
            <div class="schedule-date">${match.schedule.date}</div>
            <div class="schedule-time">${match.schedule.time}</div>
            <div class="schedule-location">${match.schedule.location}</div>
          `;

          matchDiv.appendChild(scheduleDiv);
        }

        const teamA = createTeam(match.teamA);
        const teamB = createTeam(match.teamB);

        const vs = document.createElement("div");
        vs.className = "vs";
        vs.textContent = "VS";

        if (match.teamA.points !== null && match.teamB.points !== null) {
          teamA.querySelector(".points").style.display = "inline-block";
          teamB.querySelector(".points").style.display = "inline-block";

          if (match.teamA.points > match.teamB.points) {
            teamA.classList.add("leading");
          } else if (match.teamB.points > match.teamA.points) {
            teamB.classList.add("leading");
          }
        }

        if (match.winner === match.teamA.name) teamA.classList.add("winner");
        if (match.winner === match.teamB.name) teamB.classList.add("winner");

        // Wrap teams and VS inside a flex row
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
  });

// Helper function to create team HTML
function createTeam(team) {
  const div = document.createElement("div");
  div.className = "team";

  const name = document.createElement("span");
  name.className = "team-name";
  name.textContent = team.name;

  const points = document.createElement("span");
  points.className = "points";
  points.textContent = team.points !== null ? `${team.points} pts` : "";

  div.appendChild(name);
  div.appendChild(points);

  return div;
}

// Helper to check if a match is pending/panding
function isMatchPending(match) {
    if (!match.schedule || !match.schedule.date) return true;
    const d = match.schedule.date.toLowerCase();
    const t = match.schedule.time.toLowerCase();
    // Checks for "panding" (your spelling) or "pending"
    return d.includes("panding") || d.includes("pending") || t.includes("panding") || t.includes("pending");
}

// Helper to parse "Wed, Feb 11" into a real Date object for sorting
function parseDate(dateString) {
    const currentYear = new Date().getFullYear();
    // Adds current year to make it sortable, e.g. "Wed, Feb 11 2025"
    return new Date(`${dateString} ${currentYear}`);
}

