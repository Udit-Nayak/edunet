import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import { Button } from '../components/ui/Button';
import {
  BookOpen,
  Users,
  Award,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
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
    avatar: 'https://ui-avatars.com/api/?name=Dan+Abramov&background=0D8ABC&color=fff',
  },
  tags: ['react', 'performance', 'architecture'],
};

const stats = [
  { value: '10k+', label: 'study resources' },
  { value: '24/7', label: 'community support' },
  { value: '3x', label: 'faster discovery' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg-primary text-text-primary">
      <Navbar />

      <section className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#F7FAFC_0%,#FFFFFF_58%,#F3F7FA_100%)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(10,102,194,0.10),transparent_28%),radial-gradient(circle_at_90%_5%,rgba(13,211,187,0.10),transparent_24%)]" />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div
            className="z-10 flex flex-col text-center lg:text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-4 inline-block self-center lg:self-start">
              <span className="flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
                <Zap className="h-4 w-4" /> Academic knowledge sharing
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-6 font-sans text-[42px] font-bold leading-[1.08] tracking-normal text-text-primary sm:text-[52px] lg:text-[60px]"
            >
              Learn together.
              <br />
              <span className="text-primary">Build better notes.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mb-8 max-w-xl text-[17px] leading-8 text-text-secondary sm:text-lg lg:mx-0"
            >
              A focused learning network where students publish notes, ask questions, discuss answers, and find trustworthy academic resources without digging through scattered chats.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              {isAuthenticated ? (
                <Button variant="primary" size="lg" onClick={() => navigate('/feed')} className="w-full min-w-[168px] shadow-lg shadow-primary/20 sm:w-auto">
                  Go to Feed <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button variant="primary" size="lg" onClick={() => navigate('/register')} className="w-full min-w-[168px] shadow-lg shadow-primary/20 sm:w-auto">
                    Get Started Free
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => navigate('/login')} className="w-full min-w-[140px] bg-white sm:w-auto">
                    Sign In
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8 grid grid-cols-3 gap-3 rounded-lg border border-border bg-white/80 p-3 shadow-card backdrop-blur">
              {stats.map((item) => (
                <div key={item.label} className="text-center lg:text-left">
                  <div className="text-lg font-bold text-text-primary">{item.value}</div>
                  <div className="text-xs font-medium text-text-secondary">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="z-10 hidden w-full items-center justify-center lg:flex"
            initial={{ opacity: 0, scale: 0.8, rotateY: 15, rotateX: 5 }}
            animate={{ opacity: 1, scale: 1, rotateY: -5, rotateX: 3 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.4 }}
          >
            <motion.div
              className="w-full max-w-[520px]"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              style={{ perspective: 1000 }}
            >
              <div
                className="pointer-events-none overflow-hidden rounded-lg border border-border bg-white shadow-2xl shadow-primary/10"
                style={{
                  boxShadow: '0 24px 60px -18px rgba(10, 102, 194, 0.30), 0 10px 26px rgba(29, 29, 29, 0.10)',
                }}
              >
                <div className="flex items-center justify-between border-b border-border bg-bg-primary px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-text-tertiary">Live workspace</p>
                    <p className="text-sm font-semibold text-text-primary">Computer Science feed</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary">
                    <Search className="h-3.5 w-3.5" />
                    react architecture
                  </div>
                </div>
                <div className="space-y-3 bg-bg-secondary/60 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <PreviewMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Solved" value="82%" />
                    <PreviewMetric icon={<MessageSquare className="h-4 w-4" />} label="Answers" value="24" />
                    <PreviewMetric icon={<Award className="h-4 w-4" />} label="Rep" value="+142" />
                  </div>
                  <PostCard post={mockPost} source="landing" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 font-sans text-3xl font-bold text-text-primary md:text-4xl">Everything you need to study with momentum</h2>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-text-secondary">
              Combine the structured knowledge of a wiki, the active community mechanics of a forum, and personalization of intelligent recommendations.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-primary" />}
              title="Structured Knowledge"
              desc="Access high-quality notes, articles, and explanations organized cleanly by subject and tags."
              delay={0}
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-accent-orange" />}
              title="Active Community"
              desc="Ask questions, provide answers, and collaborate in real-time with peers from around the world."
              delay={0.1}
            />
            <FeatureCard
              icon={<Award className="h-8 w-8 text-accent-green" />}
              title="Earn Reputation"
              desc="Build your profile credibility. Top contributors achieve special badges and UI highlights."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-bg-primary px-4 py-10 text-center">
        <p className="font-medium text-text-secondary">Copyright {new Date().getFullYear()} Edunet Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

function PreviewMetric({ icon, label, value }) {
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="text-lg font-bold text-text-primary">{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div
      className="rounded-lg border border-border bg-bg-primary p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-secondary">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-text-primary">{title}</h3>
      <p className="leading-relaxed text-text-secondary">{desc}</p>
    </motion.div>
  );
}
