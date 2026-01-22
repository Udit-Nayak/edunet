require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Answer = require('../models/Answer');

// Demo users data
const demoUsers = [
  {
    email: 'alice@example.com',
    username: 'alice_dev',
    password: 'password123',
    bio: 'Full-stack developer passionate about React and Node.js',
    college: 'MIT',
    yearOfStudy: 4,
    interests: ['React', 'JavaScript', 'Node.js', 'MongoDB'],
  },
  {
    email: 'bob@example.com',
    username: 'bob_designer',
    password: 'password123',
    bio: 'UI/UX designer who loves creating beautiful interfaces',
    college: 'Stanford',
    yearOfStudy: 3,
    interests: ['Design', 'CSS', 'Figma', 'UI/UX'],
  },
  {
    email: 'charlie@example.com',
    username: 'charlie_python',
    password: 'password123',
    bio: 'Python enthusiast and data science student',
    college: 'Harvard',
    yearOfStudy: 2,
    interests: ['Python', 'Machine Learning', 'Data Science', 'AI'],
  },
  {
    email: 'diana@example.com',
    username: 'diana_mobile',
    password: 'password123',
    bio: 'Mobile app developer specializing in React Native',
    college: 'IIT Delhi',
    yearOfStudy: 4,
    interests: ['React Native', 'Mobile Dev', 'JavaScript', 'Flutter'],
  },
  {
    email: 'eve@example.com',
    username: 'eve_backend',
    password: 'password123',
    bio: 'Backend engineer working with microservices',
    college: 'Oxford',
    yearOfStudy: 3,
    interests: ['Node.js', 'Docker', 'Kubernetes', 'AWS'],
  },
  {
    email: 'frank@example.com',
    username: 'frank_security',
    password: 'password123',
    bio: 'Cybersecurity student and ethical hacker',
    college: 'Cambridge',
    yearOfStudy: 2,
    interests: ['Security', 'Cryptography', 'Ethical Hacking', 'Networks'],
  },
  {
    email: 'grace@example.com',
    username: 'grace_database',
    password: 'password123',
    bio: 'Database administrator and SQL expert',
    college: 'Berkeley',
    yearOfStudy: 4,
    interests: ['SQL', 'PostgreSQL', 'MongoDB', 'Database Design'],
  },
  {
    email: 'henry@example.com',
    username: 'henry_devops',
    password: 'password123',
    bio: 'DevOps engineer automating everything',
    college: 'UCLA',
    yearOfStudy: 3,
    interests: ['DevOps', 'CI/CD', 'Docker', 'Jenkins'],
  },
];

