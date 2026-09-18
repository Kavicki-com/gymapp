/**
 * Gera o "Pix copia e cola" (BR Code) offline.
 *
 * O BR Code é o padrão EMV adotado pelo Banco Central: uma string de campos
 * `ID + tamanho + valor` terminada por um CRC16. Não precisa de PSP, de conta
 * de intermediário nem de webhook — o dinheiro vai direto para a chave da
 * academia. O custo disso é que ele é ESTÁTICO: não existe notificação de
 * pagamento, então a baixa continua manual.
 *
 * Serve para a mensagem de cobrança já sair com o valor exato embutido, em vez
 * de "me manda no pix" seguido de o aluno perguntar a chave e digitar errado.
 */

/** Campo EMV: id + tamanho em 2 dígitos + valor. */
const campo = (id: string, valor: string) =>
    `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/**
 * CRC-16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão e sem
 * xor final. É o que a especificação do BR Code exige.
 */
export function crc16(input: string): string {
    let crc = 0xffff;
    for (let i = 0; i < input.length; i++) {
        crc ^= input.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Acentos e minúsculas em nome e cidade fazem alguns bancos recusarem a
 * leitura. Normaliza para ASCII maiúsculo e corta no limite do campo.
 */
const normalizar = (texto: string, max: number) =>
    texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9 ]/g, '')
        .trim()
        .toUpperCase()
        .slice(0, max);

export type PixBrCodeParams = {
    chave: string;
    /** Nome do recebedor. Máx. 25 caracteres depois de normalizado. */
    nome: string;
    /** Cidade do recebedor. Máx. 15. */
    cidade?: string;
    /** Em reais. Omitido, o aluno digita o valor. */
    valor?: number;
    /** Identificador livre, máx. 25 alfanuméricos. '***' quando não há. */
    txid?: string;
};

export function gerarPixBrCode({
    chave,
    nome,
    cidade = 'BRASIL',
    valor,
    txid,
}: PixBrCodeParams): string {
    const chaveLimpa = chave.trim();

    const contaPix =
        campo('00', 'br.gov.bcb.pix') +
        campo('01', chaveLimpa);

    const idLivre = txid
        ? normalizar(txid, 25).replace(/ /g, '') || '***'
        : '***';

    const payloadSemCrc =
        campo('00', '01') +                                  // formato
        campo('26', contaPix) +                              // conta Pix
        campo('52', '0000') +                                // categoria
        campo('53', '986') +                                 // BRL
        (valor && valor > 0 ? campo('54', valor.toFixed(2)) : '') +
        campo('58', 'BR') +                                  // país
        campo('59', normalizar(nome, 25) || 'RECEBEDOR') +
        campo('60', normalizar(cidade, 15) || 'BRASIL') +
        campo('62', campo('05', idLivre)) +
        '6304';                                              // id+len do CRC

    return payloadSemCrc + crc16(payloadSemCrc);
}
