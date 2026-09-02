import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent-light selection:text-accent">
      <header className="bg-surface sticky top-0 z-50 h-[64px] lg:h-[68px] flex items-center border-b border-border-light">
        <div className="max-w-[1200px] w-full mx-auto px-[18px] md:px-[24px] lg:px-[32px] flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Verba" className="h-[32px] md:h-[38px] w-auto object-contain" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-foreground">
            <Link href="/#product" className="hover:text-accent transition-colors">Product</Link>
            <Link href="/#how-it-works" className="hover:text-accent transition-colors">How It Works</Link>
            <Link href="/#use-cases" className="hover:text-accent transition-colors">Use Cases</Link>
            <Link href="/pricing" className="text-accent font-bold transition-colors">Pricing</Link>
            <Link href="/#faq" className="hover:text-accent transition-colors">FAQ</Link>
          </nav>
          
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[13px] font-semibold text-foreground hover:text-accent transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/signup" className="text-[13px] font-semibold bg-ink text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity shadow-sm">
              Try Verba
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Pricing (Split Layout) */}
        <section id="pricing" className="py-[120px] px-[18px] md:px-[24px] lg:px-[32px] bg-background-pale border-b border-border-light">
          <div className="max-w-[1200px] mx-auto grid xl:grid-cols-[30%_70%] gap-12 lg:gap-8 items-start">
             <div>
               <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-4">
                  PLANS
               </div>
               <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-ink leading-[1.1] mb-5">
                  Choose the plan<br/>that fits you.
               </h1>
               <p className="text-[16px] text-foreground-secondary leading-[1.6]">
                  Start refining today. Cancel anytime.
               </p>
             </div>

             <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
               {/* Premium */}
               <div className="bg-white border-2 border-accent rounded-[14px] p-8 shadow-[0_8px_30px_rgba(16,24,40,0.08)] relative flex flex-col min-h-[440px]">
                  <div className="absolute -top-3 right-8 bg-accent text-white text-[10.5px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                     MOST POPULAR
                  </div>
                  <h3 className="text-[17px] font-semibold text-ink mb-2">Premium</h3>
                  <div className="flex items-end gap-1 mb-3">
                     <span className="text-[36px] md:text-[40px] font-bold tracking-tight text-ink leading-none">$12.99</span>
                     <span className="text-[14px] font-medium text-foreground-secondary mb-1">/month</span>
                  </div>
                  <p className="text-[14px] text-foreground-secondary mb-6 pb-6 border-b border-[#EAECF0]">Everything you need for everyday writing.</p>
                  
                  <div className="space-y-4 flex-1 mb-8">
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Up to 200 pages per month
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> DOCX file uploads
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Meaning & citation protection
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Priority processing
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Export to Word
                     </div>
                  </div>

                  <button className="w-full h-[44px] bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors shadow-sm text-[14.5px]">
                     Choose Plan
                  </button>
               </div>

               {/* Professional */}
               <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-8 shadow-[0_2px_8px_rgba(16,24,40,0.04)] flex flex-col min-h-[440px]">
                  <h3 className="text-[17px] font-semibold text-ink mb-2">Professional</h3>
                  <div className="flex items-end gap-1 mb-3">
                     <span className="text-[36px] md:text-[40px] font-bold tracking-tight text-ink leading-none">$24.99</span>
                     <span className="text-[14px] font-medium text-foreground-secondary mb-1">/month</span>
                  </div>
                  <p className="text-[14px] text-foreground-secondary mb-6 pb-6 border-b border-[#EAECF0]">For heavy writers and professionals.</p>
                  
                  <div className="space-y-4 flex-1 mb-8">
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Up to 600 pages per month
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> All Premium features
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Priority support
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Advanced writing insights
                     </div>
                     <div className="flex items-start gap-3 text-[13.5px] lg:text-[14px] text-foreground-secondary">
                        <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" strokeWidth={3} /> Team plan available
                     </div>
                  </div>

                  <button className="w-full h-[44px] bg-white border border-ink/20 text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors shadow-sm text-[14.5px]">
                     Choose Plan
                  </button>
               </div>
             </div>
          </div>
          <div className="text-center mt-12 text-[12.5px] font-medium text-foreground-muted">
             30-day money-back guarantee &bull; Secure payments &bull; Cancel anytime
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8FAFC] border-t border-[#E4E7EC] pt-[70px] pb-8 px-[18px] md:px-[24px] lg:px-[32px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-x-8 gap-y-12">
          {/* Brand Block */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity mb-3">
              <img src="/logo.png" alt="Verba" className="w-[150px] h-auto object-contain" />
            </Link>
            <p className="text-[14.5px] text-[#667085] max-w-[220px] font-medium leading-relaxed">
              Writing that sounds like you.
            </p>
            <p className="text-[13px] text-[#98A2B3] mt-2 max-w-[220px]">
              Refine your writing without losing your meaning.
            </p>
          </div>
          
          {/* Columns */}
          <div>
            <h4 className="font-bold text-[12px] text-[#344054] uppercase tracking-[0.04em] mb-[18px]">Product</h4>
            <ul className="space-y-[14px] text-[14px] text-[#667085] font-medium">
              <li><Link href="/#how-it-works" className="hover:text-[#1677FF] transition-colors duration-150">How It Works</Link></li>
              <li><Link href="/#use-cases" className="hover:text-[#1677FF] transition-colors duration-150">Use Cases</Link></li>
              <li><Link href="/pricing" className="hover:text-[#1677FF] transition-colors duration-150">Pricing</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[12px] text-[#344054] uppercase tracking-[0.04em] mb-[18px]">Resources</h4>
            <ul className="space-y-[14px] text-[14px] text-[#667085] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Help</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Writing Guide</Link></li>
              <li><Link href="/#faq" className="hover:text-[#1677FF] transition-colors duration-150">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[12px] text-[#344054] uppercase tracking-[0.04em] mb-[18px]">Company</h4>
            <ul className="space-y-[14px] text-[14px] text-[#667085] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">About</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[12px] text-[#344054] uppercase tracking-[0.04em] mb-[18px]">Legal</h4>
            <ul className="space-y-[14px] text-[14px] text-[#667085] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-[#E4E7EC] flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] text-[#98A2B3] font-medium">
           <p>&copy; {new Date().getFullYear()} OYEN Group</p>
           <p>Built for clearer writing.</p>
        </div>
      </footer>
    </div>
  );
}
