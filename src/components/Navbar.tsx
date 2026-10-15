import { useEffect, useState, type CSSProperties } from "react";
import "./Navbar.css";

const navigationItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [activeHref, setActiveHref] = useState(
    typeof window !== "undefined" ? window.location.hash || "#home" : "#home"
  );

  useEffect(() => {
    const syncActiveLink = () => {
      setActiveHref(window.location.hash || "#home");
    };

    window.addEventListener("hashchange", syncActiveLink);
    return () => window.removeEventListener("hashchange", syncActiveLink);
  }, []);

  const activeIndex = Math.max(
    0,
    navigationItems.findIndex((item) => item.href === activeHref)
  );

  return (
    <header className="navbar">
      <a
        href="#home"
        className="navbar-logo"
        onClick={() => setActiveHref("#home")}
      >
        WUREYES<span>_</span>
      </a>

      <nav
        className="navbar-menu"
        aria-label="Navigasi utama"
        style={{ "--active-index": activeIndex } as CSSProperties}
      >
        <span className="navbar-glider" aria-hidden="true" />
        {navigationItems.map((item) => (
          <a
            href={item.href}
            key={item.href}
            className={activeHref === item.href ? "is-active" : ""}
            aria-current={activeHref === item.href ? "location" : undefined}
            onClick={() => setActiveHref(item.href)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a href="#booking" className="navbar-button">
        Book a Session
      </a>
    </header>
  );
}
