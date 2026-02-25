require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Interaction = require("../models/Interaction");

/**
 * Diagnostic script to check what data exists for training
 */

async function diagnoseTrainingData() {
  try {
    console.log("🔍 TRAINING DATA DIAGNOSTIC");
    console.log("=".repeat(60));
    console.log("");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check users
    console.log("👥 USERS:");
    const totalUsers = await User.countDocuments();
    const usersWithEmbeddings = await User.countDocuments({
      "mlProfile.embedding": { $exists: true, $ne: null },
    });
    console.log(`   Total: ${totalUsers}`);
    console.log(`   With embeddings: ${usersWithEmbeddings}`);

    // Sample a user with embedding
    const sampleUser = await User.findOne({
      "mlProfile.embedding": { $exists: true, $ne: null },
    }).lean();

    if (sampleUser) {
      console.log(`   Sample user: ${sampleUser.username}`);
      console.log(`   - Has mlProfile: ${!!sampleUser.mlProfile}`);
      console.log(`   - Embedding length: ${sampleUser.mlProfile?.embedding?.length || 0}`);
      console.log(`   - Interests: ${sampleUser.interests?.join(", ") || "none"}`);
    }

    console.log("");

    // Check posts
    console.log("📄 POSTS:");
    const totalPosts = await Post.countDocuments();
    const postsWithEmbeddings = await Post.countDocuments({
      "mlMetadata.embedding": { $exists: true, $ne: null },
    });
    console.log(`   Total: ${totalPosts}`);
    console.log(`   With embeddings: ${postsWithEmbeddings}`);

    const samplePost = await Post.findOne({
      "mlMetadata.embedding": { $exists: true, $ne: null },
    }).lean();

    if (samplePost) {
      console.log(`   Sample post: "${samplePost.title}"`);
      console.log(`   - Has mlMetadata: ${!!samplePost.mlMetadata}`);
      console.log(`   - Embedding length: ${samplePost.mlMetadata?.embedding?.length || 0}`);
      console.log(`   - Tags: ${samplePost.tags?.join(", ") || "none"}`);
    }

    console.log("");

    // Check interactions
    console.log("🔗 INTERACTIONS:");
    const totalInteractions = await Interaction.countDocuments();
    const positiveInteractions = await Interaction.countDocuments({ label: 1 });
    const negativeInteractions = await Interaction.countDocuments({ label: 0 });

    console.log(`   Total: ${totalInteractions}`);
    console.log(`   Positive (label=1): ${positiveInteractions}`);
    console.log(`   Negative (label=0): ${negativeInteractions}`);

    // Breakdown by action
    const actionBreakdown = await Interaction.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`   By action:`);
    actionBreakdown.forEach((item) => {
      console.log(`     - ${item._id}: ${item.count}`);
    });

    // Sample interactions
    const sampleInteractions = await Interaction.find()
      .limit(3)
      .populate("userId", "username")
      .populate("postId", "title")
      .lean();

    if (sampleInteractions.length > 0) {
      console.log(`\n   Sample interactions:`);
      sampleInteractions.forEach((int, i) => {
        console.log(`   ${i + 1}. ${int.userId?.username} ${int.action}d "${int.postId?.title?.substring(0, 40)}..."`);
        console.log(`      - Label: ${int.label}, Created: ${int.createdAt?.toISOString()}`);
      });
    }

    console.log("");

    // Check what the Python data collector would find
    console.log("🐍 PYTHON DATA COLLECTOR SIMULATION:");
    
    // This mimics the Python query
    const usersForTraining = await User.find({
      "mlProfile.embedding": { $exists: true, $ne: null },
    }).lean();

    console.log(`   Users with mlProfile.embedding: ${usersForTraining.length}`);

    if (usersForTraining.length > 0) {
      const firstUser = usersForTraining[0];
      
      // Check interactions for this user
      const userInteractions = await Interaction.find({
        userId: firstUser._id,
      }).lean();

      console.log(`   Sample user: ${firstUser.username}`);
      console.log(`   - Total interactions: ${userInteractions.length}`);
      
      const userPositive = userInteractions.filter(i => i.label === 1);
      const userNegative = userInteractions.filter(i => i.label === 0);
      
      console.log(`   - Positive: ${userPositive.length}`);
      console.log(`   - Negative: ${userNegative.length}`);

      if (userPositive.length > 0) {
        console.log(`   - Positive actions: ${[...new Set(userPositive.map(i => i.action))].join(", ")}`);
      }
      if (userNegative.length > 0) {
        console.log(`   - Negative actions: ${[...new Set(userNegative.map(i => i.action))].join(", ")}`);
      }
    }

    console.log("");

    console.log("✅ TRAINING READINESS:");
    const ready = totalInteractions >= 100 && usersWithEmbeddings >= 3 && postsWithEmbeddings >= 10;
    
    if (ready) {
      console.log("   🎉 READY TO TRAIN!");
      console.log(`   - ${totalInteractions} interactions (need 100+) ✓`);
      console.log(`   - ${usersWithEmbeddings} users with embeddings (need 3+) ✓`);
      console.log(`   - ${postsWithEmbeddings} posts with embeddings (need 10+) ✓`);
    } else {
      console.log("   ⚠️  NOT READY:");
      if (totalInteractions < 100) {
        console.log(`   - Only ${totalInteractions} interactions (need 100+) ✗`);
      }
      if (usersWithEmbeddings < 3) {
        console.log(`   - Only ${usersWithEmbeddings} users with embeddings (need 3+) ✗`);
      }
      if (postsWithEmbeddings < 10) {
        console.log(`   - Only ${postsWithEmbeddings} posts with embeddings (need 10+) ✗`);
      }
    }

    console.log("");
    console.log("=".repeat(60));

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

diagnoseTrainingData();
