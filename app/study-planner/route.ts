import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { subject, deadline, hours } = await req.json();

  const prompt = `
Buatkan jadwal belajar untuk mata kuliah ${subject}
dengan deadline ${deadline}
dan waktu belajar ${hours} jam per hari.
Gunakan tabel harian.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  });

  return NextResponse.json({
    plan: response.choices[0].message.content
  });
}
