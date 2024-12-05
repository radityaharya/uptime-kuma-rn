
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from './text';

interface MenuProps {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  children: React.ReactNode;
}

interface MenuItemProps {
  onPress: () => void;
  title: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ onPress, title }) => (
  <Pressable
    onPress={onPress}
    className="px-4 py-2 active:bg-secondary"
  >
    <Text>{title}</Text>
  </Pressable>
);

export const Menu: React.FC<MenuProps> & { Item: typeof MenuItem } = ({
  visible,
  onDismiss,
  children,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onDismiss}
      animationType="fade"
    >
      <Pressable onPress={onDismiss} className="flex-1 bg-black/50">
        <View className="bg-background absolute right-4 top-[45%] w-40 rounded-lg shadow">
          {children}
        </View>
      </Pressable>
    </Modal>
  );
};

Menu.Item = MenuItem;