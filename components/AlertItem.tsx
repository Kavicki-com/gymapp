import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

const Container = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${theme.spacing.sm}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
`;

const StatusIndicator = styled.View<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${(props: { color: string }) => props.color};
  margin-right: ${theme.spacing.sm}px;
`;

const Content = styled.View`
  flex: 1;
`;

const MainText = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  font-weight: 500;
`;

const SubText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  margin-top: 2px;
`;

const RightContent = styled.View`
  align-items: flex-end;
`;

const ValueText = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  font-weight: bold;
`;

const StatusText = styled.Text<{ color: string }>`
  color: ${(props: { color: string }) => props.color};
  font-size: ${theme.fontSize.xs}px;
  font-weight: bold;
  margin-top: 2px;
`;

export type AlertStatus = 'danger' | 'warning' | 'success' | 'info';

interface AlertItemProps {
  title: string;
  subtitle?: string;
  value?: string;
  statusText?: string;
  status?: AlertStatus;
  onPress?: () => void;
  icon?: string;
}

const STATUS_COLORS: Record<AlertStatus, string> = {
  danger: theme.colors.danger,
  warning: '#F59E0B', // amber
  success: theme.colors.success,
  info: theme.colors.primary,
};

export function AlertItem({
  title,
  subtitle,
  value,
  statusText,
  status = 'info',
  onPress,
  icon,
}: AlertItemProps) {
  const color = STATUS_COLORS[status];

  return (
    <Container onPress={onPress} disabled={!onPress}>
      {icon ? (
        <FontAwesome name={icon as any} size={16} color={color} style={{ marginRight: 8 }} />
      ) : (
        <StatusIndicator color={color} />
      )}
      <Content>
        <MainText numberOfLines={1}>{title}</MainText>
        {subtitle && <SubText numberOfLines={1}>{subtitle}</SubText>}
      </Content>
      <RightContent>
        {value && <ValueText>{value}</ValueText>}
        {statusText && <StatusText color={color}>{statusText}</StatusText>}
      </RightContent>
    </Container>
  );
}
