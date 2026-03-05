"""
Training script for multi-label tag classifier
Trains on existing posts from MongoDB
"""

import numpy as np
from pymongo import MongoClient
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MultiLabelBinarizer
from collections import Counter
import logging
import argparse
from datetime import datetime
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.tag_classifier import TagClassifier
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TagTrainingDataCollector:
    """Collect and prepare training data from MongoDB"""
    
    def __init__(self, mongodb_uri: str = None):
        """Initialize MongoDB connection"""
        uri = mongodb_uri or settings.MONGODB_URI
        self.client = MongoClient(uri)
        
        # Use correct database
        if '/test?' in uri or uri.endswith('/test'):
            self.db = self.client.test
        elif '/edunet?' in uri or uri.endswith('/edunet'):
            self.db = self.client.edunet
        else:
            self.db = self.client.test
        
        self.posts = self.db.posts
        logger.info("✅ Connected to MongoDB")
    
    def collect_training_data(
        self,
        min_posts_per_tag: int = 5,
        top_k_tags: int = 50
    ):
        """
        Collect training data from posts
        
        Args:
            min_posts_per_tag: Minimum posts required for a tag to be included
            top_k_tags: Number of most common tags to use
            
        Returns:
            Tuple of (texts, tags, tag_classes)
        """
        logger.info("Collecting training data from posts...")
        
        # Get all published posts with tags
        posts = list(self.posts.find({
            'status': 'published',
            'tags': {'$exists': True, '$not': {'$size': 0}}
        }))
        
        logger.info(f"Found {len(posts)} posts with tags")
        
        if len(posts) < 50:
            raise ValueError(f"Not enough posts for training. Need at least 50, found {len(posts)}")
        
        # Extract texts and tags
        texts = []
        all_tags = []
        
        for post in posts:
            # Combine title and content
            text = f"{post.get('title', '')} {post.get('content', '')}"
            texts.append(text)
            
            # Get tags (normalize to lowercase)
            post_tags = [tag.lower().strip() for tag in post.get('tags', [])]
            all_tags.append(post_tags)
        
        # Count tag frequencies
        tag_counter = Counter()
        for tags in all_tags:
            tag_counter.update(tags)
        
        logger.info(f"Total unique tags: {len(tag_counter)}")
        
        # Select top K most common tags
        top_tags = [tag for tag, count in tag_counter.most_common(top_k_tags)]
        logger.info(f"Selected top {len(top_tags)} tags")
        logger.info(f"Top 10 tags: {top_tags[:10]}")
        
        # Filter posts to only include those with at least one top tag
        filtered_texts = []
        filtered_tags = []
        
        for text, tags in zip(texts, all_tags):
            # Keep only top tags for this post
            post_top_tags = [tag for tag in tags if tag in top_tags]
            
            if post_top_tags:  # Only include if post has at least one top tag
                filtered_texts.append(text)
                filtered_tags.append(post_top_tags)
        
        logger.info(f"Filtered to {len(filtered_texts)} posts with top tags")
        
        return np.array(filtered_texts), filtered_tags, top_tags
    
    def close(self):
        """Close MongoDB connection"""
        self.client.close()
        logger.info("MongoDB connection closed")


