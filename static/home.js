// Configuration
const CONFIG = {
  debug: false // Set to true for development logging
};
const MAX_HOME_MATCHES = 6; // Number of matches to display on homepage
const DATA_VERSION = "2.1.0";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("live-updates-container");

  // --- THEME MANAGEMENT ---
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  function updateThemeIcon(isDark) {
    if (themeIcon) themeIcon.textContent = isDark ? "☀️" : "🌙";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ksss-user-theme", theme);
    updateThemeIcon(theme === "dark");
  }

  if (themeToggle) {
    themeToggle.onclick = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(currentTheme === "dark" ? "light" : "dark");
    };
  }

  // Initialize theme
  const savedTheme = localStorage.getItem("ksss-user-theme");
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    updateThemeIcon(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  if (!container) return;

  const grades = ["10", "11", "12"];
  let allMatches = [];

  // Show loading state
  container.innerHTML = `
    <div class='loader' style='text-align: center; padding: 40px;'>
      <div style='display: inline-block; width: 40px; height: 40px; border: 4px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;'></div>
      <p style='color: var(--text-muted); margin-top: 15px;'>Loading tournament data...</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
  `;

  const requests = grades.map(grade =>
    fetch(`./data/competition-grade${grade}.json?v=${encodeURIComponent(DATA_VERSION)}`).then(res => {
      if (!res.ok) throw new Error(`Could not find Grade ${grade} file`);
      return res.json();
    })
  );

  Promise.all(requests)
    .then(dataList => {
      try {
        dataList.forEach(data => {
          const rounds = Array.isArray(data?.rounds) ? data.rounds : [];
          rounds.forEach(round => {
            const matches = Array.isArray(round?.matches) ? round.matches : [];
            matches.forEach(match => {
              allMatches.push({ ...match, gradeLevel: data?.grade ?? "-" });
            });
          });
        });

        // Sort by date (soonest first)
        allMatches.sort((a, b) => {
          const dateA = parseScheduleDate(a.schedule);
          const dateB = parseScheduleDate(b.schedule);
          return dateA - dateB;
        });

        renderMatchCenter(allMatches);
      } catch (error) {
        if (CONFIG.debug) console.error("Render error:", error);
        renderRuntimeError("Could not render Match Center due to invalid match data.");
      }
    })
    .catch(err => {
      if (CONFIG.debug) console.error("Data load error:", err);
      renderRuntimeError("Could not load tournament data. Please check your connection.");
    });

  function renderMatchCenter(matches) {
    const activeMatches = matches.filter(m => {
      return hasValidSchedule(m?.schedule);
    }).slice(0, MAX_HOME_MATCHES);

    if (activeMatches.length === 0) {
      container.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>No scheduled matches found yet.</p>";
      return;
    }

    container.innerHTML = activeMatches.map(m => {
      const isBestLoser = m.type === "best_loser";

      let stylePointsA = 'display: none';
      let stylePointsB = 'display: none';
      let classTeamA = 'team';
      let classTeamB = 'team';

      const teamA = m?.teamA ?? {};
      const teamB = m?.teamB ?? {};

      if (teamA.points !== null && teamA.points !== undefined && teamB.points !== null && teamB.points !== undefined) {
        stylePointsA = 'display: inline-block';
        stylePointsB = 'display: inline-block';

        if (teamA.points > teamB.points) classTeamA += ' leading';
        if (teamB.points > teamA.points) classTeamB += ' leading';
      }

      if (m?.winner === teamA.name) classTeamA += ' winner';
      if (m?.winner === teamB.name) classTeamB += ' winner';

      const matchClasses = isBestLoser ? 'match best-loser-match' : 'match';
      const bestLoserBadge = isBestLoser ? '<div class="card-tag" style="left: auto; right: 20px; background: #f59e0b;">🏆 BEST LOSER</div>' : '';

      return `
      <div class="${matchClasses}">
        ${bestLoserBadge}
        <div class="card-tag">GRADE ${m.gradeLevel}</div>
        
        <div class="match-schedule">
          <div class="schedule-date">${m.schedule.date}</div>
          <div class="schedule-time">${m.schedule.time}</div>
          <div class="schedule-location">${m.schedule.location}</div>
        </div>

        <div class="match-teams">
          <div class="${classTeamA}">
            <span class="team-name">${teamA.name ?? "TBD"}</span>
            <span class="points" style="${stylePointsA}">${teamA.points} pts</span>
          </div>
          
          <span class="vs">VS</span>

          <div class="${classTeamB}">
            <span class="team-name">${teamB.name ?? "TBD"}</span>
            <span class="points" style="${stylePointsB}">${teamB.points} pts</span>
          </div>
        </div>
      </div>
      `;
    }).join('');
  }

  function renderRuntimeError(message) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;"><h3>⚠️ Match Center Unavailable</h3><p>${message}</p><button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #0d47a1; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
  }

  function hasValidSchedule(schedule) {
    return !Number.isNaN(parseScheduleDate(schedule).getTime()) && !isPendingSchedule(schedule);
  }

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

  function parseScheduleDate(schedule) {
    if (!schedule || isPendingSchedule(schedule)) {
      return new Date("9999-12-31T23:59:59");
    }

    const rawDate = String(schedule.date ?? "").trim();
    const rawTime = String(schedule.time ?? "").trim();

    const directCandidate = `${rawDate} ${rawTime}`.trim();
    const directDate = new Date(directCandidate);
    if (!Number.isNaN(directDate.getTime())) {
      return directDate;
    }

    const normalizedDate = rawDate.includes(",") ? rawDate.split(",").slice(1).join(",").trim() : rawDate;
    const currentYear = new Date().getFullYear();
    const fallbackCandidate = `${normalizedDate} ${currentYear} ${rawTime}`.trim();
    const fallbackDate = new Date(fallbackCandidate);

    if (!Number.isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    return new Date("9999-12-31T23:59:59");
  }
});