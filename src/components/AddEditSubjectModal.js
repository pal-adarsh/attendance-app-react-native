import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, HelperText } from 'react-native-paper';

const AddEditSubjectModal = ({ visible, onDismiss, onSave, editingSubject }) => {
    const [name, setName] = useState('');
    const [attended, setAttended] = useState('0');
    const [total, setTotal] = useState('0');
    const [target, setTarget] = useState('75');
    const [lecturesPerWeek, setLecturesPerWeek] = useState('0');
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingSubject) {
            setName(editingSubject.name);
            setAttended(String(editingSubject.attended));
            setTotal(String(editingSubject.total));
            setTarget(String(editingSubject.target || 75));
            setLecturesPerWeek(String(editingSubject.lecturesPerWeek || 0));
        } else {
            resetForm();
        }
    }, [editingSubject, visible]);

    const resetForm = () => {
        setName('');
        setAttended('0');
        setTotal('0');
        setTarget('75');
        setLecturesPerWeek('0');
        setError('');
    };

    const handleSave = () => {
        if (!name.trim()) {
            setError('Subject name is required');
            return;
        }

        const attendedNum = parseInt(attended) || 0;
        const totalNum = parseInt(total) || 0;
        const targetNum = parseInt(target) || 75;
        const lecturesPerWeekNum = parseInt(lecturesPerWeek) || 0;

        if (attendedNum > totalNum) {
            setError('Attended lectures cannot be greater than total');
            return;
        }

        onSave({
            id: editingSubject ? editingSubject.id : Date.now().toString(),
            name: name.trim(),
            attended: attendedNum,
            total: totalNum,
            target: targetNum,
            lecturesPerWeek: lecturesPerWeekNum,
        });

        resetForm();
        onDismiss();
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="headlineSmall" style={styles.title}>
                    {editingSubject ? 'Edit Subject' : 'Add Subject'}
                </Text>

                <TextInput
                    label="Subject Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.input}
                    error={!!error && !name.trim()}
                />

                <View style={styles.row}>
                    <TextInput
                        label="Attended"
                        value={attended}
                        onChangeText={setAttended}
                        keyboardType="numeric"
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                    />
                    <TextInput
                        label="Total"
                        value={total}
                        onChangeText={setTotal}
                        keyboardType="numeric"
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                    />
                </View>

                <View style={styles.row}>
                    <TextInput
                        label="Target % (Default 75)"
                        value={target}
                        onChangeText={setTarget}
                        keyboardType="numeric"
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                    />
                    <TextInput
                        label="Lectures/Week"
                        value={lecturesPerWeek}
                        onChangeText={setLecturesPerWeek}
                        keyboardType="numeric"
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                    />
                </View>

                {!!error && <HelperText type="error">{error}</HelperText>}

                <View style={styles.actions}>
                    <Button onPress={onDismiss} style={styles.button}>Cancel</Button>
                    <Button mode="contained" onPress={handleSave} style={styles.button}>Save</Button>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    title: {
        marginBottom: 20,
        color: '#FFF',
    },
    input: {
        marginBottom: 12,
        backgroundColor: '#1E1E1E',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        flex: 0.48,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    button: {
        marginLeft: 10,
    }
});

export default AddEditSubjectModal;
