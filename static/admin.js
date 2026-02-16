// Unlock team for switching
function unlockTeam(rIdx, mIdx, side) {
    if (!switchModeActive || switchModeRoundIdx !== rIdx) return;
    // Only allow up to 2 unlocked teams
    if (unlockedTeams.length === 2) {
        alert("You can only unlock two teams at a time. Re-lock one to select another.");
        return;
    }
    // Prevent duplicate unlock
    if (unlockedTeams.some(t => t.rIdx === rIdx && t.mIdx === mIdx && t.side === side)) return;
    unlockedTeams.push({ rIdx, mIdx, side });
    renderForm();
    // If two teams unlocked, show swap modal
    if (unlockedTeams.length === 2) {
        showSwapModal();
    }
}

// Re-lock (deselect) a team in switch mode
function relockTeam(rIdx, mIdx, side) {
    unlockedTeams = unlockedTeams.filter(t => !(t.rIdx === rIdx && t.mIdx === mIdx && t.side === side));
    renderForm();
}


// Show swap confirmation modal
function showSwapModal() {
    const [t1, t2] = unlockedTeams;
    // Safety: must be in same round, no scores, not completed
    if (t1.rIdx !== t2.rIdx) {
        alert("⚠️ Teams must be in the same round to swap.");
        unlockedTeams = [];
        renderForm();
        return;
    }
    const round = currentData.rounds[t1.rIdx];
    const m1 = round.matches[t1.mIdx];
    const m2 = round.matches[t2.mIdx];
    const teamA = t1.side === 'A' ? m1.teamA : m1.teamB;
    const teamB = t2.side === 'A' ? m2.teamA : m2.teamB;
    if (teamA.points != null || teamB.points != null || m1.winner || m2.winner) {
        alert("❌ Cannot swap teams with recorded scores or completed matches.");
        unlockedTeams = [];
        renderForm();
        return;
    }
    // Modal UI with improved styling
    const html = `
        <div style='text-align:center;'>
            <div style='font-size:48px;margin-bottom:16px;'>🔄</div>
            <div style='font-size:20px;font-weight:bold;margin-bottom:12px;color:var(--text-main);'>Confirm Team Swap</div>
            <div style='font-size:15px;margin-bottom:20px;color:var(--text-muted);line-height:1.5;'>
                You are about to swap:<br><br>
                <span style='display:inline-block;background:var(--active-bg);color:var(--primary);padding:8px 16px;border-radius:8px;font-weight:bold;margin:4px;'>
                    ${teamA.name}
                </span>
                <br>with<br>
                <span style='display:inline-block;background:var(--active-bg);color:var(--primary);padding:8px 16px;border-radius:8px;font-weight:bold;margin:4px;'>
                    ${teamB.name}
                </span>
            </div>
            <div style='font-size:13px;color:var(--warning-text);margin-bottom:24px;padding:12px;background:var(--warning-bg);border-radius:8px;border:1px solid var(--warning-border);'>
                ⚠️ This action will immediately save to GitHub
            </div>
            <div style='display:flex;gap:12px;justify-content:center;'>
                <button onclick='confirmTeamSwap()' style='flex:1;background:linear-gradient(135deg, var(--success) 0%, #15803d 100%);color:#fff;padding:12px 24px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:15px;box-shadow:0 4px 12px rgba(22,163,74,0.3);transition:all 0.2s;' onmouseover='this.style.transform="translateY(-2px)";this.style.boxShadow="0 6px 16px rgba(22,163,74,0.4)"' onmouseout='this.style.transform="translateY(0)";this.style.boxShadow="0 4px 12px rgba(22,163,74,0.3)"'>
                    ✓ Yes, Swap Teams
                </button>
                <button onclick='cancelTeamSwap()' style='flex:1;background:var(--locked-bg);color:var(--text-muted);padding:12px 24px;border:2px solid var(--border-color);border-radius:10px;font-weight:bold;cursor:pointer;font-size:15px;transition:all 0.2s;' onmouseover='this.style.background="var(--border-color)";this.style.color="white"' onmouseout='this.style.background="var(--locked-bg)";this.style.color="var(--text-muted)"'>
                    × Cancel
                </button>
            </div>
        </div>
    `;
    const modal = document.createElement('div');
    modal.id = 'swap-modal';
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--card-bg);padding:40px;z-index:9999;border-radius:16px;box-shadow:var(--card-shadow);min-width:400px;max-width:90vw;animation:modalFadeIn 0.2s ease;';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    const backdrop = document.createElement('div');
    backdrop.id = 'swap-modal-backdrop';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9998;animation:backdropFadeIn 0.2s ease;';
    backdrop.onclick = cancelTeamSwap;
    document.body.appendChild(backdrop);
}

function cancelTeamSwap() {
    const modal = document.getElementById('swap-modal');
    const backdrop = document.getElementById('swap-modal-backdrop');
    if (modal) modal.remove();
    if (backdrop) backdrop.remove();
    unlockedTeams = [];
    renderForm();
}

async function confirmTeamSwap() {
    const [t1, t2] = unlockedTeams;
    // Final safety checks
    // Final safety checks - Layer 1 Hardening Usage
    if (AdminSecurity.getRole() !== ROLE_ABSOLUTE) {
        alert("🚫 Permission Denied: Only the absolute admin can perform this action.");
        cancelTeamSwap();
        return;
    }
    const round = currentData.rounds[t1.rIdx];
    const m1 = round.matches[t1.mIdx];
    const m2 = round.matches[t2.mIdx];
    const teamA = t1.side === 'A' ? m1.teamA : m1.teamB;
    const teamB = t2.side === 'A' ? m2.teamA : m2.teamB;
    if (teamA.points != null || teamB.points != null || m1.winner || m2.winner) {
        alert("❌ Cannot swap teams with recorded scores or completed matches.");
        cancelTeamSwap();
        return;
    }

    // Store original teams for rollback if save fails
    const originalTeamA_M1 = t1.side === 'A' ? m1.teamA : m1.teamB;
    const originalTeamB_M2 = t2.side === 'A' ? m2.teamA : m2.teamB;

    // Swap teams in their match slots
    if (t1.side === 'A') m1.teamA = teamB; else m1.teamB = teamB;
    if (t2.side === 'A') m2.teamA = teamA; else m2.teamB = teamA;

    // Log swap
    logStructuralAction("Team Swap", {
        admin: currentUser,
        timestamp: new Date().toISOString(),
        round: round.name,
        teamA: { name: teamA.name, match: m1.id, side: t1.side },
        teamB: { name: teamB.name, match: m2.id, side: t2.side }
    });

    // Save immediately and WAIT for result
    try {
        showStatus("💾 Saving team swap to GitHub...", "#f59e0b");
        await saveToGitHub();

        // Only after successful save:
        showStatus(`✅ Teams swapped successfully: ${teamA.name} ↔ ${teamB.name}`, "#16a34a");

        // Auto re-lock
        unlockedTeams = [];
        cancelTeamSwap();
        renderForm();
    } catch (error) {
        // Rollback swap if save failed
        if (t1.side === 'A') m1.teamA = originalTeamA_M1; else m1.teamB = originalTeamA_M1;
        if (t2.side === 'A') m2.teamA = originalTeamB_M2; else m2.teamB = originalTeamB_M2;

        // Remove the log entry since swap failed
        if (currentData.structuralLog && currentData.structuralLog.length > 0) {
            currentData.structuralLog.pop();
        }

        showStatus("❌ Swap failed - changes rolled back", "#ef4444");
        alert(`Team swap failed to save to GitHub.\n\nError: ${error.message}\n\nThe swap has been rolled back. Please try again.`);

        // Keep modal open and teams unlocked so user can retry
        renderForm();
    }
}
// === Team Switch Mode State ===
let switchModeActive = false;
let unlockedTeams = [];
let switchModeRoundIdx = null;

// === Admin Role Definitions ===
const ROLE_ABSOLUTE = "absolute";
const ROLE_LIMITED = "limited";
// === Absolute Admin Hardening: Max Difficulty Bypass Mode ===
// Layer 1 (Closure), Layer 2 (Secure Storage), Layer 4 (Freeze)
const AdminSecurity = (() => {
    let role = null;
    const SALT = "ksss-secure-salt-v1"; // Hardcoded salt for integrity check

    // --- Private Helpers ---

    async function signRole(roleValue) {
        if (!roleValue) return null;
        const nonce = Date.now().toString();
        const hash = await hashString(roleValue + SALT + nonce);
        return { role: roleValue, nonce, hash };
    }

    async function verifyRole(storedObj) {
        if (!storedObj || !storedObj.role || !storedObj.nonce || !storedObj.hash) return null;
        const computed = await hashString(storedObj.role + SALT + storedObj.nonce);
        if (computed === storedObj.hash) return storedObj.role;
        if (CONFIG.debug) console.warn("🔒 Security Alert: Admin Role Tampered!");
        return null; // Tamper detected
    }

    async function setRole(newRole) {
        role = newRole;
        if (newRole) {
            const signed = await signRole(newRole);
            sessionStorage.setItem("secureAdminRole", JSON.stringify(signed));
        } else {
            sessionStorage.removeItem("secureAdminRole");
        }
        sessionStorage.removeItem("currentAdminRole");
    }

    // --- Public Logic (Moved In to Protect setRole) ---

    function login() {
        currentUser = document.getElementById("admin-name").value;
        const tokenInput = document.getElementById("gh-token").value.trim();

        if (!currentUser || !tokenInput)
            return alert("Mr. President, please select your name and paste your token.");

        // Role assignment and secondary authentication
        if (currentUser === "Y-JAMMEH") {
            const code = prompt("Enter structural authentication code:");
            const expectedHash = "45888f0c28b9e1007b74238f0dd90312efe9b3c4298957c80079845ed7725384";
            hashString(code).then(hash => {
                if (hash !== expectedHash) {
                    alert("Incorrect structural authentication code. Access denied.");
                    return;
                }
                setRole(ROLE_ABSOLUTE).then(() => finishLogin(tokenInput));
            });
        } else {
            setRole(ROLE_LIMITED).then(() => finishLogin(tokenInput));
        }
    }

    function finishLogin(tokenInput) {
        sessionStorage.setItem("adminUser", currentUser);
        sessionStorage.setItem("githubToken", tokenInput);

        document.getElementById("login-section").classList.add("hidden");
        document.getElementById("grade-section").classList.remove("hidden");
        document.getElementById("admin-display").innerHTML =
            `✅ <strong>Authenticated:</strong> ${currentUser} | <strong>Status:</strong> <span style="color: var(--success);">Active Session</span> | <a href="#" onclick="logout(); return false;" style="color: var(--danger); margin-left: 10px;">Logout</a>`;
        if (typeof showRoleBadge === 'function') showRoleBadge();
    }

    function logout() {
        sessionStorage.removeItem("adminUser");
        sessionStorage.removeItem("githubToken");
        sessionStorage.removeItem("currentAdminRole");
        sessionStorage.removeItem("secureAdminRole");
        currentUser = "";
        currentData = null;
        currentSha = "";
        window.location.reload();
    }

    async function verifySession() {
        const token = sessionStorage.getItem("githubToken");
        if (!token) {
            showLoginModal();
            return;
        }

        // Verify stored role signature
        const storedRole = sessionStorage.getItem("secureAdminRole");
        if (storedRole) {
            try {
                const { role, nonce, hash } = JSON.parse(storedRole);
                const reHash = await hashString(role + nonce + SALT);
                if (reHash === hash) {
                    setRoleInternal(role);
                } else {
                    console.warn("Tampered role detected!");
                    sessionStorage.removeItem("secureAdminRole");
                    setRoleInternal(null);
                }
            } catch (e) {
                console.error("Role parse error", e);
                sessionStorage.removeItem("secureAdminRole");
            }
        }

        showRoleBadge();
        loadMatches();

        // Gap 5: Function Self-Protection
        freezeCriticalFunctions();
    }

    function freezeCriticalFunctions() {
        const criticalGlobals = [
            "verifyIntegrity",
            "saveToGitHub",
            "activateTeamSwitchMode",
            "exitTeamSwitchMode",
            "createMatchCard",
            "renderForm",
            "fetchWithRetry",
            "AdminSecurity"
        ];

        criticalGlobals.forEach(funcName => {
            if (window[funcName]) {
                Object.defineProperty(window, funcName, {
                    value: window[funcName],
                    writable: false,
                    configurable: false
                });
            }
        });

        if (CONFIG.debug) console.log("🔒 Critical functions frozen.");
    }

    const instance = Object.freeze({
        login,
        logout,
        verifySession,
        getRole: () => role
    });

    // Fix: Explicitly attach to window because 'const' doesn't do it automatically
    window.AdminSecurity = instance;
    return instance;
})();

