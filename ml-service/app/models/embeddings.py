import tensorflow as tf
import tensorflow_hub as hub
# import tensorflow_text

import numpy as np
import os
import shutil
import tempfile
from app.config import settings

class EmbeddingModel:
    def __init__(self):
        print("\n" + "="*70)
        print("📥 DOWNLOADING UNIVERSAL SENTENCE ENCODER")
        print("="*70)
        print("First-time setup: Downloading ~1GB model from TensorFlow Hub")
        print("This will take 2-5 minutes depending on your internet connection.")
        print("Please wait... DO NOT interrupt (Ctrl+C) during download!")
        print("="*70 + "\n")
        
        cache_dir = os.path.join(tempfile.gettempdir(), 'tfhub_modules')
        print(f"📂 Cache location: {cache_dir}")
        
        if os.path.exists(cache_dir):
            cache_size = sum(
                os.path.getsize(os.path.join(dirpath, filename))
                for dirpath, _, filenames in os.walk(cache_dir)
                for filename in filenames
            ) / (1024 * 1024)  # Convert to MB
            print(f"💾 Current cache size: {cache_size:.1f} MB")
        
        print("\n⏳ Loading model (downloading if not cached)...")
        
        # Try to load the model, clear cache if corrupted
        max_retries = 2
        for attempt in range(max_retries):
            try:
                self.model = hub.load(settings.EMBEDDING_MODEL_URL)
                print("\n" + "="*70)
                print("✅ MODEL LOADED SUCCESSFULLY!")
                print("="*70)
                print("Subsequent startups will be fast (model is now cached)")
                print("="*70 + "\n")
                break
            except ValueError as e:
                if "contains neither 'saved_model.pb' nor 'saved_model.pbtxt'" in str(e):
                    print(f"\n⚠️  Corrupted cache detected (attempt {attempt + 1}/{max_retries})")
                    
                    if attempt < max_retries - 1:
                        print("🧹 Clearing TensorFlow Hub cache...")
                        self._clear_cache()
                        print("🔄 Retrying model download...\n")
                    else:
                        print("\n❌ Failed to load model after clearing cache")
                        print("Please run: python clear_tfhub_cache.py")
                        raise
                else:
                    raise
            except KeyboardInterrupt:
                print("\n\n❌ DOWNLOAD INTERRUPTED!")
                print("="*70)
                print("⚠️  Model download was interrupted.")
                print("The cache is now incomplete/corrupted.")
                print("\nTo fix this, run:")
                print("  python clear_tfhub_cache.py")
                print("Then restart the service.")
                print("="*70 + "\n")
                raise
            except Exception as e:
                print(f"\n❌ Error loading model: {e}")
                print("\nIf download issues persist:")
                print("1. Check internet connection")
                print("2. Try again later (TensorFlow Hub might be busy)")
                print("3. Check firewall settings")
                raise
    
    def _clear_cache(self):
        """Clear TensorFlow Hub cache directory"""
        cache_dir = os.path.join(tempfile.gettempdir(), 'tfhub_modules')
        if os.path.exists(cache_dir):
            try:
                shutil.rmtree(cache_dir)
                print(f"✅ Cache cleared: {cache_dir}")
            except Exception as e:
                print(f"⚠️  Could not clear cache automatically: {e}")
                print(f"   Please manually delete: {cache_dir}")

    def encode(self, test:list)-> np.ndarray:
        embeddings=self.model(test)
        return embeddings.numpy()
    
    def encode_single(self, text:str)->list:
        embedding=self.model([text])[0]
        return embedding.numpy().tolist()

embedding_model=EmbeddingModel()