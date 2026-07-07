import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Star, Sun, Wand2 } from 'lucide-react';

// ── 100 Strictly Invoice & App-Related Daily Work Predictions ──
const PREDICTIONS = [
  "Your tax calculations matched perfectly on the first try today. Good job!",
  "A client is sending ten emails asking for a discount. Just mute your phone and send the full invoice anyway.",
  "A client will pay their invoice before the due date today. A rare miracle!",
  "The next invoice email you send will get approved instantly by the finance manager.",
  "The GST portal is slow today. Take a quick coffee break and try sending the invoice again later.",
  "You are officially the most productive billing administrator in the company today.",
  "A client will clear all their outstanding dues within the hour. Keep an eye on the bank account.",
  "A status meeting about outstanding invoices will result in immediate payment approvals today.",
  "Your boss is checking the billing forecast. Look busy and ensure all invoices are updated.",
  "Avoid the printer room today. The physical invoice paper is jamming constantly.",
  "An invoice draft was saved in the wrong folder. Check your drafts before raising a new one.",
  "Your spreadsheet formulas for tax rates will run super fast today. No crashes!",
  "The client wants a major layout change for a small bill. Politely decline.",
  "Your invoice database queries will run in under 10ms today. Fast data loading!",
  "A client will approve your invoice without asking to make the company logo bigger.",
  "Your business cash flow is entering a healthy phase. More invoice payments are coming!",
  "Do not touch old invoice columns. Let the database history remain peaceful.",
  "A client email will contain high praise for your billing accuracy. Keep it up!",
  "Your manager is in a great mood. It is the perfect day to pitch a new invoice format.",
  "The finance team will process your outstanding invoice batch today. Get ready for payouts!",
  "The client will accept your billing terms with zero arguments. A great victory!",
  "A tax calculation bug on line-item totals will turn out to be a simple typo. Fixed in two seconds!",
  "Your keyboard will feel satisfyingly clicky. You are typing invoices like a pro.",
  "You will find a keyboard shortcut for generating invoice rows that saves you 20 minutes today.",
  "Your local server will load the PDF invoice preview instantly. Ready to print!",
  "A client will send their company registration details in the correct format for invoicing. A rare blessing!",
  "The client's billing budget will increase today. Time to submit those extra hours and invoice them.",
  "Clean up your email inbox today. Clear the path for fresh payment approvals.",
  "Your laptop fan is spinning fast. It is working hard to export those heavy invoice PDFs.",
  "The stars recommend double-checking tax rates. Ensure your invoice items are perfectly compliant.",
  "An old invoice you forgot about will suddenly be paid. Good business karma is real!",
  "Your invoice layout columns will auto-fit perfectly today. A very satisfying alignment victory.",
  "Stay focused on closing your open invoice lists and chasing outstanding balances today.",
  "A cup of strong coffee will help you power through auditing the last 50 invoice drafts.",
  "You will explain a complex tax rule and the client will understand and pay the invoice instantly.",
  "The invoice portal will load in under 50ms today. The universe wants your billing to be swift.",
  "You will discover a keyboard shortcut for creating invoices. Your workflow gets faster!",
  "Try designing a premium new invoice template today to impress the client.",
  "An unexpected client payment for a long-delayed invoice will hit your account today!",
  "A client wants a video call. Put on a clean shirt and present the line-item invoice breakdown clearly.",
  "All tax percentages will align perfectly on your invoice items today. Zero errors!",
  "A client asks for an invoice discount. Politely explain your billing rates and stand firm.",
  "Today is the best day to write invoices. Go secure those payments!",
  "Your office setup is ready. Time to input the week's client billing details into the ledger.",
  "Your team will agree on the new invoice styling in under 2 minutes. True alignment!",
  "A client will say 'we trust your invoice layout choice'. Frame that email immediately!",
  "You will find the perfect invoice description text. No client queries this time.",
  "The afternoon sun will give you a boost of positive energy to finish this month's billing cycle.",
  "A client will pay the invoice in full without any reminders. A peaceful day!",
  "The billing calculations will not return any '#VALUE!' errors today. A big victory!",
  "You will write a comment that explains the billing code perfectly. Future you will thank you.",
  "A meeting will be canceled. You get 30 minutes of quiet focus time to audit invoice receipts.",
  "Update your status to 'Writing Invoices' so nobody disturbs your billing focus.",
  "An old client will message you wanting to start a new project. More invoices to write!",
  "The billing server's battery and power backups are running perfectly today. No data loss!",
  "You will find a bug in someone else's tax code. Fix the invoice subtotal generator gently and move on.",
  "Your invoicing workspace will stay clean and organized all day. A rare and satisfying event.",
  "A quick break will give you the energy to resolve a complex client billing dispute.",
  "A client will accept your invoice payment deadline with zero arguments. A time-saving victory!",
  "Your invoice generator code review will pass on the first try today. Clean coding!",
  "The stars favor finishing tasks today. Clear your outstanding invoice checklist!",
  "An invoice reminder email gets an immediate payment receipt. The reminder worked!",
  "Your laptop will stay cool today. No CPU lag while loading complex invoice charts.",
  "You will help a colleague solve a tricky tax configuration. Teamwork wins!",
  "The client will ask for your bank details. The sweet sound of payment success!",
  "You will find a draft invoice that is 95% complete. A gift from past you.",
  "Eating a sweet treat today will give you maximum typing energy for entering billing records.",
  "A client will praise your invoice tracking system. Professional invoicing at its best!",
  "Your CSS styling for the PDF print invoice will look perfect on Chrome, Safari, and Firefox.",
  "No duplicate client names will show up in your invoice database today. Pure data order!",
  "An invoice will be paid in under 2 hours after sending. A new speed record!",
  "Your code editor theme looks extra beautiful today. Eye-pleasing coding session on the billing system.",
  "You will write a search filter for invoice emails that works perfectly on the first try.",
  "Taking a deep breath today will save you from a difficult billing argument with a client.",
  "A client will pay the tax amount without asking 'what is this tax?'. Miracle!",
  "Your local dev server boots up in under 2 seconds. Turbo-charged invoice application testing!",
  "You will find the perfect documentation page on the first search for tax APIs.",
  "The client will say 'we love the invoice preview'. Golden words!",
  "Your warm drink will keep you company while you audit the annual billing report.",
  "An old calculation bug in the invoice generator will fix itself after a simple reboot.",
  "You will write a script that automates a boring billing reminder task. True efficiency!",
  "A peaceful, productive evening is ahead of you. Finish those client bills!",
  "You will click 'LOGIN' and have a truly successful invoicing day!",
  "The new invoice template designs are approved. Time to update the client portal.",
  "A client will pay two invoices together in one single transaction. Super convenient!",
  "You will clean up old client contacts from the billing database. Clean data keeps things fast.",
  "Your keyboard clicks will feel exceptionally smooth today. Type those invoices away!",
  "A client will confirm they received the PDF attachment. No lost invoices today.",
  "The billing team will get a positive review from the CFO. Excellent job!",
  "You will close three long-standing unpaid invoice accounts today. Great effort!",
  "A client calls just to say thank you for the prompt invoice delivery. A pleasant surprise!",
  "Your spreadsheet macros for billing will compile and execute with zero warnings.",
  "You will find an archive of old paid invoices that brings back good memories.",
  "A quiet afternoon will allow you to clear all pending invoice drafts.",
  "Your manager will share success metrics for the billing department. Enjoy the boost!",
  "A client will pay the exact balance without any round-off discrepancies. Perfect!",
  "You will write a custom invoice note that resolves a long-standing client query.",
  "The database server has 100% uptime today. No invoice synchronization issues!",
  "All invoice emails will pass spam filters and land straight in client inboxes.",
  "You will log into the invoice system and get everything done ahead of time!",
  "A client's credit note request was automatically matched and updated on the dashboard.",
  "The automated billing system sent the invoice on the exact hour required by the client.",
  "Your currency converter fetched the exact live exchange rates for your international invoices.",
  "You will successfully set up recurring invoice rules for your long-term monthly clients.",
  "The tax auditor checked the billing entries and found absolutely zero discrepancies.",
  "You exported a clean CSV log of all invoices generated this financial quarter.",
  "A late-paying client sent a screenshot of the processed payment. Invoice status updated to Paid!"
];

