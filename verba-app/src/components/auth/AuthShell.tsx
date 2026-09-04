'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

// ─── Verba Logo Mark (Leaf/Petal style) ──────────────────────────────────────
export function VerbaLogo() {
  return (
    <div className="flex flex-col items-center mb-10">
      <div className="flex items-center gap-2 mb-2">
        {/* Leaf/Petal mark */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 2 C14 2 24 2 24 12 C24 22 14 22 14 22 C14 22 4 22 4 12 C4 2 14 2 14 2Z"
            fill="#1677FF"
            transform="rotate(45 14 14)"
          />
          <path
            d="M14 8 C14 8 20 8 20 14 C20 20 14 20 14 20 C14 20 8 20 8 14 C8 8 14 8 14 8Z"
            fill="#0958D9"
            transform="rotate(45 14 14)"
            opacity="0.9"
          />
        </svg>
        {/* Wordmark */}
        <span
          className="text-[30px] font-bold tracking-tight"
          style={{ color: '#101828', letterSpacing: '-0.02em' }}
        >
          Verba
        </span>
      </div>
      <p className="text-[14.5px] font-light" style={{ color: '#667085' }}>
        Write. Improve. Be confident.
      </p>
    </div>
  );
}

// ─── Left: Blue Radial Burst ──────────────────────────────────────────────────
function LeftStarburst() {
  return (
    <div
      className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden md:block"
      aria-hidden="true"
      style={{ transform: 'translateY(-50%)' }}
    >
      <svg
        width="380"
        height="480"
        viewBox="0 0 380 480"
        fill="none"
        style={{ marginLeft: '-150px' }}
      >
        {/* 10-arm rounded asterisk burst */}
        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, i) => (
          <rect
            key={i}
            x="160"
            y="20"
            width="60"
            height="440"
            rx="30"
            fill="#1677FF"
            transform={`rotate(${angle} 190 240)`}
          />
        ))}

        {/* Small decorative strokes */}
        <path d="M 280 80 Q 300 70 320 85" stroke="#91A4D8" strokeWidth="4" strokeLinecap="round" fill="none" transform="rotate(15 300 77)" />
        <path d="M 330 110 Q 345 105 350 120" stroke="#91A4D8" strokeWidth="4" strokeLinecap="round" fill="none" transform="rotate(-10 340 112)" />
        <path d="M 300 400 Q 320 410 330 395" stroke="#91A4D8" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>

      {/* Handwritten accent text */}
      <div
        className="absolute"
        style={{
          top: '140px',
          left: '260px',
          color: '#7287F8',
          fontFamily: "'Caveat', cursive",
          fontSize: '18px',
          lineHeight: '1.4',
          textAlign: 'left',
          transform: 'rotate(-5deg)',
          whiteSpace: 'nowrap',
        }}
      >
        Better Writing,
        <br />
        Brighter Ideas
        {/* Arrow */}
        <svg
          width="40"
          height="32"
          viewBox="0 0 40 32"
          fill="none"
          style={{ display: 'block', marginTop: '4px', marginLeft: '6px' }}
        >
          <path
            d="M4 8 C10 20 22 24 34 26"
            stroke="#7287F8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M28 22 L34 26 L30 32"
            stroke="#7287F8"
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
      style={{ transform: 'translateY(-40%)' }}
    >
      <svg
        width="340"
        height="400"
        viewBox="0 0 340 400"
        fill="none"
        style={{ marginRight: '-90px' }}
      >
        <path
          d="
            M270 90
            C310 60 340 100 320 150
            C310 175 330 195 325 230
            C320 270 295 290 270 310
            C235 340 200 355 165 340
            C130 325 110 300 100 265
            C88 230 95 195 110 160
            C125 125 120 90 145 70
            C170 50 215 45 240 60
            C255 68 262 78 270 90Z
          "
          fill="#A7F3C2"
        />
        
        {/* Small decorative strokes */}
        <path d="M 60 180 Q 75 165 90 185" stroke="#A7F3C2" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M 85 145 Q 95 130 105 145" stroke="#A7F3C2" strokeWidth="4" strokeLinecap="round" fill="none" transform="rotate(20 95 137)" />
      </svg>

      {/* Handwritten accent */}
      <div
        className="absolute"
        style={{
          top: '250px',
          right: '110px',
          color: '#7287F8',
          fontFamily: "'Caveat', cursive",
          fontSize: '18px',
          lineHeight: '1.3',
          textAlign: 'center',
          transform: 'rotate(4deg)',
        }}
      >
        {/* Arrow above text */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          style={{ display: 'block', marginBottom: '4px', marginLeft: 'auto' }}
        >
          <path
            d="M28 4 C22 12 12 14 4 22"
            stroke="#7287F8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M2 14 L4 22 L12 18"
            stroke="#7287F8"
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
        className="mb-6 flex items-start gap-2.5 rounded-[8px] border px-4 py-3 text-[14px]"
        style={{
          background: '#FFF1F0',
          borderColor: '#FFCCC7',
          color: '#CF1322',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
          <circle cx="8" cy="8" r="7.25" stroke="#CF1322" strokeWidth="1.5" />
          <path d="M8 5v3.5" stroke="#CF1322" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="#CF1322" />
        </svg>
        <span className="leading-snug">{message}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-2.5 rounded-[8px] border px-4 py-3 text-[14px]"
      style={{
        background: '#F6FFED',
        borderColor: '#B7EB8F',
        color: '#237804',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="7.25" stroke="#237804" strokeWidth="1.5" />
        <path d="M5 8.5 L7.2 10.5 L11 6" stroke="#237804" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-snug">{message}</span>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function AuthFooter() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between px-8 pb-6 pt-4 gap-4 bg-white/80 backdrop-blur-sm z-20">
      <span className="text-[13px]" style={{ color: '#667085' }}>
        © 2026 Verba. All rights reserved.
      </span>
      {/* Legal links */}
      <div className="flex items-center gap-4 text-[13px]" style={{ color: '#667085' }}>
        <span className="cursor-pointer hover:text-[#101828] transition-colors">Security</span>
        <span className="text-[#D8E0EA]">|</span>
        <span className="cursor-pointer hover:text-[#101828] transition-colors">Legal</span>
        <span className="text-[#D8E0EA]">|</span>
        <span className="cursor-pointer hover:text-[#101828] transition-colors">Privacy</span>
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap"
      />

      <div
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 pb-12"
        style={{ isolation: 'isolate' }}
      >
        <LeftStarburst />
        <RightBlob />

        <main
          className="relative z-10 w-full"
          style={{ maxWidth: '480px' }}
        >
          <VerbaLogo />
          {children}
        </main>

        <AuthFooter />
      </div>
    </>
  );
}

// ─── Shared Inputs ────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: 'email' | 'password';
}

export function AuthInput({ icon, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = icon === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : props.type;

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#98A2B3]">
        {icon === 'email' ? <Mail size={18} /> : <Lock size={18} />}
      </div>
      <input
        {...props}
        type={currentType}
        className="block w-full rounded-[10px] border px-4 py-3 pl-11 text-[15px] text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20 focus:border-[#1677FF] transition-colors h-[54px] bg-white border-[#D8E0EA]"
      />
      {isPasswordType && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#98A2B3] hover:text-[#101828] transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}

// ─── Primary submit button ────────────────────────────────────────────────────
export function AuthButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="relative flex w-full items-center justify-center gap-2.5 rounded-[10px] text-[15.5px] font-semibold text-white transition-colors h-[54px] bg-accent hover:bg-accent-hover active:scale-[0.99]"
    >
      {label}
      <span className="font-sans text-[18px] leading-none mb-[2px]">→</span>
    </button>
  );
}

export default AuthShell;
