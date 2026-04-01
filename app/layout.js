import './globals.css';
import Nav from './components/Nav';

export const metadata = {
  title: 'Mileage Tracker — Automated Business Mileage Calculator',
  description:
    'Automatically calculate business mileage from your Google Calendar. AI-powered trip classification with Google Maps distance calculations at 45p per mile.',
  keywords: 'mileage tracker, business mileage, HMRC, 45p per mile, Google Calendar, mileage calculator',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mileage Tracker',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body suppressHydrationWarning>
        <Nav />
        {children}
      </body>
    </html>
  );
}
