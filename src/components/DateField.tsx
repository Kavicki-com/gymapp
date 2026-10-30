import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

import { theme } from '@/src/styles/theme';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Campo de data com seletor nativo.
 *
 * A interface continua sendo a string 'DD/MM/AAAA' — a mesma que os campos
 * digitados usavam — para os pontos de chamada não precisarem mudar como
 * leem e gravam a data. O que sai é a digitação livre, que é o que produzia
 * o ano 0026, pagamentos no futuro e meses de referência inexistentes.
 */

// Mesmas medidas do Input de src/components/styled (52 px, raio 14, borda).
// Sem margem própria: o espaçamento é de quem posiciona o campo.
const Field = styled.TouchableOpacity`
    min-height: 52px;
    background-color: ${theme.colors.inputBackground};
    border-width: 1px;
    border-color: ${theme.colors.border};
    border-radius: ${theme.borderRadius.md}px;
    padding: 0 14px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const FieldText = styled.Text<{ empty: boolean }>`
    flex-shrink: 1;
    font-family: ${theme.fonts.regular};
    color: ${p => (p.empty ? theme.colors.placeholder : theme.colors.text)};
    font-size: 15px;
`;

const Sheet = styled.View`
    background-color: ${theme.colors.surface};
    border-top-width: 1px;
    border-top-color: ${theme.colors.border};
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 12px 20px 32px;
`;

const SheetBar = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
`;

const SheetAction = styled.Text<{ strong?: boolean }>`
    font-family: ${p => (p.strong ? theme.fonts.bold : theme.fonts.regular)};
    color: ${p => (p.strong ? theme.colors.primary : theme.colors.textSecondary)};
    font-size: 16px;
    padding: 12px 4px;
`;

export type DateFieldProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
    accessibilityLabel?: string;
};

// 'DD/MM/AAAA' -> Date. Constrói por componentes, nunca por string ISO:
// `new Date('2026-09-17')` é lido como UTC e volta um dia atrás em fuso
// negativo — o mesmo motivo do formatISODate em utils/masks.
export const parseBRDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const [d, m, y] = String(value).split('/');
    if (!d || !m || !y || y.length !== 4) return null;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
};

export const toBRDate = (date: Date): string => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export function DateField({
    value,
    onChange,
    placeholder = 'Selecionar data',
    minimumDate,
    maximumDate,
    accessibilityLabel,
}: DateFieldProps) {
    const [open, setOpen] = useState(false);
    // Rascunho só no iOS: lá o seletor fica numa folha com Cancelar/Confirmar.
    // No Android o próprio diálogo nativo já confirma.
    const [draft, setDraft] = useState<Date | null>(null);

    const current = parseBRDate(value) ?? new Date();

    const abrir = () => {
        setDraft(current);
        setOpen(true);
    };

    const picker = (
        <DateTimePicker
            value={(Platform.OS === 'ios' ? draft : null) ?? current}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="pt-BR"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, selected) => {
                if (Platform.OS === 'ios') {
                    if (selected) setDraft(selected);
                    return;
                }
                // Android: 'set' confirma, 'dismissed' cancela.
                setOpen(false);
                if (event.type === 'set' && selected) onChange(toBRDate(selected));
            }}
        />
    );

    return (
        <>
            <Field
                onPress={abrir}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? placeholder}
            >
                <FieldText empty={!value}>{value || placeholder}</FieldText>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x="3" y="5" width="18" height="16" rx="2" />
                    <Path d="M3 10h18M8 3v4M16 3v4" />
                </Svg>
            </Field>

            {open && Platform.OS === 'android' && picker}

            {Platform.OS === 'ios' && (
                <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <Sheet>
                            <SheetBar>
                                <TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button">
                                    <SheetAction>Cancelar</SheetAction>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        onChange(toBRDate(draft ?? current));
                                        setOpen(false);
                                    }}
                                    accessibilityRole="button"
                                >
                                    <SheetAction strong>Confirmar</SheetAction>
                                </TouchableOpacity>
                            </SheetBar>
                            {picker}
                        </Sheet>
                    </View>
                </Modal>
            )}
        </>
    );
}
