import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';
import { toLocalDateString, getLocalDayName, isFutureLocalDate, isWeekendLocalDate, formatLocalDate } from '../utils/dateUtils';

const CalendarScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [selectedDate, setSelectedDate] = useState(toLocalDateString());
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [attendanceStatus, setAttendanceStatus] = useState({});

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [allSubjects, loadedTimetable] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable()
            ]);
            setSubjects(allSubjects);
            setTimetable(loadedTimetable);
            const records = await StorageService.getRecordsByDate(selectedDate);
            applyRecords(records);
        } catch (e) {
            console.error('Failed to load calendar data', e);
        }
    };

    const loadAttendanceForDate = async (date) => {
        try {
            const records = await StorageService.getRecordsByDate(date);
            applyRecords(records);
        } catch (e) {
            console.error('Failed to load attendance for date', e);
        }
    };

    const applyRecords = (records) => {
        const statusMap = {};
        records.forEach(record => {
            statusMap[record.subjectId] = record.status;
        });
        setAttendanceStatus(statusMap);
    };

    const getSubjectsForDate = (date) => {
        const dayName = getLocalDayName(date);
        const subjectIds = timetable[dayName] || [];
        return subjects.filter(s => subjectIds.includes(s.id));
    };

    const markAttendance = async (subjectId, status) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            await StorageService.updateAttendanceRecord(selectedDate, subjectId, status);

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
                            await StorageService.removeAttendanceRecord(selectedDate, subjectId);

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

    const dateSubjects = getSubjectsForDate(selectedDate);
    const isFuture = isFutureLocalDate(selectedDate);
    const isWeekend = isWeekendLocalDate(selectedDate);

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;
    const defaultButtonColors = isDark ? ['#2C2C2C', '#2C2C2C'] : ['#E2E8F0', '#E2E8F0'];

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <ScrollView>
                <Animated.View entering={FadeInDown.duration(500)} style={styles.calendarContainer}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day) => {
                            setSelectedDate(day.dateString);
                            loadAttendanceForDate(day.dateString);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        markedDates={{
                            [selectedDate]: {
                                selected: true,
                                selectedColor: theme.colors.primary,
                                selectedTextColor: '#FFF',
                            }
                        }}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: isDark ? '#FFF' : '#475569',
                            selectedDayBackgroundColor: theme.colors.primary,
                            selectedDayTextColor: '#FFF',
                            todayTextColor: theme.colors.primary,
                            dayTextColor: isDark ? '#FFF' : '#0F172A',
                            textDisabledColor: isDark ? '#666' : '#94A3B8',
                            monthTextColor: isDark ? '#FFF' : '#0F172A',
                            arrowColor: theme.colors.primary,
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                        }}
                        maxDate={toLocalDateString()}
                    />
                </Animated.View>

                <Animated.View
                    key={selectedDate}
                    entering={FadeInDown.duration(400)}
                    style={styles.content}
                >
                    <Text variant="titleLarge" style={[styles.dateTitle, { color: theme.colors.text }]}>
                        {formatLocalDate(selectedDate)}
                    </Text>

                    {isFuture ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🚫</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    Cannot mark attendance for future dates
                                </Text>
                            </View>
                        </GradientCard>
                    ) : isWeekend ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🎉</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    No lectures on weekends
                                </Text>
                            </View>
                        </GradientCard>
                    ) : dateSubjects.length === 0 ? (
                        <GradientCard gradient={cardGradient} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>📅</Text>
                                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.text }]}>
                                    No lectures scheduled for this day
                                </Text>
                            </View>
                        </GradientCard>
                    ) : (
                        dateSubjects.map((subject) => {
                            const status = attendanceStatus[subject.id];

                            return (
                                <GradientCard key={subject.id} gradient={cardGradient} style={styles.subjectCard}>
                                    <View style={styles.subjectContent}>
                                        <View style={styles.subjectHeader}>
                                            <Text variant="titleMedium" style={[styles.subjectName, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                                                {subject.name}
                                            </Text>
                                            {status && (
                                                <View style={styles.headerActions}>
                                                    <IconButton
                                                        icon="close-circle-outline"
                                                        size={22}
                                                        onPress={() => clearAttendance(subject.id)}
                                                        iconColor={theme.colors.onSurfaceVariant}
                                                        accessibilityLabel="Clear attendance"
                                                    />
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
                                                </View>
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
                                                    accessibilityLabel="Mark present"
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
                                                    accessibilityLabel="Mark absent"
                                                >
                                                    Absent
                                                </Button>
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </GradientCard>
                            );
                        })
                    )}
                </Animated.View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    calendarContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    content: {
        padding: 16,
    },
    dateTitle: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    subjectCard: {
        marginBottom: 12,
    },
    subjectContent: {
        padding: 16,
    },
    subjectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    subjectName: {
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
    infoCard: {
        padding: 32,
    },
    infoContent: {
        alignItems: 'center',
    },
    infoEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    infoTitle: {
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default CalendarScreen;
