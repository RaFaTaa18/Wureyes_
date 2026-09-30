import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import "./AdminPortfolio.css";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type PortfolioItem = {
  id: number;
  category_id: number;
  category_name?: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  project_date: string | null;
  featured: boolean;
};

const API_URL = "http://localhost:5000";

export default function AdminPortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [featured, setFeatured] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const token = sessionStorage.getItem("wureyes_token");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    await Promise.all([
      fetchPortfolio(),
      fetchCategories(),
    ]);

    setLoading(false);
  }

  async function fetchPortfolio() {
    try {
      const response = await fetch(
        `${API_URL}/api/portfolio`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Gagal mengambil portfolio"
        );
      }

      setPortfolio(result.data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil portfolio"
      );
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch(
        `${API_URL}/api/categories`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Gagal mengambil kategori"
        );
      }

      setCategories(result.data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil kategori"
      );
    }
  }

  function resetForm() {
    setEditingId(null);
    setCategoryId("");
    setTitle("");
    setSlug("");
    setDescription("");
    setProjectDate("");
    setFeatured(false);
    setImageFile(null);
    setImagePreview("");
    setMessage("");

    const input = document.getElementById(
      "portfolio-image"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Format gambar harus JPG, JPEG, PNG, atau WEBP."
      );

      event.target.value = "";
      setImageFile(null);
      setImagePreview("");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "Ukuran gambar maksimal 5 MB."
      );

      event.target.value = "";
      setImageFile(null);
      setImagePreview("");

      return;
    }

    setMessage("");
    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  function handleEdit(item: PortfolioItem) {
    setEditingId(item.id);

    setCategoryId(
      String(item.category_id)
    );

    setTitle(item.title);
    setSlug(item.slug);
    setDescription(
      item.description || ""
    );

    setProjectDate(
      item.project_date
        ? item.project_date.substring(0, 10)
        : ""
    );

    setFeatured(
      Boolean(item.featured)
    );

    setImageFile(null);

    setImagePreview(
      item.image_url.startsWith("http")
        ? item.image_url
        : `${API_URL}${item.image_url}`
    );

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleTitleChange(
    value: string
  ) {
    setTitle(value);

    if (!editingId) {
      const generatedSlug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      setSlug(generatedSlug);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!token) {
      setMessage(
        "Session admin tidak ditemukan."
      );
      return;
    }

    if (!categoryId) {
      setMessage(
        "Silakan pilih kategori."
      );
      return;
    }

    if (!title.trim()) {
      setMessage(
        "Judul portfolio wajib diisi."
      );
      return;
    }

    if (!slug.trim()) {
      setMessage(
        "Slug portfolio wajib diisi."
      );
      return;
    }

    if (!editingId && !imageFile) {
      setMessage(
        "Silakan pilih gambar portfolio."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append(
        "category_id",
        categoryId
      );

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "slug",
        slug.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "project_date",
        projectDate
      );

      formData.append(
        "featured",
        String(featured)
      );

      if (imageFile) {
        formData.append(
          "image",
          imageFile
        );
      }

      const url = editingId
        ? `${API_URL}/api/portfolio/${editingId}`
        : `${API_URL}/api/portfolio`;

      const method = editingId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem(
          "wureyes_token"
        );

        sessionStorage.removeItem(
          "wureyes_user"
        );

        window.location.href =
          "/admin/login";

        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Gagal menyimpan portfolio"
        );
      }

      setMessage(
        editingId
          ? "Portfolio berhasil diperbarui."
          : "Portfolio berhasil ditambahkan."
      );

      resetForm();

      await fetchPortfolio();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan portfolio"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) {
      setMessage(
        "Session admin tidak ditemukan."
      );
      return;
    }

    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus portfolio ini?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/portfolio/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem(
          "wureyes_token"
        );

        sessionStorage.removeItem(
          "wureyes_user"
        );

        window.location.href =
          "/admin/login";

        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Gagal menghapus portfolio"
        );
      }

      if (editingId === id) {
        resetForm();
      }

      await fetchPortfolio();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus portfolio"
      );
    }
  }

  function getImageUrl(
    imageUrl: string
  ) {
    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    return `${API_URL}${imageUrl}`;
  }

  if (loading) {
    return (
      <section className="admin-portfolio">
        <div className="admin-portfolio-header">
          <div>
            <p>CONTENT MANAGEMENT</p>
            <h1>Portfolio</h1>
          </div>
        </div>

        <div className="empty-portfolio">
          Loading portfolio...
        </div>
      </section>
    );
  }

  return (
    <section className="admin-portfolio">
      <div className="admin-portfolio-header">
        <div>
          <p>CONTENT MANAGEMENT</p>
          <h1>
            {editingId
              ? "Edit Portfolio"
              : "Portfolio"}
          </h1>
        </div>

        {editingId && (
          <button
            type="button"
            className="cancel-button"
            onClick={resetForm}
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="portfolio-form">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Category

              <select
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Title

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  handleTitleChange(
                    event.target.value
                  )
                }
                placeholder="Golden Hour Portrait"
                required
              />
            </label>

            <label>
              Slug

              <input
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                  )
                }
                placeholder="golden-hour-portrait"
                required
              />
            </label>

            <label>
              Project Date

              <input
                type="date"
                value={projectDate}
                onChange={(event) =>
                  setProjectDate(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Portfolio Image

              <input
                id="portfolio-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={
                  handleImageChange
                }
              />

              <small
                style={{
                  color: "#777",
                  fontSize: "11px",
                  fontWeight: 400,
                }}
              >
                JPG, JPEG, PNG, WEBP ·
                Maksimal 5 MB
              </small>
            </label>

            <label className="featured-checkbox">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) =>
                  setFeatured(
                    event.target.checked
                  )
                }
              />

              <span>
                Featured Portfolio
              </span>
            </label>

            <label className="full-width">
              Description

              <textarea
                rows={5}
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Describe this project..."
              />
            </label>

            {imagePreview && (
              <div className="full-width">
                <label>
                  Image Preview
                </label>

                <div
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    maxWidth: "500px",
                    height: "280px",
                    overflow: "hidden",
                    border:
                      "1px solid #d5cec3",
                    background: "#fafafa",
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Portfolio preview"
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
          </div>

          {message && (
            <div className="portfolio-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="save-portfolio-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Portfolio"
              : "Save Portfolio"}
          </button>
        </form>
      </div>

      <div className="portfolio-list-header">
        <div>
          <p>YOUR WORK</p>
          <h2>Portfolio List</h2>
        </div>

        <span>
          {portfolio.length} project
          {portfolio.length !== 1
            ? "s"
            : ""}
        </span>
      </div>

      {portfolio.length === 0 ? (
        <div className="empty-portfolio">
          Belum ada portfolio.
        </div>
      ) : (
        <div className="portfolio-admin-grid">
          {portfolio.map((item) => (
            <article
              className="portfolio-admin-card"
              key={item.id}
            >
              <img
                src={getImageUrl(
                  item.image_url
                )}
                alt={item.title}
              />

              <div className="portfolio-admin-content">
                <div>
                  <span>
                    {item.category_name ||
                      categories.find(
                        (category) =>
                          category.id ===
                          item.category_id
                      )?.name ||
                      "PORTFOLIO"}
                  </span>
                </div>

                <h2>
                  {item.title}
                </h2>

                {item.description && (
                  <p>
                    {item.description}
                  </p>
                )}

                {item.project_date && (
                  <p>
                    {new Date(
                      item.project_date
                    ).toLocaleDateString(
                      "id-ID",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                )}

                {item.featured && (
                  <p
                    style={{
                      color: "#927658",
                      fontWeight: 700,
                      fontSize: "11px",
                      letterSpacing: "1px",
                    }}
                  >
                    FEATURED
                  </p>
                )}

                <div className="portfolio-card-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(item)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() =>
                      handleDelete(item.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}