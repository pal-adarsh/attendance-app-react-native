import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, useTheme, IconButton, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '../utils/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradients } from '../constants/theme';

const sections = [
    {
        title: 'Getting Started',
        steps: [
            'Open the app and complete the onboarding screen by entering your name.',
            'Add your subjects using the + button on the Subjects tab.',
            'Set up your weekly timetable on the Timetable tab, or import one from a classmate using a QR code.',
        ],
    },
    {
        title: 'Marking Attendance & Class Statuses',
        steps: [
            'On the Today tab, mark lectures as Present, Absent, OD (On-Duty / Medical), or Cancelled.',
            'Cancelled classes do not count against your attendance percentage.',
            'OD (Duty / Medical Leave) counts as attended so extracurriculars or medical leaves do not drop your percentage.',
            'Use the "+ Extra Class" button to record extra or compensatory lectures not in your regular timetable.',
        ],
    },
    {
        title: 'Holidays & Saturday Classes',
        steps: [
            'Tap "Mark as Holiday" at the top of Today or Calendar tabs on festivals or college days off.',
            'Turn on "Saturday Active" in Timetable or Settings if your college has working classes on Saturdays.',
        ],
    },
    {
        title: 'Bunk Simulator & Analytics',
        steps: [
            'Open the "Bunk Simulator" in the Analytics tab to simulate how missing or attending classes affects your target % before taking off.',
            'View current and best streaks, weekly trends, and weekday breakdown.',
        ],
    },
    {
        title: 'Sharing & Scanning Timetables',
        steps: [
            'Go to Timetable > Share / Scan QR to display your schedule QR code or share the QR image with friends.',
            'Classmates can use the "Scan QR" camera scanner to instantly import all subjects and weekly timetable slots in one tap.',
        ],
    },
    {
        title: 'Notes & Tasks',
        steps: [
            'Create notes per subject or general notes with instant search, swipe-to-pin, and swipe-to-delete.',
            'Use the To-Do tab for assignments and study goals with one-tap completion.',
        ],
    },
    {
        title: 'Backup & Restore',
        steps: [
            'Export your complete data (subjects, timetable, records, notes, todos, and holidays) to a JSON file from Settings.',
            'Import your backup anytime to restore your data on any device.',
        ],
    },
];

const HowToUseScreen = ({ navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={isDark ? gradients.darkGlass : gradients.lightGlass}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor={theme.colors.text}
                    onPress={() => navigation.goBack()}
                    accessibilityLabel="Go back"
                />
                <Image source={require('../../assets/icon.png')} style={styles.logo} />
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
    logo: {
        width: 28,
        height: 28,
        borderRadius: 6,
        marginLeft: 4,
    },
});

export default HowToUseScreen;
