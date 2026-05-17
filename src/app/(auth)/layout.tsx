import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход — Shante Lyur',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:flex-1 flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0A0A0F 0%, #13131A 40%, #1E1E2A 100%)',
        }}
        aria-hidden="true"
      >
        {/* Decorative gradients */}
        <div
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(212,175,122,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(184,168,212,0.08) 0%, transparent 50%)',
          }}
        />

        {/* Decorative line art */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="w-96 h-96 rounded-full border border-champagne" />
          <div className="absolute w-80 h-80 rounded-full border border-champagne" />
          <div className="absolute w-64 h-64 rounded-full border border-champagne" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl luxury-gradient flex items-center justify-center shadow-champagne">
              <span className="font-serif text-3xl font-bold text-obsidian">SL</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-serif text-3xl font-medium text-text-primary tracking-tight">
                Shante Lyur
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-text-tertiary">
                Wellness Studio
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2">
            <p className="font-serif text-xl text-text-primary/80 italic leading-relaxed">
              Where Beauty Meets Excellence
            </p>
            <div className="w-12 h-px bg-champagne/40 mx-auto" />
            <p className="text-sm text-text-secondary leading-relaxed">
              Премиум-платформа для управления велнес-студией. Элегантность в каждой детали.
            </p>
          </div>

          {/* Decorative dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-champagne/30"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>

        {/* Bottom caption */}
        <div className="absolute bottom-8 text-center">
          <p className="text-xs text-text-tertiary tracking-wider uppercase">
            Premium · Elite · Luxurious
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex flex-col items-center justify-center p-8 bg-obsidian">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl luxury-gradient flex items-center justify-center">
            <span className="font-serif text-base font-bold text-obsidian">SL</span>
          </div>
          <span className="font-serif text-xl font-medium text-text-primary">Shante Lyur</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>

        <p className="mt-8 text-xs text-text-tertiary text-center">
          © {new Date().getFullYear()} Shante Lyur. Все права защищены.
        </p>
      </div>
    </div>
  );
}