// ── 30 Daily Motivational Business & Invoicing Quotes ──
const MOTIVATIONAL_QUOTES = [
  "Happiness can be found, even in the darkest of spreadsheets, if one only remembers to turn on the light.",
  "Focus on precision, and the numbers will align to pave your path to success.",
  "Quality in invoicing is not an act, it is a daily habit of meticulous care.",
  "Great achievements in business are the sum of small, accurate details balanced perfectly.",
  "Every accurate invoice sent is a step closer to sustainable financial success.",
  "The secret of getting ahead in accounts receivable is simply getting started today.",
  "Precision is the soul of commerce; keep your billing clean and your ledger clear.",
  "Do not wait for opportunities, create them—one transparent client billing cycle at a time.",
  "Success is the sum of small accounting details, repeated day in and day out.",
  "Opportunities don't just happen; you build them with accurate tracking and prompt invoicing.",
  "A satisfied client pays promptly. Build lasting trust through absolute billing transparency.",
  "Efficiency is doing things right; effectiveness is doing the right things in your ledger.",
  "The only way to do great work in finance is to love the beautiful order of the numbers.",
  "In the world of business, integrity is the most valuable currency you will ever trade.",
  "Every number in your ledger tells a story of dedication, hard work, and business growth.",
  "Let your billing be clear, your tax calculations precise, and your professional growth unstoppable.",
  "Persistence guarantees that results are inevitable. Keep refining your financial workflows.",
  "Your financial clarity today is the absolute foundation for your business expansion tomorrow.",
  "Success is not final; failure is not fatal: it is the courage to keep balancing the books that counts.",
  "Believe you can, and you're already halfway to reconciling your accounts perfectly.",
  "The best way to predict the future of your cash flow is to actively build it today.",
  "It is not about having time for billing; it is about making time for financial clarity.",
  "Keep your eyes on the stars, your feet on the ground—and your calculations perfect.",
  "Action is the foundational key to all business and accounting success.",
  "Small daily improvements in billing cycles over time lead to stunning financial results.",
  "Do what you can, with what you have, where you are—and get those invoices processed!",
  "A prompt, clean invoice is a polite reminder of the value you've already delivered.",
  "Consistency in details builds empires. Keep your ledger entries meticulous.",
  "Out of complexity, find simplicity. Out of discord, find harmony in your accounts.",
  "The reward of a job well done is the trust of a client who pays with absolute satisfaction."
];