// Expose hooks for HTML
window.login = AdminSecurity.login;
window.logout = AdminSecurity.logout;

const DEFAULT_CONFIG = {
    owner: "KSSS-MTC",
    repo: "KSSS_MATH_QUIZ_COMPETITION"
};

function resolveRepositoryConfig() {
    const params = new URLSearchParams(window.location.search);
    const ownerFromQuery = (params.get("owner") || "").trim();
    const repoFromQuery = (params.get("repo") || "").trim();

    let ownerFromStorage = "";
    let repoFromStorage = "";

    try {
        ownerFromStorage = (localStorage.getItem("ksss_repo_owner") || "").trim();
        repoFromStorage = (localStorage.getItem("ksss_repo_name") || "").trim();

        if (ownerFromQuery && repoFromQuery) {
            localStorage.setItem("ksss_repo_owner", ownerFromQuery);
            localStorage.setItem("ksss_repo_name", repoFromQuery);
        }
    } catch {
        // localStorage may be unavailable in some environments
    }

    return {
        owner: ownerFromQuery || ownerFromStorage || DEFAULT_CONFIG.owner,
        repo: repoFromQuery || repoFromStorage || DEFAULT_CONFIG.repo
    };
}

const repositoryConfig = resolveRepositoryConfig();

const CONFIG = {
    owner: repositoryConfig.owner,
    repo: repositoryConfig.repo,
    version: "2.1.0", // Version tracking for cache busting
    debug: false // Set to true to enable debug logging
};

// Layer 3: Runtime Integrity Check
function verifyIntegrity() {
    // Check if Secure Module is intact
    if (!window.AdminSecurity || !Object.isFrozen(AdminSecurity)) {
        if (CONFIG.debug) console.warn("🚨 Integrity Check Failed: AdminSecurity compromised");
        return false;
    }
    return true;
}

// === Security Utilities (Gap 1: XSS Remediation) ===
function safeRender(element, value) {
    if (element) {
        element.textContent = String(value ?? "");
    }
}

function createEl(tag, className, text, styles) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    if (styles) el.style.cssText = styles;
    return el;
}

// API and UI Constants
const CONSTANTS = {
    // API Settings
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 1000, // ms
    MAX_RETRY_DELAY: 5000, // ms

    // Cache Settings
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes in ms (reduced API calls)
    CACHE_KEY_PREFIX: "ksss_cache_",

    // Pagination Settings
    MATCHES_PER_PAGE: 20,
    MAX_HISTORY_ENTRIES: 50,

    // UI Display
    MAX_HOME_MATCHES: 6, // Number of matches shown on homepage

    // UI Timeouts
    SUCCESS_MESSAGE_DURATION: 4000, // ms
    ERROR_MESSAGE_DURATION: 0, // 0 = no auto-hide
    RELOAD_DELAY_AFTER_SAVE: 1500, // ms
    VALIDATION_ERROR_DISPLAY: 2000, // ms

    // Validation
    MIN_SCORE: 0,
    MAX_SCORE: 100,

    // Match Types
    MATCH_TYPE_NORMAL: "normal",
    MATCH_TYPE_BEST_LOSER: "best_loser",

    // Round Status
    ROUND_STATUS_ACTIVE: "active",
    ROUND_STATUS_LOCKED: "locked",

    // Default Values
    DEFAULT_LOCATION: "Maths Lab",
    DEFAULT_TIME: "TBD",
    DEFAULT_DATE: "Pending",

    // HTTP Status Codes
    HTTP_UNAUTHORIZED: 401,
    HTTP_FORBIDDEN: 403,
    HTTP_NOT_FOUND: 404,
    HTTP_CONFLICT: 409,
    HTTP_UNPROCESSABLE: 422,
    HTTP_RATE_LIMIT: 429,
    HTTP_SERVER_ERROR: 500
};

// Log version on load
if (CONFIG.debug) console.log("🚀 Admin.js loaded - Version:", CONFIG.version);

let currentUser = "";
// githubToken is now fetched from sessionStorage only
let currentData = null;
let currentSha = "";

// iOS keyboard handling state
let viewportResizeHandler = null;
let originalModalTop = null;

// Pagination state
let currentPage = 1;
let totalPages = 1;
let allMatches = []; // Store all matches for pagination

// Undo/Redo state
let undoStack = [];
let redoStack = [];
let isApplyingHistory = false;

/**
 * Log structural actions (team swaps, round deletions, etc.)
 * Creates or appends to structuralLog array in currentData
 * @param {string} actionType - Type of action (e.g., "Team Swap", "Round Deletion")
 * @param {object} details - Detailed information about the action
 */
function logStructuralAction(actionType, details) {
    if (!currentData) {
        console.error("Cannot log structural action: currentData is null");
        return;
    }

    // Initialize structuralLog array if it doesn't exist
    if (!currentData.structuralLog) {
        currentData.structuralLog = [];
    }

    // Create log entry
    const logEntry = {
        action: actionType,
        timestamp: new Date().toISOString(),
        admin: details.admin || currentUser,
        details: details
    };

    // Append to log
    currentData.structuralLog.push(logEntry);

    // Keep log size manageable (max 100 entries)
    if (currentData.structuralLog.length > 100) {
        currentData.structuralLog.shift(); // Remove oldest entry
    }

    if (CONFIG.debug) {
        console.log(`📋 Structural Action Logged: ${actionType}`, logEntry);
    }
}


function cloneCompetitionData(data) {
    return JSON.parse(JSON.stringify(data));
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");

    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function resetHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
}

function saveHistorySnapshot() {
    if (!currentData || isApplyingHistory) return;

    undoStack.push(cloneCompetitionData(currentData));
    if (undoStack.length > CONSTANTS.MAX_HISTORY_ENTRIES) {
        undoStack.shift();
    }

    redoStack = [];
    updateUndoRedoButtons();
}

function undoChange() {
    if (!currentData || undoStack.length === 0) return;

    isApplyingHistory = true;

    // Store old round count before undo
    const oldRoundCount = currentData.rounds?.length || 0;

    redoStack.push(cloneCompetitionData(currentData));
    currentData = undoStack.pop();

    // Check if a round was removed (round generation was reverted)
    const newRoundCount = currentData.rounds?.length || 0;
    if (newRoundCount < oldRoundCount && newRoundCount > 0) {
        // Round was removed - check if last round has Best Loser match that should be cleaned up
        const lastRound = currentData.rounds[newRoundCount - 1];

        // Remove Best Loser matches from the newly-unlocked round
        // Best Loser matches should only exist when preparing for next round generation
        if (lastRound && lastRound.status !== "locked") {
            const originalMatchCount = lastRound.matches.length;
            lastRound.matches = lastRound.matches.filter(m => m.type !== "best_loser");

            if (CONFIG.debug && lastRound.matches.length < originalMatchCount) {
                console.log(`Cleaned up Best Loser match from ${lastRound.name} after round revert`);
            }
        }
    }

    isApplyingHistory = false;

    renderForm();
    updateSidebarStats();
    updateUndoRedoButtons();
    showStatus("↩️ Last change undone", "#3b82f6");
}

function redoChange() {
    if (!currentData || redoStack.length === 0) return;

    isApplyingHistory = true;
    undoStack.push(cloneCompetitionData(currentData));
    currentData = redoStack.pop();
    isApplyingHistory = false;

    renderForm();
    updateSidebarStats();
    updateUndoRedoButtons();
    showStatus("↪️ Change restored", "#3b82f6");
}

// ============================================
// iOS KEYBOARD HANDLING
// ============================================

/**
 * Setup iOS keyboard handling for modal inputs
 * Adjusts modal position when keyboard appears to keep input visible
 */
function setupIOSKeyboardHandling() {
    // Only run on iOS devices
    if (!window.visualViewport || !/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        return;
    }

    // Remove any existing listener
    if (viewportResizeHandler) {
        window.visualViewport.removeEventListener('resize', viewportResizeHandler);
    }

    viewportResizeHandler = () => {
        const modal = document.querySelector('.modal-container');
        if (!modal) return;

        const viewport = window.visualViewport;
        const keyboardHeight = window.innerHeight - viewport.height;

        // Store original position on first resize
        if (originalModalTop === null) {
            originalModalTop = modal.style.top || '50%';
        }

        if (keyboardHeight > 100) {
            // Keyboard is visible - adjust modal position
            const modalHeight = modal.offsetHeight;
            const availableSpace = viewport.height;

            // Calculate safe top position
            let newTop = Math.max(10, (availableSpace - modalHeight) / 2);

            modal.style.position = 'fixed';
            modal.style.top = `${newTop}px`;
            modal.style.transform = 'translateX(-50%)';
            modal.style.maxHeight = `${availableSpace - 20}px`;
            modal.style.overflowY = 'auto';

            // Scroll focused input into view
            const focusedInput = document.activeElement;
            if (focusedInput && (focusedInput.tagName === 'INPUT' || focusedInput.tagName === 'SELECT')) {
                setTimeout(() => {
                    focusedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        } else {
            // Keyboard hidden - restore original position
            modal.style.position = 'fixed';
            modal.style.top = originalModalTop;
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.maxHeight = '85vh';
        }
    };

    window.visualViewport.addEventListener('resize', viewportResizeHandler);
    window.visualViewport.addEventListener('scroll', viewportResizeHandler);
}

/**
 * Cleanup iOS keyboard handling when modal closes
 */
function cleanupIOSKeyboardHandling() {
    if (viewportResizeHandler && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', viewportResizeHandler);
        window.visualViewport.removeEventListener('scroll', viewportResizeHandler);
    }
    viewportResizeHandler = null;
    originalModalTop = null;
}

// ============================================
// ERROR HANDLING & RETRY LOGIC
// ============================================

/**
 * Retry a fetch request with exponential backoff
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>} The fetch response
 * @throws {Error} Network errors or non-retryable HTTP errors
 */
async function fetchWithRetry(url, options = {}, maxRetries = CONSTANTS.MAX_RETRIES) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Handle specific GitHub API errors
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;

                switch (response.status) {
                    case CONSTANTS.HTTP_UNAUTHORIZED:
                        errorMessage = "Authentication failed. Please check your GitHub token.";
                        break;
                    case CONSTANTS.HTTP_FORBIDDEN:
                        errorMessage = "Access forbidden. Token may have expired or lacks permissions.";
                        break;
                    case CONSTANTS.HTTP_NOT_FOUND:
                        errorMessage = "Repository or file not found.";
                        break;
                    case CONSTANTS.HTTP_CONFLICT:
                        errorMessage = "Conflict detected. File may have been modified. Please reload.";
                        break;
                    case CONSTANTS.HTTP_UNPROCESSABLE:
                        errorMessage = "Invalid request. Check your data format.";
                        break;
                    case CONSTANTS.HTTP_RATE_LIMIT:
                        errorMessage = "Rate limit exceeded. Please wait a moment.";
                        break;
                    case CONSTANTS.HTTP_SERVER_ERROR:
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = "GitHub server error. Retrying...";
                        break;
                    default:
                        errorMessage = `GitHub API Error (${response.status})`;
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.response = response;
                throw error;
            }

            return response;
        } catch (error) {
            lastError = error;

            // Don't retry on authentication/permission errors or conflicts
            const nonRetryableErrors = [
                CONSTANTS.HTTP_UNAUTHORIZED,
                CONSTANTS.HTTP_FORBIDDEN,
                CONSTANTS.HTTP_NOT_FOUND,
                CONSTANTS.HTTP_CONFLICT,
                CONSTANTS.HTTP_UNPROCESSABLE
            ];

            if (error.status && nonRetryableErrors.includes(error.status)) {
                throw error;
            }

            // If we have retries left and it's a retryable error, wait and retry
            if (attempt < maxRetries - 1) {
                const delay = Math.min(
                    CONSTANTS.INITIAL_RETRY_DELAY * Math.pow(2, attempt),
                    CONSTANTS.MAX_RETRY_DELAY
                );
                showStatus(`Retry ${attempt + 1}/${maxRetries - 1} in ${delay / 1000}s...`, "#f59e0b");
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    throw lastError;
}

/**
 * Get cached data from localStorage
 * @param {string} key - Cache key
 * @returns {object|null} Cached data or null if expired/missing
 */
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(CONSTANTS.CACHE_KEY_PREFIX + key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age > CONSTANTS.CACHE_DURATION) {
            // Cache expired
            localStorage.removeItem(CONSTANTS.CACHE_KEY_PREFIX + key);
            return null;
        }

        if (CONFIG.debug) console.log(`📦 Cache HIT for ${key} (age: ${Math.round(age / 1000)}s)`);
        return data;
    } catch (error) {
        if (CONFIG.debug) console.error("Cache read error:", error);
        return null;
    }
}

/**
 * Save data to localStorage cache
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 */
function setCachedData(key, data) {
    try {
        const cacheEntry = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CONSTANTS.CACHE_KEY_PREFIX + key, JSON.stringify(cacheEntry));
        if (CONFIG.debug) console.log(`💾 Cached data for ${key}`);
    } catch (error) {
        if (CONFIG.debug) console.error("Cache write error:", error);
    }
}

