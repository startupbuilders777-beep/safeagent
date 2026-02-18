import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-bold text-white">
              SafeAgent
            </a>
            <div className="flex gap-4">
              <a
                href="/dashboard/scan"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Scan
              </a>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            API: {session.user.id?.substring(0, 12)}...
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
