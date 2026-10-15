
import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import "./Contact.css";
import { clearInputError, shakeInput } from "../utils/inputShake";

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
    `Subjek: ${subject.trim() || "-"}`,
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
          <p className="contact-label">HUBUNGI KAMI</p>

          <h2>
            Mari ciptakan
            <br />
            <span>sesuatu.</span>
          </h2>

          <p className="contact-description">
            Punya proyek yang ingin diwujudkan, ingin berkolaborasi, atau sekadar ingin menyapa? Kirimkan pesan kepada kami.
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
          onInvalidCapture={(event) => shakeInput(event.target)}
          onInputCapture={(event) => clearInputError(event.target)}
          onChangeCapture={(event) => clearInputError(event.target)}
        >
          <div className="form-group">
            <label htmlFor="name">Nama *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Nama Anda"
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
            <label htmlFor="subject">Subjek</label>
            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="Apa topik pesan Anda?"
              value={form.subject}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Pesan *</label>
            <textarea
              id="message"
              name="message"
              rows={7}
              placeholder="Ceritakan hal yang ingin Anda sampaikan..."
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
  {submitting ? "Mengirim..." : "Kirim Pesan →"}
</button>

        </form>
      </div>
    </section>
  );
}
