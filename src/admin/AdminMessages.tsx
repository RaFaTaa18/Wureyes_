import { useEffect, useState } from "react";
import "./AdminMessages.css";

interface Message {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "unread" | "read" | "replied";
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  const token = sessionStorage.getItem("wureyes_token");

  async function loadMessages() {
    if (!token) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem("wureyes_token");
        sessionStorage.removeItem("wureyes_user");

        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load messages"
        );
      }

      setMessages(result.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load messages"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function updateStatus(
    id: number,
    status: Message["status"]
  ) {
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/messages/${id}/status`,
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

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update message"
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                status,
              }
            : message
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update message"
      );
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
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

  return (
    <div className="messages-admin">

      <div className="messages-header">

        <div>
          <p className="messages-label">
            WUREYES CONTACT
          </p>

          <h2>
            Messages
          </h2>
        </div>

        <button
          className="messages-refresh"
          onClick={loadMessages}
        >
          Refresh
        </button>

      </div>


      {error && (
        <div className="messages-error">
          {error}
        </div>
      )}


      {loading ? (

        <div className="messages-loading">
          Loading messages...
        </div>

      ) : messages.length === 0 ? (

        <div className="messages-empty">

          <strong>
            No messages yet.
          </strong>

          <p>
            Messages submitted through the
            contact form will appear here.
          </p>

        </div>

      ) : (

        <div className="messages-list">

          {messages.map((message) => (

            <article
              key={message.id}
              className={`message-card ${
                message.status === "unread"
                  ? "message-unread"
                  : ""
              }`}
            >

              <div className="message-top">

                <div>

                  <span className="message-id">
                    MESSAGE #{message.id}
                  </span>

                  <h3>
                    {message.name}
                  </h3>

                </div>

                <span
                  className={`message-status ${message.status}`}
                >
                  {message.status}
                </span>

              </div>


              <div className="message-contact">

                <a
                  href={`mailto:${message.email}`}
                >
                  {message.email}
                </a>

                <span>
                  {formatDate(
                    message.created_at
                  )}
                </span>

              </div>


              <div className="message-content">

                <span>
                  SUBJECT
                </span>

                <h4>
                  {message.subject ||
                    "No subject"}
                </h4>

                <p>
                  {message.message}
                </p>

              </div>


              <div className="message-actions">

                <select
                  value={message.status}
                  onChange={(event) =>
                    updateStatus(
                      message.id,
                      event.target.value as Message["status"]
                    )
                  }
                >

                  <option value="unread">
                    Unread
                  </option>

                  <option value="read">
                    Read
                  </option>

                  <option value="replied">
                    Replied
                  </option>

                </select>


                {message.status === "unread" && (
                  <button
                    onClick={() =>
                      updateStatus(
                        message.id,
                        "read"
                      )
                    }
                  >
                    Mark as Read
                  </button>
                )}


                {message.status === "read" && (
                  <a
                    href={`mailto:${message.email}?subject=Re: ${
                      message.subject || "Your message"
                    }`}
                    onClick={() =>
                      updateStatus(
                        message.id,
                        "replied"
                      )
                    }
                  >
                    Reply
                  </a>
                )}

              </div>

            </article>

          ))}

        </div>

      )}

    </div>
  );
}