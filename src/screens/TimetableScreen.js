import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable } from 'react-native';
import { Text, Chip, useTheme, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import ShareTimetableModal from '../components/ShareTimetableModal';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const ROW_1_DAYS = ['Monday', 'Tuesday', 'Wednesday'];
const ROW_2_DAYS = ['Thursday', 'Friday', 'Saturday'];

const TimetableScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [isSaturdayEnabled, setIsSaturdayEnabled] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [loadedSubjects, loadedTimetable, satEnabled] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable(),
                StorageService.isSaturdayEnabled(),
            ]);
            setSubjects(loadedSubjects);
            setTimetable(loadedTimetable);
            setIsSaturdayEnabled(satEnabled);
        } catch (e) {
            console.error('Failed to load timetable data', e);
        }
    };

    const toggleSubject = async (subjectId) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const daySubjects = timetable[selectedDay] || [];
            const newDaySubjects = daySubjects.includes(subjectId)
                ? daySubjects.filter(id => id !== subjectId)
                : [...daySubjects, subjectId];

            const newTimetable = {
                ...timetable,
                [selectedDay]: newDaySubjects
            };

            setTimetable(newTimetable);
            await StorageService.saveTimetable(newTimetable);
        } catch (e) {
            console.error('Failed to toggle subject', e);
        }
    };

    const handleSelectDay = async (day) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (day === 'Saturday' && !isSaturdayEnabled) {
            await StorageService.setSaturdayEnabled(true);
            setIsSaturdayEnabled(true);
        }
        setSelectedDay(day);
    };

    const isSubjectSelected = (subjectId) => {
        return (timetable[selectedDay] || []).includes(subjectId);
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    const renderDayTile = (day) => {
        const isSelected = selectedDay === day;
        const classesCount = (timetable[day] || []).length;
        const isSat = day === 'Saturday';
        const isSatOff = isSat && !isSaturdayEnabled && classesCount === 0;

        return (
            <Pressable
                key={day}
                onPress={() => handleSelectDay(day)}
                style={[
                    styles.dayTile,
                    {
                        backgroundColor: isSelected
                            ? theme.colors.primary
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        borderColor: isSelected
                            ? theme.colors.primary
                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    },
                    isSelected && shadows.small,
                ]}
            >
                <Text
                    style={[
                        styles.dayTileName,
                        {
                            color: isSelected ? '#FFFFFF' : theme.colors.text,
                            fontWeight: isSelected ? 'bold' : '600',
                        }
                    ]}
                >
                    {day.substring(0, 3).toUpperCase()}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.dayTileCount,
                        {
                            color: isSelected
                                ? '#FFFFFF'
                                : (isSatOff ? theme.colors.attendanceYellow : (isDark ? '#D4D4D8' : '#71717A')),
                            fontWeight: isSelected ? '700' : '500',
                        }
                    ]}
                >
                    {isSatOff ? 'Off / Tap' : `${classesCount} ${classesCount === 1 ? 'class' : 'classes'}`}
                </Text>
            </Pressable>
        );
    };

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            {/* Top Action Bar (Share / Import) */}
            <View style={[styles.topActionsBar, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                        Weekly Schedule
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Tap a day to view or edit classes
                    </Text>
                </View>

                <Chip
                    icon="qrcode-scan"
                    onPress={() => setShareModalVisible(true)}
                    style={styles.actionChip}
                    textStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}
                >
                    Share / Scan QR
                </Chip>
            </View>

            {/* All 6 Days Visible in 3x2 Grid */}
            <View style={[styles.gridContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderBottomColor: theme.colors.surfaceVariant }]}>
                {/* Row 1: Mon, Tue, Wed */}
                <View style={styles.gridRow}>
                    {ROW_1_DAYS.map(renderDayTile)}
                </View>

                {/* Row 2: Thu, Fri, Sat */}
                <View style={[styles.gridRow, { marginTop: 8 }]}>
                    {ROW_2_DAYS.map(renderDayTile)}
                </View>
            </View>

            {/* Subject Selection for Selected Day */}
            <Animated.View
                key={selectedDay}
                entering={FadeInDown.duration(350)}
                style={styles.content}
            >
                <View style={styles.sectionHeader}>
                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        {selectedDay}'s Classes
                    </Text>
                    <View style={[styles.activeBadge, { backgroundColor: theme.colors.primary + '25', borderColor: theme.colors.primary }]}>
                        <Text style={[styles.activeBadgeText, { color: theme.colors.primary }]}>
                            {(timetable[selectedDay] || []).length} scheduled
                        </Text>
                    </View>
                </View>

                {subjects.length === 0 ? (
                    <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <MaterialCommunityIcons name="book-open-page-variant-outline" size={44} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 8 }} />
                            <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                No subjects added yet
                            </Text>
                            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                Go to the Subjects tab to add your courses first.
                            </Text>
                        </View>
                    </GradientCard>
                ) : (
                    <FlatList
                        data={subjects}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => {
                            const isSelected = isSubjectSelected(item.id);
                            return (
                                <Animated.View
                                    entering={FadeInDown.delay(index * 45).duration(300)}
                                    layout={Layout.springify()}
                                >
                                    <GradientCard
                                        gradient={isSelected ? (isDark ? ['#3D1E0E', '#2A1408'] : ['#FFEDD5', '#FED7AA']) : cardGradient}
                                        style={[
                                            styles.subjectCard,
                                            isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5 }
                                        ]}
                                        onPress={() => toggleSubject(item.id)}
                                    >
                                        <View style={styles.subjectCardContent}>
                                            <View style={styles.subjectInfo}>
                                                <Text variant="titleMedium" style={[styles.subjectName, { color: theme.colors.text }]} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: isSelected ? (isDark ? '#E4E4E7' : '#334155') : (isDark ? '#A1A1AA' : '#64748B'), marginTop: 2 }}>
                                                    Target: {item.target || 75}% • {item.lecturesPerWeek || 0} lec/week
                                                </Text>
                                            </View>

                                            <View style={[
                                                styles.selectionCircle,
                                                { borderColor: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant },
                                                isSelected && { backgroundColor: theme.colors.primary }
                                            ]}>
                                                {isSelected && (
                                                    <MaterialCommunityIcons name="check" size={13} color="#FFF" />
                                                )}
                                            </View>
                                        </View>
                                    </GradientCard>
                                </Animated.View>
                            );
                        }}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </Animated.View>

            {/* Share / Import Timetable Modal */}
            <ShareTimetableModal
                visible={shareModalVisible}
                onDismiss={() => setShareModalVisible(false)}
                timetable={timetable}
                subjects={subjects}
                onImportSuccess={loadData}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topActionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    actionChip: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    gridContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    dayTile: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1.5,
        minHeight: 56,
    },
    dayTileName: {
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    dayTileCount: {
        fontSize: 11.5,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontWeight: 'bold',
    },
    activeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 120,
    },
    subjectCard: {
        marginBottom: 10,
        borderRadius: 14,
    },
    subjectCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    subjectInfo: {
        flex: 1,
        marginRight: 12,
    },
    subjectName: {
        fontWeight: 'bold',
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    emptyCard: {
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyContent: {
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyTitle: {
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        opacity: 0.8,
    },
});

export default TimetableScreen;
