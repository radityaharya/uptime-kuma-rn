import * as React from 'react';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming} from 'react-native-reanimated';

import { View } from '@/components/ui';

const SkeletonBox = ({ style }: { style: any }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: 800,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: '#374151'
  }));

  return <Animated.View style={[style, animatedStyle]} />;
};

export function MonitorCardSkeleton() {
  return (
    <View className="w-full overflow-hidden rounded-lg">
      <View className="flex flex-col overflow-hidden rounded-lg border border-black/20 bg-card bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-4 opacity-50 transition-all duration-200 dark:border-white/20">
        {/* Header */}
        <View className="mb-2 flex-row justify-between">
          <View className="flex-row items-center gap-2">
            <SkeletonBox
              style={{ height: 24, width: 48, borderRadius: 9999 }}
            />
            <SkeletonBox
              style={{ height: 24, width: 128, borderRadius: 9999 }}
            />
          </View>
        </View>

        {/* Content */}
        <View className="mb-4 flex flex-col">
          <SkeletonBox
            style={{
              height: 16,
              width: '75%',
              borderRadius: 9999,
              marginBottom: 8
            }}
          />
          <SkeletonBox
            style={{
              height: 16,
              width: '50%',
              borderRadius: 9999
            }}
          />
          <View className="mt-4 flex-row justify-between">
            {[...Array(30)].map((_, index) => (
              <View key={index} className="items-center justify-end">
                <SkeletonBox
                  style={{
                    height: 20,
                    width: 8,
                    borderRadius: 9999
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row flex-wrap gap-2">
          <SkeletonBox
            style={{
              height: 16,
              width: 64,
              borderRadius: 9999
            }}
          />
          <SkeletonBox
            style={{
              height: 16,
              width: 64,
              borderRadius: 9999
            }}
          />
        </View>
      </View>
    </View>
  );
}
