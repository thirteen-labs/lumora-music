declare let require: (id: string) => any;
declare let ErrorUtils: { getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void; setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void; };
declare namespace React {
  type FC<P = Record<string, never>> = { (props: P): ReactNode; displayName?: string; };
  type ReactNode = string | number | boolean | null | undefined | React.ReactElement | ReactNode[];
  type Component = { props: Record<string, unknown>; state: unknown; setState: (state: unknown) => void; forceUpdate: () => void; render(): ReactNode; context: unknown; refs: Record<string, unknown>; };
  type ComponentClass<P = Record<string, never>> = new(props: P) => Component;
  type ComponentType<P = Record<string, never>> = FC<P> | ComponentClass<P>;
  type Ref = React.RefObject<unknown> | ((instance: unknown) => void) | null;
  type RefObject<T> = { current: T | null; };
  function useEffect(fn: () => void | (() => void), deps?: unknown[]): void;
  function useState<T>(init: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
  function useRef<T>(init: T): { current: T };
  function useCallback<T>(fn: T, deps: unknown[]): T;
  function useMemo<T>(fn: () => T, deps: unknown[]): T;
  function createContext<T>(defaultValue: T): React.Context<T>;
  function useContext<T>(ctx: React.Context<T>): T;
  function memo<T>(fn: T): T;
}

declare module 'react' {
  export = React;
}
declare module 'expo-image-picker' {
  export interface ImagePickerResult { canceled: boolean; assets?: ImagePickerAsset[] }
  export interface ImagePickerAsset { uri: string; width: number; height: number; type?: string; fileName?: string; fileSize?: number; mimeType?: string; exif?: Record<string, unknown> }
  export interface MediaLibraryPermissionResponse { granted: boolean; accessPrivileges?: string }
  export function launchImageLibraryAsync(options?: { mediaTypes?: string | string[]; quality?: number; allowsMultipleSelection?: boolean; selectionLimit?: number; base64?: boolean; exif?: boolean; allowsEditing?: boolean; aspect?: [number, number] }): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(writeOnly?: boolean): Promise<MediaLibraryPermissionResponse>;
  export function getMediaLibraryPermissionsAsync(writeOnly?: boolean): Promise<MediaLibraryPermissionResponse>;
  export const MediaTypeOptions: Record<string, string>;
  export const UIImagePickerControllerType: Record<string, string>;
}

declare module 'react-native-safe-area-context' {
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
  export const SafeAreaProvider: React.FC<{ children: React.ReactNode; style?: React.ViewProps['style'] }>;
  export const SafeAreaView: React.FC<React.PropsWithChildren<unknown>>;
  export function useSafeAreaFrame(): { x: number; y: number; width: number; height: number };
}

declare module 'react-hook-form' {
  export function useForm<TFieldValues = any>(props?: any): { control: any; handleSubmit: (onValid: (data: TFieldValues) => void) => (e?: any) => Promise<void>; formState: { errors: any; isDirty: boolean }; setValue: any; watch: any; reset: any };
  export const Controller: React.FC<{ control: any; name: string; render: (props: { field: { onChange: (...event: any[]) => void; onBlur: () => void; value: any } }) => React.ReactElement; rules?: any; defaultValue?: any }>;
}

declare module '@hookform/resolvers/zod' {
  import { ZodSchema } from 'zod';
  export function zodResolver(schema: ZodSchema): any;
}

declare module 'expo-file-system/legacy' {
  export interface DocumentResult { uri: string; name?: string; mimeType?: string; size?: number }
  export namespace StorageAccessFramework {
    function requestDirectoryPermissionsAsync(initialUri?: string): Promise<{ granted: boolean; directoryUri: string }>;
    function readDirectoryAsync(uri: string): Promise<string[]>;
    function makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<string>;
    function createFileAsync(uri: string, name: string, mimeType: string): Promise<string>;
    function writeAsStringAsync(uri: string, content: string, options?: { encoding?: string }): Promise<void>;
    function readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
    function deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
    function moveAsync(options: { from: string; to: string }): Promise<void>;
    function copyAsync(options: { from: string; to: string }): Promise<void>;
    function getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; uri: string }>;
  }
  export function getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; uri: string; size?: number; modificationTime?: number }>;
  export function readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
  export function writeAsStringAsync(uri: string, content: string, options?: { encoding?: string }): Promise<void>;
  export function deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function moveAsync(options: { from: string; to: string }): Promise<void>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
  export const documentDirectory: string;
  export const cacheDirectory: string;
  export const bundleDirectory: string;
  export const EncodingType: { UTF8: string; Base64: string };
  export function makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<string>;
  export function readDirectoryAsync(uri: string): Promise<string[]>;
  export function downloadAsync(uri: string, fileUri: string, options?: any): Promise<{ uri: string }>;
}

