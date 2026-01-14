import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../styles/theme';

export const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

export const CenteredContainer = styled(Container)`
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.lg}px;
`;

export const PageContainer = styled(Container)`
  padding: 0;
`;

export const PageHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg}px;
  background-color: ${theme.colors.background};
`;

export const PageTitle = styled.Text`
  font-size: ${theme.fontSize.xxl}px;
  font-weight: bold;
  color: ${theme.colors.text};
`;

export const AddButton = styled(TouchableOpacity)`
  background-color: ${theme.colors.primary};
  padding-horizontal: ${theme.spacing.lg}px;
  padding-vertical: ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
`;

export const AddButtonText = styled.Text`
  color: #111827;
  font-weight: bold;
`;

export const ListItem = styled.View`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  margin-bottom: ${theme.spacing.md}px;
  margin-horizontal: ${theme.spacing.lg}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 2px;
  elevation: 2;
`;

export const ListItemTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.lg}px;
  font-weight: bold;
`;

export const ListItemSubtitle = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  margin-top: ${theme.spacing.xs}px;
`;

export const Badge = styled.View<{ color?: string }>`
  padding-horizontal: ${theme.spacing.sm}px;
  padding-vertical: 2px;
  border-radius: 99px;
  margin-right: ${theme.spacing.sm}px;
  background-color: ${({ color }) => color || theme.colors.primary};
`;

export const BadgeText = styled.Text<{ color?: string }>`
  font-size: 10px;
  font-weight: bold;
  color: ${({ color }) => color || '#fff'};
`;

export const PickerContainer = styled.View`
  background-color: ${theme.colors.inputBackground};
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  overflow: hidden;
`;

export const Card = styled.View`
  width: 100%;
  max-width: 400px;
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.xxl}px;
  border-radius: ${theme.borderRadius.md}px;
  shadow-color: #000;
  shadow-opacity: 0.25;
  shadow-radius: 3.84px;
  elevation: 5;
`;

export const Title = styled.Text`
  font-size: ${theme.fontSize.xxl}px;
  font-weight: bold;
  color: ${theme.colors.text};
  text-align: center;
  margin-bottom: ${theme.spacing.xl}px;
`;

export const SubTitle = styled.Text`
  font-size: ${theme.fontSize.lg}px;
  font-weight: bold;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

export const FormGroup = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
`;

export const Label = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  font-weight: bold;
  margin-bottom: ${theme.spacing.sm}px;
`;

export const Input = styled.TextInput`
  width: 100%;
  background-color: ${theme.colors.inputBackground};
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  color: ${theme.colors.text};
`;

export const Button = styled(TouchableOpacity) <{ disabled?: boolean; variant?: 'primary' | 'secondary' | 'success' }>`
  width: 100%;
  background-color: ${({ variant }) =>
    variant === 'success' ? theme.colors.success :
      variant === 'secondary' ? theme.colors.surface :
        theme.colors.primary};
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
  align-items: center;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  margin-top: ${theme.spacing.sm}px;
  border-width: ${({ variant }) => (variant === 'secondary' ? 1 : 0)};
  border-color: ${({ variant }) => (variant === 'secondary' ? theme.colors.border : 'transparent')};
`;

export const ButtonText = styled.Text<{ variant?: 'primary' | 'secondary' | 'success' }>`
  color: ${({ variant }) => (variant === 'secondary' ? theme.colors.text : '#111827')};
  font-weight: bold;
  font-size: ${theme.fontSize.md}px;
  color: ${({ variant }) => (variant === 'success' ? '#FFFFFF' : undefined)};
`;

export const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const LinkText = styled.Text`
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

export const HighlightText = styled.Text`
  color: ${theme.colors.primary};
  font-weight: bold;
`;

export const DetailLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

export const DetailValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.lg}px;
  font-weight: 500;
  margin-bottom: ${theme.spacing.md}px;
`;

export const DetailHeader = styled(PageHeader)`
  padding-top: 60px;
`;

export const DetailTitle = styled.Text`
  font-size: ${theme.fontSize.md}px;
  font-weight: bold;
  color: ${theme.colors.text};
`;