// Helper to get deterministic daily quote
const getDailyQuote = () => {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
};

// ── Astrolabe segments ────────────────────────────────────────────────────────
const SEGMENTS = [
  { title: "Jupiter's Blessing", label: "Jupiter\nBlessing 🌟", color: '#FCFBF7' },
  { title: "Mercury direct",    label: "Mercury\nDirect 🔮", color: '#F6F5F0' },
  { title: "Retrograde Shield", label: "Retrograde\nShield 🛡️", color: '#EFECE6' },
  { title: "Cosmic Alignment",  label: "Cosmic\nAlignment ✨", color: '#FCFBF7' },
  { title: "Solar Charge",      label: "Solar\nCharge ☀️", color: '#F6F5F0' },
  { title: "Saturn's Favor",    label: "Saturn's\nFavor 🪐", color: '#EFECE6' },
  { title: "Lunar Balance",     label: "Lunar\nBalance 🌙", color: '#FCFBF7' },
  { title: "Neptune's Grace",   label: "Neptune's\nGrace 🌊", color: '#F6F5F0' }
];

const NUM = SEGMENTS.length;
const SLICE = (2 * Math.PI) / NUM;
const RADIUS = 145; 
const CX = 160;
const CY = 160;

// Draw slice path for SVG
const slicePath = (i) => {
  const startAngle = i * SLICE - Math.PI / 2;
  const endAngle = startAngle + SLICE;
  const x1 = CX + RADIUS * Math.cos(startAngle);
  const y1 = CY + RADIUS * Math.sin(startAngle);
  const x2 = CX + RADIUS * Math.cos(endAngle);
  const y2 = CY + RADIUS * Math.sin(endAngle);
  return `M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
};

// Calculate label positioning with auto-rotation adjustment
const labelPos = (i) => {
  const angle = i * SLICE + SLICE / 2 - Math.PI / 2;
  const r = RADIUS * 0.65;
  let textAngle = (angle * 180) / Math.PI + 90;
  
  // Normalize angle to 0-360 range
  const normalizedAngle = (textAngle % 360 + 360) % 360;
  
  // Flip text by 180 degrees if it's in the bottom/left segments to keep it right-side up
  if (normalizedAngle > 90 && normalizedAngle < 270) {
    textAngle += 180;
  }
  
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
    angle: textAngle
  };
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [particles, setParticles] = useState([]);
  const [imgFailed, setImgFailed] = useState(false);

  // Trigger magic burst of Harry Potter icons/sparks when modal opens
  const triggerSpellBurst = () => {
    const magicSymbols = ['⚡', '✨', '🔮', '🦉', '🧹', '🪄', '🦁', '🔑', '🏆', '🌟'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => {
      const angle = Math.random() * 2 * Math.PI;
      const distance = 100 + Math.random() * 200;
      return {
        id: Math.random() + i,
        char: magicSymbols[i % magicSymbols.length],
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        sc: 0.7 + Math.random() * 0.8,
        delay: Math.random() * 0.15
      };
    });
    setParticles(newParticles);
  };

  const spinTheOracle = () => {
    if (spinning || result) return;
    setResult(null);
    setParticles([]);
    setError('');
    
    // Hardware accelerated GPU spin using CSS transition
    setSpinning(true);
    const extra = 2160 + Math.random() * 1440; // 6-10 full rotations
    setRotation((prev) => prev + extra);
  };

  const handleTransitionEnd = () => {
    if (spinning) {
      setSpinning(false);
      
      // Calculate selected segment on the right side pointer (90 deg clockwise from start)
      const normalized = ((rotation % 360) + 360) % 360;
      const pointerPos = (360 - normalized + 90) % 360; 
      const index = Math.floor(pointerPos / (360 / NUM)) % NUM;
      
      const randomPrediction = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)];
      setResult({
        title: SEGMENTS[index].title,
        prediction: randomPrediction
      });
      triggerSpellBurst();
    }
  };

  const handleEnterWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      await login('admin@example.com', 'admin');
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Cosmic bypass failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-[#090705] font-serif overflow-hidden py-3 sm:py-6 px-4 select-none">
      
      {/* ── Hogwarts Night Sky Background Styles ── */}
      <style>{`
        @keyframes floatMagic {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-80vh) rotate(360deg); opacity: 0; }
        }
        @keyframes hoverWizard {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.02); }
        }
        @keyframes pulseCastle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        @keyframes rotateCelestial {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spellBurst {
          0% { transform: translate(0, 0) scale(0.2); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(var(--sc)); opacity: 0; }
        }
        @keyframes floatCandle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes castLightRay {
          0%, 100% { opacity: 0.4; stroke-width: 2.5; }
          50% { opacity: 0.95; stroke-width: 5; }
        }
        @keyframes spellBeamFlow {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ── Background: Hogwarts Silhouette, Floating Candles, Star Map ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0C1B] via-[#09070D] to-[#040306]" />

        {/* Constellation Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-[0.05] border border-dashed border-amber-300 rounded-full"
          style={{ animation: 'rotateCelestial 150s linear infinite' }} />

        {/* Hogwarts Castle silhouette at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-20 pointer-events-none" style={{ animation: 'pulseCastle 8s ease-in-out infinite' }}>
          <svg className="w-full h-full" viewBox="0 0 1440 200" fill="none" preserveAspectRatio="none">
            <path d="M0,200 L0,170 L80,175 L120,150 L140,165 L180,90 L200,90 L210,120 L240,130 L280,60 L295,60 L310,120 L350,140 L400,135 L440,70 L460,70 L480,130 L550,145 L620,110 L650,40 L670,40 L690,110 L750,130 L800,125 L840,50 L860,50 L880,120 L960,140 L1020,130 L1080,75 L1100,75 L1120,125 L1200,145 L1280,110 L1320,30 L1345,30 L1370,120 L1440,150 L1440,200 Z" fill="#1C1829" />
            <path d="M0,200 L0,180 L150,185 L220,160 L300,170 L340,120 L360,120 L390,160 L500,175 L580,150 L640,70 L660,70 L680,150 L800,170 L880,160 L920,90 L940,90 L980,160 L1100,175 L1220,155 L1260,80 L1280,80 L1300,155 L1440,180 L1440,200 Z" fill="#09070D" />
          </svg>
        </div>

        {/* Floating candles */}
        <div className="absolute top-12 left-10 w-2.5 h-10 bg-amber-100/35 rounded-b-md shadow-md" style={{ animation: 'floatCandle 5s ease-in-out infinite' }}>
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mx-auto -mt-2 animate-ping" />
        </div>
        <div className="absolute top-24 right-16 w-2 h-8 bg-amber-100/35 rounded-b-md shadow-md" style={{ animation: 'floatCandle 6s ease-in-out infinite 1s' }}>
          <div className="w-1 h-1 bg-amber-400 rounded-full mx-auto -mt-1.5 animate-pulse" />
        </div>
        <div className="absolute top-16 right-36 w-3 h-12 bg-amber-100/30 rounded-b-md shadow-md" style={{ animation: 'floatCandle 7s ease-in-out infinite 0.5s' }}>
          <div className="w-2 h-2 bg-amber-400 rounded-full mx-auto -mt-2 animate-ping" />
        </div>

        {/* Floating golden sparks */}
        <div className="absolute inset-0">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-amber-400/80"
              style={{
                width: `${Math.random() * 3 + 1.5}px`,
                height: `${Math.random() * 3 + 1.5}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100 + 40}%`,
                animation: `floatMagic ${Math.random() * 8 + 7}s ${Math.random() * 4}s infinite linear`
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Central Parchment Card ── */}
      <div className="relative z-10 w-full max-w-[490px] bg-[#FCF9F2] dark:bg-[#15120E] border-2 border-[#D4AF37]/50 dark:border-[#D4AF37]/35 shadow-2xl rounded-[28px] py-5 px-6 sm:py-6 sm:px-8 flex flex-col items-center overflow-visible">
        
        {/* Harry Potter circular portrait - half in, half out on the RIGHT side */}
        {!imgFailed && (
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-[#D4AF37] bg-[#FCF9F2] shadow-2xl overflow-hidden z-30 hidden md:block"
               style={{ animation: 'hoverWizard 6s ease-in-out infinite' }}>
            <img 
              src="/harry_potter.png" 
              alt="Harry Potter" 
              className="w-full h-full object-cover" 
              onError={() => setImgFailed(true)} 
            />
          </div>
        )}

        {/* Hogwarts corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#D4AF37]/60 rounded-tl-lg m-3 pointer-events-none" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#D4AF37]/60 rounded-tr-lg m-3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#D4AF37]/60 rounded-bl-lg m-3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#D4AF37]/60 rounded-br-lg m-3 pointer-events-none" />

        {/* Logo/Identity */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[#D4AF37]">
            <Wand2 className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <span className="font-semibold text-[10px] uppercase tracking-widest text-[#B5892D]">Albus' Astrological Dial</span>
        </div>

        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3D2C1B] dark:text-[#F3ECE0] tracking-tight leading-tight font-serif">
            The Daily Work <span className="text-[#D4AF37]">Oracle</span>
          </h1>
          <p className="text-[#8C765C] dark:text-[#A68F74] text-[11px] sm:text-xs mt-1.5 italic max-w-sm mx-auto">
            "{getDailyQuote()}"
          </p>
        </div>

        {/* ── Astrolabe Wheel (Responsive layout to fit in one page) ── */}
        <div className="relative mb-4 flex justify-center items-center w-full h-[280px] sm:h-[320px] overflow-visible">

          {/* Realistic Magic Beam: Curved, Glowing & Flowing with alchemical particles */}
          {spinning && !imgFailed && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible hidden md:block">
              <defs>
                <filter id="wandGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="magicBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="60%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              {/* Glowing Curved Energy Arc from Wand to right Wheel Pointer */}
              <path 
                d="M 425,130 Q 420,152 398,160" 
                stroke="url(#magicBeamGrad)" 
                strokeWidth="3.5" 
                fill="none" 
                filter="url(#wandGlow)"
                strokeDasharray="8 4"
                style={{ animation: 'spellBeamFlow 0.8s linear infinite' }}
              />
              <path 
                d="M 425,130 Q 420,152 398,160" 
                stroke="#FBBF24" 
                strokeWidth="7" 
                fill="none" 
                opacity="0.3"
                filter="url(#wandGlow)"
              />
              <circle cx="398" cy="160" r="8" fill="#F59E0B" className="animate-ping" filter="url(#wandGlow)" />
              <circle cx="398" cy="160" r="4" fill="#FBBF24" />
            </svg>
          )}

          {/* Wheel Frame - Centered precisely on the card */}
          <div className="relative p-2 rounded-full border-2 border-[#D4AF37]/35 bg-[#F4EFE6]/70 dark:bg-[#1E1914]/80 shadow-inner z-10">
            
            {/* Golden Pointer (Celestial Sun Arrow) - Placed inside the Wheel Frame wrapper to scale and position dynamically */}
            <div 
              className="absolute z-20 flex items-center pointer-events-none -translate-y-1/2"
              style={{ right: '-6px', top: '50%' }}
            >
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[10px] border-r-[#D4AF37]" />
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FCF9F2] dark:bg-[#15120E] border border-[#D4AF37] shadow-md -ml-1">
                <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] animate-pulse" />
              </div>
            </div>

            <div className="relative rounded-full overflow-hidden border border-[#D4AF37]/40 bg-[#FCFBF7] dark:bg-[#1D1914]">
              {/* Spinning Group utilizing GPU Hardware Acceleration for Buttery Smooth 120fps */}
              <svg viewBox="0 0 320 320" className="block overflow-visible w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]">
                
                {/* Outer gold ring */}
                <circle cx={CX} cy={CY} r={RADIUS + 4} fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
                <circle cx={CX} cy={CY} r={RADIUS + 6} fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.2" />

                {/* Rotating Inner Dial */}
                <g 
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: '160px 160px',
                    transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.3, 1)' : 'none'
                  }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {SEGMENTS.map((seg, i) => {
                    const lp = labelPos(i);
                    const lines = seg.label.split('\n');
                    return (
                      <g key={i}>
                        {/* Slice */}
                        <path d={slicePath(i)} fill={seg.color} />
                        
                        {/* Gold divider lines */}
                        <path d={`M ${CX} ${CY} L ${CX + RADIUS * Math.cos(i * SLICE - Math.PI / 2)} ${CY + RADIUS * Math.sin(i * SLICE - Math.PI / 2)}`} stroke="#E6E1D3" strokeWidth="1.2" />
                        <path d={`M ${CX} ${CY} L ${CX + RADIUS * Math.cos(i * SLICE - Math.PI / 2)} ${CY + RADIUS * Math.sin(i * SLICE - Math.PI / 2)}`} stroke="#D4AF37" strokeWidth="0.4" opacity="0.7" />

                        {/* Text Label - Large & Oriented perfectly right-side up for supreme visibility */}
                        <text
                          x={lp.x}
                          y={lp.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${lp.angle}, ${lp.x}, ${lp.y})`}
                          fontSize="11"
                          fontWeight="700"
                          fill="#4E3D2A"
                          className="font-serif tracking-tight"
                        >
                          {lines.map((line, li) => (
                            <tspan key={li} x={lp.x} dy={li === 0 ? `${-(lines.length - 1) * 6}` : '13'}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}

                  {/* Celestial Center Cap */}
                  <circle cx={CX} cy={CY} r={24} fill="#FCF9F2" stroke="#E6E1D3" strokeWidth="1" className="shadow-lg" />
                  <circle cx={CX} cy={CY} r={20} fill="#FCF9F2" stroke="#D4AF37" strokeWidth="1.5" />
                  <circle cx={CX} cy={CY} r={14} fill="#F5EFE4" />
                  <path d="M160,155 L161.5,159 L165,160 L161.5,161 L160,165 L158.5,161 L155,160 L158.5,159 Z" fill="#D4AF37" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Spin Action Button ── */}
        <div className="w-full flex flex-col items-center z-10">
          {error && (
            <div className="mb-4 text-xs font-semibold text-rose-500 text-center">{error}</div>
          )}

          <button
            onClick={spinTheOracle}
            disabled={spinning}
            className="group relative px-12 py-3.5 rounded-full font-bold text-xs tracking-widest uppercase transition-all duration-300 active:scale-95 disabled:opacity-50 overflow-hidden border border-[#D4AF37]/50 shadow-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #3D2C1B 0%, #20150B 100%)',
              color: '#FCF9F2'
            }}
          >
            {spinning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-amber-300/30 border-t-amber-400 rounded-full" />
                Spell casting in progress...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Cast Oracle Spell <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform text-amber-400" />
              </span>
            )}
          </button>
        </div>

      </div>

      {/* ── 🪄 Centered Magic Pop-Up Result Modal 🪄 ── */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          
          {/* Magic Burst Particles flying out from center of modal overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute text-xl select-none"
                style={{
                  left: '50%',
                  top: '50%',
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  '--sc': p.sc,
                  animation: `spellBurst 1.8s ${p.delay}s forwards cubic-bezier(0.1, 0.8, 0.3, 1)`
                }}
              >
                {p.char}
              </span>
            ))}
          </div>

          {/* Harry Potter Themed Prediction Board */}
          <div className="relative w-full max-w-[420px] bg-[#FCF8EE] border-4 border-double border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-2xl text-center transform scale-100 transition-transform">
            
            {/* Hogwarts Double gold borders inside */}
            <div className="absolute inset-2 border border-[#D4AF37]/30 rounded-2xl pointer-events-none" />

            {/* Glowing magic sunburst icon at top of modal */}
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-[#D4AF37] flex items-center justify-center mb-4 shadow-md">
              <Sparkles className="w-6 h-6 text-[#D4AF37] animate-pulse" />
            </div>

            {/* Headline */}
            <h2 className="text-[#3D2C1B] font-bold text-xl uppercase tracking-wider mb-1 font-serif">
              Celestial Work Decree
            </h2>
            <div className="text-[10px] uppercase font-semibold text-[#B5892D] tracking-widest mb-4">
              -- {result.title} --
            </div>

            {/* Horoscope Prediction Box */}
            <div className="bg-[#FAF2DF] border border-[#D4AF37]/20 rounded-xl p-4 mb-6 shadow-inner">
              <p className="text-[#5A4531] text-sm sm:text-base font-semibold leading-relaxed font-serif italic">
                "{result.prediction}"
              </p>
            </div>

            {/* Harry Potter Themed Gryffindor-Maroon Login Button */}
            <button
              onClick={handleEnterWorkspace}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-xs tracking-widest uppercase text-white transition-all duration-200 active:scale-[0.98] shadow-lg cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #7A1F26 0%, #5C151B 100%)', // Gryffindor deep red
                border: '1.5px solid #D4AF37', // Gold border
                boxShadow: '0 4px 18px rgba(122, 31, 38, 0.4)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  LOGGING IN...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  LOGIN ⚡
                </span>
              )}
            </button>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