declare module 'expo-file-system' {
  export class File {
    constructor(uri: string);
    static from(uri: string): File;
    readonly uri: string;
    readonly name: string;
    exists: boolean;
    size?: number;
    md5?: string;
    type?: string;
    copy(destination: File): Promise<File>;
    move(destination: File): Promise<File>;
    delete(): Promise<void>;
    write(content: string): Promise<void>;
    text(): Promise<string>;
    base64(): Promise<string>;
    create(): Promise<File>;
    info(): Promise<FileInfo>;
  }
  export interface FileInfo {
    size: number;
    modificationTime: number;
    md5?: string;
  }
  export class Directory {
    constructor(uri: string);
    static from(uri: string): Directory;
    readonly uri: string;
    readonly name: string;
    exists: boolean;
    create(): Promise<Directory>;
    delete(): Promise<void>;
    list(): Promise<(File | Directory)[]>;
  }
  export namespace Paths {
    interface PathInfo { readonly uri: string; readonly name: string; }
    const cache: PathInfo;
    const document: PathInfo;
    const appleShared: PathInfo;
    function join(...segments: string[]): string;
    function basename(path: string): string;
    function dirname(path: string): string;
    function extname(path: string): string;
  }
}

declare module 'react-native' {
  import * as React from 'react';
  export interface ViewProps { style?: any; children?: React.ReactNode; onLayout?: (event: any) => void; key?: any; testID?: string; ref?: any; pointerEvents?: string; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: Record<string, any>; accessibilityLiveRegion?: string; accessible?: boolean }
  export class View extends React.Component<ViewProps> {}
  export interface TextProps { style?: any; children?: React.ReactNode; numberOfLines?: number; onPress?: () => void; onLayout?: (e: any) => void; selectable?: boolean; key?: any; ref?: any }
  export class Text extends React.Component<TextProps> {}
  export interface PressableProps { style?: any; onPress?: () => void; onLongPress?: () => void; disabled?: boolean; hitSlop?: number; onLayout?: (e: any) => void; children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode); key?: any; ref?: any; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: Record<string, any>; accessible?: boolean }
  export class Pressable extends React.Component<PressableProps> {}
  export interface ImageProps { source: any; style?: any; resizeMode?: string; onLoad?: () => void; onError?: () => void; blurRadius?: number }
  export class Image extends React.Component<ImageProps> {}
  export interface ScrollViewProps { style?: any; contentContainerStyle?: any; horizontal?: boolean; showsHorizontalScrollIndicator?: boolean; showsVerticalScrollIndicator?: boolean; children?: React.ReactNode; onScroll?: (event: any) => void; refreshControl?: React.ReactElement; pagingEnabled?: boolean; ref?: any }
  export class ScrollView extends React.Component<ScrollViewProps> { scrollTo(options?: { x?: number; y?: number; animated?: boolean }): void; }
  export interface TextInputProps { style?: any; value?: string; onChangeText?: (text: string) => void; placeholder?: string; placeholderTextColor?: string; multiline?: boolean; editable?: boolean; autoFocus?: boolean; onSubmitEditing?: () => void; onBlur?: () => void; returnKeyType?: string; autoCapitalize?: string; autoCorrect?: boolean; keyboardType?: string; secureTextEntry?: boolean; maxLength?: number; accessibilityLabel?: string }
  export class TextInput extends React.Component<TextInputProps> {}
  export interface ActivityIndicatorProps { size?: number | 'small' | 'large'; color?: string }
  export class ActivityIndicator extends React.Component<ActivityIndicatorProps> {}
  export interface ModalProps { visible: boolean; animationType?: string; transparent?: boolean; onRequestClose?: () => void; children?: React.ReactNode }
  export class Modal extends React.Component<ModalProps> {}
  export interface RefreshControlProps { refreshing: boolean; onRefresh: () => void; tintColor?: string }
  export class RefreshControl extends React.Component<RefreshControlProps> {}
  export interface SwitchProps { value?: boolean; onValueChange?: (value: boolean) => void; disabled?: boolean; trackColor?: { false?: string; true?: string }; thumbColor?: string; style?: any }
  export class Switch extends React.Component<SwitchProps> {}
  export interface FlatListProps<ItemT> { data: ItemT[]; renderItem: (info: { item: ItemT; index: number; separators: any }) => React.ReactElement | null; keyExtractor?: (item: ItemT, index: number) => string; style?: any; contentContainerStyle?: any; horizontal?: boolean; pagingEnabled?: boolean; showsHorizontalScrollIndicator?: boolean; showsVerticalScrollIndicator?: boolean; onRefresh?: () => void; refreshing?: boolean; ListHeaderComponent?: React.ReactElement | (() => React.ReactElement); ListFooterComponent?: React.ReactElement | (() => React.ReactElement); ListEmptyComponent?: React.ReactElement | (() => React.ReactElement); ItemSeparatorComponent?: React.ReactElement | (() => React.ReactElement); numColumns?: number; extraData?: any; initialNumToRender?: number; maxToRenderPerBatch?: number; windowSize?: number; getItemLayout?: any; onEndReached?: () => void; onEndReachedThreshold?: number; removeClippedSubviews?: boolean; ref?: any; bounces?: boolean; onMomentumScrollEnd?: (event: any) => void }
  export class FlatList<ItemT> extends React.Component<FlatListProps<ItemT>> { scrollToOffset(options: { offset: number; animated?: boolean }): void; }
  export type ColorValue = string;
  export type DimensionValue = number | string | undefined;
  export const Platform: { OS: string; Version: number | string; select: <T>(specifics: Record<string, T>) => T };
  export const StyleSheet: { create: <T extends Record<string, any>>(styles: T) => T; flatten: (style: any) => any; hairlineWidth: () => number; absoluteFill: any; absoluteFillObject: any };
  export const Dimensions: { get: (dim: string) => { width: number; height: number; scale: number; fontScale: number } };
  export const Animated: any; export const Easing: any; export const StatusBar: any;
  export const Appearance: { getColorScheme: () => string | null; addChangeListener: (handler: any) => { remove: () => void } };
  export const useColorScheme: () => string | null;
  export const Alert: { alert: (title: string, message?: string, buttons?: any[]) => void };
  export const Linking: { openURL: (url: string) => Promise<void>; canOpenURL: (url: string) => Promise<boolean>; openSettings: () => void };
  export const Share: { share: (content: any) => Promise<{ action: string }> };
  export const Vibration: { vibrate: (pattern?: number | number[]) => void };
  export const PixelRatio: { get: () => number; getFontScale: () => number; roundToNearestPixel: (size: number) => number };
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
  export type LayoutChangeEvent = { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } };
  export type NativeSyntheticEvent<T> = { nativeEvent: T };
  export type NativeScrollEvent = { nativeEvent: { contentOffset: { x: number; y: number }; contentSize: { width: number; height: number }; layoutMeasurement: { width: number; height: number } } };
  export type GestureResponderEvent = { nativeEvent: any };
  export interface ListRenderItemInfo<ItemT> { item: ItemT; index: number; separators: any }
  export type TextStyle = Record<string, any>;
  export type ViewStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;
  export type AppStateStatus = 'active' | 'background' | 'inactive';
  export const AppState: { currentState: AppStateStatus; addEventListener: (type: string, handler: (state: AppStateStatus) => void) => { remove: () => void } };
}

