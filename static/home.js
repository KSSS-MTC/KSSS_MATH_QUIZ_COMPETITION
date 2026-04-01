import { DATA_VERSION, MAX_HOME_MATCHES } from '../common/constants.js';
import { initTheme, setupThemeToggle } from '../common/theme.js';
import { parseScheduleDate, hasValidSchedule } from '../common/dateParser.js';
import { showError, initGlobalErrorHandlers } from '../common/errorHandler.js';

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupThemeToggle();

  const container = document.getElementById("live-updates-container");
  if (!container) return;

  initGlobalErrorHandlers(container);

  // Show loading spinner
  container.innerHTML = `
    <div class='loader' style='text-align: center; padding: 40px;'>
      <div style='display: inline-block; width: 40px; height: 40px; border: 4px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;'></div>
      <p style='color: var(--text-muted); margin-top: 15px;'>Loading tournament data...</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
  `;

  const grades = ["10", "11", "12"];
  const fetchPromises = grades.map(grade =>
    fetch(`./data/competition-grade${grade}.json?v=${DATA_VERSION}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  );

  Promise.all(fetchPromises)
    .then(results => {
      const allMatches = results.flatMap((data, idx) => {
        if (!data) return [];
        const gradeLevel = data.grade ?? grades[idx];
        const rounds = Array.isArray(data.rounds) ? data.rounds : [];
        return rounds.flatMap(round =>
          (round.matches || []).map(match => ({
            ...match,
            gradeLevel
          }))
        );
      });

      // Get today's date at midnight (local time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter: only matches with valid schedule and date >= today
      const upcomingMatches = allMatches.filter(m => {
        if (!hasValidSchedule(m.schedule)) return false;
        const matchDate = parseScheduleDate(m.schedule);
        // Compare dates (ignoring time)
        const matchDay = new Date(matchDate);
        matchDay.setHours(0, 0, 0, 0);
        return matchDay >= today;
      });

      // Sort by date (soonest first)
      upcomingMatches.sort((a, b) => parseScheduleDate(a.schedule) - parseScheduleDate(b.schedule));

      // Take only the first MAX_HOME_MATCHES
      const displayMatches = upcomingMatches.slice(0, MAX_HOME_MATCHES);

      renderMatches(displayMatches);
    })
    .catch(err => {
      console.error("Home data fetch error:", err);
      showError(container, "Could not load tournament data. Please check your connection.");
    });

  function renderMatches(matches) {
    if (matches.length === 0) {
      container.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>No upcoming matches found.</p>";
      return;
    }

    container.innerHTML = matches.map(m => {
      const isBestLoser = m.type === "best_loser";
      const teamA = m.teamA || {};
      const teamB = m.teamB || {};

      let stylePointsA = 'display: none';
      let stylePointsB = 'display: none';
      let classTeamA = 'team';
      let classTeamB = 'team';

      const hasScores = teamA.points != null && teamB.points != null;
      if (hasScores) {
        stylePointsA = 'display: inline-block';
        stylePointsB = 'display: inline-block';
        if (teamA.points > teamB.points) classTeamA += ' leading';
        if (teamB.points > teamA.points) classTeamB += ' leading';
      }

      if (m.winner === teamA.name) classTeamA += ' winner';
      if (m.winner === teamB.name) classTeamB += ' winner';

      const matchClasses = isBestLoser ? 'match best-loser-match' : 'match';
      const bestLoserBadge = isBestLoser
        ? '<div class="card-tag" style="left: auto; right: 20px; background: #f59e0b;">🏆 BEST LOSER</div>'
        : '';

      return `
        <div class="${matchClasses}">
          ${bestLoserBadge}
          <div class="card-tag">GRADE ${m.gradeLevel}</div>
          <div class="match-schedule">
            <div class="schedule-date">${m.schedule?.date ?? "Pending"}</div>
            <div class="schedule-time">${m.schedule?.time ?? "TBD"}</div>
            <div class="schedule-location">${m.schedule?.location ?? "Maths Lab"}</div>
          </div>
          <div class="match-teams">
            <div class="${classTeamA}">
              <span class="team-name">${teamA.name ?? "TBD"}</span>
              <span class="points" style="${stylePointsA}">${teamA.points ?? ""} pts</span>
            </div>
            <span class="vs">VS</span>
            <div class="${classTeamB}">
              <span class="team-name">${teamB.name ?? "TBD"}</span>
              <span class="points" style="${stylePointsB}">${teamB.points ?? ""} pts</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
});