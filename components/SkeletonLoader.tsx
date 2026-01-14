
import { theme } from '@/src/styles/theme';
import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import styled from 'styled-components/native';

interface SkeletonLoaderProps {
    variant?: 'list-item' | 'card' | 'form' | 'rect' | 'text' | 'profile';
    width?: number | string;
    height?: number | string;
    style?: ViewStyle;
    lines?: number;
}

const BaseSkeleton = styled(Animated.View)`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.sm}px;
  overflow: hidden;
`;

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'rect',
    width,
    height,
    style,
    lines = 1,
}) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (variant === 'list-item') {
        return (
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
                {/* Icon/Avatar Placeholder */}
                <BaseSkeleton style={[{ width: 40, height: 40, borderRadius: 20 }, animatedStyle]} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    {/* Title Placeholder */}
                    <BaseSkeleton style={[{ width: '60%', height: 16, marginBottom: 8 }, animatedStyle]} />
                    {/* Subtitle Placeholder */}
                    <BaseSkeleton style={[{ width: '40%', height: 12 }, animatedStyle]} />
                </View>
            </View>
        );
    }

    if (variant === 'card') {
        return (
            <View style={{ width: width || '48%', marginBottom: 16, padding: 16, backgroundColor: theme.colors.surface, borderRadius: 12, ...style as any }}>
                <BaseSkeleton style={[{ width: 32, height: 32, marginBottom: 8, borderRadius: 16 }, animatedStyle]} />
                <BaseSkeleton style={[{ width: '50%', height: 24, marginBottom: 4 }, animatedStyle]} />
                <BaseSkeleton style={[{ width: '80%', height: 12 }, animatedStyle]} />
            </View>
        );
    }

    if (variant === 'form') {
        return (
            <View style={{ width: '100%', padding: 16 }}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <BaseSkeleton style={[{ width: 40, height: 4 }, animatedStyle]} />
                </View>
                <View style={{ marginBottom: 24 }}>
                    <BaseSkeleton style={[{ width: '40%', height: 24, marginBottom: 10 }, animatedStyle]} />
                </View>

                {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={{ marginBottom: 16 }}>
                        <BaseSkeleton style={[{ width: '30%', height: 14, marginBottom: 8 }, animatedStyle]} />
                        <BaseSkeleton style={[{ width: '100%', height: 48, borderRadius: 8 }, animatedStyle]} />
                    </View>
                ))}
            </View>
        );
    }

    if (variant === 'profile') {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <BaseSkeleton style={[{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }, animatedStyle]} />
                    <BaseSkeleton style={[{ width: '30%', height: 14 }, animatedStyle]} />
                </View>

                {Array.from({ length: 8 }).map((_, i) => (
                    <View key={i} style={{ marginBottom: 16 }}>
                        <BaseSkeleton style={[{ width: '100%', height: 50, borderRadius: 8 }, animatedStyle]} />
                    </View>
                ))}
            </View>
        )
    }

    // Default 'rect' or 'text'
    return (
        <BaseSkeleton
            style={[
                {
                    width: width || '100%',
                    height: height || 20,
                    marginVertical: variant === 'text' ? 4 : 0,
                },
                animatedStyle,
                style,
            ]}
        />
    );
};
