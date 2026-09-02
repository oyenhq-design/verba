import Link from "next/link";
import { FileText, Home, Settings, LogOut, User, Activity, Plus } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 mb-6 px-2">
            <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center">
              <span className="text-accent font-bold">V</span>
            </div>
            <span className="font-semibold text-lg">Verba</span>
          </Link>
          <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-medium py-2 px-4 rounded-md hover:bg-foreground-secondary transition-colors text-sm">
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 bg-surface-secondary rounded-md text-foreground text-sm font-medium">
              <Home className="w-4 h-4 text-foreground-secondary" />
              Home
            </Link>
            <Link href="/dashboard/documents" className="flex items-center gap-3 px-3 py-2 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground rounded-md text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" />
              Documents
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <nav className="space-y-1">
            <Link href="/dashboard/usage" className="flex items-center gap-3 px-3 py-2 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground rounded-md text-sm font-medium transition-colors">
              <Activity className="w-4 h-4" />
              Usage
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground rounded-md text-sm font-medium transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link href="/dashboard/account" className="flex items-center gap-3 px-3 py-2 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground rounded-md text-sm font-medium transition-colors">
              <User className="w-4 h-4" />
              Account
            </Link>
          </nav>
          
          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-foreground-muted hover:text-foreground rounded-md text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4" />
              Sign out
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Topbar for mobile could go here, but focusing on desktop first per spec */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
