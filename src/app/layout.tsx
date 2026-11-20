import type { Metadata, Viewport } from 'next';
import { LanguageProvider } from '@/components/LanguageProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ViewportLock } from '@/components/ViewportLock';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Tasks',
  description:
    'Quản lý nhiệm vụ hằng ngày, thói quen lặp lại và chuỗi ngày hoàn thành.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const themeScript = `
(function() {
  try {
    if (localStorage.getItem('mylife-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh w-full max-w-full overflow-x-clip font-sans">
        <ThemeProvider>
          <ViewportLock />
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