declare module 'lucide-react-native' {
  import * as React from 'react';
  interface IconProps { size?: number; color?: string; strokeWidth?: number; style?: any; fill?: string; opacity?: number }
  export type Icon = React.FC<IconProps>;
  export const Music: Icon; export const Heart: Icon; export const ListMusic: Icon; export const LayoutGrid: Icon;
  export const ChevronLeft: Icon; export const Play: Icon; export const Sparkles: Icon; export const FileMusic: Icon;
  export const Check: Icon; export const Palette: Icon; export const X: Icon; export const Clock: Icon;
  export const List: Icon; export const ListPlus: Icon; export const Shuffle: Icon; export const Info: Icon;
  export const Save: Icon; export const RotateCcw: Icon; export const Pause: Icon; export const SkipForward: Icon;
  export const Settings: Icon; export const Search: Icon; export const Brain: Icon; export const Wand2: Icon;
  export const Lock: Icon; export const Sun: Icon; export const Droplets: Icon; export const Database: Icon;
  export const BookOpen: Icon; export const MessageCircle: Icon; export const Bug: Icon; export const EyeOff: Icon;
  export const Trash2: Icon; export const ScanEye: Icon; export const ChevronRight: Icon; export const Languages: Icon;
  export const Volume2: Icon; export const AlertCircle: Icon; export const FileUp: Icon; export const FileDown: Icon;
  export const Paperclip: Icon; export const Loader: Icon; export const Type: Icon; export const User: Icon;
  export const Disc: Icon; export const BellPlus: Icon; export const BellRing: Icon; export const Smartphone: Icon;
  export const Ear: Icon; export const Headphones: Icon; export const Speaker: Icon; export const Disc3: Icon;
  export const Calendar: Icon; export const SkipBack: Icon; export const ChevronDown: Icon; export const GripVertical: Icon;
  export const Ellipsis: Icon; export const MoreHorizontal: Icon; export const RefreshCw: Icon; export const HardDrive: Icon;
  export const FileText: Icon; export const Tag: Icon; export const Folder: Icon; export const FileAudio: Icon;
  export const TrendingUp: Icon; export const BarChart3: Icon; export const Activity: Icon; export const Shield: Icon;
  export const ShieldCheck: Icon; export const WifiOff: Icon; export const Mic: Icon; export const Waves: Icon;
  export const Mic2: Icon; export const SquareCheck: Icon; export const Plus: Icon; export const Zap: Icon;
  export const Paintbrush: Icon; export const FolderOpen: Icon; export const MoreVertical: Icon; export const ArrowUp: Icon;
  export const ArrowDown: Icon; export const SortAsc: Icon; export const SortDesc: Icon; export const ExternalLink: Icon;
  export const Github: Icon; export const Globe: Icon; export const Mail: Icon; export const Repeat: Icon;
  export const Repeat1: Icon; export const Crosshair: Icon; export const GripHorizontal: Icon;
  export const AlignLeft: Icon; export const PenLine: Icon; export const SlidersHorizontal: Icon; export const ChevronUp: Icon;
  export const Share2: Icon; export const FolderPlus: Icon; export const Moon: Icon; export const History: Icon;
  export const Cloud: Icon; export const Upload: Icon; export const TriangleAlert: Icon; export const Square: Icon;
  export const Server: Icon; export const ScanLine: Icon; export const Link2: Icon; export const Pencil: Icon;
  export const AudioLines: Icon; export const Battery: Icon; export const Bell: Icon; export const CircleCheck: Icon;
  export const Download: Icon; export const Gauge: Icon; export const HelpCircle: Icon; export const ImageIcon: Icon;
  export const Volume: Icon; export const Users: Icon; export const ArrowRight: Icon;
}

