import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Shield, Zap, TrendingUp, ChevronRight, Globe, Bell, MousePointer2, ArrowRight, Sparkles, Cloud, BarChart3 } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [activeSection, setActiveSection] = React.useState(0);

  return (
    <div className="min-h-screen bg-white text-black font-sans overflow-x-hidden selection:bg-green/20">
      {/* iPhone-style Dynamic Island Navbar */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center py-5 px-8">
        <motion.nav 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative"
        >
          {/* iPhone Dynamic Island Notch */}
          <div className="flex items-center justify-center">
            <div className="bg-black px-6 py-2.5 rounded-[24px] flex items-center gap-4 shadow-xl relative overflow-hidden">
              {/* Subtle pulse animation */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-green-500/10"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-5 h-5 border border-white flex items-center justify-center rounded-sm">
                  <Activity size={10} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase">Overwatch</span>
              </div>
              
              {/* Simulated notch elements */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-6 bg-black rounded-full" />
              
              <div className="flex items-center gap-3 relative z-10">
                <button 
                  onClick={onStart}
                  className="text-[9px] font-bold text-black bg-white px-3 py-1 rounded-full hover:bg-green-400 transition-colors duration-300"
                >
                  Launch
                </button>
              </div>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-white via-white to-gray-50">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
           className="mb-8"
        >
           <div className="text-[10px] uppercase tracking-[0.5em] text-gray-400 mb-8 inline-block">Cloud Infrastructure Intelligence</div>
           <h1 className="text-[10vw] md:text-[8vw] font-black leading-none tracking-tighter mb-8 text-black">
             UNIFIED <br/>
             <span className="text-green-600">OBSERVABILITY</span>
           </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-gray-600 text-sm md:text-lg max-w-xl mb-16 font-light leading-relaxed"
        >
          AI-powered infrastructure monitoring with real-time cost optimization.<br className="hidden md:block" /> 
          Zero-downtime architecture. Maximum efficiency.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col items-center gap-8"
        >
           <button 
             onClick={onStart}
             className="group relative px-16 py-5 bg-black text-white flex items-center gap-4 overflow-hidden hover:bg-green-600 transition-colors duration-500"
           >
             <div className="absolute inset-0 bg-green-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
             <span className="relative z-10 text-[11px] font-bold uppercase tracking-[0.3em] group-hover:text-white transition-colors">Initialize Systems</span>
             <ChevronRight className="relative z-10 group-hover:text-white transition-colors" size={16} />
           </button>
           
           <div className="flex items-center gap-6 text-[9px] text-gray-400 uppercase tracking-widest">
             <span className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               Real-time Analysis
             </span>
             <span className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               Cost Alerts
             </span>
             <span className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
               AI Insights
             </span>
           </div>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-[1px] h-20 bg-gray-200 overflow-hidden">
             <motion.div 
               animate={{ y: [0, 80] }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="w-full h-1/2 bg-green-500"
             />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how" className="relative py-32 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-12 gap-16 items-start mb-32">
            <div className="lg:col-span-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-green-600 mb-12 block">Core Capabilities / 01</span>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-16">
                INTELLIGENT <br/>
                <span className="text-green-600">COST OPTIMIZATION</span>
              </h2>
              <div className="w-48 h-[3px] bg-green-500"></div>
            </div>
            <div className="lg:col-span-4 lg:pt-24">
              <p className="text-gray-500 leading-relaxed text-base font-light">
                Real-time analysis of your infrastructure patterns. AI-driven recommendations that adapt to your peak loads, traffic diversity, and usage patterns.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: <BarChart3 size={24} />,
                title: "Peak Load Analysis", 
                desc: "Real-time monitoring of CPU, network, and IOPS patterns across all services. Identify optimization opportunities.",
                color: "green"
              },
              { 
                icon: <Sparkles size={24} />,
                title: "AI Recommendations", 
                desc: "Intelligent suggestions based on your infrastructure behavior. Spot instances, Savings Plans, and right-sizing insights.",
                color: "purple"
              },
              { 
                icon: <Cloud size={24} />,
                title: "Zero Downtime", 
                desc: "Scalable architecture recommendations that ensure 99.99% availability while reducing costs by up to 60%.",
                color: "red"
              }
            ].map((item, i) => (
              <motion.div 
                 key={i}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className="p-8 bg-white border border-gray-100 group hover:border-gray-200 hover:shadow-xl transition-all duration-500"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-6",
                  item.color === 'green' ? "bg-green-500 text-white" : 
                  item.color === 'purple' ? "bg-purple-500 text-white" : "bg-red-500 text-white"
                )}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Grid Section */}
      <section id="infra" className="py-32 bg-black text-white">
        <div className="max-w-7xl mx-auto px-8">
           <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-green-500 mb-12 block">Supported Services / 02</span>
           <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-16">
             AWS <span className="text-green-500">NATIVE</span>
           </h2>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-gray-800 overflow-hidden">
              {[
                { title: "EC2", val: "Real-time CPU & Network", color: "orange" },
                { title: "RDS", val: "Connections & IOPS", color: "blue" },
                { title: "S3", val: "Storage Intelligence", color: "green" },
                { title: "Lambda", val: "Invocations & Errors", color: "purple" },
                { title: "CloudFront", val: "Global Requests", color: "red" },
                { title: "ElastiCache", val: "Memory & CPU", color: "orange" },
                { title: "NAT Gateway", val: "Bytes Processed", color: "blue" },
                { title: "ALB", val: "Response Time", color: "green" }
              ].map((f, i) => (
                <div key={i} className="bg-black p-8 hover:bg-gray-900 transition-all duration-500 cursor-pointer group">
                   <div className="text-[9px] font-bold uppercase tracking-[0.4em] mb-4 text-gray-500 group-hover:text-gray-400 transition-colors">{f.title}</div>
                   <div className="text-2xl font-bold tracking-tight group-hover:text-green-500 transition-colors">
                     {f.val}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-32 bg-green-500 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
            COST SAVINGS THAT <span className="text-black">SCALE</span>
          </h2>
          <p className="text-white/80 text-lg mb-12 max-w-xl mx-auto">
            Our AI analyzes your infrastructure patterns and recommends optimizations that can reduce costs by up to 60% while maintaining zero-downtime architecture.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-5xl font-black text-black mb-2">40%</div>
              <div className="text-sm uppercase tracking-widest text-white/70">S3 Intelligent-Tiering</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-black mb-2">35%</div>
              <div className="text-sm uppercase tracking-widest text-white/70">Spot + Savings Plans</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-black mb-2">55%</div>
              <div className="text-sm uppercase tracking-widest text-white/70">EC2 Right-Sizing</div>
            </div>
          </div>
          <button 
            onClick={onStart}
            className="inline-flex items-center gap-3 px-10 py-4 bg-black text-white text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
          >
            Start Optimizing <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-black flex items-center justify-center">
                <Activity size={12} />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase">Overwatch</span>
            </div>
            <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] text-gray-400">
              <span className="hover:text-black transition-colors cursor-pointer">Documentation</span>
              <span className="hover:text-black transition-colors cursor-pointer">Pricing</span>
              <span className="hover:text-black transition-colors cursor-pointer">Support</span>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
            Zero-Downtime Infrastructure Monitoring
          </div>
        </div>
      </footer>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
