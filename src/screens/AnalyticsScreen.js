import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import GradientCard from '../components/GradientCard';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import { toLocalDateString } from '../utils/dateUtils';
import {
    calculatePercentage, getStatus, getLecturesNeeded, getLecturesSkippable,
    getAttendanceStreak, getDayOfWeekStats, getWeeklyTrend, filterRecordsByDateRange,
} from '../utils/attendance';
import { gradients, shadows } from '../constants/theme';
import useCountUp from '../hooks/useCountUp';

const PERIODS = [
    { key: 'all', label: 'All Time' },
    { key: 'month', label: 'This Month' },
    { key: 'week', label: 'This Week' },
];

const DayBar = ({ day, percentage, maxPercentage }) => {
    const theme = useTheme();
    const width = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;
    const barColor = percentage >= 75 ? theme.colors.attendanceGreen
        : percentage >= 60 ? theme.colors.attendanceYellow
        : theme.colors.attendanceRed;

    return (
        <View style={styles.dayBarRow}>
            <Text variant="labelSmall" style={[styles.dayLabel, { color: theme.colors.onSurfaceVariant }]}>
                {day.slice(0, 3)}
            </Text>
            <View style={[styles.dayBarTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.dayBarFill, { width: `${width}%`, backgroundColor: barColor }]} />
            </View>
            <Text variant="labelSmall" style={[styles.dayBarValue, { color: theme.colors.text }]}>
                {percentage.toFixed(0)}%
            </Text>
        </View>
    );
};

const WeekBar = ({ label, percentage, maxPercentage, index }) => {
    const theme = useTheme();
    const height = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;
    const barColor = percentage >= 75 ? theme.colors.attendanceGreen
        : percentage >= 60 ? theme.colors.attendanceYellow
        : theme.colors.attendanceRed;

    return (
        <View style={styles.weekBarCol}>
            <View style={styles.weekBarTrack}>
                <View style={[styles.weekBarFill, { height: `${height}%`, backgroundColor: barColor }]} />
            </View>
            <Text variant="labelSmall" style={[styles.weekBarLabel, { color: theme.colors.onSurfaceVariant }]}>
                {label}
            </Text>
        </View>
    );
};

