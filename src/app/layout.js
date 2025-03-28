

import '../globals.css';

export const metadata = {
  title: 'ALBU Election App',
  description: 'ALBU Election',
  icons: {
    icon: '/albulogo.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
        <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
      <body>{children}</body>
    </html>
  );
}

