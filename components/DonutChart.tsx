import { theme } from '@/src/styles/theme';
import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import styled from 'styled-components/native';

const Container = styled.View`
  align-items: center;
  margin-vertical: ${theme.spacing.md}px;
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
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.xxl}px;
  font-weight: bold;
`;

const TotalLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
`;

const LegendContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: ${theme.spacing.md}px;
`;

const LegendItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin-right: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const LegendDot = styled.View<{ bgColor: string }>`
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background-color: ${(props: { bgColor: string }) => props.bgColor};
  margin-right: ${theme.spacing.xs}px;
`;

const LegendText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
`;

const LegendValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.sm}px;
  font-weight: bold;
  margin-left: 4px;
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

const CHART_COLORS = [
    '#06B6D4', // cyan
    '#8B5CF6', // violet
    '#F97316', // orange
    '#10B981', // emerald
    '#EC4899', // pink
    '#EAB308', // yellow
    '#6366F1', // indigo
    '#EF4444', // red
];

export function DonutChart({ data, size = 160 }: DonutChartProps) {
    if (!data || data.length === 0) {
        return null;
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);

    // SVG Donut Chart calculations
    const strokeWidth = 25;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calculate segments
    let accumulatedPercentage = 0;
    const segments = data.map((item, index) => {
        const percentage = total > 0 ? item.count / total : 0;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference * (1 - percentage);
        const rotation = accumulatedPercentage * 360 - 90; // Start from top
        accumulatedPercentage += percentage;

        return {
            ...item,
            color: item.color || CHART_COLORS[index % CHART_COLORS.length],
            strokeDasharray,
            strokeDashoffset,
            rotation,
            percentage,
        };
    });

    return (
        <Container>
            <ChartContainer>
                <Svg width={size} height={size}>
                    <G>
                        {/* Background circle */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={theme.colors.border}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {/* Data segments */}
                        {segments.map((segment, index) => (
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
                    <TotalLabel>Total</TotalLabel>
                </CenterText>
            </ChartContainer>

            <LegendContainer>
                {data.map((item, index) => {
                    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
                    const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                        <LegendItem key={item.name}>
                            <LegendDot bgColor={color} />
                            <LegendText>{item.name}:</LegendText>
                            <LegendValue>{item.count} ({percentage}%)</LegendValue>
                        </LegendItem>
                    );
                })}
            </LegendContainer>
        </Container>
    );
}

export { CHART_COLORS };

