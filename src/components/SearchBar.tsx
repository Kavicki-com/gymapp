
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

const Container = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${theme.colors.inputBackground};
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  padding-horizontal: ${theme.spacing.md}px;
  margin-horizontal: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
  height: 48px;
`;

const Input = styled.TextInput`
  flex: 1;
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  margin-left: ${theme.spacing.sm}px;
`;

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = "Pesquisar...", onClear }) => {
    return (
        <Container>
            <FontAwesome name="search" size={20} color={theme.colors.textSecondary} />
            <Input
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => {
                    onChangeText('');
                    if (onClear) onClear();
                }}>
                    <FontAwesome name="times-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            )}
        </Container>
    );
};
