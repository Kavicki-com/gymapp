import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Ícones de traço do redesign, copiados dos SVGs do Claude Design.
 *
 * Todos em viewBox 24, traço 2 e pontas arredondadas, para manterem o mesmo
 * peso visual lado a lado. A cor vem de `color` (equivale ao currentColor).
 */
export type IconName =
    | 'home' | 'users' | 'cash' | 'layers' | 'dots'
    | 'chevron-right' | 'back' | 'close' | 'plus' | 'search' | 'check'
    | 'id-card' | 'building' | 'card' | 'pencil' | 'shield' | 'logout'
    | 'clock' | 'gift' | 'lock' | 'external';

const tracos: Record<IconName, React.ReactNode> = {
    home: <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    users: (
        <>
            <Circle cx="9" cy="8" r="3.5" />
            <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
            <Path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
        </>
    ),
    cash: (
        <>
            <Rect x="3" y="6" width="18" height="12" rx="2" />
            <Circle cx="12" cy="12" r="2.5" />
        </>
    ),
    layers: (
        <>
            <Path d="M12 3 2 8l10 5 10-5z" />
            <Path d="m2 13 10 5 10-5" />
        </>
    ),
    dots: null, // preenchido, ver abaixo
    'chevron-right': <Path d="m9 6 6 6-6 6" />,
    back: <Path d="M15 6l-6 6 6 6" />,
    close: <Path d="M6 6l12 12M18 6 6 18" />,
    plus: <Path d="M12 5v14M5 12h14" />,
    search: (
        <>
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-3.5-3.5" />
        </>
    ),
    check: <Path d="m5 12 5 5 9-10" />,
    'id-card': (
        <>
            <Rect x="3" y="5" width="18" height="14" rx="2" />
            <Circle cx="9" cy="11" r="2.5" />
            <Path d="M5.5 17c.6-1.8 1.9-2.7 3.5-2.7s2.9.9 3.5 2.7M15 10h3M15 14h3" />
        </>
    ),
    building: (
        <>
            <Path d="M4 21V9l8-6 8 6v12" />
            <Path d="M9 21v-6h6v6" />
        </>
    ),
    card: (
        <>
            <Rect x="3" y="6" width="18" height="13" rx="2" />
            <Path d="M3 10h18" />
        </>
    ),
    pencil: (
        <>
            <Path d="M4 20h4L19 9l-4-4L4 16z" />
            <Path d="m13.5 6.5 4 4" />
        </>
    ),
    shield: <Path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />,
    logout: <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
    clock: (
        <>
            <Circle cx="12" cy="12" r="9" />
            <Path d="M12 7v5l3 2" />
        </>
    ),
    gift: <Path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M12 12V8M12 5v.01" />,
    lock: (
        <>
            <Rect x="5" y="11" width="14" height="10" rx="2" />
            <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
    ),
    external: <Path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
};

export function Icon({ name, size = 22, color, strokeWidth = 2 }: {
    name: IconName;
    size?: number;
    color: string;
    strokeWidth?: number;
}) {
    if (name === 'dots') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
                <Circle cx="5" cy="12" r="1.8" />
                <Circle cx="12" cy="12" r="1.8" />
                <Circle cx="19" cy="12" r="1.8" />
            </Svg>
        );
    }
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
