import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import { Button } from '../components/ui/Button';
import { BookOpen, Users, Award, Zap, Compass, ArrowRight } from 'lucide-react';
import PostCard from '../components/post/PostCard';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const mockPost = {
  _id: 'mock-1',
  title: 'Understanding React Server Components (RSC)',
  content: 'Dive deep into the new architecture of React Server Components, hydration strategies, and how they improve performance.',
  type: 'article',
  subject: 'Computer Science',
  subjectColor: '#0A66C2',
  createdAt: new Date(),
  netVotes: 142,
  viewCount: 15300,
  answerCount: 24,
  authorId: {
    _id: 'user-1',
    username: 'DanAbramov',
    reputation: 9999,
    avatar: 'https://ui-avatars.com/api/?name=Dan+Abramov&background=0D8ABC&color=fff'
  },
  tags: ['react', 'performance', 'architecture']
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-bg-primary overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center bg-gradient-to-b from-primary-light via-white to-white px-4 pt-10 pb-20 mt-[-56px] z-0">
        <div className="absolute inset-0 z-[-1] bg-grid-pattern opacity-[0.03]"></div>
        
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-14 lg:mt-0">
          
          {/* Left Text Content */}
          <motion.div 
            className="flex flex-col text-center lg:text-left z-10 pt-16 lg:pt-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-block mb-4 self-center lg:self-start">
              <span className="px-3 py-1 rounded-full bg-primary-light text-primary text-sm font-semibold border border-primary/20 flex items-center gap-2 w-fit">
                <Zap className="w-4 h-4" /> Academic Knowledge sharing
              </span>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants} 
              className="text-[44px] md:text-[56px] font-sans font-bold text-text-primary leading-[1.1] mb-6 tracking-tight"
            >
              Learn Together, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#7B1FA2]">
                Build Knowledge.
              </span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants} 
              className="text-[18px] md:text-xl text-text-secondary leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
            >
              A centralized digital learning ecosystem where students create, discover, discuss, and improve academic study resources through community participation.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {isAuthenticated ? (
                <Button variant="primary" size="lg" onClick={() => navigate('/feed')} className="w-full sm:w-auto min-w-[160px]">
                  Go to Feed <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              ) : (
                <>
                  <Button variant="primary" size="lg" onClick={() => navigate('/register')} className="w-full sm:w-auto min-w-[160px] shadow-lg shadow-primary/30">
                    Get Started Free
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => navigate('/explore')} className="w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2 bg-white hover:bg-bg-secondary text-text-primary border-border">
                    <Compass className="w-5 h-5" /> Explore Demo
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Right Floating Preview */}
          <motion.div 
            className="hidden lg:flex justify-center items-center z-10 w-full"
            initial={{ opacity: 0, scale: 0.8, rotateY: 15, rotateX: 5 }}
            animate={{ opacity: 1, scale: 1, rotateY: -10, rotateX: 5 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
          >
            <motion.div 
              className="w-full max-w-[500px]"
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              style={{ perspective: 1000 }}
            >
              <div 
                className="pointer-events-none rounded-xl shadow-2xl overflow-hidden bg-white border border-border/50 transform-gpu"
                style={{ 
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(10, 102, 194, 0.15)",
                }}
              >
                {/* Fake App Header */}
                <div className="h-4 bg-bg-secondary border-b border-border flex items-center px-3 gap-1.5 rounded-t-xl">
                  <div className="w-2 h-2 rounded-full bg-[#FF5F56]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#FFBD2E]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#27C93F]"></div>
                </div>
                {/* PostCard inside */}
                <div className="p-2 sm:p-4 bg-bg-secondary/50 pointer-events-none">
                  <PostCard post={mockPost} source="landing" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-text-primary mb-4">Everything you need to excel</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Combine the structured knowledge of a wiki, the active community mechanics of a forum, and personalization of intelligent recommendations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={<BookOpen className="w-8 h-8 text-accent-blue" />}
              title="Structured Knowledge"
              desc="Access high-quality notes, articles, and explanations organized cleanly by subject and tags."
              delay={0}
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-accent-orange" />}
              title="Active Community"
              desc="Ask questions, provide answers, and collaborate in real-time with peers from around the world."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Award className="w-8 h-8 text-accent-green" />}
              title="Earn Reputation"
              desc="Build your profile credibility. Top contributors achieve special badges and UI highlights."
              delay={0.2}
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-bg-primary border-t border-border py-12 px-4 text-center">
        <p className="text-text-secondary font-medium">© {new Date().getFullYear()} Edunet Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div 
      className="bg-bg-primary rounded-xl p-8 border border-border shadow-sm hover:shadow-card transition-shadow"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
      <p className="text-text-secondary leading-relaxed">{desc}</p>
    </motion.div>
  );
}