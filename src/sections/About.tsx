import { useEffect, useState } from "react";
import "./About.css";

interface Testimonial {
  id: number;
  client_name: string;
  client_role: string | null;
  message: string;
  rating: number;
  image_url: string | null;
}

export default function About() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    fetch(`${API_URL}/api/testimonials`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setTestimonials(result.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load testimonials:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section id="about" className="about-section">
      <div className="about-intro">
        <div>
          <p className="about-label">ABOUT WUREYES_</p>

          <h2>
            More than
            <br />
            <span>just a frame.</span>
          </h2>
        </div>

        <p className="about-description">
          Wureyes_ is a visual creative studio focused on
          photography, videography, and editing. We believe
          every frame has a story — and every story deserves
          to be seen.
        </p>
      </div>

      <div className="about-content">
        <div className="about-statement">
          <span>OUR APPROACH</span>

          <p>
            We combine authentic moments, thoughtful
            composition, and intentional editing to create
            visuals that feel natural, personal, and
            memorable.
          </p>
        </div>

        <div className="about-values">
          <div>
            <span>01</span>
            <h3>Authentic</h3>
            <p>
              Real moments over forced poses. We focus on
              capturing genuine emotions.
            </p>
          </div>

          <div>
            <span>02</span>
            <h3>Intentional</h3>
            <p>
              Every frame, movement, and edit is created
              with purpose.
            </p>
          </div>

          <div>
            <span>03</span>
            <h3>Personal</h3>
            <p>
              Your story is unique, so our visual approach
              adapts to you.
            </p>
          </div>
        </div>
      </div>

      <div className="testimonial-section">
        <div className="testimonial-heading">
          <p>CLIENT STORIES</p>
          <h3>What they say.</h3>
        </div>

        {loading ? (
          <p className="testimonial-loading">
            Loading testimonials...
          </p>
        ) : testimonials.length === 0 ? (
          <div className="testimonial-empty">
            <p>Testimonials coming soon.</p>
          </div>
        ) : (
          <div className="testimonial-grid">
            {testimonials.map((testimonial) => (
              <article
                className="testimonial-card"
                key={testimonial.id}
              >
                <div className="testimonial-rating">
                  {"★".repeat(
                    Math.min(testimonial.rating, 5)
                  )}
                </div>

                <p className="testimonial-message">
                  “{testimonial.message}”
                </p>

                <div className="testimonial-client">
                  {testimonial.image_url ? (
                    <img
                      src={testimonial.image_url}
                      alt={testimonial.client_name}
                    />
                  ) : (
                    <div className="testimonial-avatar">
                      {testimonial.client_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <strong>
                      {testimonial.client_name}
                    </strong>

                    {testimonial.client_role && (
                      <span>
                        {testimonial.client_role}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}