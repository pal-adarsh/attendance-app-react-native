import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

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
        const [allSubjects, timetable, profile] = await Promise.all([
            StorageService.loadSubjects(),
            StorageService.loadTimetable(),
            StorageService.loadStudentProfile()
        ]);

        setSubjects(allSubjects);
        setStudentName(profile.name);

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todaySubjectIds = timetable[today] || [];
        const todaySubjectsList = allSubjects.filter(s => todaySubjectIds.includes(s.id));
        setTodaySubjects(todaySubjectsList);

        const todayDate = new Date().toISOString().split('T')[0];
        const records = await StorageService.getRecordsByDate(todayDate);

        const statusMap = {};
        records.forEach(record => {
            statusMap[record.subjectId] = record.status;
        });
        setAttendanceStatus(statusMap);
    };

    const markAttendance = async (subjectId, status) => {
        Haptics.impactAsync(
            status === 'present'
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Medium
        );

        const todayDate = new Date().toISOString().split('T')[0];
        await StorageService.updateAttendanceRecord(todayDate, subjectId, status);

        setAttendanceStatus(prev => ({
            ...prev,
            [subjectId]: status
        }));

        const { attended, total } = await StorageService.calculateSubjectTotals(subjectId);
        const updatedSubjects = subjects.map(s =>
            s.id === subjectId ? { ...s, attended, total } : s
        );
        await StorageService.saveSubjects(updatedSubjects);
        setSubjects(updatedSubjects);
    };

    const getTodayDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const isWeekend = () => {
        const day = new Date().getDay();
        return day === 0 || day === 6;
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
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                    <View>
                        <Text variant="headlineMedium" style={[styles.greeting, { color: theme.colors.text }]}>
                            Hello, {studentName}! 👋
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {getTodayDate()}
                        </Text>
                    </View>
                </Animated.View>

                {/* Today's Lectures */}
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
                                                <Text variant="titleLarge" style={[styles.lectureName, { color: theme.colors.text }]}>
                                                    {subject.name}
                                                </Text>
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

                                            <View style={styles.buttonContainer}>
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
                                                    >
                                                        Present
                                                    </Button>
                                                </LinearGradient>

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
                                                    >
                                                        Absent
                                                    </Button>
                                                </LinearGradient>
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

