import React from 'react';

// ─── Verba Sparkle Logo Mark ─────────────────────────────────────────────────
function VerbaLogo() {
  return (
    <div className="flex flex-col items-center mb-9">
      <div className="flex items-center gap-2 mb-2">
        {/* Wordmark */}
        <span
          className="text-[28px] font-bold tracking-tight"
          style={{ color: '#101828', letterSpacing: '-0.02em' }}
        >
          Verba
        </span>
        {/* Blue 4-point star accent */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13 0 C13 0 14.2 8.8 13 13 C11.8 17.2 13 26 13 26 C13 26 11.8 17.2 13 13 C14.2 8.8 13 0 13 0Z"
            fill="#1677FF"
          />
          <path
            d="M0 13 C0 13 8.8 14.2 13 13 C17.2 11.8 26 13 26 13 C26 13 17.2 11.8 13 13 C8.8 14.2 0 13 0 13Z"
            fill="#1677FF"
          />
          <path
            d="M3.2 3.2 C3.2 3.2 9.5 9.8 13 13 C16.5 16.2 22.8 22.8 22.8 22.8 C22.8 22.8 16.5 16.2 13 13 C9.5 9.8 3.2 3.2 3.2 3.2Z"
            fill="#1677FF"
          />
          <path
            d="M22.8 3.2 C22.8 3.2 16.5 9.8 13 13 C9.5 16.2 3.2 22.8 3.2 22.8 C3.2 22.8 9.5 16.2 13 13 C16.5 9.8 22.8 3.2 22.8 3.2Z"
            fill="#1677FF"
          />
        </svg>
      </div>
      <p className="text-[14px]" style={{ color: '#667085' }}>
        Write. Improve. Be confident.
      </p>
    </div>
  );
}

// ─── Left: Blue Starburst ─────────────────────────────────────────────────────
function LeftStarburst() {
  return (
    <div
      className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden md:block"
      aria-hidden="true"
      style={{ transform: 'translateY(-55%)' }}
    >
      {/* SVG Starburst — cropped by overflow-hidden on parent */}
      <svg
        width="400"
        height="420"
        viewBox="0 0 400 420"
        fill="none"
        style={{ marginLeft: '-120px' }}
      >
        {/* 8-arm asterisk starburst */}
        {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((angle, i) => (
          <rect
            key={i}
            x="178"
            y="0"
            width="44"
            height="420"
            rx="20"
            fill="#1677FF"
            transform={`rotate(${angle} 200 210)`}
          />
        ))}
      </svg>

      {/* Handwritten accent text */}
      <div
        className="absolute"
        style={{
          top: '120px',
          left: '280px',
          color: '#91A4D8',
          fontFamily: "'Caveat', cursive",
          fontSize: '17px',
          lineHeight: '1.5',
          textAlign: 'left',
          transform: 'rotate(-4deg)',
          whiteSpace: 'nowrap',
        }}
      >
        Better Writing,
        <br />
        Brighter Ideas
        {/* Arrow */}
        <svg
          width="36"
          height="28"
          viewBox="0 0 36 28"
          fill="none"
          style={{ display: 'block', marginTop: '2px', marginLeft: '4px' }}
        >
          <path
            d="M2 6 C6 18 18 22 30 24"
            stroke="#91A4D8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M24 20 L30 24 L26 28"
            stroke="#91A4D8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Right: Mint Blob ─────────────────────────────────────────────────────────
function RightBlob() {
  return (
    <div
      className="absolute right-0 top-1/2 pointer-events-none select-none hidden md:block"
      aria-hidden="true"
      style={{ transform: 'translateY(-35%)' }}
    >
      <svg
        width="320"
        height="380"
        viewBox="0 0 320 380"
        fill="none"
        style={{ marginRight: '-80px' }}
      >
        {/* Organic multi-lobe blob shape */}
        <path
          d="
            M260 80
            C295 55 330 90 310 140
            C300 165 320 185 315 220
            C310 258 290 275 265 295
            C235 318 200 335 170 325
            C140 315 120 290 110 260
            C98 228 105 195 115 165
            C125 135 120 100 140 80
            C162 58 200 50 230 60
            C245 65 255 72 260 80Z
          "
          fill="#B7F7C7"
        />
      </svg>

      {/* Handwritten accent */}
      <div
        className="absolute"
        style={{
          top: '220px',
          right: '90px',
          color: '#91A4D8',
          fontFamily: "'Caveat', cursive",
          fontSize: '17px',
          lineHeight: '1.5',
          textAlign: 'center',
          transform: 'rotate(3deg)',
        }}
      >
        {/* Arrow above text */}
        <svg
          width="30"
          height="28"
          viewBox="0 0 30 28"
          fill="none"
          style={{ display: 'block', marginBottom: '2px', marginLeft: 'auto' }}
        >
          <path
            d="M26 4 C20 10 12 10 4 18"
            stroke="#91A4D8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M2 12 L4 18 L10 16"
            stroke="#91A4D8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Your ideas
        <br />
        deserve
        <br />
        better.
      </div>
    </div>
  );
}

// ─── Error / Success Alerts ───────────────────────────────────────────────────
export function AuthAlert({ type, message }: { type: 'error' | 'success'; message: string }) {
  if (type === 'error') {
    return (
      <div
        role="alert"
        className="mb-5 flex items-start gap-2 rounded-[8px] border px-4 py-3 text-[13px]"
        style={{
          background: '#FFF1F0',
          borderColor: '#FFCCC7',
          color: '#CF1322',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
          <circle cx="8" cy="8" r="7.25" stroke="#CF1322" strokeWidth="1.5" />
          <path d="M8 5v3.5" stroke="#CF1322" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="#CF1322" />
        </svg>
        <span>{message}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-2 rounded-[8px] border px-4 py-3 text-[13px]"
      style={{
        background: '#F6FFED',
        borderColor: '#B7EB8F',
        color: '#237804',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="7.25" stroke="#237804" strokeWidth="1.5" />
        <path d="M5 8.5 L7.2 10.5 L11 6" stroke="#237804" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function AuthFooter() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 pb-5 pt-3">
      <span className="text-[12px]" style={{ color: '#98A2B3' }}>
        © 2026 Verba. All rights reserved.
      </span>
      {/* Legal links — shown as non-interactive text since routes don't exist */}
      <div className="flex items-center gap-3 text-[12px]" style={{ color: '#98A2B3' }}>
        <span>Security</span>
        <span>|</span>
        <span>Legal</span>
        <span>|</span>
        <span>Privacy</span>
      </div>
    </footer>
  );
}

// ─── Auth Shell ───────────────────────────────────────────────────────────────
interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <>
      {/* Load Caveat handwritten font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap"
      />

      <div
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-5"
        style={{ isolation: 'isolate' }}
      >
        {/* Decorative shapes */}
        <LeftStarburst />
        <RightBlob />

        {/* Center form container */}
        <main
          className="relative z-10 w-full"
          style={{ maxWidth: '460px' }}
        >
          <VerbaLogo />
          {children}
        </main>

        <AuthFooter />
      </div>
    </>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
export const inputClass =
  'block w-full rounded-[9px] border px-4 py-3 text-[14px] text-[#101828] placeholder-[#98A2B3] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF] ' +
  'transition-colors h-[50px]';

export const inputBorderStyle = { borderColor: '#DCE3EC' };

// ─── Primary submit button ────────────────────────────────────────────────────
export function AuthButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="relative flex w-full items-center justify-center gap-2 rounded-[9px] text-[15px] font-semibold text-white transition-colors h-[50px] bg-accent hover:bg-accent-hover"
    >
      {label}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default AuthShell;
