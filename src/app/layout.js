import './globals.css';
import Image from 'next/image';

export const metadata = {
  title: 'Strike Markets - Virtual Prediction Market',
  description: 'Trade on outcomes with virtual coins. Strike Markets — predict the future, earn VCoins.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
