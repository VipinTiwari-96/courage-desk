import { useStore } from "../../store";

type Page =
  | "dashboard"
  | "calendar"
  | "trades"
  | "statistics"
  | "playbook"
  | "settings";

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
  onAddTrade: () => void;
}

const navItems: { page: Page; icon: string; label: string }[] = [
  { page: "dashboard", icon: "📊", label: "Dashboard" },
  { page: "calendar", icon: "📅", label: "Calendar" },
  { page: "trades", icon: "📋", label: "Trades" },
  { page: "statistics", icon: "📉", label: "Statistics" },
  { page: "playbook", icon: "📖", label: "Playbook" },
  { page: "settings", icon: "⚙️", label: "Settings" },
];

export function Sidebar({ current, onNavigate, onAddTrade }: Props) {
  const { theme, toggleTheme } = useStore();
  const isLight = theme === "light";

  return (
    <nav
      style={{
        width: "var(--nav-w)",
        minWidth: "var(--nav-w)",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <img
          src="./public/favicon/favicon-96x96.png"
          alt=""
          style={{
            height: "40px",
            width: "40px",
          }}
        />
        <div>
          <div
            style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}
          >
            Courage
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Desk
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: "12px 10px", flex: 1 }}>
        {navItems.map(({ page, icon, label }) => (
          <button
            key={page}
            className={`nav-item${current === page ? " active" : ""}`}
            onClick={() => onNavigate(page)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              color:
                current === page ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: 2,
              border: "none",
              width: "100%",
              textAlign: "left",
              background:
                current === page ? "var(--accent-glow)" : "transparent",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => {
              if (current !== page) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-card)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (current !== page) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
              }
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>
              {icon}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}
      >
        {/* Theme toggle */}
        <div className="theme-toggle-wrap">
          <span style={{ fontSize: 15 }}>{isLight ? "☀️" : "🌙"}</span>
          <span style={{ flex: 1, fontSize: 12.5 }}>
            {isLight ? "Light Mode" : "Dark Mode"}
          </span>
          <button
            className={`theme-toggle${isLight ? " on" : ""}`}
            onClick={toggleTheme}
          />
        </div>

        {/* Log Trade */}
        <button
          onClick={onAddTrade}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
            marginTop: 4,
            border: "none",
            width: "100%",
            background: "transparent",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--bg-card)";
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-secondary)";
          }}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>
            ➕
          </span>
          <span>Log Trade</span>
        </button>
      </div>
    </nav>
  );
}
