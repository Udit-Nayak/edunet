require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Answer = require("../models/Answer");

/* ===================== EXTRA USERS ===================== */

const extraUsers = [
  {
    email: "irene@example.com",
    username: "irene_frontend",
    password: "password123",
    bio: "Frontend engineer focused on performance",
    college: "NYU",
    yearOfStudy: 3,
    interests: ["React", "CSS", "Web Performance"],
  },
  {
    email: "jack@example.com",
    username: "jack_systems",
    password: "password123",
    bio: "Low-level systems programming enthusiast",
    college: "Georgia Tech",
    yearOfStudy: 4,
    interests: ["C++", "Linux", "Operating Systems"],
  },
  {
    email: "karen@example.com",
    username: "karen_ai",
    password: "password123",
    bio: "AI researcher exploring deep learning",
    college: "ETH Zurich",
    yearOfStudy: 2,
    interests: ["AI", "Deep Learning", "PyTorch"],
  },
  {
    email: "leo@example.com",
    username: "leo_fullstack",
    password: "password123",
    bio: "Full-stack developer building SaaS apps",
    college: "BITS Pilani",
    yearOfStudy: 4,
    interests: ["Next.js", "Node.js", "PostgreSQL"],
  },
  {
    email: "maya@example.com",
    username: "maya_cloud",
    password: "password123",
    bio: "Cloud engineer working with AWS",
    college: "Imperial College London",
    yearOfStudy: 3,
    interests: ["AWS", "Terraform", "Cloud"],
  },
  {
    email: "noah@example.com",
    username: "noah_cp",
    password: "password123",
    bio: "Competitive programmer and DSA lover",
    college: "IIT Bombay",
    yearOfStudy: 2,
    interests: ["DSA", "C++", "Algorithms"],
  },
  {
    email: "olivia@example.com",
    username: "olivia_ui",
    password: "password123",
    bio: "UI designer with a focus on design systems",
    college: "Parsons",
    yearOfStudy: 3,
    interests: ["UI", "Design Systems", "CSS"],
  },
  {
    email: "peter@example.com",
    username: "peter_backend",
    password: "password123",
    bio: "Backend developer building scalable APIs",
    college: "NUS",
    yearOfStudy: 4,
    interests: ["Node.js", "Databases", "System Design"],
  },
  {
    email: "quinn@example.com",
    username: "quinn_ml",
    password: "password123",
    bio: "ML student exploring NLP",
    college: "CMU",
    yearOfStudy: 2,
    interests: ["Machine Learning", "NLP", "Python"],
  },
  {
    email: "ryan@example.com",
    username: "ryan_android",
    password: "password123",
    bio: "Android developer using Kotlin",
    college: "IIT Madras",
    yearOfStudy: 3,
    interests: ["Android", "Kotlin", "Mobile"],
  },
  {
    email: "sophia@example.com",
    username: "sophia_product",
    password: "password123",
    bio: "Aspiring product manager",
    college: "Wharton",
    yearOfStudy: 4,
    interests: ["Product", "Startups", "UX"],
  },
  {
    email: "tom@example.com",
    username: "tom_blockchain",
    password: "password123",
    bio: "Blockchain and Web3 enthusiast",
    college: "TU Munich",
    yearOfStudy: 3,
    interests: ["Blockchain", "Web3", "Ethereum"],
  },
];

/* ===================== EXTRA POSTS ===================== */

