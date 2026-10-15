import { useEffect, useMemo, useRef, useState } from "react";
import "./Services.css";

interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string | null;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef<HTMLElement | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setServices(result.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load services:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const servicesPerPage = 3;
  const servicePages = useMemo(() => {
    const pages: Service[][] = [];
    for (let index = 0; index < services.length; index += servicesPerPage) {
      pages.push(services.slice(index, index + servicesPerPage));
    }
    return pages;
  }, [services]);
  const totalPages = Math.max(1, servicePages.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const section = sectionRef.current;

    if (
      !section ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const targets = section.querySelectorAll<HTMLElement>(
      ".section-heading, .service-card",
    );

    targets.forEach((target) => target.classList.add("reveal-ready"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [services, loading]);

  return (
    <section
      id="services"
      className="services-section"
      ref={sectionRef}
    >
      <div className="section-heading">
        <p>WHAT WE DO</p>
        <h2>Our Services</h2>
      </div>

      {loading ? (
        <p className="loading">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="loading">No services available right now.</p>
      ) : (
        <>
          <div className="t-page-slide services-page-slide" data-page={currentPage}>
            {servicePages.map((pageServices, index) => {
              const pageNumber = index + 1;
              return (
                <section
                  className="t-page services-page"
                  data-page-id={pageNumber}
                  aria-label={`Services page ${pageNumber}`}
                  aria-hidden={currentPage !== pageNumber}
                  key={pageNumber}
                >
                  <div className="services-grid">
                    {pageServices.map((service) => (
                      <article className="service-card" key={service.id}>
                        <div className="service-number">
                          {String(service.id).padStart(2, "0")}
                        </div>
                        <h3>{service.name}</h3>
                        <p>{service.description}</p>
                        <div className="service-bottom">
                          <span>
                            Starting from Rp{" "}
                            {Number(service.price).toLocaleString("id-ID")}
                          </span>
                          <a href="#booking">Book →</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="services-page-controls" aria-label="Services pages">
              <button
                type="button"
                className="services-page-arrow"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="Previous services page"
              >
                <span aria-hidden="true">←</span> Previous
              </button>
              <span className="services-page-count" aria-live="polite">
                <span>{String(currentPage).padStart(2, "0")}</span>
                <span className="services-page-divider">/</span>
                {String(totalPages).padStart(2, "0")}
              </span>
              <button
                type="button"
                className="services-page-arrow"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next services page"
              >
                Next <span aria-hidden="true">→</span>
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
