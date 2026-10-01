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
import AdminDashboard from "./admin/AdminDashboard";
import PhotoSelection from "./client/PhotoSelection";
import Terms from "./client/Terms";
import Footer from "./components/Footer";

import "./App.css";

function Website() {
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
<Route
  path="/terms"
  element={<Terms />}
/>

        <Route
          path="/admin/login"
          element={<AdminLogin />}
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