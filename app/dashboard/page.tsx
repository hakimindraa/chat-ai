"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">💬 Chat AI: {data.chatCount}</Card>
      <Card className="p-4">📄 PDF Ringkas: {data.pdfCount}</Card>
      <Card className="p-4">📅 Study Plan: {data.studyPlanCount}</Card>
    </div>
  );
}
