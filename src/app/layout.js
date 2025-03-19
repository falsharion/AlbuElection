

import '../globals.css';

export const metadata = {
  title: 'ALBU Election App',
  description: 'ALBU Election',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

