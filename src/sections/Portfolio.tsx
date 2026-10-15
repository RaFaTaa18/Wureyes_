import { useEffect, useRef, useState } from "react";
import "./Portfolio.css";
import "../styles/cinematicReveal.css";
import { useCinematicReveal } from "../hooks/useCinematicReveal";

interface PortfolioItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  project_date: string | null;
  featured: number | boolean;
  category_name: string;
  category_slug?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Portfolio() {
  const sectionRef = useCinematicReveal<HTMLElement>();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pointerStartX = useRef<number | null>(null);
  const suppressSlideClick = useRef(false);
  const [dragX, setDragX] = useState(0);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/portfolio`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load portfolio");
      }

      setPortfolio(result.data || []);
      setActiveIndex(0);
    } catch (error) {
      console.error("Failed to load portfolio:", error);
      setError("Unable to load portfolio. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    return `${API_URL}${imageUrl}`;
  };

  const goTo = (index: number) => {
    if (portfolio.length === 0) return;
    setActiveIndex((index + portfolio.length) % portfolio.length);
  };

  const getOffset = (index: number) => {
    const count = portfolio.length;
    if (count < 2) return 0;

    let offset = (index - activeIndex + count) % count;
    if (offset > count / 2) offset -= count;
    return offset;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartX.current = event.clientX;
    suppressSlideClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;

    const distance = event.clientX - pointerStartX.current;
    setDragX(distance);

    if (Math.abs(distance) > 8) {
      suppressSlideClick.current = true;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;

    const distance = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    setDragX(0);

    if (Math.abs(distance) > 45) {
      goTo(activeIndex + (distance < 0 ? 1 : -1));
    }
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
    setDragX(0);
  };

  const activeItem = portfolio[activeIndex];

  return (
    <section id="portfolio" className="portfolio-section" ref={sectionRef}>
      <div className="portfolio-heading" data-cinematic-stagger>
        <div>
          <p>SELECTED WORK</p>
          <h2>Portfolio</h2>
        </div>

        <p className="portfolio-intro">
          A collection of moments, stories, and visual experiences captured through our lens.
        </p>
      </div>

      {loading ? (
        <p className="portfolio-loading">Loading portfolio...</p>
      ) : error ? (
        <div className="portfolio-empty">
          <p>{error}</p>
        </div>
      ) : portfolio.length === 0 ? (
        <div className="portfolio-empty">
          <p>Portfolio coming soon.</p>
        </div>
      ) : (
        <>
          <div
            className="portfolio-carousel"
            data-cinematic-reveal
            aria-label="Portfolio carousel. Swipe or use the arrows to browse projects."
          >
            <div
              className={`portfolio-carousel-stage${pointerStartX.current !== null ? " is-dragging" : ""}`}
              style={{ "--drag-offset": `${dragX}px` } as React.CSSProperties}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handlePointerCancel}
            >
              {portfolio.map((item, index) => {
                const offset = getOffset(index);
                const isActive = offset === 0;

                return (
                  <button
                    type="button"
                    className={`portfolio-slide${isActive ? " is-active" : ""}`}
                    key={item.id}
                    style={{
                      "--slide-offset": offset,
                      "--slide-distance": Math.abs(offset),
                    } as React.CSSProperties}
                    onClick={() => {
                      if (suppressSlideClick.current) {
                        suppressSlideClick.current = false;
                        return;
                      }
                      goTo(index);
                    }}
                    aria-label={`Show ${item.title}`}
                    aria-current={isActive ? "true" : undefined}
                    tabIndex={Math.abs(offset) > 2 ? -1 : 0}
                  >
                    <img
                      src={getImageUrl(item.image_url)}
                      alt={item.title}
                      draggable={false}
                      loading={Math.abs(offset) <= 1 ? "eager" : "lazy"}
                      onError={(event) => {
                        console.error(
                          "Failed to load portfolio image:",
                          getImageUrl(item.image_url)
                        );
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    <span className="portfolio-slide-shade" />
                    <span className="portfolio-slide-category">
                      {item.category_name}
                    </span>
                  </button>
                );
              })}
            </div>

            {portfolio.length > 1 && (
              <div className="portfolio-carousel-controls">
                <button
                  type="button"
                  className="portfolio-carousel-arrow"
                  onClick={() => goTo(activeIndex - 1)}
                  aria-label="Previous portfolio item"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <span className="portfolio-carousel-count">
                  {String(activeIndex + 1).padStart(2, "0")}
                  <span aria-hidden="true"> / </span>
                  {String(portfolio.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  className="portfolio-carousel-arrow"
                  onClick={() => goTo(activeIndex + 1)}
                  aria-label="Next portfolio item"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>

          {activeItem && (
            <div className="portfolio-active-info" data-cinematic-reveal aria-live="polite">
              <div>
                <span className="portfolio-active-category">
                  {activeItem.category_name}
                </span>
                <h3>{activeItem.title}</h3>
                {activeItem.description && <p>{activeItem.description}</p>}
              </div>
              {activeItem.project_date && (
                <span className="portfolio-date">
                  {new Date(activeItem.project_date).getFullYear()}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
