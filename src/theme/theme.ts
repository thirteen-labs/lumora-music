import { extendTheme } from 'nativewind';

export const theme = extendTheme({
  colors: {
    primary: '#5B21B6', // Indigo 700
    secondary: '#A78BFA', // Violet 400
    accent: '#8B5CF6', // Violet 500
    background: '#0F0A1A', // Dark Purple-Black
    text: '#E0E7FF', // Indigo 100
    card: '#1A112A', // Slightly lighter dark purple
    border: '#312E81', // Indigo 800
    notification: '#DC2626', // Red 600
    success: '#10B981', // Green 500
    warning: '#F59E0B', // Amber 500
    info: '#3B82F6', // Blue 500
  },
  // You can extend other theme properties like spacing, typography, etc.
});
