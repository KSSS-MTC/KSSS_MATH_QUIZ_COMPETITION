# KSSS Math Quiz Competition - Project Structure

## 📋 Project Overview
**Project Name:** KSSS Mathematics Quiz Competition  
**Institution:** Kotu Senior Secondary School (KSSS)  
**Purpose:** Web-based tournament bracket system for managing and displaying mathematics quiz competitions across different grade levels.  
**Type:** Static Web Application with Dynamic Data Loading

---

## 🗂️ Directory Structure

```
METH QUIZ COMPETITION/
│
├── index.html                          # Main landing page with rules and navigation
├── admin.html                          # Admin dashboard for managing competitions (v2.1.0)
├── README.md                           # Project documentation
├── PROJECT_AUDIT.md                    # Comprehensive project audit report
├── PROJECT_STRUCTURE.md                # This file - detailed project documentation
├── FILE_TREE.txt                       # File structure tree view
│
├── data/                               # Competition data storage (JSON format)
│   ├── competition-grade10.json        # Grade 10 tournament data with status tracking
│   ├── competition-grade11.json        # Grade 11 tournament data with status tracking
│   └── competition-grade12.json        # Grade 12 tournament data with status tracking
│
├── grades/                             # Grade-specific bracket pages
│   ├── grade10.html                    # Grade 10 tournament bracket display
│   ├── grade11.html                    # Grade 11 tournament bracket display
│   └── grade12.html                    # Grade 12 tournament bracket display
│
└── static/                             # Static assets (CSS & JavaScript)
    ├── home.css                        # Styles for the home page
    ├── home.js                         # Scripts for the home page
    ├── styles.css                      # Tournament bracket styles
    ├── script.js                       # Tournament bracket functionality
    └── admin.js                        # Admin dashboard functionality (v2.1.0)
```

---

## 📄 File Descriptions

### **Root Level Files**

#### **index.html**
- **Purpose:** Main landing page of the competition website
- **Features:**
  - School header with logo and name
  - Competition banner with title
  - Navigation tabs to different grade pages
  - General rules and conduct section
  - Scoring system explanation
  - Competition format details
- **Styling:** Uses `static/home.css`
- **Scripts:** Uses `static/home.js`

#### **admin.html**
- **Purpose:** Administrative dashboard for managing competitions
- **Version:** v2.1.0
- **Features:**
  - **Authentication System:**
    - President name selection and GitHub token authentication
    - Session persistence with sessionStorage (auto-login)
    - Logout functionality with session cleanup
  - **Tournament Management:**
    - Real-time competition management
    - Manual pairing system for next rounds
    - Best Loser playoff creation
    - Round generation and locking with two-step confirmation
  - **Score Management:**
    - Score tracking with input validation (0-100 range)
    - Visual validation feedback (red borders + shake animation)
    - Real-time winner calculation
    - Schedule updates (date, time, location)
  - **Data Persistence:**
    - GitHub API integration with retry logic
    - Automatic error handling with user-friendly messages
    - Loading states on all save operations
    - Conflict detection (409 errors)
  - **UI/UX:**
    - Responsive mobile-first design with sidebar stats
    - Touch-friendly inputs (44x44px minimum)
    - Modal dialogs for complex operations
    - Status indicator with color-coded messages
  - **Security:**
    - Token stored in sessionStorage (not localStorage)
    - Debug mode toggle (CONFIG.debug = false in production)
    - Two-step confirmation for critical actions
- **Styling:** Inline styles with CSS variables + comprehensive modal CSS
- **Scripts:** Uses `static/admin.js` (v2.1.0)

#### **README.md**
- **Purpose:** Basic project documentation
- **Current Content:** Minimal (contains only "# KSSS_METH")
- **Note:** Should be expanded with setup and usage instructions

---

### **data/ Directory**

Contains JSON files that store all competition information including teams, matches, schedules, and results.

#### **JSON Structure:**
```json
{
  "grade": "10/11/12",
  "competition": "School Math Quiz Competition",
  "rounds": [
    {
      "id": 1,
      "name": "Round 1",
      "status": "active",
      "matches": [
        {
          "id": 1,
          "schedule": {
            "date": "Sat, Feb 14",
            "time": "10:00 AM",
            "location": "Maths Lab"
          },
          "teamA": {
            "name": "Team Name",
            "points": null
          },
          "teamB": {
            "name": "Team Name",
            "points": null
          },
          "winner": null
        }
      ]
    }
  ]
}
```

