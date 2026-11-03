import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../styles/theme';

/*
 * Primitivos visuais do app.
 *
 * Os nomes antigos foram mantidos e redesenhados no lugar (Fase 1 do
 * redesign): as telas que ainda não foram portadas mudam de cara sem mudar
 * de código. As peças novas do redesign estão no fim do arquivo.
 *
 * Texto: sempre fontFamily com o peso no nome (theme.fonts), nunca
 * font-weight — no Android uma fonte customizada ignora o peso.
 */

export const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

export const CenteredContainer = styled(Container)`
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xl}px;
`;

export const PageContainer = styled(Container)`
  padding: 0;
`;

export const PageHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg}px ${theme.spacing.xl}px;
  background-color: ${theme.colors.background};
`;

export const PageTitle = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.xxxl}px;
  letter-spacing: -0.3px;
  color: ${theme.colors.text};
`;

export const AddButton = styled(TouchableOpacity)`
  min-height: ${theme.touch}px;
  background-color: ${theme.colors.primary};
  padding-horizontal: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const AddButtonText = styled.Text`
  font-family: ${theme.fonts.bold};
  font-size: 15px;
  color: ${theme.colors.onPrimary};
`;

export const ListItem = styled.View`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.lg}px;
  border-width: 1px;
  border-color: ${theme.colors.divider};
  margin-bottom: ${theme.spacing.md}px;
  margin-horizontal: ${theme.spacing.xl}px;
`;

export const ListItemTitle = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${theme.colors.text};
`;

export const ListItemSubtitle = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  margin-top: 3px;
`;

export const Badge = styled.View<{ color?: string }>`
  padding-horizontal: ${theme.spacing.sm}px;
  padding-vertical: 2px;
  border-radius: ${theme.borderRadius.pill}px;
  margin-right: ${theme.spacing.sm}px;
  background-color: ${({ color }) => color || theme.colors.primary};
`;

export const BadgeText = styled.Text<{ color?: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 11px;
  color: ${({ color }) => color || theme.colors.text};
`;

export const PickerContainer = styled.View`
  background-color: ${theme.colors.elevated};
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  overflow: hidden;
`;

export const Card = styled.View`
  width: 100%;
  max-width: 420px;
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.xl}px;
  border-radius: ${theme.borderRadius.lg}px;
  border-width: 1px;
  border-color: ${theme.colors.divider};
`;

export const Title = styled.Text`
  font-family: ${theme.fonts.displayHeavy};
  font-size: 30px;
  letter-spacing: -0.6px;
  color: ${theme.colors.text};
  text-align: center;
  margin-bottom: ${theme.spacing.xl}px;
`;

export const SubTitle = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.lg}px;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

export const FormGroup = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
`;

export const Label = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm}px;
`;

export const Input = styled.TextInput.attrs({
  placeholderTextColor: theme.colors.placeholder,
})`
  width: 100%;
  min-height: 52px;
  background-color: ${theme.colors.inputBackground};
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  padding-horizontal: 14px;
  padding-vertical: ${theme.spacing.md}px;
  font-family: ${theme.fonts.regular};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.text};
`;

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

const fundoDoBotao = (variant?: ButtonVariant) =>
  variant === 'success' ? theme.colors.success :
    variant === 'danger' ? theme.colors.danger :
      variant === 'secondary' ? theme.colors.surface :
        theme.colors.primary;

export const Button = styled(TouchableOpacity) <{ disabled?: boolean; variant?: ButtonVariant }>`
  width: 100%;
  min-height: 52px;
  background-color: ${({ variant }) => fundoDoBotao(variant)};
  padding-horizontal: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  margin-top: ${theme.spacing.sm}px;
  border-width: ${({ variant }) => (variant === 'secondary' ? 1 : 0)}px;
  border-color: ${({ variant }) => (variant === 'secondary' ? theme.colors.border : 'transparent')};
`;

export const ButtonText = styled.Text<{ variant?: ButtonVariant }>`
  font-family: ${({ variant }) => (variant === 'secondary' ? theme.fonts.semibold : theme.fonts.bold)};
  font-size: 15px;
  color: ${({ variant }) => (variant === 'secondary' ? theme.colors.text : theme.colors.onPrimary)};
`;

export const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const LinkText = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 15px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

export const HighlightText = styled.Text`
  font-family: ${theme.fonts.semibold};
  color: ${theme.colors.primary};
`;

export const DetailLabel = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: ${theme.fontSize.sm}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

export const DetailValue = styled.Text`
  font-family: ${theme.fonts.medium};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

export const DetailHeader = styled(PageHeader)`
  padding-top: 60px;
`;

export const DetailTitle = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 22px;
  color: ${theme.colors.text};
`;

/* ─── Peças novas do redesign ─────────────────────────────────────────── */

/** Bloco de conteúdo: superfície, borda sutil, raio 20. */
export const Section = styled.View`
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.divider};
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
`;

/** Rótulo de seção em caixa alta ("OUTUBRO", "DADOS PESSOAIS"). */
export const SectionLabel = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 13px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${theme.colors.textSecondary};
`;

/** Título de bloco dentro da tela ("Pra resolver hoje"). */
export const BlockTitle = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.lg}px;
  color: ${theme.colors.text};
`;

/** Número-herói (receita do mês). */
export const HeroNumber = styled.Text`
  font-family: ${theme.fonts.displayHeavy};
  font-size: ${theme.fontSize.hero}px;
  letter-spacing: -0.8px;
  line-height: 44px;
  color: ${theme.colors.text};
`;

export const BodyText = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 15px;
  line-height: 22px;
  color: ${theme.colors.textSecondary};
`;

export const Divider = styled.View`
  height: 1px;
  background-color: ${theme.colors.divider};
`;