const extraPosts = [
  // React
  {
    type: "question",
    title: "Why React StrictMode renders components twice?",
    content: "<p>My component renders twice in development. Is this a bug?</p>",
    tags: ["react", "strictmode"],
  },
  {
    type: "question",
    title: "Controlled vs Uncontrolled inputs in React",
    content: "<p>Which form input approach should I prefer?</p>",
    tags: ["react", "forms"],
  },
  {
    type: "note",
    title: "React Performance Tips",
    content: "<ul><li>Use memo</li><li>Avoid unnecessary re-renders</li></ul>",
    tags: ["react", "performance"],
  },

  // JavaScript
  {
    type: "question",
    title: "Difference between var, let, and const",
    content: "<p>How do scoping and hoisting differ?</p>",
    tags: ["javascript", "basics"],
  },
  {
    type: "question",
    title: "What is event delegation?",
    content: "<p>How does event bubbling help with performance?</p>",
    tags: ["javascript", "dom"],
  },

  // Node / Backend
  {
    type: "question",
    title: "How Node.js handles multiple requests?",
    content: "<p>If Node is single-threaded, how does it scale?</p>",
    tags: ["nodejs", "event-loop"],
  },
  {
    type: "note",
    title: "Express Folder Structure",
    content: "<p>routes, controllers, services, middlewares</p>",
    tags: ["nodejs", "architecture"],
  },

  // Database
  {
    type: "question",
    title: "When to use indexes in MongoDB?",
    content: "<p>Do indexes always improve performance?</p>",
    tags: ["mongodb", "indexes"],
  },
  {
    type: "question",
    title: "SQL vs NoSQL — real-world use cases",
    content: "<p>Which one should I choose for my project?</p>",
    tags: ["database", "sql", "nosql"],
  },

  // Career / General
  {
    type: "question",
    title: "How to prepare for backend interviews?",
    content: "<p>What topics should I focus on?</p>",
    tags: ["career", "backend"],
  },
  {
    type: "question",
    title: "Is competitive programming useful?",
    content: "<p>Does CP actually help in jobs?</p>",
    tags: ["career", "dsa"],
  },

  // Articles
  {
    type: "article",
    title: "Understanding the JavaScript Event Loop",
    content: "<p>A deep dive into call stack, task queue, and microtasks.</p>",
    tags: ["javascript", "event-loop"],
  },
  {
    type: "article",
    title: "System Design Basics for Beginners",
    content: "<p>Learn scalability, load balancing, and caching.</p>",
    tags: ["system-design", "backend"],
  },

  {
    type: "question",
    title: "How to structure CSS in large projects?",
    content: "<p>Should I use BEM, CSS modules, or Tailwind?</p>",
    tags: ["css", "frontend"],
  },
  {
    type: "question",
    title: "Is Tailwind CSS worth using?",
    content: "<p>Pros and cons of utility-first CSS?</p>",
    tags: ["css", "tailwind"],
  },
  {
    type: "note",
    title: "Frontend Interview Checklist",
    content:
      "<ul><li>JS fundamentals</li><li>React</li><li>Performance</li></ul>",
    tags: ["frontend", "career"],
  },

  // Backend
  {
    type: "question",
    title: "Monolith vs Microservices",
    content: "<p>When should I choose microservices?</p>",
    tags: ["backend", "architecture"],
  },
  {
    type: "question",
    title: "How to design REST APIs properly?",
    content: "<p>What are common REST mistakes?</p>",
    tags: ["api", "backend"],
  },
  {
    type: "note",
    title: "HTTP Status Codes Cheat Sheet",
    content: "<p>200, 201, 400, 401, 403, 404, 500</p>",
    tags: ["http", "api"],
  },

  // Databases
  {
    type: "question",
    title: "How ACID transactions work?",
    content: "<p>What does ACID really mean?</p>",
    tags: ["database", "transactions"],
  },
  {
    type: "question",
    title: "When should I shard a database?",
    content: "<p>At what scale does sharding make sense?</p>",
    tags: ["database", "scaling"],
  },

  // Mobile
  {
    type: "question",
    title: "Android vs iOS development in 2025",
    content: "<p>Which platform should beginners choose?</p>",
    tags: ["mobile", "career"],
  },
  {
    type: "question",
    title: "React Native performance issues",
    content: "<p>How close is RN to native performance?</p>",
    tags: ["react-native", "mobile"],
  },

  // DevOps / Cloud
  {
    type: "question",
    title: "Kubernetes basics for beginners",
    content: "<p>Is Kubernetes necessary for small apps?</p>",
    tags: ["kubernetes", "devops"],
  },
  {
    type: "article",
    title: "AWS Basics Every Developer Should Know",
    content: "<p>EC2, S3, IAM, and VPC explained.</p>",
    tags: ["aws", "cloud"],
  },

  // Career / General
  {
    type: "question",
    title: "How to switch from frontend to backend?",
    content: "<p>What skills should I learn first?</p>",
    tags: ["career", "backend"],
  },
  {
    type: "question",
    title: "Is system design required for freshers?",
    content: "<p>Do fresh grads need system design?</p>",
    tags: ["system-design", "career"],
  },
  {
    type: "article",
    title: "How to Grow as a Software Engineer",
    content: "<p>Focus on fundamentals, projects, and learning.</p>",
    tags: ["career", "growth"],
  },

  // ================= MASSIVE FEED BATCH =================

  // ---------- React ----------
  {
    type: "question",
    title: "How does React reconciliation work?",
    content: "<p>How does React decide what to re-render?</p>",
    tags: ["react", "reconciliation"],
  },
  {
    type: "question",
    title: "When should I use useMemo?",
    content: "<p>Is useMemo really needed or premature optimization?</p>",
    tags: ["react", "performance"],
  },
  {
    type: "question",
    title: "Difference between useEffect and useLayoutEffect",
    content: "<p>When should useLayoutEffect be used?</p>",
    tags: ["react", "hooks"],
  },
  {
    type: "note",
    title: "React Interview Rapid Notes",
    content: "<ul><li>Keys</li><li>Memo</li><li>Virtual DOM</li></ul>",
    tags: ["react", "interview"],
  },

  // ---------- JavaScript ----------
  {
    type: "question",
    title: "What is the JavaScript call stack?",
    content: "<p>How does the call stack work internally?</p>",
    tags: ["javascript", "runtime"],
  },
  {
    type: "question",
    title: "Explain debounce vs throttle",
    content: "<p>What is the difference with real examples?</p>",
    tags: ["javascript", "performance"],
  },
  {
    type: "question",
    title: "How does garbage collection work in JS?",
    content: "<p>Mark-and-sweep explained simply.</p>",
    tags: ["javascript", "memory"],
  },
  {
    type: "note",
    title: "JavaScript Gotchas",
    content: '<p>NaN !== NaN, [] + {} = "[object Object]"</p>',
    tags: ["javascript", "gotchas"],
  },

  // ---------- Backend / Node ----------
  {
    type: "question",
    title: "What is backpressure in Node.js?",
    content: "<p>How streams handle slow consumers?</p>",
    tags: ["nodejs", "streams"],
  },
  {
    type: "question",
    title: "How to secure REST APIs?",
    content: "<p>Rate limiting, auth, validation best practices.</p>",
    tags: ["backend", "security"],
  },
  {
    type: "question",
    title: "Difference between REST and GraphQL",
    content: "<p>When should GraphQL be preferred?</p>",
    tags: ["api", "graphql"],
  },
  {
    type: "note",
    title: "Backend Interview Checklist",
    content: "<ul><li>Auth</li><li>DB</li><li>Scalability</li></ul>",
    tags: ["backend", "interview"],
  },

  // ---------- Databases ----------
  {
    type: "question",
    title: "What is database indexing?",
    content: "<p>How indexes speed up queries?</p>",
    tags: ["database", "indexes"],
  },
  {
    type: "question",
    title: "Explain CAP theorem",
    content: "<p>Consistency, Availability, Partition tolerance.</p>",
    tags: ["database", "theory"],
  },
  {
    type: "question",
    title: "When to use Redis?",
    content: "<p>Caching vs primary storage?</p>",
    tags: ["redis", "cache"],
  },
  {
    type: "note",
    title: "SQL Query Optimization Tips",
    content: "<p>Avoid SELECT *, use proper indexes.</p>",
    tags: ["sql", "performance"],
  },

  // ---------- System Design ----------
  {
    type: "question",
    title: "How does load balancing work?",
    content: "<p>Round-robin vs least connections.</p>",
    tags: ["system-design", "scaling"],
  },
  {
    type: "question",
    title: "What is horizontal vs vertical scaling?",
    content: "<p>Pros and cons of each approach.</p>",
    tags: ["system-design", "scaling"],
  },
  {
    type: "question",
    title: "How does caching improve performance?",
    content: "<p>Client-side vs server-side caching.</p>",
    tags: ["system-design", "cache"],
  },
  {
    type: "article",
    title: "System Design for Beginners",
    content: "<p>Learn load balancers, databases, and queues.</p>",
    tags: ["system-design", "tutorial"],
  },

  // ---------- DevOps / Cloud ----------
  {
    type: "question",
    title: "What is container orchestration?",
    content: "<p>Why Kubernetes exists?</p>",
    tags: ["devops", "kubernetes"],
  },
  {
    type: "question",
    title: "Docker image vs container",
    content: "<p>What exactly is the difference?</p>",
    tags: ["docker", "containers"],
  },
  {
    type: "note",
    title: "CI/CD Pipeline Steps",
    content: "<p>Build → Test → Deploy</p>",
    tags: ["devops", "ci-cd"],
  },
  {
    type: "article",
    title: "Deploying Apps with Docker",
    content: "<p>From Dockerfile to production.</p>",
    tags: ["docker", "deployment"],
  },

  // ---------- Mobile ----------
  {
    type: "question",
    title: "How does Flutter rendering work?",
    content: "<p>Skia engine explained.</p>",
    tags: ["flutter", "mobile"],
  },
  {
    type: "question",
    title: "React Native bridge performance",
    content: "<p>Why the new architecture matters?</p>",
    tags: ["react-native", "mobile"],
  },

  // ---------- Career ----------
  {
    type: "question",
    title: "How to build a strong GitHub profile?",
    content: "<p>What kind of projects matter?</p>",
    tags: ["career", "github"],
  },
  {
    type: "question",
    title: "DSA vs Development for placements",
    content: "<p>How should students balance both?</p>",
    tags: ["career", "dsa"],
  },
  {
    type: "question",
    title: "How to prepare for system design interviews?",
    content: "<p>Do I need real-world experience?</p>",
    tags: ["career", "system-design"],
  },
  {
    type: "article",
    title: "Mistakes Junior Developers Make",
    content: "<p>Ignoring fundamentals, overusing frameworks.</p>",
    tags: ["career", "growth"],
  },

  // ---------- Misc / Web ----------
  {
    type: "question",
    title: "What happens when you type a URL in browser?",
    content: "<p>DNS, TCP, HTTP explained step by step.</p>",
    tags: ["web", "networking"],
  },
  {
    type: "question",
    title: "HTTP vs HTTPS",
    content: "<p>How TLS secures communication?</p>",
    tags: ["web", "security"],
  },
  {
    type: "note",
    title: "Web Performance Metrics",
    content: "<p>LCP, FID, CLS</p>",
    tags: ["web", "performance"],
  },
];