#### **Data Files:**
- **competition-grade10.json** - Grade 10 participants and match data
- **competition-grade11.json** - Grade 11 participants and match data
- **competition-grade12.json** - Grade 12 participants and match data

---

### **grades/ Directory**

Contains HTML pages that display tournament brackets for each grade level.

#### **grade10.html, grade11.html, grade12.html**
- **Purpose:** Display interactive tournament brackets
- **Features:**
  - Fetches data from corresponding JSON file
  - Shows match schedules (date, time, location)
  - Displays team names and scores
  - Highlights winners
  - Sorts matches by date (soonest first)
  - Moves "Pending" matches to bottom of round
  - Back navigation to home page
- **Styling:** Uses `../static/styles.css`
- **Scripts:** Uses `../static/script.js`

---

### **static/ Directory**

Contains all client-side assets including stylesheets and JavaScript files.

#### **home.css**
- **Purpose:** Styles for the landing page
- **Includes:**
  - School header styling
  - Competition banner design
  - Navigation tabs
  - Rules and scoring card layouts
  - Responsive grid system

#### **home.js**
- **Purpose:** Interactive functionality for home page
- **Features:** (Implementation dependent on content)

#### **styles.css**
- **Purpose:** Styles for tournament bracket pages
- **Includes:**
  - Bracket layout (flexbox-based)
  - Round containers
  - Match cards
  - Team styling
  - Winner highlights
  - Schedule information display
  - Status badges
  - Responsive design

#### **script.js**
- **Purpose:** Dynamic bracket generation and management
- **Key Functions:**
  - Fetches JSON data based on page grade
  - Dynamically creates bracket HTML structure
  - Sorts matches by date and pending status
  - Parses and formats dates
  - Identifies pending matches
  - Displays team information and scores
  - Highlights match winners
  - Shows schedule and location details

#### **admin.js**
- **Purpose:** Admin dashboard functionality
- **Version:** v2.1.0
- **Key Functions:**
  - **Authentication:**
    - `login()` - Authenticates users and stores credentials in sessionStorage
    - `logout()` - Clears session and resets UI
    - Auto-login on page load if session exists
  - **Data Management:**
    - `loadMatches()` - Fetches tournament data from GitHub with retry logic
    - `saveToGitHub()` - Saves changes with conflict detection
    - `fetchWithRetry()` - Retry mechanism with exponential backoff
  - **Tournament Logic:**
    - `isRoundComplete()` - Checks if all matches have winners
    - `getQualifiedTeams()` - Extracts winners from completed matches
    - `getLosersSorted()` - Sorts losers by points for Best Loser selection
    - `hasBestLoserMatch()` - Detects existing Best Loser matches
    - `canGenerateNextRound()` - Validates round completion and even team count
  - **UI Controls:**
    - `renderForm()` - Dynamically generates match cards
    - `updateScores()` - Validates and updates scores (0-100 range, visual feedback)
    - `updateSchedule()` - Updates match schedule details
    - `updateSidebarStats()` - Refreshes real-time statistics
    - `showBestLoserCreator()` - Modal for creating Best Loser playoffs
    - `showRoundGenerator()` - Modal for manual team pairing
    - `showPairingUI()` - Interactive pairing interface
  - **Round Management:**
    - `createBestLoserMatch()` - Creates playoff between top two losers
    - `finalizePairing()` - Validates pairings and creates new round with two-step confirmation
    - Round locking with "CONFIRM" verification
  - **Helper Functions:**
    - `setButtonLoading()` - Manages button loading states
    - `showStatus()` - Displays color-coded status messages
  - **Error Handling:**
    - HTTP status-specific error messages (401, 403, 404, 409, 422, 429, 500+)
    - Automatic retry for server errors
    - User-friendly alerts with troubleshooting tips
  - **Debug Mode:**
    - `CONFIG.debug` flag controls console logging
    - Production-ready with clean console output

---

## 🎯 Key Features

### **1. Competition Rules**
- Two participants per class
- Mandatory school uniforms
- No communication allowed (5-point penalty)
- Only simple calculators permitted
- Specific arrival time requirements

### **2. Scoring System**
- **1st Attempt (2 minutes):** Maximum points awarded
- **2nd Attempt:** Reduced points
- **3rd Attempt:** Minimum points
- **No Answer:** No points awarded

