import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { UserProvider } from "@/components/user-provider"

export const metadata = {
  title: "HomeForge",
  description: "Smart Home Assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserProvider>
              {children}
            </UserProvider>
            <Toaster position="top-right" />
          </ThemeProvider>
      </body>
    </html>
  );
}