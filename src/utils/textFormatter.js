import React from 'react';
import { Text } from 'react-native';

/**
 * Parses bold syntax (**text** or __text__) and renders React Native Text elements with bold style.
 *
 * @param {string} text - Input string containing bold syntax.
 * @param {object} defaultStyle - Base text style.
 * @param {number} [numberOfLines] - Max lines limit.
 * @returns {React.ReactNode}
 */
export const renderFormattedText = (text, defaultStyle = {}, numberOfLines = undefined) => {
    if (!text) return null;

    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);

    const elements = parts.map((part, i) => {
        if (!part) return null;

        if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
            (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
            const inner = part.slice(2, -2);
            return (
                <Text key={i} style={[defaultStyle, { fontWeight: 'bold' }]}>
                    {inner}
                </Text>
            );
        }

        return (
            <Text key={i} style={defaultStyle}>
                {part}
            </Text>
        );
    });

    return (
        <Text style={defaultStyle} numberOfLines={numberOfLines}>
            {elements}
        </Text>
    );
};

export const stripMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1');
};
