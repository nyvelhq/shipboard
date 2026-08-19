import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipboard',
  description: 'Project management for fast-paced e-commerce teams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
