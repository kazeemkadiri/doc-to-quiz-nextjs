"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};
const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_TYPES);
const MAX_SIZE_MB = 10;

type Status = "idle" | "uploading" | "success" | "error";

function isAllowed(file: File): boolean {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  return file.type in ACCEPTED_TYPES || ACCEPTED_EXTENSIONS.includes(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm({
  action = "/api/quizzes",
}: {
  /** Endpoint that receives the multipart/form-data POST (field name: "files"). */
  action?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: File[]) {
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of incoming) {
      if (!isAllowed(file)) {
        errors.push(`${file.name}: only PDF, DOCX and TXT files are allowed.`);
      } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name}: exceeds ${MAX_SIZE_MB} MB.`);
      } else {
        valid.push(file);
      }
    }

    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...valid.filter((f) => !seen.has(`${f.name}-${f.size}`))];
    });

    if (errors.length) {
      setStatus("error");
      setMessage(errors.join(" "));
    } else {
      setStatus("idle");
      setMessage("");
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // allow re-selecting the same file
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please choose at least one file.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));

    setStatus("uploading");
    setMessage("");

    try {
      const res = await fetch(action, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      
      console.log(await res.json());

      setStatus("success");
      setMessage(`${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully.`);
      setFiles([]);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        style={{
          padding: 32,
          textAlign: "center",
          border: `2px dashed ${dragging ? "#2563eb" : "#9ca3af"}`,
          background: dragging ? "#eff6ff" : "#f9fafb",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Drag &amp; drop files here, or click to browse</p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b7280" }}>
          PDF or DOCX &middot; up to {MAX_SIZE_MB} MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={[...Object.keys(ACCEPTED_TYPES), ...ACCEPTED_EXTENSIONS].join(",")}
          onChange={onInputChange}
          style={{ display: "none" }}
        />
      </div>

      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #f3f4f6",
                fontSize: 14,
              }}
            >
              <span>
                {file.name}{" "}
                <span style={{ color: "#6b7280" }}>({formatSize(file.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={status === "uploading" || files.length === 0}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "10px 16px",
          border: "none",
          borderRadius: 8,
          background: status === "uploading" || files.length === 0 ? "#93c5fd" : "#2563eb",
          color: "#fff",
          fontWeight: 600,
          cursor: status === "uploading" || files.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {status === "uploading" ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          style={{
            marginTop: 12,
            fontSize: 14,
            color: status === "error" ? "#dc2626" : "#16a34a",
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}