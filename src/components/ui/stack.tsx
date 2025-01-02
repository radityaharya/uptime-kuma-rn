import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const SCROLL_LIMIT = 5; // Maximum translation distance
const RESISTANCE = 0.15; // Resistance factor for over-scrolling
const STACK_CONFIG = {
  CARD_SPACING: -8, // Controls vertical spacing between cards (negative for upward stacking)
  SCALE_FACTOR: 0.05, // Controls how much each card scales down (0.05 = 5% smaller per card)
  MIN_SCALE: 0.8, // Minimum scale for the last card
  OPACITY_STEP: 0.1, // How much opacity decreases per card
  MAX_VISIBLE_CARDS: 3 // Maximum number of cards to show in stack
};

interface CardProps {
  index: number;
  totalCards: number;
  activeIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  children: React.ReactNode;
}

function AnimatedCard({
  index,
  totalCards,
  activeIndex,
  translateY,
  children
}: CardProps) {
  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    const position = (index - activeIndex.value + totalCards) % totalCards;
    const isCurrent = position === 0;

    const visualPosition = Math.min(
      position,
      STACK_CONFIG.MAX_VISIBLE_CARDS - 1
    );

    const baseOffset = visualPosition * STACK_CONFIG.CARD_SPACING;
    const scale = Math.max(
      1 - visualPosition * STACK_CONFIG.SCALE_FACTOR,
      STACK_CONFIG.MIN_SCALE
    );
    const opacity =
      position < STACK_CONFIG.MAX_VISIBLE_CARDS
        ? Math.max(1 - visualPosition * STACK_CONFIG.OPACITY_STEP, 0.5)
        : 0;

    let clampedTranslateY = translateY.value;
    if (Math.abs(clampedTranslateY) > SCROLL_LIMIT) {
      const overScroll =
        clampedTranslateY - SCROLL_LIMIT * Math.sign(clampedTranslateY);
      clampedTranslateY =
        SCROLL_LIMIT * Math.sign(clampedTranslateY) + overScroll * RESISTANCE;
    }

    const translateYValue = isCurrent
      ? baseOffset + clampedTranslateY
      : baseOffset;
    const zIndex =
      position < STACK_CONFIG.MAX_VISIBLE_CARDS ? totalCards - position : -1;

    return {
      transform: [{ translateY: translateYValue }, { scale }],
      opacity,
      zIndex,
      display: position < STACK_CONFIG.MAX_VISIBLE_CARDS ? 'flex' : 'none'
    };
  }, [index, totalCards]);

  return (
    <Animated.View className="absolute w-full" style={cardStyle}>
      {children}
    </Animated.View>
  );
}

export function Stacked({ cards }: { cards: React.ReactNode[] }) {
  const translateY = useSharedValue(0);
  const activeIndex = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      const translation = event.translationY * 0.3;
      if (Math.abs(translation) > SCROLL_LIMIT) {
        const overScroll = translation - SCROLL_LIMIT * Math.sign(translation);
        translateY.value =
          SCROLL_LIMIT * Math.sign(translation) + overScroll * RESISTANCE;
      } else {
        translateY.value = translation;
      }
    })
    .onEnd((event) => {
      if (
        Math.abs(event.velocityY) > 300 ||
        Math.abs(translateY.value) > SCROLL_LIMIT * 0.6
      ) {
        if (event.velocityY > 0 || translateY.value > 0) {
          activeIndex.value =
            activeIndex.value - 1 < 0
              ? cards.length - 1
              : activeIndex.value - 1;
        } else {
          activeIndex.value = (activeIndex.value + 1) % cards.length;
        }
      }
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150
      });
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View className="relative w-full py-8">
        {cards.map((card, index) => (
          <AnimatedCard
            key={index}
            index={index}
            totalCards={cards.length}
            activeIndex={activeIndex}
            translateY={translateY}
          >
            {card}
          </AnimatedCard>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
