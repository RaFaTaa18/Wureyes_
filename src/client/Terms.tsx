import { useState } from "react";
import "./Terms.css";

const termsSections = [
  {
    number: "01",
    title: "Pemesanan & Reservasi",
    content:
      "Pemesanan dianggap terkonfirmasi setelah klien memberikan informasi pemesanan yang diperlukan dan menyelesaikan pembayaran atau uang muka yang dipersyaratkan. Ketersediaan jadwal mengikuti urutan pemesanan yang telah dikonfirmasi.",
  },
  {
    number: "02",
    title: "Pembayaran",
    content:
      "Total biaya layanan mengikuti harga yang telah disepakati saat pemesanan. Uang muka dapat diwajibkan untuk mengamankan tanggal pemesanan. Biaya tambahan di luar paket layanan yang telah disepakati dapat dikenakan secara terpisah.",
  },
  {
    number: "03",
    title: "Jadwal & Ketepatan Waktu",
    content:
      "Klien diharapkan tiba di lokasi pada waktu yang telah disepakati. Keterlambatan dapat mengurangi waktu pemotretan yang tersedia dan tidak secara otomatis memperpanjang durasi sesi yang telah dijadwalkan.",
  },
  {
    number: "04",
    title: "Penjadwalan Ulang",
    content:
      "Permintaan perubahan jadwal harus disampaikan sedini mungkin. Tanggal pengganti bergantung pada ketersediaan jadwal Wureyes. Perubahan jadwal yang berulang atau dilakukan mendadak dapat dikenakan biaya tambahan atau mengakibatkan uang muka pemesanan hangus.",
  },
  {
    number: "05",
    title: "Pembatalan & Pengembalian Dana",
    content:
      "Ketentuan pembatalan bergantung pada jenis layanan dan kesepakatan pemesanan. Uang muka atau biaya pemesanan mungkin tidak dapat dikembalikan apabila telah digunakan untuk mengamankan tanggal produksi.",
  },
  {
    number: "06",
    title: "Penyerahan Foto & Video",
    content:
      "Foto dan video final akan diserahkan melalui metode pengiriman digital yang telah disepakati. Waktu penyerahan bergantung pada jenis dan cakupan layanan, serta akan diinformasikan setelah sesi produksi.",
  },
  {
    number: "07",
    title: "Penyuntingan & Revisi",
    content:
      "Penyuntingan dilakukan sesuai arahan visual yang telah disepakati sebelum produksi. Revisi ringan dapat diberikan sesuai paket layanan yang dipilih. Perubahan besar dapat dikenakan biaya tambahan.",
  },
  {
    number: "08",
    title: "Tanggung Jawab Klien",
    content:
      "Klien bertanggung jawab memberikan informasi yang akurat mengenai tanggal, waktu, lokasi, jumlah peserta, permintaan khusus, referensi, serta informasi lain yang relevan dengan proses produksi.",
  },
  {
    number: "09",
    title: "Hak Cipta & Portofolio",
    content:
      "Kecuali disepakati lain secara tertulis, Wureyes tetap memegang hak cipta dan hak kekayaan intelektual atas foto, video, serta materi kreatif yang dihasilkan. Wureyes dapat menggunakan karya tertentu untuk portofolio, situs web, dan media sosial, kecuali klien telah meminta agar karya tersebut dirahasiakan.",
  },
  {
    number: "10",
    title: "Berkas Mentah",
    content:
      "Berkas RAW atau berkas yang belum disunting tidak termasuk dalam paket layanan standar, kecuali dinyatakan secara jelas dalam kesepakatan layanan. Permintaan berkas RAW dapat dipertimbangkan secara terpisah.",
  },
  {
    number: "11",
    title: "Data & Privasi",
    content:
      "Informasi klien yang diberikan kepada Wureyes akan digunakan untuk keperluan pemesanan, komunikasi, penyediaan layanan, administrasi, serta tujuan lain yang berkaitan langsung dengan layanan.",
  },
  {
    number: "12",
    title: "Keadaan Kahar",
    content:
      "Wureyes maupun klien tidak dianggap melanggar ketentuan ini apabila keadaan di luar kendali yang wajar menghalangi pelaksanaan layanan. Kedua belah pihak akan berupaya secara wajar untuk menemukan solusi alternatif.",
  },
];

export default function Terms() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggleSection(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <main className="terms-page">
      <section className="terms-hero">
        <a href="/" className="terms-back">
          ← Kembali ke Wureyes
        </a>

        <div className="terms-hero-content">
          <p className="terms-eyebrow">WUREYES_ / INFORMASI</p>

          <h1>
            Syarat
            <br />
            <span>& Ketentuan.</span>
          </h1>

          <p className="terms-intro">
            Luangkan waktu sejenak untuk membaca ketentuan kami sebelum
            memesan layanan Wureyes.
          </p>
        </div>
      </section>

      <section className="terms-content">
        <div className="terms-heading">
          <p>01 — KETENTUAN LAYANAN</p>

          <h2>
            Ketentuan jelas.
            <br />
            Pengalaman lebih baik.
          </h2>

          <p>
            Ketentuan ini dibuat agar setiap proyek berjalan dengan nyaman,
            transparan, dan profesional bagi Wureyes maupun klien.
          </p>
        </div>

        <div className="terms-list">
          {termsSections.map((section, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                className={`terms-item ${
                  isOpen ? "is-open" : ""
                }`}
                key={section.number}
              >
                <button
                  type="button"
                  className="terms-trigger"
                  onClick={() => toggleSection(index)}
                  aria-expanded={isOpen}
                >
                  <span className="terms-number">
                    {section.number}
                  </span>

                  <span className="terms-title">
                    {section.title}
                  </span>

                  <span className="terms-icon">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="terms-answer">
                    <p>{section.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="terms-agreement">
        <p className="terms-eyebrow">WUREYES_</p>

        <h2>
          Dengan memesan layanan Wureyes,
          <br />
          Anda menyetujui ketentuan ini.
        </h2>

        <a href="/#booking" className="terms-button">
          Pesan Sesi →
        </a>
      </section>
    </main>
  );
}