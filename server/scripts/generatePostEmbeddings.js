require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Post = require("../models/Post");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const BATCH_SIZE = 50;

/**
 * Generate embedding for a single post
 */
async function generateEmbedding(title, content, tags) {
  try {
    const text = `${title} ${title} ${content} ${tags.join(" ")}`;

    const response = await axios.post(
      `${ML_SERVICE_URL}/api/embeddings/generate`,
      { text },
      { timeout: 30000 }
    );

    return response.data.embedding;
  } catch (error) {
    console.error("Embedding generation error:", error.message);
    return null;
  }
}

/**
 * Generate embeddings in batch (more efficient)
 */
async function generateBatchEmbeddings(posts) {
  try {
    const texts = posts.map(
      (post) => `${post.title} ${post.title} ${post.content} ${post.tags.join(" ")}`
    );

    const response = await axios.post(
      `${ML_SERVICE_URL}/api/embeddings/batch`,
      { texts },
      { timeout: 60000 }
    );

    return response.data.embeddings;
  } catch (error) {
    console.error("Batch embedding generation error:", error.message);
    return null;
  }
}

/**
 * Main batch processing function
 */
async function batchGenerateEmbeddings() {
  try {
    console.log("🚀 Starting embedding generation...\n");
    console.log("1️⃣ Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check ML service health
    console.log("2️⃣ Checking ML service...");
    try {
      const healthResponse = await axios.get(`${ML_SERVICE_URL}/health`);
      console.log("✅ ML service is healthy\n");
      console.log(`   Model dimension: ${healthResponse.data.embedding_dim}`);
    } catch (error) {
      console.error("❌ ML service is not available!");
      console.error("   Please start the ML service first:");
      console.error("   cd ml-service && python -m uvicorn app.main:app --reload\n");
      process.exit(1);
    }

    // Find posts without embeddings
    console.log("3️⃣ Finding posts without embeddings...");
    const posts = await Post.find({
      status: "published",
      "mlMetadata.embedding": null,
    }).select("_id title content tags");

    console.log(`   Found ${posts.length} posts to process\n`);

    if (posts.length === 0) {
      console.log("✅ All posts already have embeddings!");
      process.exit(0);
    }

    let processed = 0;
    let failed = 0;
    const totalBatches = Math.ceil(posts.length / BATCH_SIZE);

    // Process in batches
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`\n📦 Batch ${batchNum}/${totalBatches}`);
      console.log(`   Posts ${i + 1}-${Math.min(i + BATCH_SIZE, posts.length)}`);

      try {
        // Generate embeddings for entire batch
        const embeddings = await generateBatchEmbeddings(batch);

        if (embeddings && embeddings.length === batch.length) {
          // Update all posts in batch
          const updatePromises = batch.map((post, idx) => {
            return Post.findByIdAndUpdate(post._id, {
              $set: {
                "mlMetadata.embedding": embeddings[idx],
                "mlMetadata.lastEmbeddingUpdate": new Date(),
              },
            });
          });

          await Promise.all(updatePromises);
          processed += batch.length;
          console.log(`   ✅ Batch completed: ${batch.length} posts processed`);
        } else {
          failed += batch.length;
          console.log(`   ❌ Batch failed: Could not generate embeddings`);
        }
      } catch (error) {
        console.error(`   ❌ Batch error: ${error.message}`);
        failed += batch.length;
      }

      // Progress update
      console.log(`   Progress: ${processed}/${posts.length} processed, ${failed} failed`);

      // Small delay between batches to avoid overwhelming the ML service
      if (i + BATCH_SIZE < posts.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Embedding generation complete!");
    console.log("\n📊 Summary:");
    console.log(`   ✅ Successfully processed: ${processed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success rate: ${((processed / posts.length) * 100).toFixed(1)}%`);
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
 * Generate embeddings for specific posts (by IDs)
 */
async function generateEmbeddingsForPosts(postIds) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const posts = await Post.find({
      _id: { $in: postIds },
    }).select("_id title content tags");

    console.log(`Generating embeddings for ${posts.length} posts...`);

    for (const post of posts) {
      const embedding = await generateEmbedding(
        post.title,
        post.content,
        post.tags
      );

      if (embedding) {
        await Post.findByIdAndUpdate(post._id, {
          $set: {
            "mlMetadata.embedding": embedding,
            "mlMetadata.lastEmbeddingUpdate": new Date(),
          },
        });
        console.log(`✅ Updated embedding for post ${post._id}`);
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Check if specific post IDs were provided as arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log("🎯 Generating embeddings for specific posts...\n");
  generateEmbeddingsForPosts(args);
} else {
  console.log("🎯 Starting batch embedding generation for all posts...\n");
  batchGenerateEmbeddings();
}