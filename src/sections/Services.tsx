import { useEffect, useState } from "react";
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

  return (
    <section id="services" className="services-section">
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