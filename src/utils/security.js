import { Linking, Alert } from 'react-native';

const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:'];
const VALID_DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
const VALID_STATUSES = new Set(['present', 'absent', 'od', 'cancelled']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sanitize user input string against control characters, HTML tags, and excessive length.
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
export const sanitizeText = (input, maxLength = 120) => {
    if (input === null || input === undefined) return '';
    const str = String(input);
    // Remove null bytes, control characters, and basic angle brackets
    const clean = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<>]/g, '').trim();
    return clean.slice(0, maxLength);
};

/**
 * Check for prototype pollution vectors in parsed JSON.
 * @param {any} obj
 * @param {number} depth
 * @returns {boolean} true if safe, false if tainted
 */
export const isObjectSafe = (obj, depth = 0) => {
    if (depth > 8) return false; // Prevent circular / overly deep structures
    if (!obj || typeof obj !== 'object') return true;

    if (Array.isArray(obj)) {
        return obj.every(item => isObjectSafe(item, depth + 1));
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of Object.keys(obj)) {
        if (dangerousKeys.includes(key)) {
            return false;
        }
        if (!isObjectSafe(obj[key], depth + 1)) {
            return false;
        }
    }
    return true;
};

/**
 * Safely open external URLs ensuring whitelist protocols and error containment.
 * @param {string} url
 */
export const safeOpenURL = async (url) => {
    try {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL');
        }

        const trimmed = url.trim();
        const hasAllowedProtocol = ALLOWED_PROTOCOLS.some(p => trimmed.toLowerCase().startsWith(p));
        if (!hasAllowedProtocol) {
            throw new Error('Unsupported URL protocol');
        }

        const supported = await Linking.canOpenURL(trimmed);
        if (supported) {
            await Linking.openURL(trimmed);
        } else {
            Alert.alert('Unable to Open Link', 'Your device does not have an app to open this link.');
        }
    } catch (e) {
        console.warn('Security: Failed to open URL safely', e);
        Alert.alert('Link Error', 'Could not open the requested link.');
    }
};

/**
 * Validate and sanitize timetable import bundle (from QR scanner).
 * @param {any} parsed
 * @returns {{ subjects: Array, schedule: Object }} sanitized bundle
 */
export const validateTimetableBundle = (parsed) => {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid timetable payload: expected JSON object');
    }

    if (!isObjectSafe(parsed)) {
        throw new Error('Malicious or unsafe data detected in timetable code');
    }

    if (!Array.isArray(parsed.subjects) || parsed.subjects.length === 0) {
        throw new Error('Timetable contains no subjects');
    }

    if (parsed.subjects.length > 50) {
        throw new Error('Timetable exceeds maximum allowed subjects limit (50)');
    }

    const sanitizedSubjects = [];
    const seenNames = new Set();

    for (const sub of parsed.subjects) {
        if (!sub || typeof sub !== 'object') continue;
        const name = sanitizeText(sub.name || '', 60);
        if (!name) continue;

        const lower = name.toLowerCase();
        if (seenNames.has(lower)) continue;
        seenNames.add(lower);

        const target = Math.max(1, Math.min(Number(sub.target) || 75, 100));
        const lecturesPerWeek = Math.max(0, Math.min(Number(sub.lecturesPerWeek) || 0, 50));

        sanitizedSubjects.push({
            name,
            target,
            lecturesPerWeek,
        });
    }

    if (sanitizedSubjects.length === 0) {
        throw new Error('No valid subjects could be extracted from timetable');
    }

    const schedule = parsed.schedule && typeof parsed.schedule === 'object' ? parsed.schedule : {};
    const sanitizedSchedule = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [],
    };

    for (const day of Object.keys(schedule)) {
        if (!VALID_DAYS.has(day)) continue;
        const list = Array.isArray(schedule[day]) ? schedule[day] : [];
        // Max 12 classes per day
        sanitizedSchedule[day] = list
            .slice(0, 12)
            .map(n => sanitizeText(n, 60))
            .filter(Boolean);
    }

    return {
        subjects: sanitizedSubjects,
        schedule: sanitizedSchedule,
    };
};

/**
 * Validate and sanitize full backup restore payload.
 * @param {any} backup
 * @param {number} maxVersion
 * @returns {Object} sanitized data object
 */
