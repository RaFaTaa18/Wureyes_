import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import Hero from "./sections/Hero";
import Services from "./sections/Services";
import Portfolio from "./sections/Portfolio";
import Booking from "./sections/Booking";
import About from "./sections/About";
import Contact from "./sections/Contact";

import AdminLogin from "./admin/AdminLogin";
import AdminResetPassword from "./admin/AdminResetPassword";
import AdminDashboard from "./admin/AdminDashboard";
import PhotoSelection from "./client/PhotoSelection";
import Terms from "./client/Terms";
import Footer from "./components/Footer";

import "./App.css";

function Website() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main > section:not(:first-child)")
    );
    const portfolioImages = Array.from(
      document.querySelectorAll<HTMLImageElement>("#portfolio .portfolio-slide img")
    );

    sections.forEach((section) => section.classList.add("scroll-reveal-section"));
    portfolioImages.forEach((image) => image.classList.add("scroll-reveal-photo"));

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      sections.forEach((section) => section.classList.add("is-scroll-visible"));
      portfolioImages.forEach((image) => image.classList.add("is-scroll-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-scroll-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -7% 0px",
      }
    );

    sections.forEach((section) => observer.observe(section));
    portfolioImages.forEach((image) => observer.observe(image));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Services />
        <Portfolio />
        <Booking />
        <About />
        <Contact />
      </main>

      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Website />} />
        <Route path="/terms" element={<Terms />} />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/reset-password"
          element={<AdminResetPassword />}
        />

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/select/:token"
          element={<PhotoSelection />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
