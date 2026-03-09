import { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "JP&Co - Staff Terminal",
  description: "Staff terminal for JP&Co loyalty system",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Centered container for both mobile and desktop */}
      <div className="max-w-lg mx-auto min-h-screen">
        {children}
      </div>
    </div>
  )
}
