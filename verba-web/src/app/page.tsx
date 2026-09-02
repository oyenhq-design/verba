"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, Shield, FileText, Upload, 
  Check, Lock, Layers, File,
  Briefcase, ChevronRight, Eye, Download
} from "lucide-react";

export default function Home() {
  const [uploadState, setUploadState] = useState<"default" | "drag" | "uploaded">("default");
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("drag");
  };
  
  const handleDragLeave = () => {
    setUploadState("default");
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("uploaded");
  };

  const faqs = [
    { q: "What exactly does Verba do?", a: "Verba analyzes your Word document to find robotic, repetitive, or unnecessarily formal writing and suggests clearer, more natural alternatives while preserving your meaning and formatting." },
    { q: "Does Verba detect AI-written text?", a: "Verba primarily analyzes writing characteristics such as repetition, formality, clarity and naturalness. It does not claim certainty about authorship." },
    { q: "Will Verba change my citations?", a: "Citations and references are treated as protected content and should not be rewritten during standard refinement." },
    { q: "Can Verba change my numbers?", a: "No. Numerical data and statistics are preserved to ensure your factual accuracy remains intact." },
    { q: "Will my formatting stay the same?", a: "Yes. Verba modifies the text within your document while keeping headings, styles, and structural elements exactly as you left them." },
    { q: "Can I reject Verba's suggestions?", a: "Absolutely. You are in full control and can accept, edit, or reject any suggestion Verba makes." },
    { q: "What happens to my original document?", a: "Your original document is securely stored and never overwritten. Exported files are generated separately." },
    { q: "Can Verba process final-year projects?", a: "Yes. Verba is built to handle complex academic documents, protecting technical terminology while improving readability." },
    { q: "What file types are supported?", a: "Currently, we support standard Microsoft Word documents (.docx)." },
    { q: "Does Verba guarantee detector scores?", a: "No. AI detectors can vary and Verba is designed to improve writing quality rather than guarantee detector outcomes." },
    { q: "What if a sentence already sounds good?", a: "Verba focuses only on passages that genuinely need attention. If a sentence is already clear and natural, Verba will leave it alone." },
    { q: "Can I edit Verba's suggestions manually?", a: "Yes. Every suggestion can be manually tweaked before you accept it into your document." }
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [mobileTab, setMobileTab] = useState<"document" | "suggestions">("document");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent-light selection:text-accent">
      {/* 1. Navigation */}
      <header className="bg-surface sticky top-0 z-50 h-[64px] lg:h-[68px] flex items-center border-b border-border-light">
        <div className="max-w-[1200px] w-full mx-auto px-[18px] md:px-[24px] lg:px-[32px] flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Verba" className="h-[32px] md:h-[38px] w-auto object-contain" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-foreground">
            <Link href="#product" className="hover:text-accent transition-colors">Product</Link>
            <Link href="#how-it-works" className="hover:text-accent transition-colors">How It Works</Link>
            <Link href="#use-cases" className="hover:text-accent transition-colors">Use Cases</Link>
            <Link href="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-accent transition-colors">FAQ</Link>
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
        {/* 2. Hero Section (Split Layout) */}
        <section className="pt-16 lg:pt-16 pb-10 lg:pb-12 px-[18px] md:px-[24px] lg:px-[32px] bg-background relative overflow-hidden">
          {/* Subtle Background Elements */}
          <div className="absolute right-0 top-0 w-1/2 h-full -z-10 pointer-events-none overflow-hidden">
             {/* Faint oversized curved geometric lines */}
             <svg className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] opacity-[0.05]" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="400" cy="400" r="350" stroke="#1677FF" strokeWidth="2" />
                <circle cx="400" cy="400" r="500" stroke="#1677FF" strokeWidth="2" />
                <path d="M-100,800 C300,500 600,600 900,0" stroke="#1677FF" strokeWidth="2" />
             </svg>
             {/* Very soft pale-blue circular shapes */}
             <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent-veryLight rounded-full blur-3xl opacity-60"></div>
          </div>
          
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[57%_43%] gap-8 lg:gap-0 items-start">
            
            {/* Left Content */}
            <div className="space-y-6 pt-2 relative z-10">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-light text-accent text-[11px] font-bold tracking-widest">
                WRITING, REFINED
              </div>
              <h1 className="text-[52px] md:text-[68px] font-bold tracking-[-0.04em] text-ink leading-[1.0]">
                Make your writing <br />
                sound <span className="text-accent">like you.</span>
              </h1>
              <p className="text-[16px] text-foreground-secondary max-w-[530px] leading-[1.6]">
                Upload your Word document and Verba finds robotic, repetitive and unnatural writing while protecting your meaning, citations and document structure.
              </p>

              {/* Upload Box */}
              <div className="pt-4">
                <div 
                  className={`bg-white transition-all duration-300 rounded-[14px] flex flex-col items-center justify-center p-8 lg:h-[280px] max-w-[630px] border border-border shadow-[0_8px_30px_rgba(16,24,40,0.06)] relative
                    ${uploadState === 'drag' ? 'border-accent ring-2 ring-accent/10 bg-accent-veryLight' : ''}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {uploadState === "uploaded" ? (
                     <div className="flex flex-col items-center space-y-4 w-full">
                        <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center text-accent mb-2">
                           <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-[17px] font-semibold text-ink">Final-Year-Project.docx</h3>
                        <p className="text-[14px] text-foreground-secondary">3.4 MB</p>
                        <div className="flex gap-4 mt-2">
                           <button onClick={() => setUploadState("default")} className="text-[13px] font-medium text-foreground-muted hover:text-foreground">Change</button>
                           <button className="px-6 py-2.5 bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]">Analyze</button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full text-center">
                      <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center text-accent mb-4">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="text-[17.5px] font-semibold text-ink mb-1.5">Drop your Word document here</h3>
                      <p className="text-foreground-secondary text-[14.5px] mb-6">or <span className="text-accent cursor-pointer font-medium hover:text-accent-hover" onClick={() => setUploadState("uploaded")}>browse</span> from your computer</p>
                      <button 
                        onClick={() => setUploadState("uploaded")}
                        className="w-[170px] h-[42px] bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors shadow-[0_2px_8px_rgba(22,119,255,0.25)] text-[14.5px]"
                      >
                        Choose Document
                      </button>
                      <p className="text-[11px] text-foreground-muted tracking-widest font-semibold mt-6 uppercase">
                        DOCX &bull; Maximum 25 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Line */}
              <div className="pt-1 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] font-medium text-foreground-secondary">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-[16px] h-[16px] text-accent" />
                  Original preserved
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="w-[16px] h-[16px] text-accent" />
                  Citations protected
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-[16px] h-[16px] text-accent" strokeWidth={3} />
                  You approve every change
                </div>
              </div>
            </div>

            {/* Right Graphic */}
            <div className="relative flex lg:flex justify-center lg:justify-end items-center lg:items-start w-full lg:h-full mt-12 lg:mt-0 lg:pt-6 lg:pr-6 lg:-ml-4">
               <div className="relative w-full max-w-[420px] h-[420px]">
                  {/* Background decorative document */}
                  <div className="absolute top-[40px] right-[40px] w-[210px] h-[230px] bg-white border border-border-light rounded-[14px] shadow-[0_4px_12px_rgba(16,24,40,0.06)] transform -rotate-3 opacity-90">
                     <div className="absolute top-5 left-5 w-8 h-8 bg-surface-secondary rounded-lg flex items-center justify-center text-foreground-muted">
                        <FileText className="w-4 h-4" />
                     </div>
                  </div>
                  
                  {/* Foreground document */}
                  <div className="absolute top-[75px] right-[75px] w-[210px] h-[210px] bg-white border border-border-light rounded-[14px] shadow-[0_12px_36px_rgba(16,24,40,0.08)] p-6 flex flex-col justify-center">
                     <div className="w-14 h-14 bg-accent rounded-[10px] flex items-center justify-center mb-6 shadow-sm">
                        <span className="text-white font-bold text-[22px] font-serif">W</span>
                     </div>
                     <h4 className="font-semibold text-[15px] text-ink mb-1">Final-Year-Project.docx</h4>
                     <p className="text-foreground-secondary text-[13px]">3.4 MB</p>
                  </div>

                  {/* Handwritten note */}
                  <div className="absolute bottom-[80px] right-[40px] max-w-[200px] flex flex-col items-center">
                     <p className="text-accent font-medium text-[20px] leading-[1.1] mb-1.5 text-center" style={{ fontFamily: 'cursive', transform: 'rotate(-4deg)' }}>
                        Better writing.<br/>Same meaning.
                     </p>
                     {/* Curved arrow pointing to document */}
                     <svg className="w-10 h-10 text-accent transform rotate-[110deg] -ml-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                     </svg>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* 3. Product Demonstration (Split Layout - Dark Editor) */}
        <section id="product" className="py-16 px-[18px] md:px-[24px] lg:px-[32px] bg-background-pale relative">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[26%_74%] gap-12 items-center">
            
            {/* Left Content */}
            <div className="space-y-6">
               <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-4">
                  SEE IT IN ACTION
               </div>
               <h2 className="text-[36px] md:text-[40px] font-bold tracking-tight text-ink leading-[1.1]">
                  See exactly what <br/>Verba changes.
               </h2>
               <p className="text-[16px] text-foreground-secondary leading-[1.6]">
                  Verba focuses on passages that genuinely need attention instead of rewriting everything.
               </p>
               <div className="pt-2">
                  <Link href="#product" className="text-accent font-semibold text-[15.5px] flex items-center gap-1 hover:gap-2 transition-all">
                     Explore the product <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>

            {/* Right: Dark Editor Mockup */}
            <div className="w-full flex flex-col items-center">
               <div className="w-full max-w-[850px] h-[480px] rounded-[14px] overflow-hidden shadow-[0_18px_40px_rgba(16,24,40,0.16)] bg-ink border border-border-editor flex relative font-sans text-white">
                 
                 {/* Sidebar Outline */}
                 <div className="hidden lg:block w-[150px] shrink-0 border-r border-border-editor bg-ink p-5">
                   <h3 className="font-bold text-white text-[12.5px] mb-6 tracking-wide">Final Year Project</h3>
                   <div className="space-y-2 text-[12.5px] font-medium text-[#9CA3AF]">
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">Introduction</div>
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">Literature Review</div>
                     <div className="bg-white/10 text-white px-2 py-1.5 rounded-md cursor-pointer">Methodology</div>
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">Results</div>
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">Discussion</div>
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">Conclusion</div>
                     <div className="hover:text-white cursor-pointer px-2 py-1.5 rounded-md transition-colors">References</div>
                   </div>
                 </div>

                 {/* Mobile Tabs */}
                 <div className="flex md:hidden w-full border-b border-border-editor bg-ink">
                   <button 
                     onClick={() => setMobileTab("document")}
                     className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${mobileTab === 'document' ? 'text-accent border-b-2 border-accent bg-white/5' : 'text-[#9CA3AF] hover:text-white'}`}
                   >
                     Document
                   </button>
                   <button 
                     onClick={() => setMobileTab("suggestions")}
                     className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${mobileTab === 'suggestions' ? 'text-accent border-b-2 border-accent bg-white/5' : 'text-[#9CA3AF] hover:text-white'}`}
                   >
                     Suggestions
                   </button>
                 </div>

                 {/* Document Area */}
                 <div className={`flex-1 bg-white flex-col relative overflow-hidden ${mobileTab === 'document' ? 'flex' : 'hidden md:flex'}`}>
                   <div className="p-8 lg:p-14 flex-1 overflow-y-auto text-foreground">
                     <h2 className="text-[21px] font-bold mb-5">3.2 Methodology</h2>
                     
                     <div className="space-y-5 text-[14.5px] leading-[1.8] text-[#4B5563]">
                       <p>
                         The experimental investigation was carried out using Aspen HYSYS to evaluate process performance under different operating conditions.
                       </p>
                       
                       <p>
                         <span className="bg-[#FFF1B8] px-1 rounded-sm cursor-pointer">Furthermore, it is pertinent to note that</span> the implementation of this methodology <span className="bg-[#FFF1B8] px-1 rounded-sm cursor-pointer">significantly facilitates the optimization of</span> operational efficiency within the proposed system.
                       </p>

                       <p>
                         The data collected over a three-month period from the pilot plant were analyzed using standard statistical techniques and compared with baseline model predictions.
                       </p>
                     </div>
                   </div>
                   
                   {/* Bottom Bar */}
                   <div className="h-10 border-t border-[#E5E7EB] bg-white flex items-center justify-between px-5 text-[#9CA3AF] text-[11px] font-medium">
                      <div className="flex gap-4"><span>Page 14 of 42</span> <span>138 words</span></div>
                      <div>100%</div>
                   </div>
                 </div>

                 {/* Suggestion Panel */}
                 <div className={`w-full md:w-[270px] shrink-0 border-t md:border-t-0 md:border-l border-border-editor bg-ink flex-col ${mobileTab === 'suggestions' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'}`}>
                   <div className="p-4 border-b border-border-editor flex items-center justify-between">
                     <h3 className="font-bold text-[13.5px]">Writing Assistant</h3>
                     <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                       18 suggestions
                     </span>
                   </div>
                   
                   <div className="p-4 flex-1 flex flex-col space-y-6 overflow-y-auto">
                     <div>
                       <div className="inline-block bg-white/10 text-white/80 px-2 py-1 rounded text-[9.5px] font-bold uppercase tracking-wider mb-2">OVERLY FORMAL</div>
                       <p className="text-[12.5px] text-[#9CA3AF] leading-relaxed">
                         This phrase makes a straightforward idea harder to read than necessary.
                       </p>
                     </div>
                     
                     <div className="space-y-3">
                       <div>
                         <span className="text-[10.5px] text-[#9CA3AF] uppercase font-bold tracking-wider block mb-1">Original</span>
                         <p className="text-[12.5px] text-white p-2.5 bg-white/5 border border-white/10 rounded-lg line-through decoration-[#9CA3AF]">
                           Furthermore, it is pertinent to note that...
                         </p>
                       </div>
                       <div>
                         <span className="text-[10.5px] text-[#9CA3AF] uppercase font-bold tracking-wider block mb-1">Suggested</span>
                         <p className="text-[12.5px] font-medium p-2.5 bg-white rounded-lg text-foreground">
                           This approach also...
                         </p>
                       </div>
                     </div>

                     <div>
                       <span className="text-[10.5px] text-[#9CA3AF] uppercase font-bold tracking-wider block mb-2">Protected</span>
                       <div className="space-y-2.5">
                         <div className="flex items-center gap-2 text-[11.5px] text-white">
                           <Check className="w-3.5 h-3.5 text-status-success" /> Meaning
                         </div>
                         <div className="flex items-center gap-2 text-[11.5px] text-white">
                           <Check className="w-3.5 h-3.5 text-status-success" /> Numbers
                         </div>
                         <div className="flex items-center gap-2 text-[11.5px] text-white">
                           <Check className="w-3.5 h-3.5 text-status-success" /> Citations
                         </div>
                         <div className="flex items-center gap-2 text-[11.5px] text-white">
                           <Check className="w-3.5 h-3.5 text-status-success" /> Technical terms
                         </div>
                       </div>
                     </div>

                     <div className="pt-2 flex gap-1.5 mt-auto">
                       <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 h-[38px] rounded-[8px] text-[12.5px] font-semibold transition">Reject</button>
                       <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 h-[38px] rounded-[8px] text-[12.5px] font-semibold transition">Edit</button>
                       <button className="flex-1 bg-accent text-white h-[38px] rounded-[8px] text-[12.5px] font-semibold hover:bg-accent-hover transition">Accept</button>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="text-center mt-6">
                 <p className="text-[13px] font-medium text-foreground-secondary flex items-center justify-center gap-2">
                   <Shield className="w-4 h-4 text-accent" /> Your document stays intact. You decide what changes.
                 </p>
               </div>
            </div>
          </div>
        </section>

        {/* 4. How Verba Works (Split + Horizontal Timeline) */}
        <section id="how-it-works" className="py-14 lg:py-16 px-[18px] md:px-[24px] lg:px-[32px] bg-background border-b border-border-light">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[26%_74%] gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div>
               <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-4">
                  HOW VERBA WORKS
               </div>
               <h2 className="text-[32px] md:text-[38px] font-bold tracking-tight text-ink leading-[1.1] mb-5">
                  Simple from<br/>start to finish.
               </h2>
               <p className="text-[15.5px] text-foreground-secondary leading-[1.6] mb-6">
                  Three steps. One document. No copying between tools.
               </p>
               <Link href="#how-it-works" className="text-accent font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                  Learn how it works <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
            
            {/* Right Timeline */}
            <div className="relative pl-0 lg:pl-10">
              <div className="grid md:grid-cols-3 gap-8 md:gap-10 relative z-10">
                
                {/* Step 1 */}
                <div className="flex flex-col text-left relative group">
                  <div className="flex items-center mb-5">
                     <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent shrink-0 relative z-10">
                        <Upload className="w-5 h-5" />
                     </div>
                     <div className="hidden md:block flex-1 h-[2px] bg-border-light ml-4 -mr-8 relative z-0">
                        <ArrowRight className="w-3.5 h-3.5 text-border-light absolute right-0 top-1/2 -translate-y-1/2" />
                     </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-ink mb-1.5 flex items-center">
                    <span className="text-[18px] font-bold text-foreground mr-2.5">01</span> Upload
                  </h3>
                  <p className="text-[14.5px] text-foreground-secondary leading-[1.6] max-w-[220px]">
                    Upload your Word document. Your original stays preserved.
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col text-left relative group">
                  <div className="flex items-center mb-5">
                     <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent shrink-0 relative z-10">
                        <Eye className="w-5 h-5" />
                     </div>
                     <div className="hidden md:block flex-1 h-[2px] bg-border-light ml-4 -mr-8 relative z-0">
                        <ArrowRight className="w-3.5 h-3.5 text-border-light absolute right-0 top-1/2 -translate-y-1/2" />
                     </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-ink mb-1.5 flex items-center">
                    <span className="text-[18px] font-bold text-foreground mr-2.5">02</span> Review
                  </h3>
                  <p className="text-[14.5px] text-foreground-secondary leading-[1.6] max-w-[220px]">
                    See what could be clearer or more natural and why Verba flagged it.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col text-left relative group">
                  <div className="flex items-center mb-5">
                     <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent shrink-0 relative z-10">
                        <Download className="w-5 h-5" />
                     </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-ink mb-1.5 flex items-center">
                    <span className="text-[18px] font-bold text-foreground mr-2.5">03</span> Export
                  </h3>
                  <p className="text-[14.5px] text-foreground-secondary leading-[1.6] max-w-[220px]">
                    Approve the changes you want and download your document again.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 5. Use Cases (Split + 2x3 Grid) */}
        <section id="use-cases" className="py-16 px-[18px] md:px-[24px] lg:px-[32px] bg-background border-b border-border-light">
          <div className="max-w-[1200px] mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
               <div className="max-w-[500px]">
                  <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-4">
                     USE CASES
                  </div>
                  <h2 className="text-[32px] md:text-[38px] font-bold tracking-tight text-ink leading-[1.1]">
                     Made for the documents you actually write.
                  </h2>
               </div>
               <Link href="#use-cases" className="text-accent font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                  View all use cases <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: "Final-Year Projects", desc: "Refine full chapters while protecting references, tables and technical details.", icon: <FileText className="w-5 h-5" />, color: "bg-[#F0F7FF] text-[#1677FF]" },
                { title: "Assignments", desc: "Improve awkward, repetitive or overly formal academic writing.", icon: <Eye className="w-5 h-5" />, color: "bg-[#F3F0FF] text-[#6366F1]" },
                { title: "Research Papers", desc: "Improve clarity without weakening technical meaning.", icon: <File className="w-5 h-5" />, color: "bg-[#FFF8E6] text-[#D97706]" },
                { title: "Technical Reports", desc: "Make complex professional writing more direct and readable.", icon: <Layers className="w-5 h-5" />, color: "bg-[#ECFDF5] text-[#059669]" },
                { title: "CV & Cover Letters", desc: "Replace generic wording with clearer, more personal language.", icon: <Briefcase className="w-5 h-5" />, color: "bg-[#FAF5FF] text-[#9333EA]" },
                { title: "Business Documents", desc: "Refine proposals, reports and professional communication.", icon: <Upload className="w-5 h-5" />, color: "bg-[#FFF1F2] text-[#E11D48]" }
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#EAECF0] rounded-[12px] p-[22px] lg:p-[24px] shadow-[0_3px_10px_rgba(16,24,40,0.035)] hover:shadow-[0_8px_20px_rgba(16,24,40,0.06)] hover:border-[#D0D5DD] hover:-translate-y-[2px] transition-all duration-200 group flex items-start gap-4 min-h-[125px] cursor-pointer">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 pt-0.5">
                     <h3 className="text-[15px] lg:text-[16px] font-semibold text-ink mb-1.5">{item.title}</h3>
                     <p className="text-[13.5px] lg:text-[14px] text-foreground-secondary leading-[1.5]">
                        {item.desc}
                     </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-border group-hover:text-accent transition-colors shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Document Protection (Split Layout + Diagram) */}
        {/* 6. Document Protection (Split Layout + Diagram) */}
        <section className="py-16 px-[18px] md:px-[24px] lg:px-[32px] bg-background border-b border-border-light">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[35%_65%] gap-12 lg:gap-16 items-center">
            
            {/* Left: Text */}
            <div className="space-y-6">
              <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-2">
                 BUILT AROUND YOUR DOCUMENT
              </div>
              <h2 className="text-[32px] md:text-[38px] font-bold tracking-tight text-ink leading-[1.1]">Your work <br/>stays yours.</h2>
              <p className="text-[15.5px] text-foreground-secondary leading-[1.7] max-w-[360px]">
                Verba keeps your original document separate from every revision, so you can improve the writing without losing the original.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-status-successLight flex items-center justify-center shrink-0 border border-status-success/20">
                     <Check className="w-3 h-3 text-status-success" strokeWidth={3} />
                  </div>
                  <span className="font-semibold text-foreground text-[14px]">Original never overwritten</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-status-successLight flex items-center justify-center shrink-0 border border-status-success/20">
                     <Check className="w-3 h-3 text-status-success" strokeWidth={3} />
                  </div>
                  <span className="font-semibold text-foreground text-[14px]">Suggestions stored separately</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-status-successLight flex items-center justify-center shrink-0 border border-status-success/20">
                     <Check className="w-3 h-3 text-status-success" strokeWidth={3} />
                  </div>
                  <span className="font-semibold text-foreground text-[14px]">Delete when you&apos;re done</span>
                </div>
              </div>
            </div>
            
            {/* Right: Vertical Diagram */}
            <div className="bg-white border border-[#EAECF0] rounded-[14px] p-8 lg:p-10 flex flex-col justify-center space-y-5 relative shadow-[0_2px_8px_rgba(16,24,40,0.04)]">
              
              <div className="flex items-center gap-8 group">
                 <div className="bg-white border border-border-light px-5 py-3.5 rounded-[12px] flex items-center gap-4 w-[220px] shadow-sm relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                       <Lock className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-bold text-[13.5px] text-ink tracking-tight uppercase">ORIGINAL.DOCX</span>
                 </div>
                 <ArrowRight className="w-5 h-5 text-border shrink-0 hidden sm:block" />
                 <div className="text-[13.5px] text-foreground-secondary hidden sm:block font-medium">Source file</div>
              </div>

              <div className="flex items-center gap-8 group">
                 <div className="bg-white border border-border-light px-5 py-3.5 rounded-[12px] flex items-center gap-4 w-[220px] shadow-sm relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                       <Eye className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-bold text-[13.5px] text-ink tracking-tight uppercase">VERBA ANALYSIS</span>
                 </div>
                 <ArrowRight className="w-5 h-5 text-border shrink-0 hidden sm:block" />
                 <div className="text-[13.5px] text-foreground-secondary hidden sm:block font-medium">We analyze and highlight</div>
              </div>

              <div className="flex items-center gap-8 group">
                 <div className="bg-white border border-border-light px-5 py-3.5 rounded-[12px] flex items-center gap-4 w-[220px] shadow-sm relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                       <FileText className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-bold text-[13.5px] text-ink tracking-tight uppercase">REVISION 01</span>
                 </div>
                 <ArrowRight className="w-5 h-5 text-border shrink-0 hidden sm:block" />
                 <div className="text-[13.5px] text-foreground-secondary hidden sm:block font-medium">You review and approve</div>
              </div>

              <div className="flex items-center gap-8 group">
                 <div className="bg-white border border-border-light px-5 py-3.5 rounded-[12px] flex items-center gap-4 w-[220px] shadow-sm relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                       <Download className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-bold text-[13.5px] text-ink tracking-tight uppercase">EXPORT.DOCX</span>
                 </div>
                 <ArrowRight className="w-5 h-5 text-border shrink-0 hidden sm:block" />
                 <div className="text-[13.5px] text-foreground-secondary hidden sm:block font-medium">Download your document</div>
              </div>

            </div>
          </div>
        </section>



        {/* 8. FAQ (Split Layout + 2 Column) */}
        <section id="faq" className="py-16 px-[18px] md:px-[24px] lg:px-[32px] bg-background">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[27%_73%] gap-12 lg:gap-16 items-start">
            <div>
               <div className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-4">
                  COMMON QUESTIONS
               </div>
               <h2 className="text-[34px] md:text-[38px] font-bold tracking-tight text-ink leading-[1.1]">
                  Questions before<br/>you upload?
               </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-0">
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-[#EAECF0] hover:border-[#D0D5DD] transition-colors">
                  <button 
                    className="w-full py-4 flex items-center justify-between text-left hover:text-accent transition-colors focus:outline-none min-h-[52px] group"
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    aria-expanded={openFaqIndex === i}
                  >
                    <span className="text-[14.5px] lg:text-[15px] font-semibold text-ink pr-6 leading-snug">{faq.q}</span>
                    <span className="shrink-0 text-foreground-muted group-hover:text-accent transition-colors">
                      <ChevronRight className={`w-4 h-4 transition-transform ${openFaqIndex === i ? 'rotate-90 text-accent' : ''}`} />
                    </span>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-[14.5px] lg:text-[15px] text-foreground-secondary leading-[1.55]">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-[1200px] mx-auto flex justify-end mt-10 pr-[18px] md:pr-[24px] lg:pr-[32px]">
             <Link href="#faq" className="text-accent font-semibold text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
                View all questions <ArrowRight className="w-4 h-4" />
             </Link>
          </div>
        </section>

        {/* 9. Final CTA */}
        <section className="px-[18px] md:px-[24px] lg:px-[32px] pb-20 pt-8 bg-background">
          <div className="max-w-[1200px] mx-auto bg-[#FFFBEB] border border-[#FDE68A] px-8 lg:px-12 py-8 lg:py-0 rounded-[14px] flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm min-h-[140px]">
             
             <div className="flex items-center gap-6 text-left max-w-[650px] py-2">
               <div className="hidden sm:flex w-16 h-16 rounded-full bg-white border border-[#FDE68A] items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(217,119,6,0.08)] relative">
                  <FileText className="w-8 h-8 text-[#D97706]" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border border-[#FDE68A] flex items-center justify-center">
                     <div className="w-1.5 h-1.5 bg-[#D97706] rounded-full" />
                  </div>
               </div>
               <div>
                  <h2 className="text-[24px] md:text-[28px] font-[650] tracking-tight text-ink leading-[1.2] mb-1.5">
                     Your document. Your meaning. Your voice.
                  </h2>
                  <p className="text-[14.5px] text-foreground-secondary leading-relaxed">
                     See what Verba can improve without losing what makes the writing yours.
                  </p>
               </div>
             </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-5 shrink-0 w-full lg:w-auto py-2">
              <Link href="/signup" className="flex items-center justify-center w-full sm:w-auto h-[44px] px-8 rounded-[8px] bg-ink text-white font-semibold hover:bg-ink-secondary transition-colors text-[14.5px] shadow-sm">
                Upload a Document
              </Link>
              <Link href="/signup" className="text-accent font-semibold text-[14.5px] flex items-center gap-1 hover:gap-2 transition-all h-[44px]">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
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
              <li><Link href="#how-it-works" className="hover:text-[#1677FF] transition-colors duration-150">How It Works</Link></li>
              <li><Link href="#use-cases" className="hover:text-[#1677FF] transition-colors duration-150">Use Cases</Link></li>
              <li><Link href="/pricing" className="hover:text-[#1677FF] transition-colors duration-150">Pricing</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[12px] text-[#344054] uppercase tracking-[0.04em] mb-[18px]">Resources</h4>
            <ul className="space-y-[14px] text-[14px] text-[#667085] font-medium">
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Help</Link></li>
              <li><Link href="#" className="hover:text-[#1677FF] transition-colors duration-150">Writing Guide</Link></li>
              <li><Link href="#faq" className="hover:text-[#1677FF] transition-colors duration-150">FAQ</Link></li>
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
