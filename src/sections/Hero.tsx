import "./Hero.css";
import "../styles/cinematicReveal.css";
import { useCinematicReveal } from "../hooks/useCinematicReveal";

export default function Hero() {
  const sectionRef = useCinematicReveal<HTMLElement>();

  return (
    <section id="home" className="hero" ref={sectionRef}>
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content" data-cinematic-stagger>
        <p className="hero-label">
          PHOTOGRAPHY • VIDEOGRAPHY • EDITING
        </p>

        <h1>
          SEE THE MOMENT.
          <br />
          <span>CREATE THE STORY.</span>
        </h1>

        <p className="hero-description">
          We capture meaningful moments through photography,
          videography, and visual storytelling.
        </p>

        <div className="hero-actions">
          <a href="#portfolio" className="hero-primary">
            Explore Portfolio
          </a>

          <a href="#booking" className="hero-secondary">
            Book a Session
          </a>
        </div>
      </div>

      <div className="hero-visual" data-cinematic-reveal aria-label="Selected Wureyes photography portfolio">
        <div className="hero-visual-orbit" aria-hidden="true" />

        <div className="hero-device hero-device-center">
          <img
            src="/wureyes-hero-center.webp"
            alt="Wisudawati berjalan di area gedung kampus"
            fetchPriority="high"
          />
        </div>

        <div className="hero-device hero-device-left">
          <img
            src="/wureyes-hero-phone-left.webp"
            alt="Detail selempang wisuda"
            fetchPriority="high"
          />
        </div>

        <div className="hero-device hero-device-right">
          <img
            src="/wureyes-hero-phone-right.webp"
            alt="Momen pasangan wisudawan dan wisudawati"
            fetchPriority="high"
          />
        </div>

        <p className="hero-handwriting hero-note-top" aria-hidden="true">
          Moments<br />People<br />Stories
        </p>
        <p className="hero-handwriting hero-note-bottom" aria-hidden="true">
          Captured with<br />Ur Eyes
        </p>
      </div>
    </section>
  );
}