// Demo posts data with rich content
const demoPosts = [
  // React Questions
  {
    type: 'question',
    title: 'How to use React Hooks effectively?',
    content: '<p>I am learning React Hooks and want to understand useState and useEffect better. Can someone explain when to use each hook and common patterns?</p>',
    tags: ['react', 'javascript', 'hooks', 'frontend'],
  },
  {
    type: 'question',
    title: 'React Context API vs Redux - Which to choose?',
    content: '<p>I am building a medium-sized React application and wondering whether to use Context API or Redux for state management. What are the pros and cons?</p>',
    tags: ['react', 'redux', 'state-management', 'javascript'],
  },
  {
    type: 'question',
    title: 'Best practices for React component organization?',
    content: '<p>How do you organize components in a large React project? Should I use folder-by-feature or folder-by-type structure?</p>',
    tags: ['react', 'best-practices', 'architecture', 'frontend'],
  },
  
  // JavaScript Questions
  {
    type: 'question',
    title: 'Understanding JavaScript closures',
    content: '<p>Can someone explain JavaScript closures with practical examples? I keep reading about them but struggle to understand when and why to use them.</p>',
    tags: ['javascript', 'closures', 'programming', 'beginner'],
  },
  {
    type: 'question',
    title: 'Async/Await vs Promises in JavaScript',
    content: '<p>What is the difference between async/await and promises? When should I use one over the other?</p>',
    tags: ['javascript', 'async', 'promises', 'es6'],
  },
  {
    type: 'question',
    title: 'How to prevent memory leaks in JavaScript?',
    content: '<p>I notice my web app slowing down over time. How can I identify and prevent memory leaks in JavaScript applications?</p>',
    tags: ['javascript', 'performance', 'memory', 'debugging'],
  },

  // Node.js Questions
  {
    type: 'question',
    title: 'Express.js middleware best practices',
    content: '<p>What are the best practices for creating and organizing middleware in Express.js applications?</p>',
    tags: ['nodejs', 'express', 'backend', 'middleware'],
  },
  {
    type: 'question',
    title: 'How to handle authentication in Node.js?',
    content: '<p>I need to implement JWT authentication in my Node.js API. What are the security best practices I should follow?</p>',
    tags: ['nodejs', 'authentication', 'jwt', 'security'],
  },

  // Python Questions
  {
    type: 'question',
    title: 'Python list comprehension vs map/filter',
    content: '<p>When should I use list comprehension versus map() and filter() functions in Python? Which is more Pythonic?</p>',
    tags: ['python', 'list-comprehension', 'functional-programming'],
  },
  {
    type: 'question',
    title: 'Best way to handle exceptions in Python?',
    content: '<p>What are the best practices for exception handling in Python? Should I catch specific exceptions or use broad try-except blocks?</p>',
    tags: ['python', 'exceptions', 'error-handling', 'best-practices'],
  },

  // Database Questions
  {
    type: 'question',
    title: 'MongoDB vs PostgreSQL for web applications',
    content: '<p>I am deciding between MongoDB and PostgreSQL for my new project. What factors should I consider?</p>',
    tags: ['mongodb', 'postgresql', 'database', 'sql', 'nosql'],
  },
  {
    type: 'question',
    title: 'How to optimize MongoDB queries?',
    content: '<p>My MongoDB queries are slow with large datasets. What indexing strategies and query optimization techniques should I use?</p>',
    tags: ['mongodb', 'performance', 'optimization', 'indexing'],
  },

  // Notes
  {
    type: 'note',
    title: 'React Hooks Cheat Sheet',
    content: '<h2>Common React Hooks</h2><ul><li><strong>useState</strong>: Manage component state</li><li><strong>useEffect</strong>: Side effects and lifecycle</li><li><strong>useContext</strong>: Access context values</li><li><strong>useRef</strong>: Reference DOM elements</li><li><strong>useMemo</strong>: Memoize expensive calculations</li><li><strong>useCallback</strong>: Memoize callback functions</li></ul>',
    tags: ['react', 'hooks', 'cheatsheet', 'reference'],
  },
  {
    type: 'note',
    title: 'JavaScript Array Methods Reference',
    content: '<h2>Essential Array Methods</h2><p>map(), filter(), reduce(), forEach(), find(), some(), every()</p><p>Each method serves a specific purpose in array manipulation.</p>',
    tags: ['javascript', 'arrays', 'reference', 'es6'],
  },
  {
    type: 'note',
    title: 'Git Commands I Use Daily',
    content: '<h2>Common Git Commands</h2><ul><li>git status</li><li>git add .</li><li>git commit -m "message"</li><li>git push origin main</li><li>git pull</li><li>git branch</li><li>git checkout -b feature</li></ul>',
    tags: ['git', 'version-control', 'commands', 'reference'],
  },
  {
    type: 'note',
    title: 'CSS Flexbox Complete Guide',
    content: '<h2>Flexbox Properties</h2><p>Container properties: display, flex-direction, justify-content, align-items, flex-wrap</p><p>Item properties: flex-grow, flex-shrink, flex-basis, order</p>',
    tags: ['css', 'flexbox', 'layout', 'frontend'],
  },
  {
    type: 'note',
    title: 'RESTful API Design Principles',
    content: '<h2>REST API Best Practices</h2><ul><li>Use proper HTTP methods (GET, POST, PUT, DELETE)</li><li>Meaningful resource names</li><li>Versioning (v1, v2)</li><li>Proper status codes</li><li>HATEOAS principles</li></ul>',
    tags: ['api', 'rest', 'backend', 'architecture'],
  },

  // Articles
  {
    type: 'article',
    title: 'Building Scalable React Applications',
    content: '<h1>Introduction</h1><p>Scalability is crucial for modern web applications. In this article, we explore patterns and practices for building React apps that scale.</p><h2>Component Architecture</h2><p>Proper component organization is the foundation of scalable React apps...</p><h2>State Management</h2><p>Choose the right state management solution based on your app size...</p>',
    tags: ['react', 'scalability', 'architecture', 'tutorial'],
  },
  {
    type: 'article',
    title: 'Mastering Async JavaScript',
    content: '<h1>Understanding Asynchronous JavaScript</h1><p>JavaScript is single-threaded but handles async operations beautifully. Let\'s dive deep into callbacks, promises, and async/await.</p><h2>Callbacks</h2><p>The traditional approach...</p><h2>Promises</h2><p>A better way to handle async...</p>',
    tags: ['javascript', 'async', 'promises', 'tutorial'],
  },
  {
    type: 'article',
    title: 'Complete Guide to Node.js Authentication',
    content: '<h1>Authentication in Node.js</h1><p>Security is paramount. This guide covers JWT, sessions, OAuth, and best practices.</p><h2>JWT Authentication</h2><p>JSON Web Tokens provide stateless authentication...</p>',
    tags: ['nodejs', 'authentication', 'security', 'tutorial'],
  },
  {
    type: 'article',
    title: 'Docker for Developers: A Practical Guide',
    content: '<h1>Getting Started with Docker</h1><p>Docker revolutionizes development workflows. Learn containers, images, and deployment.</p><h2>What is Docker?</h2><p>Containerization explained...</p>',
    tags: ['docker', 'devops', 'containers', 'tutorial'],
  },
  {
    type: 'article',
    title: 'TypeScript: Why and How to Get Started',
    content: '<h1>Introduction to TypeScript</h1><p>TypeScript adds type safety to JavaScript. Here\'s why you should use it and how to begin.</p><h2>Benefits</h2><p>Type safety, better IDE support, fewer bugs...</p>',
    tags: ['typescript', 'javascript', 'programming', 'tutorial'],
  },

  // More varied questions
  {
    type: 'question',
    title: 'How to deploy React app to production?',
    content: '<p>What are the steps to deploy a React application to production? Should I use Netlify, Vercel, or AWS?</p>',
    tags: ['react', 'deployment', 'production', 'hosting'],
  },
  {
    type: 'question',
    title: 'Understanding CSS Grid Layout',
    content: '<p>I am confused about CSS Grid. How does it differ from Flexbox and when should I use Grid instead?</p>',
    tags: ['css', 'grid', 'layout', 'frontend'],
  },
  {
    type: 'question',
    title: 'What is the difference between SQL and NoSQL?',
    content: '<p>Can someone explain the fundamental differences between SQL and NoSQL databases with use cases?</p>',
    tags: ['database', 'sql', 'nosql', 'mongodb', 'postgresql'],
  },
  {
    type: 'question',
    title: 'How to optimize website performance?',
    content: '<p>My website loads slowly. What techniques can I use to improve performance and page load times?</p>',
    tags: ['performance', 'optimization', 'web', 'frontend'],
  },
  {
    type: 'question',
    title: 'React Native vs Flutter - Which to learn?',
    content: '<p>I want to get into mobile development. Should I learn React Native or Flutter in 2024?</p>',
    tags: ['react-native', 'flutter', 'mobile', 'career'],
  },
];

