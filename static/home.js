document.addEventListener("DOMContentLoaded", () => {
  // 1. Math Icon Animations
  const icons = document.querySelectorAll(".math-icon");
  icons.forEach((icon, index) => {
    icon.style.animationDelay = `${index * 0.3}s`;
  });

  // 2. Data Fetching Logic
  const container = document.getElementById("live-updates-container");
  const grades = ['10', '11', '12'];
  let allMatches = [];

  // Create a list of fetch requests
  // Path corrected to match your files: /data/competition-grade10.json
  const requests = grades.map(grade => 
    fetch(`./data/competition-grade${grade}.json`).then(res => {
      if (!res.ok) throw new Error(`Could not find Grade ${grade} file`);
      return res.json();
    })
  );

  Promise.all(requests)
    .then(dataList => {
      dataList.forEach(data => {
        data.rounds.forEach(round => {
          round.matches.forEach(match => {
            // Keep track of which grade this match belongs to
            match.gradeLevel = data.grade; 
            allMatches.push(match);
          });
        });
      });

      renderMatchCenter(allMatches);
    })
    .catch(err => {
      console.error("Data Load Error:", err);
      container.innerHTML = `<p style="color:red;">Error: Make sure your JSON files are in the /data/ folder.</p>`;
    });

  function renderMatchCenter(matches) {
    // Filter out matches that are "panding" or have no date
    const activeMatches = matches.filter(m => {
      const dateStr = m.schedule?.date?.toLowerCase() || "";
      return dateStr !== "" && !dateStr.includes("pandin");
    }).slice(0, 6); // Just show the top 6 for the homepage

    if (activeMatches.length === 0) {
      container.innerHTML = "<p>No scheduled matches found yet.</p>";
      return;
    }

    // Generate HTML for each card
    container.innerHTML = activeMatches.map(m => `
      <div class="live-card">
        <div class="card-tag">GRADE ${m.gradeLevel}</div>
        <div class="card-teams">
          <span>${m.teamA.name}</span>
          <span class="vs-label">vs</span>
          <span>${m.teamB.name}</span>
        </div>
        <div class="card-meta">
          📅 ${m.schedule.date}<br>
          ⏰ ${m.schedule.time}<br>
          📍 ${m.schedule.location}
        </div>
      </div>
    `).join('');
  }
});