def train_tag_classifier(
    top_k_tags: int = 50,
    epochs: int = 10,
    batch_size: int = 32,
    test_size: float = 0.2,
    validation_size: float = 0.1
):
    """
    Train the tag classifier
    
    Args:
        top_k_tags: Number of tags to classify
        epochs: Number of training epochs
        batch_size: Batch size for training
        test_size: Proportion of data for testing
        validation_size: Proportion of training data for validation
    """
    logger.info("="*60)
    logger.info("MULTI-LABEL TAG CLASSIFIER TRAINING")
    logger.info("="*60)
    logger.info("")
    
    # Step 1: Collect training data
    logger.info("📊 Step 1: Collecting training data...")
    collector = TagTrainingDataCollector()
    
    try:
        texts, tags, tag_classes = collector.collect_training_data(top_k_tags=top_k_tags)
    except Exception as e:
        logger.error(f"Error collecting data: {e}")
        collector.close()
        return
    
    logger.info(f"   Collected {len(texts)} training examples")
    logger.info(f"   Number of tag classes: {len(tag_classes)}")
    logger.info("")
    
    # Step 2: Prepare labels with MultiLabelBinarizer
    logger.info("🏷️  Step 2: Preparing labels...")
    
    mlb = MultiLabelBinarizer(classes=tag_classes)
    y_binary = mlb.fit_transform(tags)
    
    logger.info(f"   Label matrix shape: {y_binary.shape}")
    logger.info(f"   Average tags per post: {y_binary.sum(axis=1).mean():.2f}")
    logger.info("")
    
    # Step 3: Train/test split
    logger.info("✂️  Step 3: Splitting data...")
    
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        texts,
        y_binary,
        test_size=test_size,
        random_state=42
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val,
        y_train_val,
        test_size=validation_size,
        random_state=42
    )
    
    logger.info(f"   Training: {len(X_train)} samples")
    logger.info(f"   Validation: {len(X_val)} samples")
    logger.info(f"   Test: {len(X_test)} samples")
    logger.info("")
    
    # Step 4: Build model
    logger.info("🏗️  Step 4: Building model...")
    
    classifier = TagClassifier(num_tags=len(tag_classes))
    classifier.tag_classes = tag_classes
    classifier.build_model(trainable_encoder=False)
    classifier.compile_model(learning_rate=0.001)
    
    logger.info("")
    
    # Step 5: Train
    logger.info("🎯 Step 5: Training model...")
    logger.info("")
    
    history = classifier.train(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        epochs=epochs,
        batch_size=batch_size
    )
    
    logger.info("")
    
    # Step 6: Evaluate on test set
    logger.info("📊 Step 6: Evaluating on test set...")
    
    metrics = classifier.evaluate(X_test, y_test)
    
    logger.info("Test set metrics:")
    for metric, value in metrics.items():
        logger.info(f"   {metric}: {value:.4f}")
    
    logger.info("")
    
    # Step 7: Save model
    logger.info("💾 Step 7: Saving model...")
    
    # Create models directory if it doesn't exist
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join(models_dir, f'tag_classifier_{timestamp}.h5')
    classes_path = os.path.join(models_dir, f'tag_classes_{timestamp}.pkl')
    
    # Also save as latest
    latest_model_path = os.path.join(models_dir, 'tag_classifier.h5')
    latest_classes_path = os.path.join(models_dir, 'tag_classes.pkl')
    
    classifier.save(model_path, classes_path)
    classifier.save(latest_model_path, latest_classes_path)
    
    logger.info(f"   Saved to: {model_path}")
    logger.info(f"   Latest: {latest_model_path}")
    logger.info("")
    
    # Step 8: Test predictions
    logger.info("🧪 Step 8: Testing predictions...")
    
    # Test on a few examples
    test_texts = X_test[:3]
    test_labels = y_test[:3]
    
    for i, (text, labels) in enumerate(zip(test_texts, test_labels)):
        logger.info(f"\nExample {i+1}:")
        logger.info(f"   Text: {text[:100]}...")
        
        # True tags
        true_tags = [tag_classes[j] for j, val in enumerate(labels) if val == 1]
        logger.info(f"   True tags: {', '.join(true_tags)}")
        
        # Predicted tags
        suggestions = classifier.suggest_tags(text, threshold=0.3, top_k=5)
        pred_tags = [f"{s['tag']} ({s['confidence']:.2f})" for s in suggestions]
        logger.info(f"   Predicted: {', '.join(pred_tags)}")
    
    logger.info("")
    logger.info("="*60)
    logger.info("🎉 Training complete!")
    logger.info("="*60)
    logger.info("")
    logger.info("Next steps:")
    logger.info("1. Restart ML service to load new model")
    logger.info("2. Test with: POST /api/tags/suggest")
    logger.info("")
    
    collector.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train multi-label tag classifier')
    
    parser.add_argument('--top-k-tags', type=int, default=50,
                        help='Number of most common tags to use (default: 50)')
    parser.add_argument('--epochs', type=int, default=10,
                        help='Number of training epochs (default: 10)')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Batch size (default: 32)')
    parser.add_argument('--test-size', type=float, default=0.2,
                        help='Test set size (default: 0.2)')
    
    args = parser.parse_args()
    
    train_tag_classifier(
        top_k_tags=args.top_k_tags,
        epochs=args.epochs,
        batch_size=args.batch_size,
        test_size=args.test_size
    )
