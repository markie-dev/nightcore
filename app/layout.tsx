import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import Navbar from "./components/navbar";
import { Inter } from "next/font/google";
import AnimatedBackground from "./components/AnimatedBackground";
import AnimatedFooter from "./components/AnimatedFooter";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "nightcore.me",
  description: "Nightcore any song with the click of a button",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script 
          src="/ffmpeg/ffmpeg.core.js"
          strategy="beforeInteractive"
        />
        <Script
          id="ffmpeg-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.createFFmpegCore = createFFmpegCore;
              }
            `
          }}
        />
      </head>
      <body className={`${inter.className} antialiased overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnimatedBackground />
          <Navbar />
          {children}
          <AnimatedFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
