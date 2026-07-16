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
