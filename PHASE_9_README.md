# Phase 9: Continuous Learning & Feedback Loop

## Overview

Phase 9 implements a comprehensive continuous learning system that enables ML models to improve over time based on real user behavior. The system includes interaction tracking, A/B testing, automated model retraining, and intelligent promotion decisions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                        │
│  (Views, Clicks, Reads, Upvotes, Saves, Comments, Answers)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTERACTION TRACKING                          │
│  - Records events with user/post snapshots                      │
│  - Assigns A/B test model versions                              │
│  - Stores context (source, position, device, etc.)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH PROCESSING (Daily)                      │
│  - Pairs impressions with follow-up actions (10-min window)     │
│  - Generates training labels (1=positive, 0=negative)           │
│  - Marks events as processed                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               TRAINING DATA GENERATION (Weekly)                  │
│  - Extracts processed events from MongoDB                       │
│  - Generates pickle files with features and labels              │
│  - Marks events as used for training                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 MODEL RETRAINING (Weekly)                        │
│  - Loads existing model (transfer learning)                     │
│  - Trains on new data                                           │
│  - Creates candidate ModelVersion                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    A/B TESTING (3-7 days)                        │
│  - 10% traffic to candidate, 90% to production                  │
│  - Tracks metrics: CTR, session time, engagement                │
│  - Statistical comparison with baseline                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PROMOTION EVALUATION                            │
│  - CTR improved >2% + statistically significant?                │
│  - YES: Auto-promote to production, archive old version         │
│  - NO: Keep production, archive candidate                       │
└─────────────────────────────────────────────────────────────────┘
```

## Event Types

### Impression Events
- **impression**: Post shown to user (500ms visibility threshold)
- Automatically converted to positive/negative based on follow-up actions

### Engagement Events
- **click**: User clicked on post
- **read**: User spent ≥30 seconds reading
- **upvote**: User upvoted the post
- **save**: User saved the post
- **share**: User shared the post
- **comment**: User commented on the post
- **answer**: User answered a question

### Negative Signals
- **quick_exit**: User left within 5 seconds
- **downvote**: User downvoted the post

## Training Labels

| Label | Meaning | Triggers |
|-------|---------|----------|
| **1** | Positive (Engaged) | Click + Read >30s, Upvote, Save, Comment, Answer |
| **0** | Negative (Unengaged) | Quick exit <5s, Downvote, Impression with no follow-up |
| **-1** | Pending | Impression waiting for follow-up action (10-min window) |

## Setup Instructions

### 1. Database Setup

The MongoDB models are already created. Ensure your database is running:

```bash
# Check MongoDB connection
mongosh "your_mongodb_uri"
```

### 2. Backend Setup

The backend routes and services are already integrated. Verify the server is running:

```bash
cd server
npm start
```

API endpoints available at: `http://localhost:5000/api/learning`

### 3. ML Service Setup

Install Python dependencies:

```bash
cd ml-service
pip install -r requirements.txt
```

Required packages:
- tensorflow>=2.12.0
- pymongo
- numpy
- scikit-learn
- python-dotenv

### 4. Client Setup

The React hooks and API integration are complete. Verify client is running:

```bash
cd client
npm run dev
```

## Usage Guide

### Step 1: Collect Interaction Data

The system automatically tracks interactions when users:

1. **Browse Feed**: Impressions recorded after 1-second visibility
2. **Click Posts**: Click events recorded with position and source
3. **Read Posts**: Read time and scroll depth tracked automatically
4. **Engage**: Upvotes, saves, comments tracked via button callbacks

**Manual Testing**:

```javascript
// In browser console on Feed page
// View Redux state to verify tracking
JSON.parse(localStorage.getItem('token'))

// Check if interactions are being recorded
fetch('http://localhost:5000/api/learning/training/stats?days=7', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)
```

### Step 2: Run Daily Batch Processing

Process raw interaction events (pair impressions with follow-up actions):

```bash
node server/jobs/processInteractions.js
```

**Recommended**: Schedule this to run daily via cron:

```bash
# Add to crontab (Linux/Mac)
0 2 * * * cd /path/to/edunet/server && node jobs/processInteractions.js

# Or use Task Scheduler (Windows)
# Action: node.exe
# Arguments: jobs/processInteractions.js
# Start in: D:\web\edunet\server
# Schedule: Daily at 2:00 AM
```

**Expected Output**:
```
🚀 Starting daily interaction processing...
📊 Processing impressions...
✅ Processed 1,234 impressions
📝 Processing direct events...
✅ Processed 567 direct events
📈 Processing Statistics:
   Total events: 5,678
   Unprocessed: 234
   Ready for training: 1,801
   Used for training: 0
🧹 Cleanup complete
✅ Daily processing complete in 3.4s
```

