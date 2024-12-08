import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <SafeAreaView className="bg-background">
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => onBack?.()} className="mr-4">
          <ArrowLeft width={24} height={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-foreground">{title}</Text>
      </View>
    </SafeAreaView>
  );
};

export default Header;
