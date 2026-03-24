import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 20px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 48, fontWeight: 900, color: "#e8e8f0", marginBottom: 8 }}>404</h1>
      <p style={{ color: "#7a7a90", fontSize: 16, marginBottom: 24 }}>Strona nie została znaleziona.</p>
      <Link to="/" style={{ color: "#42b4f5", textDecoration: "none", fontSize: 15 }}>&larr; Powrot do strony glownej</Link>
    </div>
  );
}
