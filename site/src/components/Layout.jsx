import { Link, useLocation } from "react-router-dom";
import { useUser } from "../App";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const user = useUser();

  const handleLogout = () => {
    localStorage.removeItem("smarten_user");
    window.location.reload();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          borderBottom: "1px solid #1e1e2e",
          background: "#0d0d14",
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: "#e8e8f0",
            textDecoration: "none",
            marginRight: 16,
          }}
        >
          SmartEn
        </Link>

        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "#7a7a90",
          }}
        >
          Konkurs jezyka angielskiego
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/postepy"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#7a7a90",
              textDecoration: "none",
            }}
          >
            Postepy
          </Link>
          {user && (
            <button
              onClick={handleLogout}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "#5a5a6a",
                background: "none",
                border: "1px solid #2a2a3a",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              {user.name} &times;
            </button>
          )}
        </div>
      </nav>

      <main style={{ flex: 1 }}>{children}</main>

      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          borderTop: "1px solid #1e1e2e",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "#4a4a5a",
        }}
      >
        Made by Lukasz · Created with AI
      </footer>
    </div>
  );
}
