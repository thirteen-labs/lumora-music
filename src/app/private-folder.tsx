import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '@/services/mmkv';
import { logger } from '@/utils/logger';

const PIN_KEY = 'lumora-private-folder-pin';

function hashPin(pin: string): string {
  let hash = 5381;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) + hash) + pin.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getStoredPinHash(): string | null {
  try {
    const val = storage.getString(PIN_KEY);
    return val && val.length > 0 ? val : null;
  } catch {
    return null;
  }
}

function setStoredPinHash(hash: string): void {
  try {
    storage.set(PIN_KEY, hash);
  } catch (e) { logger.warn('Failed to save PIN hash:', e); }
}

function clearStoredPin(): void {
  try {
    storage.set(PIN_KEY, '');
  } catch (e) { logger.warn('Failed to clear PIN:', e); }
}

export default function PrivateFolderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'idle' | 'setup' | 'verify' | 'unlocked'>(() =>
    getStoredPinHash() ? 'verify' : 'idle',
  );
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'check' | 'content'>('check');
  const [error, setError] = useState('');

  function handleSetUpLock() {
    setMode('setup');
    setPin('');
    setConfirmPin('');
    setError('');
  }

  function handleSavePin() {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    setStoredPinHash(hashPin(pin));
    setMode('unlocked');
    setStep('content');
    setPin('');
    setConfirmPin('');
    setError('');
  }

  function handleVerifyPin() {
    const storedHash = getStoredPinHash();
    if (!storedHash) {
      setMode('idle');
      return;
    }
    if (hashPin(pin) !== storedHash) {
      setError('Incorrect PIN');
      return;
    }
    setMode('unlocked');
    setStep('content');
    setPin('');
    setError('');
  }

  function handleRemoveLock() {
    Alert.alert(
      'Remove Lock',
      'Are you sure you want to remove the lock from Private Folder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            clearStoredPin();
            setMode('idle');
            setStep('check');
          },
        },
      ],
    );
  }

  function handleBack() {
    if (mode === 'setup') {
      setMode(getStoredPinHash() ? 'verify' : 'idle');
      setPin('');
      setConfirmPin('');
      setError('');
      return;
    }
    if (step === 'content') {
      setStep('check');
      return;
    }
    router.back();
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={handleBack} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Private Folder</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {mode === 'idle' && (
          <View style={[s.px5, s.itemsCenter, s.py20]}>
            <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '20' }]}>
              <Lock size={36} color={colors.accent} />
            </View>
            <Text style={[s.textBase, s.fontSemibold, s.mb2, { color: colors.text }]}>Private Folder</Text>
            <Text style={[s.textSm, s.textCenter, { color: colors.textMuted }]}>
              Protect your private files with a lock.{'\n'}This folder is secured and only accessible to you.
            </Text>
            <Pressable onPress={handleSetUpLock} style={[s.mt6, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Set Up Lock</Text>
            </Pressable>
          </View>
        )}

        {mode === 'setup' && (
          <View style={[s.px5, s.itemsCenter, s.py16]}>
            <View style={[{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '20' }]}>
              <Shield size={28} color={colors.accent} />
            </View>
            <Text style={[s.textBase, s.fontSemibold, s.mb1, { color: colors.text }]}>Create a PIN</Text>
            <Text style={[s.textSm, { color: colors.textMuted, marginBottom: 24 }]}>Set a 4–6 digit PIN to protect your private folder.</Text>

            <TextInput
              value={pin}
              onChangeText={(t) => { setPin(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
              placeholder="Enter PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={[{ width: '100%', padding: 14, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontSize: 18, textAlign: 'center', letterSpacing: 8, marginBottom: 12 }]}
            />

            <TextInput
              value={confirmPin}
              onChangeText={(t) => { setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
              placeholder="Confirm PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={[{ width: '100%', padding: 14, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontSize: 18, textAlign: 'center', letterSpacing: 8, marginBottom: 12 }]}
            />

            {error ? <Text style={[s.textSm, { color: '#ef4444', marginBottom: 12 }]}>{error}</Text> : null}

            <Pressable onPress={handleSavePin} style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent, opacity: pin.length >= 4 && confirmPin.length >= 4 ? 1 : 0.5 }]}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Save PIN</Text>
            </Pressable>
          </View>
        )}

        {mode === 'verify' && step === 'check' && (
          <View style={[s.px5, s.itemsCenter, s.py20]}>
            <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '20' }]}>
              <Lock size={36} color={colors.accent} />
            </View>
            <Text style={[s.textBase, s.fontSemibold, s.mb2, { color: colors.text }]}>Enter PIN</Text>
            <Text style={[s.textSm, { color: colors.textMuted, marginBottom: 24 }]}>Enter your PIN to access the private folder.</Text>

            <TextInput
              value={pin}
              onChangeText={(t) => { setPin(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
              placeholder="XXXXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={[{ width: '80%', padding: 14, borderRadius: 12, backgroundColor: colors.card, color: colors.text, fontSize: 20, textAlign: 'center', letterSpacing: 10, marginBottom: 12 }]}
            />

            {error ? <Text style={[s.textSm, { color: '#ef4444', marginBottom: 12 }]}>{error}</Text> : null}

            <Pressable onPress={handleVerifyPin} style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent, opacity: pin.length >= 4 ? 1 : 0.5 }]}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Unlock</Text>
            </Pressable>

            <Pressable onPress={handleRemoveLock} style={[s.mt4]}>
              <Text style={[s.textSm, { color: colors.textMuted }]}>Remove Lock</Text>
            </Pressable>
          </View>
        )}

        {mode === 'unlocked' && step === 'content' && (
          <View style={[s.px5, s.itemsCenter, s.py20]}>
            <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: '#22c55e' + '20' }]}>
              <Lock size={36} color="#22c55e" />
            </View>
            <Text style={[s.textBase, s.fontSemibold, s.mb2, { color: colors.text }]}>Unlocked</Text>
            <Text style={[s.textSm, s.textCenter, { color: colors.textMuted }]}>Your private folder is unlocked and accessible.</Text>

            <Pressable onPress={handleRemoveLock} style={[s.mt8]}>
              <Text style={[s.textSm, { color: '#ef4444' }]}>Remove Lock</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
