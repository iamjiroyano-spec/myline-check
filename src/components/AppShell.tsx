import { lsStore } from "@/lib/lsStore";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  STAFF,
  defaultShift,
  getEffectiveSections,
  getShifts,
  sectionProgress,
  todayISO,
  type Slot,
} from "@/lib/lineCheck";
import {
  LayoutDashboard,
  History,
  Settings,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Flame,
  Fish,
  Salad,
  ShieldCheck,
  Soup,
  ChefHat,
  Utensils,
  Refrigerator,
  Package,
  Cake,
  Snowflake,
  Beer,
  LogOut,
  Moon,
  Sun,
  Palette,
  Check,
} from "lucide-react";

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BAR: Beer,
  NIKKEI: Fish,
  SALAD: Salad,
  "QA LINE": ShieldCheck,
  SOLTADO: Flame,
  GRILL: Flame,
  SAUTEE: Soup,
  FRYER: ChefHat,
  "STANDING CHILLER": Refrigerator,
  "DRY STORAGE": Package,
  "SWEET ELEMENTS": Cake,
  "PREP STANDING CHILLER": Refrigerator,
  "PREP FREEZER": Snowflake,
};

function useShifts() {
  const [shifts, setShifts] = useState(() => getShifts());
  useEffect(() => {
    const refresh = () => setShifts(getShifts());
    window.addEventListener("linecheck:shifts-update", refresh);
    window.addEventListener("linecheck:update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("linecheck:shifts-update", refresh);
      window.removeEventListener("linecheck:update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return shifts;
}




type Ctx = {
  date: string;
  setDate: (v: string) => void;
  shift: Slot;
  setShift: (v: Slot) => void;
  member: string;
  setMember: (v: string) => void;
  title: string;
};

export function AppShell({
  children,
  title,
  date,
  setDate,
  shift,
  setShift,
  member,
  setMember,
}: Ctx & { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar date={date} shift={shift} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          date={date}
          setDate={setDate}
          shift={shift}
          setShift={setShift}
          member={member}
          setMember={setMember}
        />
        <div className="min-w-0 flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</div>
      </div>
    </div>
  );
}

function Sidebar({ date, shift }: { date: string; shift: Slot }) {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  // Recompute progress on date/shift change and on storage updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("storage", fn);
    window.addEventListener("linecheck:update", fn);
    window.addEventListener("linecheck:scope-change", fn);
    return () => {
      window.removeEventListener("storage", fn);
      window.removeEventListener("linecheck:update", fn);
      window.removeEventListener("linecheck:scope-change", fn);
    };
  }, []);

  return (
    <aside
      className={`sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all md:flex ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2" suppressHydrationWarning>
          <BrandMark collapsed={collapsed} />
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="px-3">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={loc.pathname === "/"} collapsed={collapsed} />
        <NavItem to="/history" icon={History} label="History" active={loc.pathname === "/history"} collapsed={collapsed} />
        <NavItem to="/settings" icon={Settings} label="Settings" active={loc.pathname === "/settings"} collapsed={collapsed} />
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-6" data-tick={tick}>
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Stations
          </p>
        )}
        <ul className="space-y-0.5">
          {getEffectiveSections().map((s) => {
            const Icon = SECTION_ICONS[s.name] ?? Utensils;
            const { done, total } = sectionProgress(s.name, shift, date);
            const pct = total ? Math.round((done / total) * 100) : 0;
            const active = loc.pathname === `/section/${encodeURIComponent(s.name)}`;
            return (
              <li key={s.name}>
                <Link
                  to="/section/$name"
                  params={{ name: s.name }}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate">{s.name}</span>
                      <span className="ml-auto flex items-center gap-2" suppressHydrationWarning>
                        <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full"
                            style={{
                              width: `${pct}%`,
                              background: "var(--gradient-readiness)",
                            }}
                          />
                        </span>
                        <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <SignOutButton collapsed={collapsed} />
    </aside>
  );
}

function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (active) setEmail(data.user?.email ?? null);
      });
    });
    return () => {
      active = false;
    };
  }, []);
  const handle = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      {!collapsed && email && (
        <p className="mb-2 truncate px-2 text-[10px] text-muted-foreground" title={email}>
          {email}
        </p>
      )}
      <button
        onClick={handle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Sign out</span>}
      </button>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  collapsed,
  disabled,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  collapsed: boolean;
  disabled?: boolean;
}) {
  const cls = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "bg-foreground text-background"
      : disabled
        ? "text-muted-foreground/50 cursor-not-allowed"
        : "text-foreground hover:bg-sidebar-accent"
  }`;
  if (disabled) {
    return (
      <div className={cls}>
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{label}</span>}
      </div>
    );
  }
  return (
    <Link to={to} className={cls}>
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function TopBar({
  title,
  date,
  setDate,
  shift,
  setShift,
  member,
  setMember,
}: Ctx) {
  const shifts = useShifts();

  const dayName = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
  });
  const shortDate = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-6 py-4 backdrop-blur lg:px-10">
      <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Pill icon={<Calendar className="h-3.5 w-3.5" />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="bg-transparent text-xs font-semibold uppercase tracking-wide outline-none"
            aria-label="Date"
          />
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">
            {dayName}
          </span>
          <span className="sr-only">{shortDate}</span>
        </Pill>
        <Pill icon={<Clock className="h-3.5 w-3.5" />}>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as Slot)}
            className="bg-transparent text-xs font-semibold outline-none"
            aria-label="Shift"
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Pill>

        <Pill icon={<User className="h-3.5 w-3.5" />}>
          <TeamMemberSelect value={member} onChange={setMember} />
        </Pill>
        <ThemeToggle />
      </div>
    </header>
  );
}

const THEME_PRESETS: { id: string; label: string; swatch: [string, string, string] }[] = [
  { id: "terracotta", label: "Terracotta & Sage", swatch: ["#c4654a", "#e8a87c", "#87a878"] },
  { id: "ocean", label: "Ocean Deep", swatch: ["#0c2340", "#2d8a9e", "#5cbdb9"] },
  { id: "forest", label: "Forest & Moss", swatch: ["#1a3c2a", "#5a8a5c", "#a0c49d"] },
  { id: "indigo", label: "Midnight Indigo", swatch: ["#0a0a1a", "#1e1e5a", "#4f46e5"] },
  { id: "noir", label: "Noir & Gold", swatch: ["#0d0d0d", "#c9a84c", "#f0d78c"] },
  { id: "cloud", label: "Cloud White", swatch: ["#e8ecf1", "#94a3b8", "#3b82f6"] },
  { id: "emerald", label: "Emerald Prestige", swatch: ["#064e3b", "#0d7a5f", "#c9a84c"] },
];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [preset, setPreset] = useState("terracotta");
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [customSwatch, setCustomSwatch] = useState<[string, string, string]>([
    "#c4654a",
    "#faf8f5",
    "#87a878",
  ]);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setPreset(document.documentElement.getAttribute("data-theme") || "terracotta");
    import("@/lib/customTheme").then(({ loadCustomTheme }) => {
      const c = loadCustomTheme();
      setCustomSwatch([c.primary, c.background, c.accent]);
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-theme-menu]")) setOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  const toggleMode = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    if (next) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      const { lsStore } = await import("@/lib/lsStore");
      lsStore.setItem("linecheck:theme", next ? "dark" : "light");
      localStorage.setItem("linecheck:theme", next ? "dark" : "light");
    } catch {}
  };
  const pickPreset = async (id: string) => {
    setPreset(id);
    const root = document.documentElement;
    if (id === "terracotta") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", id);
    if (id === "custom") {
      const { loadCustomTheme, saveCustomTheme } = await import("@/lib/customTheme");
      saveCustomTheme(loadCustomTheme());
    }
    try {
      localStorage.setItem("linecheck:theme-preset", id);
    } catch {}
  };
  return (
    <div className="relative" data-theme-menu>
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Choose theme"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Palette className="h-4 w-4" />
        </button>
        <button
          onClick={toggleMode}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Theme
          </p>
          <ul className="pb-1">
            {THEME_PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => pickPreset(p.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="flex h-4 w-8 overflow-hidden rounded-full ring-1 ring-border">
                    {p.swatch.map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex-1 truncate">{p.label}</span>
                  {preset === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => pickPreset("custom")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <span className="flex h-4 w-8 overflow-hidden rounded-full ring-1 ring-border">
                  {customSwatch.map((c, i) => (
                    <span key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex-1 truncate">Custom</span>
                {preset === "custom" && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            </li>
          </ul>
          <div className="border-t border-border">
            <button
              onClick={() => {
                setOpen(false);
                setEditorOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-accent"
            >
              <Palette className="h-3.5 w-3.5" />
              Customize colors…
            </button>
          </div>
        </div>
      )}
      {editorOpen && (
        <CustomThemeEditor
          onClose={() => setEditorOpen(false)}
          onSaved={(c) => {
            setCustomSwatch([c.primary, c.background, c.accent]);
            setPreset("custom");
          }}
        />
      )}
    </div>
  );
}

function CustomThemeEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (c: { primary: string; background: string; accent: string }) => void;
}) {
  const [primary, setPrimary] = useState("#c4654a");
  const [background, setBackground] = useState("#faf8f5");
  const [accent, setAccent] = useState("#87a878");
  const [ready, setReady] = useState(false);
  const [ratios, setRatios] = useState({ primary: 0, accent: 0, text: 0 });

  useEffect(() => {
    import("@/lib/customTheme").then(({ loadCustomTheme }) => {
      const c = loadCustomTheme();
      setPrimary(c.primary);
      setBackground(c.background);
      setAccent(c.accent);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    import("@/lib/customTheme").then(({ contrastRatio, readableOn }) => {
      setRatios({
        primary: contrastRatio(readableOn(primary), primary),
        accent: contrastRatio(readableOn(accent), accent),
        text: contrastRatio(readableOn(background), background),
      });
    });
  }, [primary, background, accent, ready]);

  const save = async () => {
    const { saveCustomTheme } = await import("@/lib/customTheme");
    const c = { primary, background, accent };
    saveCustomTheme(c);
    document.documentElement.setAttribute("data-theme", "custom");
    try {
      localStorage.setItem("linecheck:theme-preset", "custom");
    } catch {}
    onSaved(c);
    onClose();
  };

  const reset = () => {
    setPrimary("#c4654a");
    setBackground("#faf8f5");
    setAccent("#87a878");
  };

  const badge = (r: number) => {
    if (r >= 7) return { label: "AAA", cls: "bg-sage/20 text-sage-deep" };
    if (r >= 4.5) return { label: "AA", cls: "bg-sage/15 text-sage-deep" };
    if (r >= 3) return { label: "AA Large", cls: "bg-accent text-accent-foreground" };
    return { label: "Low", cls: "bg-destructive/15 text-destructive" };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Custom theme editor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold tracking-tight">Custom theme</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <ColorField
            label="Primary"
            hint="Buttons, links, active states"
            value={primary}
            onChange={setPrimary}
            ratio={ratios.primary}
            badge={badge}
          />
          <ColorField
            label="Background"
            hint="Page canvas — text is chosen automatically"
            value={background}
            onChange={setBackground}
            ratio={ratios.text}
            badge={badge}
          />
          <ColorField
            label="Accent"
            hint="Highlights and secondary chips"
            value={accent}
            onChange={setAccent}
            ratio={ratios.accent}
            badge={badge}
          />

          <div
            className="rounded-xl border border-border p-3"
            style={{ background }}
          >
            <p className="text-xs font-semibold" style={{ color: primary }}>
              Live preview
            </p>
            <p className="mt-1 text-sm" style={{ color: readableTextPreview(background) }}>
              The quick brown fox jumps over the lazy dog.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: primary, color: readableTextPreview(primary) }}
              >
                Primary
              </span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: accent, color: readableTextPreview(accent) }}
              >
                Accent
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Text and icon colors are auto-derived from each color's luminance and forced to at
            least WCAG AA (4.5:1) so labels stay readable no matter what you pick.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-5 py-3">
          <button
            onClick={reset}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Apply theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function readableTextPreview(bg: string) {
  // Duplicate of readableOn to keep this component sync during preview.
  const h = bg.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(n || "000000", 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const s = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  return L > 0.5 ? "#0f172a" : "#f8fafc";
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  ratio,
  badge,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  ratio: number;
  badge: (r: number) => { label: string; cls: string };
}) {
  const b = badge(ratio);
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${b.cls}`}>
          {b.label} · {ratio.toFixed(1)}:1
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) onChange(v);
            else onChange(v);
          }}
          className="w-28 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-ring"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}

function TeamMemberSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [members, setMembers] = useState<string[]>(STAFF);
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = lsStore.getItem("linecheck:settings:staff");
        setMembers(raw ? JSON.parse(raw) : STAFF);
      } catch {
        setMembers(STAFF);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("linecheck:staff-update", refresh);
    window.addEventListener("linecheck:scope-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("linecheck:staff-update", refresh);
      window.removeEventListener("linecheck:scope-change", refresh);
    };
  }, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-xs font-semibold outline-none"
      aria-label="Team member"
    >
      <option value="">Team Member</option>
      {members.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

export function useShellState(initialTitle: string) {
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState<Slot>(defaultShift());
  const [member, setMemberState] = useState("");

  // Load member for the current (date, shift) whenever it changes.
  useEffect(() => {
    import("@/lib/lineCheck").then(({ loadMember }) => {
      setMemberState(loadMember(date, shift));
    });
  }, [date, shift]);

  // Refresh when scope changes (sign in/out) or other tabs update.
  useEffect(() => {
    const refresh = () => {
      import("@/lib/lineCheck").then(({ loadMember }) => {
        setMemberState(loadMember(date, shift));
      });
    };
    window.addEventListener("linecheck:scope-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("linecheck:scope-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [date, shift]);

  const setMember = (v: string) => {
    setMemberState(v);
    import("@/lib/lineCheck").then(({ saveMember }) => saveMember(date, shift, v));
  };

  return { date, setDate, shift, setShift, member, setMember, title: initialTitle };
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("LUMA");
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    const refresh = () => {
      try {
        setName(lsStore.getItem("linecheck:settings:brand:name") || "LUMA");
        setLogo(lsStore.getItem("linecheck:settings:brand:logo"));
      } catch {}
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("linecheck:brand-update", refresh);
    window.addEventListener("linecheck:scope-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("linecheck:brand-update", refresh);
      window.removeEventListener("linecheck:scope-change", refresh);
    };
  }, []);
  const initial = (name || "L").trim().charAt(0).toUpperCase() || "L";
  return (
    <>
      {mounted && logo ? (
        <img
          src={logo}
          alt={name}
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background text-sm font-bold">
          {initial}
        </span>
      )}
      {!collapsed && (
        <span className="text-base font-bold tracking-tight">{name}</span>
      )}
    </>
  );
}

export { SECTION_ICONS };
