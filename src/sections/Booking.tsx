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
        message: "Silakan pilih layanan.",
      });

      return;
    }

    if (!termsAccepted) {
  setStatus({
    type: "error",
    message:
      "Silakan setujui Syarat & Ketentuan sebelum mengirim permintaan booking.",
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
          result.message || "Gagal mengirim permintaan booking."
        );
      }

      const selectedService = services.find(
        (service) => service.id === Number(form.service_id)
      );

      const whatsappMessage = `Halo Wureyes, saya ingin mengonfirmasi booking saya.

*Detail Booking*
Nama: ${form.client_name}
Email: ${form.email}
WhatsApp: ${form.phone}
Layanan: ${selectedService?.name || "-"}
Tanggal Acara: ${form.event_date}
Lokasi: ${form.location || "-"}
Detail Proyek: ${form.message || "-"}

Mohon konfirmasi, apakah untuk tanggal ${form.event_date} tersebut masih tersedia untuk booking?

Terima kasih.`;

      const whatsappUrl = `https://wa.me/6282183378241?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      window.location.href = whatsappUrl;
    } catch (error) {
      console.error("Booking error:", error);

      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan. Silakan coba lagi.",
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
          <p className="booking-label">MARI BERKOLABORASI</p>

          <h2>
            Pesan
            <br />
            <span>Sesi Anda.</span>
          </h2>

          <p className="booking-description">
            Ceritakan proyek, acara, atau momen spesial Anda. Kami akan menghubungi Anda untuk membahas detailnya.
          </p>

          <div className="booking-note">
            <span>01</span>
            <p>
              Isi formulir dengan detail acara Anda.
            </p>
          </div>

          <div className="booking-note">
            <span>02</span>
            <p>
              Kami akan meninjau permintaan Anda dan menghubungi Anda.
            </p>
          </div>

          <div className="booking-note">
            <span>03</span>
            <p>
              Mari finalisasi detailnya dan wujudkan momen Anda.
            </p>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="client_name">Nama *</label>

              <input
                id="client_name"
                name="client_name"
                type="text"
                placeholder="Nama lengkap Anda"
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
              <label htmlFor="phone">Nomor Telepon / WhatsApp *</label>

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
              <label htmlFor="service_id">Layanan *</label>

              <select
                id="service_id"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  {loadingServices
                    ? "Memuat layanan..."
                    : "Pilih layanan"}
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
              <label htmlFor="event_date">Tanggal Acara *</label>

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
              <label htmlFor="location">Lokasi</label>

              <input
                id="location"
                name="location"
                type="text"
                placeholder="Lokasi acara"
                value={form.location}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">Ceritakan tentang proyek atau acara Anda</label>

            <textarea
              id="message"
              name="message"
              rows={6}
              placeholder="Ceritakan acara, konsep, lokasi, perkiraan durasi, atau hal lain yang perlu kami ketahui..."
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
      Saya telah membaca dan menyetujui{" "}
      <a
        href="/terms"
        target="_blank"
        rel="noreferrer"
      >
        Syarat & Ketentuan
      </a>
      {" "}Wureyes.
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
              ? "Mengirim Permintaan..."
              : "Kirim Permintaan Booking →"}
          </button>
        </form>
      </div>
    </section>
  );
}