declare module 'expo-status-bar' {
  import * as React from 'react';
  interface StatusBarProps { style?: 'auto' | 'inverted' | 'light' | 'dark'; animated?: boolean; hidden?: boolean }
  export const StatusBar: React.FC<StatusBarProps>;
  export function setStatusBarStyle(style: 'auto' | 'inverted' | 'light' | 'dark'): void;
  export function setStatusBarHidden(hidden: boolean, animation?: string): void;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: { mimeType?: string; dialogTitle?: string; UTI?: string }): Promise<void>;
}

declare module 'expo-font' {
  export function loadAsync(fontFamilyOrFontMap: string | Record<string, any>): Promise<void>;
  export function isLoaded(fontFamily: string): boolean;
}

declare module 'expo-media-library' {
  export function getAssetsAsync(options?: any): Promise<any>;
  export function getAlbumsAsync(options?: any): Promise<any>;
  export function createAssetAsync(uri: string): Promise<any>;
  export function deleteAssetsAsync(assetIds: string[]): Promise<any>;
  export function addAssetsToAlbumAsync(assetIds: string[], albumId: string, copyAssets?: boolean): Promise<any>;
  export function saveToLibraryAsync(uri: string): Promise<void>;
  export function getPermissionsAsync(): Promise<any>;
  export function requestPermissionsAsync(writeOnly?: boolean): Promise<any>;
}

declare module 'expo-audio' {
  export function setAudioModeAsync(mode: any): Promise<void>;
  export function requestRecordingPermissionsAsync(): Promise<{ granted: boolean; status?: string }>;
  export function getRecordingPermissionsAsync(): Promise<{ granted: boolean; status?: string }>;
}

