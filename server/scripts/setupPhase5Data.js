require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Interaction = require("../models/Interaction");
const mlService = require("../services/mlService");

/**
 * Complete Phase 5 Data Setup Script
 * This prepares all required data for neural ranking model training
 */

async function setupPhase5Data() {
  try {
    console.log("🚀 PHASE 5 DATA SETUP");
    console.log("=" .repeat(60));
    console.log("");

    // Step 1: Connect to MongoDB
    console.log("📡 Step 1: Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Step 2: Check ML Service
    console.log("🔍 Step 2: Checking ML service...");
    const isHealthy = await mlService.checkHealth();
    if (!isHealthy) {
      console.error("❌ ML service is not available!");
      console.error("   Please start it first:");
      console.error("   cd ml-service && python -m uvicorn app.main:app --reload\n");
      process.exit(1);
    }
    console.log("✅ ML service is healthy\n");

    // Step 3: Check existing data
    console.log("📊 Step 3: Checking existing data...");
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const usersWithEmbeddings = await User.countDocuments({
      "mlProfile.embedding": { $exists: true, $ne: null },
    });
    const postsWithEmbeddings = await Post.countDocuments({
      "mlMetadata.embedding": { $exists: true, $ne: null },
    });

    console.log(`   Users: ${userCount} (${usersWithEmbeddings} with embeddings)`);
    console.log(`   Posts: ${postCount} (${postsWithEmbeddings} with embeddings)`);
    console.log("");

    // Step 4: Seed data if needed
    if (userCount < 5 || postCount < 10) {
      console.log("⚠️  Not enough data. Running seeding script...");
      console.log("   Please run: node scripts/seedMoreFeed.js");
      console.log("   Then run this script again.\n");
      process.exit(0);
    }

    // Step 5: Generate post embeddings
    if (postsWithEmbeddings < postCount) {
      console.log(`🔧 Step 4: Generating embeddings for ${postCount - postsWithEmbeddings} posts...`);
      
      const postsNeedingEmbeddings = await Post.find({
        $or: [
          { "mlMetadata.embedding": null },
          { "mlMetadata.embedding": { $exists: false } },
        ],
      });

      let embedded = 0;
      for (const post of postsNeedingEmbeddings) {
        const text = `${post.title} ${post.title} ${post.content} ${post.tags.join(" ")}`;
        
        try {
          const response = await mlService.client.post("/api/embeddings/generate", { text });
          const embedding = response.data.embedding;

          await Post.findByIdAndUpdate(post._id, {
            $set: {
              "mlMetadata.embedding": embedding,
              "mlMetadata.lastUpdated": new Date(),
            },
          });

          embedded++;
          if (embedded % 10 === 0) {
            console.log(`   ✓ Embedded ${embedded}/${postsNeedingEmbeddings.length} posts`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to embed post ${post._id}: ${error.message}`);
        }
      }

      console.log(`✅ Generated embeddings for ${embedded} posts\n`);
    } else {
      console.log("✅ Step 4: All posts already have embeddings\n");
    }

    // Step 6: Generate user vectors
    if (usersWithEmbeddings < userCount) {
      console.log(`🔧 Step 5: Generating vectors for ${userCount - usersWithEmbeddings} users...`);

      const usersNeedingVectors = await User.find({
        $or: [
          { "mlProfile.embedding": null },
          { "mlProfile.embedding": { $exists: false } },
        ],
        interests: { $exists: true, $not: { $size: 0 } },
      });

      let vectorized = 0;
      for (const user of usersNeedingVectors) {
        try {
          await mlService.initializeUserVector(user._id.toString());
          vectorized++;
          if (vectorized % 5 === 0) {
            console.log(`   ✓ Vectorized ${vectorized}/${usersNeedingVectors.length} users`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to vectorize user ${user.username}: ${error.message}`);
        }
      }

      console.log(`✅ Generated vectors for ${vectorized} users\n`);
    } else {
      console.log("✅ Step 5: All users already have vectors\n");
    }

    // Step 7: Create sample interactions
    console.log("🔧 Step 6: Creating sample interactions...");
    
    // First, check existing interactions
    const existingInteractions = await Interaction.countDocuments();
    console.log(`   Existing interactions: ${existingInteractions}`);
    
    if (existingInteractions >= 100) {
      console.log(`   ✅ Already have enough interactions (${existingInteractions} >= 100)`);
      console.log(`   Skipping interaction generation.\n`);
    } else {
      console.log(`   Need to create ${100 - existingInteractions} more interactions\n`);
      
      // Use ALL users and posts with embeddings for maximum training data
      const users = await User.find({ "mlProfile.embedding": { $exists: true, $ne: null } })
        .lean();
      const posts = await Post.find({ "mlMetadata.embedding": { $exists: true, $ne: null } })
        .lean();

      console.log(`   Found ${users.length} users and ${posts.length} posts with embeddings`);

      if (users.length < 3 || posts.length < 10) {
        console.log("⚠️  Not enough users/posts with embeddings to create interactions");
        console.log(`   Users: ${users.length}, Posts: ${posts.length}\n`);
      } else {
        let interactionsCreated = 0;
        const targetInteractions = Math.max(300, users.length * 15); // Ensure at least 300 interactions

        console.log(`   Target: ${targetInteractions} total interactions\n`);

      // Each user interacts with random posts
      for (const user of users) {
        // Each user views 20-40 posts for more training data
        const viewCount = Math.floor(Math.random() * 20) + 20;
        const shuffledPosts = [...posts].sort(() => 0.5 - Math.random());
        const postsToView = shuffledPosts.slice(0, Math.min(viewCount, posts.length));

        for (const post of postsToView) {
          // More realistic interaction distribution:
          // 40% upvote, 15% save, 5% comment, 40% just view
          const rand = Math.random();
          let interactionType;
          if (rand < 0.40) {
            interactionType = "upvote";
          } else if (rand < 0.55) {
            interactionType = "save";
          } else if (rand < 0.60) {
            interactionType = "comment";
          } else {
            interactionType = "view";
          }

          // Create interaction record
          const interaction = new Interaction({
            userId: user._id,
            postId: post._id,
            action: interactionType,
            label: interactionType === "view" ? 0 : 1, // Positive=1 for upvote/save/comment, Negative=0 for view
            metadata: {
              source: ["feed", "search", "profile", "similar"][Math.floor(Math.random() * 4)],
              deviceType: ["desktop", "mobile", "tablet"][Math.floor(Math.random() * 3)],
              timeSpent: interactionType === "view" 
                ? Math.floor(Math.random() * 15) 
                : Math.floor(Math.random() * 60) + 30,
              scrollDepth: Math.floor(Math.random() * 100),
            },
          });

          // Manually set createdAt to a random time in last 30 days for realistic data
          interaction.createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
          
          await interaction.save();

          // Update user interactions
          if (interactionType === "upvote") {
            await User.findByIdAndUpdate(user._id, {
              $addToSet: { "userInteractions.upvotedPosts": post._id },
            });
            await Post.findByIdAndUpdate(post._id, {
              $inc: { upvotes: 1 },
            });
          } else if (interactionType === "save") {
            await User.findByIdAndUpdate(user._id, {
              $addToSet: { savedPosts: post._id },
            });
          }

          // Always add to viewed
          await User.findByIdAndUpdate(user._id, {
            $addToSet: { "userInteractions.viewedPosts": post._id },
          });
          await Post.findByIdAndUpdate(post._id, {
            $inc: { viewCount: 1 },
          });

          interactionsCreated++;

          // Progress logging every 50 interactions
          if (interactionsCreated % 50 === 0) {
            console.log(`   ✓ Created ${interactionsCreated} interactions...`);
          }
        }
      }

      console.log(`✅ Created ${interactionsCreated} new interactions`);
      console.log(`   Total interactions now: ${existingInteractions + interactionsCreated}\n`);
      }
    }

    // Step 8: Verify data is ready
    console.log("🔍 Step 7: Verifying data for training...");
    
    const finalStats = {
      usersWithEmbeddings: await User.countDocuments({
        "mlProfile.embedding": { $exists: true, $ne: null },
      }),
      usersWithInteractions: await User.countDocuments({
        $or: [
          { "userInteractions.viewedPosts": { $not: { $size: 0 } } },
          { "userInteractions.upvotedPosts": { $not: { $size: 0 } } },
          { savedPosts: { $not: { $size: 0 } } },
        ],
      }),
      postsWithEmbeddings: await Post.countDocuments({
        "mlMetadata.embedding": { $exists: true, $ne: null },
      }),
      totalInteractions: await Interaction.countDocuments(),
    };

    console.log("\n📊 FINAL DATA STATISTICS");
    console.log("=" .repeat(60));
    console.log(`✅ Users with embeddings: ${finalStats.usersWithEmbeddings}`);
    console.log(`✅ Users with interactions: ${finalStats.usersWithInteractions}`);
    console.log(`✅ Posts with embeddings: ${finalStats.postsWithEmbeddings}`);
    console.log(`✅ Total interactions: ${finalStats.totalInteractions}`);
    console.log("");

    // Check if ready for training
    if (finalStats.totalInteractions >= 100) {
      console.log("🎉 SUCCESS! You have enough data to train the neural ranking model!");
      console.log("\n▶️  Next step: Train the model");
      console.log("   cd ml-service");
      console.log("   python -m app.training.train_ranker\n");
    } else {
      console.log(`⚠️  Need at least 100 interactions for training (current: ${finalStats.totalInteractions})`);
      console.log("\n💡 Options to get more data:");
      console.log("   1. Use the app and interact with posts (upvote, save, view)");
      console.log("   2. Run this script again to generate more random interactions");
      console.log("   3. Seed more users/posts with: node scripts/seedMoreFeed.js\n");
    }

    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error during setup:", error);
    process.exit(1);
  }
}

// Run the setup
setupPhase5Data();