### Step 3: Generate Training Data (Weekly)

Extract processed events into training pickle files:

```bash
cd ml-service
python -m app.training.generate_training_data --days 7 --mark-used
```

**Options**:
- `--days N`: Extract events from last N days (default: 7)
- `--output-dir PATH`: Output directory (default: ./data/training)
- `--mark-used`: Mark events as used for training (recommended)

**Expected Output**:
```
🚀 Starting training data generation...
📊 Querying interaction events from last 7 days...
✅ Found 1,801 events with training labels
📦 Extracting features...
   User embeddings: 512D vectors
   Post embeddings: 512D vectors
   User features: reputation, postCount, interests
   Post features: upvotes, views, tags, age
💾 Saving training data...
   Output: ./data/training/training_data_batch_1234567890.pkl
   Summary: ./data/training/training_data_batch_1234567890.txt

📋 Training Data Summary:
   Total examples: 1,801
   Positive (label=1): 1,024 (56.9%)
   Negative (label=0): 777 (43.1%)
   
   Event Type Distribution:
   - impression+upvote: 412
   - impression+click: 298
   - impression+read: 314
   - impression+quick_exit: 355
   - impression+downvote: 134
   - impression+timeout: 288

✅ Training data generation complete!
⚡ Marked 1,801 events as used for training
```

### Step 4: Train/Retrain Model (Weekly)

Train a new model using the generated training data:

**First Time (No existing model)**:
```bash
python -m app.training.retrain_model \
  --data-file ./data/training/training_data_batch_*.pkl \
  --epochs 10 \
  --batch-size 256 \
  --output-dir ./models
```

**Retraining (Transfer Learning)**:
```bash
python -m app.training.retrain_model \
  --data-file ./data/training/training_data_batch_*.pkl \
  --existing-model ./models/ranking_model.h5 \
  --epochs 5 \
  --batch-size 256 \
  --output-dir ./models
```

**Expected Output**:
```
🚀 Starting model retraining...
📊 Loading training data from: training_data_batch_1234567890.pkl
✅ Loaded 1,801 examples

📋 Data Summary:
   Training set: 1,440 examples (80%)
   Validation set: 361 examples (20%)
   Positive samples: 1,024 (56.9%)
   Negative samples: 777 (43.1%)
   Class weights: {0: 1.16, 1: 0.88}

🔄 Loading existing model: ./models/ranking_model.h5
✅ Model loaded for transfer learning

🏗️  Model Architecture:
   User Tower: 515 → 256 → 128
   Post Tower: 516 → 256 → 128
   Interaction: Dot product + Concatenate
   Output: 384 → 128 → 64 → 1 (sigmoid)
   Total parameters: 342,785

🎯 Training...
Epoch 1/5 - loss: 0.4521, accuracy: 0.7847, val_auc: 0.8234
Epoch 2/5 - loss: 0.3892, accuracy: 0.8201, val_auc: 0.8567
Epoch 3/5 - loss: 0.3456, accuracy: 0.8423, val_auc: 0.8789
Epoch 4/5 - loss: 0.3234, accuracy: 0.8534, val_auc: 0.8891
Epoch 5/5 - loss: 0.3123, accuracy: 0.8601, val_auc: 0.8934

📊 Final Validation Metrics:
   Loss: 0.3123
   Accuracy: 86.01%
   Precision: 84.23%
   Recall: 87.45%
   F1-Score: 85.81%
   AUC: 0.8934

💾 Saving models...
   Best model: ./models/ranking_model_1234567890_best.h5
   Final model: ./models/ranking_model_1234567890_final.h5
   Metadata: ./models/ranking_model_1234567890_metadata.pkl

✅ Model retraining complete!
⏱️  Training duration: 287.5 seconds
```

### Step 5: Register Model in MongoDB

Create a ModelVersion document for the new model:

```javascript
// In MongoDB shell or via Node.js script
db.modelversions.insertOne({
  versionId: 'ranking_model_v2_1234567890',
  modelName: 'ranking_model',
  status: 'candidate',
  modelPath: './models/ranking_model_1234567890_best.h5',
  createdBy: 'weekly_retraining_job',
  trainingData: {
    numExamples: 1801,
    positiveExamples: 1024,
    negativeExamples: 777,
    batchId: 'batch_1234567890',
    trainingDuration: 287.5
  },
  trainingMetrics: {
    loss: 0.3123,
    accuracy: 0.8601,
    precision: 0.8423,
    recall: 0.8745,
    f1Score: 0.8581,
    auc: 0.8934
  }
});
```

### Step 6: Start A/B Test

Use the REST API to start an A/B test with the new candidate model:

