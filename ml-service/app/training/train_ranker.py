"""
Train Neural Ranking Model
Run with: python -m app.training.train_ranker
"""

import os
import sys
import logging
from datetime import datetime
import numpy as np
from sklearn.utils import shuffle

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.ranker import NeuralRanker
from app.training.data_collector import TrainingDataCollector
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def train_ranking_model(
    days: int = 30,
    min_interactions: int = 3,
    negative_ratio: float = 2.0,
    epochs: int = 15,
    batch_size: int = 64,
    validation_split: float = 0.2,
    learning_rate: float = 0.001
):
    """
    Train the neural ranking model
    
    Args:
        days: Days of historical data to use
        min_interactions: Minimum interactions per user
        negative_ratio: Ratio of negative to positive examples
        epochs: Training epochs
        batch_size: Batch size
        validation_split: Validation split
        learning_rate: Learning rate
    """
    logger.info("=" * 60)
    logger.info("NEURAL RANKING MODEL TRAINING")
    logger.info("=" * 60)
    
    # Step 1: Collect training data
    logger.info("\n📊 Step 1: Collecting training data...")
    collector = TrainingDataCollector()
    
    # Get statistics
    stats = collector.get_data_statistics()
    logger.info(f"Data statistics:")
    logger.info(f"  Users with embeddings: {stats['total_users_with_embeddings']}")
    logger.info(f"  Users with interactions: {stats['users_with_interactions']}")
    logger.info(f"  Posts with embeddings: {stats['posts_with_embeddings']}")
    logger.info(f"  Total interactions: {stats['total_interactions']}")
    
    # Collect data
    user_vectors, post_vectors, features, labels = collector.collect_training_data(
        days=days,
        min_interactions=min_interactions,
        negative_ratio=negative_ratio
    )
    
    collector.close()
    
    if len(labels) < 100:
        logger.error("❌ Not enough training data. Need at least 100 examples.")
        logger.error("   Make sure users have interactions and posts have embeddings.")
        return False
    
    logger.info(f"✅ Collected {len(labels)} training examples")
    logger.info(f"   Positive examples: {np.sum(labels)}")
    logger.info(f"   Negative examples: {len(labels) - np.sum(labels)}")
    logger.info(f"   Class balance: {np.mean(labels):.2%} positive")
    
    # Step 2: Shuffle data
    logger.info("\n🔀 Step 2: Shuffling data...")
    user_vectors, post_vectors, features, labels = shuffle(
        user_vectors, post_vectors, features, labels,
        random_state=42
    )
    
    # Step 3: Build and compile model
    logger.info("\n🏗️  Step 3: Building model...")
    ranker = NeuralRanker()
    ranker.compile_model(learning_rate=learning_rate)
    
    logger.info("\nModel Architecture:")
    logger.info(ranker.get_summary())
    
    # Step 4: Train model
    logger.info("\n🚀 Step 4: Training model...")
    logger.info(f"Configuration:")
    logger.info(f"  Epochs: {epochs}")
    logger.info(f"  Batch size: {batch_size}")
    logger.info(f"  Validation split: {validation_split}")
    logger.info(f"  Learning rate: {learning_rate}")
    
    history = ranker.train(
        user_vectors=user_vectors,
        post_vectors=post_vectors,
        features=features,
        labels=labels,
        validation_split=validation_split,
        epochs=epochs,
        batch_size=batch_size
    )
    
    # Step 5: Evaluate model
    logger.info("\n📈 Step 5: Evaluating model...")
    
    # Final metrics
    final_metrics = {
        'train_loss': history.history['loss'][-1],
        'train_accuracy': history.history['accuracy'][-1],
        'train_auc': history.history['auc'][-1],
        'val_loss': history.history['val_loss'][-1],
        'val_accuracy': history.history['val_accuracy'][-1],
        'val_auc': history.history['val_auc'][-1],
    }
    
    logger.info("Final Training Metrics:")
    for metric, value in final_metrics.items():
        logger.info(f"  {metric}: {value:.4f}")
    
    # Step 6: Save model
    logger.info("\n💾 Step 6: Saving model...")
    
    # Create models directory if it doesn't exist
    models_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'models'
    )
    os.makedirs(models_dir, exist_ok=True)
    
    # Save with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(models_dir, f'ranking_model_{timestamp}.h5')
    ranker.save_model(model_path)
    
    # Also save as latest
    latest_path = os.path.join(models_dir, 'ranking_model.h5')
    ranker.save_model(latest_path)
    
    logger.info(f"✅ Model saved to:")
    logger.info(f"   {model_path}")
    logger.info(f"   {latest_path}")
    
    # Step 7: Test predictions
    logger.info("\n🧪 Step 7: Testing predictions...")
    
    # Test on a few examples
    test_indices = np.random.choice(len(labels), size=min(5, len(labels)), replace=False)
    
    for idx in test_indices:
        user_vec = user_vectors[idx:idx+1]
        post_vec = post_vectors[idx:idx+1]
        feat = features[idx:idx+1]
        true_label = labels[idx]
        
        pred_score = ranker.predict(user_vec, post_vec, feat)[0]
        
        logger.info(f"  Example {idx}: True={int(true_label)}, Predicted={pred_score:.4f}")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ TRAINING COMPLETED SUCCESSFULLY!")
    logger.info("=" * 60)
    
    return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Neural Ranking Model')
    parser.add_argument('--days', type=int, default=30, help='Days of data to use')
    parser.add_argument('--epochs', type=int, default=15, help='Training epochs')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--negative-ratio', type=float, default=2.0, help='Negative/positive ratio')
    
    args = parser.parse_args()
    
    success = train_ranking_model(
        days=args.days,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        negative_ratio=args.negative_ratio
    )
    
    sys.exit(0 if success else 1)
