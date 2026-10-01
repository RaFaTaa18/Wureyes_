import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a href="/" className="footer-logo">
            WUREYES<span>_</span>
          </a>

          <p>
            Photography • Videography • Editing
          </p>

          <p className="footer-tagline">
            Creating impact, one frame at a time.
          </p>
        </div>

        <div className="footer-column">
          <p className="footer-label">NAVIGATION</p>

          <a href="/#home">Home</a>
          <a href="/#about">About</a>
          <a href="/#services">Services</a>
          <a href="/#portfolio">Portfolio</a>
          <a href="/#contact">Contact</a>
        </div>

        <div className="footer-column">
          <p className="footer-label">INFORMATION</p>

          <a href="/terms">Terms & Conditions</a>
          <a href="/#booking">Book a Session</a>
        </div>

        <div className="footer-column">
          <p className="footer-label">CONNECT</p>

          <a
            href="https://www.instagram.com/rafataa.__/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>

          <a
            href="https://github.com/RaFaTaa18"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} WUREYES_</span>

        <span>
          Pangkalpinang, Bangka Belitung
        </span>
      </div>
    </footer>
  );
}