import { store } from '../core/store.js';
import { showStatus } from '../utils/dom.js';
import { CONFIG } from '../core/config.js';
import { showAlertModal } from '../ui/modals.js'; // ADDED

export async function exportToPDF() {
    const currentData = store.getCurrentData();
    if (!currentData) {
        await showAlertModal("No Data", "No data loaded. Please load tournament data first.");
        return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
        await showAlertModal("Pop-up Blocked", "Pop-up blocked! Please allow pop-ups for this site to export PDF.");
        return;
    }

    // Generate HTML content for PDF (full implementation from original)
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>KSSS Math Quiz Tournament - Grade ${currentData.grade} Report</title>
        <style>
            @page { 
                size: A4; 
                margin: 1.5cm; 
            }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #000;
                max-width: 100%;
            }
            h1 {
                text-align: center;
                color: #0d47a1;
                font-size: 24pt;
                margin-bottom: 10px;
                border-bottom: 3px solid #0d47a1;
                padding-bottom: 10px;
            }
            .header-info {
                text-align: center;
                margin-bottom: 30px;
                color: #555;
            }
            .summary-box {
                background: #f0f4ff;
                border: 2px solid #0d47a1;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 30px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }
            .summary-item {
                text-align: center;
            }
            .summary-label {
                font-size: 9pt;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .summary-value {
                font-size: 18pt;
                font-weight: bold;
                color: #0d47a1;
            }
            .round-section {
                page-break-inside: avoid;
                margin-bottom: 30px;
            }
            .round-title {
                background: #0d47a1;
                color: white;
                padding: 10px 15px;
                font-size: 14pt;
                font-weight: bold;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            .match-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .match-table th {
                background: #e3f2fd;
                color: #0d47a1;
                padding: 8px;
                text-align: left;
                border: 1px solid #90caf9;
                font-size: 10pt;
            }
            .match-table td {
                padding: 8px;
                border: 1px solid #ddd;
                font-size: 10pt;
            }
            .match-table tr:nth-child(even) {
                background: #f9f9f9;
            }
            .winner-cell {
                font-weight: bold;
                color: #16a34a;
            }
            .pending-cell {
                color: #f59e0b;
                font-style: italic;
            }
            .footer {
                margin-top: 40px;
                padding-top: 15px;
                border-top: 2px solid #ccc;
                text-align: center;
                color: #666;
                font-size: 9pt;
            }
            @media print {
                body { 
                    margin: 0;
                    padding: 0;
                }
                .no-print {
                    display: none;
                }
            }
        </style>
    </head>
    <body>
        <h1>🏆 KSSS Mathematics Quiz Competition</h1>
        <div class="header-info">
            <strong>Grade ${currentData.grade} Tournament Report</strong><br>
            Generated on: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}
        </div>
        
        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-label">Total Rounds</div>
                <div class="summary-value">${currentData.rounds.length}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Matches</div>
                <div class="summary-value">${currentData.rounds.reduce((sum, r) => sum + r.matches.length, 0)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Completed Matches</div>
                <div class="summary-value">${currentData.rounds.reduce((sum, r) =>
        sum + r.matches.filter(m => m.winner && m.winner !== "Pending").length, 0
    )}</div>
            </div>
        </div>
    `;

    // Add each round
    currentData.rounds.forEach((round) => {
        html += `
        <div class="round-section">
            <div class="round-title">${round.name} ${round.status === "locked" ? "🔒 (Archived)" : "🔓 (Active)"}</div>
            <table class="match-table">
                <thead>
                    <tr>
                        <th>Match</th>
                        <th>Team A</th>
                        <th>Score</th>
                        <th>Team B</th>
                        <th>Score</th>
                        <th>Winner</th>
                        <th>Schedule</th>
                    </tr>
                </thead>
                <tbody>
        `;

        round.matches.forEach((match) => {
            const isPending = !match.winner || match.winner === "Pending";
            const winnerClass = isPending ? "pending-cell" : "winner-cell";

            html += `
                    <tr>
                        <td><strong>#${match.id}</strong>${match.type === "best_loser" ? " 🏆" : ""}</td>
                        <td>${match.teamA.name}</td>
                        <td>${match.teamA.points ?? "-"}</td>
                        <td>${match.teamB.name}</td>
                        <td>${match.teamB.points ?? "-"}</td>
                        <td class="${winnerClass}">${match.winner ?? "Pending"}</td>
                        <td>${match.schedule.date ?? "TBD"} ${match.schedule.time ?? ""}</td>
                    </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </div>
        `;
    });

    html += `
        <div class="footer">
            KSSS Mathematics Quiz Competition - Grade ${currentData.grade}<br>
            Report generated by Tournament Management System v${CONFIG.version}
        </div>
        <div class="no-print" style="position: fixed; top: 10px; right: 10px; background: #0d47a1; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;" onclick="window.print();">
            🖨️ Print / Save as PDF
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = function () {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    showStatus("✅ PDF report opened in new window", "#16a34a");
    if (CONFIG.debug) console.log("📄 PDF export window opened");
}