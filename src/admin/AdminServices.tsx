import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import "./AdminServices.css";

interface Service {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
  detail_content?: string | null;
}

interface ServiceForm {
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
  detailTitleSuffix: string;
  detailFeatures: string;
  deliveryTitle: string;
  deliveryDescription: string;
  revisionTitle: string;
  revisionDescription: string;
  detailNotes: string;
}

const emptyForm: ServiceForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  image_url: "",
  is_active: true,
  detailTitleSuffix: "",
  detailFeatures: "",
  deliveryTitle: "",
  deliveryDescription: "",
  revisionTitle: "",
  revisionDescription: "",
  detailNotes: "",
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  const token = sessionStorage.getItem("wureyes_token");

  async function loadServices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/services`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load services"
        );
      }

      setServices(result.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load services"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function handleChange(
    field: keyof ServiceForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug:
        editingId !== null
          ? current.slug
          : generateSlug(value),
    }));
  }

  function handleEdit(service: Service) {
    setEditingId(service.id);

    setForm({
      name: service.name,
      slug: service.slug,
      description: service.description || "",
      price:
        service.price !== null
          ? String(service.price)
          : "",
      image_url: service.image_url || "",
      is_active: Boolean(service.is_active),
      ...(() => {
        try {
          const detail = service.detail_content ? JSON.parse(service.detail_content) : {};
          return {
            detailTitleSuffix: detail.titleSuffix || "",
            detailFeatures: Array.isArray(detail.features) ? detail.features.join("\n") : "",
            deliveryTitle: detail.deliveryTitle || "",
            deliveryDescription: detail.deliveryDescription || "",
            revisionTitle: detail.revisionTitle || "",
            revisionDescription: detail.revisionDescription || "",
            detailNotes: Array.isArray(detail.notes) ? detail.notes.join("\n") : "",
          };
        } catch {
          return { detailTitleSuffix: "", detailFeatures: "", deliveryTitle: "", deliveryDescription: "", revisionTitle: "", revisionDescription: "", detailNotes: "" };
        }
      })(),
    });


    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  
function resetForm() {
  setEditingId(null);
  setForm(emptyForm);
  setError("");
}


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }


    try {
      setSaving(true);
      setError("");

      
const url =
  editingId !== null
    ? `${API_URL}/api/services/${editingId}`
    : `${API_URL}/api/services`;

const method =
  editingId !== null ? "PUT" : "POST";

const formData = new FormData();

formData.append("name", form.name.trim());
formData.append("slug", form.slug.trim());
formData.append("description", form.description);
formData.append("price", form.price);
formData.append("is_active", String(form.is_active));

formData.append("image_url", form.image_url);
formData.append("detail_content", JSON.stringify({
  titleSuffix: form.detailTitleSuffix.trim(),
  features: form.detailFeatures.split("\n").map((item) => item.trim()).filter(Boolean),
  deliveryTitle: form.deliveryTitle.trim(),
  deliveryDescription: form.deliveryDescription.trim(),
  revisionTitle: form.revisionTitle.trim(),
  revisionDescription: form.revisionDescription.trim(),
  notes: form.detailNotes.split("\n").map((item) => item.trim()).filter(Boolean),
}));

const response = await fetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();


      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save service"
        );
      }

      resetForm();
      await loadServices();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save service"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/services/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete service"
        );
      }

      await loadServices();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete service"
      );
    }
  }

  return (
    <div className="services-admin">

      <div className="services-admin-header">
        <div>
          <p className="services-admin-label">
            WUREYES SERVICES
          </p>

          <h2>
            {editingId !== null
              ? "Edit Service"
              : "Add Service"}
          </h2>
        </div>

        {editingId !== null && (
          <button
            className="services-cancel-button"
            onClick={resetForm}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {error && (
        <div className="services-error">
          {error}
        </div>
      )}

      <form
        className="service-form"
        onSubmit={handleSubmit}
      >

        <div className="service-form-grid">

          <label>
            Service Name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                handleNameChange(event.target.value)
              }
              placeholder="Photography"
              required
            />
          </label>

          <label>
            Slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) =>
                handleChange(
                  "slug",
                  event.target.value
                )
              }
              placeholder="photography"
              required
            />
          </label>

          <label>
            Price
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(event) =>
                handleChange(
                  "price",
                  event.target.value
                )
              }
              placeholder="750000"
            />
          </label>


          <label className="service-description">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                handleChange(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe this service..."
              rows={5}
            />
          </label>


          <div className="service-detail-editor">
            <div className="service-detail-editor-heading">
              <p className="services-admin-label">OPTIONAL DETAIL PAGE</p>
              <p>Isi bagian ini untuk menampilkan layout detail khusus. Kosongkan jika ingin memakai tampilan standar. Untuk daftar fasilitas dan catatan, tulis satu item per baris.</p>
            </div>
            <div className="service-detail-editor-grid">
              <label>
                Judul waktu pengiriman
                <input value={form.deliveryTitle} onChange={(event) => handleChange("deliveryTitle", event.target.value)} placeholder="Waktu Pengiriman" />
              </label>
              <label>
                Deskripsi waktu pengiriman
                <textarea rows={3} value={form.deliveryDescription} onChange={(event) => handleChange("deliveryDescription", event.target.value)} placeholder="Foto dan video dikirim 7–14 hari..." />
              </label>
              <label>
                Judul ketentuan revisi
                <input value={form.revisionTitle} onChange={(event) => handleChange("revisionTitle", event.target.value)} placeholder="Revisi" />
              </label>
              <label>
                Deskripsi ketentuan revisi
                <textarea rows={3} value={form.revisionDescription} onChange={(event) => handleChange("revisionDescription", event.target.value)} placeholder="Termasuk 1 kali revisi minor..." />
              </label>
            </div>
            <label>
              Catatan (satu catatan per baris)
              <textarea rows={5} value={form.detailNotes} onChange={(event) => handleChange("detailNotes", event.target.value)} placeholder={"Permintaan revisi maksimal 3 hari...\\nProses revisi 3–5 hari..."} />
            </label>
          </div>

          <label className="service-active">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                handleChange(
                  "is_active",
                  event.target.checked
                )
              }
            />


            <span>
              Service is active
            </span>
          </label>

        </div>

        <button
          type="submit"
          className="service-submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : editingId !== null
            ? "Update Service"
            : "Add Service"}
        </button>

      </form>


      <section className="services-list">

        <div className="services-list-header">
          <div>
            <p className="services-admin-label">
              CURRENT SERVICES
            </p>

            <h2>
              Services
            </h2>
          </div>

          <span>
            {services.length} services
          </span>
        </div>

        {loading ? (
          <div className="services-loading">
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="services-empty">
            No services found.
          </div>
        ) : (
          <div className="services-table-wrapper">

            <table className="services-table">

              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {services.map((service) => (

                  <tr key={service.id}>

                    <td>
                      <div className="service-name">
                        {service.name}
                      </div>

                      <div className="service-slug">
                        /{service.slug}
                      </div>
                    </td>

                    <td>
                      {service.price !== null
                        ? `Rp ${Number(
                            service.price
                          ).toLocaleString("id-ID")}`
                        : "-"}
                    </td>

                    <td>
                      <span
                        className={
                          service.is_active
                            ? "service-status active"
                            : "service-status inactive"
                        }
                      >
                        {service.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="service-actions">

                        <button
                          onClick={() =>
                            handleEdit(service)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete"
                          onClick={() =>
                            handleDelete(service.id)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}