/**
 * Clear all cache entries
 */
function clearCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CONSTANTS.CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        if (CONFIG.debug) console.log("🗑️ Cache cleared");
    } catch (error) {
        if (CONFIG.debug) console.error("Cache clear error:", error);
    }
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - The button element
 * @param {boolean} isLoading - Whether to show loading state
 */
function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        button.classList.add("btn-loading");
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Loading...";
    } else {
        button.classList.remove("btn-loading");
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

// ============================================
// TOURNAMENT LOGIC FUNCTIONS
// ============================================

/**
 * Check if a round is fully completed (all matches have winners)
 * @param {object} round - Round object to check
 * @returns {boolean} True if all matches have winners
 */
function isRoundComplete(round) {
    if (!round || !round.matches || round.matches.length === 0) return false;

    return round.matches.every(m => {
        return m.winner !== null && m.winner !== undefined && m.winner !== "";
    });
}

/**
 * Get all qualified teams from a round (winners)
 * @param {object} round - Round object
 * @returns {string[]} Array of winning team names
 */
function getQualifiedTeams(round) {
    if (!round || !round.matches) return [];

    const winners = [];
    round.matches.forEach(m => {
        if (CONFIG.debug) console.log(`Match ${m.id}: winner="${m.winner}", typeofWinner=${typeof m.winner}`);
        if (m.winner !== null && m.winner !== undefined && m.winner !== "") {
            winners.push(m.winner);
            if (CONFIG.debug) console.log(`  ✅ Added to winners: ${m.winner}`);
        } else {
            if (CONFIG.debug) console.log(`  ❌ Not added (null/undefined/empty)`);
        }
    });

    if (CONFIG.debug) console.log("Total Winners Found:", winners);
    return winners;
}

/**
 * Get all losers from a round, sorted by points (highest first)
 * @param {object} round - Round object
 * @returns {Array<{name: string, points: number}>} Sorted array of losers
 */
function getLosersSorted(round) {
    if (!round || !round.matches) return [];

    const losers = [];

    round.matches.forEach(m => {
        // Skip if match type is best_loser to avoid recursion
        if (m.type === "best_loser") return;

        if (m.winner !== null && m.winner !== undefined && m.winner !== "") {
            // Determine who lost
            if (m.winner === m.teamA.name && m.teamB.points !== null) {
                losers.push({
                    name: m.teamB.name,
                    points: m.teamB.points
                });
            } else if (m.winner === m.teamB.name && m.teamA.points !== null) {
                losers.push({
                    name: m.teamA.name,
                    points: m.teamA.points
                });
            }
        }
    });

    // Sort descending by points
    losers.sort((a, b) => b.points - a.points);

    return losers;
}

/**
 * Check if a round already has a best loser match
 * @param {object} round - Round object
 * @returns {boolean} True if best loser match exists
 */
function hasBestLoserMatch(round) {
    if (!round || !round.matches) return false;

    return round.matches.some(m => m.type === "best_loser");
}

/**
 * Get the last round in the tournament
 * @returns {object|null} Last round object or null if none exists
 */
function getLastRound() {
    if (!currentData || !currentData.rounds || currentData.rounds.length === 0) return null;
    return currentData.rounds[currentData.rounds.length - 1];
}

/**
 * Check if we can generate the next round
 */
/**
 * Check if the next round can be generated
 * @returns {boolean} True if next round generation is allowed
 */
function canGenerateNextRound() {
    const lastRound = getLastRound();
    if (!lastRound) return false;

    // Check if last round is complete
    if (!isRoundComplete(lastRound)) {
        return false;
    }

    // Check if qualified teams are even
    const qualified = getQualifiedTeams(lastRound);
    if (qualified.length % 2 !== 0) {
        // Odd number - need best loser match
        if (!hasBestLoserMatch(lastRound)) {
            return false; // Need to create best loser match first
        }
    }

    return true;
}

/**
 * Get match status for visual indicators
 * @param {object} match - Match object
 * @param {boolean} isLocked - Whether the round is locked
 * @returns {string} Status class name
 */
function getMatchStatus(match, isLocked) {
    if (isLocked) {
        return 'locked';
    }

    if (match.winner !== null && match.winner !== undefined && match.winner !== "") {
        return 'completed';
    }

    if (match.teamA.points !== null || match.teamB.points !== null) {
        return 'in-progress';
    }

    return 'pending';
}

/**
 * Get status badge HTML
 * @param {string} status - Status name
 * @returns {string} HTML for status badge
 */
function getStatusBadgeHTML(status) {
    const badges = {
        'locked': '🔒 Locked',
        'completed': '✅ Complete',
        'in-progress': '⏳ In Progress',
        'pending': '⏸️ Pending'
    };

    return `<span class="match-status-badge ${status}">${badges[status] || status}</span>`;
}

// Utility: Hash a string using SHA-256 and return hex
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check for existing session on page load
window.addEventListener("DOMContentLoaded", () => {
    AdminSecurity.verifySession();


    // Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), Ctrl+E (CSV), Ctrl+P (PDF)
    document.addEventListener("keydown", (event) => {
        const key = (event.key || "").toLowerCase();
        const isUndo = (event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey;
        const isRedo = (event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey));
        const isExportCSV = (event.ctrlKey || event.metaKey) && key === "e" && !event.shiftKey;
        const isExportPDF = (event.ctrlKey || event.metaKey) && key === "p" && !event.shiftKey;

        if (isUndo) {
            event.preventDefault();
            undoChange();
        } else if (isRedo) {
            event.preventDefault();
            redoChange();
        } else if (isExportCSV) {
            event.preventDefault();
            if (currentData) exportToCSV();
        } else if (isExportPDF) {
            event.preventDefault();
            if (currentData) exportToPDF();
        }
    });
});

/**
 * Load competition data from GitHub for the selected grade
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<void>}
 * @throws {Error} Network errors or GitHub API errors
 */
async function loadMatches(forceRefresh = false) {
    const grade = document.getElementById("grade-select").value;
    const cacheKey = `grade${grade}`;
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data/competition-grade${grade}.json`;
    const loadBtn = document.querySelector('button[onclick="loadMatches()"]');

    document.getElementById("loading-overlay").classList.remove("hidden");
    document.getElementById("editor-section").classList.add("hidden");

    if (loadBtn) setButtonLoading(loadBtn, true);

    try {
        // Try cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
                currentData = cachedData.data;
                currentSha = cachedData.sha;
                resetHistory();

                renderForm();
                updateSidebarStats();

                document.getElementById("loading-overlay").classList.add("hidden");
                document.getElementById("editor-section").classList.remove("hidden");

                showStatus("✅ Matches Loaded (Cached)", "#16a34a");

                if (loadBtn) setButtonLoading(loadBtn, false);
                return;
            }
        }

        // Cache miss or force refresh - fetch from GitHub
        showStatus(forceRefresh ? "Refreshing from GitHub..." : "Connecting to GitHub...", "#3b82f6");

        const res = await fetchWithRetry(url, {
            headers: { Authorization: `token ${sessionStorage.getItem("githubToken")}` }
        });

        const json = await res.json();
        currentSha = json.sha;

        const decoded = decodeURIComponent(escape(atob(json.content)));
        currentData = JSON.parse(decoded);
        resetHistory();

        // Cache the fetched data
        setCachedData(cacheKey, { data: currentData, sha: currentSha });

        // Debug: Log loaded data
        if (CONFIG.debug) {
            console.log("=== DATA LOADED FROM GITHUB ===");
            console.log("Grade:", currentData.grade);
            console.log("Total Rounds:", currentData.rounds.length);
            console.log("Round 1 Matches:", currentData.rounds[0].matches.length);
            console.log("Round 1 Data:", currentData.rounds[0]);
        }

        renderForm();

        document.getElementById("loading-overlay").classList.add("hidden");
        document.getElementById("editor-section").classList.remove("hidden");

        // Update sidebar stats
        updateSidebarStats();

        showStatus("✅ Matches Loaded Successfully", "#16a34a");
    } catch (e) {
        document.getElementById("loading-overlay").classList.add("hidden");
        if (CONFIG.debug) console.error("Load Error:", e);
        showStatus(`Error: ${e.message}`, "#ef4444");

        // Show user-friendly error alert
        alert(`Failed to load matches:\n\n${e.message}\n\nPlease check:\n• Your GitHub token is valid\n• You have internet connection\n• The repository exists`);
    } finally {
        if (loadBtn) setButtonLoading(loadBtn, false);
    }
}

/**
 * Render all rounds and matches to the DOM
 * Generates HTML for editable and locked match cards
 */
function createStatusBadge(status) {
    const badges = {
        'locked': '🔒 Locked',
        'completed': '✅ Complete',
        'in-progress': '⏳ In Progress',
        'pending': '⏸️ Pending'
    };
    const text = badges[status] || status;
    return createEl("span", `match-status-badge ${status}`, text);
}

function createMatchCard(m, rIdx, mIdx, isLocked) {
    // --- Team Switch Mode logic ---
    const switchModeThisRound = switchModeActive && switchModeRoundIdx === rIdx;
    const eligibleA = switchModeThisRound && !isLocked && m.teamA.points == null && !m.winner;
    const eligibleB = switchModeThisRound && !isLocked && m.teamB.points == null && !m.winner;
    const unlockedA = switchModeThisRound && unlockedTeams.some(t => t.rIdx === rIdx && t.mIdx === mIdx && t.side === 'A');
    const unlockedB = switchModeThisRound && unlockedTeams.some(t => t.rIdx === rIdx && t.mIdx === mIdx && t.side === 'B');

    const isBestLoser = m.type === "best_loser";
    const matchStatus = getMatchStatus(m, isLocked);

    const card = createEl("div", `match-card ${isLocked ? "locked" : "active"} ${isBestLoser ? "best-loser-match" : ""} ${matchStatus}`);
    card.dataset.roundIdx = rIdx;

    // Header
    const header = createEl("div", "", null, "display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;");

    const titleText = isBestLoser ? '🏆 BEST LOSER PLAYOFF' : ('Match #' + m.id);
    if (isBestLoser && !isLocked) {
        // Add Round Name for editable best loser
        // Note: round name is not passed to createMatchCard directly, but logic suggests it was used: '... (' + round.name + ')'
        // I'll skip round name here to strictly follow passed args, or I can access currentData.rounds[rIdx].name
        // Let's safe access it.
        const rName = currentData.rounds[rIdx]?.name || "";
        header.appendChild(createEl("div", "", `🏆 BEST LOSER PLAYOFF (${rName})`, "font-weight:bold; color:#f59e0b;"));
    } else {
        header.appendChild(createEl("div", "", titleText, isBestLoser ? "font-weight:bold; color:#f59e0b;" : "font-weight:bold;"));
    }

    header.appendChild(createStatusBadge(matchStatus));
    card.appendChild(header);

    if (isLocked) {
        // Locked View
        const meta = createEl("div", "", `${m.schedule.date ?? "-"} | ${m.schedule.time ?? "-"} | ${m.schedule.location ?? "-"}`, "font-size:12px; color:#64748b;");
        card.appendChild(meta);

        const scores = createEl("div", "", null, "display:flex; justify-content:space-between; margin-top:10px; font-weight:bold;");
        scores.appendChild(createEl("span", "", `${m.teamA.name}: ${m.teamA.points ?? "-"}`));
        scores.appendChild(createEl("span", "vs-sep", "VS")); // Added class for consistency if needed, or just span
        scores.appendChild(createEl("span", "", `${m.teamB.name}: ${m.teamB.points ?? "-"}`));
        card.appendChild(scores);

        const winnerDiv = createEl("div", "", `🏆 Winner: ${m.winner ?? "Pending"}`, "color:var(--primary); font-size:12px; margin-top:5px; font-weight:bold;");
        card.appendChild(winnerDiv);

    } else {
        // Editable View

        // Schedule Grid
        const grid = createEl("div", "", null, "display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px;");

        ['date', 'time', 'location'].forEach(field => {
            const col = createEl("div");
            col.appendChild(createEl("label", "", field.charAt(0).toUpperCase() + field.slice(1)));
            const input = createEl("input");
            input.type = "text";
            input.value = m.schedule[field] ?? "";
            if (switchModeThisRound) input.disabled = true;
            input.onchange = (e) => updateSchedule(rIdx, mIdx, field, e.target.value);
            col.appendChild(input);
            grid.appendChild(col);
        });
        card.appendChild(grid);

        // Score Row
        const scoreRow = createEl("div", "score-row");

        // Team A Column
        const colA = createEl("div");
        const labelA = createEl("label", "", (unlockedA ? '🔓 ' : '') + m.teamA.name + (unlockedA ? ' (Click to Re-lock)' : eligibleA ? ' 👆 Click to Unlock' : ''));

        if (unlockedA) {
            labelA.style.cssText = "background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;box-shadow:0 2px 8px rgba(59,130,246,0.4);animation:pulse 1.5s infinite;";
            labelA.onclick = () => relockTeam(rIdx, mIdx, 'A');
        } else if (eligibleA) {
            labelA.style.cssText = "cursor:pointer;color:#3b82f6;font-weight:bold;text-decoration:underline;padding:4px 8px;border-radius:6px;background:var(--active-bg);transition:all 0.2s ease;";
            labelA.onmouseover = function () { this.style.background = 'var(--active-overlay)'; };
            labelA.onmouseout = function () { this.style.background = 'var(--active-bg)'; };
            labelA.onclick = () => unlockTeam(rIdx, mIdx, 'A');
        }
        colA.appendChild(labelA);

        const inputA = createEl("input");
        inputA.type = "number";
        inputA.value = m.teamA.points ?? "";
        inputA.min = CONSTANTS.MIN_SCORE;
        inputA.max = CONSTANTS.MAX_SCORE;
        inputA.step = "1";
        inputA.placeholder = `${CONSTANTS.MIN_SCORE}-${CONSTANTS.MAX_SCORE} points`;
        inputA.ariaLabel = `Score for ${m.teamA.name}`;
        if (switchModeThisRound) inputA.disabled = true;
        inputA.oninput = (e) => updateScores(rIdx, mIdx, 'teamA', e.target.value);
        colA.appendChild(inputA);
        scoreRow.appendChild(colA);

        // VS Label
        scoreRow.appendChild(createEl("div", "vs-label", "VS"));

        // Team B Column
        const colB = createEl("div");
        const labelB = createEl("label", "", (unlockedB ? '🔓 ' : '') + m.teamB.name + (unlockedB ? ' (Click to Re-lock)' : eligibleB ? ' 👆 Click to Unlock' : ''));

        if (unlockedB) {
            labelB.style.cssText = "background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;box-shadow:0 2px 8px rgba(59,130,246,0.4);animation:pulse 1.5s infinite;";
            labelB.onclick = () => relockTeam(rIdx, mIdx, 'B');
        } else if (eligibleB) {
            labelB.style.cssText = "cursor:pointer;color:#3b82f6;font-weight:bold;text-decoration:underline;padding:4px 8px;border-radius:6px;background:#eff6ff;transition:all 0.2s ease;";
            labelB.onmouseover = function () { this.style.background = '#dbeafe'; };
            labelB.onmouseout = function () { this.style.background = '#eff6ff'; };
            labelB.onclick = () => unlockTeam(rIdx, mIdx, 'B');
        }
        colB.appendChild(labelB);

        const inputB = createEl("input");
        inputB.type = "number";
        inputB.value = m.teamB.points ?? "";
        inputB.min = CONSTANTS.MIN_SCORE;
        inputB.max = CONSTANTS.MAX_SCORE;
        inputB.step = "1";
        inputB.placeholder = `${CONSTANTS.MIN_SCORE}-${CONSTANTS.MAX_SCORE} points`;
        inputB.ariaLabel = `Score for ${m.teamB.name}`;
        if (switchModeThisRound) inputB.disabled = true;
        inputB.oninput = (e) => updateScores(rIdx, mIdx, 'teamB', e.target.value);
        colB.appendChild(inputB);
        scoreRow.appendChild(colB);

        card.appendChild(scoreRow);

        // Winner Box
        const winBox = createEl("div", "winner-box", `🏆 Winner: ${m.winner ?? "Pending"}`);
        winBox.id = `win-${rIdx}-${mIdx}`;
        card.appendChild(winBox);
    }

    return card;
}

function renderForm() {
    const container = document.getElementById("matches-list");
    container.innerHTML = "";

    currentData.rounds.forEach((round, rIdx) => {
        const isLocked = round.status === "locked";

        const divider = createEl("div", "round-divider");
        divider.appendChild(createEl("span", "", round.name));
        divider.appendChild(createEl("span", "round-badge", isLocked ? "🔒 ARCHIVED" : "🔓 EDITABLE"));
        container.appendChild(divider);

        round.matches.forEach((m, mIdx) => {
            container.appendChild(createMatchCard(m, rIdx, mIdx, isLocked));
        });

        // Add round management controls for any editable (not locked) round
        if (!isLocked) {
            addRoundManagementControls(container, round, rIdx);
        }

        // Add round deletion controls (Gap 1: XSS Remediation - Refactored)
        // Check legacy or secure role? Using secure logic inside utility
        addRoundDeletionControls(container, round, rIdx);
    });

    // Update sidebar stats after rendering
    updateSidebarStats();

    // Populate round filter dropdown
    populateRoundFilter();

    // Initialize pagination
    initializePagination();
}

/**
 * Populate the round filter dropdown with current rounds
 */
function populateRoundFilter() {
    const roundFilter = document.getElementById("round-filter");
    if (!roundFilter || !currentData) return;

    // Clear existing options safely
    while (roundFilter.firstChild) {
        roundFilter.removeChild(roundFilter.firstChild);
    }

    // Add "All Rounds" option
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Rounds";
    roundFilter.appendChild(allOption);

    currentData.rounds.forEach((round, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = round.name;
        roundFilter.appendChild(option);
    });
}

/**
 * Filter matches based on search term, status, and round
 */
function filterMatches() {
    const searchTerm = document.getElementById("match-search")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("status-filter")?.value || "all";
    const roundFilter = document.getElementById("round-filter")?.value || "all";

    // Get all match cards and round dividers
    const cards = document.querySelectorAll(".match-card");
    const dividers = document.querySelectorAll(".round-divider");

    let visibleCount = 0;

    // Track which rounds have visible matches
    const roundsWithMatches = new Set();

    cards.forEach((card) => {
        const roundIdx = parseInt(card.dataset.roundIdx);
        const teamAName = card.querySelector(".team-label:nth-of-type(1) strong")?.textContent.toLowerCase() || "";
        const teamBName = card.querySelector(".team-label:nth-of-type(2) strong")?.textContent.toLowerCase() || "";

        // Get match status from card classes
        let matchStatus = "pending";
        if (card.classList.contains("locked")) matchStatus = "locked";
        else if (card.classList.contains("completed")) matchStatus = "completed";
        else if (card.classList.contains("in-progress")) matchStatus = "in-progress";

        // Check filters
        const matchesSearch = searchTerm === "" ||
            teamAName.includes(searchTerm) ||
            teamBName.includes(searchTerm);
        const matchesStatus = statusFilter === "all" || matchStatus === statusFilter;
        const matchesRound = roundFilter === "all" || roundIdx === parseInt(roundFilter);

        if (matchesSearch && matchesStatus && matchesRound) {
            card.style.display = "";
            roundsWithMatches.add(roundIdx);
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    // Show/hide round dividers based on whether they have visible matches
    dividers.forEach((divider, idx) => {
        if (roundsWithMatches.has(idx)) {
            divider.style.display = "";
        } else {
            divider.style.display = "none";
        }
    });

    // Show message if no matches found
    const matchesList = document.getElementById("matches-list");
    let noResultsMsg = document.getElementById("no-results-message");

    if (visibleCount === 0 && matchesList) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement("div");
            noResultsMsg.id = "no-results-message";
            noResultsMsg.style.cssText = "text-align: center; padding: 40px; color: #64748b; font-size: 16px;";
            noResultsMsg.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p style="margin: 0; font-weight: 600;">No matches found</p>
                <p style="margin: 5px 0 0; font-size: 14px;">Try adjusting your search or filters</p>
            `;
            matchesList.appendChild(noResultsMsg);
        }
        noResultsMsg.style.display = "block";
    } else if (noResultsMsg) {
        noResultsMsg.style.display = "none";
    }

    // Initialize pagination after filtering
    initializePagination();

    if (CONFIG.debug) console.log(`🔍 Filter applied: ${visibleCount} matches visible`);
}

