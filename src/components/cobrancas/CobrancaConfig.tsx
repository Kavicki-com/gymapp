import { Icon } from '@/src/components/Icon';
import { Input, Section } from '@/src/components/styled';
import { theme } from '@/src/styles/theme';
import { MARCADORES } from '@/src/utils/mensagemCobranca';
import { TIPOS_CHAVE_PIX, TipoChavePix, mascararChave, teclado } from '@/src/utils/pixKey';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Apoio, BotaoPrincipal, BotaoPrincipalTexto, BotaoSecundario, BotaoSecundarioTexto, BotaoTexto,
    BotaoTextoRotulo, IconeWhatsApp, Miudo, TextoForte, Titulo,
} from './comum';

/**
 * "Mensagem e Pix" (Claude Design, CobrancaConfig). Sub-vista da aba
 * Cobranças, não rota: o estado dos campos mora na tela, e esta peça só
 * desenha. Componente de módulo — definido fora da tela, então os campos não
 * perdem o foco a cada tecla.
 */

const Conteudo = styled.View`
    padding: ${theme.spacing.lg}px ${theme.spacing.xl}px 32px;
    gap: ${theme.spacing.xl}px;
`;

const BotaoVoltar = styled(TouchableOpacity)`
    width: ${theme.touch}px;
    height: ${theme.touch}px;
    border-radius: 14px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    align-items: center;
    justify-content: center;
`;

const Rotulo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const Marcador = styled(TouchableOpacity)`
    min-height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.elevated};
    flex-direction: row;
    align-items: center;
    gap: 6px;
`;

const MarcadorChave = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 13px;
    color: ${theme.colors.primary};
`;

const Chip = styled(TouchableOpacity)<{ ativo: boolean }>`
    min-height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    justify-content: center;
    border-width: 1px;
    border-color: ${({ ativo }) => (ativo ? theme.colors.text : theme.colors.border)};
    background-color: ${({ ativo }) => (ativo ? theme.colors.text : 'transparent')};
`;

const ChipTexto = styled.Text<{ ativo: boolean }>`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${({ ativo }) => (ativo ? theme.colors.onPrimary : theme.colors.textStrong)};
`;

const Aviso = styled.View`
    padding: 12px 14px;
    border-radius: 12px;
    background-color: ${theme.colors.dangerSoft};
`;

const AvisoTexto = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${theme.colors.dangerText};
`;

/* Campo sobre o fundo da tela, e não da superfície: dentro do bloco o campo
   precisa contrastar com ele. */
const campo = { backgroundColor: theme.colors.background };

const placeholderDe = (tipo: TipoChavePix) =>
    tipo === 'cpf' ? '000.000.000-00'
        : tipo === 'cnpj' ? '00.000.000/0000-00'
            : tipo === 'celular' ? '(00)00000-0000'
                : tipo === 'email' ? 'voce@academia.com.br'
                    : 'chave aleatória do banco';

