import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import "./PhotoSelection.css";

interface Photo {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  createdTime: string | null;
  thumbnail: string | null;
  driveUrl: string | null;
}

interface SelectedPhoto {
  id: string;
  file_name: string;
}

interface GalleryData {
  booking_id: number;
  client_name: string;
  email: string;
  phone: string;
  event_date: string;
  location: string | null;
  service_name: string;
  status: string;
  files: Photo[];
  selected: SelectedPhoto[];
}

const API_URL = import.meta.env.VITE_API_URL || "";
function getThumbnailUrl(
  photo: Photo
): string | null {
  if (!photo.id) {
    return null;
  }

  return `${API_URL}/api/google-drive/thumbnail/${encodeURIComponent(
    photo.id
  )}`;
}

export default function PhotoSelection() {
  const { token } = useParams<{
    token: string;
  }>();

  const [gallery, setGallery] =
    useState<GalleryData | null>(null);

  const [selected, setSelected] =
    useState<string[]>([]);

  const [note, setNote] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    if (!token) {
      setError("Link seleksi tidak valid.");
      setLoading(false);
      return;
    }

    async function loadGallery() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/photo-selection/${token}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Gagal mengambil foto."
          );
        }

        const data =
          result.data as GalleryData;

        setGallery(data);

        setSelected(
          (data.selected || []).map(
            (photo) => String(photo.id)
          )
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil foto."
        );
      } finally {
        setLoading(false);
      }
    }

    loadGallery();
  }, [token]);

  function togglePhoto(id: string) {
    setSuccess("");

    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [...current, id];
    });
  }

  async function submitSelection() {
    if (!token || !gallery) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const selectedPhotos =
        gallery.files.filter((photo) =>
          selected.includes(photo.id)
        );

      const response = await fetch(
        `${API_URL}/api/photo-selection/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            selected_photos:
              selectedPhotos.map(
                (photo) => ({
                  id: photo.id,
                  name: photo.name,
                  driveUrl:
                    photo.driveUrl,
                  thumbnail:
                    photo.thumbnail,
                })
              ),
            note: note.trim(),
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Gagal menyimpan pilihan foto."
        );
      }

      setSuccess(
        `Berhasil! ${selectedPhotos.length} foto telah dipilih.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim pilihan foto."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="photo-selection-page">
        <div className="photo-selection-loading">
          <div className="loading-brand">
            WUREYES
          </div>

          <div className="loading-line" />

          <p>
            Preparing your gallery...
          </p>
        </div>
      </div>
    );
  }

  if (error && !gallery) {
    return (
      <div className="photo-selection-page">
        <div className="photo-selection-error">
          <div className="error-brand">
            WUREYES
          </div>

          <div className="error-number">
            404
          </div>

          <h1>
            Galeri tidak dapat dibuka
          </h1>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return null;
  }

  const eventDate =
    new Date(
      gallery.event_date
    ).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const selectionPercentage =
    gallery.files.length > 0
      ? Math.min(
          100,
          Math.round(
            (selected.length /
              gallery.files.length) *
              100
          )
        )
      : 0;

  return (
    <div className="photo-selection-page">

      {/* TOP NAVIGATION */}
      <header className="gallery-topbar">

        <div className="gallery-logo">
          WUREYES
        </div>

        <div className="gallery-topbar-right">
          <span>
            CLIENT GALLERY
          </span>

          <span className="topbar-dot">
            •
          </span>

          <span>
            {gallery.service_name}
          </span>
        </div>

      </header>


      {/* HERO */}
      <section className="gallery-hero">

        <div className="gallery-hero-content">

          <p className="eyebrow">
            PHOTO SELECTION
          </p>

          <h1>
            Pilih Foto
            <br />
            untuk Diedit.
          </h1>

          <p className="gallery-intro">
            Halo,{" "}
            <strong>
              {gallery.client_name}
            </strong>
            . Pilih momen yang ingin
            kamu kami edit. Foto yang
            kamu pilih akan menjadi
            acuan untuk proses editing.
          </p>

        </div>

        <div className="gallery-hero-side">

          <div className="selection-big-number">
            {String(
              selected.length
            ).padStart(2, "0")}
          </div>

          <div>
            <span>
              SELECTED
            </span>

            <p>
              dari {gallery.files.length} foto
            </p>
          </div>

        </div>

      </section>


      {/* PROJECT INFO */}
      <section className="project-info">

        <div className="project-info-item">
          <span>
            CLIENT
          </span>

          <strong>
            {gallery.client_name}
          </strong>
        </div>

        <div className="project-info-item">
          <span>
            SERVICE
          </span>

          <strong>
            {gallery.service_name}
          </strong>
        </div>

        <div className="project-info-item">
          <span>
            EVENT DATE
          </span>

          <strong>
            {eventDate}
          </strong>
        </div>

        <div className="project-info-item">
          <span>
            TOTAL PHOTOS
          </span>

          <strong>
            {gallery.files.length}
          </strong>
        </div>

      </section>


      {/* INSTRUCTION */}
      <section className="selection-instruction">

        <div className="instruction-number">
          01
        </div>

        <div>
          <h2>
            Select your favorites
          </h2>

          <p>
            Klik pada foto yang ingin
            kamu pilih. Foto yang
            terpilih akan ditandai
            dengan nomor.
          </p>
        </div>

        <div className="selection-progress">

          <div className="progress-label">
            <span>
              SELECTION
            </span>

            <strong>
              {selectionPercentage}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${selectionPercentage}%`,
              }}
            />
          </div>

        </div>

      </section>


      {/* PHOTO GRID */}
      <main className="gallery-content">

        <div className="photo-grid">

          {gallery.files.map(
            (photo, index) => {

              const isSelected =
                selected.includes(
                  photo.id
                );

              const selectionIndex =
                selected.indexOf(
                  photo.id
                );

              return (
                <button
                  key={photo.id}
                  type="button"
                  className={`photo-card ${
                    isSelected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    togglePhoto(
                      photo.id
                    )
                  }
                >

                  <div className="photo-image-wrapper">

                    {getThumbnailUrl(photo) ? (
  <img
    src={getThumbnailUrl(photo)!}
    alt={photo.name}
    loading="lazy"
    onError={(event) => {
      event.currentTarget.style.display =
        "none";

      const parent =
        event.currentTarget.parentElement;

      if (parent) {
        parent.classList.add(
          "image-load-error"
        );
      }
    }}
  />
) : (
                      <div className="no-preview">
                        <span>
                          NO PREVIEW
                        </span>
                      </div>
                    )}

                    <div className="photo-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </div>

                    <div
                      className={`selection-marker ${
                        isSelected
                          ? "active"
                          : ""
                      }`}
                    >
                      {isSelected
                        ? String(
                            selectionIndex +
                              1
                          ).padStart(
                            2,
                            "0"
                          )
                        : ""}
                    </div>

                    <div className="photo-hover-label">
                      {isSelected
                        ? "REMOVE"
                        : "SELECT"}
                    </div>

                  </div>

                  <div className="photo-info">

                    <span className="photo-name">
                      {photo.name}
                    </span>

                    {isSelected && (
                      <span className="photo-selected-text">
                        SELECTED
                      </span>
                    )}

                  </div>

                </button>
              );
            }
          )}

        </div>


        {/* SUBMIT AREA */}
        <section className="photo-selection-submit">

          <div className="submit-header">

            <div className="instruction-number">
              02
            </div>

            <div>
              <p className="eyebrow">
                EDITING NOTES
              </p>

              <h2>
                Ada request khusus?
              </h2>

              <p>
                Beri tahu kami bagaimana
                kamu ingin foto-foto ini
                diproses.
              </p>
            </div>

          </div>


          <div className="editing-note-wrapper">

            <textarea
              value={note}
              onChange={(event) =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Contoh: tone warna warm, skin tone tetap natural, background dibuat lebih clean..."
              rows={6}
            />

            <span className="character-hint">
              {note.length} characters
            </span>

          </div>


          {error && (
            <div className="photo-selection-message error">
              <span>×</span>
              {error}
            </div>
          )}


          {success && (
            <div className="photo-selection-message success">
              <span>✓</span>
              {success}
            </div>
          )}


          <div className="submit-footer">

            <div className="submit-summary">

              <span>
                YOUR SELECTION
              </span>

              <strong>
                {selected.length}{" "}
                {selected.length === 1
                  ? "photo"
                  : "photos"}
              </strong>

            </div>

            <button
              type="button"
              className="photo-submit-button"
              onClick={
                submitSelection
              }
              disabled={
                submitting
              }
            >
              <span>
                {submitting
                  ? "SENDING..."
                  : "SUBMIT SELECTION"}
              </span>

              <span className="submit-arrow">
                →
              </span>
            </button>

          </div>

        </section>

      </main>


      {/* FOOTER */}
      <footer className="gallery-footer">

        <div>
          WUREYES
        </div>

        <span>
          PHOTOGRAPHY • VIDEOGRAPHY • EDITING
        </span>

        <span>
          © {new Date().getFullYear()}
        </span>

      </footer>

    </div>
  );
}