import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcrypt");

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null
    }
  });

  return NextResponse.json({
    message: "Register berhasil",
    userId: user.id
  });
}
