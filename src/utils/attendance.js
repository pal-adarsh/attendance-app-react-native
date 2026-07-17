const MAX_ITERATIONS = 10000;

/**
 * Calculate attendance percentage
 * @param {number} attended
 * @param {number} total
 * @returns {number} percentage (0-100)
 */
export const calculatePercentage = (attended, total) => {
    if (total === 0) return 0;
    return (attended / total) * 100;
};

/**
 * Get status color based on percentage and target
 * @param {number} percentage
 * @param {number} target
 * @returns {'red' | 'yellow' | 'green'}
 */
export const getStatus = (percentage, target = 75) => {
    if (percentage < target) return 'red';
    if (percentage < target + 5) return 'yellow';
    return 'green';
};

/**
 * Calculate lectures needed to reach target percentage
 * Returns Infinity if target >= 100 (unreachable).
 * @param {number} attended
 * @param {number} total
 * @param {number} target
 * @returns {number} lectures needed
 */
export const getLecturesNeeded = (attended, total, target = 75) => {
    if (total === 0 && attended === 0) return 1;
    if (total === 0) return 1;
    if (target >= 100) return Infinity;
    if (target <= 0) return 0;

    let needed = 0;
    let currentAttended = attended;
    let currentTotal = total;

    while ((currentAttended / currentTotal) * 100 < target) {
        needed++;
        currentAttended++;
        currentTotal++;
        if (needed > MAX_ITERATIONS) return Infinity;
    }
    return needed;
};

/**
 * Calculate lectures that can be skipped while maintaining target percentage
 * Returns Infinity if target <= 0 (no skips needed).
 * @param {number} attended
 * @param {number} total
 * @param {number} target
 * @returns {number} lectures skippable
 */
export const getLecturesSkippable = (attended, total, target = 75) => {
    if (total === 0) return 0;
    if (target <= 0) return Infinity;
    if (target >= 100) return 0;

    let skippable = 0;
    let currentTotal = total;

    while ((attended / (currentTotal + 1)) * 100 >= target) {
        skippable++;
        currentTotal++;
        if (skippable > MAX_ITERATIONS) return Infinity;
    }
    return skippable;
};

/**
 * Compute current and longest attendance streaks from sorted records.
 * Records should be sorted by date ascending.
 * @param {Array<{date: string, status: string}>} records - attendance records
 * @param {string} todayDate - today's date as YYYY-MM-DD
 * @returns {{ current: number, longest: number }}
 */
export const getAttendanceStreak = (records, todayDate) => {
    const presentDates = records
        .filter(r => r.status === 'present')
        .map(r => r.date)
        .sort();

    if (presentDates.length === 0) return { current: 0, longest: 0 };

    let current = 0;
    let longest = 1;
    let run = 1;

    // Longest streak
    for (let i = 1; i < presentDates.length; i++) {
        const prev = new Date(presentDates[i - 1]);
        const curr = new Date(presentDates[i]);
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
            run++;
            if (run > longest) longest = run;
        } else {
            run = 1;
        }
    }

    // Current streak (counting backward from today)
    const today = new Date(todayDate);
    let checkDate = new Date(today);
    const presentSet = new Set(presentDates);

    for (let i = 0; i < 365; i++) {
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
        const d = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        if (presentSet.has(dateStr)) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return { current, longest };
};

/**
 * Compute attendance percentage per day of the week.
 * @param {Array<{date: string, status: string}>} records
 * @returns {Array<{day: string, percentage: number, attended: number, total: number}>}
 */
export const getDayOfWeekStats = (records) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = {};
    const dayAttended = {};

    for (const r of records) {
        const date = new Date(r.date + 'T00:00:00');
        const day = date.getDay();
        const key = dayNames[day];
        dayTotals[key] = (dayTotals[key] || 0) + 1;
        if (r.status === 'present') {
            dayAttended[key] = (dayAttended[key] || 0) + 1;
        }
    }

    return dayNames.map(day => {
        const total = dayTotals[day] || 0;
        const attended = dayAttended[day] || 0;
        return { day, percentage: calculatePercentage(attended, total), attended, total };
    });
};

/**
 * Compute weekly attendance trend for the last N weeks.
 * @param {Array<{date: string, status: string}>} records
 * @param {string} todayDate - today as YYYY-MM-DD
 * @param {number} maxWeeks - max weeks to include
 * @returns {Array<{label: string, percentage: number, attended: number, total: number}>}
 */
export const getWeeklyTrend = (records, todayDate, maxWeeks = 8) => {
    const today = new Date(todayDate);
    const weeks = [];

    for (let w = 0; w < maxWeeks; w++) {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + 6 - w * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        const startStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        const endStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

        const weekRecords = records.filter(r => r.date >= startStr && r.date <= endStr);
        const total = weekRecords.length;
        const attended = weekRecords.filter(r => r.status === 'present').length;

        weeks.unshift({
            label: `W${maxWeeks - w}`,
            percentage: calculatePercentage(attended, total),
            attended,
            total,
        });
    }

    return weeks;
};

/**
 * Filter records by a date range.
 * @param {Array<{date: string}>} records
 * @param {string} startDate - YYYY-MM-DD inclusive
 * @param {string} endDate - YYYY-MM-DD inclusive
 * @returns {Array}
 */
export const filterRecordsByDateRange = (records, startDate, endDate) => {
    return records.filter(r => r.date >= startDate && r.date <= endDate);
};