export const validateBackupPayload = (backup, maxVersion = 3) => {
    if (!backup || typeof backup !== 'object' || !backup.data || typeof backup.data !== 'object') {
        throw new Error('Invalid backup file: missing data object');
    }

    if (!isObjectSafe(backup)) {
        throw new Error('Malicious or unsafe data detected in backup file');
    }

    if (backup.version && Number(backup.version) > maxVersion) {
        throw new Error(`Unsupported backup version (${backup.version}). Please update the app.`);
    }

    const { data } = backup;
    const sanitized = {};

    // 1. Subjects
    if (Array.isArray(data.subjects)) {
        sanitized.subjects = data.subjects.slice(0, 80).map((s, idx) => ({
            id: sanitizeText(s.id || `sub_${Date.now()}_${idx}`, 40),
            name: sanitizeText(s.name || 'Untitled Subject', 60),
            attended: Math.max(0, Math.min(Number(s.attended) || 0, 10000)),
            total: Math.max(0, Math.min(Number(s.total) || 0, 10000)),
            baselineAttended: Math.max(0, Math.min(Number(s.baselineAttended ?? s.attended ?? 0), 10000)),
            baselineTotal: Math.max(0, Math.min(Number(s.baselineTotal ?? s.total ?? 0), 10000)),
            target: Math.max(1, Math.min(Number(s.target) || 75, 100)),
            lecturesPerWeek: Math.max(0, Math.min(Number(s.lecturesPerWeek) || 0, 50)),
        }));
    }

    // 2. Student Profile
    if (data.studentProfile && typeof data.studentProfile === 'object') {
        sanitized.studentProfile = {
            name: sanitizeText(data.studentProfile.name || '', 50),
            setupComplete: Boolean(data.studentProfile.setupComplete),
        };
    }

    // 3. Timetable
    if (data.timetable && typeof data.timetable === 'object') {
        const cleanTT = {
            Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [],
        };
        for (const day of Object.keys(data.timetable)) {
            if (VALID_DAYS.has(day) && Array.isArray(data.timetable[day])) {
                cleanTT[day] = data.timetable[day].slice(0, 16).map(id => sanitizeText(id, 40)).filter(Boolean);
            }
        }
        sanitized.timetable = cleanTT;
    }

    // 4. Attendance Records
    if (Array.isArray(data.attendanceRecords)) {
        sanitized.attendanceRecords = data.attendanceRecords
            .slice(0, 10000)
            .filter(r => r && r.date && DATE_REGEX.test(r.date) && r.subjectId)
            .map(r => ({
                id: sanitizeText(r.id || `${r.date}_${r.subjectId}`, 50),
                date: r.date,
                subjectId: sanitizeText(r.subjectId, 40),
                status: VALID_STATUSES.has(r.status) ? r.status : 'present',
                isExtra: Boolean(r.isExtra),
            }));
    }

    // 5. Notes
    if (Array.isArray(data.notes)) {
        sanitized.notes = data.notes.slice(0, 500).map((n, idx) => ({
            id: sanitizeText(n.id || `note_${idx}`, 40),
            title: sanitizeText(n.title || '', 120),
            body: typeof n.body === 'string' ? n.body.slice(0, 50000) : '',
            subjectId: n.subjectId ? sanitizeText(n.subjectId, 40) : null,
            pinned: Boolean(n.pinned),
            favorite: Boolean(n.favorite),
            archived: Boolean(n.archived),
            labels: Array.isArray(n.labels) ? n.labels.slice(0, 10).map(l => sanitizeText(l, 30)) : [],
            checklist: null,
            createdAt: n.createdAt && !isNaN(new Date(n.createdAt).getTime()) ? n.createdAt : new Date().toISOString(),
            updatedAt: n.updatedAt && !isNaN(new Date(n.updatedAt).getTime()) ? n.updatedAt : new Date().toISOString(),
        }));
    }

    // 6. Todos
    if (Array.isArray(data.todos)) {
        sanitized.todos = data.todos.slice(0, 500).map((t, idx) => ({
            id: sanitizeText(t.id || `todo_${idx}`, 40),
            text: sanitizeText(t.text || '', 200),
            completed: Boolean(t.completed),
            subjectId: t.subjectId ? sanitizeText(t.subjectId, 40) : null,
            createdAt: t.createdAt && !isNaN(new Date(t.createdAt).getTime()) ? t.createdAt : new Date().toISOString(),
            updatedAt: t.updatedAt && !isNaN(new Date(t.updatedAt).getTime()) ? t.updatedAt : new Date().toISOString(),
        }));
    }

    // 7. Holidays
    if (Array.isArray(data.holidays)) {
        sanitized.holidays = data.holidays.slice(0, 365).filter(h => {
            const date = typeof h === 'string' ? h : h?.date;
            return date && DATE_REGEX.test(date);
        }).map(h => {
            if (typeof h === 'string') return h;
            return {
                date: h.date,
                label: sanitizeText(h.label || 'Holiday', 50),
            };
        });
    }

    // 8. Working Days
    if (Array.isArray(data.workingDays)) {
        sanitized.workingDays = data.workingDays.filter(d => VALID_DAYS.has(d));
    }

    return sanitized;
};

