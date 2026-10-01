import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import "./Booking.css";

interface Service {
  id: number;
  name: string;
  price: string;
}

interface BookingForm {
  client_name: string;
  email: string;
  phone: string;
  service_id: string;
  event_date: string;
  location: string;
  message: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Booking() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [form, setForm] = useState<BookingForm>({
    client_name: "",
    email: "",
    phone: "",
    service_id: "",
    event_date: "",
    location: "",
    message: "",
  });

  const [status, setStatus] = useState({
    type: "",
    message: "",
  });

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
        setLoadingServices(false);
      });
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
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

    setStatus({
      type: "",
      message: "",
    });

    if (!form.service_id) {
      setStatus({
        type: "error",
        message: "Please select a service.",
      });

      return;
    }

    if (!termsAccepted) {
  setStatus({
    type: "error",
    message:
      "Please agree to the Terms & Conditions before submitting your booking.",
  });

  return;
}

    setSubmitting(true);

    try {
      const response = await fetch(
  `${API_URL}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            service_id: Number(form.service_id),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to submit booking."
        );
      }

      setStatus({
        type: "success",
        message:
          "Your booking request has been submitted successfully. We will contact you soon.",
      });

      setForm({
        client_name: "",
        email: "",
        phone: "",
        service_id: "",
        event_date: "",
        location: "",
        message: "",
      });

      setTermsAccepted(false);
    } catch (error) {
      console.error("Booking error:", error);

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

  const today = new Date().toISOString().split("T")[0];

  return (
    <section id="booking" className="booking-section">
      <div className="booking-container">
        <div className="booking-intro">
          <p className="booking-label">LET'S WORK TOGETHER</p>

          <h2>
            Book your
            <br />
            <span>session.</span>
          </h2>

          <p className="booking-description">
            Tell us about your project, event, or special
            moment. We'll get back to you to discuss the
            details.
          </p>

          <div className="booking-note">
            <span>01</span>
            <p>
              Fill out the form with your event details.
            </p>
          </div>

          <div className="booking-note">
            <span>02</span>
            <p>
              We'll review your request and contact you.
            </p>
          </div>

          <div className="booking-note">
            <span>03</span>
            <p>
              Finalize the details and make it happen.
            </p>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="client_name">Name *</label>

              <input
                id="client_name"
                name="client_name"
                type="text"
                placeholder="Your name"
                value={form.client_name}
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone / WhatsApp *</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+62 xxx xxxx xxxx"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="service_id">Service *</label>

              <select
                id="service_id"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  {loadingServices
                    ? "Loading services..."
                    : "Select a service"}
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event_date">Event Date *</label>

              <input
                id="event_date"
                name="event_date"
                type="date"
                min={today}
                value={form.event_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>

              <input
                id="location"
                name="location"
                type="text"
                placeholder="Event location"
                value={form.location}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">Tell us about your project</label>

            <textarea
              id="message"
              name="message"
              rows={6}
              placeholder="Tell us about your event, concept, location, estimated duration, or anything else we should know..."
              value={form.message}
              onChange={handleChange}
            />
          </div>

          <div className="booking-terms">
  <label className="booking-terms-label">
    <input
      type="checkbox"
      checked={termsAccepted}
      onChange={(event) =>
        setTermsAccepted(event.target.checked)
      }
    />

    <span className="booking-terms-check"></span>

    <span className="booking-terms-text">
      I have read and agree to the{" "}
      <a
        href="/terms"
        target="_blank"
        rel="noreferrer"
      >
        Terms & Conditions
      </a>
      {" "}of Wureyes.
    </span>
  </label>
</div>

          {status.message && (
            <div
              className={`booking-status ${status.type}`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            className="booking-submit"
            disabled={submitting}
          >
            {submitting
              ? "Sending Request..."
              : "Send Booking Request →"}
          </button>
        </form>
      </div>
    </section>
  );
}