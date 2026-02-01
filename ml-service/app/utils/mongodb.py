from pymongo import MongoClient
from app.config import settings

class MongoDB:
    def __init__(self):
        self.client=MongoClient(settings.MONGODB_URI)
        self.db=self.client.get_database()
        self.posts=self.db['training_posts']

    def get_post_by_id(self, post_id:int):
        return self.posts.find_one({"post_id":post_id})
    
    def find_similar_posts(self, embedding:list, limit:int=10):
        posts = list(self.posts.find(
            {'embedding': {'$ne': None}},
            {'post_id': 1, 'title': 1, 'tags': 1, 'score': 1, 'embedding': 1}
        ))

        import numpy as np

        similarities=[]
        query_emb=np.array(embedding)
        for post in posts:
            post_emb=np.array(post['embedding'])

            similarity=np.dot(query_emb, post_emb)
            similarities.append((post, similarity))

        similarities.sort(key=lambda x: x[1], reverse=True)
        return [
            {
                'post_id': post['post_id'],
                'title': post['title'],
                'tags': post['tags'],
                'score': post['score'],
                'similarity': float(sim)
            }
            for posr, sim in similarities[:limit]
        ]
mongodb=MongoDB()