/* ===================== CREATE USERS ===================== */

async function createUsers() {
  console.log("👥 Creating extra users...");
  const users = [];

  for (const userData of extraUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⚠️  ${userData.username} exists, skipping`);
      users.push(existing);
    } else {
      const user = await User.create(userData);
      console.log(`✅ Created user: ${user.username}`);
      users.push(user);
    }
  }
  return users;
}

/* ===================== CREATE POSTS ===================== */

async function createPosts(users) {
  console.log("\n📝 Creating extra posts...");
  const posts = [];

  for (const postData of extraPosts) {
    const author = users[Math.floor(Math.random() * users.length)];
    const createdAt = new Date(Date.now() - Math.random() * 20 * 86400000);

    const post = await Post.create({
      ...postData,
      authorId: author._id,
      status: "published",
      upvotes: Math.floor(Math.random() * 40),
      downvotes: Math.floor(Math.random() * 5),
      viewCount: Math.floor(Math.random() * 300),
      createdAt,
      updatedAt: createdAt,
    });

    posts.push(post);
    console.log(`✅ ${post.type}: ${post.title}`);
  }
  return posts;
}

/* ===================== CREATE ANSWERS ===================== */

async function createAnswers(users, posts) {
  console.log("\n💬 Creating answers...");
  const questions = posts.filter((p) => p.type === "question");

  for (const q of questions) {
    if (Math.random() < 0.6) continue;

    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];

      await Answer.create({
        postId: q._id,
        authorId: user._id,
        content: `<p>This is a test answer for "${q.title}".</p>`,
        upvotes: Math.floor(Math.random() * 15),
        downvotes: Math.floor(Math.random() * 2),
      });

      await Post.findByIdAndUpdate(q._id, {
        $inc: { answerCount: 1 },
      });
    }
    console.log(`✅ Answers added to: ${q.title}`);
  }
}

/* ===================== MAIN ===================== */

async function seedExtra() {
  try {
    console.log("🌱 Seeding EXTRA test data...\n");
    await mongoose.connect(process.env.MONGODB_URI);

    const users = await createUsers();
    const posts = await createPosts(users);
    await createAnswers(users, posts);

    console.log("\n✨ Extra seed completed");
    console.log(`Users: ${users.length}`);
    console.log(`Posts: ${posts.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed", err);
    process.exit(1);
  }
}

seedExtra();