export function CobrancaConfig({
    mensagem, onMensagem, onPadrao,
    pixTipo, onPixTipo, pixChave, onPixChave, pixCidade, onPixCidade,
    erro, salvando, onSalvar, onCancelar,
}: {
    mensagem: string;
    onMensagem: (t: string) => void;
    onPadrao: () => void;
    pixTipo: TipoChavePix;
    onPixTipo: (t: TipoChavePix) => void;
    pixChave: string;
    onPixChave: (t: string) => void;
    pixCidade: string;
    onPixCidade: (t: string) => void;
    erro: [string, string] | null;
    salvando: boolean;
    onSalvar: () => void;
    onCancelar: () => void;
}) {
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
        >
            <Conteudo>
                <View style={{ gap: 12 }}>
                    <BotaoVoltar onPress={onCancelar} accessibilityRole="button" accessibilityLabel="Voltar para Cobranças">
                        <Icon name="back" size={20} color={theme.colors.textStrong} />
                    </BotaoVoltar>
                    <View style={{ gap: 4 }}>
                        <Titulo>Mensagem e Pix</Titulo>
                        <Apoio style={{ fontSize: 14, lineHeight: 21 }}>
                            O que vai no <IconeWhatsApp size={14} /> WhatsApp de cada aluno em atraso.
                        </Apoio>
                    </View>
                </View>

                {/* Mensagem de cobrança, editável: cobrança é assunto delicado e
                    cada dono fala de um jeito. O Pix é anexado fora do modelo. */}
                <Section style={{ gap: 12 }} accessibilityLabel="Mensagem de cobrança">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextoForte>Mensagem</TextoForte>
                        <BotaoTexto onPress={onPadrao} style={{ paddingHorizontal: 2 }}
                            accessibilityRole="button" accessibilityLabel="Voltar ao texto padrão">
                            <BotaoTextoRotulo cor={theme.colors.primary}>Voltar ao texto padrão</BotaoTextoRotulo>
                        </BotaoTexto>
                    </View>
                    <Input
                        value={mensagem}
                        onChangeText={onMensagem}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        accessibilityLabel="Mensagem"
                        style={[campo, { minHeight: 128, fontSize: 15, lineHeight: 22 }]}
                    />
                    <View style={{ gap: 8 }}>
                        <Miudo>Toque para inserir no texto</Miudo>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {MARCADORES.map(m => (
                                <Marcador
                                    key={m.chave}
                                    onPress={() => onMensagem(`${mensagem}${mensagem && !/\s$/.test(mensagem) ? ' ' : ''}${m.chave}`)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Inserir ${m.descricao}`}
                                    hitSlop={{ top: 4, bottom: 4 }}
                                >
                                    <MarcadorChave>{m.chave}</MarcadorChave>
                                    <Miudo style={{ fontSize: 13 }}>{m.descricao}</Miudo>
                                </Marcador>
                            ))}
                        </View>
                    </View>
                    <Apoio>
                        O link do Pix é anexado no fim, com o valor já preenchido. Não precisa
                        colocar nada aqui.
                    </Apoio>
                </Section>

                {/* A chave Pix mora em Cobranças, e não no perfil: é aqui que ela
                    é usada, e é aqui que o dono descobre que a cobrança pode sair
                    com o valor já preenchido. */}
                <Section style={{ gap: 14 }} accessibilityLabel="Chave Pix">
                    <TextoForte>Chave Pix da academia</TextoForte>
                    <Apoio>
                        Com a chave cadastrada, cada cobrança sai com um Pix copia e cola e o valor já
                        preenchido. O aluno só cola no banco. O dinheiro vai direto para você; o app não
                        recebe nada no meio.
                    </Apoio>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup">
                        {TIPOS_CHAVE_PIX.map(t => (
                            <Chip
                                key={t.valor}
                                ativo={pixTipo === t.valor}
                                onPress={() => onPixTipo(t.valor)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: pixTipo === t.valor }}
                                accessibilityLabel={`Tipo de chave: ${t.rotulo}`}
                                hitSlop={{ top: 4, bottom: 4 }}
                            >
                                <ChipTexto ativo={pixTipo === t.valor}>{t.rotulo}</ChipTexto>
                            </Chip>
                        ))}
                    </View>
                    <View style={{ gap: 6 }}>
                        <Rotulo>Chave</Rotulo>
                        <Input
                            placeholder={placeholderDe(pixTipo)}
                            value={pixChave}
                            onChangeText={t => onPixChave(mascararChave(pixTipo, t))}
                            keyboardType={teclado(pixTipo)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            accessibilityLabel="Chave Pix"
                            style={[campo, { minHeight: 48 }]}
                        />
                    </View>
                    <View style={{ gap: 6 }}>
                        <Rotulo>
                            Cidade da conta <Text style={{ fontFamily: theme.fonts.regular }}>(opcional)</Text>
                        </Rotulo>
                        <Input
                            placeholder="Cidade da conta"
                            value={pixCidade}
                            onChangeText={onPixCidade}
                            accessibilityLabel="Cidade da conta, opcional"
                            style={[campo, { minHeight: 48 }]}
                        />
                    </View>
                </Section>

                {erro && (
                    <Aviso accessibilityRole="alert">
                        <AvisoTexto>
                            <Text style={{ fontFamily: theme.fonts.semibold }}>{erro[0]}</Text> {erro[1]}
                        </AvisoTexto>
                    </Aviso>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <BotaoSecundario style={{ flex: 1, minHeight: 56, borderRadius: 16, backgroundColor: 'transparent' }}
                        onPress={onCancelar} accessibilityRole="button" accessibilityLabel="Cancelar">
                        <BotaoSecundarioTexto style={{ fontSize: 16 }}>Cancelar</BotaoSecundarioTexto>
                    </BotaoSecundario>
                    <BotaoPrincipal alto style={{ flex: 1, opacity: salvando ? 0.6 : 1 }} onPress={onSalvar}
                        disabled={salvando} accessibilityRole="button" accessibilityLabel="Salvar mensagem e chave Pix">
                        {salvando
                            ? <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                            : <BotaoPrincipalTexto style={{ fontSize: 16 }}>Salvar</BotaoPrincipalTexto>}
                    </BotaoPrincipal>
                </View>
            </Conteudo>
        </ScrollView>
    );
}
