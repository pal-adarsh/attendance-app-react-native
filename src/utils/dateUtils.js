/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export const toLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Parse a YYYY-MM-DD string into a Date object at local midnight
 */
export const parseLocalDateString = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Get the local day name from a YYYY-MM-DD string
 */
export const getLocalDayName = (dateString) => {
    const date = parseLocalDateString(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Check if a YYYY-MM-DD date string is in the future (local timezone)
 */
export const isFutureLocalDate = (dateString) => {
    const today = toLocalDateString();
    return dateString > today;
};

/**
 * Check if a YYYY-MM-DD date string is a weekend
 */
export const isWeekendLocalDate = (dateString) => {
    const date = parseLocalDateString(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
};

/**
 * Get today's day name in local timezone
 */
export const getTodayDayName = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Format a YYYY-MM-DD string to a human-readable local date
 */
export const formatLocalDate = (dateString) => {
    const date = parseLocalDateString(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Get week range for a date string
 */
export const getWeekRange = (dateString) => {
    const date = parseLocalDateString(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        start: toLocalDateString(monday),
        end: toLocalDateString(sunday),
    };
};

/**
 * Get month range for a date string
 */
export const getMonthRange = (dateString) => {
    const date = parseLocalDateString(dateString);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: toLocalDateString(start),
        end: toLocalDateString(end),
    };
};
