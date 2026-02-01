import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, IconButton, Button, useTheme } from 'react-native-paper';
import { calculatePercentage, getStatus, getLecturesNeeded, getLecturesSkippable } from '../utils/attendance';
import * as Haptics from 'expo-haptics';

const SubjectCard = ({ subject, onEdit, onDelete, onUpdate }) => {
    const theme = useTheme();
    const { id, name, attended, total, target = 75 } = subject;

    const percentage = calculatePercentage(attended, total);
    const status = getStatus(percentage, target);

    const statusColor = {
        red: theme.colors.attendanceRed,
        yellow: theme.colors.attendanceYellow,
        green: theme.colors.attendanceGreen,
    }[status];

    const needed = getLecturesNeeded(attended, total, target);
    const skippable = getLecturesSkippable(attended, total, target);

    const handleAttend = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onUpdate(id, attended + 1, total + 1);
    };

    const handleMiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onUpdate(id, attended, total + 1);
    };

    return (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.header}>
                    <Text variant="titleMedium" style={styles.title}>{name}</Text>
                    <View style={styles.actions}>
                        <IconButton icon="pencil" size={20} onPress={() => onEdit(subject)} />
                        <IconButton icon="delete" size={20} onPress={() => onDelete(id)} />
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statColumn}>
                        <Text variant="displaySmall" style={{ color: statusColor }}>
                            {percentage.toFixed(1)}%
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Attendance
                        </Text>
                    </View>
                    <View style={styles.statColumn}>
                        <Text variant="titleLarge">
                            {attended} / {total}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Lectures
                        </Text>
                    </View>
                </View>

                <ProgressBar
                    progress={total === 0 ? 0 : percentage / 100}
                    color={statusColor}
                    style={styles.progressBar}
                />

                <View style={styles.insightContainer}>
                    {status === 'red' ? (
                        <Text style={{ color: theme.colors.attendanceRed }}>
                            Attend next {needed} lectures to reach {target}%
                        </Text>
                    ) : (
                        <Text style={{ color: theme.colors.attendanceGreen }}>
                            You can skip {skippable} lectures safely
                        </Text>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        mode="contained"
                        onPress={handleAttend}
                        style={[styles.button, { backgroundColor: theme.colors.attendanceGreen }]}
                        labelStyle={styles.buttonLabel}
                    >
                        Present
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleMiss}
                        style={[styles.button, { backgroundColor: theme.colors.attendanceRed }]}
                        labelStyle={styles.buttonLabel}
                    >
                        Absent
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        elevation: 4,
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontWeight: 'bold',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statColumn: {
        alignItems: 'center',
        flex: 1,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    insightContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
    },
    buttonLabel: {
        color: '#fff',
        fontWeight: 'bold',
    }
});

export default SubjectCard;