// Function to create users
async function createUsers() {
  console.log('👥 Creating demo users...');
  
  const createdUsers = [];
  for (const userData of demoUsers) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`   ⚠️  User ${userData.username} already exists, skipping...`);
        createdUsers.push(existingUser);
      } else {
        const user = await User.create(userData);
        console.log(`   ✅ Created user: ${user.username}`);
        createdUsers.push(user);
      }
    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.username}:`, error.message);
    }
  }
  
  return createdUsers;
}

// Function to create posts
async function createPosts(users) {
  console.log('\n📝 Creating demo posts...');
  
  const createdPosts = [];
  for (let i = 0; i < demoPosts.length; i++) {
    const postData = demoPosts[i];
    
    // Assign random author
    const randomUser = users[Math.floor(Math.random() * users.length)];
    
    // Random creation date (within last 30 days)
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    try {
      const post = await Post.create({
        ...postData,
        authorId: randomUser._id,
        status: 'published',
        upvotes: Math.floor(Math.random() * 50),
        downvotes: Math.floor(Math.random() * 10),
        viewCount: Math.floor(Math.random() * 200),
        createdAt,
        updatedAt: createdAt,
      });
      
      console.log(`   ✅ Created ${post.type}: ${post.title.substring(0, 50)}...`);
      createdPosts.push(post);
    } catch (error) {
      console.error(`   ❌ Error creating post:`, error.message);
    }
  }
  
  return createdPosts;
}

// Function to add some answers to questions
async function createAnswers(users, posts) {
  console.log('\n💬 Creating demo answers...');
  
  const questions = posts.filter(p => p.type === 'question');
  
  for (const question of questions) {
    // 70% chance to have answers
    if (Math.random() > 0.3) {
      const numAnswers = Math.floor(Math.random() * 4) + 1; // 1-4 answers
      
      for (let i = 0; i < numAnswers; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        try {
          await Answer.create({
            postId: question._id,
            authorId: randomUser._id,
            content: `<p>This is a helpful answer to the question about ${question.title}. Here's what I think...</p>`,
            upvotes: Math.floor(Math.random() * 20),
            downvotes: Math.floor(Math.random() * 3),
          });
          
          // Update post answer count
          await Post.findByIdAndUpdate(question._id, {
            $inc: { answerCount: 1 }
          });
        } catch (error) {
          console.error(`   ❌ Error creating answer:`, error.message);
        }
      }
      
      console.log(`   ✅ Added answers to: ${question.title.substring(0, 50)}...`);
    }
  }
}

// Main seed function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create users
    const users = await createUsers();
    
    // Create posts
    const posts = await createPosts(users);
    
    // Create answers
    await createAnswers(users, posts);

    console.log('\n✨ Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   👥 Users created/found: ${users.length}`);
    console.log(`   📝 Posts created: ${posts.length}`);
    console.log(`   📂 Post types:`);
    console.log(`      - Questions: ${posts.filter(p => p.type === 'question').length}`);
    console.log(`      - Notes: ${posts.filter(p => p.type === 'note').length}`);
    console.log(`      - Articles: ${posts.filter(p => p.type === 'article').length}`);

    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();