/**
 * Clear all filters and show all matches
 */
function clearFilters() {
    document.getElementById("match-search").value = "";
    document.getElementById("status-filter").value = "all";
    document.getElementById("round-filter").value = "all";
    filterMatches();
    showStatus("✅ Filters cleared", "#16a34a");
}

// ============================================
// PAGINATION FUNCTIONS
// ============================================

/**
 * Change to a specific page
 */
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayCurrentPage();
}

/**
 * Display matches for the current page
 */
function displayCurrentPage() {
    const startIdx = (currentPage - 1) * CONSTANTS.MATCHES_PER_PAGE;
    const endIdx = startIdx + CONSTANTS.MATCHES_PER_PAGE;

    const matchCards = document.querySelectorAll('.match-card');

    matchCards.forEach((card, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    updatePaginationControls();

    // Scroll to top of matches list
    const matchesList = document.getElementById('matches-list');
    if (matchesList) {
        matchesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Update pagination control buttons
 */
function updatePaginationControls() {
    const paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) return;

    // Hide pagination if only one page
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
                style="padding: 8px 16px; border-radius: 8px; border: 2px solid var(--border-color); 
                       background: var(--card-bg); color: var(--text-main); cursor: pointer;">
            ← Previous
        </button>
        <div style="display: flex; gap: 8px; align-items: center;">
    `;

    // Show page numbers with ellipsis for many pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="changePage(1)" style="padding: 8px 12px; border-radius: 8px; 
                        border: 2px solid var(--border-color); background: var(--card-bg); 
                        color: var(--text-main); cursor: pointer;">1</button>`;
        if (startPage > 2) {
            html += `<span style="color: var(--text-muted);">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button onclick="changePage(${i})" 
                    style="padding: 8px 12px; border-radius: 8px; 
                           border: 2px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; 
                           background: ${isActive ? 'var(--primary)' : 'var(--card-bg)'}; 
                           color: ${isActive ? 'white' : 'var(--text-main)'}; 
                           cursor: pointer; font-weight: ${isActive ? 'bold' : 'normal'};">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="color: var(--text-muted);">...</span>`;
        }
        html += `<button onclick="changePage(${totalPages})" style="padding: 8px 12px; border-radius: 8px; 
                        border: 2px solid var(--border-color); background: var(--card-bg); 
                        color: var(--text-main); cursor: pointer;">${totalPages}</button>`;
    }

    html += `
        </div>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
                style="padding: 8px 16px; border-radius: 8px; border: 2px solid var(--border-color); 
                       background: var(--card-bg); color: var(--text-main); cursor: pointer;">
            Next →
        </button>
    `;

    html += `<div style="margin-left: 16px; color: var(--text-muted); font-size: 14px;">
                Page ${currentPage} of ${totalPages}
             </div>`;

    paginationContainer.innerHTML = html;
}

/**
 * Initialize pagination based on visible matches
 */
function initializePagination() {
    const visibleMatches = document.querySelectorAll('.match-card[style*="display: block"], .match-card:not([style*="display: none"])');
    const visibleCount = Array.from(document.querySelectorAll('.match-card')).filter(card => {
        return card.style.display !== 'none';
    }).length;

    totalPages = Math.ceil(visibleCount / CONSTANTS.MATCHES_PER_PAGE);
    currentPage = 1;

    displayCurrentPage();
}

/**
 * Update sidebar statistics
 */
function updateSidebarStats() {
    if (!currentData) return;

    // Grade Level
    document.getElementById("sidebar-grade").textContent = currentData.grade || "--";

    // Total Rounds
    document.getElementById("sidebar-rounds").textContent = currentData.rounds?.length || 0;

    // Count all matches across all rounds
    let totalMatches = 0;
    let completedMatches = 0;
    let qualifiedTeams = 0;

    currentData.rounds.forEach(round => {
        if (round.matches) {
            totalMatches += round.matches.length;
            completedMatches += round.matches.filter(m => m.winner !== null && m.winner !== undefined && m.winner !== "").length;

            // Only count qualified from last round
            if (round === currentData.rounds[currentData.rounds.length - 1]) {
                qualifiedTeams = getQualifiedTeams(round).length;
            }
        }
    });

    // Active Matches (total)
    document.getElementById("sidebar-matches").textContent = totalMatches;

    // Completed Matches
    document.getElementById("sidebar-completed").textContent = `${completedMatches}/${totalMatches}`;

    // Qualified Teams (from last round)
    document.getElementById("sidebar-qualified").textContent = qualifiedTeams;
}

/**
 * Add deletion controls for non-last rounds
 */
function addRoundDeletionControls(container, round, rIdx) {
    const role = AdminSecurity.getRole();
    if (role === ROLE_ABSOLUTE) {
        // Use variables for Dark Mode compatibility
        const controlsDiv = createEl("div", "", null, "background: var(--danger-bg); padding: 15px; border-radius: 12px; margin: 20px 0; border: 2px solid var(--danger-border);");

        const hasSubsequentRounds = rIdx < currentData.rounds.length - 1;
        const subsequentCount = currentData.rounds.length - 1 - rIdx;

        const header = createEl("div", "", "⚠️ Round Management", "font-weight: bold; font-size: 16px; margin-bottom: 10px; color: var(--danger-text);");
        controlsDiv.appendChild(header);

        const btnText = `🗑️ Delete This Round${hasSubsequentRounds ? ` (+${subsequentCount} subsequent)` : ''}`;
        const deleteBtn = createEl("button", "", btnText, "background: var(--danger); border: 2px solid var(--danger-text); width: 100%; color: white; padding: 8px; cursor: pointer; border-radius: 6px;");
        deleteBtn.onclick = () => cascadeDeleteRound(rIdx);
        controlsDiv.appendChild(deleteBtn);

        if (hasSubsequentRounds) {
            const warningText = `⚠️ Warning: This will cascade delete all rounds from ${round.name} onwards (${subsequentCount + 1} total)`;
            const warning = createEl("div", "", warningText, "font-size: 11px; color: var(--danger-text); margin-top: 8px; padding: 8px; background: var(--danger-bg); border-radius: 4px; border: 1px solid var(--danger-border);");
            controlsDiv.appendChild(warning);
        }

        container.appendChild(controlsDiv);
    }
}

/**
 * Add management controls for creating best loser and generating next round
 */
function addRoundManagementControls(container, round, rIdx) {
    // Always define controlsDiv before use
    const controlsDiv = createEl("div", "", null, "background: var(--card-bg); padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px dashed var(--border-color); box-shadow: var(--card-shadow);");

    // Show switch mode banner if active
    if (switchModeActive) {
        let banner = document.getElementById("switch-mode-banner");
        if (!banner) {
            banner = createEl("div");
            banner.id = "switch-mode-banner";
            banner.style.cssText = "background:#0d47a1;color:#fff;padding:12px 20px;margin-bottom:18px;border-radius:8px;font-weight:bold;font-size:16px;text-align:center; display:flex; align-items:center; justify-content:center; gap:15px;";

            const textSpan = createEl("span", "", "⚠️ Structural Switch Mode Active — Only unplayed teams can be swapped.");
            banner.appendChild(textSpan);

            const exitBtn = createEl("button", "", "Exit Switch Mode", "background:#64748b;color:#fff;padding:6px 16px;border-radius:8px;border:none;cursor:pointer;");
            exitBtn.onclick = exitTeamSwitchMode;
            banner.appendChild(exitBtn);

            container.parentNode.insertBefore(banner, container);
        }
    } else {
        const banner = document.getElementById("switch-mode-banner");
        if (banner) banner.remove();
    }

    const roundComplete = isRoundComplete(round);
    const qualified = getQualifiedTeams(round);
    const hasOddTeams = qualified.length % 2 !== 0;
    const hasBestLoser = hasBestLoserMatch(round);

    // Debug logging
    if (CONFIG.debug) {
        console.log("=== ROUND MANAGEMENT DEBUG ===");
        console.log("Round:", round.name);
        console.log("Total Matches:", round.matches.length);
        console.log("Matches:", round.matches.map(m => ({ id: m.id, winner: m.winner })));
        console.log("Qualified Teams:", qualified);
    }

    const header = createEl("div", "", "📋 Round Management (v2.1.0)", "font-weight: bold; font-size: 18px; margin-bottom: 15px; color: var(--primary);");
    controlsDiv.appendChild(header);

    // Status info
    const completedMatches = round.matches.filter(m => m.winner !== null && m.winner !== undefined && m.winner !== "").length;
    const infoDiv = createEl("div", "", null, "margin-bottom: 15px; font-size: 14px;");
    const info1 = createEl("div", "", `✅ Completed Matches: ${completedMatches} / ${round.matches.length}`);
    const info2 = createEl("div", "", `🏆 Qualified Teams: ${qualified.length}${hasOddTeams ? ' (ODD - Need Best Loser!)' : ' (EVEN)'}`);
    infoDiv.appendChild(info1);
    infoDiv.appendChild(info2);
    controlsDiv.appendChild(infoDiv);

    // Best Loser Button
    if (roundComplete && hasOddTeams && !hasBestLoser) {
        const blBtn = createEl("button", "", "🏆 Create Best Loser Playoff", "margin-bottom: 10px; background: #f59e0b; width:100%; padding:10px; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;");
        blBtn.onclick = () => showBestLoserCreator(rIdx);
        controlsDiv.appendChild(blBtn);
    } else if (hasBestLoser) {
        const blStatus = createEl("div", "", "✅ Best Loser Playoff exists", "padding: 10px; background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); border-radius: 6px; margin-bottom: 10px;");
        controlsDiv.appendChild(blStatus);
    }

    // Generate Next Round Button
    if (canGenerateNextRound()) {
        const genBtn = createEl("button", "", "➕ Generate Next Round", "background: var(--success); margin-bottom: 10px; width:100%; padding:10px; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;");
        genBtn.onclick = () => showRoundGenerator(rIdx);
        controlsDiv.appendChild(genBtn);
    } else if (!roundComplete) {
        const warning = createEl("div", "", "⚠️ Complete all matches before generating next round", "padding: 10px; background: var(--info-bg); border: 1px solid var(--info-border); border-radius: 6px; color: var(--info-text); margin-bottom: 10px;");
        controlsDiv.appendChild(warning);
    }

    // End Tournament Button (only if round is complete and this is truly the final round)
    if (roundComplete && canGenerateNextRound() && qualified.length <= 4) {
        const endBtn = createEl("button", "", "🏁 End Tournament & Lock Final Round", "background: #7c3aed; margin-top: 10px; width:100%; padding:10px; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;");
        endBtn.onclick = () => endTournament(rIdx);
        controlsDiv.appendChild(endBtn);
    }

    container.appendChild(controlsDiv);

    // Add Team Switch Mode button for absolute admin only
    const role = AdminSecurity.getRole();
    if (role === ROLE_ABSOLUTE && !switchModeActive) {
        const switchBtn = createEl("button", "", "🔄 Enable Team Switch Mode", "background:#0d47a1;color:#fff;margin-top:10px;width:100%;padding:10px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;");
        switchBtn.onclick = () => activateTeamSwitchMode(rIdx);
        controlsDiv.appendChild(switchBtn);
    }
}

/**
 * Cascade delete a round and all subsequent rounds
 * @param {number} rIdx - Index of the round to delete
 */
function cascadeDeleteRound(rIdx) {
    // Structural action confirmation and logging
    if (!confirm("You are performing a structural override. Continue?")) {
        showStatus("Structural action cancelled.", "#64748b");
        return;
    }
    logStructuralAction("Cascade Delete Round", { admin: currentUser, roundIndex: rIdx, timestamp: new Date().toISOString() });
    // Guard: Only absolute admin can perform structural actions
    const role = AdminSecurity.getRole();
    if (role !== ROLE_ABSOLUTE) {
        alert("Permission Denied: Only the absolute admin can perform this structural action.");
        return;
    }
    const round = currentData.rounds[rIdx];
    const totalRounds = currentData.rounds.length;
    const subsequentCount = totalRounds - rIdx;

    // Check if round is locked
    if (round.status === "locked") {
        alert("Cannot delete a locked round. Locked rounds are finalized and cannot be modified.");
        return;
    }

    // Gather information for confirmation
    const roundsToDelete = currentData.rounds.slice(rIdx);
    const totalMatchesToDelete = roundsToDelete.reduce((sum, r) => sum + (r.matches?.length || 0), 0);
    const bestLoserMatchesToDelete = roundsToDelete.reduce((sum, r) => {
        return sum + (r.matches?.filter(m => m.type === "best_loser").length || 0);
    }, 0);

    // Build confirmation message
    let confirmMsg = `⚠️ CRITICAL DELETION WARNING ⚠️\n\n`;
    confirmMsg += `You are about to DELETE:\n`;
    confirmMsg += `• ${subsequentCount} round${subsequentCount > 1 ? 's' : ''} (${roundsToDelete.map(r => r.name).join(', ')})\n`;
    confirmMsg += `• ${totalMatchesToDelete} match${totalMatchesToDelete !== 1 ? 'es' : ''} with all scores and results\n`;

    if (bestLoserMatchesToDelete > 0) {
        confirmMsg += `• ${bestLoserMatchesToDelete} Best Loser match${bestLoserMatchesToDelete !== 1 ? 'es' : ''}\n`;
    }

    confirmMsg += `\nThis action will:\n`;
    confirmMsg += `1. Permanently delete all listed rounds\n`;
    confirmMsg += `2. Remove all matches and scores from those rounds\n`;
    confirmMsg += `3. Remove all Best Loser matches in those rounds\n`;
    confirmMsg += `4. Cannot be undone (Undo history will be cleared)\n\n`;
    confirmMsg += `Are you sure you want to proceed?`;

    // First confirmation
    const firstConfirm = confirm(confirmMsg);
    if (!firstConfirm) {
        showStatus("Round deletion cancelled", "#64748b");
        return;
    }

    // Second confirmation - require typing
    const verification = prompt(
        `FINAL CONFIRMATION\n\n` +
        `This will permanently delete ${subsequentCount} round(s) and ${totalMatchesToDelete} match(es).\n\n` +
        `Type "CONFIRM REVERT" (all caps, exactly as shown) to proceed:`
    );

    if (verification !== "CONFIRM REVERT") {
        showStatus("Round deletion cancelled - verification failed", "#ef4444");
        return;
    }

    // Perform cascade deletion
    if (CONFIG.debug) {
        console.log("=== CASCADE DELETE INITIATED ===");
        console.log("Deleting rounds from index:", rIdx);
        console.log("Rounds to delete:", roundsToDelete.map(r => r.name));
    }

    // Clear undo/redo history for safety
    resetHistory();

    // Delete all rounds from rIdx onwards
    currentData.rounds = currentData.rounds.slice(0, rIdx);

    // Unlock the previous round if it exists and is locked
    // This allows editing and regenerating the next round
    let unlockedRound = null;
    let removedBestLoser = false;
    if (rIdx > 0 && currentData.rounds.length > 0) {
        const previousRound = currentData.rounds[rIdx - 1];
        if (previousRound && previousRound.status === "locked") {
            previousRound.status = "active";
            unlockedRound = previousRound.name;

            // Remove Best Loser matches from the unlocked round
            // Scores might be edited, so Best Loser needs to be recalculated
            const originalMatchCount = previousRound.matches.length;
            previousRound.matches = previousRound.matches.filter(m => m.type !== "best_loser");
            removedBestLoser = previousRound.matches.length < originalMatchCount;

            if (CONFIG.debug) {
                console.log(`Unlocked ${previousRound.name} after cascade deletion`);
                if (removedBestLoser) {
                    console.log(`Removed Best Loser match from ${previousRound.name} - will need recalculation`);
                }
            }
        }
    }

    // If we deleted all rounds, reinitialize with Round 1
    if (currentData.rounds.length === 0) {
        currentData.rounds = [{
            id: 1,
            name: "Round 1",
            status: "active",
            matches: []
        }];
    }

    // Log action (for audit trail)
    if (!currentData.auditLog) currentData.auditLog = [];
    currentData.auditLog.push({
        timestamp: new Date().toISOString(),
        action: "CASCADE_DELETE_ROUNDS",
        user: currentUser || "Unknown",
        details: {
            deletedRounds: roundsToDelete.map(r => r.name),
            matchesDeleted: totalMatchesToDelete,
            bestLoserMatchesDeleted: bestLoserMatchesToDelete,
            unlockedRound: unlockedRound || null,
            removedBestLoserFromUnlocked: removedBestLoser
        }
    });

    // Re-render and update
    renderForm();
    updateSidebarStats();

    // Show status message
    let statusMsg = `🗑️ Deleted ${subsequentCount} round(s) and ${totalMatchesToDelete} match(es).`;
    if (unlockedRound) {
        statusMsg += ` ${unlockedRound} unlocked`;
        if (removedBestLoser) {
            statusMsg += ` (Best Loser removed)`;
        }
        statusMsg += `.`;
    }
    statusMsg += ` Save to persist changes.`;

    showStatus(statusMsg, "#ef4444");
}

/**
 * End tournament and lock the final round
 */
function endTournament(rIdx) {
    // Structural action confirmation and logging
    if (!confirm("You are performing a structural override. Continue?")) {
        showStatus("Structural action cancelled.", "#64748b");
        return;
    }
    logStructuralAction("End Tournament", { admin: currentUser, roundIndex: rIdx, timestamp: new Date().toISOString() });
    // Guard: Only absolute admin can perform structural actions
    const role = AdminSecurity.getRole();
    if (role !== ROLE_ABSOLUTE) {
        alert("Permission Denied: Only the absolute admin can perform this structural action.");
        return;
    }
    const confirmed = confirm("Are you sure you want to end the tournament? This will lock the final round and prevent further changes.");

    if (!confirmed) return;

    saveHistorySnapshot();

    // Lock the final round
    currentData.rounds[rIdx].status = "locked";

    // Optionally add tournament completion status
    if (!currentData.tournamentStatus) {
        currentData.tournamentStatus = "completed";
    }

    renderForm();
    updateSidebarStats();
    showStatus("🏁 Tournament ended! Final round locked. Save to publish.", "#7c3aed");
}

function updateSchedule(rIdx, mIdx, field, value) {
    const currentValue = currentData.rounds[rIdx].matches[mIdx].schedule[field] ?? "";
    if (currentValue === value) return;

    saveHistorySnapshot();
    currentData.rounds[rIdx].matches[mIdx].schedule[field] = value;
    updateSidebarStats(); // Update stats after schedule change
}

/**
 * Update match scores with validation
 * @param {number} rIdx - Round index
 * @param {number} mIdx - Match index
 * @param {string} team - Team identifier ("teamA" or "teamB")
 * @param {string} val - Score value
 */
function updateScores(rIdx, mIdx, team, val) {
    const m = currentData.rounds[rIdx].matches[mIdx];

    // Get the input element for visual feedback
    const inputElement = event?.target;

    if (inputElement && !inputElement.dataset.historyCaptured) {
        saveHistorySnapshot();
        inputElement.dataset.historyCaptured = "1";
        inputElement.addEventListener("blur", () => {
            delete inputElement.dataset.historyCaptured;
        }, { once: true });
    }

    if (val === "") {
        if (team === "teamA") m.teamA.points = null;
        else m.teamB.points = null;

        // Remove invalid class when cleared
        if (inputElement) inputElement.classList.remove("invalid");
    } else {
        const pts = parseInt(val);

        // Validate input
        if (isNaN(pts)) {
            if (inputElement) {
                inputElement.classList.add("invalid");
                setTimeout(() => inputElement.classList.remove("invalid"), CONSTANTS.VALIDATION_ERROR_DISPLAY);
            }
            showStatus("⚠️ Please enter a valid number", "#f59e0b");
            return;
        }

        if (pts < CONSTANTS.MIN_SCORE || pts > CONSTANTS.MAX_SCORE) {
            if (inputElement) {
                inputElement.classList.add("invalid");
                setTimeout(() => inputElement.classList.remove("invalid"), CONSTANTS.VALIDATION_ERROR_DISPLAY);
            }
            showStatus(`⚠️ Score must be between ${CONSTANTS.MIN_SCORE} and ${CONSTANTS.MAX_SCORE}`, "#f59e0b");
            return;
        }

        // Valid input - remove invalid class and save
        if (inputElement) inputElement.classList.remove("invalid");

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

    // Update sidebar stats when scores change
    updateSidebarStats();
}

// ============================================
// TEAM SWITCH MODE FUNCTIONS (GLOBAL)
// ============================================

/**
 * Activate team switch mode with token reconfirmation
 * @param {number} rIdx - Round index
 */
async function activateTeamSwitchMode(rIdx) {
    if (AdminSecurity.getRole() !== ROLE_ABSOLUTE) return;

    const code = prompt("Enter your structural authentication password to enable team switching:");
    if (!code) {
        return; // User cancelled
    }

    // SHA-256 hash of 'jammeh' (hex): 45888f0c28b9e1007b74238f0dd90312efe9b3c4298957c80079845ed7725384
    const expectedHash = "45888f0c28b9e1007b74238f0dd90312efe9b3c4298957c80079845ed7725384";
    const codeHash = await hashString(code);

    if (codeHash !== expectedHash) {
        alert("❌ Incorrect password. Access denied.");
        return;
    }

    switchModeActive = true;
    unlockedTeams = [];
    switchModeRoundIdx = rIdx;
    renderForm();
}

/**
 * Exit team switch mode
 */
function exitTeamSwitchMode() {
    switchModeActive = false;
    unlockedTeams = [];
    switchModeRoundIdx = null;
    renderForm();
}

/**
 * Save current competition data to GitHub
 * @returns {Promise<void>}
 * @throws {Error} GitHub API errors or network failures
 */
async function saveToGitHub() {
    // Layer 6: Revalidate Integrity before Write in Admin Mode
    if (!verifyIntegrity()) {
        alert("⛔ Security Violation: Runtime integrity check failed. Action blocked.");
        return;
    }

    const path = `data/competition-grade${currentData.grade}.json`;
    const saveBtn = document.querySelector('button[onclick="saveToGitHub()"]');

    showStatus("Saving Changes...", "#f59e0b");
    if (saveBtn) setButtonLoading(saveBtn, true);

    try {
        const contentString = JSON.stringify(currentData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(contentString)));

        const res = await fetchWithRetry(
            `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `token ${sessionStorage.getItem("githubToken")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Update by President ${currentUser}`,
                    content: base64Content,
                    sha: currentSha
                })
            }
        );

        const responseData = await res.json();
        if (responseData && responseData.content && responseData.content.sha) {
            currentSha = responseData.content.sha; // Immediate update
            if (CONFIG.debug) console.log("✅ SHA updated immediately:", currentSha);
        }

        showStatus("✅ Saved Successfully!", "#16a34a");
        updateSidebarStats();

        // Clear cache for this grade to ensure fresh data on next load
        const cacheKey = `grade${currentData.grade}`;
        localStorage.removeItem(CONSTANTS.CACHE_KEY_PREFIX + cacheKey);
        if (CONFIG.debug) console.log(`🗑️ Cleared cache for ${cacheKey}`);

        // Reload to refresh UI (optional now that SHA is safe)
        loadMatches(true);
    } catch (e) {
        showStatus(`❌ ${e.message}`, "#ef4444");

        // Show detailed error message
        let errorDetails = e.message;
        if (e.status === 409) {
            errorDetails += "\n\nThe file has been modified by someone else. Click OK to reload the latest version.";
            if (confirm(errorDetails)) {
                loadMatches();
            }
        } else {
            alert(`Failed to save:\n\n${errorDetails}\n\nPlease check:\n• Your GitHub token is valid\n• You have write permissions\n• Your internet connection`);
        }
    } finally {
        if (saveBtn) setButtonLoading(saveBtn, false);
    }
}

// ============================================
// BEST LOSER SYSTEM
// ============================================

/**
 * Show UI for creating best loser match
 */
function showBestLoserCreator(rIdx) {
    const round = currentData.rounds[rIdx];
    const losers = getLosersSorted(round);

    if (losers.length < 2) {
        alert("Not enough losers to create a Best Loser playoff.");
        return;
    }

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "modal-backdrop";
    overlay.className = "modal-overlay";
    overlay.onclick = closeBestLoserModal;

    // Create modal
    const modal = document.createElement("div");
    modal.id = "best-loser-modal";
    modal.className = "modal-container";
    modal.onclick = (e) => e.stopPropagation(); // Prevent close when clicking inside

    let html = `
        <div class="modal-header">
            <h3 class="modal-title">🏆 Create Best Loser Playoff</h3>
            <p class="modal-subtitle">Select 2 teams from losers. The winner will qualify for the next round.</p>
        </div>
        <div class="modal-body">
            <div class="input-group">
                <label>Best Loser A:</label>
                <select id="loser-a" class="modal-select">
                    <option value="">-- Select Team --</option>
                    ${losers.map(l => `<option value="${l.name}">${l.name} (${l.points} pts)</option>`).join('')}
                </select>
            </div>
            <div class="input-group">
                <label>Best Loser B:</label>
                <select id="loser-b" class="modal-select">
                    <option value="">-- Select Team --</option>
                    ${losers.map(l => `<option value="${l.name}">${l.name} (${l.points} pts)</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="createBestLoserMatch(${rIdx})" style="background: var(--success);">✅ Create Match</button>
            <button onclick="closeBestLoserModal()" style="background: var(--danger);">❌ Cancel</button>
        </div>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Setup iOS keyboard handling
    setupIOSKeyboardHandling();

    // Add duplicate prevention
    document.getElementById("loser-a").onchange = () => updateLoserDropdowns();
    document.getElementById("loser-b").onchange = () => updateLoserDropdowns();
}

function updateLoserDropdowns() {
    const selectA = document.getElementById("loser-a");
    const selectB = document.getElementById("loser-b");

    if (!selectA || !selectB) return;

    const valueA = selectA.value;
    const valueB = selectB.value;

    // Disable selected team in other dropdown
    Array.from(selectB.options).forEach(opt => {
        opt.disabled = opt.value === valueA && opt.value !== "";
    });

    Array.from(selectA.options).forEach(opt => {
        opt.disabled = opt.value === valueB && opt.value !== "";
    });
}

function closeBestLoserModal() {
    cleanupIOSKeyboardHandling();
    const overlay = document.getElementById("modal-backdrop");
    if (overlay) overlay.remove();
}

function closeRoundGenModal() {
    cleanupIOSKeyboardHandling();
    const overlay = document.getElementById("modal-backdrop");
    if (overlay) overlay.remove();
    pairingState = { teams: [], usedTeams: new Set(), matches: [] };
}

/**
 * Create the best loser match
 */
function createBestLoserMatch(rIdx) {
    const teamA = document.getElementById("loser-a").value;
    const teamB = document.getElementById("loser-b").value;

    if (!teamA || !teamB) {
        alert("Please select both teams.");
        return;
    }

    if (teamA === teamB) {
        alert("Cannot select the same team twice.");
        return;
    }

    const round = currentData.rounds[rIdx];

    // Safety check: prevent duplicate Best Loser matches
    if (hasBestLoserMatch(round)) {
        alert("This round already has a Best Loser match. Please delete the existing one first (use Undo) or complete it.");
        return;
    }

    saveHistorySnapshot();

    // Get next match ID
    const maxId = Math.max(...round.matches.map(m => m.id || 0));

    // Create best loser match
    const bestLoserMatch = {
        id: maxId + 1,
        type: "best_loser",
        schedule: {
            date: "Pending",
            time: "TBD",
            location: round.matches[0]?.schedule?.location || "Maths Lab"
        },
        teamA: { name: teamA, points: null },
        teamB: { name: teamB, points: null },
        winner: null
    };

    // Add to round
    round.matches.push(bestLoserMatch);

    closeBestLoserModal();
    renderForm();
    updateSidebarStats();
    showStatus("✅ Best Loser match created! Don't forget to save.", "#16a34a");
}

// ============================================
// ROUND GENERATION SYSTEM
// ============================================

let pairingState = { teams: [], usedTeams: new Set(), matches: [] };

/**
 * Show UI for generating next round
 */
function showRoundGenerator(rIdx) {
    // Structural action confirmation and logging
    if (!confirm("You are performing a structural override. Continue?")) {
        showStatus("Structural action cancelled.", "#64748b");
        return;
    }
    logStructuralAction("Show Round Generator", { admin: currentUser, roundIndex: rIdx, timestamp: new Date().toISOString() });
    // Log structural actions to console (optionally extend to persistent log)
    function logStructuralAction(action, details) {
        if (CONFIG.debug) {
            console.log(`[STRUCTURAL ACTION] ${action}`, details);
        }
        // Persistent log in localStorage
        try {
            const logKey = 'ksss_structural_action_log';
            const log = JSON.parse(localStorage.getItem(logKey) || '[]');
            log.push({ action, ...details });
            localStorage.setItem(logKey, JSON.stringify(log));
        } catch (e) {
            if (CONFIG.debug) console.warn('Failed to persist structural action log:', e);
        }
    }

    // Show structural action log in a modal
    function showStructuralActionLog() {
        try {
            const logKey = 'ksss_structural_action_log';
            const log = JSON.parse(localStorage.getItem(logKey) || '[]');
            let html = '<h3>📝 Structural Action Log</h3>';
            if (log.length === 0) {
                html += '<p style="color:#64748b;">No structural actions recorded yet.</p>';
            } else {
                html += '<ul style="max-height:300px;overflow-y:auto;padding-left:18px;">';
                for (const entry of log.reverse()) {
                    html += `<li><b>${entry.action}</b> by <span style="color:#0d47a1;">${entry.admin}</span> <span style="color:#64748b;">[${entry.timestamp}]</span></li>`;
                }
                html += '</ul>';
            }
            html += '<button onclick="closeStructuralLogModal()" style="margin-top:15px;background:#64748b;color:#fff;padding:8px 18px;border-radius:8px;">Close</button>';
            const modal = document.createElement('div');
            modal.id = 'structural-log-modal';
            modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:30px;z-index:9999;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);min-width:320px;max-width:90vw;';
            modal.innerHTML = html;
            document.body.appendChild(modal);
            const backdrop = document.createElement('div');
            backdrop.id = 'structural-log-backdrop';
            backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9998;';
            backdrop.onclick = closeStructuralLogModal;
            document.body.appendChild(backdrop);
        } catch (e) {
            alert('Failed to load structural action log.');
        }
    }
    function closeStructuralLogModal() {
        const modal = document.getElementById('structural-log-modal');
        const backdrop = document.getElementById('structural-log-backdrop');
        if (modal) modal.remove();
        if (backdrop) backdrop.remove();
    }
    // Guard: Only absolute admin can perform structural actions
    const role = currentAdminRole || sessionStorage.getItem("currentAdminRole");
    if (role !== ROLE_ABSOLUTE) {
        alert("Permission Denied: Only the absolute admin can perform this structural action.");
        return;
    }
    const round = currentData.rounds[rIdx];
    const qualified = getQualifiedTeams(round);
    const suggestedMatches = qualified.length / 2;

    const container = document.getElementById("matches-list");
    const modal = document.createElement("div");
    modal.id = "round-gen-modal";
    modal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 3000; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;";

    let html = '<h3 style="margin-top: 0; color: var(--primary);">➕ Generate Next Round</h3>';
    html += `<p style="font-size: 14px; color: #64748b;">${qualified.length} teams qualified. Suggested: ${suggestedMatches} matches.</p>`;

    html += `<div style="margin: 20px 0;">
        <label>Number of Matches:</label>
        <input type="number" id="num-matches" value="${suggestedMatches}" min="1" max="${suggestedMatches}" style="margin-top: 5px;">
        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Must pair all ${qualified.length} teams</div>
    </div>`;

    html += `<div style="display: flex; gap: 10px; margin-top: 20px;">
        <button onclick="startPairing(${rIdx})" style="flex: 1; background: var(--success);">✅ Start Pairing</button>
        <button onclick="closeRoundGenModal()" style="flex: 1; background: #ef4444;">❌ Cancel</button>
    </div>`;

    modal.innerHTML = html;

    // Add backdrop
    const backdrop = document.createElement("div");
    backdrop.id = "modal-backdrop";
    backdrop.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2999;";
    backdrop.onclick = closeRoundGenModal;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // Setup iOS keyboard handling
    setupIOSKeyboardHandling();
}

function closeRoundGenModal() {
    const modal = document.getElementById("round-gen-modal");
    const backdrop = document.getElementById("modal-backdrop");
    if (modal) modal.remove();
    if (backdrop) backdrop.remove();
    pairingState = { teams: [], usedTeams: new Set(), matches: [] };
}

/**
 * Start the pairing process
 */
function startPairing(rIdx) {
    const round = currentData.rounds[rIdx];
    const qualified = getQualifiedTeams(round);
    const numMatches = parseInt(document.getElementById("num-matches").value);

    if (numMatches * 2 !== qualified.length) {
        alert(`Invalid number of matches. ${qualified.length} teams require exactly ${qualified.length / 2} matches.`);
        return;
    }

    // Initialize pairing state
    pairingState = {
        teams: qualified,
        usedTeams: new Set(),
        matches: [],
        sourceRoundIdx: rIdx
    };

    showPairingUI(numMatches);
}

/**
 * Show pairing UI
 */
function showPairingUI(numMatches) {
    const modal = document.getElementById("round-gen-modal");

    let html = `
        <div class="modal-header">
            <h3 class="modal-title">🎯 Manual Pairing</h3>
            <p class="modal-subtitle">Select teams for each match. A team can only be used once.</p>
        </div>
        <div class="modal-body">
            <div id="pairing-container">`;

    for (let i = 0; i < numMatches; i++) {
        html += `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 10px; color: var(--primary);">Match ${i + 1}</div>
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center;">
                    <select id="match-${i}-a" onchange="updatePairingDropdowns()" class="modal-select">
                        ${generateTeamOptions()}
                    </select>
                    <span style="font-weight: bold; color: var(--primary);">VS</span>
                    <select id="match-${i}-b" onchange="updatePairingDropdowns()" class="modal-select">
                        ${generateTeamOptions()}
                    </select>
                </div>
            </div>`;
    }

    html += `
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="finalizePairing(${numMatches})" style="background: var(--success);">✅ Create Round</button>
            <button onclick="closeRoundGenModal()" style="background: var(--danger);">❌ Cancel</button>
        </div>
    `;

    modal.innerHTML = html;

    // Initialize dropdown state after rendering (wait for DOM to update)
    setTimeout(() => {
        console.log("Initializing pairing dropdowns...");
        updatePairingDropdowns();
        console.log("Dropdown initialization complete");
    }, 100);
}

function generateTeamOptions() {
    let html = '<option value="">-- Select Team --</option>';
    pairingState.teams.forEach(team => {
        html += `<option value="${team}">${team}</option>`;
    });
    return html;
}

function updatePairingDropdowns() {
    // Defensive: always allow selection, never throw
    const allSelects = Array.from(document.querySelectorAll('[id^="match-"]'));
    if (!allSelects.length) return;

    // Collect all selected teams
    const selectedTeams = new Set();
    allSelects.forEach(select => {
        if (select && select.value && select.value !== "") {
            selectedTeams.add(select.value);
        }
    });

    // Update each dropdown
    allSelects.forEach(currentSelect => {
        if (!currentSelect || !currentSelect.options) return;
        const currentValue = currentSelect.value;
        Array.from(currentSelect.options).forEach(option => {
            if (!option) return;
            const optionValue = option.value;
            // Always enable empty option
            if (optionValue === "" || optionValue === "-- Select Team --") {
                option.disabled = false;
                option.style.color = '';
                option.style.backgroundColor = '';
                return;
            }
            // Disable if selected elsewhere (but not in this dropdown)
            if (selectedTeams.has(optionValue) && optionValue !== currentValue) {
                option.disabled = true;
                option.style.color = '#9ca3af';
                option.style.backgroundColor = '#f3f4f6';
            } else {
                option.disabled = false;
                option.style.color = '';
                option.style.backgroundColor = '';
            }
        });
    });

    // Prevent same team in both slots of same match
    allSelects.forEach(select => {
        if (!select || !select.id) return;
        const match = select.id.match(/^match-(\d+)-([ab])$/);
        if (!match) return;
        const idx = match[1];
        const slot = match[2];
        const selectA = document.getElementById(`match-${idx}-a`);
        const selectB = document.getElementById(`match-${idx}-b`);
        if (!selectA || !selectB) return;
        const teamA = selectA.value;
        const teamB = selectB.value;
        if (teamA && teamA !== "") {
            Array.from(selectB.options).forEach(opt => {
                if (opt && opt.value === teamA && opt.value !== "") {
                    opt.disabled = true;
                    opt.style.color = '#9ca3af';
                    opt.style.backgroundColor = '#f3f4f6';
                }
            });
        }
        if (teamB && teamB !== "") {
            Array.from(selectA.options).forEach(opt => {
                if (opt && opt.value === teamB && opt.value !== "") {
                    opt.disabled = true;
                    opt.style.color = '#9ca3af';
                    opt.style.backgroundColor = '#f3f4f6';
                }
            });
        }
    });

    pairingState.usedTeams = selectedTeams;
}

/**
 * Finalize pairing and create new round
 * @param {number} numMatches - Number of matches to create
 */
function finalizePairing(numMatches) {
    const matches = [];

    // Collect all pairings
    for (let i = 0; i < numMatches; i++) {
        const teamA = document.getElementById(`match-${i}-a`).value;
        const teamB = document.getElementById(`match-${i}-b`).value;

        if (!teamA || !teamB) {
            alert(`Please complete all pairings. Match ${i + 1} is incomplete.`);
            return;
        }

        if (teamA === teamB) {
            alert(`Match ${i + 1}: Cannot pair a team with itself.`);
            return;
        }

        matches.push({
            id: i + 1,
            type: "normal",
            schedule: {
                date: "Pending",
                time: "TBD",
                location: "Maths Lab"
            },
            teamA: { name: teamA, points: null },
            teamB: { name: teamB, points: null },
            winner: null
        });
    }

    // Verify all teams are used
    const usedTeams = new Set();
    matches.forEach(m => {
        usedTeams.add(m.teamA.name);
        usedTeams.add(m.teamB.name);
    });

    if (usedTeams.size !== pairingState.teams.length) {
        alert("All qualified teams must be paired exactly once.");
        return;
    }

    // Two-step confirmation before locking round
    const currentRoundName = currentData.rounds[pairingState.sourceRoundIdx].name;
    const confirmed = confirm(
        `⚠️ CRITICAL ACTION ⚠️\n\n` +
        `This will:\n` +
        `1. LOCK ${currentRoundName} (cannot be edited after)\n` +
        `2. Create Round ${currentData.rounds.length + 1} with ${matches.length} matches\n\n` +
        `Are you absolutely sure you want to proceed?\n\n` +
        `Click OK to continue to final confirmation.`
    );

    if (!confirmed) {
        showStatus("Round generation cancelled", "#64748b");
        return;
    }

    // Second confirmation - require typing
    const verification = prompt(
        `FINAL CONFIRMATION\n\n` +
        `Type "CONFIRM" (all caps) to lock ${currentRoundName} and create the new round:`
    );

    if (verification !== "CONFIRM") {
        showStatus("Round generation cancelled - verification failed", "#ef4444");
        return;
    }

    saveHistorySnapshot();

    // Create new round
    const newRoundId = currentData.rounds.length + 1;
    const newRound = {
        id: newRoundId,
        name: `Round ${newRoundId}`,
        status: "active",
        matches: matches
    };

    // Lock previous round
    currentData.rounds[pairingState.sourceRoundIdx].status = "locked";

    // Add new round
    currentData.rounds.push(newRound);

    closeRoundGenModal();
    renderForm();
    updateSidebarStats();
    showStatus(`✅ Round ${newRoundId} created! Previous round locked. Don't forget to save.`, "#16a34a");
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

/**
 * Export tournament data as CSV file
 * Includes all matches with teams, scores, schedule, and results
 */
function exportToCSV() {
    if (!currentData) {
        alert("No data loaded. Please load tournament data first.");
        return;
    }

    // CSV Headers
    let csv = "Round,Match ID,Team A,Score A,Team B,Score B,Winner,Date,Time,Location,Status\n";

    // Add data rows
    currentData.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            const row = [
                `"${round.name}"`,
                match.id || "",
                `"${match.teamA.name}"`,
                match.teamA.points ?? "",
                `"${match.teamB.name}"`,
                match.teamB.points ?? "",
                `"${match.winner ?? "Pending"}"`,
                `"${match.schedule.date ?? "TBD"}"`,
                `"${match.schedule.time ?? "TBD"}"`,
                `"${match.schedule.location ?? "TBD"}"`,
                round.status === "locked" ? "Locked" : "Active"
            ];
            csv += row.join(",") + "\n";
        });
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KSSS_Tournament_Grade${currentData.grade}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus("✅ CSV exported successfully!", "#16a34a");
    if (CONFIG.debug) console.log("📊 CSV export completed");
}

/**
 * Generate and export PDF report of tournament
 * Opens print dialog with print-optimized view
 */
function exportToPDF() {
    if (!currentData) {
        alert("No data loaded. Please load tournament data first.");
        return;
    }

    // Create a new window with print-friendly content
    const printWindow = window.open("", "_blank", "width=800,height=600");

    if (!printWindow) {
        alert("Pop-up blocked! Please allow pop-ups for this site to export PDF.");
        return;
    }

    // Generate HTML content for PDF
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

    // Automatically open print dialog after content loads
    printWindow.onload = function () {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    showStatus("✅ PDF report opened in new window", "#16a34a");
    if (CONFIG.debug) console.log("📄 PDF export window opened");
}

/**
 * Display status message to user
 * @param {string} text - Message text to display
 * @param {string} color - Background color for the message
 */
function showStatus(text, color) {
    const el = document.getElementById("status-msg");
    el.innerText = text;
    el.style.background = color;
    el.style.display = "block";

    if (color === "#16a34a")
        setTimeout(() => {
            el.style.display = "none";
        }, CONSTANTS.SUCCESS_MESSAGE_DURATION);
}

// === Token Security: Inactivity Timer & Cleanup ===
let inactivityTimer;
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

function startInactivityTimer() {
    // Reset timer on any activity
    window.onload = resetInactivityTimer;
    document.onmousemove = resetInactivityTimer;
    document.onkeypress = resetInactivityTimer;
    document.onclick = resetInactivityTimer;
    document.onscroll = resetInactivityTimer;

    resetInactivityTimer();
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    // Only set timer if user is logged in
    if (sessionStorage.getItem("githubToken")) {
        inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT);
    }
}

function logoutDueToInactivity() {
    if (sessionStorage.getItem("githubToken")) {
        alert("⚠️ Session expired due to inactivity (20 mins). Please log in again.");
        logout();
    }
}

// Start timer if session exists on load
if (sessionStorage.getItem("githubToken")) {
    startInactivityTimer();
}

// Clear token on tab close/refresh to ensure no persistence
window.addEventListener('beforeunload', () => {
    // Strictly clear token on tab close or refresh to prevents persistence
    sessionStorage.removeItem("githubToken");
});

// Stub function for showLoginModal (referenced in AdminSecurity.verifySession but not defined)
// In this implementation, login section is visible by default in HTML, so this is a no-op
function showLoginModal() {
    // Login section is already visible by default in admin.html
    // This stub prevents ReferenceError in AdminSecurity.verifySession (line 254)
    if (CONFIG.debug) console.log("showLoginModal called - login section should be visible");
}

// ===============================
// KSSS_UI_HOOKS Security Layer (Layer 2)
// ===============================
// Wraps UI-callable functions with re-entrance protection
// Preserves AdminSecurity (Layer 1) - does not replace it
(function () {
    /**
     * Secure wrapper: prevents re-entrant calls (double-click protection)
     * Locks function execution with async-safe flag
     * Provides user feedback during execution
     */
    function secureHook(fn) {
        let locked = false;
        return async function (...args) {
            if (locked) {
                showStatus("⏳ Action is already running. Please wait...", "#f59e0b");
                return;
            }
            locked = true;
            try {
                return await fn.apply(this, args);
            } finally {
                locked = false;
            }
        };
    }

    // List of function names to wrap (if they exist)
    // This is safer than direct object literal references which throw ReferenceError
    const functionNames = [
        // Core Data Operations
        'loadMatches',
        'saveToGitHub',

        // Team Swap System (internally uses AdminSecurity.getRole())
        'confirmTeamSwap',
        'cancelTeamSwap',
        'unlockTeam',
        'relockTeam',

        // History Management
        'undoChange',
        'redoChange',

        // Export Functions
        'exportToCSV',
        'exportToPDF',

        // Filtering & Pagination
        'filterMatches',
        'clearFilters',
        'changePage',

        // Team Switch Mode (internally protected by AdminSecurity)
        'activateTeamSwitchMode',
        'exitTeamSwitchMode',

        // Structural Actions & Logs (may not exist in working version)
        'showStructuralActionLog',
        'displayStructuralLog',

        // Round Management (internally protected by AdminSecurity)
        'cascadeDeleteRound',
        'endTournament',
        'showBestLoserCreator',
        'showRoundGenerator',
        'createBestLoserMatch',
        'startPairing',
        'finalizePairing',

        // Modal Management
        'closeBestLoserModal',
        'closeRoundGenModal',
        'closeStructuralLogModal'
    ];

    // Safely collect functions that exist in global scope
    const hooks = {};
    const missingFunctions = [];

    functionNames.forEach(name => {
        // Use indirect eval or window lookup to avoid ReferenceError
        try {
            const fn = window[name];
            if (typeof fn === 'function') {
                hooks[name] = fn;
            } else {
                missingFunctions.push(name);
            }
        } catch (e) {
            missingFunctions.push(name);
            if (CONFIG.debug) console.warn(`⚠️ KSSS_UI_HOOKS: Could not access ${name}:`, e.message);
        }
    });

    // Log missing functions (informational, not an error)
    if (missingFunctions.length > 0 && CONFIG.debug) {
        console.info(`ℹ️ KSSS_UI_HOOKS: ${missingFunctions.length} functions not found (this is OK):`, missingFunctions);
    }

    // Wrap all found functions with secureHook
    const wrapped = {};
    for (const [name, fn] of Object.entries(hooks)) {
        wrapped[name] = secureHook(fn);
    }

    // ALWAYS expose the wrapped API (even if empty), then freeze
    Object.freeze(wrapped);
    window.KSSS_UI_HOOKS = wrapped;

    // Log successful initialization
    const count = Object.keys(wrapped).length;
    console.log(`🔒 KSSS_UI_HOOKS initialized with ${count} protected function${count !== 1 ? 's' : ''}`);

    if (CONFIG.debug) {
        console.log("✅ AdminSecurity Layer 1: Role verification, tamper detection");
        console.log("✅ KSSS_UI_HOOKS Layer 2: Re-entrance protection, frozen API");
        console.log("Protected functions:", Object.keys(wrapped).sort());
    }
})();

// ===============================
// CRITICAL FIX: GitHub Authentication Patch
// ===============================
// Override fetchWithRetry to support Fine-Grained PATs (Bearer header)
// This fixes 401 errors without modifying legacy loadMatches/saveToGitHub code
(function () {
    // Wait for main script to define fetchWithRetry
    const originalFetchWithRetry = window.fetchWithRetry;

    if (typeof originalFetchWithRetry === 'function') {
        window.fetchWithRetry = async function (url, options = {}, ...args) {
            try {
                // Check for Authorization header using "token" prefix
                if (options && options.headers && options.headers.Authorization) {
                    const auth = options.headers.Authorization;

                    if (auth.startsWith("token ")) {
                        const tokenVal = auth.substring(6).trim();

                        // Heuristic: Fine-grained PATs start with 'github_pat_' or 'gith' and are long (>50 chars)
                        // Classic PATs are usually shorter (~40 chars) and verify with 'ghp_'
                        // Fine-grained tokens REQUIRE 'Bearer' scheme. Classic tokens support both.
                        if (tokenVal.startsWith("gith") || tokenVal.length > 50) {
                            if (CONFIG?.debug) console.log("🔐 Auth Patch: Switching 'token' to 'Bearer' for Fine-Grained PAT");
                            options.headers.Authorization = `Bearer ${tokenVal}`;
                        }
                    }
                }
            } catch (e) {
                // Ignore any internal patch errors to ensure request proceeds
                console.warn("Auth patch warning:", e);
            }

            return originalFetchWithRetry(url, options, ...args);
        };
        if (CONFIG?.debug) console.log("✅ Authenticated Fetch Patch applied");
    }
})();
