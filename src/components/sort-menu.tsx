import { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import type { SortOption } from '@/types/media';
import { Check } from 'lucide-react-native';

interface SortMenuProps {
  options: SortOption[];
  active: SortOption;
  onSelect: (option: SortOption) => void;
  count?: number;
}

export function SortMenu({ options, active, onSelect, count }: SortMenuProps) {
  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => [options.length > 4 ? '50%' : '40%'], [options.length]);

  const handlePresent = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 4 }}>
        {count !== undefined && (
          <Text style={[s.textXs, { color: colors.textMuted }]}>
            {count}
          </Text>
        )}
        <Pressable onPress={handlePresent} style={[s.py1]}>
          <Text style={[s.textXs, { color: colors.accent }]}>
            {active.label} ▼
          </Text>
        </Pressable>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              paddingHorizontal: 20,
              paddingBottom: 12,
            }}
          >
            Sort By
          </Text>
          {options.map((option) => {
            const isActive = option.field === active.field && option.order === active.order;
            return (
              <Pressable
                key={`${option.field}-${option.order}`}
                onPress={() => {
                  onSelect(option);
                  bottomSheetRef.current?.dismiss();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: isActive ? colors.accent + '18' : 'transparent',
                }}
              >
                {isActive && <Check size={16} color={colors.accent} />}
                <Text
                  style={{
                    fontSize: 15,
                    color: isActive ? colors.accent : colors.text,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
