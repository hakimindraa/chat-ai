import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "AI Study Assistant - Asisten Belajar AI Gratis",
    template: "%s | AI Study Assistant"
  },
  description: "Asisten belajar AI gratis untuk mahasiswa Indonesia. Upload dokumen PDF, Word, Excel, tanya jawab dengan AI, dan belajar lebih efektif dengan teknologi GPT-4 dan Llama.",
  keywords: [
    "AI Study Assistant",
    "asisten belajar AI",
    "belajar dengan AI",
    "ChatGPT untuk belajar",
    "AI gratis mahasiswa",
    "upload PDF AI",
    "tanya jawab AI",
    "belajar efektif",
    "study assistant Indonesia"
  ],
  authors: [{ name: "AI Study Assistant Team" }],
  creator: "AI Study Assistant",
  publisher: "AI Study Assistant",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://asistenchat.vercel.app",
    siteName: "AI Study Assistant",
    title: "AI Study Assistant - Asisten Belajar AI Gratis",
    description: "Asisten belajar AI gratis untuk mahasiswa Indonesia. Upload dokumen, tanya jawab dengan AI, dan belajar lebih efektif.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Study Assistant Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Study Assistant - Asisten Belajar AI Gratis",
    description: "Asisten belajar AI gratis untuk mahasiswa Indonesia. Upload dokumen, tanya jawab dengan AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  category: "education",
  verification: {
    google: "8G7U4siDE0YByEniKgVxsQOM0_wFFZpmPeIoXSnsJTM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased overflow-x-hidden`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

