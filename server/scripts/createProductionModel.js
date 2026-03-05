require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const ModelVersion = require('../models/ModelVersion');

/**
 * Create a default production model version
 * Run this once to initialize the system
 */
async function createProductionModel() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if production model already exists
    const existing = await ModelVersion.findOne({
      modelName: 'ranking_model',
      status: 'production'
    });

    if (existing) {
      console.log('⚠️  Production model already exists:');
      console.log(`   Version ID: ${existing.versionId}`);
      console.log(`   File Path: ${existing.filePath}`);
      console.log(`   Created: ${existing.createdAt}`);
      console.log('\n✅ No action needed');
      process.exit(0);
    }

    // Create default production model
    console.log('📝 Creating default production model version...');
    
    const productionModel = await ModelVersion.create({
      versionId: 'ranking_model_baseline',
      modelName: 'ranking_model',
      versionNumber: '0.1.0',
      status: 'production',
      filePath: './models/ranking_model_baseline.h5',
      modelSize: 0,
      architecture: 'two_tower_neural_network',
      hyperparameters: {
        embedding_dim: 512,
        user_tower_dims: [256, 128],
        post_tower_dims: [256, 128],
        combined_dims: [128, 64],
        dropout_rate: 0.3,
        learning_rate: 0.001
      },
      trainingData: {
        numExamples: 0,
        positiveExamples: 0,
        negativeExamples: 0,
        trainingDuration: 0
      },
      trainingMetrics: {
        loss: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        auc: 0
      },
      deployedAt: new Date(),
      deployedBy: 'system',
      promotionReason: 'Initial baseline model for system bootstrap',
      notes: 'Baseline production model - serves as fallback until first trained model is deployed',
      createdBy: 'system'
    });

    console.log('\n✅ Production model created successfully!');
    console.log(`   Version ID: ${productionModel.versionId}`);
    console.log(`   Model Name: ${productionModel.modelName}`);
    console.log(`   Status: ${productionModel.status}`);
    console.log(`   Version: ${productionModel.versionNumber}`);
    console.log(`   File Path: ${productionModel.filePath}`);
    console.log('\n✅ System is now ready for Phase 9 interaction tracking');

    await mongoose.connection.close();
    console.log('\n📊 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating production model:', error);
    process.exit(1);
  }
}

// Run the script
createProductionModel();
