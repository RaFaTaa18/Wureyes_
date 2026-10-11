import {
  useEffect,
  useState,
  type ChangeEvent,
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
}

interface ServiceForm {
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
}

const emptyForm: ServiceForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  image_url: "",
  is_active: true,
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

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

  
function handleImageChange(
  event: ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setError("Format gambar harus JPG, JPEG, PNG, atau WEBP.");
    event.target.value = "";
    setImageFile(null);
    setImagePreview(
      form.image_url ? getImageUrl(form.image_url) : ""
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setError("Ukuran gambar maksimal 5 MB.");
    event.target.value = "";
    setImageFile(null);
    setImagePreview(
      form.image_url ? getImageUrl(form.image_url) : ""
    );
    return;
  }

  setError("");
  setImageFile(file);
  setImagePreview(URL.createObjectURL(file));
}

function getImageUrl(imageUrl: string) {
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://")
  ) {
    return imageUrl;
  }

  return `${API_URL}${imageUrl}`;
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
    });

    setImageFile(null);

setImagePreview(
  service.image_url
    ? getImageUrl(service.image_url)
    : ""
);

const imageInput = document.getElementById(
  "service-image"
) as HTMLInputElement | null;

if (imageInput) {
  imageInput.value = "";
}

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  
function resetForm() {
  setEditingId(null);
  setForm(emptyForm);
  setImageFile(null);
  setImagePreview("");
  setError("");

  const imageInput = document.getElementById(
    "service-image"
  ) as HTMLInputElement | null;

  if (imageInput) {
    imageInput.value = "";
  }
}


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    if (editingId === null && !imageFile) {
  setError("Silakan pilih gambar layanan.");
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

if (imageFile) {
  formData.append("image", imageFile);
} else {
  // Pertahankan URL atau path gambar lama saat edit.
  formData.append("image_url", form.image_url);
}

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

          
<label>
  Service Image

  <input
    id="service-image"
    type="file"
    accept="image/jpeg,image/jpg,image/png,image/webp"
    onChange={handleImageChange}
  />

  <small
    style={{
      color: "#777",
      fontSize: "11px",
      fontWeight: 400,
    }}
  >
    JPG, JPEG, PNG, WEBP · Maksimal 5 MB
  </small>
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

            
{imagePreview && (
  <div className="service-description">
    <label>Image Preview</label>

    <div
      style={{
        marginTop: "8px",
        width: "100%",
        maxWidth: "500px",
        height: "240px",
        overflow: "hidden",
        border: "1px solid #d5cec3",
        background: "#fafafa",
      }}
    >
      <img
        src={imagePreview}
        alt="Service preview"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  </div>
)}


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