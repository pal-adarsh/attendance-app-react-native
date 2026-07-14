import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, useTheme, Text, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import AddEditSubjectModal from '../components/AddEditSubjectModal';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';
import { calculatePercentage, getStatus } from '../utils/attendance';

const SubjectsScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [subjects, setSubjects] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    
    // FAB breathing animation
    const fabScale = useSharedValue(1);

    useEffect(() => {
        fabScale.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1000 }),
                withTiming(1.0, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const data = await StorageService.loadSubjects();
        setSubjects(data);
    };

    const handleSaveSubject = async (subject) => {
        let newSubjects;
        if (editingSubject) {
            newSubjects = subjects.map(s => s.id === subject.id ? subject : s);
        } else {
            newSubjects = [...subjects, subject];
        }
        setSubjects(newSubjects);
        await StorageService.saveSubjects(newSubjects);
        setEditingSubject(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const deleteSubject = (id) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            'Delete Subject',
            'Are you sure you want to delete this subject?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const newSubjects = subjects.filter(s => s.id !== id);
                        setSubjects(newSubjects);
                        await StorageService.saveSubjects(newSubjects);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const openAddModal = () => {
        setEditingSubject(null);
        setModalVisible(true);
    };

    const openEditModal = (subject) => {
        setEditingSubject(subject);
        setModalVisible(true);
    };

    const animatedFabStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: fabScale.value }],
        };
    });

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            {subjects.length === 0 ? (
                <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                        No subjects added yet
                    </Text>
                    <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Tap the + button to add one
                    </Text>
                </Animated.View>
            ) : (
                <FlatList
                    data={subjects}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => {
                        const percentage = calculatePercentage(item.attended, item.total);
                        const status = getStatus(percentage, item.target);
                        const statusGradient = {
                            red: gradients.danger,
                            yellow: gradients.warning,
                            green: gradients.success,
                        }[status];

                        return (
                            <Animated.View entering={FadeInDown.delay(index * 80).duration(450)}>
                                <GradientCard gradient={cardGradient} style={styles.card}>
                                    <View style={styles.cardContent}>
                                        <View style={styles.header}>
                                            <View style={{ flex: 1 }}>
                                                <Text variant="titleLarge" style={[styles.title, { color: theme.colors.text }]}>
                                                    {item.name}
                                                </Text>
                                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                                    {item.attended} / {item.total} lectures • Target: {item.target}%
                                                </Text>
                                                {item.lecturesPerWeek > 0 && (
                                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                                        {item.lecturesPerWeek} lectures/week
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.actions}>
                                                <IconButton
                                                    icon="pencil"
                                                    size={20}
                                                    onPress={() => openEditModal(item)}
                                                    iconColor={theme.colors.primary}
                                                />
                                                <IconButton
                                                    icon="delete"
                                                    size={20}
                                                    onPress={() => deleteSubject(item.id)}
                                                    iconColor={theme.colors.error}
                                                />
                                            </View>
                                        </View>

                                        {/* Premium Animated Progress Bar */}
                                        <View style={styles.progressContainer}>
                                            <AnimatedProgressBar
                                                progress={item.total === 0 ? 0 : percentage / 100}
                                                colors={statusGradient}
                                                height={10}
                                                style={styles.progressBackground}
                                            />
                                            <LinearGradient
                                                colors={statusGradient}
                                                style={styles.percentageBadge}
                                            >
                                                <Text style={styles.percentageText}>
                                                    {percentage.toFixed(1)}%
                                                </Text>
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <Animated.View style={[styles.fab, animatedFabStyle]}>
                <LinearGradient
                    colors={gradients.primary}
                    style={[styles.fabGradient, shadows.large]}
                >
                    <FAB
                        icon="plus"
                        style={styles.fabButton}
                        color="#FFF"
                        onPress={openAddModal}
                    />
                </LinearGradient>
            </Animated.View>

            <AddEditSubjectModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
    },
    cardContent: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    progressBackground: {
        flex: 1,
        height: 10,
    },
    percentageBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        ...shadows.small,
    },
    percentageText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        textAlign: 'center',
        opacity: 0.7,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    fabGradient: {
        borderRadius: 28,
        overflow: 'hidden',
    },
    fabButton: {
        backgroundColor: 'transparent',
    },
});

export default SubjectsScreen;

