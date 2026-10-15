import { useEffect, useRef, useState } from "react";
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
      ) : (
        <div className="services-grid">
          {services.map((service) => (
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
      )}
    </section>
  );
}
