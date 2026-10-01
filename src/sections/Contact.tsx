import {
  useState,
  type FormEvent,
} from "react";
import "./Contact.css";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}
const API_URL = import.meta.env.VITE_API_URL || "";
export default function Contact() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState({
    type: "",
    message: "",
  });

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setSubmitting(true);

    setStatus({
      type: "",
      message: "",
    });

    try {
      const response = await fetch(
        `${API_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to send message."
        );
      }

      setStatus({
        type: "success",
        message:
          "Your message has been sent successfully. We'll get back to you soon.",
      });

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact error:", error);

      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">

        <div className="contact-heading">
          <p className="contact-label">GET IN TOUCH</p>

          <h2>
            Let's create
            <br />
            <span>something.</span>
          </h2>

          <p className="contact-description">
            Have a project in mind, want to collaborate,
            or simply want to say hello? Send us a message.
          </p>

          <div className="contact-details">
            <div>
              <span>EMAIL</span>
              <a href="mailto:rafatacraft@gmail.com">
                rafatacraft@gmail.com
              </a>
            </div>

            <div>
              <span>INSTAGRAM</span>
              <a
                href="https://instagram.com/wureyes_"
                target="_blank"
                rel="noreferrer"
              >
                @wureyes_
              </a>
            </div>

            <div> <span>TIKTOK</span>
            <a href="https://www.tiktok.com/@wureyes_" 
              target="_blank" 
              rel="noreferrer" 
              >
                 @wureyes_ </a> </div>
          </div>
        </div>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="name">Name *</label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>

            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="What's this about?"
              value={form.subject}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>

            <textarea
              id="message"
              name="message"
              rows={7}
              placeholder="Tell us what you have in mind..."
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>

          {status.message && (
            <div
              className={`contact-status ${status.type}`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            className="contact-submit"
            disabled={submitting}
          >
            {submitting
              ? "Sending..."
              : "Send Message →"}
          </button>
        </form>

      </div>
    </section>
  );
}