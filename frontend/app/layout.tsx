import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { UserProvider } from "@/components/user-provider"
import QueryProvider from "@/components/query-provider"

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "HomeForge",
  description: "Smart Home Assistant UI",
  icons: {
    icon: [
      { url: '/logos/favicon.ico', sizes: 'any' },
      { url: '/logos/favicon.svg', type: 'image/svg+xml' },
      { url: '/logos/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: '/logos/apple-touch-icon.png',
  },
  manifest: '/logos/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background font-sans">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <UserProvider>
                {children}
              </UserProvider>
            </QueryProvider>
            <Toaster position="top-right" />
          </ThemeProvider>
      </body>
    </html>
  );
}