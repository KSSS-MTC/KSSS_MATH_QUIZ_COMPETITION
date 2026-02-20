// common/dateParser.js
// Schedule date parsing utilities with improved time cleaning

// Helper to clean time string (remove anything in parentheses)
function cleanTimeString(time) {
    if (!time) return "";
    // Remove anything in parentheses, e.g., " (Morning Break)"
    return time.replace(/\s*\([^)]*\)/g, "").trim();
}

export function isPendingSchedule(schedule) {
    if (!schedule) return true;
    const date = String(schedule.date ?? "").toLowerCase().trim();
    const time = String(schedule.time ?? "").toLowerCase().trim();
    return (
        date === "" ||
        date.includes("pending") ||
        date.includes("tbd") ||
        time.includes("pending") ||
        time.includes("tbd")
    );
}

export function parseScheduleDate(schedule) {
    if (!schedule || isPendingSchedule(schedule)) {
        return new Date("9999-12-31T23:59:59"); // far future for sorting
    }

    const rawDate = String(schedule.date ?? "").trim();
    // Clean the time string before using it
    const rawTime = cleanTimeString(String(schedule.time ?? "").trim());

    // Try with current year first (most reliable)
    const currentYear = new Date().getFullYear();
    const withCurrentYear = `${rawDate} ${currentYear} ${rawTime}`.trim();
    let date = new Date(withCurrentYear);
    if (!isNaN(date)) return date;

    // Try without year (browser may use current year, but this is less reliable)
    const withoutYear = `${rawDate} ${rawTime}`.trim();
    date = new Date(withoutYear);
    if (!isNaN(date)) return date;

    // Last resort: far future
    return new Date("9999-12-31T23:59:59");
}

export function hasValidSchedule(schedule) {
    return !isNaN(parseScheduleDate(schedule).getTime()) && !isPendingSchedule(schedule);
}