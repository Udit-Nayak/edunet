require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Interaction = require("../models/Interaction");

/**
 * Generate massive amounts of training data for neural ranking
 * This script creates realistic interaction patterns
 */

async function generateTrainingData() {
  try {
    console.log("🚀 GENERATING TRAINING DATA FOR NEURAL RANKING");
    console.log("=".repeat(60));
    console.log("");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all users with embeddings
    const users = await User.find({
      "mlProfile.embedding": { $exists: true, $ne: null },
    }).lean();

    // Get all posts with embeddings
    const posts = await Post.find({
      "mlMetadata.embedding": { $exists: true, $ne: null },
    }).lean();

    console.log(`📊 Found ${users.length} users and ${posts.length} posts\n`);

    if (users.length === 0 || posts.length === 0) {
      console.log("❌ No users or posts with embeddings found!");
      console.log("   Run: node scripts/setupPhase5Data.js first\n");
      process.exit(1);
    }

    // Check existing interactions
    const existingCount = await Interaction.countDocuments();
    console.log(`📈 Existing interactions: ${existingCount}`);

    // Target: 500+ interactions minimum
    const targetInteractions = 600;
    const toCreate = Math.max(0, targetInteractions - existingCount);

    if (toCreate === 0) {
      console.log(`✅ Already have enough interactions (${existingCount})\n`);
    } else {
      console.log(`🎯 Creating ${toCreate} more interactions...\n`);

      let created = 0;
      const batchSize = 50;

      // Create interactions in batches for performance
      while (created < toCreate) {
        const batch = [];

        // Each batch creates random interactions
        for (let i = 0; i < batchSize && created + i < toCreate; i++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const post = posts[Math.floor(Math.random() * posts.length)];

          // Realistic interaction distribution:
          // 35% upvote, 20% save, 10% comment, 35% view
          const rand = Math.random();
          let action, label;

          if (rand < 0.35) {
            action = "upvote";
            label = 1;
          } else if (rand < 0.55) {
            action = "save";
            label = 1;
          } else if (rand < 0.65) {
            action = "comment";
            label = 1;
          } else {
            action = "view";
            label = 0;
          }

          // Random metadata
          const sources = ["feed", "search", "profile", "similar", "tag"];
          const devices = ["desktop", "mobile", "tablet"];

          const interaction = {
            userId: user._id,
            postId: post._id,
            action: action,
            label: label,
            metadata: {
              source: sources[Math.floor(Math.random() * sources.length)],
              deviceType: devices[Math.floor(Math.random() * devices.length)],
              timeSpent: action === "view" 
                ? Math.floor(Math.random() * 20)
                : Math.floor(Math.random() * 90) + 30,
              scrollDepth: Math.floor(Math.random() * 100),
            },
            createdAt: new Date(
              Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ),
          };

          batch.push(interaction);
        }

        // Insert batch
        try {
          await Interaction.insertMany(batch, { ordered: false });
          created += batch.length;

          if (created % 100 === 0 || created === toCreate) {
            console.log(`   ✓ Created ${created}/${toCreate} interactions`);
          }
        } catch (error) {
          // Some might be duplicates, that's okay
          created += batch.length;
        }
      }

      console.log(`\n✅ Created ${created} new interactions!`);
    }

    // Also update user interaction arrays for consistency
    console.log("\n🔧 Updating user interaction arrays...");

    for (const user of users.slice(0, 10)) {
      // Get this user's interactions
      const userInteractions = await Interaction.find({
        userId: user._id,
      }).lean();

      const upvotedPosts = userInteractions
        .filter((i) => i.action === "upvote")
        .map((i) => i.postId);

      const savedPosts = userInteractions
        .filter((i) => i.action === "save")
        .map((i) => i.postId);

      const viewedPosts = userInteractions.map((i) => i.postId);

      // Update user document
      await User.findByIdAndUpdate(user._id, {
        $addToSet: {
          "userInteractions.upvotedPosts": { $each: upvotedPosts.map(id => ({ postId: id })) },
          "userInteractions.viewedPosts": { $each: viewedPosts.map(id => ({ postId: id })) },
          savedPosts: { $each: savedPosts },
        },
      });
    }

    console.log("✅ Updated user interaction arrays");

    // Final statistics
    const finalStats = {
      totalInteractions: await Interaction.countDocuments(),
      positiveInteractions: await Interaction.countDocuments({ label: 1 }),
      negativeInteractions: await Interaction.countDocuments({ label: 0 }),
      usersWithEmbeddings: users.length,
      postsWithEmbeddings: posts.length,
    };

    console.log("\n📊 FINAL STATISTICS");
    console.log("=".repeat(60));
    console.log(`✅ Total interactions: ${finalStats.totalInteractions}`);
    console.log(`   - Positive (engaged): ${finalStats.positiveInteractions}`);
    console.log(`   - Negative (viewed): ${finalStats.negativeInteractions}`);
    console.log(`✅ Users with embeddings: ${finalStats.usersWithEmbeddings}`);
    console.log(`✅ Posts with embeddings: ${finalStats.postsWithEmbeddings}`);
    console.log("");

    if (finalStats.totalInteractions >= 100) {
      console.log("🎉 SUCCESS! Ready to train the neural ranking model!");
      console.log("\n▶️  Next step:");
      console.log("   cd ml-service");
      console.log("   python -m app.training.train_ranker\n");
    } else {
      console.log(`⚠️  Still need ${100 - finalStats.totalInteractions} more interactions`);
      console.log("   Run this script again to generate more.\n");
    }

    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run
generateTrainingData();
