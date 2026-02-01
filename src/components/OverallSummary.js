import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { calculatePercentage, getStatus } from '../utils/attendance';

const OverallSummary = ({ subjects }) => {
    const theme = useTheme();

    const { totalAttended, totalLectures } = useMemo(() => {
        return subjects.reduce((acc, subject) => ({
            totalAttended: acc.totalAttended + subject.attended,
            totalLectures: acc.totalLectures + subject.total
        }), { totalAttended: 0, totalLectures: 0 });
    }, [subjects]);

    const percentage = calculatePercentage(totalAttended, totalLectures);
    const status = getStatus(percentage, 75);

    const statusColor = {
        red: theme.colors.attendanceRed,
        yellow: theme.colors.attendanceYellow,
        green: theme.colors.attendanceGreen,
    }[status];

    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleMedium" style={styles.title}>Overall Attendance</Text>
                <View style={styles.statsRow}>
                    <Text variant="displayMedium" style={{ color: statusColor, fontWeight: 'bold' }}>
                        {percentage.toFixed(1)}%
                    </Text>
                    <View style={styles.details}>
                        <Text variant="bodyMedium">Total Lectures: {totalLectures}</Text>
                        <Text variant="bodyMedium">Total Attended: {totalAttended}</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        margin: 16,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: '#2C2C2C', // Slightly lighter than background
    },
    title: {
        marginBottom: 8,
        opacity: 0.8,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    details: {
        alignItems: 'flex-end',
    }
});

export default OverallSummary;
