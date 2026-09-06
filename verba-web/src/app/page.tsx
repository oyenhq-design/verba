"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Shield, FileText, Check, ChevronRight, 
  GraduationCap, Building2, Quote, Briefcase, ArrowRight
} from "lucide-react";

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    { q: "What exactly does Verba do?", a: "Verba analyzes your Word document to find robotic, repetitive, or unnecessarily formal writing and suggests clearer, more natural alternatives while preserving your meaning and formatting." },
    { q: "Will Verba change my citations?", a: "Citations and references are treated as protected content and should not be rewritten during standard refinement." },
    { q: "Can Verba change my numbers?", a: "No. Numerical data and statistics are preserved to ensure your factual accuracy remains intact." },
    { q: "Can I reject Verba's suggestions?", a: "Absolutely. You are in full control and can accept, edit, or reject any suggestion Verba makes." }
  ];

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col font-sans selection:bg-[#EBF5FF] selection:text-[#1677FF]">
      {/* 1. Navigation */}
      <header className="bg-white sticky top-0 z-50 h-[72px] flex items-center border-b border-[#EAECF0]">
        <div className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Verba" className="h-[36px] w-auto object-contain" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-ink">
            <Link href="#product" className="hover:text-[#1677FF] transition-colors">Product</Link>
            <Link href="#how-it-works" className="hover:text-[#1677FF] transition-colors">How It Works</Link>
            <Link href="#use-cases" className="hover:text-[#1677FF] transition-colors">Use Cases</Link>
            <Link href="/pricing" className="hover:text-[#1677FF] transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-[#1677FF] transition-colors">FAQ</Link>
          </nav>
          
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[14px] font-semibold text-ink hover:text-[#1677FF] transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/signup" className="text-[14px] font-semibold bg-ink text-white px-5 py-2.5 rounded-[8px] hover:bg-[#1f2937] transition-colors shadow-sm">
              Try Verba
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="pt-24 pb-20 px-6 lg:px-8 bg-white relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="space-y-8 relative z-10 max-w-[540px]">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F0F7FF] text-[#1677FF] text-[12px] font-bold tracking-widest">
                WRITING, REFINED
              </div>
              <h1 className="text-[56px] md:text-[72px] font-bold tracking-tight text-ink leading-[1.05]">
                Write with clarity.<br/>Keep your meaning.
              </h1>
              <p className="text-[18px] text-[#475467] leading-[1.6]">
                Upload your document and Verba helps you improve your writing—making it sound natural, direct, and clear without losing your unique voice.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 bg-[#1677FF] text-white font-semibold rounded-[8px] hover:bg-[#115fcb] transition-colors shadow-[0_2px_8px_rgba(22,119,255,0.25)] text-[15px] text-center">
                  Upload a Document
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#D0D5DD] text-ink font-semibold rounded-[8px] hover:bg-[#F9FAFB] transition-colors text-[15px] text-center">
                  See How It Works
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[14px] font-medium text-[#475467]">
                <div className="flex items-center gap-2">
                  <Shield className="w-[16px] h-[16px] text-[#98A2B3]" />
                  Your work stays yours
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-[16px] h-[16px] text-[#98A2B3]" />
                  Citations protected
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-[16px] h-[16px] text-[#98A2B3]" strokeWidth={3} />
                  You approve every change
                </div>
              </div>
            </div>

            {/* Right Column (Cards Graphic) */}
            <div className="relative h-[500px] w-full flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] h-[400px]">
                {/* Background Card */}
                <div className="absolute top-0 right-10 w-[340px] h-[300px] bg-white border border-[#EAECF0] rounded-[16px] shadow-sm p-6 transform rotate-3 opacity-90 transition-transform hover:rotate-6 duration-500">
                  <div className="w-full h-4 bg-[#F2F4F7] rounded-sm mb-4"></div>
                  <div className="w-3/4 h-4 bg-[#F2F4F7] rounded-sm mb-4"></div>
                  <div className="w-5/6 h-4 bg-[#F2F4F7] rounded-sm mb-8"></div>
                  <div className="space-y-3">
                    <p className="text-[14px] text-[#667085] line-through decoration-[#98A2B3]">Furthermore, it is pertinent to note that the implementation of this methodology significantly facilitates the optimization of operational efficiency...</p>
                  </div>
                </div>
                
                {/* Foreground Card */}
                <div className="absolute top-16 right-24 w-[340px] h-[300px] bg-white border border-[#EAECF0] rounded-[16px] shadow-[0_20px_40px_rgba(16,24,40,0.1)] p-6 z-10 transition-transform hover:-translate-y-2 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-[#EBF5FF] rounded-lg flex items-center justify-center text-[#1677FF]">
                      <span className="font-serif font-bold text-[18px]">W</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px] text-ink">Revised-Draft.docx</h4>
                      <p className="text-[#667085] text-[12px]">Verba Suggestion</p>
                    </div>
                  </div>
                  <div className="p-4 bg-[#F9FAFB] border border-[#EAECF0] rounded-[8px]">
                    <p className="text-[14px] text-ink font-medium leading-relaxed">
                      This approach also improves the system&apos;s operational efficiency...
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <button className="px-4 py-1.5 bg-white border border-[#D0D5DD] rounded-md text-[13px] font-semibold text-[#344054]">Reject</button>
                    <button className="px-4 py-1.5 bg-[#1677FF] rounded-md text-[13px] font-semibold text-white">Accept</button>
                  </div>
                </div>

                {/* Handwritten Note & Arrow */}
                <div className="absolute -bottom-4 right-4 z-20 flex flex-col items-center">
                  <p className="text-[#1677FF] text-[22px] mb-2" style={{ fontFamily: 'cursive', transform: 'rotate(-5deg)' }}>
                    Same meaning.<br/>A clearer version.
                  </p>
                  <svg className="w-12 h-12 text-[#1677FF] transform rotate-90 -mt-2 -ml-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How Verba Works */}
        <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-[#F8FAFC]">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
            
            {/* Left: Product Visual */}
            <div className="w-full h-[500px] bg-[#111827] rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-[#1f2937] overflow-hidden flex flex-col">
              <div className="h-12 border-b border-[#1f2937] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                <div className="w-3 h-3 rounded-full bg-[#eab308]"></div>
                <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
              </div>
              <div className="flex-1 flex p-6 gap-6 text-white font-sans">
                <div className="flex-1 bg-white text-ink p-6 rounded-[8px] overflow-hidden shadow-inner">
                   <h3 className="text-[18px] font-bold mb-4">Methodology</h3>
                   <p className="text-[14px] text-[#4B5563] mb-4">
                     The data collected over a three-month period from the pilot plant were analyzed using standard statistical techniques.
                   </p>
                   <p className="text-[14px] text-[#4B5563]">
                     <span className="bg-[#FFF1B8] px-1 rounded-sm">Furthermore, it is pertinent to note that</span> this approach <span className="bg-[#FFF1B8] px-1 rounded-sm">significantly facilitates</span>...
                   </p>
                </div>
                <div className="w-[240px] shrink-0 space-y-4">
                   <div className="bg-[#1f2937] p-4 rounded-[8px] border border-[#374151]">
                      <div className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider mb-2">Suggestion</div>
                      <p className="text-[13px] text-white mb-4 line-through decoration-[#9CA3AF]">Furthermore, it is pertinent to note that</p>
                      <p className="text-[13px] text-white font-medium mb-4 bg-[#374151] p-2 rounded">This approach also...</p>
                      <button className="w-full py-2 bg-[#1677FF] text-white text-[12px] font-bold rounded-md">Accept Change</button>
                   </div>
                </div>
              </div>
            </div>

            {/* Right: Text & Steps */}
            <div>
               <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                  HOW VERBA WORKS
               </div>
               <h2 className="text-[40px] font-bold tracking-tight text-ink leading-[1.1] mb-2">
                  Three simple steps.
               </h2>
               <p className="text-[18px] text-[#475467] leading-[1.6] mb-12">
                  Upload. Review. Export. That&apos;s it.
               </p>

               <div className="space-y-10">
                 {/* Step 1 */}
                 <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-ink shrink-0 border border-[#EAECF0]">
                       <span className="font-bold text-[18px]">01</span>
                    </div>
                    <div>
                       <h3 className="text-[20px] font-bold text-ink mb-2">Upload</h3>
                       <p className="text-[16px] text-[#475467] leading-relaxed">
                          Securely upload your Microsoft Word document. We protect your formatting and citations.
                       </p>
                    </div>
                 </div>
                 {/* Step 2 */}
                 <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-[#1677FF] shadow-sm flex items-center justify-center text-white shrink-0">
                       <span className="font-bold text-[18px]">02</span>
                    </div>
                    <div>
                       <h3 className="text-[20px] font-bold text-ink mb-2">Review</h3>
                       <p className="text-[16px] text-[#475467] leading-relaxed">
                          Review targeted suggestions. Accept the ones you like, reject the ones you don&apos;t.
                       </p>
                    </div>
                 </div>
                 {/* Step 3 */}
                 <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-ink shrink-0 border border-[#EAECF0]">
                       <span className="font-bold text-[18px]">03</span>
                    </div>
                    <div>
                       <h3 className="text-[20px] font-bold text-ink mb-2">Export</h3>
                       <p className="text-[16px] text-[#475467] leading-relaxed">
                          Download a polished, improved document that still sounds exactly like you.
                       </p>
                    </div>
                 </div>
               </div>

               <div className="mt-10">
                  <Link href="#product" className="text-[#1677FF] font-semibold text-[16px] flex items-center gap-1 hover:gap-2 transition-all">
                     Learn more about how it works <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>

          </div>
        </section>

        {/* 4. Use Cases */}
        <section id="use-cases" className="py-24 px-6 lg:px-8 bg-white">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[40%_60%] gap-16 items-start">
            <div>
               <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                  USE CASES
               </div>
               <h2 className="text-[40px] font-bold tracking-tight text-ink leading-[1.1] mb-6">
                  Built for real writing needs.
               </h2>
               <p className="text-[18px] text-[#475467] leading-[1.6]">
                  Whether you are finalizing a dissertation or sending a crucial business proposal, Verba helps you communicate with absolute clarity.
               </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
               {[
                 { title: "Students", icon: <GraduationCap className="w-5 h-5 text-ink" />, desc: "Refine final-year projects and assignments without losing academic tone." },
                 { title: "Researchers", icon: <FileText className="w-5 h-5 text-ink" />, desc: "Ensure your papers are readable and clear while protecting technical terms." },
                 { title: "Professionals", icon: <Briefcase className="w-5 h-5 text-ink" />, desc: "Polish reports and proposals to sound confident, direct, and professional." },
                 { title: "Institutions", icon: <Building2 className="w-5 h-5 text-ink" />, desc: "Help your team produce consistently clear and high-quality documentation." }
               ].map((item, i) => (
                 <div key={i} className="bg-white border border-[#EAECF0] rounded-[12px] p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#EAECF0] flex items-center justify-center mb-4">
                       {item.icon}
                    </div>
                    <h3 className="text-[18px] font-bold text-ink mb-2">{item.title}</h3>
                    <p className="text-[15px] text-[#475467] leading-relaxed">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* 5. Trust / Ownership */}
        <section className="py-24 px-6 lg:px-8 bg-white border-t border-[#EAECF0]">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
             
             {/* Left: Checklist */}
             <div>
               <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                  TRUSTED RESULTS
               </div>
               <h2 className="text-[40px] font-bold tracking-tight text-ink leading-[1.1] mb-8">
                  Your work stays yours.
               </h2>
               
               <div className="space-y-5">
                 {[
                   "Original document is never overwritten",
                   "Citations and references are strictly protected",
                   "Numerical data and statistics remain intact",
                   "You maintain 100% control over every change"
                 ].map((text, i) => (
                   <div key={i} className="flex items-start gap-4">
                     <div className="w-6 h-6 rounded-full bg-[#EBF5FF] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-[#1677FF]" strokeWidth={3} />
                     </div>
                     <span className="text-[18px] text-[#344054] font-medium">{text}</span>
                   </div>
                 ))}
               </div>
             </div>

             {/* Right: Testimonial */}
             <div className="bg-[#F8FAFC] border border-[#EAECF0] p-10 rounded-[20px] relative">
                <Quote className="w-12 h-12 text-[#E2E8F0] absolute top-6 left-6" />
                <div className="relative z-10 pt-4">
                   <p className="text-[24px] font-serif text-ink leading-relaxed mb-8">
                      &quot;Verba helped me make my final year project sound more natural. It fixed my awkward phrasing without messing up my citations or changing my actual findings.&quot;
                   </p>
                   <div>
                      <p className="font-bold text-[16px] text-ink">Sarah J.</p>
                      <p className="text-[14px] text-[#667085]">Final Year Engineering Student</p>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* 6. CTA Strip */}
        <section className="py-12 px-6 lg:px-8 bg-white">
           <div className="max-w-[1200px] mx-auto bg-[#F0F7FF] rounded-[24px] p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="text-center lg:text-left">
                 <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-3">
                    READY FOR CLEARER WRITING?
                 </div>
                 <h2 className="text-[32px] md:text-[36px] font-bold tracking-tight text-ink leading-[1.1] mb-4">
                    Upload your document and see the difference.
                 </h2>
                 <p className="text-[18px] text-[#475467]">
                    Keep your ideas. Improve the writing.
                 </p>
              </div>
              <div className="shrink-0 flex flex-col items-center lg:items-end">
                 <Link href="/signup" className="px-10 py-4 bg-[#1677FF] text-white font-bold rounded-[8px] hover:bg-[#115fcb] transition-colors shadow-lg text-[16px] w-full sm:w-auto text-center">
                    Upload a Document
                 </Link>
                 <p className="text-[12px] text-[#667085] font-semibold mt-4 tracking-widest uppercase">
                    DOCX &middot; MAXIMUM 25 MB
                 </p>
              </div>
           </div>
        </section>

        {/* 7. FAQ */}
        <section id="faq" className="py-24 px-6 lg:px-8 bg-white border-t border-[#EAECF0]">
          <div className="max-w-[800px] mx-auto">
            <div className="text-center mb-12">
               <h2 className="text-[36px] font-bold tracking-tight text-ink mb-4">
                  Frequently Asked Questions
               </h2>
               <p className="text-[18px] text-[#475467]">
                  Everything you need to know about how Verba works.
               </p>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-[#EAECF0] rounded-[12px] bg-white overflow-hidden transition-all hover:border-[#D0D5DD]">
                  <button 
                    className="w-full p-6 flex items-center justify-between text-left focus:outline-none"
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  >
                    <span className="text-[16px] font-bold text-ink pr-6">{faq.q}</span>
                    <span className="shrink-0 text-[#98A2B3]">
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openFaqIndex === i ? 'rotate-90 text-[#1677FF]' : ''}`} />
                    </span>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-6 pt-0 text-[16px] text-[#475467] leading-[1.6]">
                       {faq.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="bg-white border-t border-[#EAECF0] pt-16 pb-8 px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-12">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
              <img src="/logo.png" alt="Verba" className="h-[32px] w-auto object-contain" />
            </Link>
            <p className="text-[15px] text-[#475467] max-w-[280px] leading-relaxed">
              Writing that sounds like you.<br/>
              Refine your writing without losing your meaning.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-bold text-[13px] text-ink uppercase tracking-wider mb-5">Product</h4>
            <ul className="space-y-4 text-[15px] text-[#475467] font-medium">
              <li><Link href="#how-it-works" className="hover:text-[#1677FF] transition-colors">How It Works</Link></li>
              <li><Link href="#use-cases" className="hover:text-[#1677FF] transition-colors">Use Cases</Link></li>
              <li><Link href="/pricing" className="hover:text-[#1677FF] transition-colors">Pricing</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[13px] text-ink uppercase tracking-wider mb-5">Resources</h4>
            <ul className="space-y-4 text-[15px] text-[#475467] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Help Center</Link></li>
              <li><Link href="#faq" className="hover:text-[#1677FF] transition-colors">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[13px] text-ink uppercase tracking-wider mb-5">Company</h4>
            <ul className="space-y-4 text-[15px] text-[#475467] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Terms</Link></li>
            </ul>
          </div>
          
        </div>
        
        {/* Bottom */}
        <div className="max-w-[1200px] mx-auto mt-16 pt-8 border-t border-[#EAECF0] flex flex-col md:flex-row justify-between items-center gap-4 text-[14px] text-[#667085]">
           <p>&copy; {new Date().getFullYear()} OYEN Group.</p>
           <p>Built for clearer writing.</p>
        </div>
      </footer>
    </div>
  );
}
