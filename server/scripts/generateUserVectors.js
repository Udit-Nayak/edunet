require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const mlService = require("../services/mlService");

/**
 * Generate user vectors for all users with interaction history
 */
async function batchGenerateUserVectors() {
  try {
    console.log("🚀 Starting user vector generation...\n");
    console.log("1️⃣ Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check ML service health
    console.log("2️⃣ Checking ML service...");
    const isHealthy = await mlService.checkHealth();

    if (!isHealthy) {
      console.error("❌ ML service is not available!");
      console.error("   Please start the ML service first:");
      console.error("   cd ml-service && python -m uvicorn app.main:app --reload\n");
      process.exit(1);
    }
    console.log("✅ ML service is healthy\n");

    // Find users with interactions but no vector
    console.log("3️⃣ Finding users without vectors...");
    const users = await User.find({
      $or: [
        { "mlProfile.embedding": null },
        { "mlProfile.embedding": { $exists: false } },
        { "userInteractions.viewedPosts": { $not: { $size: 0 } } },
        { "userInteractions.upvotedPosts": { $not: { $size: 0 } } },
        { savedPosts: { $not: { $size: 0 } } },
      ],
    }).select("_id username");

    console.log(`   Found ${users.length} users to process\n`);

    if (users.length === 0) {
      console.log("✅ All users already have vectors or no interactions!");
      process.exit(0);
    }

    let processed = 0;
    let failed = 0;

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      console.log(
        `\n👤 Processing user ${i + 1}/${users.length}: ${user.username}`
      );

      try {
        // Generate user vector
        const userVector = await mlService.computeUserVector(user._id);

        if (userVector) {
          // Update user profile
          await User.findByIdAndUpdate(user._id, {
            $set: {
              "mlProfile.embedding": userVector,
              "mlProfile.lastUpdated": new Date(),
            },
          });

          processed++;
          console.log(`   ✅ Vector generated (${userVector.length} dimensions)`);
        } else {
          failed++;
          console.log(`   ❌ Failed to generate vector`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        failed++;
      }

      // Progress update
      console.log(`   Progress: ${processed}/${users.length} processed, ${failed} failed`);

      // Small delay to avoid overwhelming the service
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 User vector generation complete!");
    console.log("\n📊 Summary:");
    console.log(`   ✅ Successfully processed: ${processed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(
      `   📈 Success rate: ${((processed / users.length) * 100).toFixed(1)}%`
    );
    console.log("=".repeat(60));

    await mongoose.connection.close();
    console.log("\n👋 MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

/**
 * Generate cold start vectors for new users based on interests
 */
async function generateColdStartVectors() {
  try {
    console.log("🚀 Generating cold start vectors...\n");

    await mongoose.connect(process.env.MONGODB_URI);

    // Find users with interests but no vector and no interactions
    const users = await User.find({
      "mlProfile.embedding": null,
      interests: { $not: { $size: 0 } },
      "userInteractions.viewedPosts": { $size: 0 },
    }).select("_id username interests");

    console.log(`Found ${users.length} users for cold start\n`);

    let processed = 0;

    for (const user of users) {
      console.log(`👤 ${user.username}: ${user.interests.join(", ")}`);

      const vector = await mlService.getColdStartVector(user.interests);

      if (vector) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            "mlProfile.embedding": vector,
            "mlProfile.lastUpdated": new Date(),
          },
        });
        processed++;
        console.log(`   ✅ Cold start vector generated`);
      }
    }

    console.log(`\n✅ Generated ${processed} cold start vectors`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

/**
 * Update a specific user's vector
 */
async function updateUserVector(userId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log(`Updating vector for user: ${userId}`);

    const vector = await mlService.computeUserVector(userId);

    if (vector) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          "mlProfile.embedding": vector,
          "mlProfile.lastUpdated": new Date(),
        },
      });
      console.log("✅ Vector updated successfully");
    } else {
      console.log("❌ Failed to generate vector");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "cold-start") {
  generateColdStartVectors();
} else if (command === "user" && args[1]) {
  updateUserVector(args[1]);
} else {
  batchGenerateUserVectors();
}