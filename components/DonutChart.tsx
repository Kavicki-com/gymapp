import { theme } from '@/src/styles/theme';
import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import styled from 'styled-components/native';

/* Rosca "Alunos por plano" do redesign: anel à esquerda com o total no
   centro, legenda à direita. */

const Container = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 18px;
`;

const ChartContainer = styled.View`
  position: relative;
  align-items: center;
  justify-content: center;
`;

const CenterText = styled.View`
  position: absolute;
  align-items: center;
  justify-content: center;
`;

const TotalValue = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 22px;
  color: ${theme.colors.text};
`;

const TotalLabel = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`;

const Legend = styled.View`
  flex: 1;
  gap: 10px;
`;

const LegendItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const LegendDot = styled.View<{ bgColor: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background-color: ${({ bgColor }) => bgColor};
`;

const LegendText = styled.Text`
  flex: 1;
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  color: ${theme.colors.text};
`;

const LegendValue = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${theme.colors.text};
`;

interface DonutChartData {
    name: string;
    count: number;
    color: string;
}

interface DonutChartProps {
    data: DonutChartData[];
    size?: number;
}

/* As quatro primeiras são as do design; as demais seguem a paleta de planos
   da lista de alunos, para plano nenhum repetir cor até o oitavo. */
const CHART_COLORS = [
    '#EAB308',
    '#60A5FA',
    '#34D399',
    '#F97316',
    '#C4B5FD',
    '#F9A8D4',
    '#5EEAD4',
    '#F87171',
];

export function DonutChart({ data, size = 120 }: DonutChartProps) {
    if (!data || data.length === 0) {
        return null;
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const strokeWidth = 17;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let accumulated = 0;
    const segments = data.map((item, index) => {
        const percentage = total > 0 ? item.count / total : 0;
        const rotation = accumulated * 360 - 90; // começa no topo
        accumulated += percentage;
        return {
            ...item,
            color: item.color || CHART_COLORS[index % CHART_COLORS.length],
            rotation,
            percentage,
        };
    });

    const resumo = segments.map(s => `${s.name} ${s.count}`).join(', ');

    return (
        <Container>
            <ChartContainer accessible accessibilityRole="image" accessibilityLabel={`Alunos por plano: ${resumo}`}>
                <Svg width={size} height={size}>
                    <G>
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={theme.colors.border}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {segments.map(segment => (
                            <Circle
                                key={segment.name}
                                cx={center}
                                cy={center}
                                r={radius}
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                fill="transparent"
                                strokeDasharray={`${segment.percentage * circumference} ${circumference}`}
                                strokeLinecap="butt"
                                rotation={segment.rotation}
                                origin={`${center}, ${center}`}
                            />
                        ))}
                    </G>
                </Svg>
                <CenterText>
                    <TotalValue>{total}</TotalValue>
                    <TotalLabel>alunos</TotalLabel>
                </CenterText>
            </ChartContainer>

            <Legend>
                {segments.map(item => (
                    <LegendItem key={item.name}>
                        <LegendDot bgColor={item.color} />
                        <LegendText numberOfLines={1}>{item.name}</LegendText>
                        <LegendValue>{item.count}</LegendValue>
                    </LegendItem>
                ))}
            </Legend>
        </Container>
    );
}

export { CHART_COLORS };
