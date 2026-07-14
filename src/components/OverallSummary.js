import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import GradientCard from './GradientCard';
import { calculatePercentage, getStatus } from '../utils/attendance';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients } from '../constants/theme';
import useCountUp from '../hooks/useCountUp';

const OverallSummary = ({ subjects }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();

    const { totalAttended, totalLectures } = useMemo(() => {
        return subjects.reduce((acc, subject) => ({
            totalAttended: acc.totalAttended + subject.attended,
            totalLectures: acc.totalLectures + subject.total
        }), { totalAttended: 0, totalLectures: 0 });
    }, [subjects]);

    const percentage = calculatePercentage(totalAttended, totalLectures);
    const animatedPercentage = useCountUp(percentage, 1000);
    const status = getStatus(percentage, 75);

    const defaultGradient = isDark ? gradients.darkCard : gradients.lightCard;
    const statusGradient = {
        red: gradients.danger,
        yellow: gradients.warning,
        green: gradients.success,
    }[status] || defaultGradient;


    return (
        <GradientCard gradient={statusGradient} style={styles.card}>
            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.title}>Overall Attendance</Text>
                <View style={styles.statsRow}>
                    <Text variant="displayMedium" style={styles.percentageText}>
                        {animatedPercentage.toFixed(1)}%
                    </Text>
                    <View style={styles.details}>
                        <Text variant="bodyMedium" style={styles.detailsText}>Total Lectures: {totalLectures}</Text>
                        <Text variant="bodyMedium" style={styles.detailsText}>Total Attended: {totalAttended}</Text>
                    </View>
                </View>
            </View>
        </GradientCard>
    );
};

const styles = StyleSheet.create({
    card: {
        margin: 16,
        marginBottom: 8,
        borderRadius: 16,
    },
    content: {
        padding: 16,
    },
    title: {
        marginBottom: 8,
        color: '#FFF',
        fontWeight: 'bold',
        opacity: 0.9,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    percentageText: {
        fontWeight: 'bold',
        color: '#FFF',
    },
    details: {
        alignItems: 'flex-end',
    },
    detailsText: {
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    }
});

export default OverallSummary;

