"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function PdfSummaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");

    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Ringkas PDF</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <Button onClick={handleUpload} className="mt-3" disabled={loading}>
        {loading ? "Memproses..." : "Ringkas PDF"}
      </Button>

      {summary && (
        <div className="mt-6 p-4 border rounded-lg whitespace-pre-line">
          {summary}
        </div>
      )}
    </div>
  );
}
