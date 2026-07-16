import AsyncStorage from '@react-native-async-storage/async-storage';

export const DATA_SCHEMA_VERSION = 3;

const SUBJECTS_KEY = '@attendance_subjects';
const STUDENT_KEY = '@attendance_student';
const TIMETABLE_KEY = '@attendance_timetable';
const RECORDS_KEY = '@attendance_records';
const THEME_KEY = '@attendance_theme_mode';
const SCHEMA_VERSION_KEY = '@attendance_schema_version';
const NOTES_KEY = '@attendance_notes';

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {number} attended - computed: baselineAttended + records-derived
 * @property {number} total - computed: baselineTotal + records-derived
 * @property {number} baselineAttended - manual adjustment for starting count
 * @property {number} baselineTotal - manual adjustment for starting count
 * @property {number} target
 * @property {number} lecturesPerWeek
 */

/**
 * @typedef {Object} StudentProfile
 * @property {string} name
 * @property {boolean} setupComplete
 */

/**
 * @typedef {Object} Timetable
 * @property {string[]} Monday
 * @property {string[]} Tuesday
 * @property {string[]} Wednesday
 * @property {string[]} Thursday
 * @property {string[]} Friday
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string} date - YYYY-MM-DD format (local timezone)
 * @property {string} subjectId
 * @property {'present'|'absent'} status
 */

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} subjectId - null = general note
 * @property {string[]} labels
 * @property {boolean} pinned
 * @property {boolean} favorite
 * @property {boolean} archived
 * @property {{text: string, done: boolean}[]|null} checklist - null if not a checklist note
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

// ---- Write serialization queue for records ----
let recordsWriteQueue = Promise.resolve();

const enqueueRecordsWrite = (fn) => {
    recordsWriteQueue = recordsWriteQueue.then(fn).catch(fn);
    return recordsWriteQueue;
};

// ---- Schema versioning ----
export const checkSchemaVersion = async () => {
    try {
        const stored = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
        const version = stored ? parseInt(stored, 10) : 0;
        if (version < DATA_SCHEMA_VERSION) {
            await runMigrations(version);
            await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(DATA_SCHEMA_VERSION));
        }
    } catch (e) {
        console.error('Schema version check failed', e);
    }
};

/**
 * Ensure all storage keys exist with correct default values.
 * Safe to call on every boot — uses a flag to skip if already initialized.
 */
const INIT_FLAG_KEY = '@attendance_initialized';

const RAW_STRING_KEYS = new Set([THEME_KEY, SCHEMA_VERSION_KEY]);

export const initializeStorage = async () => {
    try {
        const initialized = await AsyncStorage.getItem(INIT_FLAG_KEY);
        if (initialized) return;

        const defaults = [
            [SUBJECTS_KEY, []],
            [STUDENT_KEY, { name: '', setupComplete: false }],
            [TIMETABLE_KEY, { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] }],
            [RECORDS_KEY, []],
            [THEME_KEY, 'dark'],
            [SCHEMA_VERSION_KEY, String(DATA_SCHEMA_VERSION)],
            [NOTES_KEY, []],
        ];

        const keys = defaults.map(([k]) => k);
        const pairs = await AsyncStorage.multiGet(keys);
        const toSet = [];

        for (let i = 0; i < defaults.length; i++) {
            const [key, defaultVal] = defaults[i];
            if (pairs[i][1] === null) {
                const value = RAW_STRING_KEYS.has(key) ? defaultVal : JSON.stringify(defaultVal);
                toSet.push([key, value]);
            }
        }

        if (toSet.length > 0) {
            await AsyncStorage.multiSet(toSet);
        }

        await AsyncStorage.setItem(INIT_FLAG_KEY, '1');
    } catch (e) {
        console.error('Storage initialization failed', e);
    }
};

/**
 * Returns storage usage info (number of keys, total estimated size).
 */
export const storageHealthCheck = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);
        let totalBytes = 0;
        let keyCount = 0;
        const details = [];
        for (const [key, value] of pairs) {
            if (key === SCHEMA_VERSION_KEY || key === INIT_FLAG_KEY) continue;
            const bytes = (key.length + (value ? value.length : 0)) * 2; // UTF-16
            totalBytes += bytes;
            keyCount++;
            details.push({ key, bytes });
        }
        return { keyCount, totalBytes, details };
    } catch (e) {
        console.error('Storage health check failed', e);
        return { keyCount: 0, totalBytes: 0, details: [] };
    }
};

