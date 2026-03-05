"""
Pre-download Universal Sentence Encoder

This script downloads the Universal Sentence Encoder model (~1GB) with progress indication.
Run this BEFORE starting the ML service to avoid waiting during startup.

Usage: python ml-service/preload_model.py
"""

import os
import sys
import time
import tempfile
import tensorflow_hub as hub
from pathlib import Path

# Add parent directory to path to import settings
sys.path.insert(0, str(Path(__file__).parent))
from app.config import settings

def get_cache_size():
    """Get current cache directory size in MB"""
    cache_dir = os.path.join(tempfile.gettempdir(), 'tfhub_modules')
    if not os.path.exists(cache_dir):
        return 0
    
    total_size = 0
    for dirpath, _, filenames in os.walk(cache_dir):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            try:
                total_size += os.path.getsize(filepath)
            except:
                pass
    return total_size / (1024 * 1024)  # Convert to MB

def download_model():
    """Download the Universal Sentence Encoder with progress indication"""
    
    print('╔════════════════════════════════════════════════════════════╗')
    print('║       Universal Sentence Encoder - Pre-Download           ║')
    print('╚════════════════════════════════════════════════════════════╝')
    print()
    
    cache_dir = os.path.join(tempfile.gettempdir(), 'tfhub_modules')
    print(f"📂 Cache location: {cache_dir}")
    
    initial_size = get_cache_size()
    print(f"💾 Current cache size: {initial_size:.1f} MB")
    print()
    
    print("="*70)
    print("📥 DOWNLOADING MODEL")
    print("="*70)
    print(f"Model URL: {settings.EMBEDDING_MODEL_URL}")
    print("Expected size: ~950 MB")
    print("Estimated time: 2-5 minutes (depends on internet speed)")
    print()
    print("⚠️  IMPORTANT: Do NOT interrupt (Ctrl+C) during download!")
    print("   If interrupted, cache will be corrupted and must be cleared.")
    print("="*70)
    print()
    
    input("Press ENTER to start download (or Ctrl+C to cancel)...")
    print()
    
    print("⏳ Downloading...")
    print("   (This may appear frozen, but download is in progress)")
    print()
    
    start_time = time.time()
    
    try:
        # Load the model (downloads if not cached)
        model = hub.load(settings.EMBEDDING_MODEL_URL)
        
        elapsed = time.time() - start_time
        final_size = get_cache_size()
        downloaded = final_size - initial_size
        
        print()
        print("="*70)
        print("✅ DOWNLOAD COMPLETE!")
        print("="*70)
        print(f"⏱️  Time taken: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
        print(f"💾 Downloaded: {downloaded:.1f} MB")
        print(f"📦 Total cache size: {final_size:.1f} MB")
        print()
        print("🚀 You can now start the ML service:")
        print("   python -m uvicorn app.main:app --reload")
        print()
        print("✨ Startup will be FAST (model is cached)")
        print("="*70)
        print()
        
        # Test the model
        print("🧪 Testing model...")
        test_result = model(["test"])
        print(f"✅ Model test passed! Embedding shape: {test_result.shape}")
        print()
        
        return True
        
    except KeyboardInterrupt:
        print()
        print()
        print("="*70)
        print("❌ DOWNLOAD INTERRUPTED!")
        print("="*70)
        print("The cache is now incomplete/corrupted.")
        print()
        print("To fix this, run:")
        print("  python clear_tfhub_cache.py")
        print("  python preload_model.py")
        print("="*70)
        print()
        return False
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()
        print("Possible causes:")
        print("  1. No internet connection")
        print("  2. TensorFlow Hub is down/busy")
        print("  3. Firewall blocking download")
        print("  4. Insufficient disk space")
        print()
        print("Solutions:")
        print("  1. Check internet connection")
        print("  2. Try again later")
        print("  3. Check firewall settings")
        print(f"  4. Ensure at least 2GB free space in: {cache_dir}")
        print()
        return False

if __name__ == '__main__':
    success = download_model()
    sys.exit(0 if success else 1)
