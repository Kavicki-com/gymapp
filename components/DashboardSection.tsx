import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

const Container = styled.View`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.lg}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconContainer = styled.View`
  margin-right: ${theme.spacing.sm}px;
`;

const Title = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.lg}px;
  font-weight: bold;
`;

const Badge = styled.View`
  background-color: ${theme.colors.primary};
  padding-horizontal: ${theme.spacing.sm}px;
  padding-vertical: 2px;
  border-radius: ${theme.borderRadius.sm}px;
  margin-left: ${theme.spacing.sm}px;
`;

const BadgeText = styled.Text`
  color: ${theme.colors.background};
  font-size: ${theme.fontSize.xs}px;
  font-weight: bold;
`;

const ActionButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: ${theme.colors.primary};
  padding-horizontal: ${theme.spacing.md}px;
  padding-vertical: ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
`;

const ActionButtonText = styled.Text`
  color: ${theme.colors.background};
  font-size: ${theme.fontSize.sm}px;
  font-weight: bold;
  margin-left: ${theme.spacing.xs}px;
`;

const EmptyText = styled.Text`
  color: ${theme.colors.textSecondary};
  text-align: center;
  padding: ${theme.spacing.md}px;
`;

interface DashboardSectionProps {
  title: string;
  icon?: string;
  count?: number;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  children: React.ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
}

export function DashboardSection({
  title,
  icon,
  count,
  actionLabel,
  actionIcon,
  onAction,
  children,
  emptyText = 'Nenhum item encontrado',
  isEmpty = false,
}: DashboardSectionProps) {
  return (
    <Container>
      <Header>
        <TitleRow>
          {icon && (
            <IconContainer>
              <FontAwesome name={icon as any} size={20} color={theme.colors.primary} />
            </IconContainer>
          )}
          <Title>{title}</Title>
          {count !== undefined && count > 0 && (
            <Badge>
              <BadgeText>{count}</BadgeText>
            </Badge>
          )}
        </TitleRow>
        {actionLabel && onAction && (
          <ActionButton onPress={onAction}>
            {actionIcon && <FontAwesome name={actionIcon as any} size={14} color={theme.colors.background} />}
            <ActionButtonText>{actionLabel}</ActionButtonText>
          </ActionButton>
        )}
      </Header>
      {isEmpty ? <EmptyText>{emptyText}</EmptyText> : children}
    </Container>
  );
}
