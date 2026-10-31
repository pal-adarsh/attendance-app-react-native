import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import AddExtraClassModal from '../components/AddExtraClassModal';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';
import { Calendar } from 'react-native-calendars';
import { toLocalDateString, getLocalDayName, isFutureLocalDate, formatLocalDate } from '../utils/dateUtils';

const CalendarScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [selectedDate, setSelectedDate] = useState(toLocalDateString());
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [allRecords, setAllRecords] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [isSaturdayEnabled, setIsSaturdayEnabled] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState({});
    const [extraRecords, setExtraRecords] = useState([]);
    const [extraModalVisible, setExtraModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [allSubjects, loadedTimetable, records, loadedHolidays, satEnabled] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable(),
                StorageService.loadAttendanceRecords(),
                StorageService.loadHolidays(),
                StorageService.isSaturdayEnabled(),
            ]);
            setSubjects(allSubjects);
            setTimetable(loadedTimetable);
            setAllRecords(records);
            setHolidays(loadedHolidays);
            setIsSaturdayEnabled(satEnabled);

            applyRecordsForDate(records, selectedDate);
        } catch (e) {
            console.error('Failed to load calendar data', e);
        }
    };

    const applyRecordsForDate = (records, date) => {
        const dateRecords = records.filter(r => r.date === date);
        const statusMap = {};
        const extras = [];
        dateRecords.forEach(record => {
            if (record.isExtra) {
                extras.push(record);
            } else {
                statusMap[record.subjectId] = record.status;
            }
        });
        setAttendanceStatus(statusMap);
        setExtraRecords(extras);
    };

    const handleDayPress = (day) => {
        setSelectedDate(day.dateString);
        applyRecordsForDate(allRecords, day.dateString);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const isSelectedDateHoliday = useMemo(() => {
        return holidays.some(h => (typeof h === 'string' ? h === selectedDate : h.date === selectedDate));
    }, [holidays, selectedDate]);

    const toggleSelectedDateHoliday = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { holidays: updated } = await StorageService.toggleHoliday(selectedDate);
        setHolidays(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const getSubjectsForDate = (date) => {
        const dayName = getLocalDayName(date);
        const subjectIds = timetable[dayName] || [];
        return subjects.filter(s => subjectIds.includes(s.id));
    };

    const markAttendance = async (subjectId, status, recordId = null, isExtra = false) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const updatedRecords = await StorageService.updateAttendanceRecord(selectedDate, subjectId, status, recordId, isExtra);
            setAllRecords(updatedRecords);
            applyRecordsForDate(updatedRecords, selectedDate);

            const updatedSubjects = await StorageService.recomputeSubjectTotals(subjectId);
            setSubjects(updatedSubjects);
        } catch (e) {
            console.error('Failed to mark attendance', e);
        }
    };

    const clearAttendance = (subjectId, recordId = null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Clear attendance for this class?',
            '',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedRecords = await StorageService.removeAttendanceRecord(selectedDate, subjectId, recordId);
                            setAllRecords(updatedRecords);
                            applyRecordsForDate(updatedRecords, selectedDate);

                            const updatedSubjects = await StorageService.recomputeSubjectTotals(subjectId);
                            setSubjects(updatedSubjects);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {
                            console.error('Failed to clear attendance', e);
                        }
                    },
                },
            ]
        );
    };

    // Build markedDates object with dots and indicators
    const markedDates = useMemo(() => {
        const marks = {};

        // Aggregate by date
        const byDate = {};
        allRecords.forEach(r => {
            if (!byDate[r.date]) byDate[r.date] = [];
            byDate[r.date].push(r.status);
        });

        Object.keys(byDate).forEach(date => {
            const statuses = byDate[date];
            const hasAbsent = statuses.includes('absent');
            const hasPresentOrOD = statuses.includes('present') || statuses.includes('od');

            let dotColor = theme.colors.attendanceGreen;
            if (hasAbsent && hasPresentOrOD) dotColor = theme.colors.attendanceYellow;
            else if (hasAbsent) dotColor = theme.colors.attendanceRed;

            marks[date] = {
                marked: true,
                dotColor,
            };
        });

        // Mark holidays
        holidays.forEach(h => {
            const hDate = typeof h === 'string' ? h : h.date;
            marks[hDate] = {
                ...(marks[hDate] || {}),
                marked: true,
                dotColor: theme.colors.attendanceYellow,
            };
        });

        // Current selected date
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: theme.colors.primary,
            selectedTextColor: '#FFF',
        };

        return marks;
    }, [allRecords, holidays, selectedDate, theme.colors]);

    const dateSubjects = getSubjectsForDate(selectedDate);
    const isFuture = isFutureLocalDate(selectedDate);

    // Weekend check
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isWeekend = isSunday || (isSaturday && !isSaturdayEnabled && dateSubjects.length === 0);

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Calendar View */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.calendarContainer}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={handleDayPress}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: isDark ? '#E2E8F0' : '#1E293B',
                            textSectionTitleDisabledColor: isDark ? '#666' : '#94A3B8',
                            selectedDayBackgroundColor: theme.colors.primary,
                            selectedDayTextColor: '#FFF',
                            todayBackgroundColor: isDark ? 'rgba(187,134,252,0.15)' : 'rgba(109,40,217,0.1)',
                            todayTextColor: theme.colors.primary,
                            dayTextColor: isDark ? '#E2E8F0' : '#1E293B',
                            textDisabledColor: isDark ? '#444' : '#CBD5E1',
                            monthTextColor: isDark ? '#E2E8F0' : '#1E293B',
                            arrowColor: theme.colors.primary,
                            disabledArrowColor: isDark ? '#444' : '#CBD5E1',
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 15,
                            textMonthFontSize: 17,
                            textDayHeaderFontSize: 13,
                        }}
                        maxDate={toLocalDateString()}
                    />
                </Animated.View>

                {/* Day Details View */}
                <Animated.View key={selectedDate} entering={FadeInDown.duration(400)} style={styles.content}>
                    <View style={styles.dateHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text variant="titleLarge" style={[styles.dateTitle, { color: theme.colors.text }]}>
                                {formatLocalDate(selectedDate)}
                            </Text>
                        </View>
                        <Chip
                            icon={isSelectedDateHoliday ? 'weather-sunny' : 'palm-tree'}
                            selected={isSelectedDateHoliday}
                            onPress={toggleSelectedDateHoliday}
                            style={[
                                styles.holidayChip,
                                isSelectedDateHoliday && { backgroundColor: theme.colors.attendanceYellow + '25', borderColor: theme.colors.attendanceYellow }
                            ]}
                            textStyle={{
                                color: isSelectedDateHoliday ? theme.colors.attendanceYellow : theme.colors.onSurfaceVariant,
                                fontSize: 11,
                                fontWeight: isSelectedDateHoliday ? 'bold' : 'normal',
                            }}
                        >
                            {isSelectedDateHoliday ? '🌴 Holiday' : 'Set Holiday'}
                        </Chip>
                    </View>

                    {isSelectedDateHoliday ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🌴</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    Marked as Holiday / College Off
                                </Text>
                                <Text variant="bodyMedium" style={[styles.infoSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                    Classes on this date do not affect your attendance record.
                                </Text>
                            </View>
                        </GradientCard>
                    ) : isFuture ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🚫</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    Cannot mark attendance for future dates
                                </Text>
                            </View>
                        </GradientCard>
                    ) : isWeekend && dateSubjects.length === 0 ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🎉</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    Weekend Day
                                </Text>
                                <Text variant="bodyMedium" style={[styles.infoSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                    No regular classes scheduled.
                                </Text>
                            </View>
                        </GradientCard>
                    ) : dateSubjects.length === 0 && extraRecords.length === 0 ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>📅</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    No classes on this day
                                </Text>
                            </View>
                        </GradientCard>
                    ) : (
                        <>
                            {dateSubjects.map((subject, index) => {
                                const status = attendanceStatus[subject.id];
                                return (
                                    <PastLectureCard
                                        key={subject.id}
                                        subject={subject}
                                        status={status}
                                        theme={theme}
                                        isDark={isDark}
                                        cardGradient={cardGradient}
                                        onMark={(s) => markAttendance(subject.id, s)}
                                        onClear={() => clearAttendance(subject.id)}
                                    />
                                );
                            })}

                            {extraRecords.map((record) => {
                                const subject = subjects.find(s => s.id === record.subjectId) || { name: 'Extra Class', id: record.subjectId };
                                return (
                                    <PastLectureCard
                                        key={record.id}
                                        subject={subject}
                                        status={record.status}
                                        theme={theme}
                                        isDark={isDark}
                                        cardGradient={cardGradient}
                                        isExtra={true}
                                        onMark={(s) => markAttendance(record.subjectId, s, record.id, true)}
                                        onClear={() => clearAttendance(record.subjectId, record.id)}
                                    />
                                );
                            })}
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            <AddExtraClassModal
                visible={extraModalVisible}
                onDismiss={() => setExtraModalVisible(false)}
                date={selectedDate}
                subjects={subjects}
                onSaved={loadData}
            />
        </LinearGradient>
    );
};

const PastLectureCard = ({ subject, status, theme, isDark, cardGradient, isExtra = false, onMark, onClear }) => {
    const isMarked = !!status;

    const getStatusInfo = (st) => {
        switch (st) {
            case 'present': return { label: '✓ Present', color: theme.colors.attendanceGreen };
            case 'absent': return { label: '✗ Absent', color: theme.colors.attendanceRed };
            case 'od': return { label: '🛡️ OD / Duty', color: '#03DAC6' };
            case 'cancelled': return { label: '🚫 Cancelled', color: '#A1A1AA' };
            default: return null;
        }
    };

    const statusInfo = getStatusInfo(status);

    return (
        <GradientCard gradient={cardGradient} style={styles.lectureCard}>
            <View style={styles.lectureContent}>
                <View style={styles.lectureHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="titleMedium" style={[styles.lectureName, { color: theme.colors.text }]} numberOfLines={1}>
                                {subject.name}
                            </Text>
                            {isExtra && (
                                <View style={[styles.extraTag, { backgroundColor: theme.colors.primary + '20' }]}>
                                    <Text style={[styles.extraTagText, { color: theme.colors.primary }]}>EXTRA</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        {isMarked && (
                            <IconButton
                                icon="close-circle-outline"
                                size={18}
                                onPress={onClear}
                                iconColor={theme.colors.onSurfaceVariant}
                            />
                        )}
                        {isMarked && statusInfo && (
                            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '25', borderColor: statusInfo.color }]}>
                                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                    {statusInfo.label}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.buttonsRow}>
                    {[
                        { key: 'present', label: 'Present', color: theme.colors.attendanceGreen },
                        { key: 'absent', label: 'Absent', color: theme.colors.attendanceRed },
                        { key: 'od', label: 'OD', color: '#03DAC6' },
                        { key: 'cancelled', label: 'Cancel', color: '#A1A1AA' },
                    ].map(btn => (
                        <Pressable
                            key={btn.key}
                            onPress={() => onMark(btn.key)}
                            style={[
                                styles.statusBtn,
                                {
                                    backgroundColor: status === btn.key ? btn.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                    borderColor: status === btn.key ? btn.color : 'transparent',
                                }
                            ]}
                        >
                            <Text style={[styles.statusBtnLabel, { color: status === btn.key ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: status === btn.key ? 'bold' : '600' }]}>
                                {btn.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </GradientCard>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    calendarContainer: {
        borderRadius: 16,
        margin: 16,
        marginBottom: 8,
        paddingBottom: 8,
        ...shadows.small,
    },
    content: { padding: 16, paddingTop: 4, paddingBottom: 40 },
    dateHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    dateTitle: { fontWeight: 'bold' },
    holidayChip: { borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
    infoCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
    infoContent: { alignItems: 'center' },
    infoEmoji: { fontSize: 40, marginBottom: 8 },
    infoTitle: { fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
    infoSubtitle: { textAlign: 'center', opacity: 0.8 },
    lectureCard: { marginBottom: 10, borderRadius: 14 },
    lectureContent: { padding: 14 },
    lectureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    lectureName: { fontWeight: 'bold' },
    extraTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
    extraTagText: { fontSize: 9, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    buttonsRow: { flexDirection: 'row', gap: 6 },
    statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
    statusBtnLabel: { fontSize: 11 },
});

export default CalendarScreen;
