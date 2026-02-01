from app.models.embeddings import embedding_model
from app.utils.mongodb import mongodb
from typing import List, Dict

class RecommendationService:
    def get_similar_posts(self, post_id:int, limit:int=10)-> List[Dict]:
        post=mongodb.get_post_by_id(post_id)
        if not post or not post.get('embedding'):
            return []

        similar =mongodb.find_similar_posts(
            post['embedding'],
            limit=limit+1
        )

        similar =[p for p in similar if p['post_id']!= post_id]
        return similar[:limit]
    
    def search_by_text(self, query:str, limit:int=10)-> List[Dict]:
        embedding=embedding_model.encode_single(query)
        similar =mongodb.find_similar_posts(
            embedding,
            limit=limit
        )
        return similar
    
    def get_recommendations_for_user(self, user_id:str, user_tags:List[str],limit:int=10)->List[Dict]:

        posts=list(mongodb.posts.find(
            {
                'tags': {'$in': user_tags}},
                {'post_id':1, 'title':1, 'tags':1, 'score':1}).sort('score', -1).limit(limit))
            
        return posts
    

recommendation_service=RecommendationService()