const AnalyticsScreen = ({ navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [allSubjects, setAllSubjects] = useState([]);
    const [allRecords, setAllRecords] = useState([]);
    const [period, setPeriod] = useState('all');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <IconButton
                    icon="cog"
                    iconColor={theme.colors.text}
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityLabel="Open settings"
                />
            ),
        });
    }, [navigation, theme.colors.text]);

    const loadData = async () => {
        try {
            const [subjects, records] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadAttendanceRecords(),
            ]);
            setAllSubjects(subjects);
            setAllRecords(records);
        } catch (e) {
            console.error('Failed to load analytics data', e);
        }
    };

    const todayStr = toLocalDateString();

    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const weekStart = (() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    })();

    const dateRange = useMemo(() => {
        switch (period) {
            case 'week': return { start: weekStart, end: todayStr };
            case 'month': return { start: monthStart, end: todayStr };
            default: return { start: '2000-01-01', end: todayStr };
        }
    }, [period, todayStr]);

    const filteredRecords = useMemo(() =>
        filterRecordsByDateRange(allRecords, dateRange.start, dateRange.end),
        [allRecords, dateRange]
    );

    const subjects = useMemo(() => {
        const subjectRecords = {};
        for (const r of filteredRecords) {
            if (!subjectRecords[r.subjectId]) subjectRecords[r.subjectId] = [];
            subjectRecords[r.subjectId].push(r);
        }
        return allSubjects.map(s => {
            const sRecords = subjectRecords[s.id] || [];
            const sAttended = sRecords.filter(r => r.status === 'present').length;
            const sTotal = sRecords.length;
            const baselineAttended = s.baselineAttended ?? 0;
            const baselineTotal = s.baselineTotal ?? 0;
            return {
                ...s,
                attended: baselineAttended + sAttended,
                total: baselineTotal + sTotal,
            };
        });
    }, [allSubjects, filteredRecords]);

    const overallStats = useMemo(() => {
        const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
        const totalLectures = subjects.reduce((sum, s) => sum + s.total, 0);
        const percentage = calculatePercentage(totalAttended, totalLectures);
        const status = getStatus(percentage, 75);
        return { totalAttended, totalLectures, percentage, status };
    }, [subjects]);

    const overallPercentage = useCountUp(overallStats.percentage, 1200);

    const streaks = useMemo(() =>
        getAttendanceStreak(filteredRecords, todayStr),
        [filteredRecords, todayStr]
    );

    const dayOfWeekStats = useMemo(() =>
        getDayOfWeekStats(filteredRecords),
        [filteredRecords]
    );

    const weeklyTrend = useMemo(() =>
        getWeeklyTrend(filteredRecords, todayStr, 8),
        [filteredRecords, todayStr]
    );

    const maxDayPercentage = useMemo(() =>
        Math.max(...dayOfWeekStats.map(d => d.percentage), 1),
        [dayOfWeekStats]
    );

    const maxWeekPercentage = useMemo(() =>
        Math.max(...weeklyTrend.map(w => w.percentage), 1),
        [weeklyTrend]
    );

    const getStatusGradient = (status) => {
        switch (status) {
            case 'red': return gradients.danger;
            case 'yellow': return gradients.warning;
            case 'green': return gradients.success;
            default: return isDark ? gradients.darkCard : gradients.lightCard;
        }
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Period Filter */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.filterRow}>
                    {PERIODS.map(p => (
                        <Chip
                            key={p.key}
                            selected={period === p.key}
                            onPress={() => {
                                setPeriod(p.key);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[styles.filterChip, { borderColor: theme.colors.cardBorder }]}
                            textStyle={{ color: period === p.key ? theme.colors.primary : theme.colors.onSurfaceVariant }}
                            showSelectedCheck={false}
                        >
                            {p.label}
                        </Chip>
                    ))}
                </Animated.View>

                {/* Overall Attendance Card */}
                <Animated.View entering={FadeInDown.duration(600)}>
                    <LinearGradient
                        colors={getStatusGradient(overallStats.status)}
                        style={[styles.overallCard, shadows.large]}
                    >
                        <View style={styles.overallContent}>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                Overall Attendance
                            </Text>
                            <View style={styles.overallStats}>
                                <Text variant="displayLarge" style={styles.percentageText}>
                                    {overallPercentage.toFixed(1)}%
                                </Text>
                                <View style={styles.statsDetails}>
                                    <Text variant="headlineSmall" style={styles.statsText}>
                                        {overallStats.totalAttended} / {overallStats.totalLectures}
                                    </Text>
                                    <Text variant="bodyMedium" style={styles.statsLabel}>
                                        Lectures
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.progressContainer}>
                                <AnimatedProgressBar
                                    progress={overallStats.percentage / 100}
                                    colors={['#FFFFFF', '#FFFFFF']}
                                    height={12}
                                    style={styles.progressBarBackground}
                                />
                            </View>
                            {overallStats.status === 'red' && (
                                <Text style={styles.statusMessage}>
                                    Below 75% - Focus on attending lectures!
                                </Text>
                            )}
                            {overallStats.status === 'yellow' && (
                                <Text style={styles.statusMessage}>
                                    Close to 75% - Be careful!
                                </Text>
                            )}
                            {overallStats.status === 'green' && (
                                <Text style={styles.statusMessage}>
                                    Great! You're in the safe zone
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Streak Cards */}
                <Animated.View entering={FadeInDown.duration(600).delay(100)}>
                    <View style={styles.streakRow}>
                        <LinearGradient colors={gradients.primary} style={[styles.streakCard, shadows.small]}>
                            <Text variant="displaySmall" style={styles.streakValue}>
                                {streaks.current}
                            </Text>
                            <Text variant="bodySmall" style={styles.streakLabel}>
                                Current Streak
                            </Text>
                        </LinearGradient>
                        <LinearGradient colors={gradients.accent} style={[styles.streakCard, shadows.small]}>
                            <Text variant="displaySmall" style={styles.streakValue}>
                                {streaks.longest}
                            </Text>
                            <Text variant="bodySmall" style={styles.streakLabel}>
                                Best Streak
                            </Text>
                        </LinearGradient>
                    </View>
                </Animated.View>

                {/* Day of Week Breakdown */}
                <Animated.View entering={FadeInDown.duration(600).delay(150)}>
                    <LinearGradient colors={cardGradient} style={[styles.card, shadows.small]}>
                        <Text variant="titleMedium" style={[styles.cardTitle2, { color: theme.colors.text }]}>
                            Attendance by Day of Week
                        </Text>
                        {dayOfWeekStats.every(d => d.total === 0) ? (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                                No records for this period
                            </Text>
                        ) : (
                            dayOfWeekStats.map(d => (
                                <DayBar
                                    key={d.day}
                                    day={d.day}
                                    percentage={d.percentage}
                                    maxPercentage={maxDayPercentage}
                                />
                            ))
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Weekly Trend */}
                <Animated.View entering={FadeInDown.duration(600).delay(200)}>
                    <LinearGradient colors={cardGradient} style={[styles.card, shadows.small]}>
                        <Text variant="titleMedium" style={[styles.cardTitle2, { color: theme.colors.text }]}>
                            Weekly Trend
                        </Text>
                        {weeklyTrend.every(w => w.total === 0) ? (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                                No records for this period
                            </Text>
                        ) : (
                            <View style={styles.weekChart}>
                                {weeklyTrend.map((w, i) => (
                                    <WeekBar
                                        key={w.label}
                                        label={w.label}
                                        percentage={w.percentage}
                                        maxPercentage={maxWeekPercentage}
                                        index={i}
                                    />
                                ))}
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Subject-wise Breakdown */}
                <Animated.Text
                    entering={FadeInDown.delay(250).duration(500)}
                    variant="titleLarge"
                    style={styles.sectionTitle}
                >
                    Subject-wise Breakdown
                </Animated.Text>

                {subjects.length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyEmoji}>📊</Text>
                                <Text variant="titleMedium" style={styles.emptyTitle}>
                                    No subjects added yet
                                </Text>
                            </View>
                        </GradientCard>
                    </Animated.View>
                ) : (
                    subjects.map((subject, index) => {
                        const percentage = calculatePercentage(subject.attended, subject.total);
                        const status = getStatus(percentage, subject.target);
                        const gradient = getStatusGradient(status);
                        const needed = getLecturesNeeded(subject.attended, subject.total, subject.target);
                        const skippable = getLecturesSkippable(subject.attended, subject.total, subject.target);

                        return (
                            <Animated.View
                                key={subject.id}
                                entering={FadeInDown.delay(300 + index * 80).duration(500)}
                                layout={Layout.springify()}
                            >
                                <GradientCard gradient={cardGradient} style={styles.subjectCard}>
                                    <View style={styles.subjectContent}>
                                        <View style={styles.subjectHeader}>
                                            <Text variant="titleMedium" style={styles.subjectName} numberOfLines={1} ellipsizeMode="tail">
                                                {subject.name}
                                            </Text>
                                            <LinearGradient
                                                colors={gradient}
                                                style={styles.percentageBadge}
                                            >
                                                <Text style={styles.percentageBadgeText}>
                                                    {percentage.toFixed(1)}%
                                                </Text>
                                            </LinearGradient>
                                        </View>
                                        <Text variant="bodySmall" style={[styles.lectureCount, { color: theme.colors.onSurfaceVariant }]}>
                                            {subject.attended} / {subject.total} lectures
                                        </Text>
                                        <View style={styles.progressContainer}>
                                            <AnimatedProgressBar
                                                progress={subject.total === 0 ? 0 : percentage / 100}
                                                colors={gradient}
                                                height={10}
                                                style={styles.subjectProgressBackground}
                                            />
                                        </View>
                                        <View style={styles.insights}>
                                            {subject.total === 0 ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                                                    No lectures logged yet
                                                </Text>
                                            ) : needed === Infinity ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceRed, fontWeight: '600' }}>
                                                    Target unreachable at current rate
                                                </Text>
                                            ) : status === 'red' ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceRed, fontWeight: '600' }}>
                                                    Attend next {needed} lectures to reach {subject.target}%
                                                </Text>
                                            ) : skippable === Infinity ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceGreen, fontWeight: '600' }}>
                                                    No lectures to skip needed
                                                </Text>
                                            ) : (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceGreen, fontWeight: '600' }}>
                                                    Can skip {skippable} lectures safely
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>

        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16 },
    filterRow: {
        flexDirection: 'row', marginBottom: 16, gap: 8,
    },
    filterChip: {
        borderRadius: 20,
    },
    overallCard: {
        borderRadius: 20, marginBottom: 16, overflow: 'hidden',
    },
    overallContent: { padding: 24 },
    cardTitle: { marginBottom: 20, fontWeight: 'bold', color: '#FFF' },
    overallStats: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
    },
    percentageText: { fontWeight: 'bold', color: '#FFF' },
    statsDetails: { alignItems: 'flex-end' },
    statsText: { fontWeight: 'bold', color: '#FFF' },
    statsLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    progressContainer: { marginBottom: 16 },
    progressBarBackground: {
        height: 12, backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6, overflow: 'hidden',
    },
    statusMessage: { color: '#FFF', fontWeight: '600', textAlign: 'center' },
    streakRow: {
        flexDirection: 'row', gap: 12, marginBottom: 16,
    },
    streakCard: {
        flex: 1, borderRadius: 16, padding: 20, alignItems: 'center',
    },
    streakValue: { color: '#FFF', fontWeight: 'bold' },
    streakLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    card: {
        borderRadius: 16, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    cardTitle2: { fontWeight: 'bold', marginBottom: 16 },
    dayBarRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    },
    dayLabel: { width: 32 },
    dayBarTrack: {
        flex: 1, height: 12, borderRadius: 6, marginHorizontal: 8, overflow: 'hidden',
    },
    dayBarFill: { height: '100%', borderRadius: 6 },
    dayBarValue: { width: 40, textAlign: 'right', fontWeight: '600' },
    weekChart: {
        flexDirection: 'row', justifyContent: 'space-between',
        height: 120, alignItems: 'flex-end', paddingTop: 8,
    },
    weekBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    weekBarTrack: {
        width: 16, flex: 1, borderRadius: 8, marginBottom: 4,
        backgroundColor: 'rgba(128,128,128,0.15)', overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    weekBarFill: {
        width: '100%', borderRadius: 8,
    },
    weekBarLabel: { fontSize: 9, marginTop: 2 },
    sectionTitle: { marginBottom: 16, fontWeight: 'bold' },
    subjectCard: { marginBottom: 12 },
    subjectContent: { padding: 16 },
    subjectHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8,
    },
    subjectName: { fontWeight: 'bold', flex: 1 },
    percentageBadge: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
        ...shadows.small,
    },
    percentageBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    lectureCount: { marginBottom: 12 },
    subjectProgressBackground: { height: 10 },
    insights: { marginTop: 12 },
    emptyCard: { padding: 32 },
    emptyContent: { alignItems: 'center' },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontWeight: 'bold', textAlign: 'center' },
});

export default AnalyticsScreen;
