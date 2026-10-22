import { useEffect, useMemo, useRef, useState } from "react";
import "./Services.css";

interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string | null;
  detail_content?: string | null;
}

interface ServiceDetailPreset {
  titleSuffix: string;
  features: string[];
  deliveryTitle: string;
  deliveryDescription: string;
  revisionTitle: string;
  revisionDescription: string;
  notes: string[];
}

// Optional presentation-only details. Services without a preset keep the standard layout.
// This avoids requiring new database columns or backend changes.
const SERVICE_DETAIL_PRESETS: Record<string, ServiceDetailPreset> = {};

const getServiceDetailPreset = (service: Service): ServiceDetailPreset | null => {
  if (service.detail_content) {
    try {
      const detail = JSON.parse(service.detail_content) as Partial<ServiceDetailPreset>;
      const hasContent = Boolean(
        detail.titleSuffix ||
        detail.features?.length ||
        detail.deliveryTitle ||
        detail.deliveryDescription ||
        detail.revisionTitle ||
        detail.revisionDescription ||
        detail.notes?.length
      );
      if (hasContent) {
        return {
          titleSuffix: detail.titleSuffix || "",
          features: Array.isArray(detail.features) ? detail.features : [],
          deliveryTitle: detail.deliveryTitle || "Waktu Pengiriman",
          deliveryDescription: detail.deliveryDescription || "",
          revisionTitle: detail.revisionTitle || "Revisi",
          revisionDescription: detail.revisionDescription || "",
          notes: Array.isArray(detail.notes) ? detail.notes : [],
        };
      }
    } catch {
      // Ignore invalid optional details and use the legacy presentation below.
    }
  }

  const key = (service.slug || service.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (SERVICE_DETAIL_PRESETS[key]) return SERVICE_DETAIL_PRESETS[key];

  // Support existing records whose slug is empty or differs from the service name.
  if (/bridal[-\s]?shower/i.test(service.name)) {
    return SERVICE_DETAIL_PRESETS["bridal-shower"];
  }
  return null;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) setServices(result.data);
      })
      .catch((error) => console.error("Failed to load services:", error))
      .finally(() => setLoading(false));
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
  const selectedIndex = selectedService
    ? services.findIndex((service) => service.id === selectedService.id)
    : -1;
  const detailPreset = selectedService ? getServiceDetailPreset(selectedService) : null;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const section = sectionRef.current;
    if (
      !section ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) return;

    const targets = section.querySelectorAll<HTMLElement>(
      ".section-heading, .service-card, .service-detail",
    );
    targets.forEach((target) => target.classList.add("reveal-ready"));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [services, loading, selectedService]);

  const formatPrice = (price: string) =>
    Number(price).toLocaleString("id-ID");

  return (
    <section id="services" className="services-section" ref={sectionRef}>
      <div className="section-heading">
        <p>WHAT WE DO</p>
        <h2>Our Services</h2>
      </div>

      {loading ? (
        <p className="loading">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="loading">No services available right now.</p>
      ) : selectedService ? (
        <div
          className={`service-detail${detailPreset ? " service-detail-enhanced" : ""}`}
          key={selectedService.id}
        >
          <button
            type="button"
            className="service-back"
            onClick={() => setSelectedService(null)}
          >
            <span aria-hidden="true">←</span> Back to services
          </button>

          {detailPreset ? (
            <>
              <div className="service-detail-enhanced-body">
                <div className="service-detail-main">
                  <div className="service-detail-number">
                    {String(selectedIndex + 1).padStart(2, "0")}
                  </div>
                  <h3>{selectedService.name}{detailPreset.titleSuffix ? ` | ${detailPreset.titleSuffix}` : ""}</h3>
                  <ul className="service-feature-list">
                    {detailPreset.features.map((feature) => (
                      <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>
                    ))}
                  </ul>
                </div>

                <aside className="service-detail-aside" aria-label="Delivery and revision terms">
                  <div className="service-term-card">
                    <span className="service-term-icon" aria-hidden="true">♧</span>
                    <div>
                      <h4>{detailPreset.deliveryTitle}</h4>
                      <p>{detailPreset.deliveryDescription}</p>
                    </div>
                  </div>
                  <div className="service-term-card">
                    <span className="service-term-icon" aria-hidden="true">✎</span>
                    <div>
                      <h4>{detailPreset.revisionTitle}</h4>
                      <p>{detailPreset.revisionDescription}</p>
                    </div>
                  </div>
                  <div className="service-detail-notes">
                    <h4><span aria-hidden="true">ⓘ</span> Catatan</h4>
                    <ul>
                      {detailPreset.notes.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                </aside>
              </div>

              <div className="service-detail-footer">
                <div className="service-detail-price">
                  <span>STARTING FROM</span>
                  <strong>Rp {formatPrice(selectedService.price)}</strong>
                </div>
                <a className="service-book-button" href="#booking">
                  Book This Service <span aria-hidden="true">↗</span>
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="service-detail-number">
                {String(selectedIndex + 1).padStart(2, "0")}
              </div>
              <h3>{selectedService.name}</h3>
              <p className="service-detail-description">
                {selectedService.description?.trim() ||
                  `Discover our ${selectedService.name.toLowerCase()} service, thoughtfully created to capture your story with the Wureyes visual approach.`}
              </p>
              <div className="service-detail-footer">
                <div className="service-detail-price">
                  <span>STARTING FROM</span>
                  <strong>Rp {formatPrice(selectedService.price)}</strong>
                </div>
                <a className="service-book-button" href="#booking">
                  Book This Service <span aria-hidden="true">↗</span>
                </a>
              </div>
            </>
          )}
        </div>
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
                  data-active={currentPage === pageNumber ? "true" : "false"}
                  key={pageNumber}
                >
                  <div className="services-grid">
                    {pageServices.map((service) => {
                      const serviceIndex = services.findIndex(
                        (item) => item.id === service.id,
                      );
                      return (
                        <button
                          type="button"
                          className="service-card"
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          aria-label={`View ${service.name} service details`}
                        >
                          <span className="service-card-top">
                            <span className="service-number">
                              {String(serviceIndex + 1).padStart(2, "0")}
                            </span>
                            <span className="service-card-arrow" aria-hidden="true">↗</span>
                          </span>
                          <span className="service-card-name">{service.name}</span>
                          <span className="service-card-action">Explore service</span>
                        </button>
                      );
                    })}
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