```bash
curl -X POST http://localhost:5000/api/learning/ab-test/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "modelName": "ranking_model",
    "candidateVersionId": "ranking_model_v2_1234567890",
    "trafficPercentage": 10,
    "targetMetric": "ctr",
    "minimumImprovement": 2
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "A/B test started successfully",
  "test": {
    "modelName": "ranking_model",
    "candidateVersion": "ranking_model_v2_1234567890",
    "productionVersion": "ranking_model_v1_1234567890",
    "trafficPercentage": 10,
    "startDate": "2026-03-06T10:30:00.000Z"
  }
}
```

Users will now be automatically assigned to test/control groups via consistent hashing.

### Step 7: Monitor A/B Test (3-7 days)

Check A/B test status:

```bash
curl http://localhost:5000/api/learning/ab-test/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update metrics** (run daily):

```bash
curl -X POST http://localhost:5000/api/learning/ab-test/update-metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "modelName": "ranking_model",
    "days": 1
  }'
```

**Response**:
```json
{
  "success": true,
  "comparison": {
    "testGroup": {
      "impressions": 1234,
      "clicks": 234,
      "ctr": 18.96,
      "avgSessionTime": 145.3,
      "engagementRate": 34.2
    },
    "controlGroup": {
      "impressions": 11106,
      "clicks": 1889,
      "ctr": 17.01,
      "avgSessionTime": 138.7,
      "engagementRate": 31.5
    },
    "improvement": {
      "ctr": 11.47,
      "sessionTime": 4.76,
      "engagement": 8.57
    },
    "isStatisticallySignificant": true,
    "pValue": 0.0234
  }
}
```

### Step 8: Evaluate and Promote

After collecting sufficient data (3-7 days), evaluate promotion criteria:

```bash
curl -X POST http://localhost:5000/api/learning/ab-test/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "modelName": "ranking_model"
  }'
```

**Response**:
```json
{
  "success": true,
  "shouldPromote": true,
  "reason": "CTR improved by 11.47% (>2% threshold) with statistical significance (p=0.0234)",
  "metrics": {
    "ctrImprovement": 11.47,
    "isStatisticallySignificant": true,
    "pValue": 0.0234
  }
}
```

**Auto-promote** if criteria met:

```bash
curl -X POST http://localhost:5000/api/learning/ab-test/promote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "modelName": "ranking_model"
  }'
```

The system will:
1. Stop the A/B test
2. Promote candidate to production
3. Archive the old production model
4. Clear caches
5. All users now get the new model

## Testing

Run the comprehensive test suite:

```bash
cd server
node scripts/testPhase9.js
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║      Phase 9: Continuous Learning - Test Suite            ║
╚════════════════════════════════════════════════════════════╝

📝 Test 1: Interaction Recording
✅ PASS: Interaction recording with snapshots
✅ PASS: Click event recording
✅ PASS: Upvote event recording

🔬 Test 2: A/B Testing Assignment
✅ PASS: Model version creation
✅ PASS: A/B test initiation
✅ PASS: Consistent hash-based user assignment
✅ PASS: Traffic split distribution

⚙️  Test 3: Batch Processing
✅ PASS: Test interaction events created
✅ PASS: Impression pairing and label generation
✅ PASS: Direct event processing

📦 Test 4: Training Data Retrieval
✅ PASS: Training data structure validation
✅ PASS: Training label distribution

📊 Test 5: Metrics Calculation
✅ PASS: User engagement metrics calculation
✅ PASS: Post performance metrics calculation

🔄 Test 6: Model Version Management
✅ PASS: Model version creation with metadata
✅ PASS: Model status update
✅ PASS: Model promotion to production
✅ PASS: Model rollback functionality

📈 Test 7: A/B Test Metrics Update
✅ PASS: Test interaction data created
✅ PASS: A/B test metrics update
✅ PASS: A/B test cleanup

📋 Test 8: Processing Statistics
✅ PASS: Processing statistics retrieval

╔════════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                            ║
╚════════════════════════════════════════════════════════════╝
✅ Passed: 24
❌ Failed: 0
📊 Total:  24
```

## API Reference

### User Endpoints

**Record Interaction**
```
POST /api/learning/interactions
Authorization: Bearer <token>

Body: {
  "postId": "507f1f77bcf86cd799439011",
  "eventType": "upvote",
  "context": {
    "source": "detail",
    "page": "post-detail"
  }
}
```

**Get User Metrics**
```
GET /api/learning/interactions/user/metrics?days=7
Authorization: Bearer <token>
```

**Get A/B Test Assignment**
```
GET /api/learning/ab-test/assignment
Authorization: Bearer <token>
```

### Admin Endpoints

**Start A/B Test**
```
POST /api/learning/ab-test/start
Authorization: Bearer <admin_token>

Body: {
  "modelName": "ranking_model",
  "candidateVersionId": "...",
  "trafficPercentage": 10
}
```

**Update Metrics**
```
POST /api/learning/ab-test/update-metrics
Authorization: Bearer <admin_token>

