"""
TensorFlow Hub Cache Cleaner

This script clears corrupted TensorFlow Hub model caches.
Run this if you encounter "contains neither 'saved_model.pb' nor 'saved_model.pbtxt'" errors.

Usage: python ml-service/clear_tfhub_cache.py
"""

import os
import shutil
import tempfile

def clear_tfhub_cache():
    """Clear TensorFlow Hub cache directory"""
    
    # Default TensorFlow Hub cache location
    cache_dir = os.path.join(tempfile.gettempdir(), 'tfhub_modules')
    
    print(f"🔍 Checking TensorFlow Hub cache: {cache_dir}")
    
    if os.path.exists(cache_dir):
        print(f"📂 Found cache directory")
        
        # List cached models
        cached_models = os.listdir(cache_dir)
        print(f"   Cached models: {len(cached_models)}")
        
        # Clear cache
        try:
            shutil.rmtree(cache_dir)
            print(f"✅ Cache cleared successfully")
            print(f"   The model will be re-downloaded on next startup")
            return True
        except Exception as e:
            print(f"❌ Error clearing cache: {e}")
            print(f"   Please manually delete: {cache_dir}")
            return False
    else:
        print(f"ℹ️  No cache directory found (this is OK)")
        return True

if __name__ == '__main__':
    print('╔════════════════════════════════════════════════════════════╗')
    print('║       TensorFlow Hub Cache Cleaner                        ║')
    print('╚════════════════════════════════════════════════════════════╝')
    print()
    
    success = clear_tfhub_cache()
    
    if success:
        print()
        print('🚀 Next steps:')
        print('   1. Restart the ML service:')
        print('      python -m uvicorn app.main:app --reload')
        print('   2. The Universal Sentence Encoder will be downloaded again')
        print('   3. This may take 2-3 minutes depending on your connection')
    
    print()
