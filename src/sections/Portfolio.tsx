import { useEffect, useState } from "react";
import "./Portfolio.css";

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
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/portfolio`);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || "Failed to load portfolio"
        );
      }

      setPortfolio(result.data || []);
    } catch (error) {
      console.error("Failed to load portfolio:", error);

      setError(
        "Unable to load portfolio. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) {
      return "";
    }

    // Jika sudah berupa URL lengkap
    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    // Jika berasal dari backend
    return `${API_URL}${imageUrl}`;
  };

  return (
    <section
      id="portfolio"
      className="portfolio-section"
    >
      <div className="portfolio-heading">
        <div>
          <p>SELECTED WORK</p>
          <h2>Portfolio</h2>
        </div>

        <p className="portfolio-intro">
          A collection of moments, stories, and visual
          experiences captured through our lens.
        </p>
      </div>

      {loading ? (
        <p className="portfolio-loading">
          Loading portfolio...
        </p>
      ) : error ? (
        <div className="portfolio-empty">
          <p>{error}</p>
        </div>
      ) : portfolio.length === 0 ? (
        <div className="portfolio-empty">
          <p>Portfolio coming soon.</p>
        </div>
      ) : (
        <div className="portfolio-grid">
          {portfolio.map((item) => (
            <article
              className="portfolio-card"
              key={item.id}
            >
              <div className="portfolio-image">
                <img
                  src={getImageUrl(item.image_url)}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => {
                    console.error(
                      "Failed to load portfolio image:",
                      getImageUrl(item.image_url)
                    );

                    event.currentTarget.style.display =
                      "none";
                  }}
                />

                <div className="portfolio-overlay">
                  <span>
                    {item.category_name}
                  </span>
                </div>
              </div>

              <div className="portfolio-info">
                <div>
                  <h3>{item.title}</h3>

                  {item.description && (
                    <p>{item.description}</p>
                  )}
                </div>

                {item.project_date && (
                  <span className="portfolio-date">
                    {new Date(
                      item.project_date
                    ).getFullYear()}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}