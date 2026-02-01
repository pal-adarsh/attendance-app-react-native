import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from 'react-native-paper';
import { shadows } from '../constants/theme';

const GradientCard = ({ children, gradient, style, ...props }) => {
    return (
        <Card style={[styles.card, style]} {...props}>
            <LinearGradient
                colors={gradient || ['#1E1E1E', '#2C2C2C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {children}
            </LinearGradient>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
        borderRadius: 16,
        ...shadows.medium,
    },
    gradient: {
        flex: 1,
    },
});

export default GradientCard;