const runMigrations = async (fromVersion) => {
    if (fromVersion < 2) {
        try {
            const subjects = await loadSubjectsRaw();
            const migrated = subjects.map(s => ({
                ...s,
                baselineAttended: s.baselineAttended ?? s.attended ?? 0,
                baselineTotal: s.baselineTotal ?? s.total ?? 0,
            }));
            await saveSubjectsRaw(migrated);
        } catch (e) {
            console.error('Migration v1→v2 failed', e);
            throw e;
        }
    }
    if (fromVersion < 3) {
        // v2 → v3: Add Notes support (NOTES_KEY). Purely additive — all
        // load*() functions handle missing keys gracefully. No data
        // transformation required. This block exists to keep the version
        // number and migration list in sync for future phases.
    }
};

// ---- Internal raw accessors (for migrations) ----
const loadSubjectsRaw = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(SUBJECTS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load subjects', e);
        return [];
    }
};

const saveSubjectsRaw = async (subjects) => {
    try {
        await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    } catch (e) {
        console.error('Failed to save subjects', e);
    }
};

// ---- Note helpers ----
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const StorageService = {
    // ========== SUBJECTS ==========
    async loadSubjects() {
        try {
            const jsonValue = await AsyncStorage.getItem(SUBJECTS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load subjects', e);
            return [];
        }
    },

    async saveSubjects(subjects) {
        try {
            await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
        } catch (e) {
            console.error('Failed to save subjects', e);
        }
    },

    async recomputeSubjectTotals(subjectId) {
        const subjects = await this.loadSubjects();
        const records = await this.loadAttendanceRecords();
        const subjectRecords = records.filter(r => r.subjectId === subjectId);

        const recordsAttended = subjectRecords.filter(r => r.status === 'present').length;
        const recordsTotal = subjectRecords.length;

        const updatedSubjects = subjects.map(s => {
            if (s.id !== subjectId) return s;
            const baselineAttended = s.baselineAttended ?? 0;
            const baselineTotal = s.baselineTotal ?? 0;
            return {
                ...s,
                attended: baselineAttended + recordsAttended,
                total: baselineTotal + recordsTotal,
            };
        });

        await this.saveSubjects(updatedSubjects);
        return updatedSubjects;
    },

    async deleteSubjectCascade(subjectId) {
        const subjects = await this.loadSubjects();
        const newSubjects = subjects.filter(s => s.id !== subjectId);
        await this.saveSubjects(newSubjects);

        const timetable = await this.loadTimetable();
        const newTimetable = {};
        for (const day of Object.keys(timetable)) {
            newTimetable[day] = (timetable[day] || []).filter(id => id !== subjectId);
        }
        await this.saveTimetable(newTimetable);

        const records = await this.loadAttendanceRecords();
        const newRecords = records.filter(r => r.subjectId !== subjectId);
        await this.saveAttendanceRecords(newRecords);

        const notes = await this.loadNotes();
        const newNotes = notes.filter(n => n.subjectId !== subjectId);
        await this.saveNotes(newNotes);

        return newSubjects;
    },

    // ========== STUDENT PROFILE ==========
    async loadStudentProfile() {
        try {
            const jsonValue = await AsyncStorage.getItem(STUDENT_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : { name: '', setupComplete: false };
        } catch (e) {
            console.error('Failed to load student profile', e);
            return { name: '', setupComplete: false };
        }
    },

    async saveStudentProfile(profile) {
        try {
            await AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(profile));
        } catch (e) {
            console.error('Failed to save student profile', e);
        }
    },

    // ========== TIMETABLE ==========
    async loadTimetable() {
        try {
            const jsonValue = await AsyncStorage.getItem(TIMETABLE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : {
                Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
            };
        } catch (e) {
            console.error('Failed to load timetable', e);
            return { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
        }
    },

    async saveTimetable(timetable) {
        try {
            await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
        } catch (e) {
            console.error('Failed to save timetable', e);
        }
    },

    // ========== ATTENDANCE RECORDS ==========
    async loadAttendanceRecords() {
        try {
            const jsonValue = await AsyncStorage.getItem(RECORDS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load attendance records', e);
            return [];
        }
    },

    async saveAttendanceRecords(records) {
        try {
            await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
        } catch (e) {
            console.error('Failed to save attendance records', e);
        }
    },

    async getRecordsByDate(date) {
        const records = await this.loadAttendanceRecords();
        return records.filter(r => r.date === date);
    },

    async getRecordByDateAndSubject(date, subjectId) {
        const records = await this.loadAttendanceRecords();
        return records.find(r => r.date === date && r.subjectId === subjectId) || null;
    },

    async updateAttendanceRecord(date, subjectId, status) {
        return enqueueRecordsWrite(async () => {
            const records = await this.loadAttendanceRecords();
            const existingIndex = records.findIndex(
                r => r.date === date && r.subjectId === subjectId
            );
            if (existingIndex >= 0) {
                records[existingIndex].status = status;
            } else {
                records.push({ date, subjectId, status });
            }
            await this.saveAttendanceRecords(records);
            return records;
        });
    },

    async removeAttendanceRecord(date, subjectId) {
        return enqueueRecordsWrite(async () => {
            const records = await this.loadAttendanceRecords();
            const newRecords = records.filter(r => !(r.date === date && r.subjectId === subjectId));
            await this.saveAttendanceRecords(newRecords);
            return newRecords;
        });
    },

    // ========== THEME ==========
    async loadThemeMode() {
        try {
            const value = await AsyncStorage.getItem(THEME_KEY);
            return value !== null ? value : 'dark';
        } catch (e) {
            console.error('Failed to load theme mode', e);
            return 'dark';
        }
    },

    async saveThemeMode(mode) {
        try {
            await AsyncStorage.setItem(THEME_KEY, mode);
        } catch (e) {
            console.error('Failed to save theme mode', e);
        }
    },

    // ========== NOTES ==========
    async loadNotes() {
        try {
            const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load notes', e);
            return [];
        }
    },

    async saveNotes(notes) {
        try {
            await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
        } catch (e) {
            console.error('Failed to save notes', e);
        }
    },

    async upsertNote(note) {
        const notes = await this.loadNotes();
        const now = new Date().toISOString();
        const existingIndex = notes.findIndex(n => n.id === note.id);
        let savedNote;

        if (existingIndex >= 0) {
            savedNote = { ...notes[existingIndex], ...note, updatedAt: now };
            notes[existingIndex] = savedNote;
        } else {
            savedNote = {
                ...note,
                id: note.id || generateId(),
                createdAt: note.createdAt || now,
                updatedAt: now,
                labels: note.labels || [],
                pinned: note.pinned || false,
                favorite: note.favorite || false,
                archived: note.archived || false,
                checklist: note.checklist || null,
            };
            notes.push(savedNote);
        }

        await this.saveNotes(notes);
        return { notes, savedNote };
    },

    async deleteNote(id) {
        const notes = await this.loadNotes();
        const newNotes = notes.filter(n => n.id !== id);
        await this.saveNotes(newNotes);
        return newNotes;
    },

    async duplicateNote(id) {
        const notes = await this.loadNotes();
        const original = notes.find(n => n.id === id);
        if (!original) return notes;

        const now = new Date().toISOString();
        const duplicate = {
            ...original,
            id: generateId(),
            title: original.title + ' (Copy)',
            createdAt: now,
            updatedAt: now,
            pinned: false,
            favorite: false,
        };
        const newNotes = [...notes, duplicate];
        await this.saveNotes(newNotes);
        return newNotes;
    },

    async archiveNote(id, archived = true) {
        const notes = await this.loadNotes();
        const newNotes = notes.map(n =>
            n.id === id ? { ...n, archived, updatedAt: new Date().toISOString() } : n
        );
        await this.saveNotes(newNotes);
        return newNotes;
    },

    async loadNotesForSubject(subjectId) {
        const notes = await this.loadNotes();
        return notes.filter(n => n.subjectId === subjectId);
    },

    /**
     * Clear all data (for debugging/reset)
     */
    async clearData() {
        try {
            await AsyncStorage.multiRemove([
                SUBJECTS_KEY, STUDENT_KEY, TIMETABLE_KEY, RECORDS_KEY,
                THEME_KEY, SCHEMA_VERSION_KEY, NOTES_KEY, INIT_FLAG_KEY,
            ]);
        } catch (e) {
            console.error('Failed to clear data', e);
        }
    }
};