declare module 'react-native-mmkv' {
  export function createMMKV(config?: { id?: string; path?: string; encryptionKey?: string }): MMKV;
  export class MMKV {
    getString(key: string): string | undefined;
    set(key: string, value: string | number | boolean): void;
    getNumber(key: string): number | undefined;
    getBoolean(key: string): boolean | undefined;
    delete(key: string): void;
    remove(key: string): void;
    getAllKeys(): string[];
    clearAll(): void;
    contains(key: string): boolean;
  }
}

declare module 'expo-audio/build/AudioModule' {
  const AudioModule: any;
  export default AudioModule;
}

declare module '@missingcore/react-native-metadata-retriever' {
  export interface MediaMetadata { bitrate: number | null; channelCount: number | null; codecs: string | null; sampleMimeType: string | null; sampleRate: number | null; albumArtist: string | null; albumTitle: string | null; artist: string | null; artworkData: string | null; artworkDataType: string | null; artworkUri: string | null; compilation: string | null; composer: string | null; duration: number | null; genre: string | null; mimeType: string | null; title: string | null; trackNumber: number | null; trackCount: number | null; discNumber: number | null; discCount: number | null; releaseDate: string | null; year: number | null; author: string | null; mediaId: string | null; }
  export interface ArtworkOptions { compress?: number; format?: 'jpeg' | 'png' | 'webp'; saveUri?: string; }
  export const MetadataPresets: Record<string, string[]>;
  export const SaveFormat: { JPEG: 'jpeg'; PNG: 'png'; WEBP: 'webp' };
  export function getMetadata(uri: string, preset: string[]): Promise<MediaMetadata>;
  export function getArtwork(uri: string): Promise<string | null>;
  export function saveArtwork(uri: string, options?: ArtworkOptions): Promise<string | null>;
  export function getBulkMetadata(uris: string[], preset: string[]): Promise<any>;
  export function updateConfigs(config: { maxImageSizeMB?: number }): void;
}

declare module 'expo-media-library/legacy' {
  export function getAssetsAsync(options?: any): Promise<any>;
  export function getAlbumsAsync(options?: any): Promise<any>;
  export function createAssetAsync(uri: string): Promise<any>;
  export function deleteAssetsAsync(assetIds: string[]): Promise<any>;
  export function saveToLibraryAsync(uri: string): Promise<void>;
  export function getPermissionsAsync(): Promise<any>;
  export function requestPermissionsAsync(writeOnly?: boolean): Promise<any>;
}

declare module '@react-native-community/slider' {
  import * as React from 'react';
  interface SliderProps { style?: any; value?: number; minimumValue?: number; maximumValue?: number; step?: number; minimumTrackTintColor?: string; maximumTrackTintColor?: string; thumbTintColor?: string; disabled?: boolean; onValueChange?: (value: number) => void; onSlidingComplete?: (value: number) => void }
  const Slider: React.FC<SliderProps>;
  export default Slider;
}

declare module 'react-native-gesture-handler' {
  import * as React from 'react';
  export const GestureHandlerRootView: React.FC<{ style?: any; children?: React.ReactNode }>;
  export const GestureDetector: React.FC<any>;
  export const ScrollView: React.FC<any>;
  export const Gesture: { Pan: () => any; Tap: () => any; Pinch: () => any; Rotation: () => any; LongPress: () => any; Native: () => any; Simultaneous: (...gestures: any[]) => any; Exclusive: (...gestures: any[]) => any; Race: (...gestures: any[]) => any };
}

declare module 'react-native-reanimated' {
  import { View as RNView } from 'react-native';
  export function useSharedValue<T>(value: T): { value: T };
  export function useAnimatedStyle(updater: () => any, deps?: any[]): any;
  export function withTiming(value: number, config?: any): number;
  export function withSpring(value: number, config?: any): number;
  export function withSequence(...animations: number[]): number;
  export function withRepeat(animation: number, numberOfReps?: number, reverse?: boolean): number;
  export function cancelAnimation(sharedValue: { value: any }): void;
  export function runOnJS<T>(fn: T): T;
  export function interpolate(value: number, inputRange: number[], outputRange: number[], type?: any): number;
  export const Easing: any;
  declare const Animated: { View: typeof RNView; Text: any; ScrollView: any; FlatList: any; Image: any };
  export default Animated;
}

declare module 'react-native-screens' {
  export function enableScreens(enabled?: boolean): void;
  export const Screen: any;
}

