import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Text, Button, useTheme, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import AddExtraClassModal from '../components/AddExtraClassModal';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';
import { toLocalDateString, getTodayDayName, formatLocalDate } from '../utils/dateUtils';
import { calculatePercentage } from '../utils/attendance';

const DailyAttendanceScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [subjects, setSubjects] = useState([]);
    const [todaySubjects, setTodaySubjects] = useState([]);
    const [extraRecords, setExtraRecords] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState({});
    const [studentName, setStudentName] = useState('');
    const [isHoliday, setIsHoliday] = useState(false);
    const [isSaturdayEnabled, setIsSaturdayEnabled] = useState(false);
    const [forceSaturdayWorking, setForceSaturdayWorking] = useState(false);
    const [extraModalVisible, setExtraModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [forceSaturdayWorking])
    );

    const loadData = async () => {
        try {
            const todayDate = toLocalDateString();
            const [allSubjects, timetable, profile, holidays, satEnabled, records] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable(),
                StorageService.loadStudentProfile(),
                StorageService.loadHolidays(),
                StorageService.isSaturdayEnabled(),
                StorageService.getRecordsByDate(todayDate)
            ]);

            setSubjects(allSubjects);
            setStudentName(profile.name);
            setIsSaturdayEnabled(satEnabled);

            const holidayActive = holidays.some(h => (typeof h === 'string' ? h === todayDate : h.date === todayDate));
            setIsHoliday(holidayActive);

            const today = getTodayDayName();
            const todaySubjectIds = timetable[today] || [];
            const todaySubjectsList = allSubjects.filter(s => todaySubjectIds.includes(s.id));
            setTodaySubjects(todaySubjectsList);

            // Separate regular status map and extra records
            const statusMap = {};
            const extras = [];
            records.forEach(record => {
                if (record.isExtra) {
                    extras.push(record);
                } else {
                    statusMap[record.subjectId] = record.status;
                }
            });
            setAttendanceStatus(statusMap);
            setExtraRecords(extras);
        } catch (e) {
            console.error('Failed to load today data', e);
        }
    };

    const markAttendance = async (subjectId, status, recordId = null, isExtra = false) => {
        try {
            Haptics.impactAsync(
                status === 'present' || status === 'od'
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
            );

            const todayDate = toLocalDateString();
            await StorageService.updateAttendanceRecord(todayDate, subjectId, status, recordId, isExtra);

            if (!isExtra) {
                setAttendanceStatus(prev => ({
                    ...prev,
                    [subjectId]: status
                }));
            } else {
                setExtraRecords(prev => prev.map(r => r.id === recordId ? { ...r, status } : r));
            }

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
                            const todayDate = toLocalDateString();
                            await StorageService.removeAttendanceRecord(todayDate, subjectId, recordId);

                            if (recordId) {
                                setExtraRecords(prev => prev.filter(r => r.id !== recordId));
                            } else {
                                setAttendanceStatus(prev => {
                                    const next = { ...prev };
                                    delete next[subjectId];
                                    return next;
                                });
                            }

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

    const toggleHoliday = async () => {
        const todayDate = toLocalDateString();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { isHoliday: newHolidayState } = await StorageService.toggleHoliday(todayDate);
        setIsHoliday(newHolidayState);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const isSunday = () => new Date().getDay() === 0;
    const isSaturday = () => new Date().getDay() === 6;

    const isWeekendActive = () => {
        if (isSunday()) return true;
        if (isSaturday()) {
            return !(isSaturdayEnabled || forceSaturdayWorking || todaySubjects.length > 0);
        }
        return false;
    };

    const AnimatedPressable = ({ children, onPress, style: extStyle, ...props }) => {
        const scale = useSharedValue(1);
        const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
        return (
            <Pressable
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96); }}
                onPressOut={() => { scale.value = withSpring(1); }}
                {...props}
            >
                <Animated.View style={[animStyle, extStyle]}>
                    {children}
                </Animated.View>
            </Pressable>
        );
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    // Combined active lecture count (scheduled + extra)
    const totalTodayLectures = todaySubjects.length + extraRecords.length;
    const markedCount = Object.keys(attendanceStatus).length + extraRecords.filter(r => r.status).length;

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header with Greeting & Action Chips */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1 }}>
                            <Text variant="headlineMedium" style={[styles.greeting, { color: theme.colors.text }]}>
                                Hello, {studentName}!
                            </Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                {formatLocalDate(toLocalDateString())}
                            </Text>
                        </View>
                    </View>

                    {/* Quick Day Controls Bar */}
                    <View style={styles.actionsBar}>
                        <Chip
                            icon={isHoliday ? 'weather-sunny' : 'calendar-star'}
                            selected={isHoliday}
                            onPress={toggleHoliday}
                            style={[
                                styles.actionChip,
                                isHoliday && { backgroundColor: theme.colors.attendanceYellow + '25', borderColor: theme.colors.attendanceYellow }
                            ]}
                            textStyle={{
                                color: isHoliday ? theme.colors.attendanceYellow : theme.colors.onSurfaceVariant,
                                fontWeight: isHoliday ? 'bold' : 'normal',
                                fontSize: 12,
                            }}
                        >
                            {isHoliday ? 'Holiday Active' : 'Mark as Holiday'}
                        </Chip>

                        <Chip
                            icon="plus"
                            onPress={() => setExtraModalVisible(true)}
                            style={styles.actionChip}
                            textStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}
                        >
                            Extra Class
                        </Chip>
                    </View>
                </Animated.View>

                {/* Holiday Banner if today is marked as holiday */}
                {isHoliday ? (
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.holidayBanner}>
                        <LinearGradient colors={isDark ? gradients.darkCard : gradients.lightCard} style={styles.holidayCard}>
                            <MaterialCommunityIcons name="island" size={36} color={theme.colors.attendanceYellow} style={{ marginBottom: 8 }} />
                            <Text variant="titleLarge" style={[styles.holidayTitle, { color: theme.colors.text }]}>
                                Today is a Holiday / Off
                            </Text>
                            <Text variant="bodyMedium" style={[styles.holidaySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                No lectures count against your attendance today. Enjoy your day off!
                            </Text>
                            <Button
                                mode="outlined"
                                onPress={toggleHoliday}
                                style={styles.undoHolidayBtn}
                                textColor={theme.colors.primary}
                            >
                                Undo Holiday / Classes On
                            </Button>
                        </LinearGradient>
                    </Animated.View>
                ) : (
                    <>
                        {/* Progress Summary Card */}
                        {!isWeekendActive() && totalTodayLectures > 0 && (
                            <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.summaryCard}>
                                <LinearGradient colors={isDark ? gradients.darkCard : gradients.lightCard} style={styles.summaryGradient}>
                                    <View style={styles.summaryHeader}>
                                        <Text variant="titleMedium" style={[styles.summaryTitle, { color: theme.colors.text }]}>
                                            Today's Progress
                                        </Text>
                                        <View style={[styles.summaryBadge, { backgroundColor: theme.colors.primary }]}>
                                            <Text style={styles.summaryBadgeText}>
                                                {markedCount}/{totalTodayLectures}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.summaryBar}>
                                        <View style={[styles.summaryBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                                            <View style={[styles.summaryBarFill, { width: `${totalTodayLectures > 0 ? (markedCount / totalTodayLectures) * 100 : 0}%`, backgroundColor: theme.colors.primary }]} />
                                        </View>
                                    </View>
                                    <View style={styles.summaryStats}>
                                        <View style={styles.summaryStat}>
                                            <Text style={[styles.summaryStatValue, { color: theme.colors.attendanceGreen }]}>
                                                {Object.values(attendanceStatus).filter(s => s === 'present').length + extraRecords.filter(r => r.status === 'present').length}
                                            </Text>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Present</Text>
                                        </View>
                                        <View style={styles.summaryStat}>
                                            <Text style={[styles.summaryStatValue, { color: theme.colors.attendanceRed }]}>
                                                {Object.values(attendanceStatus).filter(s => s === 'absent').length + extraRecords.filter(r => r.status === 'absent').length}
                                            </Text>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Absent</Text>
                                        </View>
                                        <View style={styles.summaryStat}>
                                            <Text style={[styles.summaryStatValue, { color: theme.colors.attendanceOD || '#D97706' }]}>
                                                {Object.values(attendanceStatus).filter(s => s === 'od').length + extraRecords.filter(r => r.status === 'od').length}
                                            </Text>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>OD / Duty</Text>
                                        </View>
                                        <View style={styles.summaryStat}>
                                            <Text style={[styles.summaryStatValue, { color: '#A1A1AA' }]}>
                                                {Object.values(attendanceStatus).filter(s => s === 'cancelled').length + extraRecords.filter(r => r.status === 'cancelled').length}
                                            </Text>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Cancelled</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        )}

                        {/* Weekend State */}
                        {isWeekendActive() ? (
                            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                                <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                                    <View style={styles.emptyContent}>
                                        <MaterialCommunityIcons name="weather-sunny" size={40} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                                        <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                            {isSaturday() ? "It's Saturday!" : "It's Sunday!"}
                                        </Text>
                                        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                            {isSaturday()
                                                ? "Saturday is normally off. Does your college have working classes today?"
                                                : "No lectures today. Enjoy your weekend!"}
                                        </Text>
                                        {isSaturday() && (
                                            <Button
                                                mode="contained"
                                                icon="calendar-check"
                                                onPress={() => setForceSaturdayWorking(true)}
                                                style={{ marginTop: 16, backgroundColor: theme.colors.primary }}
                                                labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                                            >
                                                Working Saturday? Show Classes
                                            </Button>
                                        )}
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        ) : totalTodayLectures === 0 ? (
                            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                                <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                                    <View style={styles.emptyContent}>
                                        <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 8 }} />
                                        <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                            No lectures scheduled today
                                        </Text>
                                        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                            Add classes in Timetable tab or tap "+ Extra Class" above.
                                        </Text>
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        ) : (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                        Today's Lectures
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                                        <Text style={styles.badgeText}>{totalTodayLectures}</Text>
                                    </View>
                                </View>

                                {/* Scheduled Lectures */}
                                {todaySubjects.map((subject, index) => {
                                    const status = attendanceStatus[subject.id];
                                    return (
                                        <LectureCard
                                            key={subject.id}
                                            subject={subject}
                                            status={status}
                                            index={index}
                                            isDark={isDark}
                                            theme={theme}
                                            cardGradient={cardGradient}
                                            onMark={(s) => markAttendance(subject.id, s)}
                                            onClear={() => clearAttendance(subject.id)}
                                        />
                                    );
                                })}

                                {/* Extra Ad-Hoc Lectures */}
                                {extraRecords.map((record, index) => {
                                    const subject = subjects.find(s => s.id === record.subjectId) || { name: 'Extra Class', id: record.subjectId };
                                    return (
                                        <LectureCard
                                            key={record.id}
                                            subject={subject}
                                            status={record.status}
                                            index={todaySubjects.length + index}
                                            isDark={isDark}
                                            theme={theme}
                                            cardGradient={cardGradient}
                                            isExtra={true}
                                            onMark={(s) => markAttendance(record.subjectId, s, record.id, true)}
                                            onClear={() => clearAttendance(record.subjectId, record.id)}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modal for Extra Classes */}
            <AddExtraClassModal
                visible={extraModalVisible}
                onDismiss={() => setExtraModalVisible(false)}
                date={toLocalDateString()}
                subjects={subjects}
                onSaved={loadData}
            />
        </LinearGradient>
    );
};

// Sub-component for individual lecture card
const LectureCard = ({ subject, status, index, isDark, theme, cardGradient, isExtra = false, onMark, onClear }) => {
    const isMarked = !!status;

    const getStatusInfo = (st) => {
        switch (st) {
            case 'present': return { label: 'Present', color: theme.colors.attendanceGreen };
            case 'absent': return { label: 'Absent', color: theme.colors.attendanceRed };
            case 'od': return { label: 'On Duty (OD)', color: theme.colors.attendanceOD || '#D97706' };
            case 'cancelled': return { label: 'Cancelled', color: '#A1A1AA' };
            default: return null;
        }
    };

    const statusInfo = getStatusInfo(status);

    return (
        <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(450)}>
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
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                Target: {subject.target || 75}%
                            </Text>
                        </View>

                        <View style={styles.headerActions}>
                            {isMarked && (
                                <IconButton
                                    icon="close-circle-outline"
                                    size={20}
                                    onPress={onClear}
                                    iconColor={theme.colors.onSurfaceVariant}
                                    accessibilityLabel="Clear attendance"
                                />
                            )}
                            {isMarked && statusInfo && (
                                <Animated.View entering={ZoomIn.springify()} style={[styles.statusBadge, { backgroundColor: statusInfo.color + '25', borderColor: statusInfo.color }]}>
                                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                        {statusInfo.label}
                                    </Text>
                                </Animated.View>
                            )}
                        </View>
                    </View>

                    {/* Status Action Buttons Row */}
                    <View style={styles.buttonsRow}>
                        <StatusBtn
                            label="Present"
                            active={status === 'present'}
                            activeColor={theme.colors.attendanceGreen}
                            isDark={isDark}
                            theme={theme}
                            onPress={() => onMark('present')}
                        />
                        <StatusBtn
                            label="Absent"
                            active={status === 'absent'}
                            activeColor={theme.colors.attendanceRed}
                            isDark={isDark}
                            theme={theme}
                            onPress={() => onMark('absent')}
                        />
                        <StatusBtn
                            label="OD / Duty"
                            active={status === 'od'}
                            activeColor={theme.colors.attendanceOD || '#D97706'}
                            isDark={isDark}
                            theme={theme}
                            onPress={() => onMark('od')}
                        />
                        <StatusBtn
                            label="Cancelled"
                            active={status === 'cancelled'}
                            activeColor="#A1A1AA"
                            isDark={isDark}
                            theme={theme}
                            onPress={() => onMark('cancelled')}
                        />
                    </View>
                </View>
            </GradientCard>
        </Animated.View>
    );
};

const StatusBtn = ({ label, active, activeColor, isDark, theme, onPress }) => (
    <Pressable
        onPress={onPress}
        style={[
            styles.statusButton,
            {
                backgroundColor: active ? activeColor : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                borderColor: active ? activeColor : 'transparent',
            }
        ]}
    >
        <Text style={[styles.statusBtnLabel, { color: active ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: active ? 'bold' : '600' }]}>
            {label}
        </Text>
    </Pressable>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    header: { marginBottom: 18 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    greeting: { fontWeight: 'bold' },
    actionsBar: { flexDirection: 'row', gap: 8, marginTop: 4 },
    actionChip: { borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
    summaryCard: { marginBottom: 18, borderRadius: 16, overflow: 'hidden', ...shadows.medium },
    summaryGradient: { padding: 16, borderRadius: 16 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    summaryTitle: { fontWeight: 'bold' },
    summaryBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    summaryBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    summaryBar: { marginBottom: 14 },
    summaryBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    summaryBarFill: { height: '100%', borderRadius: 4 },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryStat: { alignItems: 'center', flex: 1 },
    summaryStatValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
    holidayBanner: { marginBottom: 18 },
    holidayCard: { padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
    holidayEmoji: { fontSize: 44, marginBottom: 8 },
    holidayTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
    holidaySubtitle: { textAlign: 'center', marginBottom: 16, opacity: 0.8 },
    undoHolidayBtn: { borderRadius: 10 },
    emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
    emptyContent: { alignItems: 'center' },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
    emptySubtitle: { textAlign: 'center', opacity: 0.8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontWeight: 'bold' },
    badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    lectureCard: { marginBottom: 12, borderRadius: 16 },
    lectureContent: { padding: 14 },
    lectureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    lectureName: { fontWeight: 'bold' },
    extraTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
    extraTagText: { fontSize: 9, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    buttonsRow: { flexDirection: 'row', gap: 6 },
    statusButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, borderWidth: 1 },
    statusBtnLabel: { fontSize: 11 },
});

export default DailyAttendanceScreen;
