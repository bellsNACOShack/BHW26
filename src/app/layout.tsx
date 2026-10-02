import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interlog - Digital SIWES Management API",
  description: "Digital SIWES logbook, electronic sign-offs, and verification platform backend API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
