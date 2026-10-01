import { useState } from "react";
import "./Terms.css";

const termsSections = [
  {
    number: "01",
    title: "Booking & Reservation",
    content:
      "A booking is considered confirmed after the client has provided the required booking information and completed the required payment or deposit. Booking availability is based on a first-confirmed basis.",
  },
  {
    number: "02",
    title: "Payment",
    content:
      "The total service fee follows the price agreed upon at the time of booking. A deposit may be required to secure the booking date. Additional costs outside the agreed service package may be charged separately.",
  },
  {
    number: "03",
    title: "Schedule & Punctuality",
    content:
      "Clients are expected to arrive at the agreed location and time. Late arrival may reduce the available shooting time and does not automatically extend the scheduled session.",
  },
  {
    number: "04",
    title: "Rescheduling",
    content:
      "Rescheduling requests must be communicated as early as possible. A new date is subject to Wureyes' availability. Repeated or last-minute rescheduling may result in additional charges or loss of the booking deposit.",
  },
  {
    number: "05",
    title: "Cancellation & Refund",
    content:
      "Cancellation policies depend on the service and booking agreement. Deposits or booking fees may be non-refundable when they have been used to secure the production date.",
  },
  {
    number: "06",
    title: "Photo & Video Delivery",
    content:
      "Final photos and videos will be delivered through the agreed digital delivery method. Delivery time depends on the type and scope of the service and will be communicated after the production session.",
  },
  {
    number: "07",
    title: "Editing & Revision",
    content:
      "Editing is performed according to the visual direction agreed upon before production. Minor revisions may be provided according to the selected service package. Major changes may incur additional charges.",
  },
  {
    number: "08",
    title: "Client Responsibilities",
    content:
      "Clients are responsible for providing accurate information regarding the date, time, location, number of participants, special requests, references, and other information relevant to the production.",
  },
  {
    number: "09",
    title: "Copyright & Portfolio",
    content:
      "Unless otherwise agreed in writing, Wureyes retains the copyright and intellectual property rights to the photographs, videos, and creative materials produced. Wureyes may use selected work for portfolio, website, and social media purposes unless confidentiality has been requested.",
  },
  {
    number: "10",
    title: "Raw Files",
    content:
      "RAW or unedited files are not included in standard service packages unless explicitly stated in the service agreement. Requests for RAW files may be considered separately.",
  },
  {
    number: "11",
    title: "Data & Privacy",
    content:
      "Client information provided to Wureyes will be used for booking, communication, service delivery, administration, and other purposes directly related to the service.",
  },
  {
    number: "12",
    title: "Force Majeure",
    content:
      "Wureyes and the client will not be considered in breach of these terms when circumstances beyond reasonable control prevent the service from being performed. Both parties will make reasonable efforts to find an alternative solution.",
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
          ← Back to Wureyes
        </a>

        <div className="terms-hero-content">
          <p className="terms-eyebrow">WUREYES_ / INFORMATION</p>

          <h1>
            Terms
            <br />
            <span>& Conditions.</span>
          </h1>

          <p className="terms-intro">
            Please take a moment to read our terms before
            booking a Wureyes service.
          </p>
        </div>
      </section>

      <section className="terms-content">
        <div className="terms-heading">
          <p>01 — TERMS OF SERVICE</p>

          <h2>
            Clear terms.
            <br />
            Better experience.
          </h2>

          <p>
            These terms are designed to keep every project
            comfortable, transparent, and professional for
            both Wureyes and our clients.
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
          By booking with Wureyes,
          <br />
          you agree to these terms.
        </h2>

        <a href="/#booking" className="terms-button">
          Book a Session →
        </a>
      </section>
    </main>
  );
}