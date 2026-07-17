import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
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
    const [attendanceStatus, setAttendanceStatus] = useState({});
    const [studentName, setStudentName] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [allSubjects, timetable, profile] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable(),
                StorageService.loadStudentProfile()
            ]);

            setSubjects(allSubjects);
            setStudentName(profile.name);

            const today = getTodayDayName();
            const todaySubjectIds = timetable[today] || [];
            const todaySubjectsList = allSubjects.filter(s => todaySubjectIds.includes(s.id));
            setTodaySubjects(todaySubjectsList);

            const todayDate = toLocalDateString();
            const records = await StorageService.getRecordsByDate(todayDate);

            const statusMap = {};
            records.forEach(record => {
                statusMap[record.subjectId] = record.status;
            });
            setAttendanceStatus(statusMap);
        } catch (e) {
            console.error('Failed to load today data', e);
        }
    };

    const markAttendance = async (subjectId, status) => {
        try {
            Haptics.impactAsync(
                status === 'present'
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
            );

            const todayDate = toLocalDateString();
            await StorageService.updateAttendanceRecord(todayDate, subjectId, status);

            setAttendanceStatus(prev => ({
                ...prev,
                [subjectId]: status
            }));

            const updatedSubjects = await StorageService.recomputeSubjectTotals(subjectId);
            setSubjects(updatedSubjects);
        } catch (e) {
            console.error('Failed to mark attendance', e);
        }
    };

    const clearAttendance = (subjectId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Clear attendance for this day?',
            '',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const todayDate = toLocalDateString();
                            await StorageService.removeAttendanceRecord(todayDate, subjectId);

                            setAttendanceStatus(prev => {
                                const next = { ...prev };
                                delete next[subjectId];
                                return next;
                            });

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

    const isWeekend = () => {
        const day = new Date().getDay();
        return day === 0 || day === 6;
    };

    const AnimatedPressable = ({ children, onPress, style: extStyle, ...props }) => {
        const scale = useSharedValue(1);
        const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
        return (
            <Pressable
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
    const defaultButtonColors = isDark ? ['#2C2C2C', '#2C2C2C'] : ['#E2E8F0', '#E2E8F0'];

    return (
        <LinearGradient
            colors={backgroundGradient}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                    <View>
                        <Text variant="headlineMedium" style={[styles.greeting, { color: theme.colors.text }]}>
                            Hello, {studentName}! 👋
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {formatLocalDate(toLocalDateString())}
                        </Text>
                    </View>
                </Animated.View>

                {/* Summary card */}
                {!isWeekend() && todaySubjects.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.summaryCard}>
                        <LinearGradient
                            colors={isDark ? gradients.darkCard : gradients.lightCard}
                            style={styles.summaryGradient}
                        >
                            <View style={styles.summaryHeader}>
                                <Text variant="titleMedium" style={[styles.summaryTitle, { color: theme.colors.text }]}>
                                    Today's Progress
                                </Text>
                                <View style={[styles.summaryBadge, { backgroundColor: theme.colors.primary }]}>
                                    <Text style={styles.summaryBadgeText}>
                                        {Object.keys(attendanceStatus).length}/{todaySubjects.length}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.summaryBar}>
                                <View style={[styles.summaryBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                                    <View style={[styles.summaryBarFill, { width: `${todaySubjects.length > 0 ? (Object.keys(attendanceStatus).length / todaySubjects.length) * 100 : 0}%`, backgroundColor: theme.colors.primary }]} />
                                </View>
                            </View>
                            <View style={styles.summaryStats}>
                                <View style={styles.summaryStat}>
                                    <Text style={[styles.summaryStatValue, { color: theme.colors.attendanceGreen }]}>
                                        {Object.values(attendanceStatus).filter(s => s === 'present').length}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Present</Text>
                                </View>
                                <View style={styles.summaryStat}>
                                    <Text style={[styles.summaryStatValue, { color: theme.colors.attendanceRed }]}>
                                        {Object.values(attendanceStatus).filter(s => s === 'absent').length}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Absent</Text>
                                </View>
                                <View style={styles.summaryStat}>
                                    <Text style={[styles.summaryStatValue, { color: theme.colors.text }]}>
                                        {todaySubjects.length - Object.keys(attendanceStatus).length}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Pending</Text>
                                </View>
                                {subjects.length > 0 && (() => {
                                    const totalAttended = subjects.reduce((sum, s) => sum + (s.attended || 0), 0);
                                    const totalLectures = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
                                    const overallPct = calculatePercentage(totalAttended, totalLectures);
                                    return (
                                        <View style={styles.summaryStat}>
                                            <Text style={[styles.summaryStatValue, { color: theme.colors.primary }]}>
                                                {overallPct.toFixed(0)}%
                                            </Text>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Overall</Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}

                {isWeekend() ? (
                    <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                        <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyEmoji}>🎉</Text>
                                <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                    It's the weekend!
                                </Text>
                                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                    No lectures today. Enjoy your day off!
                                </Text>
                            </View>
                        </GradientCard>
                    </Animated.View>
                ) : todaySubjects.length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                        <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyEmoji}>📅</Text>
                                <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                    No lectures today
                                </Text>
                                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                    Go to Timetable tab to set up your schedule
                                </Text>
                            </View>
                        </GradientCard>
                    </Animated.View>
                ) : (
                    <>
                        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.sectionHeader}>
                            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Today's Lectures
                            </Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{todaySubjects.length}</Text>
                            </View>
                        </Animated.View>

                        {todaySubjects.map((subject, index) => {
                            const status = attendanceStatus[subject.id];
                            const isMarked = !!status;

                            return (
                                <Animated.View
                                    key={subject.id}
                                    entering={FadeInDown.delay(150 + index * 100).duration(500)}
                                >
                                    <GradientCard gradient={cardGradient} style={styles.lectureCard}>
                                        <View style={styles.lectureContent}>
                                            <View style={styles.lectureHeader}>
                                                <Text variant="titleLarge" style={[styles.lectureName, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                                                    {subject.name}
                                                </Text>
                                                <View style={styles.headerActions}>
                                                    {isMarked && (
                                                        <IconButton
                                                            icon="close-circle-outline"
                                                            size={22}
                                                            onPress={() => clearAttendance(subject.id)}
                                                            iconColor={theme.colors.onSurfaceVariant}
                                                            accessibilityLabel="Clear attendance"
                                                        />
                                                    )}
                                                    {isMarked && (
                                                        <Animated.View
                                                            entering={ZoomIn.springify()}
                                                            style={[
                                                                styles.statusBadge,
                                                                {
                                                                    backgroundColor: status === 'present'
                                                                        ? theme.colors.attendanceGreen
                                                                        : theme.colors.attendanceRed
                                                                }
                                                            ]}
                                                        >
                                                            <Text style={styles.statusText}>
                                                                {status === 'present' ? '✓' : '✗'}
                                                            </Text>
                                                        </Animated.View>
                                                    )}
                                                </View>
                                            </View>

                                            <View style={styles.buttonContainer}>
                                                <AnimatedPressable style={styles.buttonFlex}>
                                                    <LinearGradient
                                                        colors={status === 'present' ? gradients.success : defaultButtonColors}
                                                        style={[styles.buttonGradient, shadows.small]}
                                                    >
                                                        <Button
                                                            mode={status === 'present' ? 'contained' : 'outlined'}
                                                            onPress={() => markAttendance(subject.id, 'present')}
                                                            style={styles.button}
                                                            labelStyle={[
                                                                styles.buttonLabel,
                                                                status === 'present' ? { color: '#FFF' } : { color: theme.colors.onSurface }
                                                            ]}
                                                            buttonColor="transparent"
                                                            accessibilityLabel="Mark present"
                                                        >
                                                            Present
                                                        </Button>
                                                    </LinearGradient>
                                                </AnimatedPressable>

                                                <AnimatedPressable style={styles.buttonFlex}>
                                                    <LinearGradient
                                                        colors={status === 'absent' ? gradients.danger : defaultButtonColors}
                                                        style={[styles.buttonGradient, shadows.small]}
                                                    >
                                                        <Button
                                                            mode={status === 'absent' ? 'contained' : 'outlined'}
                                                            onPress={() => markAttendance(subject.id, 'absent')}
                                                            style={styles.button}
                                                            labelStyle={[
                                                                styles.buttonLabel,
                                                                status === 'absent' ? { color: '#FFF' } : { color: theme.colors.onSurface }
                                                            ]}
                                                            buttonColor="transparent"
                                                            accessibilityLabel="Mark absent"
                                                        >
                                                            Absent
                                                        </Button>
                                                    </LinearGradient>
                                                </AnimatedPressable>
                                            </View>
                                        </View>
                                    </GradientCard>
                                </Animated.View>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    greeting: {
        fontWeight: 'bold',
    },
    summaryCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        ...shadows.medium,
    },
    summaryGradient: {
        padding: 16,
        borderRadius: 16,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryTitle: {
        fontWeight: 'bold',
    },
    summaryBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    summaryBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 13,
    },
    summaryBar: {
        marginBottom: 16,
    },
    summaryBarTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    summaryBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryStat: {
        alignItems: 'center',
    },
    summaryStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginRight: 8,
    },
    badge: {
        backgroundColor: '#BB86FC',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    badgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    lectureCard: {
        marginBottom: 12,
    },
    lectureContent: {
        padding: 16,
    },
    lectureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    lectureName: {
        fontWeight: 'bold',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    statusText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    buttonFlex: { flex: 1 },
    buttonGradient: {
        flex: 1,
        borderRadius: 12,
    },
    button: {
        borderRadius: 12,
    },
    buttonLabel: {
        fontWeight: 'bold',
    },
    emptyCard: {
        padding: 32,
    },
    emptyContent: {
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        opacity: 0.7,
    }
});

export default DailyAttendanceScreen;
