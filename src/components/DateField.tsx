import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';

/**
 * Campo de data com seletor nativo.
 *
 * A interface continua sendo a string 'DD/MM/AAAA' — a mesma que os campos
 * digitados usavam — para os pontos de chamada não precisarem mudar como
 * leem e gravam a data. O que sai é a digitação livre, que é o que produzia
 * o ano 0026, pagamentos no futuro e meses de referência inexistentes.
 */

const Field = styled.TouchableOpacity`
    background-color: ${theme.colors.inputBackground};
    border-radius: 5px;
    padding: 12px 10px;
    margin-bottom: 15px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const FieldText = styled.Text<{ empty: boolean }>`
    color: ${p => (p.empty ? theme.colors.textSecondary : theme.colors.text)};
    font-size: 15px;
`;

const Sheet = styled.View`
    background-color: ${theme.colors.surface};
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    padding: 12px 16px 28px;
`;

const SheetBar = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
`;

const SheetAction = styled.Text<{ strong?: boolean }>`
    color: ${p => (p.strong ? theme.colors.primary : theme.colors.textSecondary)};
    font-size: 16px;
    font-weight: ${p => (p.strong ? '700' : '400')};
    padding: 10px 4px;
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
                <FontAwesome name="calendar" size={16} color={theme.colors.textSecondary} />
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
