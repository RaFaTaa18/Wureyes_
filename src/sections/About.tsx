import { useEffect, useState } from "react";
import "./About.css";
import "../styles/cinematicReveal.css";
import { useCinematicReveal } from "../hooks/useCinematicReveal";
import { clearInputError, shakeInput } from "../utils/inputShake";

interface Testimonial {
  id: number;
  client_name: string;
  client_role: string | null;
  message: string;
  rating: number;
  image_url: string | null;
}

export default function About() {
  const sectionRef = useCinematicReveal<HTMLElement>();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  async function submitTestimonial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_role: clientRole,
          message,
          rating: Number(rating),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Testimonial gagal dikirim.");
      }
      setTestimonials((current) => [
        result.data as Testimonial,
        ...current.filter((item) => item.id !== result.data.id),
      ]);
      setClientName("");
      setClientRole("");
      setMessage("");
      setRating("5");
      setSubmitSuccess("Terima kasih! Testimonial kamu berhasil disimpan dan langsung tampil.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Testimonial gagal dikirim. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }
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
    <section id="about" className="about-section" ref={sectionRef}>
      <div className="about-intro" data-cinematic-stagger>
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
        <div className="about-statement" data-cinematic-reveal>
          <span>OUR APPROACH</span>

          <p>
            We combine authentic moments, thoughtful
            composition, and intentional editing to create
            visuals that feel natural, personal, and
            memorable.
          </p>
        </div>

        <div className="about-values" data-cinematic-stagger>
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

      <div className="testimonial-section" data-cinematic-reveal>
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
          <div className="testimonial-grid" data-cinematic-stagger>
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

        <div className="testimonial-submit" data-cinematic-reveal>
          <div className="testimonial-submit-heading">
            <p>SHARE YOUR EXPERIENCE</p>
            <h4>Ceritakan pengalamanmu.</h4>
            <span>Masukan kamu membantu client lain mengenal Wureyes_.</span>
          </div>

          <form
            className="testimonial-form"
            onSubmit={submitTestimonial}
            onInvalidCapture={(event) => shakeInput(event.target)}
            onInputCapture={(event) => clearInputError(event.target)}
            onChangeCapture={(event) => clearInputError(event.target)}
          >
            <div className="testimonial-form-row">
              <label>
                Nama *
                <input type="text" value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={80} autoComplete="name" placeholder="Nama kamu" required />
              </label>
              <label>
                Keterangan (opsional)
                <input type="text" value={clientRole} onChange={(event) => setClientRole(event.target.value)} maxLength={100} placeholder="Contoh: Client Graduation" />
              </label>
            </div>

            <label>
              Rating *
              <select value={rating} onChange={(event) => setRating(event.target.value)} required>
                <option value="5">★★★★★ — Sangat puas</option>
                <option value="4">★★★★☆ — Puas</option>
                <option value="3">★★★☆☆ — Cukup</option>
                <option value="2">★★☆☆☆ — Kurang puas</option>
                <option value="1">★☆☆☆☆ — Tidak puas</option>
              </select>
            </label>

            <label>
              Testimonial *
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Ceritakan pengalaman kamu menggunakan layanan Wureyes_..." required />
              <span className="testimonial-character-count">{message.length}/1000 karakter</span>
            </label>

            {submitError && <p className="testimonial-form-error" role="alert">{submitError}</p>}
            {submitSuccess && <p className="testimonial-form-success" role="status">{submitSuccess}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim Testimonial"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}