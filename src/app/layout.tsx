import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SONARA — Immersive 3D Music Universe',
  description:
    'Explorable three-dimensional universe for music discovery, personalized taste analysis (TasteDNA), and generative audio-reactive art (Synesthesia).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary overflow-hidden w-screen h-screen">
        {children}
      </body>
    </html>
  );
}