### **3. Tournament Bracket System**
- Multi-round elimination format
- Real-time score tracking
- Winner progression tracking
- Date-based match sorting
- Pending match identification

### **4. Admin Capabilities** (v2.1.0)
- **Authentication & Security:**
  - GitHub token authentication with sessionStorage
  - Auto-login on returning sessions
  - Logout functionality with full cleanup
- **Match Management:**
  - Match scheduling (date, time, location)
  - Score entry with validation (0-100 range)
  - Real-time winner calculation
  - Visual validation feedback
- **Tournament Operations:**
  - Manual team pairing for next rounds
  - Best Loser playoff creation
  - Round generation with two-step confirmation
  - Round locking/unlocking
- **Data Operations:**
  - Save to GitHub with retry logic
  - Conflict detection and resolution
  - Loading states on all operations
  - Error recovery with user guidance
- **UI Features:**
  - Real-time sidebar statistics
  - Modal dialogs for complex operations
  - Mobile-responsive design
  - Touch-friendly inputs (44x44px)

---

## 🔧 Technical Stack

### **Frontend:**
- **HTML5** - Structure and markup
- **CSS3** - Styling and responsive design (including CSS animations, flexbox, grid)
- **Vanilla JavaScript** - Dynamic functionality and data handling (ES6+)

### **Data Storage:**
- **JSON** - Data persistence and structure
- Static file-based approach (no backend database)

### **Design Approach:**
- Mobile-first responsive design
- Flexbox layouts
- CSS custom properties (variables)
- Modular CSS architecture

### **v2.1.0 Enhancements:**
- **Error Handling:**
  - Retry mechanism with exponential backoff (max 3 attempts)
  - HTTP status-specific error messages
  - Conflict detection and resolution (409 errors)
  - User-friendly error alerts with troubleshooting guidance
  
- **Input Validation:**
  - Score range validation (0-100)
  - Real-time validation feedback
  - Visual cues (red borders + shake animation)
  - Prevention of invalid data entry
  
- **Security Improvements:**
  - sessionStorage for token management (auto-clear on tab close)
  - Two-step confirmation for critical actions
  - Debug mode toggle for production vs development
  - Auto-logout functionality
  
- **User Experience:**
  - Loading states on all async operations
  - Touch-friendly mobile inputs (44x44px minimum)
  - Modal dialogs with responsive design
  - Real-time sidebar statistics
  - Color-coded status messages
  
- **Code Quality:**
  - Centralized error handling
  - Consistent state management
  - Debug logging control via CONFIG.debug flag
  - Modular CSS classes for maintainability

---

## 🚀 How It Works

### **1. User Flow:**
```
Landing Page (index.html)
    ↓
User selects grade level
    ↓
Grade-specific bracket page loads (grades/gradeXX.html)
    ↓
JavaScript fetches corresponding JSON data
    ↓
Bracket is dynamically rendered
    ↓
Matches are sorted and displayed with current status
```

### **2. Admin Flow:**
```
Access admin.html
    ↓
Authenticate (if protected)
    ↓
View all matches across grades
    ↓
Update scores, unlock questions, declare winners
    ↓
Changes saved to JSON files
    ↓
Public pages automatically reflect updates
```

### **3. Data Flow:**
```
data/competition-gradeXX.json
    ↓
Fetched by static/script.js
    ↓
Parsed and processed
    ↓
Rendered as HTML in grades/gradeXX.html
```

---

## 📱 Responsive Design

The application is designed to work across multiple device sizes:

- **Mobile phones** - Single column layout
- **Tablets** - Adjusted bracket display
- **Desktop** - Full multi-column bracket view

---

## 🎨 School Branding

**Institution:** Kotu Senior Secondary School (KSSS)  
**Department:** Mathematics Department  
**Motto/Theme:** "Igniting Excellence through Numbers"

---

## 🔐 Security Considerations (v2.1.0)

- **✅ Implemented:**
  - GitHub token authentication required for admin access
  - Credentials stored in sessionStorage (auto-clear on tab/browser close)
  - Two-step confirmation for critical actions (round locking)
  - Debug mode disabled in production (CONFIG.debug = false)
  - Input validation prevents malicious data entry
  - Logout functionality clears all session data
  
- **Best Practices:**
  - Keep GitHub token private (never commit to repository)
  - Use fine-grained access tokens with minimal permissions
  - Regularly rotate access tokens
  - Enable branch protection rules on repository
  
