  import { useEffect, useMemo, useState } from "react";
  import "./AdminBookings.css";

  interface Booking {
    id: number;
    service_id: number;
    client_name: string;
    email: string;
    phone: string;
    event_date: string;
    location: string | null;
    message: string | null;

    status:
      | "pending"
      | "confirmed"
      | "completed"
      | "cancelled";

    created_at: string;

    service_name: string;
    service_price: number | null;

    payment_status: "unpaid" | "paid";
    payment_date?: string | null;
    payment_amount?: number | null;
    
    additional_fee_amount?: number | null;
    additional_fee_description?: string | null;
    drive_folder_url?: string | null;
    edited_drive_folder_url?: string | null;
    selection_token?: string | null;
    selected_photos?: number;
  }

  interface Service {
    id: number;
    name: string;
    price: number;
  }

  interface Selection {
    id: number;
    file_id: string;
    file_name: string;
    file_url: string | null;
    thumbnail_url: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
  }

  interface SelectionData {
    booking: {
      id: number;
      client_name: string;
      email: string;
      event_date: string;
      service_name: string;
    };

    total_selected: number;
    note: string | null;
    selections: Selection[];
  }

  const API_URL = import.meta.env.VITE_API_URL || "";

  function normalizeWhatsAppNumber(phone: string) {
    const digits = phone.replace(/\D/g, "");

    if (digits.startsWith("62")) {
      return digits;
    }

    if (digits.startsWith("0")) {
      return `62${digits.slice(1)}`;
    }

    return digits;
  }

  export default function AdminBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);

    const [paymentAmounts, setPaymentAmounts] =
      useState<Record<number, string>>({});

    const [paymentDates, setPaymentDates] =
    useState<Record<number, string>>({});

    const [additionalFees, setAdditionalFees] =
    useState<Record<number, string>>({});

  const [additionalFeeDescriptions, setAdditionalFeeDescriptions] =
    useState<Record<number, string>>({});

    const [savingPayment, setSavingPayment] =
      useState<number | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [services, setServices] = useState<Service[]>([]);

  const [editingBooking, setEditingBooking] =
    useState<Booking | null>(null);

  const [editForm, setEditForm] = useState({
    client_name: "",
    email: "",
    phone: "",
    service_id: "",
    event_date: "",
    location: "",
    message: "",
  });

  const [savingEdit, setSavingEdit] = useState(false);

    const [driveUrls, setDriveUrls] =
      useState<Record<number, string>>({});

    const [savingDrive, setSavingDrive] =
      useState<number | null>(null);

    const [editedDriveUrls, setEditedDriveUrls] =
      useState<Record<number, string>>({});

    const [savingEditedDrive, setSavingEditedDrive] =
      useState<number | null>(null);

    const [selectedBooking, setSelectedBooking] =
      useState<number | null>(null);

    const [receiptBooking, setReceiptBooking] =
    useState<Booking | null>(null);

    const [selectionData, setSelectionData] =
      useState<SelectionData | null>(null);

    const [loadingSelections, setLoadingSelections] =
      useState(false);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
      useState<"all" | Booking["status"]>("all");

    const token = sessionStorage.getItem(
      "wureyes_token"
    );

    async function loadBookings() {
      if (!token) {
        setError(
          "Session expired. Please login again."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/bookings`,
          {
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

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load bookings"
          );
        }

        setBookings(result.data);

        const urls: Record<number, string> = {};
  const editedUrls: Record<number, string> = {};
  const dates: Record<number, string> = {};
  const amounts: Record<number, string> = {};
  const feeAmounts: Record<number, string> = {};
  const feeDescriptions: Record<number, string> = {};

  result.data.forEach(
    (booking: Booking) => {
      if (booking.payment_date) {
        dates[booking.id] =
          booking.payment_date.substring(0, 10);
      }

      if (
        booking.payment_amount !== null &&
        booking.payment_amount !== undefined
      ) {
        amounts[booking.id] =
          String(booking.payment_amount);
      }

      urls[booking.id] =
        booking.drive_folder_url || "";

      editedUrls[booking.id] =
        booking.edited_drive_folder_url || "";

      amounts[booking.id] =
    booking.payment_amount != null
      ? String(booking.payment_amount)
      : "";

      feeAmounts[booking.id] = String(
    booking.additional_fee_amount ?? 0
  );

  feeDescriptions[booking.id] =
    booking.additional_fee_description ?? "";
    }
  );

  setDriveUrls(urls);
  setEditedDriveUrls(editedUrls);
  setPaymentDates(dates);
  setPaymentAmounts(amounts);
  setAdditionalFees(feeAmounts);
  setAdditionalFeeDescriptions(feeDescriptions);

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load bookings"
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadServices() {
    try {
      const response = await fetch(
        `${API_URL}/api/services`
      );

      const result = await response.json();

      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      console.error(
        "Failed to load services:",
        error
      );
    }
  }

    useEffect(() => {
    loadBookings();
    loadServices();
  }, []);

    function openEditBooking(booking: Booking) {
    setEditingBooking(booking);

    setEditForm({
      client_name: booking.client_name || "",
      email: booking.email || "",
      phone: booking.phone || "",
      service_id: String(
        booking.service_id || ""
      ),
      event_date: booking.event_date
        ? booking.event_date.substring(0, 10)
        : "",
      location: booking.location || "",
      message: booking.message || "",
    });
  }

  async function saveEditBooking() {
    if (!editingBooking) {
      return;
    }

    if (!token) {
      setError(
        "Session expired. Please login again."
      );

      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${editingBooking.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            client_name:
              editForm.client_name,
            email: editForm.email,
            phone: editForm.phone,
            service_id: Number(
              editForm.service_id
            ),
            event_date:
              editForm.event_date,
            location:
              editForm.location,
            message:
              editForm.message,
          }),
        }
      );

      const result =
        await response.json();

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

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update booking"
        );
      }

      await loadBookings();

      setEditingBooking(null);

      alert(
        "Booking berhasil diperbarui."
      );
    } catch (error) {
      console.error(
        "Update booking error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update booking"
      );
    } finally {
      setSavingEdit(false);
    }
  }

    async function updateStatus(
    id: number,
    status: Booking["status"]
  ) {
    console.log("UPDATE STATUS CALLED:", id, status);

    if (!token) {
      setError(
        "Session expired. Please login again."
      );

      return;
    }

    const booking = bookings.find(
      (item) => item.id === id
    );

    if (!booking) {
      setError(
        "Booking tidak ditemukan."
      );

      return;
    }

    const previousStatus = booking.status;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${id}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update booking"
        );
      }

      setBookings(
        (current) =>
          current.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    status,
                  }
                : item
          )
      );

      /*
      * ==================================================
      * WHATSAPP - STATUS COMPLETED
      * ==================================================
      *
      * Hanya dijalankan ketika status benar-benar
      * berubah menjadi completed.
      */
      if (
        status === "completed" &&
        previousStatus !== "completed"
      ) {
        const phone =
          normalizeWhatsAppNumber(
            booking.phone
          );

        const driveUrl =
    booking.edited_drive_folder_url?.trim();

        if (!phone) {
          setError(
            "Nomor WhatsApp klien tidak tersedia."
          );

          return;
        }

        if (!driveUrl) {
          setError(
            "Status berhasil menjadi Completed, tetapi Google Drive hasil edit belum dihubungkan ke booking ini."
          );

          return;
        }

        const message = `Hi ${booking.client_name}! 👋

  Hasil foto kamu sudah selesai! ✨

  Terima kasih sudah mempercayakan momen spesial kamu kepada Wureyes. 📸

  Kamu bisa mengakses hasil foto yang sudah kami edit melalui link Google Drive berikut:

  ${driveUrl}

  ⚠️ Catatan:
  Link Google Drive ini hanya dapat diakses selama 1 minggu sejak link dikirim. Harap segera download semua file yang diperlukan sebelum masa akses berakhir ya. 🙏

  Semoga kamu suka dengan hasilnya! 🤍

  — Wureyes_`;

        const whatsappUrl =
          `https://wa.me/${phone}?text=${encodeURIComponent(
            message
          )}`;

        window.open(
          whatsappUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update booking"
      );
    }
  }

  async function updatePayment(
    bookingId: number,
    paymentStatus: "unpaid" | "paid",
    servicePrice: number | null,
    paymentDateOverride?: string,
    paymentAmountOverride?: number
  ) {
    if (!token) {
      setError(
        "Session expired. Please login again."
      );

      return;
    }

    try {
      setSavingPayment(bookingId);
      setError("");

      
  const enteredAmount = Number(
  paymentAmounts[bookingId] ?? 0
);

const amount =
  paymentStatus === "paid"
    ? (
        paymentAmountOverride != null &&
        paymentAmountOverride > 0
      )
      ? paymentAmountOverride
      : enteredAmount > 0
        ? enteredAmount
        : Number(servicePrice ?? 0)
    : null;


  const paymentDate =
    paymentStatus === "paid"
      ? paymentDateOverride ??
        paymentDates[bookingId] ??
        new Date().toISOString().slice(0, 10)
      : null;

      
  if (
    paymentStatus === "paid" &&
    (
      amount === null ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
  ) {
    setError(
      "Jumlah pembayaran harus lebih besar dari Rp0."
    );

    return;
  }

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/payment`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
    payment_status: paymentStatus,
    payment_amount: amount,
    payment_date: paymentDate,
    additional_fee_amount: Number(
    additionalFees[bookingId] ?? 0
  ),
    additional_fee_description:
      additionalFeeDescriptions[bookingId] ?? "",
  }),
        }
      );


      const result =
        await response.json();

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

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update payment"
        );
      }

      const savedPayment = result.data;

  if (!savedPayment) {
    throw new Error(
      "Data pembayaran tidak diterima dari server."
    );
  }


      setBookings((current) =>
    current.map((booking) =>
      booking.id === bookingId
        ? {
            ...booking,
            payment_status: savedPayment.payment_status,
            payment_amount: savedPayment.payment_amount,
            payment_date: savedPayment.payment_date,
            additional_fee_amount:
              savedPayment.additional_fee_amount,
            additional_fee_description:
              savedPayment.additional_fee_description,
          }
        : booking
    )
  );


  setReceiptBooking((current) =>
    current?.id === bookingId
      ? {
          ...current,
          payment_status:
            savedPayment.payment_status,
          payment_amount:
            savedPayment.payment_amount,
          payment_date:
            savedPayment.payment_date,
          additional_fee_amount:
            savedPayment.additional_fee_amount,
          additional_fee_description:
            savedPayment.additional_fee_description,
        }
      : current
  );

      setPaymentAmounts(
        (current) => ({
          ...current,
          [bookingId]:
            amount !== null
              ? String(amount)
              : "",
        })
      );

      setPaymentDates(
    (current) => ({
      ...current,
      [bookingId]:
        paymentDate || "",
    })
  );

  setAdditionalFees((current) => ({
    ...current,
    [bookingId]: String(
      savedPayment.additional_fee_amount ?? 0
    ),
  }));

  setAdditionalFeeDescriptions((current) => ({
    ...current,
    [bookingId]:
      savedPayment.additional_fee_description ?? "",
  }));

    } catch (error) {
      console.error(
        "Update payment error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update payment"
      );
    } finally {
      setSavingPayment(null);
    }
  }

    async function saveDriveFolder(
      bookingId: number
    ) {
      if (!token) {
        setError(
          "Session expired. Please login again."
        );

        return;
      }

      const driveUrl =
        driveUrls[bookingId]?.trim();

      if (!driveUrl) {
        setError(
          "Masukkan URL folder Google Drive terlebih dahulu."
        );

        return;
      }

      try {
        setSavingDrive(bookingId);
        setError("");

        const response = await fetch(
          `${API_URL}/api/photo-selection/admin/bookings/${bookingId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              drive_folder_url: driveUrl,
            }),
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

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to save Google Drive folder"
          );
        }

        setBookings(
          (current) =>
            current.map(
              (booking) =>
                booking.id === bookingId
                  ? {
                      ...booking,
                      drive_folder_url:
                        driveUrl,
                      selection_token:
                        result.data
                          ?.selection_token ||
                        booking.selection_token,
                    }
                  : booking
            )
        );

        alert(
          "Google Drive berhasil dihubungkan."
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save Google Drive folder"
        );
      } finally {
        setSavingDrive(null);
      }
    }

  async function saveEditedDriveFolder(
      bookingId: number
    ) {
      if (!token) {
        setError(
          "Session expired. Please login again."
        );

        return;
      }

      const driveUrl =
        editedDriveUrls[bookingId]?.trim();

      if (!driveUrl) {
        setError(
          "Masukkan URL folder Google Drive hasil edit terlebih dahulu."
        );

        return;
      }

      try {
        setSavingEditedDrive(bookingId);
        setError("");

        const response = await fetch(
          `${API_URL}/api/photo-selection/admin/bookings/${bookingId}/edited-drive`,
          {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              edited_drive_folder_url: driveUrl,
            }),
          }
        );

        const result =
          await response.json();

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

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to save edited Google Drive folder"
          );
        }

        setBookings(
          (current) =>
            current.map(
              (booking) =>
                booking.id === bookingId
                  ? {
                      ...booking,
                      edited_drive_folder_url:
                        driveUrl,
                    }
                  : booking
            )
        );

        setEditedDriveUrls(
          (current) => ({
            ...current,
            [bookingId]: driveUrl,
          })
        );

        alert(
          "Google Drive hasil edit berhasil dihubungkan."
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save edited Google Drive folder"
        );
      } finally {
        setSavingEditedDrive(null);
      }
    }

    async function loadSelections(
      bookingId: number
    ) {
      if (!token) {
        setError(
          "Session expired. Please login again."
        );

        return;
      }

      try {
        setLoadingSelections(true);
        setError("");
        setSelectionData(null);
        setSelectedBooking(bookingId);

        const response = await fetch(
          `${API_URL}/api/photo-selection/admin/bookings/${bookingId}/selections`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const result =
          await response.json();

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

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load photo selections"
          );
        }

        setSelectionData(
          result.data
        );
      } catch (error) {
        console.error(
          "LOAD SELECTIONS ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load photo selections"
        );

        setSelectedBooking(null);
      } finally {
        setLoadingSelections(false);
      }
    }

    function closeSelections() {
      setSelectedBooking(null);
      setSelectionData(null);
    }


    function getSelectionUrl(
      booking: Booking
    ) {
      if (!booking.selection_token) {
        return "";
      }

      return `${window.location.origin}/select/${booking.selection_token}`;
    }

    function openSelectionLink(
      booking: Booking
    ) {
      const url =
        getSelectionUrl(booking);

      if (!url) {
        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }

    async function copySelectionLink(
      booking: Booking
    ) {
      const url =
        getSelectionUrl(booking);

      if (!url) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          url
        );

        alert(
          "Link seleksi berhasil disalin."
        );
      } catch {
        setError(
          "Gagal menyalin link."
        );
      }
    }

    function formatDate(
      date: string
    ) {
      return new Date(
        date
      ).toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
    }

    function formatPrice(
      price: number | null
    ) {
      if (price === null) {
        return "-";
      }

      return `Rp ${Number(
        price
      ).toLocaleString("id-ID")}`;
    }

    function formatReceiptDate(
    date: string | null | undefined
  ) {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

    function formatCreatedAt(
      date: string
    ) {
      return new Date(
        date
      ).toLocaleString(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    const statistics = useMemo(() => {
      return {
        total: bookings.length,

        pending: bookings.filter(
          (booking) =>
            booking.status === "pending"
        ).length,

        confirmed: bookings.filter(
          (booking) =>
            booking.status === "confirmed"
        ).length,

        completed: bookings.filter(
          (booking) =>
            booking.status === "completed"
        ).length,
      };
    }, [bookings]);

    const filteredBookings =
      useMemo(() => {
        const query =
          search.trim().toLowerCase();

        return bookings.filter(
          (booking) => {
            const matchesSearch =
              !query ||
              booking.client_name
                .toLowerCase()
                .includes(query) ||
              booking.email
                .toLowerCase()
                .includes(query) ||
              booking.phone
                .toLowerCase()
                .includes(query) ||
              booking.service_name
                .toLowerCase()
                .includes(query) ||
              (
                booking.location || ""
              )
                .toLowerCase()
                .includes(query);

            const matchesStatus =
              statusFilter === "all" ||
              booking.status ===
                statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        );
      }, [
        bookings,
        search,
        statusFilter,
      ]);

    return (
      <div className="bookings-admin">

        {/* HEADER */}

        <header className="bookings-header">

          <div className="bookings-heading">

            <p className="bookings-label">
              WUREYES / CLIENT MANAGEMENT
            </p>

            <h1>
              Bookings
            </h1>

            <p className="bookings-description">
              Manage client bookings,
              photo selections and
              project workflow.
            </p>

          </div>

          <button
            type="button"
            className="bookings-refresh"
            onClick={loadBookings}
            disabled={loading}
          >
            <span>
              ↻
            </span>

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </header>


        {/* ERROR */}

        {error && (
          <div className="bookings-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}


        {/* STATISTICS */}

        {!loading && (
          <section className="booking-statistics">

            <div className="booking-stat-card">

              <span className="booking-stat-label">
                TOTAL BOOKINGS
              </span>

              <strong>
                {statistics.total}
              </strong>

              <small>
                All client requests
              </small>

            </div>


            <div className="booking-stat-card">

              <span className="booking-stat-label">
                PENDING
              </span>

              <strong>
                {statistics.pending}
              </strong>

              <small>
                Waiting for confirmation
              </small>

            </div>


            <div className="booking-stat-card">

              <span className="booking-stat-label">
                CONFIRMED
              </span>

              <strong>
                {statistics.confirmed}
              </strong>

              <small>
                Active projects
              </small>

            </div>


            <div className="booking-stat-card">

              <span className="booking-stat-label">
                COMPLETED
              </span>

              <strong>
                {statistics.completed}
              </strong>

              <small>
                Finished projects
              </small>

            </div>

          </section>
        )}


        {/* SEARCH / FILTER */}

        {!loading &&
          bookings.length > 0 && (
            <section className="bookings-toolbar">

              <div className="booking-search">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search client, email, service..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    ×
                  </button>
                )}

              </div>


              <div className="booking-filter">

                <span>
                  STATUS
                </span>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as
                        | "all"
                        | Booking["status"]
                    )
                  }
                >

                  <option value="all">
                    All bookings
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="confirmed">
                    Confirmed
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                </select>

              </div>

            </section>
          )}


        {/* RESULT INFO */}

        {!loading &&
          bookings.length > 0 && (
            <div className="bookings-result-info">

              <span>
                Showing{" "}
                <strong>
                  {filteredBookings.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {bookings.length}
                </strong>{" "}
                bookings
              </span>

            </div>
          )}


        {/* CONTENT */}

        {loading ? (

          <div className="bookings-loading">

            <div className="loading-spinner" />

            <strong>
              Loading bookings
            </strong>

            <span>
              Please wait...
            </span>

          </div>

        ) : bookings.length === 0 ? (

          <div className="bookings-empty">

            <div className="empty-icon">
              ◇
            </div>

            <strong>
              No bookings yet
            </strong>

            <p>
              New bookings submitted
              from the website will
              appear here.
            </p>

          </div>

        ) : filteredBookings.length === 0 ? (

          <div className="bookings-empty">

            <div className="empty-icon">
              ⌕
            </div>

            <strong>
              No matching bookings
            </strong>

            <p>
              Try another search
              keyword or status filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>

          </div>

        ) : (

          <div className="bookings-grid">

            {filteredBookings.map(
              (booking) => {

                const selectionUrl =
                  getSelectionUrl(
                    booking
                  );

                return (
                  <article
                    className="booking-card"
                    key={booking.id}
                  >

                    {/* CARD HEADER */}

                    <div className="booking-card-top">

                      <div className="booking-client-heading">

                        <span className="booking-id">
                          BOOKING #
                          {String(
                            booking.id
                          ).padStart(
                            3,
                            "0"
                          )}
                        </span>

                        <h2>
                          {booking.client_name}
                        </h2>

                        <p>
                          {booking.service_name}
                        </p>

                      </div>

                      <span
                        className={`booking-status ${booking.status}`}
                      >
                        <i />
                        {booking.status}
                      </span>

                    </div>


                    {/* SERVICE */}

                    <div className="booking-service">

                      <div className="booking-service-main">

                        <span>
                          SERVICE
                        </span>

                        <strong>
                          {booking.service_name}
                        </strong>

                      </div>

                      <div className="booking-price">

                        <span>
                          PROJECT VALUE
                        </span>

                        <strong>
                          {formatPrice(
                            booking.service_price
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* PAYMENT */}

  <section className="booking-payment">

    <div className="payment-heading">

      <div>
        <span>PAYMENT</span>
        <strong>Payment Information</strong>
      </div>

      <span
        className={`payment-status ${
          booking.payment_status === "paid"
            ? "paid"
            : "unpaid"
        }`}
      >
        {booking.payment_status === "paid"
          ? "LUNAS"
          : "BELUM LUNAS"}
      </span>

    </div>

    <div className="payment-info-grid">

      <div className="payment-info-item">
        <span>SERVICE</span>

        <strong>
          {booking.service_name}
        </strong>
      </div>

      <div className="payment-info-item">
        <span>HARGA</span>

        <strong>
          {formatPrice(booking.service_price)}
        </strong>
      </div>

      <div className="payment-info-item">
        <span>JUMLAH DIBAYAR</span>

        <strong>
          {formatPrice(
            booking.payment_amount ?? null
          )}
        </strong>
      </div>

      <div className="payment-info-item">
        <span>STATUS</span>

        <select
          value={
            booking.payment_status || "unpaid"
          }
          onChange={(event) => {

            const newStatus =
              event.target.value as
                | "unpaid"
                | "paid";

            if (newStatus === "paid") {
    const enteredAmount = Number(
  paymentAmounts[booking.id] ?? 0
);

const savedAmount = Number(
  booking.payment_amount ?? 0
);

const serviceAmount = Number(
  booking.service_price ?? 0
);

const amount =
  enteredAmount > 0
    ? enteredAmount
    : savedAmount > 0
      ? savedAmount
      : serviceAmount;

    const paymentDate =
      paymentDates[booking.id] ||
      booking.payment_date?.substring(0, 10) ||
      new Date().toISOString().slice(0, 10);

    setPaymentAmounts(
      (current) => ({
        ...current,
        [booking.id]:
          String(amount),
      })
    );

    setPaymentDates(
      (current) => ({
        ...current,
        [booking.id]:
          paymentDate,
      })
    );

    updatePayment(
      booking.id,
      "paid",
      booking.service_price,
      paymentDate,
      amount
    );

    return;
  }

  updatePayment(
    booking.id,
    "unpaid",
    booking.service_price
  );
          }}
          disabled={
            savingPayment === booking.id
          }
        >
          <option value="unpaid">
            Belum Lunas
          </option>

          <option value="paid">
            Lunas
          </option>
        </select>
      </div>

    </div>

    {booking.payment_status === "paid" && (

      <div className="payment-edit">

        <div>
          <span>JUMLAH PEMBAYARAN</span>

          <input
            type="number"
            min="0"
            value={
              paymentAmounts[booking.id] ??
              booking.payment_amount ??
              booking.service_price ??
              ""
            }
            onChange={(event) =>
              setPaymentAmounts(
                (current) => ({
                  ...current,
                  [booking.id]:
                    event.target.value,
                })
              )
            }
          />
        </div>

        <div>
    <span>BIAYA TAMBAHAN (RP)</span>

    <input
      type="number"
      min="0"
      value={additionalFees[booking.id] ?? "0"}
  onChange={(event) =>
    setAdditionalFees((current) => ({
      ...current,
      [booking.id]: event.target.value,
    }))
  }
      placeholder="0"
    />
  </div>

  <div>
    <span>KETERANGAN BIAYA TAMBAHAN</span>

    <input
      type="text"
      maxLength={255}
      value={additionalFeeDescriptions[booking.id] ?? ""}
      onChange={(event) =>
        setAdditionalFeeDescriptions((current) => ({
          ...current,
          [booking.id]: event.target.value,
        }))
      }
      placeholder="Contoh: Biaya transportasi"
    />
  </div>

        <div>
    <span>TANGGAL PEMBAYARAN</span>

    <input
      type="date"
      value={
        paymentDates[booking.id] ??
        booking.payment_date?.substring(0, 10) ??
        ""
      }
      onChange={(event) =>
        setPaymentDates(
          (current) => ({
            ...current,
            [booking.id]:
              event.target.value,
          })
        )
      }
    />
  </div>

        <button
          type="button"
          onClick={() =>
            updatePayment(
              booking.id,
              "paid",
              booking.service_price
            )
          }
          disabled={
            savingPayment === booking.id
          }
        >
          {savingPayment === booking.id
            ? "Saving..."
            : "Simpan Pembayaran"}
        </button>

      </div>

    )}

  </section>

                    {/* DETAILS */}

                    <div className="booking-details">

                      <div className="booking-detail">

                        <span>
                          EVENT DATE
                        </span>

                        <strong>
                          {formatDate(
                            booking.event_date
                          )}
                        </strong>

                      </div>


                      <div className="booking-detail">

                        <span>
                          LOCATION
                        </span>

                        <strong>
                          {booking.location ||
                            "Not specified"}
                        </strong>

                      </div>


                      <div className="booking-detail">

                        <span>
                          EMAIL
                        </span>

                        <strong>
                          {booking.email}
                        </strong>

                      </div>


                      <div className="booking-detail">

                        <span>
                          PHONE
                        </span>

                        <strong>
                          {booking.phone}
                        </strong>

                      </div>

                    </div>


                    {/* MESSAGE */}

                    {booking.message && (
                      <div className="booking-message">

                        <span>
                          CLIENT MESSAGE
                        </span>

                        <p>
                          {booking.message}
                        </p>

                      </div>
                    )}


                    {/* PHOTO WORKFLOW */}

                    <section className="booking-workflow">

                      <div className="workflow-heading">

                        <div>

                          <span>
                            PHOTO WORKFLOW
                          </span>

                          <strong>
                            Google Drive
                          </strong>

                        </div>

                        {booking.drive_folder_url && (
                          <span className="workflow-connected">
                            ● Connected
                          </span>
                        )}

                      </div>


                      <div className="drive-input-row">

                        <input
                          type="url"
                          placeholder="Paste Google Drive folder URL..."
                          value={
                            driveUrls[
                              booking.id
                            ] || ""
                          }
                          onChange={(event) =>
                            setDriveUrls(
                              (current) => ({
                                ...current,
                                [booking.id]:
                                  event.target
                                    .value,
                              })
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            saveDriveFolder(
                              booking.id
                            )
                          }
                          disabled={
                            savingDrive ===
                            booking.id
                          }
                        >
                          {savingDrive ===
                          booking.id
                            ? "Saving..."
                            : "Save"}
                        </button>

                      </div>

                      <div className="workflow-heading">

                        <div>

                          <span>
                            EDITED RESULTS
                          </span>

                          <strong>
                            Google Drive Hasil Edit
                          </strong>

                        </div>

                        {booking.edited_drive_folder_url && (
                          <span className="workflow-connected">
                            ● Connected
                          </span>
                        )}

                      </div>


                      <div className="drive-input-row">

                        <input
                          type="url"
                          placeholder="Paste Google Drive hasil edit URL..."
                          value={
                            editedDriveUrls[
                              booking.id
                            ] || ""
                          }
                          onChange={(event) =>
                            setEditedDriveUrls(
                              (current) => ({
                                ...current,
                                [booking.id]:
                                  event.target
                                    .value,
                              })
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            saveEditedDriveFolder(
                              booking.id
                            )
                          }
                          disabled={
                            savingEditedDrive ===
                            booking.id
                          }
                        >
                          {savingEditedDrive ===
                          booking.id
                            ? "Saving..."
                            : "Save"}
                        </button>

                      </div>



                      {selectionUrl && (
                        <div className="selection-link-box">

                          <div className="selection-link-header">

                            <div>

                              <span>
                                CLIENT SELECTION LINK
                              </span>

                              <strong>
                                Ready to share
                              </strong>

                            </div>

                            <div className="selection-link-status">
                              LIVE
                            </div>

                          </div>


                          <input
                            type="text"
                            readOnly
                            value={
                              selectionUrl
                            }
                          />


                          <div className="selection-link-actions">

                            <button
                              type="button"
                              onClick={() =>
                                openSelectionLink(
                                  booking
                                )
                              }
                            >
                              Open Link
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                copySelectionLink(
                                  booking
                                )
                              }
                            >
                              Copy Link
                            </button>

                          </div>

                        </div>
                      )}

                    </section>


                    {/* SELECTION RESULT */}

                    <div className="booking-selection-result">

                      <div>

                        <span>
                          CLIENT SELECTION
                        </span>

                        <strong>
                          Photo selections
                        </strong>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          loadSelections(
                            booking.id
                          )
                        }
                        disabled={
                          loadingSelections &&
                          selectedBooking ===
                            booking.id
                        }
                      >
                        {loadingSelections &&
                        selectedBooking ===
                          booking.id
                          ? "Loading..."
                          : "View Selection"}
                      </button>

                    </div>


                    {/* FOOTER */}

                    <div className="booking-footer">

                      <div className="booking-created">

                        <span>
                          SUBMITTED
                        </span>

                        <small>
                          {formatCreatedAt(
                            booking.created_at
                          )}
                        </small>

                      </div>

                      <button
    type="button"
    className="booking-edit-button"
    onClick={() =>
      openEditBooking(booking)
    }
  >
    ✎ Edit
  </button>

  <button
    type="button"
    className="booking-receipt-button"
    onClick={() => setReceiptBooking(booking)}
  >
    ⎙ Nota Pembayaran
  </button>



                      <div className="booking-status-control">

                        <span>
                          STATUS
                        </span>

                        <select
                          value={
                            booking.status
                          }
                          onChange={(event) =>
                            updateStatus(
                              booking.id,
                              event.target
                                .value as Booking["status"]
                            )
                          }
                        >

                          <option value="pending">
                            Pending
                          </option>

                          <option value="confirmed">
                            Confirmed
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                          <option value="cancelled">
                            Cancelled
                          </option>

                        </select>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

  {/* PAYMENT RECEIPT MODAL */}

  {receiptBooking && (
    <div
      className="receipt-modal-overlay"
      onClick={() =>
        setReceiptBooking(null)
      }
    >
      <div
        className="receipt-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="receipt-modal-header">

          <div>
            <span>PAYMENT RECEIPT</span>

            <h2>
              Nota Pembayaran
            </h2>
          </div>

          <button
            type="button"
            className="receipt-close-button"
            onClick={() =>
              setReceiptBooking(null)
            }
          >
            ×
          </button>

        </div>

        <div className="payment-receipt">

          <div className="receipt-brand">
            <div className="receipt-brand-name">
              Wureyes_
            </div>

            <div className="receipt-brand-subtitle">
              PHOTOGRAPHY • VIDEOGRAPHY • EDITING
            </div>
          </div>

          <div className="receipt-title">
            <span>PAYMENT RECEIPT</span>

            <h1>
              Nota Pembayaran
            </h1>
          </div>

          <div className="receipt-number">

            <span>
              NO. BOOKING
            </span>

            <strong>
              WR-
              {new Date()
                .getFullYear()}
              -
              {String(
                receiptBooking.id
              ).padStart(3, "0")}
            </strong>

          </div>

          <div className="receipt-divider" />

          <div className="receipt-section">

            <div className="receipt-row">

              <span>
                Nama Klien
              </span>

              <strong>
                {receiptBooking.client_name}
              </strong>

            </div>

            <div className="receipt-row">

              <span>
                Email
              </span>

              <strong>
                {receiptBooking.email}
              </strong>

            </div>

            <div className="receipt-row">

              <span>
                Service
              </span>

              <strong>
                {receiptBooking.service_name}
              </strong>

            </div>

            <div className="receipt-row">

              <span>
                Tanggal Event
              </span>

              <strong>
                {formatReceiptDate(
                  receiptBooking.event_date
                )}
              </strong>

            </div>

          </div>

          <div className="receipt-divider" />

          <div className="receipt-payment">

            <div className="receipt-row">

              <span>
                Harga Service
              </span>

              <strong>
                {formatPrice(
                  receiptBooking.service_price
                )}
              </strong>

            </div>
            <div className="receipt-row">
    <span>Biaya Tambahan</span>

    <strong>
      {formatPrice(
        receiptBooking.additional_fee_amount ?? 0
      )}
    </strong>
  </div>

  {receiptBooking.additional_fee_description && (
    <div className="receipt-row">
      <span>Keterangan</span>

      <strong>
        {receiptBooking.additional_fee_description}
      </strong>
    </div>
  )}

            <div className="receipt-row">

              <span>
                Jumlah Dibayar
              </span>

              <strong>
                {formatPrice(
                  receiptBooking.payment_amount ??
                    null
                )}
              </strong>

            </div>

            <div className="receipt-status-row">

              <span>
                Status Pembayaran
              </span>

              <strong
                className={
                  receiptBooking.payment_status ===
                  "paid"
                    ? "receipt-paid"
                    : "receipt-unpaid"
                }
              >
                {receiptBooking.payment_status ===
                "paid"
                  ? "LUNAS"
                  : "BELUM LUNAS"}
              </strong>

            </div>

            <div className="receipt-row">

              <span>
                Tanggal Pembayaran
              </span>

              <strong>
                {formatReceiptDate(
                  receiptBooking.payment_date
                )}
              </strong>

            </div>

          </div>

          <div className="receipt-divider" />

          <div className="receipt-total">

            <span>
              TOTAL TAGIHAN
            </span>

            <strong>
    {formatPrice(
      Number(receiptBooking.service_price ?? 0) +
      Number(receiptBooking.additional_fee_amount ?? 0)
    )}
  </strong>

          </div>

          <div className="receipt-footer">

            <p>
              Terima kasih telah menggunakan
              jasa Wureyes_.
            </p>

            <span>
              Photography • Videography • Editing
            </span>

          </div>

        </div>

        <div className="receipt-actions">

          <button
            type="button"
            className="receipt-print-button"
            onClick={() =>
              window.print()
            }
          >
            🖨 Print / Save as PDF
          </button>

          <button
            type="button"
            className="receipt-cancel-button"
            onClick={() =>
              setReceiptBooking(null)
            }
          >
            Tutup
          </button>

        </div>

      </div>
    </div>
  )}

        {/* PHOTO SELECTION MODAL */}

        {selectedBooking !== null &&
          selectionData && (

            <div
              className="selection-modal-overlay"
              onClick={closeSelections}
            >

              <div
                className="selection-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="selection-modal-header">

                  <div>

                    <span>
                      PHOTO SELECTION
                    </span>

                    <h2>
                      {
                        selectionData
                          .booking
                          .client_name
                      }
                    </h2>

                    <p>
                      {
                        selectionData
                          .total_selected
                      }{" "}
                      foto dipilih
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeSelections
                    }
                  >
                    ×
                  </button>

                </div>


                {selectionData.note && (
                  <div className="selection-note">

                    <span>
                      CATATAN EDITING
                    </span>

                    <p>
                      {
                        selectionData.note
                      }
                    </p>

                  </div>
                )}


                {selectionData
                  .selections
                  .length === 0 ? (

                  <div className="selection-empty">

                    <strong>
                      Belum ada foto dipilih.
                    </strong>

                    <p>
                      Client belum mengirim
                      pilihan foto.
                    </p>

                  </div>

                ) : (

                  <div className="selection-photo-grid">

                    {selectionData.selections.map(
                      (photo) => (

                        <a
                          key={photo.id}
                          href={
                            photo.file_url ||
                            "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="selection-photo"
                        >

                          <div className="selection-photo-image">

                            <img
                              src={`${API_URL}/api/google-drive/thumbnail/${photo.file_id}`}
                              alt={
                                photo.file_name
                              }
                              loading="lazy"
                              onError={() =>
                                console.error(
                                  "Thumbnail proxy gagal:",
                                  photo.file_name
                                )
                              }
                            />

                          </div>


                          <span>
                            {photo.file_name}
                          </span>

                        </a>

                      )
                    )}

                  </div>

                )}


                <div className="selection-modal-footer">

                  <button
                    type="button"
                    onClick={
                      closeSelections
                    }
                  >
                    Tutup
                  </button>

                </div>

              </div>

            </div>
          )}
          
  {/* EDIT BOOKING MODAL */}

  {editingBooking && (
    <div
      className="edit-booking-overlay"
      onClick={() =>
        !savingEdit &&
        setEditingBooking(null)
      }
    >
      <div
        className="edit-booking-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="edit-booking-header">
          <div>
            <h2>Edit Booking</h2>
            <p>
              Booking #{editingBooking.id}
            </p>
          </div>

          <button
            type="button"
            className="edit-booking-close"
            onClick={() =>
              !savingEdit &&
              setEditingBooking(null)
            }
          >
            ×
          </button>
        </div>

        <div className="edit-booking-form">
          <div className="edit-form-grid">

            <div className="edit-form-group">
              <label>Nama Client</label>

              <input
                type="text"
                value={editForm.client_name}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    client_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="edit-form-group">
              <label>Email</label>

              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="edit-form-group">
              <label>No. Telepon</label>

              <input
                type="text"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div className="edit-form-group">
              <label>Service</label>

              <select
                value={editForm.service_id}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    service_id: e.target.value,
                  })
                }
              >
                <option value="">
                  Pilih Service
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="edit-form-group">
              <label>Tanggal Event</label>

              <input
                type="date"
                value={editForm.event_date}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    event_date: e.target.value,
                  })
                }
              />
            </div>

            <div className="edit-form-group">
              <label>Lokasi</label>

              <input
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    location: e.target.value,
                  })
                }
              />
            </div>

          </div>

          <div className="edit-form-group">
            <label>Pesan / Catatan</label>

            <textarea
              rows={5}
              value={editForm.message}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  message: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="edit-booking-footer">

          <button
            type="button"
            className="edit-cancel-button"
            onClick={() =>
              setEditingBooking(null)
            }
            disabled={savingEdit}
          >
            Batal
          </button>

          <button
            type="button"
            className="edit-save-button"
            onClick={saveEditBooking}
            disabled={savingEdit}
          >
            {savingEdit
              ? "Menyimpan..."
              : "Simpan Perubahan"}
          </button>

        </div>
      </div>
    </div>
  )}


      </div>
      
    );
  }
