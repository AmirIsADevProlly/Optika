const themes = {
  industrial: {
    name: 'Industrial',
    desc: 'Dark earth tones — the original',
    colors: {
      '--bg-deep': '#1A1814',
      '--bg-surface': '#23201B',
      '--bg-elevated': '#2D2A24',
      '--bg-card': '#332F28',
      '--bg-input': '#1A1814',
      '--border-hard': '#4A4538',
      '--border-subtle': '#3A3630',
      '--border-accent': '#B45309',
      '--text-primary': '#E8E0D4',
      '--text-secondary': '#A69E8E',
      '--text-muted': '#6B6358',
      '--text-inverse': '#1A1814',
      '--accent-amber': '#D97706',
      '--accent-amber-bright': '#F59E0B',
    },
    preview: ['#1A1814', '#332F28', '#D97706'],
  },
  midnight: {
    name: 'Midnight',
    desc: 'Deep blue — calm focus',
    colors: {
      '--bg-deep': '#0F172A',
      '--bg-surface': '#1E293B',
      '--bg-elevated': '#273548',
      '--bg-card': '#334155',
      '--bg-input': '#0F172A',
      '--border-hard': '#475569',
      '--border-subtle': '#334155',
      '--border-accent': '#3B82F6',
      '--text-primary': '#E2E8F0',
      '--text-secondary': '#94A3B8',
      '--text-muted': '#64748B',
      '--text-inverse': '#0F172A',
      '--accent-amber': '#3B82F6',
      '--accent-amber-bright': '#60A5FA',
    },
    preview: ['#0F172A', '#334155', '#3B82F6'],
  },
  forest: {
    name: 'Forest',
    desc: 'Deep greens — natural clarity',
    colors: {
      '--bg-deep': '#0C1A14',
      '--bg-surface': '#152E22',
      '--bg-elevated': '#1A3A2B',
      '--bg-card': '#1F4533',
      '--bg-input': '#0C1A14',
      '--border-hard': '#2D5A42',
      '--border-subtle': '#244D38',
      '--border-accent': '#10B981',
      '--text-primary': '#D1FAE5',
      '--text-secondary': '#86EFAC',
      '--text-muted': '#4ADE80',
      '--text-inverse': '#0C1A14',
      '--accent-amber': '#10B981',
      '--accent-amber-bright': '#34D399',
    },
    preview: ['#0C1A14', '#1F4533', '#10B981'],
  },
  obsidian: {
    name: 'Obsidian',
    desc: 'Pure dark — high contrast',
    colors: {
      '--bg-deep': '#09090B',
      '--bg-surface': '#18181B',
      '--bg-elevated': '#27272A',
      '--bg-card': '#2E2E33',
      '--bg-input': '#09090B',
      '--border-hard': '#3F3F46',
      '--border-subtle': '#27272A',
      '--border-accent': '#A855F7',
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#A1A1AA',
      '--text-muted': '#71717A',
      '--text-inverse': '#09090B',
      '--accent-amber': '#A855F7',
      '--accent-amber-bright': '#C084FC',
    },
    preview: ['#09090B', '#2E2E33', '#A855F7'],
  },
  ember: {
    name: 'Ember',
    desc: 'Warm reds — bold energy',
    colors: {
      '--bg-deep': '#1C1210',
      '--bg-surface': '#2A1C18',
      '--bg-elevated': '#352420',
      '--bg-card': '#3F2C26',
      '--bg-input': '#1C1210',
      '--border-hard': '#5C3D32',
      '--border-subtle': '#4A322A',
      '--border-accent': '#EF4444',
      '--text-primary': '#FDE8E8',
      '--text-secondary': '#FECACA',
      '--text-muted': '#7F5450',
      '--text-inverse': '#1C1210',
      '--accent-amber': '#EF4444',
      '--accent-amber-bright': '#F87171',
    },
    preview: ['#1C1210', '#3F2C26', '#EF4444'],
  },
  arctic: {
    name: 'Arctic',
    desc: 'Light mode — clean white',
    colors: {
      '--bg-deep': '#F8FAFC',
      '--bg-surface': '#FFFFFF',
      '--bg-elevated': '#F1F5F9',
      '--bg-card': '#E2E8F0',
      '--bg-input': '#FFFFFF',
      '--border-hard': '#CBD5E1',
      '--border-subtle': '#E2E8F0',
      '--border-accent': '#0EA5E9',
      '--text-primary': '#0F172A',
      '--text-secondary': '#475569',
      '--text-muted': '#94A3B8',
      '--text-inverse': '#FFFFFF',
      '--accent-amber': '#0EA5E9',
      '--accent-amber-bright': '#38BDF8',
    },
    preview: ['#F8FAFC', '#E2E8F0', '#0EA5E9'],
  },
};

export function applyTheme(themeId) {
  const theme = themes[themeId];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('optika_theme', themeId);
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('optika_theme');
  if (saved && themes[saved]) {
    applyTheme(saved);
    return saved;
  }
  return 'industrial';
}

export function getCurrentTheme() {
  return localStorage.getItem('optika_theme') || 'industrial';
}

export default themes;
