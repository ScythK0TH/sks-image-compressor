import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Compressor - Next-gen Image Toolkit",
  description: "Compress, resize, convert, and strip metadata with production-ready presets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
                document.body.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