- **Future Considerations:**
  - Implement rate limiting on API calls
  - Add IP whitelisting for admin access
  - Consider OAuth flow instead of personal access tokens
  - Add audit logging for all admin actions

---

## 🌐 Deployment

This is a static web application that can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service
- Local web server (for private school use)

**Requirements:**
- Web server capable of serving static files
- JSON file read/write access for admin functionality
- Modern web browser with JavaScript enabled

---

## 📋 Competition Format

### **Round Structure:**
- **Round 1:** Initial matches with all participants
- **Semi-finals:** Winners from Round 1
- **Finals:** Determining the overall winner

### **Match Information:**
Each match contains:
- Unique match ID
- Schedule (date, time, location)
- Team A and Team B details
- Points scored by each team
- Winner designation

---

## 🔄 Future Enhancement Possibilities

1. **Backend Integration:**
   - Real-time database (Firebase, MongoDB)
   - API for data management
   - User authentication system

2. **Additional Features:**
   - Live score updates
   - Spectator view mode
   - Historical data and statistics
   - Printable brackets
   - Email notifications

3. **Analytics:**
   - Performance tracking
   - Statistical analysis
   - Leaderboards
   - Historical comparisons

4. **Accessibility:**
   - Screen reader support
   - Keyboard navigation
   - High contrast mode
   - Multi-language support

---

## 📞 Project Information

**Organization:** KSSS-MTC  
**Repository:** KSSS_MATH_QUIZ_COMPETITION  
**Branch:** main  
**Version:** v2.1.0  
**Last Updated:** February 14, 2026

---

## 📝 Notes

- **v2.1.0 Release:**
  - Comprehensive error handling with retry logic implemented
  - Security enhancements (sessionStorage, two-step confirmations)
  - Mobile optimization (touch targets, responsive modals)
  - Input validation with visual feedback
  - Production-ready with debug mode toggle
  
- **Project Status:**
  - 11/31 audit issues resolved (35.5% completion)
  - All critical and medium-priority issues fixed
  - Ready for production deployment
  
- **To-Do:**
  - README.md should be expanded with detailed setup instructions
  - Consider adding a LICENSE file (MIT recommended)
  - May need a .gitignore file for development artifacts
  - Logo file (`logo.png`) referenced but not visible in structure
  - 20 low-priority enhancements remain (see PROJECT_AUDIT.md)

---

## 🎓 Educational Purpose

This project serves multiple educational objectives:
1. Promotes healthy academic competition
2. Encourages mathematical excellence
3. Provides transparent tournament tracking
4. Engages students in STEM activities
5. Demonstrates practical application of web technologies

---

## 📋 Changelog

### **v2.1.0** (February 14, 2026)

**Critical Fixes:**
- ✅ Fixed mobile dropdown sizing with proper font-size (16px) and touch targets (44x44px)
- ✅ Added `status` field to all JSON tournament data files for round tracking
- ✅ Implemented comprehensive error handling with HTTP status-specific messages
- ✅ Added retry mechanism with exponential backoff (max 3 attempts)

**Security Enhancements:**
- ✅ Migrated token storage from global variables to sessionStorage
- ✅ Added logout functionality with full session cleanup
- ✅ Implemented two-step confirmation for round locking (requires typing "CONFIRM")
- ✅ Added debug mode toggle (CONFIG.debug flag)

**UI/UX Improvements:**
- ✅ Refactored modal CSS from inline styles to modular classes
- ✅ Added loading states to all async operations (buttons, save operations)
- ✅ Implemented input validation with visual feedback (red borders + shake animation)
- ✅ Enhanced mobile responsiveness with modal breakpoints
- ✅ Added real-time sidebar statistics with consistent updates

**Code Quality:**
- ✅ Wrapped all console.log statements in debug conditionals
- ✅ Added `updateSidebarStats()` to all data mutation points
- ✅ Centralized button loading state management
- ✅ Cleaned up project structure (removed /lay folder)

**Files Modified:**
- admin.html (150+ lines of CSS improvements)
- static/admin.js (error handling, validation, security)
- data/competition-grade10.json, grade11.json, grade12.json (status field)
- PROJECT_AUDIT.md (completion tracking)
- PROJECT_STRUCTURE.md (documentation updates)

**Statistics:**
- Issues Resolved: 11/31 (35.5%)
- Lines Added: ~400+
- Lines Modified: ~200+
- Production-Ready: Yes

---

**End of Documentation**
