
import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import "./Contact.css";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState({
    type: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  
const handleSubmit = async (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  const { name, email, subject, message } = form;

  const whatsappMessage = [
    "Halo Wureyes! Saya ingin menghubungi Anda melalui website.",
    "",
    `Nama: ${name.trim()}`,
    `Email: ${email.trim()}`,
    `Subject: ${subject.trim() || "-"}`,
    "",
    "Pesan:",
    message.trim(),
    "",
    "Dikirim melalui website Wureyes.",
  ].join("\n");

  const whatsappURL =
    `https://wa.me/6282183378241?text=${encodeURIComponent(
      whatsappMessage
    )}`;

  // Siapkan tab WhatsApp sebelum proses penyimpanan.
  const whatsappWindow = window.open("about:blank", "_blank");

  setSubmitting(true);
  setStatus({ type: "", message: "" });

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || ""}/api/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Pesan gagal disimpan ke database. Silakan coba lagi."
      );
    }

    if (whatsappWindow) {
      whatsappWindow.location.href = whatsappURL;
    } else {
      window.location.href = whatsappURL;
    }

    setStatus({
      type: "success",
      message:
        "Pesan berhasil disimpan. Silakan kirim melalui WhatsApp.",
    });

    setForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  } catch (error) {
    whatsappWindow?.close();

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
                @withureyes._
              </a>
            </div>

            <div>
              <span>TIKTOK</span>
              <a
                href="https://www.tiktok.com/@withureyes._"
                target="_blank"
                rel="noreferrer"
              >
                @withureyes._
              </a>
            </div>
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
            <div className={`contact-status ${status.type}`}>
              {status.message}
            </div>
          )}

          
<button
  type="submit"
  className="contact-submit"
  disabled={submitting}
>
  {submitting ? "Sending..." : "Send Message →"}
</button>

        </form>
      </div>
    </section>
  );
}
