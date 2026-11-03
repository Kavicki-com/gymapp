"""Artes das lojas do GymApp, no formato que Pendurô, Churrapp, Cria e
Natalina usaram: capturas com título em cima e a tela dentro de um celular,
o recurso gráfico da Play, as artes de busca e cabeçalho da App Store e a
captura do paywall para a revisão da assinatura.

As telas vêm de store/fontes/<nome>.png: os boards do Claude Design
exportados em PNG (dados fictícios) ou prints do aparelho numa conta de
demonstração. Nome de aluno de academia real nunca vai para a loja.
Coloque as imagens e rode:

    python3 scripts/artes-loja.py

Captura sem print correspondente é pulada (e listada no fim).
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = os.path.join(os.path.dirname(__file__), '..')
FONTES = os.path.join(RAIZ, 'node_modules', '@expo-google-fonts')
STORE = os.path.join(RAIZ, 'store')

# Tokens do redesign (src/styles/theme.ts).
FUNDO = (14, 15, 17)
SUPERFICIE = (23, 25, 28)
TEXTO = (244, 244, 242)
APOIO = (161, 166, 173)
MARCA = (234, 179, 8)

# nome -> (título, destaque, subtítulo)
CAPTURAS = [
    ('1-inicio', 'Sua academia', 'em dia', 'Recebido, em atraso e margem do mês numa tela só.'),
    ('2-cobrar', 'Cobre no WhatsApp', 'com o Pix junto', 'Um aluno por vez, com a mensagem pronta e o valor preenchido.'),
    ('3-devendo', 'Quem está devendo', 'de verdade', 'Cadastro antigo e aluno que já saiu ficam fora da conta.'),
    ('4-ficha', 'Cada aluno', 'na palma da mão', 'Plano, vencimento e pagamentos, com baixa em um toque.'),
    ('5-resultado', 'Veja o que', 'voltou pro caixa', 'Quantos pagaram depois de cobrados e quanto isso rendeu.'),
]


def fonte(familia, peso, tamanho):
    nome = f'{familia.capitalize()}_{peso}.ttf'
    return ImageFont.truetype(os.path.join(FONTES, familia, peso, nome), tamanho)


def tela(nome):
    """Print do aparelho ou board exportado do Claude Design. Boards mais altos
    que um celular (o Início tem 1720 px) são cortados do topo na proporção
    do iPhone (390×844), que é o que cabe na moldura."""
    caminho = os.path.join(STORE, 'fontes', f'{nome}.png')
    if not os.path.exists(caminho):
        return None
    img = Image.open(caminho).convert('RGB')
    altura = int(img.width * 844 / 390)
    return img.crop((0, 0, img.width, altura)) if img.height > altura * 1.02 else img


def brilho(img, centro, raio, cor, forca):
    """Um halo amarelo discreto atrás do celular, para o fundo não ficar chapado."""
    camada = Image.new('RGBA', img.size, (0, 0, 0, 0))
    cx, cy = centro
    ImageDraw.Draw(camada).ellipse([cx - raio, cy - raio, cx + raio, cy + raio], fill=(*cor, forca))
    camada = camada.filter(ImageFilter.GaussianBlur(raio // 2))
    return Image.alpha_composite(img.convert('RGBA'), camada)


def celular(img, largura):
    """A tela dentro de um celular escuro, cantos arredondados e ilha dinâmica."""
    w = largura
    h = int(img.height * w / img.width)
    borda = int(w * 0.035)
    raio = int(w * 0.12)
    corpo = Image.new('RGBA', (w + 2 * borda, h + 2 * borda), (0, 0, 0, 0))
    dc = ImageDraw.Draw(corpo)
    dc.rounded_rectangle([0, 0, corpo.width - 1, corpo.height - 1], radius=raio + borda, fill=(32, 35, 39, 255))
    dc.rounded_rectangle([2, 2, corpo.width - 3, corpo.height - 3], radius=raio + borda - 2, fill=(8, 9, 10, 255))
    tela_img = img.resize((w, h), Image.LANCZOS).convert('RGBA')
    mascara = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, w - 1, h - 1], radius=raio, fill=255)
    corpo.paste(tela_img, (borda, borda), mascara)
    ilha_w, ilha_h = int(w * 0.3), int(w * 0.085)
    dc.rounded_rectangle(
        [(corpo.width - ilha_w) // 2, borda + int(w * 0.03), (corpo.width + ilha_w) // 2, borda + int(w * 0.03) + ilha_h],
        radius=ilha_h // 2,
        fill=(0, 0, 0, 255),
    )
    return corpo


def quebrar(d, texto, fonte_, largura):
    linhas, atual = [], ''
    for p in texto.split():
        teste = (atual + ' ' + p).strip()
        if d.textlength(teste, font=fonte_) > largura and atual:
            linhas.append(atual)
            atual = p
        else:
            atual = teste
    return linhas + [atual]


def captura(nome, l1, l2, sub, tamanho, prefixo):
    src = tela(nome)
    if src is None:
        return False
    W, H = tamanho
    img = Image.new('RGB', (W, H), FUNDO)
    d = ImageDraw.Draw(img)
    f1 = fonte('archivo', '800ExtraBold', int(W * 0.085))
    fs = fonte('inter', '500Medium', int(W * 0.036))
    y = int(H * 0.07)
    for linha, cor in ((l1, TEXTO), (l2, MARCA)):
        tw = d.textlength(linha, font=f1)
        d.text(((W - tw) / 2, y), linha, font=f1, fill=cor)
        y += int(W * 0.098)
    y += int(W * 0.02)
    for linha in quebrar(d, sub, fs, W * 0.8):
        tw = d.textlength(linha, font=fs)
        d.text(((W - tw) / 2, y), linha, font=fs, fill=APOIO)
        y += int(W * 0.05)
    fone = celular(src, int(W * 0.74))
    topo = y + int(W * 0.06)
    img = brilho(img, (W // 2, topo + fone.height // 3), int(W * 0.42), MARCA, 38)
    sombra = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle(
        [(W - fone.width) // 2 + 10, topo + 30, (W + fone.width) // 2 + 10, topo + fone.height + 30],
        radius=int(W * 0.1), fill=(0, 0, 0, 150),
    )
    img = Image.alpha_composite(img, sombra.filter(ImageFilter.GaussianBlur(int(W * 0.03))))
    img.alpha_composite(fone, ((W - fone.width) // 2, topo))
    caminho = os.path.join(STORE, f'{prefixo}-{nome}.png')
    img.convert('RGB').save(caminho, optimize=True)
    print(caminho, (W, H))
    return True


def banner(tamanho, caminho, titulo_esc=0.075):
    telas = [t for t in (tela('2-cobrar'), tela('1-inicio')) if t is not None]
    if not telas:
        return False
    W, H = tamanho
    img = Image.new('RGB', (W, H), FUNDO)
    img = brilho(img, (int(W * 0.78), H // 2), int(H * 0.55), MARCA, 34).convert('RGB')
    d = ImageDraw.Draw(img)
    icone = Image.open(os.path.join(RAIZ, 'assets', 'images', 'icon.png')).convert('RGBA')
    lado = int(H * 0.14)
    mascara = Image.new('L', (lado, lado), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, lado - 1, lado - 1], radius=lado // 4, fill=255)
    x0, y0 = int(W * 0.06), int(H * 0.24)
    img.paste(icone.resize((lado, lado), Image.LANCZOS), (x0, y0), mascara)
    fm = fonte('archivo', '800ExtraBold', int(lado * 0.6))
    d.text((x0 + lado + int(H * 0.03), y0 + lado * 0.14), 'GymApp', font=fm, fill=TEXTO)
    linhas = (('Gestão da academia', TEXTO), ('e cobrança no', TEXTO), ('WhatsApp com Pix', MARCA))
    tam = int(H * titulo_esc * 1.6)
    ft = fonte('archivo', '800ExtraBold', tam)
    while max(d.textlength(t, font=ft) for t, _ in linhas) > W * 0.4 and tam > 10:
        tam -= 2
        ft = fonte('archivo', '800ExtraBold', tam)
    y = y0 + lado + int(H * 0.05)
    for linha, cor in linhas:
        d.text((x0, y), linha, font=ft, fill=cor)
        y += int(tam * 1.15)
    # Dois celulares inclinados, ocupando os 46% da direita.
    alt = int(min(H * 0.86, W * 0.46 / 1.95 / 0.462))
    x = W - int(W * 0.03)
    for i, src in enumerate(telas[:2]):
        largura = int(alt * src.width / src.height)
        fone = celular(src, largura).rotate(-6 + i * 12, expand=True, resample=Image.BICUBIC)
        x -= fone.width - (int(fone.width * 0.25) if i else 0)
        img.paste(fone, (x, int(H * 0.14) + i * int(H * 0.04)), fone)
    img.save(caminho, optimize=True)
    print(caminho, (W, H))
    return True


def icone_play():
    icone = Image.open(os.path.join(RAIZ, 'assets', 'images', 'icon.png')).convert('RGBA')
    caminho = os.path.join(STORE, 'play-icone-512.png')
    fundo = Image.new('RGBA', icone.size, (*FUNDO, 255))
    Image.alpha_composite(fundo, icone).resize((512, 512), Image.LANCZOS).convert('RGB').save(caminho, optimize=True)
    print(caminho, (512, 512))


def paywall_revisao():
    """Só com print do aparelho; sem ele, fica a provisória gerada do design."""
    caminho_src = os.path.join(STORE, 'fontes', 'paywall.png')
    if not os.path.exists(caminho_src):
        return False
    # Sem corte: a revisão precisa ver o "Assinar", o "Restaurar" e o texto
    # de renovação. Board mais alto que a tela é encaixado pela altura.
    src = Image.open(caminho_src).convert('RGB')
    escala = min(1179 / src.width, 2556 / src.height)
    out = src.resize((int(src.width * escala), int(src.height * escala)), Image.LANCZOS)
    fundo = Image.new('RGB', (1179, 2556), FUNDO)
    fundo.paste(out, ((1179 - out.width) // 2, (2556 - out.height) // 2))
    caminho = os.path.join(STORE, 'appstore-revisao-paywall-1179x2556.png')
    fundo.save(caminho, optimize=True)
    print(caminho, 'do aparelho')
    return True


if __name__ == '__main__':
    faltando = []
    for nome, l1, l2, sub in CAPTURAS:
        if not captura(nome, l1, l2, sub, (1179, 2556), 'appstore-iphone'):
            faltando.append(nome)
            continue
        captura(nome, l1, l2, sub, (1080, 2340), 'play-captura')
    icone_play()
    if not paywall_revisao():
        faltando.append('paywall')
    feitos = [
        banner((1024, 500), os.path.join(STORE, 'play-recurso-grafico-1024x500.png')),
        banner((1920, 1280), os.path.join(STORE, 'appstore-busca-1920x1280.png'), titulo_esc=0.06),
        banner((3840, 1646), os.path.join(STORE, 'appstore-cabecalho-3840x1646.png')),
    ]
    if not all(feitos):
        faltando.append('banners (precisam de 1-inicio e 2-cobrar)')
    if faltando:
        print('\nSem print em store/fontes/:', ', '.join(faltando))
