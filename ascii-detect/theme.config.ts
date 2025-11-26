// Theme Configuration
// Change colors and fonts here to customize the entire app

export const theme = {
  // Primary accent color (used for highlights, buttons, active states)
  primary: {
    400: '#2dd4bf', // teal-400
    500: '#14b8a6', // teal-500
    600: '#0d9488', // teal-600
  },
  
  // Background colors
  background: {
    base: '#050505',      // Main background
    panel: '#111',        // Panel backgrounds
    dark: '#0a0a0a',     // Darker backgrounds
    darker: '#0d0d0d',    // Darkest backgrounds
    card: '#020202',      // Card backgrounds
  },
  
  // Text colors
  text: {
    primary: '#e0e0e0',   // Main text
    secondary: '#9ca3af', // Gray-400
    tertiary: '#6b7280',  // Gray-500
    muted: '#4b5563',     // Gray-600
  },
  
  // Border colors
  border: {
    default: '#374151',   // Gray-700
    dark: '#1f2937',      // Gray-800
    light: '#4b5563',     // Gray-600
  },
  
  // Font configuration
  font: {
    family: "'JetBrains Mono', monospace",
    // To change font, update the Google Fonts link in index.html
    // and change the family name here
    // Examples:
    // "'Fira Code', monospace"
    // "'Source Code Pro', monospace"
    // "'Courier New', monospace"
  },
  
  // Scrollbar colors
  scrollbar: {
    track: '#111',
    thumb: '#333',
    thumbHover: '#00ff88', // Can match primary color
  },
};

// Helper function to get Tailwind classes (for easy migration)
export const getThemeClasses = () => ({
  primary: {
    text: 'text-teal-400',
    bg: 'bg-teal-500',
    border: 'border-teal-500',
  },
  // Add more as needed
});


