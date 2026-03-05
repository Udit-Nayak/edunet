# ML Service Troubleshooting

## 🐌 Slow Startup / Model Download Issues

### Problem: First Startup Takes 2-5 Minutes

This is **NORMAL** on first startup. The Universal Sentence Encoder (~1GB) must be downloaded from TensorFlow Hub.

### ✅ Recommended Solution: Pre-Download the Model

Instead of waiting during service startup, pre-download the model:

```bash
cd ml-service
python preload_model.py
```

This script:
- Shows download progress and time estimates
- Tests the model after download
- Confirms everything is working
- Makes subsequent startups FAST (5-10 seconds)

### ⚠️ IMPORTANT: Never Interrupt the Download!

If you press Ctrl+C during download:
1. Cache becomes corrupted
2. Service won't start
3. You must clear cache and re-download

**Be patient!** The download is working even if it looks frozen.

---

## Error: "contains neither 'saved_model.pb' nor 'saved_model.pbtxt'"

### Problem
TensorFlow Hub cache is corrupted. This happens when the Universal Sentence Encoder download was interrupted.

### Quick Fix (Choose One)

#### Option 1: Run Cache Cleaner Script
```bash
cd ml-service
python clear_tfhub_cache.py
python -m uvicorn app.main:app --reload
```

#### Option 2: Manual Cache Deletion (Windows)
```bash
# Delete the cache folder
rmdir /s /q "%TEMP%\tfhub_modules"

# Restart ML service
python -m uvicorn app.main:app --reload
```

#### Option 3: Manual Cache Deletion (Linux/Mac)
```bash
# Delete the cache folder
rm -rf /tmp/tfhub_modules

# Restart ML service
python -m uvicorn app.main:app --reload
```

### What Happens Next?

1. The Universal Sentence Encoder (~1GB) will be downloaded again
2. Download takes 2-5 minutes depending on internet speed
3. Model will be cached in: `%TEMP%\tfhub_modules` (Windows) or `/tmp/tfhub_modules` (Linux/Mac)
4. Subsequent starts will be fast (uses cached model)

### Prevention

The code now includes automatic retry with cache clearing:
- If corrupted cache is detected, it's automatically cleared
- Model download is retried once
- If it fails again, you'll see a clear error message

### Alternative: Use Local Model (Faster Startup)

If you experience frequent cache issues or slow downloads, you can use a local model:

1. Download the model once:
```bash
cd ml-service/models
wget https://tfhub.dev/google/universal-sentence-encoder/4?tf-hub-format=compressed
tar -xvzf 4?tf-hub-format=compressed
```

2. Update `config.py`:
```python
EMBEDDING_MODEL_URL = "./models/universal-sentence-encoder_4"
```

### Still Having Issues?

Check these:

1. **Internet Connection**: Model download requires stable internet
2. **Disk Space**: Ensure you have at least 2GB free space
3. **Permissions**: Check write permissions to temp directory
4. **Firewall**: Ensure TensorFlow Hub URLs are not blocked

#### Check Disk Space (Windows)
```bash
dir "%TEMP%"
```

#### Check Disk Space (Linux/Mac)
```bash
df -h /tmp
```

### Other Common Errors

#### ImportError: No module named 'tensorflow'
```bash
pip install -r requirements.txt
```

#### ImportError: No module named 'tensorflow_hub'
```bash
pip install tensorflow-hub
```

#### CUDA/GPU Errors
TensorFlow CPU version is fine for this service. GPU is optional.

### Performance Notes

- **First Startup**: 2-5 minutes (downloads model)
- **Subsequent Startups**: 5-10 seconds (uses cache)
- **Model Size**: ~1GB (Universal Sentence Encoder v4)
- **Memory Usage**: ~1.5GB RAM when loaded

### Contact

If none of these solutions work, check:
- TensorFlow version: `pip show tensorflow`
- TensorFlow Hub version: `pip show tensorflow-hub`
- Python version: `python --version` (should be 3.8+)
