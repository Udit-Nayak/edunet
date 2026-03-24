# ML Service - Quick Start Guide

## 🚀 First-Time Setup

### Step 1: Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

Expected packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `tensorflow` - Machine learning (CPU version is fine)
- `tensorflow-hub` - Pre-trained model loader
- `pymongo` - MongoDB driver
- `python-dotenv` - Environment variables

### Step 2: Configure Environment

Create `.env` file in `ml-service/` directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/edunet

# Embedding Model
EMBEDDING_MODEL_URL=https://tfhub.dev/google/universal-sentence-encoder/4

# Server Settings (optional)
HOST=0.0.0.0
PORT=8000
```

### Step 3: Pre-Download the Model (RECOMMENDED)

⚠️ **Important**: The Universal Sentence Encoder (~1GB) must be downloaded on first use.

**Option A: Pre-download with progress (Recommended)**
```bash
python preload_model.py
```

This takes 2-5 minutes but shows progress. Do this ONCE, then startups are fast.

**Option B: Download during service startup**
```bash
python -m uvicorn app.main:app --reload
```

This works but appears frozen for 2-5 minutes. Don't interrupt!

### Step 4: Start the Service

After pre-downloading the model:

```bash
python -m uvicorn app.main:app --reload
```

You should see:
```
✅ MODEL LOADED SUCCESSFULLY!
INFO: Uvicorn running on http://127.0.0.1:8000
```

Startup time: **5-10 seconds** (model is cached)

## 📡 Available Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "model": "Universal Sentence Encoder v4",
  "mongodb": "connected"
}
```

### Generate Embedding
```bash
curl -X POST http://localhost:8000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is amazing"}'
```

Response:
```json
{
  "embedding": [0.123, -0.456, ...],  // 512-dimensional vector
  "dimension": 512
}
```

### Hybrid Recommendations
```bash
curl http://localhost:8000/api/ml/hybrid-recommendations/USER_ID?limit=10
```

### Similar Posts
```bash
curl -X POST http://localhost:8000/api/ml/similar-posts \
  -H "Content-Type: application/json" \
  -d '{"postId": "POST_ID", "limit": 5}'
```

### Collaborative Filtering
```bash
curl http://localhost:8000/api/ml/collaborative-recommendations/USER_ID?limit=10
```

### Neural Ranking
```bash
curl -X POST http://localhost:8000/api/ml/neural-rank \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "postIds": ["POST_1", "POST_2", "POST_3"]
  }'
```

## 🔧 Troubleshooting

### "Model download appears frozen"

**This is normal!** The download is working but doesn't show progress.

**Solution**: Use `python preload_model.py` instead - it shows progress.

### "Corrupted cache error"

**Problem**: Download was interrupted (Ctrl+C)

**Solution**:
```bash
python clear_tfhub_cache.py
python preload_model.py
```

### "ModuleNotFoundError: No module named 'tensorflow'"

**Solution**:
```bash
pip install -r requirements.txt
```

### "Connection to MongoDB failed"

**Solution**: Verify MongoDB is running and URI is correct in `.env`

```bash
# Check MongoDB
mongosh "your_mongodb_connection_string"
```

### "Port 8000 already in use"

**Solution**: Kill existing process or use different port

```bash
# Use different port
python -m uvicorn app.main:app --reload --port 8001
```

## 📊 Performance Notes

### First Startup (No Cache)
- Time: **2-5 minutes**
- Downloads: ~1GB (Universal Sentence Encoder)
- Cache location: `%TEMP%\tfhub_modules` (Windows) or `/tmp/tfhub_modules` (Unix)

### Subsequent Startups (Cached)
- Time: **5-10 seconds**
- No downloads (uses cached model)

### Memory Usage
- Model loaded: ~1.5 GB RAM
- Idle: ~500 MB RAM
- During inference: ~2 GB RAM

### API Response Times
- `/health`: 1-5 ms
- `/api/embeddings/generate`: 50-200 ms (single text)
- `/api/ml/hybrid-recommendations`: 200-500 ms (includes DB queries)
- `/api/ml/similar-posts`: 100-300 ms
- `/api/ml/neural-rank`: 100-400 ms (depends on batch size)

## ✅ Lint And Deploy Checks

Use these checks before deployment from the `ml-service` folder:

```bash
# Install dev tooling
pip install -r requirements-dev.txt

# Deployment-focused lint checks (syntax + undefined names)
python -m ruff check .

# Bytecode compile check (catches syntax/import-time parse problems)
python -m compileall app
```

## 🚢 Production Deployment

### Using Docker (Recommended)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model during build (optional but recommended)
COPY preload_model.py app/ ./
RUN python preload_model.py

# Copy application
COPY . .

# Run service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t edunet-ml-service .
docker run -p 8000:8000 --env-file .env edunet-ml-service
```

### Using Systemd (Linux)

Create `/etc/systemd/system/edunet-ml.service`:

```ini
[Unit]
Description=EduNet ML Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/edunet/ml-service
Environment="PATH=/opt/edunet/ml-service/venv/bin"
ExecStart=/opt/edunet/ml-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable edunet-ml
sudo systemctl start edunet-ml
```

### Using PM2 (Node.js Process Manager)

```bash
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name edunet-ml
pm2 save
```

## 📁 Project Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── models/
│   │   ├── embeddings.py    # Universal Sentence Encoder
│   │   └── ranking.py       # Neural ranking model
│   ├── services/
│   │   ├── recommendation.py  # Hybrid recommendations
│   │   ├── similarity.py      # Similar posts
│   │   └── collaborative.py   # Collaborative filtering
│   ├── utils/
│   │   └── helpers.py
│   └── training/            # Phase 9: Model retraining
│       ├── generate_training_data.py
│       └── retrain_model.py
├── models/                  # Saved ML models (.h5 files)
├── data/                    # Training data (.pkl files)
├── preload_model.py         # Pre-download script
├── clear_tfhub_cache.py     # Cache cleaner
├── requirements.txt
├── .env
└── README.md
```

## 🧪 Testing

### Test Model Loading
```bash
python -c "from app.models.embeddings import embedding_model; print('✅ Model loaded')"
```

### Test MongoDB Connection
```bash
python -c "from app.config import settings; import pymongo; client = pymongo.MongoClient(settings.MONGODB_URI); print('✅ MongoDB connected')"
```

### Test Full Service
```bash
# Start service
python -m uvicorn app.main:app --reload

# In another terminal, test endpoint
curl http://localhost:8000/health
```

## 📚 Additional Resources

- **Troubleshooting Guide**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Phase 9 Documentation**: See [../PHASE_9_README.md](../PHASE_9_README.md)
- **TensorFlow Hub**: https://tfhub.dev/
- **Universal Sentence Encoder**: https://tfhub.dev/google/universal-sentence-encoder/4

## 🆘 Support

If you encounter issues not covered here:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Verify all prerequisites are installed
3. Check logs for detailed error messages
4. Ensure MongoDB is running and accessible
5. Try clearing cache and re-downloading model

Common commands:
```bash
# Clear cache
python clear_tfhub_cache.py

# Pre-download model
python preload_model.py

# Check Python version (need 3.8+)
python --version

# Check installed packages
pip list | grep -E "tensorflow|fastapi|uvicorn"

# Check MongoDB connection
mongosh "your_connection_string"
```

---

**Quick Start Summary:**
1. `pip install -r requirements.txt`
2. Create `.env` with MongoDB URI
3. `python preload_model.py` (one time, 2-5 min)
4. `python -m uvicorn app.main:app --reload`
5. Service runs on http://localhost:8000