declare module 'react-native-svg' {
  import * as React from 'react';
  declare const Svg: React.ComponentClass<{ width?: number; height?: number; viewBox?: string; style?: any; children?: React.ReactNode }>;
  export default Svg;
  export const Circle: React.FC<any>; export const Rect: React.FC<any>; export const Path: React.FC<any>; export const G: React.FC<any>; export const Line: React.FC<any>; export const Defs: React.FC<any>; export const LinearGradient: React.FC<any>; export const Stop: React.FC<any>; export const ClipPath: React.FC<any>; export const Polygon: React.FC<any>;
}

declare module '@gorhom/bottom-sheet' {
  import * as React from 'react';
  export class BottomSheetModal extends React.Component<any> { present(): void; dismiss(): void; }
  export const BottomSheetModalProvider: React.FC<{ children?: React.ReactNode }>;
  export const BottomSheetView: React.FC<any>;
  export const BottomSheetBackdrop: React.FC<any>;
  export const BottomSheetHandle: React.FC<any>;
  export const BottomSheetTextInput: React.FC<any>;
  export const BottomSheetFlatList: React.FC<any>;
  export const BottomSheetScrollView: React.FC<any>;
  export const useBottomSheetModal: () => any;
}

declare module 'zustand' {
  type StoreApi<T> = {
    setState: (partial: T | Partial<T> | ((state: T) => any)) => void;
    getState: () => T;
    subscribe: (listener: (state: T, prev: T) => void) => () => void;
    destroy: () => void;
  };
  type UseBoundStore<T> = { (): T; <U>(selector: (state: T) => U): U } & StoreApi<T>;
  export function create<T>(): (fn: any) => UseBoundStore<T>;
  export function create<T>(fn: any): UseBoundStore<T>;
}
declare module 'zustand/middleware' {
  export const persist: any;
  export const createJSONStorage: any;
}
declare module 'zustand/middleware/immer' {
  export const immer: any;
}
declare module 'expo-linking' {
  export function openURL(url: string): Promise<void>;
  export function canOpenURL(url: string): Promise<boolean>;
  export function openSettings(): Promise<void>;
  export function getInitialURL(): Promise<string | null>;
  export function addEventListener(type: string, handler: (event: { url: string }) => void): { remove: () => void };
}
declare module 'expo-constants' {
  const c: any;
  export default c;
}
declare module 'expo-crypto' {
  export function digestStringAsync(algorithm: 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', data: string, options?: { encoding?: 'hex' | 'base64' }): Promise<string>;
  export function randomUUID(): string;
}
declare module 'expo-document-picker' {
  export function getDocumentAsync(options?: { type?: string | string[]; copyToCacheDirectory?: boolean; multiple?: boolean; }): Promise<{ canceled: boolean; assets?: { uri: string; name?: string; mimeType?: string; size?: number }[] }>;
}
declare module 'expo-blur' {
  import * as React from 'react';
  interface BlurViewProps {
    children?: React.ReactNode;
    intensity?: number;
    tint?: 'light' | 'dark' | 'default' | 'xlight' | 'regular' | 'prominent' | 'systemUltraThinMaterial' | 'systemThinMaterial' | 'systemMaterial' | 'systemThickMaterial' | 'systemChromeMaterial';
    style?: Record<string, unknown>;
    blurReductionFactor?: number;
  }
  export const BlurView: React.FC<BlurViewProps>;
}
declare module 'expo-screen-orientation' {
  export const OrientationLock: { DEFAULT: number; PORTRAIT: number; LANDSCAPE: number; PORTRAIT_UP: number; PORTRAIT_DOWN: number; LANDSCAPE_LEFT: number; LANDSCAPE_RIGHT: number; };
  export function lockAsync(orientationLock: number): Promise<void>;
  export function unlockAsync(): Promise<void>;
}
declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}
declare module 'expo-task-manager' {
  export function defineTask(taskName: string, taskExecutor: (event: { data: Record<string, unknown> }) => Promise<void>): void;
  export function isTaskRegisteredAsync(taskName: string): Promise<boolean>;
}
declare module 'expo-background-fetch' {
  export function registerTaskAsync(taskName: string, options?: { minimumInterval?: number; stopOnTerminate?: boolean; startOnBoot?: boolean }): Promise<void>;
  export function unregisterTaskAsync(taskName: string): Promise<void>;
  export function getStatusAsync(): Promise<number>;
  export function setMinimumIntervalAsync(interval: number): Promise<void>;
  export const BackgroundFetchStatus: { Denied: number; Available: number; Restricted: number };
}
declare module 'expo-web-browser' {
  export function maybeCompleteAuthSession(): void;
}
declare module 'expo-asset' {
  export class Asset {
    static fromURI(uri: string): Asset;
    static fromModule(module: number): Asset;
    uri: string;
    name: string | null;
    type: string | null;
    hash: string | null;
    width: number;
    height: number;
    downloadAsync(): Promise<Asset>;
  }
}
declare module 'expo-splash-screen' {
  export function preventAutoHideAsync(): Promise<void>;
  export function hideAsync(): Promise<void>;
  export function setOptions(options: { duration?: number; fade?: boolean }): void;
}
declare module 'expo-image' {
  import * as React from 'react';
  interface ImageProps {
    source: any;
    style?: any;
    contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
    transition?: number;
    placeholder?: any;
    priority?: 'low' | 'normal' | 'high';
    recyclingKey?: string;
    onLoad?: (event: any) => void;
    onError?: (event: any) => void;
    blurRadius?: number;
  }
  export const Image: React.FC<ImageProps>;
}
declare module 'expo-auth-session' {
  export function makeRedirectUri(options?: { native?: string; path?: string; scheme?: string; preferLocalhost?: boolean; }): string;
  export class AuthRequest {
    constructor(options: { clientId: string; scopes: string[]; redirectUri: string; usePKCE?: boolean; extraParams?: Record<string, string>; });
    promptAsync(discovery?: any): Promise<{ type: string; params: any }>;
    codeVerifier?: string;
  }
  export function exchangeCodeAsync(config: { code: string; clientId: string; redirectUri: string; extraParams?: Record<string, string>; authorizationEndpoint?: string; tokenEndpoint?: string; revocationEndpoint?: string; }, discovery?: unknown): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;
}
declare module 'react-native-audio-api' {
  export class PlaybackNotificationManager { static setPlaying(song: any): void; static setPaused(): void; static clear(): void; static updateMetadata(metadata: any): void; static show(data?: any): Promise<void>; static hide(): Promise<void>; static addEventListener(event: string, handler: (...args: any[]) => void): { remove: () => void }; static enableControl(control: string, enabled: boolean): void; }
  export class AudioContext {
    currentTime: number;
    sampleRate: number;
    readonly state: string;
    readonly destination: AudioDestinationNode;
    resume(): Promise<void>;
    suspend(): Promise<void>;
    close(): Promise<void>;
    createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
    createBufferSource(options?: { pitchCorrection?: boolean }): AudioBufferSourceNode;
    createGain(): GainNode;
    createBiquadFilter(): BiquadFilterNode;
    createStereoPanner(): StereoPannerNode;
    decodeAudioData(audioData: ArrayBuffer | string, successCallback?: (decodedData: AudioBuffer) => void, errorCallback?: (error: Error) => void): Promise<AudioBuffer>;
  }
  export class AudioDestinationNode {
    readonly maxChannelCount: number;
    connect(destination: any): void;
  }
  export class AudioBuffer { duration: number; length: number; numberOfChannels: number; sampleRate: number; getChannelData(channel: number): Float32Array; }
  export class AudioParam { value: number; setValueAtTime(value: number, startTime: number): AudioParam; linearRampToValueAtTime(value: number, endTime: number): AudioParam; exponentialRampToValueAtTime(value: number, endTime: number): AudioParam; }
  export class AudioBufferSourceNode {
    buffer: AudioBuffer | null;
    loop: boolean;
    playbackRate: AudioParam;
    onEnded: (() => void) | null;
    connect(destination: any): void;
    disconnect(): void;
    start(when?: number, offset?: number, duration?: number): void;
    stop(when?: number): void;
  }
  export class GainNode {
    gain: AudioParam;
    connect(destination: any): void;
    disconnect(): void;
  }
  export class BiquadFilterNode { type: string; frequency: AudioParam; Q: AudioParam; gain: AudioParam; connect(destination: any): void; }
  export class StereoPannerNode { pan: AudioParam; connect(destination: any): void; }
  export class AudioManager {
    static setAudioModeAsync(mode: any): Promise<void>;
    static setAudioSessionActivity(active: boolean): void;
    static observeAudioInterruptions(observe: boolean): void;
    static addSystemEventListener(event: string, handler: (event: any) => void): { remove: () => void };
  }
  export type AudioEventSubscription = { remove(): void };
}
declare module 'react-native-view-shot' {
  import * as React from 'react';
  export function captureRef(ref: React.RefObject<unknown>, options?: { format?: string; quality?: number; result?: string }): Promise<string>;
  export function captureScreen(options?: { format?: string; quality?: number; result?: string }): Promise<string>;
}
declare module 'react-native-image-colors' {
  export function getColors(uri: string, options?: any): Promise<any>;
}
declare module 'react-native-worklets' {
  export function createWorkletRuntime(name?: string): { schedule: (task: () => void) => void };
}
declare module 'react-native-web' {
  export * from 'react-native';
}

