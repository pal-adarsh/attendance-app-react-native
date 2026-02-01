import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS_KEY = '@attendance_subjects';
const STUDENT_KEY = '@attendance_student';
const TIMETABLE_KEY = '@attendance_timetable';
const RECORDS_KEY = '@attendance_records';

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {number} attended
 * @property {number} total
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
 * @property {string} date - YYYY-MM-DD format
 * @property {string} subjectId
 * @property {'present'|'absent'} status
 */

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
            const jsonValue = JSON.stringify(subjects);
            await AsyncStorage.setItem(SUBJECTS_KEY, jsonValue);
        } catch (e) {
            console.error('Failed to save subjects', e);
        }
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
            const jsonValue = JSON.stringify(profile);
            await AsyncStorage.setItem(STUDENT_KEY, jsonValue);
        } catch (e) {
            console.error('Failed to save student profile', e);
        }
    },

    // ========== TIMETABLE ==========
    async loadTimetable() {
        try {
            const jsonValue = await AsyncStorage.getItem(TIMETABLE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : {
                Monday: [],
                Tuesday: [],
                Wednesday: [],
                Thursday: [],
                Friday: []
            };
        } catch (e) {
            console.error('Failed to load timetable', e);
            return {
                Monday: [],
                Tuesday: [],
                Wednesday: [],
                Thursday: [],
                Friday: []
            };
        }
    },

    async saveTimetable(timetable) {
        try {
            const jsonValue = JSON.stringify(timetable);
            await AsyncStorage.setItem(TIMETABLE_KEY, jsonValue);
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
            const jsonValue = JSON.stringify(records);
            await AsyncStorage.setItem(RECORDS_KEY, jsonValue);
        } catch (e) {
            console.error('Failed to save attendance records', e);
        }
    },

    /**
     * Get attendance records for a specific date
     */
    async getRecordsByDate(date) {
        const records = await this.loadAttendanceRecords();
        return records.filter(r => r.date === date);
    },

    /**
     * Update or create an attendance record
     */
    async updateAttendanceRecord(date, subjectId, status) {
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
    },

    /**
     * Calculate subject totals from attendance records
     */
    async calculateSubjectTotals(subjectId) {
        const records = await this.loadAttendanceRecords();
        const subjectRecords = records.filter(r => r.subjectId === subjectId);

        const attended = subjectRecords.filter(r => r.status === 'present').length;
        const total = subjectRecords.length;

        return { attended, total };
    },

    /**
     * Clear all data (for debugging/reset)
     */
    async clearData() {
        try {
            await AsyncStorage.multiRemove([
                SUBJECTS_KEY,
                STUDENT_KEY,
                TIMETABLE_KEY,
                RECORDS_KEY
            ]);
        } catch (e) {
            console.error('Failed to clear data', e);
        }
    }
};
