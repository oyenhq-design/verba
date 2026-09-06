"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Shield, FileText, Check, ChevronRight, 
  GraduationCap, Building2, Quote, Briefcase, ArrowRight,
  Lightbulb, PenTool, CheckCircle
} from "lucide-react";

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    { q: "What exactly does Verba do?", a: "Verba analyzes your Word document to find robotic, repetitive, or unnecessarily formal writing and suggests clearer, more natural alternatives while preserving your meaning and formatting." },
    { q: "Will Verba change my citations?", a: "Citations and references are treated as protected content and should not be rewritten during standard refinement." },
    { q: "Will my formatting stay the same?", a: "Yes, Verba is designed to preserve your original document formatting when you export." },
    { q: "Can I reject Verba's suggestions?", a: "Absolutely. You are in full control and can accept, edit, or reject any suggestion Verba makes." },
    { q: "Can Verba change my numbers?", a: "No. Numerical data and statistics are preserved to ensure your factual accuracy remains intact." },
    { q: "Does Verba detect AI-written text?", a: "No. Verba focuses on helping you improve clarity, structure and tone. It does not claim to determine whether text was written by AI." }
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
              Try Verba <ArrowRight className="inline ml-1 w-4 h-4" />
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
              <div className="inline-flex items-center text-[#1677FF] text-[12px] font-bold tracking-widest uppercase">
                WRITING, REFINED
              </div>
              <h1 className="text-[56px] md:text-[72px] font-bold tracking-tight text-ink leading-[1.05]">
                Write with clarity.<br/>Keep <span className="text-[#1677FF]">your meaning.</span>
              </h1>
              <p className="text-[18px] text-[#475467] leading-[1.6]">
                Start from an idea or bring existing work. Verba helps you shape, write, review and improve it — making it sound natural, direct and clear without losing your unique voice.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link href="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1677FF] text-white font-semibold rounded-[8px] hover:bg-[#115fcb] transition-colors shadow-[0_2px_8px_rgba(22,119,255,0.25)] text-[15px]">
                  <ArrowRight className="w-4 h-4 -rotate-90" />
                  Upload a Document
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white border border-[#D0D5DD] text-ink font-semibold rounded-[8px] hover:bg-[#F9FAFB] transition-colors text-[15px]">
                  <span className="w-5 h-5 rounded-full border border-ink flex items-center justify-center"><ArrowRight className="w-3 h-3 text-ink" /></span>
                  See How It Works
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[14px] font-medium text-[#475467]">
                <div className="flex items-center gap-2">
                  <Shield className="w-[16px] h-[16px] text-ink" />
                  Your work stays yours
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-[16px] h-[16px] text-ink" />
                  Citations protected
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-[16px] h-[16px] text-ink" />
                  You approve every change
                </div>
              </div>
            </div>

            {/* Right Column (Cards Graphic) */}
            <div className="relative h-[500px] w-full flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] h-[400px]">
                {/* Background Card */}
                <div className="absolute top-4 right-20 w-[300px] h-[340px] bg-white border border-[#EAECF0] rounded-[12px] shadow-sm p-6 transform -rotate-3 transition-transform hover:-rotate-6 duration-500">
                  <div className="text-[10px] font-bold text-[#98A2B3] tracking-widest uppercase mb-6">ORIGINAL</div>
                  <div className="space-y-4">
                    <p className="text-[14px] text-ink leading-relaxed">
                      The results of this research show that the implementation of the system can make it <span className="bg-[#FFE4E6] text-[#BE123C] px-1 rounded-sm">more better and also very efficient in terms of the performance of the process.</span>
                    </p>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-[#1677FF] bg-white rounded-full p-1">
                  <ArrowRight className="w-5 h-5" />
                </div>
                
                {/* Foreground Card */}
                <div className="absolute top-12 right-0 w-[300px] h-[340px] bg-white border border-[#EAECF0] rounded-[12px] shadow-[0_20px_40px_rgba(16,24,40,0.08)] p-6 z-10 transform rotate-3 transition-transform hover:rotate-6 duration-500">
                  <div className="flex items-center gap-2 mb-6">
                    <img src="/logo.png" alt="Verba" className="h-[16px]" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-[14px] text-ink leading-relaxed">
                      The results of this research show that <span className="bg-[#EBF5FF] text-[#0369A1] px-1 rounded-sm">implementing the system can improve process performance and increase efficiency.</span>
                    </p>
                  </div>
                </div>

                {/* Handwritten Notes */}
                <div className="absolute -top-6 -right-12 z-20 flex flex-col items-start">
                  <p className="text-[#1677FF] text-[18px] leading-tight" style={{ fontFamily: 'cursive', transform: 'rotate(-5deg)' }}>
                    Same meaning.<br/>A clearer version.
                  </p>
                  <svg className="w-10 h-10 text-[#1677FF] -ml-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                
                <div className="absolute -bottom-8 right-0 z-20 flex flex-col items-center">
                  <p className="text-[#475467] text-[18px] leading-tight" style={{ fontFamily: 'cursive', transform: 'rotate(-5deg)' }}>
                    Your ideas.<br/>Clearer writing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How Verba Works */}
        <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-[#F8FAFC] border-y border-[#EAECF0]">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
            
            {/* Left: Text */}
            <div className="max-w-[340px]">
               <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                  HOW VERBA WORKS
               </div>
               <h2 className="text-[36px] font-bold tracking-tight text-ink leading-[1.1] mb-4">
                  From idea<br/>to a stronger document.
               </h2>
               <p className="text-[16px] text-[#475467] leading-[1.6] mb-6">
                  A simple process that keeps you in control.
               </p>
               <Link href="#product" className="text-[#1677FF] font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                  Learn how it works <ArrowRight className="w-4 h-4" />
               </Link>
            </div>

            {/* Right: 4 Steps Horizontal */}
            <div className="relative pt-6">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-[1px] bg-[#D0D5DD] -z-10"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative z-10">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center text-[#1677FF] mb-4">
                    <Lightbulb className="w-7 h-7" />
                  </div>
                  <div className="text-[#1677FF] font-bold text-[14px] mb-1">01</div>
                  <h3 className="text-[16px] font-bold text-ink mb-2">Start</h3>
                  <p className="text-[13px] text-[#475467] leading-relaxed max-w-[200px]">
                    Bring your idea or upload your document. Your original stays safe.
                  </p>
                </div>
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center text-[#1677FF] mb-4">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="text-[#1677FF] font-bold text-[14px] mb-1">02</div>
                  <h3 className="text-[16px] font-bold text-ink mb-2">Develop</h3>
                  <p className="text-[13px] text-[#475467] leading-relaxed max-w-[200px]">
                    Get clear suggestions and structure while keeping your meaning.
                  </p>
                </div>
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center text-[#1677FF] mb-4">
                    <PenTool className="w-7 h-7" />
                  </div>
                  <div className="text-[#1677FF] font-bold text-[14px] mb-1">03</div>
                  <h3 className="text-[16px] font-bold text-ink mb-2">Write</h3>
                  <p className="text-[13px] text-[#475467] leading-relaxed max-w-[200px]">
                    Work in a clean, focused editor built for real writing.
                  </p>
                </div>
                {/* Step 4 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center text-[#1677FF] mb-4">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div className="text-[#1677FF] font-bold text-[14px] mb-1">04</div>
                  <h3 className="text-[16px] font-bold text-ink mb-2">Review</h3>
                  <p className="text-[13px] text-[#475467] leading-relaxed max-w-[200px]">
                    See what could be clearer, accept the changes you want, and download.
                  </p>
                </div>
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
                  Built for the documents you actually write.
               </h2>
               <p className="text-[18px] text-[#475467] leading-[1.6] mb-6">
                  Whether you are working on a dissertation, a research paper or a professional report, Verba helps you communicate with confidence.
               </p>
               <Link href="#use-cases" className="text-[#1677FF] font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                  Explore all use cases <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
               {[
                 { title: "Students", icon: <GraduationCap className="w-6 h-6 text-[#1677FF]" />, desc: "Essays, assignments, dissertations." },
                 { title: "Researchers", icon: <FileText className="w-6 h-6 text-[#1677FF]" />, desc: "Papers, manuscripts, articles." },
                 { title: "Professionals", icon: <Briefcase className="w-6 h-6 text-[#1677FF]" />, desc: "Reports, proposals, business documents." },
                 { title: "Institutions", icon: <Building2 className="w-6 h-6 text-[#1677FF]" />, desc: "Support academic integrity and clear communication." }
               ].map((item, i) => (
                 <div key={i} className="bg-white border border-[#EAECF0] rounded-[8px] p-6 flex items-start gap-4">
                    <div className="shrink-0 pt-1">
                       {item.icon}
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-ink mb-1">{item.title}</h3>
                      <p className="text-[14px] text-[#475467] leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* 5. Trust / Ownership */}
        <section className="py-24 px-6 lg:px-8 bg-[#F8FAFC] border-y border-[#EAECF0]">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
             
             {/* Left: Checklist */}
             <div>
               <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                  TRUSTED RESULTS
               </div>
               <h2 className="text-[40px] font-bold tracking-tight text-ink leading-[1.1] mb-8">
                  Your work stays yours.
               </h2>
               
               <div className="space-y-4">
                 {[
                   "Original document is never overwritten",
                   "Citations and references are strictly protected",
                   "Numerical data and statistics remain intact",
                   "You maintain full control over every change"
                 ].map((text, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                     </div>
                     <span className="text-[16px] text-ink font-medium">{text}</span>
                   </div>
                 ))}
               </div>
             </div>

             {/* Right: Testimonial */}
             <div className="pl-0 lg:pl-10">
                <div className="relative">
                   <Quote className="w-12 h-12 text-[#93C5FD] absolute -top-4 -left-6 opacity-50" />
                   <div className="relative z-10 pt-4">
                      <p className="text-[24px] font-serif italic text-[#475467] leading-relaxed mb-6">
                         &quot;Verba helped me make my final year project sound more natural. It fixed my awkward phrasing without changing my actual findings.&quot;
                      </p>
                      <div>
                         <p className="font-bold text-[16px] text-ink">Sarah J.</p>
                         <p className="text-[14px] text-[#667085]">Final Year Engineering Student</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* 6. CTA Strip */}
        <section className="py-16 px-6 lg:px-8 bg-white">
           <div className="max-w-[1200px] mx-auto bg-[#F0F7FF] rounded-[24px] p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#1677FF]">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-2">
                      READY FOR CLEARER WRITING?
                  </div>
                  <h2 className="text-[28px] md:text-[32px] font-bold tracking-tight text-ink leading-[1.1] mb-2">
                      Upload your document and see the difference.
                  </h2>
                  <p className="text-[16px] text-[#475467]">
                      Keep your ideas. Improve the writing.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
                 <Link href="/signup" className="flex items-center justify-center gap-2 px-10 py-4 bg-[#1677FF] text-white font-bold rounded-[8px] hover:bg-[#115fcb] transition-colors shadow-lg text-[16px] w-full sm:w-auto">
                    <ArrowRight className="w-5 h-5 -rotate-90" />
                    Upload a Document
                 </Link>
                 <p className="text-[11px] text-[#667085] font-semibold mt-4 tracking-widest uppercase">
                    DOCX &middot; MAXIMUM 25 MB
                 </p>
              </div>
           </div>
        </section>

        {/* 7. FAQ */}
        <section id="faq" className="py-24 px-6 lg:px-8 bg-white border-t border-[#EAECF0]">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <div className="text-[12px] font-bold text-[#1677FF] uppercase tracking-widest mb-4">
                    COMMON QUESTIONS
                </div>
                <h2 className="text-[36px] font-bold tracking-tight text-ink">
                    Quick answers.
                </h2>
              </div>
              <Link href="#faq" className="text-[#1677FF] font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                  View all questions <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
              <div className="space-y-0">
                {faqs.slice(0, 3).map((faq, i) => (
                  <div key={i} className="border-b border-[#EAECF0]">
                    <button 
                      className="w-full py-6 flex items-center justify-between text-left focus:outline-none hover:text-[#1677FF] transition-colors group"
                      onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    >
                      <span className="text-[16px] font-semibold text-ink group-hover:text-[#1677FF]">{faq.q}</span>
                      <span className="shrink-0 text-[#98A2B3] group-hover:text-[#1677FF]">
                        <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openFaqIndex === i ? 'rotate-90' : ''}`} />
                      </span>
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="text-[15px] text-[#475467] leading-[1.6]">
                         {faq.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-0">
                {faqs.slice(3, 6).map((faq, i) => {
                  const actualIndex = i + 3;
                  return (
                  <div key={actualIndex} className="border-b border-[#EAECF0]">
                    <button 
                      className="w-full py-6 flex items-center justify-between text-left focus:outline-none hover:text-[#1677FF] transition-colors group"
                      onClick={() => setOpenFaqIndex(openFaqIndex === actualIndex ? null : actualIndex)}
                    >
                      <span className="text-[16px] font-semibold text-ink group-hover:text-[#1677FF]">{faq.q}</span>
                      <span className="shrink-0 text-[#98A2B3] group-hover:text-[#1677FF]">
                        <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openFaqIndex === actualIndex ? 'rotate-90' : ''}`} />
                      </span>
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openFaqIndex === actualIndex ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="text-[15px] text-[#475467] leading-[1.6]">
                         {faq.a}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="bg-white border-t border-[#EAECF0] pt-16 pb-8 px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-x-8 gap-y-12">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col pr-8">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
              <img src="/logo.png" alt="Verba" className="h-[28px] w-auto object-contain" />
            </Link>
            <p className="text-[13px] text-[#475467] leading-relaxed mb-6">
              Writing that sounds like you.
            </p>
            <div className="flex items-center gap-4 text-[#98A2B3]">
              <a href="#" className="hover:text-ink transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" className="hover:text-ink transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="hover:text-ink transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-bold text-[13px] text-ink mb-4">Product</h4>
            <ul className="space-y-3 text-[14px] text-[#475467] font-medium">
              <li><Link href="#how-it-works" className="hover:text-[#1677FF] transition-colors">How It Works</Link></li>
              <li><Link href="#use-cases" className="hover:text-[#1677FF] transition-colors">Use Cases</Link></li>
              <li><Link href="/pricing" className="hover:text-[#1677FF] transition-colors">Pricing</Link></li>
              <li><Link href="#faq" className="hover:text-[#1677FF] transition-colors">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[13px] text-ink mb-4">Resources</h4>
            <ul className="space-y-3 text-[14px] text-[#475467] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Writing Guide</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Support</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[13px] text-ink mb-4">Company</h4>
            <ul className="space-y-3 text-[14px] text-[#475467] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[13px] text-ink mb-4">Legal</h4>
            <ul className="space-y-3 text-[14px] text-[#475467] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Terms</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="max-w-[1200px] mx-auto mt-16 pt-8 border-t border-[#EAECF0] flex flex-col md:flex-row justify-between items-center gap-4 text-[13px] text-[#667085]">
           <p>&copy; {new Date().getFullYear()} OYEN Group. All rights reserved.</p>
           <p>Built for clearer writing.</p>
        </div>
      </footer>
    </div>
  );
}
