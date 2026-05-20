// Design tokens for the Next UI system.
// Both UI versions share the same Tailwind palette; these tokens describe
// how the Next UI applies them structurally.

export const LAYOUT = {
  sidebarWidth: 'w-72',           // 288px — slightly wider than legacy 256px
  sidebarCollapsed: 'w-[72px]',
  headerHeight: 'h-16',
} as const;

export const SURFACE = {
  base: 'bg-obsidian',
  panel: 'bg-onyx',
  elevated: 'bg-charcoal',
  glass: 'bg-onyx/80 backdrop-blur-xl',
  glassPanel: 'bg-charcoal/60 backdrop-blur-md',
} as const;

export const BORDER = {
  default: 'border-border-luxury',
  subtle: 'border-white/[0.04]',
  accent: 'border-champagne/20',
  focus: 'border-champagne/40',
} as const;

export const TEXT = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  accent: 'text-champagne',
  accentLight: 'text-champagne-light',
} as const;

export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
} as const;

// Nav groups for the Next UI sidebar
export const NAV_GROUPS = [
  {
    label: 'РАБОЧАЯ ОБЛАСТЬ',
    items: [
      { key: 'nav.dashboard',   href: '/dashboard',   icon: 'LayoutDashboard' },
      { key: 'nav.bookings',    href: '/bookings',     icon: 'Calendar' },
      { key: 'nav.clients',     href: '/clients',      icon: 'Users' },
      { key: 'nav.specialists', href: '/specialists',  icon: 'Sparkles' },
      { key: 'nav.services',    href: '/services',     icon: 'Flower2' },
    ],
  },
  {
    label: 'АНАЛИТИКА',
    items: [
      { key: 'nav.analytics',   href: '/analytics',   icon: 'BarChart3' },
      { key: 'nav.sales',       href: '/sales',        icon: 'ShoppingBag' },
    ],
  },
  {
    label: 'СИСТЕМА',
    items: [
      { key: 'nav.chat',        href: '/chat',         icon: 'MessageCircle' },
      { key: 'nav.settings',    href: '/settings',     icon: 'Settings' },
    ],
  },
] as const;
