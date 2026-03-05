import argparse
import sys
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
import numpy as np
import pickle
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.config import settings

"""
Phase 9: Training Data Generation
Extracts interaction events from MongoDB and creates training examples
"""

class TrainingDataGenerator:
    def __init__(self):
        self.client = MongoClient(settings.MONGODB_URI)
        self.db = self.client[settings.DB_NAME]
        self.interaction_collection = self.db['interactionevents']
        
    def generate_training_data(self, days=7, output_dir='./data/training'):
        """
        Generate training examples from interaction events
        
        Args:
            days: Number of days to look back
            output_dir: Directory to save training data
        """
        print(f"🔄 Generating training data from last {days} days...")
        
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Query processed interaction events with labels
        query = {
            'timestamp': {'$gte': cutoff_date},
            'trainingLabel': {'$in': [0, 1]},
            'processed': True,
            'usedForTraining': False,
            'userSnapshot.embedding.0': {'$exists': True},
            'postSnapshot.embedding.0': {'$exists': True}
        }
        
        events = list(self.interaction_collection.find(query).sort('timestamp', 1))
        
        print(f"📊 Found {len(events)} training examples")
        
        if len(events) == 0:
            print("⚠️  No training examples found")
            return None
        
        # Extract features and labels
        user_embeddings = []
        post_embeddings = []
        user_features = []
        post_features = []
        labels = []
        event_ids = []
        contexts = []
        
        for event in events:
            # User embedding
            user_emb = event['userSnapshot']['embedding']
            if len(user_emb) == 0:
                continue
                
            # Post embedding
            post_emb = event['postSnapshot']['embedding']
            if len(post_emb) == 0:
                continue
                
            user_embeddings.append(user_emb)
            post_embeddings.append(post_emb)
            
            # Additional user features
            user_features.append([
                event['userSnapshot'].get('reputation', 0),
                event['userSnapshot'].get('postCount', 0),
                len(event['userSnapshot'].get('interests', []))
            ])
            
            # Additional post features
            post_age_hours = (datetime.now() - event['postSnapshot'].get('createdAt', datetime.now())).total_seconds() / 3600
            post_features.append([
                event['postSnapshot'].get('upvotes', 0),
                event['postSnapshot'].get('viewCount', 0),
                len(event['postSnapshot'].get('tags', [])),
                post_age_hours
            ])
            
            # Label
            labels.append(event['trainingLabel'])
            
            # Event ID for marking as used
            event_ids.append(event['_id'])
            
            # Context
            contexts.append({
                'eventType': event['eventType'],
                'source': event.get('context', {}).get('source', 'unknown'),
                'position': event.get('context', {}).get('position'),
                'readTime': event.get('readTime', 0)
            })
        
        # Convert to numpy arrays
        user_embeddings = np.array(user_embeddings, dtype=np.float32)
        post_embeddings = np.array(post_embeddings, dtype=np.float32)
        user_features = np.array(user_features, dtype=np.float32)
        post_features = np.array(post_features, dtype=np.float32)
        labels = np.array(labels, dtype=np.int32)
        
        print(f"\n📈 Training Data Statistics:")
        print(f"   Total examples: {len(labels)}")
        print(f"   Positive examples: {np.sum(labels == 1)} ({np.mean(labels) * 100:.1f}%)")
        print(f"   Negative examples: {np.sum(labels == 0)} ({(1 - np.mean(labels)) * 100:.1f}%)")
        print(f"   User embedding dim: {user_embeddings.shape[1]}")
        print(f"   Post embedding dim: {post_embeddings.shape[1]}")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate batch ID
        batch_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save training data
        training_data = {
            'user_embeddings': user_embeddings,
            'post_embeddings': post_embeddings,
            'user_features': user_features,
            'post_features': post_features,
            'labels': labels,
            'event_ids': event_ids,
            'contexts': contexts,
            'batch_id': batch_id,
            'generated_at': datetime.now().isoformat(),
            'days': days,
            'num_examples': len(labels)
        }
        
        # Save as pickle
        output_file = os.path.join(output_dir, f'training_data_{batch_id}.pkl')
        with open(output_file, 'wb') as f:
            pickle.dump(training_data, f)
        
        print(f"\n✅ Training data saved to: {output_file}")
        
        # Save summary as text
        summary_file = os.path.join(output_dir, f'training_data_{batch_id}_summary.txt')
        with open(summary_file, 'w') as f:
            f.write(f"Training Data Summary\n")
            f.write(f"=====================\n\n")
            f.write(f"Batch ID: {batch_id}\n")
            f.write(f"Generated: {datetime.now()}\n")
            f.write(f"Days lookback: {days}\n\n")
            f.write(f"Total examples: {len(labels)}\n")
            f.write(f"Positive examples: {np.sum(labels == 1)} ({np.mean(labels) * 100:.1f}%)\n")
            f.write(f"Negative examples: {np.sum(labels == 0)} ({(1 - np.mean(labels)) * 100:.1f}%)\n\n")
            f.write(f"User embedding dim: {user_embeddings.shape[1]}\n")
            f.write(f"Post embedding dim: {post_embeddings.shape[1]}\n")
            f.write(f"User features: reputation, postCount, numInterests\n")
            f.write(f"Post features: upvotes, viewCount, numTags, ageHours\n\n")
            
            # Event type distribution
            event_types = {}
            for ctx in contexts:
                et = ctx['eventType']
                event_types[et] = event_types.get(et, 0) + 1
            
            f.write(f"Event Type Distribution:\n")
            for et, count in sorted(event_types.items(), key=lambda x: x[1], reverse=True):
                f.write(f"   {et}: {count} ({count/len(labels)*100:.1f}%)\n")
        
        return {
            'batch_id': batch_id,
            'output_file': output_file,
            'num_examples': len(labels),
            'positive_ratio': float(np.mean(labels)),
            'event_ids': event_ids
        }
    
    def mark_events_as_used(self, event_ids, batch_id):
        """Mark events as used for training"""
        result = self.interaction_collection.update_many(
            {'_id': {'$in': event_ids}},
            {
                '$set': {
                    'usedForTraining': True,
                    'trainingBatch': batch_id
                }
            }
        )
        
        print(f"✅ Marked {result.modified_count} events as used for training")
        return result.modified_count
    
    def close(self):
        self.client.close()


def main():
    parser = argparse.ArgumentParser(description='Generate training data from interaction events')
    parser.add_argument('--days', type=int, default=7, help='Number of days to look back')
    parser.add_argument('--output-dir', type=str, default='./data/training', help='Output directory')
    parser.add_argument('--mark-used', action='store_true', help='Mark events as used for training')
    
    args = parser.parse_args()
    
    generator = TrainingDataGenerator()
    
    try:
        result = generator.generate_training_data(
            days=args.days,
            output_dir=args.output_dir
        )
        
        if result and args.mark_used:
            generator.mark_events_as_used(result['event_ids'], result['batch_id'])
        
    finally:
        generator.close()


if __name__ == '__main__':
    main()
