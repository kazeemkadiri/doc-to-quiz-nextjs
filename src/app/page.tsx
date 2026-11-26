import UploadForm from "@/components/upload/UploadForm";

export default function Home() {
  return (
    <main style={{ padding: "48px 16px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 24, fontFamily: "system-ui, sans-serif" }}>
        Upload your documents
      </h1>
      <UploadForm action="/api/quizzes" />
    </main>
  );
}
