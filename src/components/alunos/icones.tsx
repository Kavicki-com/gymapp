import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Ícones das telas de Alunos que o Icon.tsx compartilhado não tem.
 *
 * Mesmo desenho dos SVGs do Claude Design: viewBox 24, traço 2, pontas
 * arredondadas — para ficarem com o mesmo peso dos ícones do Icon.tsx.
 */
export type IconeAluno = 'lixeira' | 'camera' | 'cadeado-aberto';

const tracos: Record<IconeAluno, React.ReactNode> = {
    lixeira: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    camera: (
        <>
            <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <Circle cx="12" cy="13" r="3" />
        </>
    ),
    'cadeado-aberto': (
        <>
            <Rect x="5" y="11" width="14" height="10" rx="2" />
            <Path d="M8 11V7a4 4 0 0 1 7.5-2" />
        </>
    ),
};

export function IconeAluno({ name, size = 22, color, strokeWidth = 2 }: {
    name: IconeAluno;
    size?: number;
    color: string;
    strokeWidth?: number;
}) {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {tracos[name]}
        </Svg>
    );
}

/** "Rafael Souza Pereira" → "RS". */
export const iniciaisDe = (nome?: string | null) =>
    (nome || '').trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';
