import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, useTheme, IconButton, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients } from '../constants/theme';

const sections = [
    {
        title: 'Getting Started',
        steps: [
            'Open the app and complete the onboarding screen by entering your name.',
            'Add your subjects using the + button on the Subjects tab.',
            'Set up your weekly timetable on the Timetable tab.',
        ],
    },
    {
        title: 'Marking Attendance',
        steps: [
            'Go to the Today tab to see today\'s lectures based on your timetable.',
            'Tap the Present or Absent button for each lecture.',
            'Use the Past Records tab to mark attendance for any past date.',
        ],
    },
    {
        title: 'Tracking Progress',
        steps: [
            'View your attendance percentage for each subject on the Subjects tab.',
            'The Analytics tab shows streaks, weekly trends, and day-of-week stats.',
            'Use the period filter chips to view stats for this week, this month, or all time.',
        ],
    },
    {
        title: 'Notes',
        steps: [
            'Create notes from the Notes tab using the + button.',
            'Format your notes with bold, italic, bullet lists, and checklists.',
            'Use labels to organize your notes by topic or subject.',
        ],
    },
    {
        title: 'Backup & Restore',
        steps: [
            'Export your data to a JSON file from Settings > Backup & Restore.',
            'Keep the file safe — you can import it later to restore all data.',
        ],
    },
    {
        title: 'Notifications',
        steps: [
            'Enable Daily Reminders in Settings to get notified at 5 PM and 10 PM.',
            'This helps you remember to mark your attendance every day.',
        ],
    },
];

const HowToUseScreen = ({ navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();

    return (
        <LinearGradient
            colors={isDark ? gradients.darkGlass : gradients.lightGlass}
            style={styles.container}
        >
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor={theme.colors.text}
                    onPress={() => navigation.goBack()}
                    accessibilityLabel="Go back"
                />
                <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
                    How to Use the App
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {sections.map((section, idx) => (
                    <View key={idx} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            {section.title}
                        </Text>
                        <Divider style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }} />
                        {section.steps.map((step, sIdx) => (
                            <View key={sIdx} style={styles.stepRow}>
                                <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
                                <Text variant="bodyMedium" style={[styles.stepText, { color: theme.colors.text }]}>
                                    {step}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    title: {
        fontWeight: 'bold',
        marginLeft: 4,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 8,
    },
    bullet: {
        fontSize: 16,
        marginRight: 8,
        lineHeight: 22,
    },
    stepText: {
        flex: 1,
        lineHeight: 22,
    },
});

export default HowToUseScreen;
