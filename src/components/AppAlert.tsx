import { theme } from '@/src/styles/theme';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Diálogo do app no lugar do Alert do sistema.
 *
 * `appAlert` tem a mesma assinatura de `Alert.alert` (título, mensagem,
 * botões com text/onPress/style), para a troca nos fluxos não mexer em
 * lógica nenhuma: onde estava `Alert.alert(` passa a ser `appAlert(`.
 *
 * O <AppAlertHost /> fica montado uma vez, no _layout raiz.
 */

export type AppAlertButton = {
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

type Pedido = { titulo: string; mensagem?: string; botoes: AppAlertButton[] };

let mostrar: ((p: Pedido) => void) | null = null;
const fila: Pedido[] = [];

/**
 * Até quando uma folha inferior ainda está fechando. No iOS, abrir um modal
 * enquanto outro está sendo dispensado faz o novo ser descartado em silêncio
 * — e o caso comum é exatamente esse: fecha a folha de pagamento e mostra
 * "Pagamento registrado". O BottomSheet avisa aqui e o diálogo espera.
 */
let folhaFechandoAte = 0;
export const avisarFolhaFechando = (ms: number) => {
    folhaFechandoAte = Math.max(folhaFechandoAte, Date.now() + ms);
};

export function appAlert(titulo: string, mensagem?: string, botoes?: AppAlertButton[]) {
    const pedido = { titulo, mensagem, botoes: botoes?.length ? botoes : [{ text: 'OK' }] };
    const espera = Math.max(0, folhaFechandoAte - Date.now());
    const entregar = () => (mostrar ? mostrar(pedido) : fila.push(pedido));
    espera > 0 ? setTimeout(entregar, espera + 60) : entregar();
}

const Caixa = styled.View`
    width: 100%;
    max-width: 360px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.border};
    border-radius: 24px;
    padding: 22px 20px 20px;
    gap: 10px;
`;

const Titulo = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 20px;
    color: ${theme.colors.text};
`;

const Mensagem = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    line-height: 22px;
    color: ${theme.colors.textSecondary};
`;

type Tipo = 'primario' | 'contorno' | 'perigo';

const Botao = styled(TouchableOpacity)<{ tipo: Tipo }>`
    min-height: 48px;
    flex-grow: 1;
    flex-basis: 0;
    border-radius: ${theme.borderRadius.md}px;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    background-color: ${({ tipo }) =>
        tipo === 'primario' ? theme.colors.primary : tipo === 'perigo' ? theme.colors.danger : 'transparent'};
    border-width: ${({ tipo }) => (tipo === 'contorno' ? 1 : 0)}px;
    border-color: ${theme.colors.border};
`;

const BotaoTexto = styled.Text<{ tipo: Tipo }>`
    font-family: ${({ tipo }) => (tipo === 'contorno' ? theme.fonts.semibold : theme.fonts.bold)};
    font-size: 15px;
    text-align: center;
    color: ${({ tipo }) => (tipo === 'contorno' ? theme.colors.text : theme.colors.onPrimary)};
`;

const tipoDe = (b: AppAlertButton, unico: boolean): Tipo =>
    b.style === 'destructive' ? 'perigo' : b.style === 'cancel' && !unico ? 'contorno' : 'primario';

export function AppAlertHost() {
    const [atual, setAtual] = useState<Pedido | null>(null);

    useEffect(() => {
        mostrar = p => setAtual(a => {
            if (a) { fila.push(p); return a; }
            return p;
        });
        if (fila.length) setAtual(fila.shift()!);
        return () => { mostrar = null; };
    }, []);

    const fechar = (b?: AppAlertButton) => {
        // O onPress roda com este diálogo ainda na tela: se ele pedir outro
        // diálogo (o comum: "Excluir?" → "Excluído"), o pedido entra na fila
        // e só troca o conteúdo — sem fechar e reabrir o Modal, que no iOS
        // descartaria o segundo.
        try {
            b?.onPress?.();
        } finally {
            const proximo = fila.shift() ?? null;
            if (!proximo) avisarFolhaFechando(260);
            setAtual(proximo);
        }
    };

    if (!atual) return null;

    const unico = atual.botoes.length === 1;
    // "cancel" toca fora / botão voltar do Android, como no Alert nativo.
    const cancelar = atual.botoes.find(b => b.style === 'cancel');
    const empilhar = atual.botoes.length > 2;

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent
            onRequestClose={() => fechar(cancelar ?? (unico ? atual.botoes[0] : undefined))}>
            <View style={styles.fundo}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => (cancelar || unico) && fechar(cancelar ?? atual.botoes[0])}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                />
                <Caixa accessibilityViewIsModal accessibilityRole="alert">
                    <Titulo accessibilityRole="header">{atual.titulo}</Titulo>
                    {atual.mensagem ? <Mensagem>{atual.mensagem}</Mensagem> : null}
                    <View style={{ flexDirection: empilhar ? 'column' : 'row', gap: 10, marginTop: 8 }}>
                        {atual.botoes.map((b, i) => {
                            const tipo = tipoDe(b, unico);
                            return (
                                <Botao key={i} tipo={tipo} onPress={() => fechar(b)} accessibilityRole="button"
                                    style={empilhar ? { flexBasis: 'auto' } : undefined}>
                                    <BotaoTexto tipo={tipo}>{b.text ?? 'OK'}</BotaoTexto>
                                </Botao>
                            );
                        })}
                    </View>
                </Caixa>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
});