Body: {
  "modelName": "ranking_model",
  "days": 1
}
```

**Promote to Production**
```
POST /api/learning/ab-test/promote
Authorization: Bearer <admin_token>

Body: {
  "modelName": "ranking_model"
}
```

## Troubleshooting

### No training data available

**Problem**: Training data retrieval returns 0 examples.

**Solution**:
1. Check if interactions are being recorded:
   ```bash
   mongo "your_mongodb_uri"
   > db.interactionevents.countDocuments()
   ```

2. Run batch processing to generate labels:
   ```bash
   node server/jobs/processInteractions.js
   ```

3. Verify processed events exist:
   ```bash
   > db.interactionevents.countDocuments({ processed: true, trainingLabel: { $in: [0, 1] } })
   ```

### A/B test traffic split incorrect

**Problem**: Test group percentage doesn't match target (e.g., 10%).

**Explanation**: MD5 hash-based assignment is deterministic but may vary with small sample sizes. With 100+ users, distribution should approximate target within ±5%.

**Solution**: Check with larger user base. If issue persists, verify hash function in `abTestingService.hashUserToTestGroup()`.

### Model promotion fails

**Problem**: Evaluation shows `shouldPromote: false`.

**Causes**:
1. CTR improvement < 2% threshold
2. Not statistically significant (p-value > 0.05)
3. Insufficient data collected

**Solution**:
- Run A/B test longer (7+ days)
- Increase traffic percentage (20%)
- Lower minimum improvement threshold (1%)

## Production Deployment

### Recommended Cron Jobs

```bash
# Daily batch processing at 2 AM
0 2 * * * cd /path/to/edunet/server && node jobs/processInteractions.js >> logs/processing.log 2>&1

# Weekly training data generation (Sunday 3 AM)
0 3 * * 0 cd /path/to/edunet/ml-service && python -m app.training.generate_training_data --days 7 --mark-used >> logs/training_data.log 2>&1

# Weekly model retraining (Sunday 4 AM)
0 4 * * 0 cd /path/to/edunet/ml-service && python -m app.training.retrain_model --data-file ./data/training/training_data_*.pkl --existing-model ./models/ranking_model.h5 --epochs 5 >> logs/retraining.log 2>&1
```

### Monitoring

Monitor these metrics in production:

1. **Interaction Volume**: Track events/day to ensure tracking is working
2. **Processing Rate**: % of events processed daily
3. **Training Data Quality**: Positive/negative ratio (aim for 40-60%)
4. **A/B Test Results**: CTR, engagement improvements
5. **Model Performance**: Validation metrics (accuracy, AUC)

## Best Practices

1. **Sufficient Data**: Collect at least 1000 interactions before first training
2. **Regular Retraining**: Weekly is recommended, minimum monthly
3. **A/B Test Duration**: Run for 3-7 days minimum
4. **Traffic Split**: Start with 10%, increase to 20% if confident
5. **Promotion Threshold**: 2% minimum improvement is conservative, adjust based on needs
6. **Model Versioning**: Keep last 3 production models for rollback capability
7. **Monitoring**: Set up alerts for anomalies (sudden CTR drops, processing failures)

## Files Created (Phase 9)

### Backend (Node.js)
- `server/models/InteractionEvent.js` - Interaction tracking MongoDB model
- `server/models/ModelVersion.js` - Model version tracking MongoDB model
- `server/services/interactionTrackingService.js` - Interaction recording and processing
- `server/services/abTestingService.js` - A/B testing framework
- `server/controllers/learningController.js` - REST API controllers
- `server/routes/learningRoutes.js` - API routes
- `server/jobs/processInteractions.js` - Daily batch processing job
- `server/scripts/testPhase9.js` - Comprehensive test suite

### ML Service (Python)
- `ml-service/app/training/generate_training_data.py` - Training data extraction
- `ml-service/app/training/retrain_model.py` - Model retraining pipeline

### Frontend (React)
- `client/src/hooks/useInteractionTracking.js` - Updated with Phase 9 tracking hooks
- `client/src/services/api.js` - Updated with learningAPI methods
- Component updates: PostCard, PostDetail, VoteButton, SaveButton, AnswerForm

## Support

For issues or questions:
1. Check logs: `server/logs/` and `ml-service/logs/`
2. Run test suite: `node server/scripts/testPhase9.js`
3. Verify MongoDB collections: `interactionevents`, `modelversions`
4. Check API status: `GET /api/learning/training/stats`

## Next Steps

After Phase 9 is operational:
- Monitor metrics for 2-4 weeks
- Collect at least 5,000 interactions
- Train first production model
- Run A/B test with candidate model
- Establish retraining schedule
- Set up automated monitoring and alerts
