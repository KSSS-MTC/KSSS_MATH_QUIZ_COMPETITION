# KSSS Math Quiz - Security & Operations Guide

**Version:** 2.0  
**Last Updated:** 2026-02-04

## 1. Security Architecture Overview

This system operates as a **Client-Side Admin Application** hosted on GitHub Pages. It interacts directly with the GitHub API using a Personal Access Token (PAT).

### Key Security Controls

- **Closure Encapsulation:** Core authentication logic is hidden within `AdminSecurity` (admin.js) and cannot be accessed from the global scope.
- **Runtime Integirty:** Critical functions (`saveToGitHub`, `verifyIntegrity`) are frozen (`Object.freeze`) to prevent console tampering.
- **XSS Protection:** All match data rendering uses safe DOM methods (`textContent`), shielding against script injection.
- **Session Hygiene:** Tokens are stored in `sessionStorage` (cleared on tab close) and never logged to the console.

## 2. Operational Requirements (For Admins)

To maintain security, all administrators must adhere to the following:

### Device Security

- **Use Trusted Devices:** Only access the admin dashboard from secure, personal devices. Avoid public computers.
- **Lock Your Screen:** Always lock your computer (Win+L / Cmd+Ctrl+Q) when stepping away.
- **Browser Extensions:** Disable untrusted browser extensions that might read page content.

### Token Handling

- **Least Privilege:** The GitHub Token used must *only* have scope for the `KSSS_MATH_QUIZ_COMPETITION` repository. Do not use a "Full Access" token.
- **Rotation:** Rotate the Admin Token every 30-60 days.
- **Revocation:** If a device is lost or compromised, immediately revoke the token in GitHub Settings.

### Incident Response

- **Suspected Breach:** If you suspect unauthorized access (e.g., unexpected data changes):
    1. **Revoke Token:** Immediately delete the PAT on GitHub.
    2. **Check Logs:** Review the `structuralLog` (in the application) or GitHub Commit History for unauthorized changes.
    3. **Restore:** Use the "Undo" feature or revert the commit in GitHub.

## 3. EDGE Case Verification (Manual Testing)

Admins should periodically verify system health:

- **Sign-Out Test:** Click "Logout" and verify you are returned to the Login screen effectively.
- **Tab Isolation:** Open the admin panel in two tabs. Logging out in one should invalidate the session in the other (upon refresh or action).
- **Inactivity:** Leave the tab open for 20 minutes and verify auto-logout occurs.

## 4. Known Limitations

- **Client-Side Enforced:** A highly sophisticated attacker with direct access to the machine *could* theoretically extract data from memory before the session closes. Physical security is paramount.
- **No Backend:** There is no server-side session validation beyond the GitHub API token check.
