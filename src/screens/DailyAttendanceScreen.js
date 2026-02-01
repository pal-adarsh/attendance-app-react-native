import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const DailyAttendanceScreen = () => {
    const theme = useTheme();
    const [subjects, setSubjects] = useState([]);
    const [todaySubjects, setTodaySubjects] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState({});
    const [studentName, setStudentName] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
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

    return (
        <LinearGradient
            colors={gradients.background}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                    <View>
                        <Text variant="headlineMedium" style={styles.greeting}>
                            Hello, {studentName}! 👋
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {getTodayDate()}
                        </Text>
                    </View>
                </Animated.View>

                {/* Today's Lectures */}
                {isWeekend() ? (
                    <GradientCard gradient={gradients.card} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>🎉</Text>
                            <Text variant="titleLarge" style={styles.emptyTitle}>
                                It's the weekend!
                            </Text>
                            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                No lectures today. Enjoy your day off!
                            </Text>
                        </View>
                    </GradientCard>
                ) : todaySubjects.length === 0 ? (
                    <GradientCard gradient={gradients.card} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text variant="titleLarge" style={styles.emptyTitle}>
                                No lectures today
                            </Text>
                            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                Go to Timetable tab to set up your schedule
                            </Text>
                        </View>
                    </GradientCard>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text variant="titleLarge" style={styles.sectionTitle}>
                                Today's Lectures
                            </Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{todaySubjects.length}</Text>
                            </View>
                        </View>

                        {todaySubjects.map((subject, index) => {
                            const status = attendanceStatus[subject.id];
                            const isMarked = !!status;

                            return (
                                <Animated.View
                                    key={subject.id}
                                    style={{
                                        opacity: fadeAnim,
                                        transform: [{
                                            translateY: fadeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [50, 0],
                                            }),
                                        }],
                                    }}
                                >
                                    <GradientCard gradient={gradients.card} style={styles.lectureCard}>
                                        <View style={styles.lectureContent}>
                                            <View style={styles.lectureHeader}>
                                                <Text variant="titleLarge" style={styles.lectureName}>
                                                    {subject.name}
                                                </Text>
                                                {isMarked && (
                                                    <View style={[
                                                        styles.statusBadge,
                                                        {
                                                            backgroundColor: status === 'present'
                                                                ? theme.colors.attendanceGreen
                                                                : theme.colors.attendanceRed
                                                        }
                                                    ]}>
                                                        <Text style={styles.statusText}>
                                                            {status === 'present' ? '✓' : '✗'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.buttonContainer}>
                                                <LinearGradient
                                                    colors={status === 'present' ? gradients.success : ['#2C2C2C', '#2C2C2C']}
                                                    style={[styles.buttonGradient, shadows.small]}
                                                >
                                                    <Button
                                                        mode={status === 'present' ? 'contained' : 'outlined'}
                                                        onPress={() => markAttendance(subject.id, 'present')}
                                                        style={styles.button}
                                                        labelStyle={[
                                                            styles.buttonLabel,
                                                            status === 'present' && { color: '#FFF' }
                                                        ]}
                                                        buttonColor="transparent"
                                                    >
                                                        Present
                                                    </Button>
                                                </LinearGradient>

                                                <LinearGradient
                                                    colors={status === 'absent' ? gradients.danger : ['#2C2C2C', '#2C2C2C']}
                                                    style={[styles.buttonGradient, shadows.small]}
                                                >
                                                    <Button
                                                        mode={status === 'absent' ? 'contained' : 'outlined'}
                                                        onPress={() => markAttendance(subject.id, 'absent')}
                                                        style={styles.button}
                                                        labelStyle={[
                                                            styles.buttonLabel,
                                                            status === 'absent' && { color: '#FFF' }
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
