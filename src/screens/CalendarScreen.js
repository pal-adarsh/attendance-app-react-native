import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const CalendarScreen = () => {
    const theme = useTheme();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [attendanceStatus, setAttendanceStatus] = useState({});
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

    useFocusEffect(
        useCallback(() => {
            loadAttendanceForDate(selectedDate);
        }, [selectedDate])
    );

    const loadData = async () => {
        const [allSubjects, loadedTimetable] = await Promise.all([
            StorageService.loadSubjects(),
            StorageService.loadTimetable()
        ]);
        setSubjects(allSubjects);
        setTimetable(loadedTimetable);
    };

    const loadAttendanceForDate = async (date) => {
        const records = await StorageService.getRecordsByDate(date);
        const statusMap = {};
        records.forEach(record => {
            statusMap[record.subjectId] = record.status;
        });
        setAttendanceStatus(statusMap);
    };

    const getSubjectsForDate = (date) => {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const subjectIds = timetable[dayName] || [];
        return subjects.filter(s => subjectIds.includes(s.id));
    };

    const markAttendance = async (subjectId, status) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        await StorageService.updateAttendanceRecord(selectedDate, subjectId, status);

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

    const dateSubjects = getSubjectsForDate(selectedDate);
    const selectedDateObj = new Date(selectedDate);
    const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;
    const isFuture = selectedDateObj > new Date();

    return (
        <LinearGradient colors={gradients.background} style={styles.container}>
            <ScrollView>
                <View style={styles.calendarContainer}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day) => {
                            setSelectedDate(day.dateString);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        markedDates={{
                            [selectedDate]: {
                                selected: true,
                                selectedColor: '#BB86FC',
                                selectedTextColor: '#FFF',
                            }
                        }}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: '#FFF',
                            selectedDayBackgroundColor: '#BB86FC',
                            selectedDayTextColor: '#FFF',
                            todayTextColor: '#BB86FC',
                            dayTextColor: '#FFF',
                            textDisabledColor: '#666',
                            monthTextColor: '#FFF',
                            arrowColor: '#BB86FC',
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                        }}
                        maxDate={new Date().toISOString().split('T')[0]}
                    />
                </View>

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    <Text variant="titleLarge" style={styles.dateTitle}>
                        {selectedDateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>

                    {isFuture ? (
                        <GradientCard gradient={gradients.card} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🚫</Text>
                                <Text variant="titleMedium" style={styles.infoTitle}>
                                    Cannot mark attendance for future dates
                                </Text>
                            </View>
                        </GradientCard>
                    ) : isWeekend ? (
                        <GradientCard gradient={gradients.card} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>🎉</Text>
                                <Text variant="titleMedium" style={styles.infoTitle}>
                                    No lectures on weekends
                                </Text>
                            </View>
                        </GradientCard>
                    ) : dateSubjects.length === 0 ? (
                        <GradientCard gradient={gradients.card} style={styles.infoCard}>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoEmoji}>📅</Text>
                                <Text variant="titleMedium" style={styles.infoTitle}>
                                    No lectures scheduled for this day
                                </Text>
                            </View>
                        </GradientCard>
                    ) : (
                        dateSubjects.map((subject) => {
                            const status = attendanceStatus[subject.id];

                            return (
                                <GradientCard key={subject.id} gradient={gradients.card} style={styles.subjectCard}>
                                    <View style={styles.subjectContent}>
                                        <Text variant="titleMedium" style={styles.subjectName}>
                                            {subject.name}
                                        </Text>

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
    subjectName: {
        marginBottom: 12,
        fontWeight: 'bold',
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
