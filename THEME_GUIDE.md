# Theme Customization Guide

## Quick Color Changes

The app uses **Tailwind CSS classes** throughout. To change colors, you have two options:

### Option 1: Find & Replace (Quick)
Use find & replace in your editor to swap color classes:

**Current teal theme → Change to:**
- `teal-400` → `cyan-400`, `blue-400`, `purple-400`, `pink-400`, etc.
- `teal-500` → `cyan-500`, `blue-500`, `purple-500`, `pink-500`, etc.
- `teal-600` → `cyan-600`, `blue-600`, `purple-600`, `pink-600`, etc.

**Example color schemes:**
- **Cyan**: `cyan-400`, `cyan-500`, `cyan-600`
- **Blue**: `blue-400`, `blue-500`, `blue-600`
- **Purple**: `purple-400`, `purple-500`, `purple-600`
- **Pink**: `pink-400`, `pink-500`, `pink-600`
- **Green**: `green-400`, `green-500`, `green-600`
- **Orange**: `orange-400`, `orange-500`, `orange-600`

### Option 2: Custom Hex Colors
Replace Tailwind classes with custom hex values using bracket notation:
- `text-teal-400` → `text-[#your-color]`
- `bg-teal-500` → `bg-[#your-color]`
- `border-teal-500` → `border-[#your-color]`

## Font Changes

### Step 1: Update Google Fonts Link
In `index.html`, change line 17:

**Current:**
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**Examples:**
```html
<!-- Fira Code -->
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">

<!-- Source Code Pro -->
<link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap" rel="stylesheet">

<!-- IBM Plex Mono -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">

<!-- Space Mono -->
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Step 2: Update Font Family
In `index.html`, change line 22:

**Current:**
```css
font-family: 'JetBrains Mono', monospace;
```

**Change to:**
```css
font-family: 'Fira Code', monospace;
/* or your chosen font */
```

## Files to Update for Complete Theme Change

1. **index.html** - Font link and body styles
2. **components/TopBar.tsx** - Title color, status indicator
3. **components/WelcomeOverlay.tsx** - Accent colors, borders
4. **components/ui/Controls.tsx** - Button colors, slider accent, toggle colors
5. **components/Inspector.tsx** - Any accent colors
6. **components/NodeGraph.tsx** - Node colors, selection colors
7. **App.tsx** - Background colors

## Color Reference

The app uses these color patterns:
- **Primary accent**: `teal-400`, `teal-500`, `teal-600` (main brand color)
- **Backgrounds**: `#050505`, `#111`, `#0a0a0a`, `#0d0d0d`
- **Text**: `gray-300`, `gray-400`, `gray-500`
- **Borders**: `gray-700`, `gray-800`

## Quick Theme Presets

### Purple Theme
Replace all `teal-` with `purple-`

### Blue Theme  
Replace all `teal-` with `blue-`

### Green Theme
Replace all `teal-` with `green-`

### Custom Color
Use hex values: `text-[#ff00ff]`, `bg-[#ff00ff]`, etc.



