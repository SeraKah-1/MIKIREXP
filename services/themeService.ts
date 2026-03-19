
/**
 * ==========================================
 * THEME SERVICE (🎨) - REVISED (Cognitive Design & Aesthetics)
 * ==========================================
 * Mengatur palet warna total (Background, Glass, Text, Border).
 * Disusun berdasarkan prinsip kenyamanan mata, psikologi warna, dan tren estetik.
 */

export type ThemeName = 'default' | 'matcha' | 'lilac' | 'blush' | 'sky' | 'vanilla' | 'sunset' | 'midnight' | 'oled' | 'paper';

interface ThemePalette {
  name: string;
  desc: string; // Deskripsi singkat untuk UI
  vars: {
    '--app-bg': string;
    '--glass-bg': string;
    '--glass-border': string;
    '--text-main': string;
    '--text-muted': string;
    '--primary': string;
    '--mesh-c1': string;
    '--mesh-c2': string;
    '--mesh-c3': string;
  };
}

const THEMES: Record<ThemeName, ThemePalette> = {
  default: {
    name: "Focus Indigo",
    desc: "Seimbang & Tenang",
    vars: {
      '--app-bg': '#eef2ff', // Indigo 50
      '--glass-bg': 'rgba(255, 255, 255, 0.65)',
      '--glass-border': 'rgba(255, 255, 255, 0.6)',
      '--text-main': '#1e293b', // Slate 800
      '--text-muted': '#64748b', // Slate 500
      '--primary': '#4f46e5',    // Indigo 600
      '--mesh-c1': 'hsla(253,16%,7%,0.1)',
      '--mesh-c2': 'hsla(225,39%,30%,0.1)',
      '--mesh-c3': 'hsla(339,49%,30%,0.1)'
    }
  },
  lilac: {
    name: "Lilac Dreams",
    desc: "Estetik & Lembut",
    vars: {
      '--app-bg': '#faf5ff', // Purple 50
      '--glass-bg': 'rgba(255, 255, 255, 0.55)',
      '--glass-border': 'rgba(233, 213, 255, 0.6)', // Purple 200
      '--text-main': '#581c87', // Purple 900
      '--text-muted': '#7e22ce', // Purple 700
      '--primary': '#a855f7',    // Purple 500
      '--mesh-c1': 'hsla(270, 100%, 85%, 0.3)',
      '--mesh-c2': 'hsla(290, 100%, 90%, 0.3)',
      '--mesh-c3': 'hsla(250, 100%, 90%, 0.2)'
    }
  },
  blush: {
    name: "Rose Blush",
    desc: "Manis & Elegan",
    vars: {
      '--app-bg': '#fff1f2', // Rose 50
      '--glass-bg': 'rgba(255, 255, 255, 0.55)',
      '--glass-border': 'rgba(254, 205, 211, 0.6)', // Rose 200
      '--text-main': '#881337', // Rose 900
      '--text-muted': '#be123c', // Rose 700
      '--primary': '#fb7185',    // Rose 400
      '--mesh-c1': 'hsla(340, 100%, 85%, 0.2)',
      '--mesh-c2': 'hsla(320, 100%, 85%, 0.2)',
      '--mesh-c3': 'hsla(10, 100%, 90%, 0.2)'
    }
  },
  sky: {
    name: "Cloudy Sky",
    desc: "Cerah & Tenang",
    vars: {
      '--app-bg': '#f0f9ff', // Sky 50
      '--glass-bg': 'rgba(255, 255, 255, 0.65)',
      '--glass-border': 'rgba(186, 230, 253, 0.6)', // Sky 200
      '--text-main': '#0c4a6e', // Sky 900
      '--text-muted': '#0369a1', // Sky 700
      '--primary': '#38bdf8',    // Sky 400
      '--mesh-c1': 'hsla(200, 100%, 85%, 0.2)',
      '--mesh-c2': 'hsla(180, 100%, 85%, 0.2)',
      '--mesh-c3': 'hsla(220, 100%, 90%, 0.2)'
    }
  },
  vanilla: {
    name: "Vanilla Cream",
    desc: "Hangat & Cozy",
    vars: {
      '--app-bg': '#fffbeb', // Amber 50 (Creamy)
      '--glass-bg': 'rgba(255, 255, 255, 0.6)',
      '--glass-border': 'rgba(253, 230, 138, 0.5)', // Amber 200
      '--text-main': '#78350f', // Amber 900 (Brown text is very aesthetic)
      '--text-muted': '#b45309', // Amber 700
      '--primary': '#d97706',    // Amber 600
      '--mesh-c1': 'hsla(40, 100%, 85%, 0.3)',
      '--mesh-c2': 'hsla(20, 100%, 85%, 0.2)',
      '--mesh-c3': 'hsla(50, 100%, 85%, 0.2)'
    }
  },
  matcha: {
    name: "Zen Matcha",
    desc: "Rileks & Segar",
    vars: {
      '--app-bg': '#f0fdf4', // Green 50
      '--glass-bg': 'rgba(255, 255, 255, 0.6)',
      '--glass-border': 'rgba(220, 252, 231, 0.6)',
      '--text-main': '#14532d', // Green 900
      '--text-muted': '#15803d', // Green 700
      '--primary': '#059669',    // Emerald 600
      '--mesh-c1': 'hsla(140, 100%, 30%, 0.1)',
      '--mesh-c2': 'hsla(160, 100%, 40%, 0.15)',
      '--mesh-c3': 'hsla(120, 80%, 80%, 0.2)'
    }
  },
  sunset: {
    name: "Warm Sunset",
    desc: "Energi & Fokus",
    vars: {
      '--app-bg': '#fff7ed', // Orange 50
      '--glass-bg': 'rgba(255, 255, 255, 0.6)',
      '--glass-border': 'rgba(254, 215, 170, 0.6)',
      '--text-main': '#431407', // Orange 950
      '--text-muted': '#c2410c', // Orange 700
      '--primary': '#ea580c',    // Orange 600
      '--mesh-c1': 'hsla(30, 100%, 50%, 0.1)',
      '--mesh-c2': 'hsla(10, 100%, 60%, 0.1)',
      '--mesh-c3': 'hsla(45, 100%, 80%, 0.2)'
    }
  },
  midnight: {
    name: "Midnight Blue",
    desc: "Mode Malam",
    vars: {
      '--app-bg': '#0f172a', // Slate 900
      '--glass-bg': 'rgba(30, 41, 59, 0.75)',
      '--glass-border': 'rgba(255, 255, 255, 0.1)',
      '--text-main': '#f1f5f9', // Slate 100
      '--text-muted': '#94a3b8', // Slate 400
      '--primary': '#818cf8',    // Indigo 400
      '--mesh-c1': 'hsla(220, 50%, 5%, 0.8)',
      '--mesh-c2': 'hsla(220, 50%, 15%, 0.6)',
      '--mesh-c3': 'hsla(200, 50%, 10%, 0.6)'
    }
  },
  oled: {
    name: "OLED Black",
    desc: "Kontras Tinggi",
    vars: {
      '--app-bg': '#000000', // Pure Black
      '--glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--glass-border': 'rgba(50, 50, 50, 0.5)',
      '--text-main': '#ffffff', // Pure White
      '--text-muted': '#a3a3a3', // Neutral 400
      '--primary': '#d946ef',    // Fuchsia 500
      '--mesh-c1': 'transparent',
      '--mesh-c2': 'transparent',
      '--mesh-c3': 'hsla(300, 100%, 50%, 0.05)'
    }
  },
  paper: {
    name: "Paper Mode",
    desc: "Anti-Silau",
    vars: {
      '--app-bg': '#f5f5f0', // Warm Grey/Beige
      '--glass-bg': 'rgba(240, 240, 235, 0.8)',
      '--glass-border': 'rgba(200, 200, 190, 0.5)',
      '--text-main': '#292524', // Warm Black
      '--text-muted': '#57534e', // Stone 600
      '--primary': '#44403c',    // Stone 700
      '--mesh-c1': 'hsla(40, 20%, 90%, 0.5)',
      '--mesh-c2': 'hsla(30, 20%, 85%, 0.5)',
      '--mesh-c3': 'hsla(0, 0%, 90%, 0.1)'
    }
  }
};

const THEME_KEY = 'glassquiz_theme';

export const applyTheme = (themeName: ThemeName) => {
  const theme = THEMES[themeName] || THEMES.default;
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  localStorage.setItem(THEME_KEY, themeName);
};

export const getSavedTheme = (): ThemeName => {
  return (localStorage.getItem(THEME_KEY) as ThemeName) || 'default';
};

export const initTheme = () => {
  const saved = getSavedTheme();
  applyTheme(saved);
};

export const getThemeList = () => {
  return Object.entries(THEMES).map(([key, value]) => ({
    id: key as ThemeName,
    name: value.name,
    desc: value.desc,
    previewColor: value.vars['--app-bg'],
    textColor: value.vars['--text-main']
  }));
};