declare module 'expo-notifications' {
  export const AndroidImportance: { DEFAULT: number; HIGH: number; LOW: number; MAX: number; MIN: number; NONE: number; UNSPECIFIED: number };
  export type AndroidImportance = number;
  export function getNotificationChannelAsync(channelId: string): Promise<any>;
  export function setNotificationChannelAsync(channelId: string, channel: any): Promise<any>;
  export function requestPermissionsAsync(permissions?: any): Promise<{ granted: boolean; status?: string }>;
  export function getPermissionsAsync(): Promise<{ granted: boolean; status?: string }>;
  export function scheduleNotificationAsync(request: any): Promise<string>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function setNotificationHandler(handler: any): void;
  export function getExpoPushTokenAsync(options?: any): Promise<{ data: string }>;
}
declare module 'expo-router' {
  import * as React from 'react';
  type Href = string | { pathname: string; params?: Record<string, any> };
  export function useRouter(): { push: (href: Href) => void; back: () => void; replace: (href: Href) => void; setParams: (params: any) => void };
  export function useLocalSearchParams<T extends Record<string, string | string[] | undefined> = Record<string, string | string[]>>(): T;
  export function useSegments(): string[];
  export function useFocusEffect(callback: () => (() => void) | void): void;
  export const Stack: React.FC<any> & { Screen: React.FC<any> };
  export const Tabs: React.FC<any> & { Screen: React.FC<any> };
  export const Redirect: React.FC<{ href: Href; withAnchor?: boolean }>;
}
declare module '@shopify/flash-list' {
  import * as React from 'react';
  export interface FlashListProps<ItemT> { data: ItemT[]; renderItem: (info: { item: ItemT; index: number }) => React.ReactElement; keyExtractor?: (item: ItemT, index: number) => string; estimatedItemSize?: number; style?: any; contentContainerStyle?: any; horizontal?: boolean; showsHorizontalScrollIndicator?: boolean; showsVerticalScrollIndicator?: boolean; onRefresh?: () => void; refreshing?: boolean; ListHeaderComponent?: React.ReactElement | (() => React.ReactElement); ListFooterComponent?: React.ReactElement | (() => React.ReactElement); ListEmptyComponent?: React.ReactElement | (() => React.ReactElement); ItemSeparatorComponent?: React.ReactElement | (() => React.ReactElement); extraData?: any; numColumns?: number; onEndReached?: () => void; onEndReachedThreshold?: number; onLoad?: (info: { elapsedTimeMs?: number }) => void; getItemType?: (item: ItemT, index: number) => string | number; overrideItemLayout?: any; drawDistance?: number; estimatedListSize?: { width: number; height: number }; }
  export class FlashList<ItemT> extends React.Component<FlashListProps<ItemT>> { }
}
declare module 'zod' {
  export class ZodSchema { parse: (data: unknown) => unknown; safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: any }; min(min: number, message?: string): this; }
  export class ZodString extends ZodSchema { min(min: number, message?: string): this; }
  export class ZodObject<T extends Record<string, ZodSchema>> extends ZodSchema { shape: T; }
  export const z: {
    string(): ZodString;
    number(): ZodSchema;
    boolean(): ZodSchema;
    object<T extends Record<string, ZodSchema>>(shape: T): ZodObject<T>;
    array(schema: ZodSchema): ZodSchema;
    union(schemas: ZodSchema[]): ZodSchema;
    any(): ZodSchema;
    nativeEnum(enumObj: Record<string, any>): ZodSchema;
    infer: () => any;
  };
}
  declare module '*.css' {}
  declare module 'react/jsx-runtime' {
    export const jsx: any;
    export const jsxs: any;
    export const Fragment: any;
  }
