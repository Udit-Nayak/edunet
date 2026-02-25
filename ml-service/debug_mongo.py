"""
Test script to debug MongoDB connection and queries
Run this to see what the Python data collector actually finds
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI')

print("🔍 PYTHON MONGODB DEBUG")
print("=" * 60)
print()

# Connect
client = MongoClient(MONGODB_URI)

# Use the database name from connection string
if '/test?' in MONGODB_URI or MONGODB_URI.endswith('/test'):
    db = client.test
    print(f"📦 Using database: test")
elif '/edunet?' in MONGODB_URI or MONGODB_URI.endswith('/edunet'):
    db = client.edunet
    print(f"📦 Using database: edunet")
else:
    db = client.test
    print(f"📦 Using database: test (default)")

print()

users = db.users
posts = db.posts
interactions = db.interactions

# Check users
print("👥 USERS:")
total_users = users.count_documents({})
users_with_embeddings = users.count_documents({
    'mlProfile.embedding': {'$exists': True, '$ne': None}
})
print(f"   Total: {total_users}")
print(f"   With mlProfile.embedding: {users_with_embeddings}")

# Sample user
sample_user = users.find_one({
    'mlProfile.embedding': {'$exists': True, '$ne': None}
})

if sample_user:
    print(f"   Sample user: {sample_user.get('username')}")
    print(f"   - Has mlProfile: {bool(sample_user.get('mlProfile'))}")
    if sample_user.get('mlProfile'):
        embedding = sample_user['mlProfile'].get('embedding')
        print(f"   - Embedding: {type(embedding)} length={len(embedding) if embedding else 0}")
    print(f"   - _id: {sample_user['_id']}")

print()

# Check posts
print("📄 POSTS:")
total_posts = posts.count_documents({})
posts_with_embeddings = posts.count_documents({
    'mlMetadata.embedding': {'$exists': True, '$ne': None}
})
print(f"   Total: {total_posts}")
print(f"   With mlMetadata.embedding: {posts_with_embeddings}")

print()

# Check interactions
print("🔗 INTERACTIONS:")
total_interactions = interactions.count_documents({})
positive_interactions = interactions.count_documents({'label': 1})
negative_interactions = interactions.count_documents({'label': 0})

print(f"   Total: {total_interactions}")
print(f"   Positive (label=1): {positive_interactions}")
print(f"   Negative (label=0): {negative_interactions}")

# Sample interaction
sample_int = interactions.find_one({})
if sample_int:
    print(f"   Sample interaction:")
    print(f"   - userId: {sample_int.get('userId')} (type: {type(sample_int.get('userId'))})")
    print(f"   - postId: {sample_int.get('postId')} (type: {type(sample_int.get('postId'))})")
    print(f"   - action: {sample_int.get('action')}")
    print(f"   - label: {sample_int.get('label')}")

print()

# Now test the actual query from data collector
print("🐍 SIMULATING DATA COLLECTOR QUERIES:")
print()

# Query for users (what the collector does)
active_users = list(users.find({
    'mlProfile.embedding': {'$exists': True, '$ne': None}
}))

print(f"✅ Found {len(active_users)} active users")

if len(active_users) > 0:
    user = active_users[0]
    print(f"   Testing with user: {user.get('username')}")
    print(f"   User _id: {user['_id']}")
    
    # Query for positive interactions (what the collector does)
    positive_ints = list(interactions.find({
        'userId': user['_id'],
        'action': {'$in': ['upvote', 'save', 'comment', 'answer']},
        'label': 1
    }))
    
    print(f"   Positive interactions for this user: {len(positive_ints)}")
    
    if len(positive_ints) > 0:
        print(f"   Sample positive interaction:")
        print(f"   - postId: {positive_ints[0].get('postId')}")
        print(f"   - action: {positive_ints[0].get('action')}")
        
        # Get the post IDs
        positive_post_ids = list(set([i['postId'] for i in positive_ints]))
        print(f"   Unique positive posts: {len(positive_post_ids)}")
        
        # Query for posts with embeddings
        posts_with_emb = list(posts.find({
            '_id': {'$in': positive_post_ids},
            'mlMetadata.embedding': {'$exists': True, '$ne': None}
        }))
        
        print(f"   Posts found with embeddings: {len(posts_with_emb)}")
    
    # Query for negative interactions
    negative_ints = list(interactions.find({
        'userId': user['_id'],
        'action': 'view',
        'label': 0
    }))
    
    print(f"   Negative interactions for this user: {len(negative_ints)}")

print()

# Calculate total training examples
print("📊 TOTAL TRAINING EXAMPLES ESTIMATE:")
total_examples = 0

for user in active_users[:10]:  # Test first 10 users
    positive_ints = list(interactions.find({
        'userId': user['_id'],
        'action': {'$in': ['upvote', 'save', 'comment', 'answer']},
        'label': 1
    }))
    
    positive_post_ids = list(set([i['postId'] for i in positive_ints]))
    
    posts_found = posts.count_documents({
        '_id': {'$in': positive_post_ids},
        'mlMetadata.embedding': {'$exists': True, '$ne': None}
    })
    
    negative_ints = list(interactions.find({
        'userId': user['_id'],
        'action': 'view',
        'label': 0
    }))
    
    negative_post_ids = list(set([i['postId'] for i in negative_ints]))[:int(posts_found * 2)]
    
    negative_posts_found = posts.count_documents({
        '_id': {'$in': negative_post_ids},
        'mlMetadata.embedding': {'$exists': True, '$ne': None}
    })
    
    user_total = posts_found + negative_posts_found
    total_examples += user_total
    
    if user_total > 0:
        print(f"   User {user.get('username')}: {posts_found} positive + {negative_posts_found} negative = {user_total}")

print()
print(f"📈 TOTAL TRAINING EXAMPLES: {total_examples}")

if total_examples >= 100:
    print("✅ ENOUGH DATA FOR TRAINING!")
else:
    print(f"❌ NOT ENOUGH DATA (need 100, have {total_examples})")

print()
print("=" * 60)

client.close()
