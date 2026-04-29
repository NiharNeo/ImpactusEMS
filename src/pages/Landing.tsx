import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  BarChart2,
  Puzzle,
  Users,
} from "lucide-react";

import eventChill from "@/assets/event-chill-code-workshop.jpg";
import eventHackathon from "@/assets/event-hackathon-ai.jpg";
import eventJam from "@/assets/event-late-night-jam.jpg";
import eventStartup from "@/assets/event-startup-weekend.jpg";
import eventSummit from "@/assets/event-vibe-coding-summit.jpg";
import nexusSticker from "@/assets/nexus-sticker-badge.png";

const features = [
  {
    title: "Pages in minutes",
    description: "Bold registration pages that make your event impossible to ignore.",
    color: "bg-[#CCFF00]",
    icon: Sparkles,
  },
  {
    title: "Deep Analytics",
    description: "Track every click and conversion with brutalist precision.",
    color: "bg-white",
    icon: BarChart2,
  },
  {
    title: "All the Tools",
    description: "Connect Zoom, Slack, and 20+ tools in a single click.",
    color: "bg-white",
    icon: Puzzle,
  },
  {
    title: "Attendee Hub",
    description: "One command center for every human attending your experience.",
    color: "bg-[#FF6BCB]",
    icon: Users,
  },
];

const Landing = () => {
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavVisible(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background selection:bg-secondary selection:text-black">
      {/* Fixed Nav */}
      <motion.nav
        className="fixed top-0 w-full z-50 py-4 px-6 md:px-12 flex items-center justify-between pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-white/80 backdrop-blur-xl border-2 border-black rounded-full px-6 py-3 flex items-center justify-between w-full pointer-events-auto">
          <Logo size="md" />
          <div className="flex items-center gap-6">
            <Link to="/auth" className="text-sm font-bold uppercase hover:text-secondary transition-colors">Log in</Link>
            <Button className="btn-brutalist !py-2 !px-6 h-auto" asChild>
              <Link to="/auth">Join Nexus</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            {/* Massive Typography */}
            <motion.h1 
              className="text-huge font-extrabold tracking-tighter mb-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              LET'S CHANGE<br />
              <span className="flex items-center gap-4 flex-wrap">
                THE WAY WE <span className="text-secondary bg-black px-4 py-2 rounded-[2rem] inline-block">HOST</span>
              </span>
            </motion.h1>

            {/* Sticker Badge */}
            <motion.div 
              className="absolute top-[-40px] right-[5%] md:right-[15%] w-32 md:w-48 z-20"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 10 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              <img src={nexusSticker} alt="Nexus Official" className="sticker w-full h-auto" />
            </motion.div>

            {/* Hero Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-12">
              <motion.div 
                className="md:col-span-8 rounded-[4rem] overflow-hidden border-2 border-black h-[400px] md:h-[600px] relative group"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <img src={eventSummit} alt="Event Summit" className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-12 left-12">
                  <span className="bg-secondary text-black font-bold px-4 py-2 rounded-full text-sm mb-4 inline-block uppercase">Premium Networking</span>
                  <h2 className="text-4xl text-white font-bold max-w-md">Nexus Vibe Coding Summit 2026</h2>
                </div>
              </motion.div>

              <div className="md:col-span-4 flex flex-col gap-6">
                <motion.div 
                  className="flex-1 rounded-[3rem] bg-white border-2 border-black p-8 flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="space-y-4">
                    <Zap className="w-12 h-12 text-secondary fill-secondary" />
                    <h3 className="text-2xl font-bold">100% Branded Experience</h3>
                    <p className="text-muted-foreground font-medium">Your brand, your rules. No generic templates, just high-end editorial designs.</p>
                  </div>
                  <Button className="btn-brutalist mt-6" asChild>
                    <Link to="/auth">Get Started <ArrowRight className="ml-2 w-5 h-5" /></Link>
                  </Button>
                </motion.div>

                <motion.div 
                  className="flex-1 rounded-[3rem] overflow-hidden border-2 border-black relative group"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <img src={eventJam} alt="Event Jam" className="w-full h-full object-cover" />
                  <div className="absolute top-6 left-6">
                    <span className="bg-white/90 backdrop-blur-md border border-black text-black font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest">Live Now</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 bg-white border-y-4 border-black">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <h2 className="text-5xl md:text-7xl font-extrabold max-w-2xl leading-none tracking-tighter">EVERYTHING YOU NEED. PERIOD.</h2>
            <p className="text-xl max-w-md font-medium text-muted-foreground italic underline decoration-secondary decoration-4 underline-offset-8">We removed the fluff so you can focus on building your community.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`brutalist-card p-10 ${feature.color}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <feature.icon className="w-12 h-12 mb-8 text-black" />
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="font-medium text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase">Loved by Organizers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { text: "Nexus changed how we think about events. The branding is just on another level.", author: "Sarah C.", role: "Community Lead" },
              { text: "Minimalist, powerful, and fast. Everything I ever wanted in a ticketing platform.", author: "Marcus W.", role: "Event Architect" },
              { text: "Finally, a platform that doesn't look like it was made in 2010.", author: "James L.", role: "Tech Founder" }
            ].map((t, i) => (
              <motion.div 
                key={i} 
                className="relative p-12 rounded-[3rem] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(204,255,0,1)]"
                whileHover={{ rotate: i % 2 === 0 ? 1 : -1 }}
              >
                <p className="text-xl font-bold mb-8 leading-tight italic">"{t.text}"</p>
                <div>
                  <p className="font-extrabold uppercase">{t.author}</p>
                  <p className="text-sm font-medium text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-secondary skew-y-3 scale-110 -z-10" />
        <div className="max-w-5xl mx-auto bg-black text-white rounded-[4rem] p-16 md:p-24 text-center border-4 border-black relative">
          <div className="absolute top-10 right-10 rotate-12 hidden md:block">
             <Sparkles className="w-16 h-16 text-secondary" />
          </div>
          <h2 className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-none">READY TO<br />NEXUS?</h2>
          <p className="text-xl md:text-2xl font-medium mb-12 text-secondary max-w-lg mx-auto italic">Build your next experience on the most premium event platform ever made.</p>
          <Button size="lg" className="bg-secondary text-black hover:bg-white px-12 py-8 rounded-full text-2xl font-black uppercase transition-all" asChild>
            <Link to="/auth">Create Event Now</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 md:px-12 border-t-2 border-black flex flex-col md:flex-row items-center justify-between gap-10">
        <Logo size="lg" />
        <div className="flex gap-8 text-sm font-bold uppercase">
          <Link to="#" className="hover:text-secondary transition-colors">Twitter</Link>
          <Link to="#" className="hover:text-secondary transition-colors">Instagram</Link>
          <Link to="#" className="hover:text-secondary transition-colors">LinkedIn</Link>
        </div>
        <p className="text-sm font-medium text-muted-foreground italic">© 2026 NEXUS. NO RIGHTS RESERVED. JUST VIBES.</p>
      </footer>
    </div>
  );
};

export default Landing;
 
