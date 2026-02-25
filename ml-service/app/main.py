from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.services.recommendation import RecommendationService
from app.config import settings
from bson.objectid import ObjectId
from fastapi.encoders import jsonable_encoder
from app.models.embeddings import embedding_model
import logging
from app.services.embedding import EmbeddingService
from app.services.ranking import get_ranking_service

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app=FastAPI(
    title="Edunet ML Service",
    version="1.0.0",
    description="Machine Learning Service for Edunet Platform"
)

#CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
embedding_service = EmbeddingService()
recommendation_service = RecommendationService()
ranking_service = get_ranking_service(use_neural=True)


class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: List[float]

class BatchEmbeddingRequest(BaseModel):
    texts: List[str]

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    count: int

class SimilarPostsRequest(BaseModel):
    post_id: str
    limit: int = 10

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class PersonalizedFeedRequest(BaseModel):
    user_id: str
    user_tags: List[str]
    limit: int = 20

class UserVectorRequest(BaseModel):
    viewed_posts: List[dict]
    upvoted_posts: List[dict]
    saved_posts: List[dict]

class UserVectorResponse(BaseModel):
    vector: List[float]

class UpdateUserVectorRequest(BaseModel):
    current_vector: List[float]
    new_post_embedding: List[float]
    interaction_weight: float

class ColdStartFromPostsRequest(BaseModel):
    top_posts_embeddings: List[List[float]]

class ColdStartFromTagsRequest(BaseModel):
    interest_tags: List[str]

class NeuralRankRequest(BaseModel):
    user_vector: List[float]
    user_interests: List[str]
    candidate_posts: List[dict]
    limit: int = 20

class RankingStatusResponse(BaseModel):
    neural_ranker_available: bool
    ranking_method: str


@app.post("/api/embeddings/generate")
def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        embedding = embedding_model.encode_single(request.text)

        if not isinstance(embedding, list) or len(embedding) != 512:
            raise HTTPException(
                status_code=500, 
                detail=f"Invalid embedding dimensions: {len(embedding)}"
            )
        return {
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": "universal-sentence-encoder-v4"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Embedding generation failed: {str(e)}")

#Routes
@app.get("/")
async def root():
    return {
        "service": "EduConnect ML Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():

    """Health check endpoint"""
    try:
        test_embedding = embedding_service.generate_embedding("test")
        
        return {
            "status": "healthy",
            "model_loaded": True,
            "embedding_dim": len(test_embedding)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/api/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """
    Generate embedding for a single text
    
    Example:
    POST /api/embeddings/generate
    {
        "text": "How to use React hooks with TypeScript?"
    }
    """
    try:
        if not request.text or len(request.text.strip()) < 3:
            raise HTTPException(status_code=400, detail="Text too short")
        
        embedding = embedding_service.generate_embedding(request.text)
        
        return {
            "embedding": embedding
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embeddings/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """
    Generate embeddings for multiple texts in batch
    More efficient than calling /generate multiple times
    
    Example:
    POST /api/embeddings/batch
    {
        "texts": [
            "First post content",
            "Second post content"
        ]
    }
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 texts per batch")
        
        embeddings = embedding_service.generate_batch_embeddings(request.texts)
        
        return {
            "embeddings": embeddings,
            "count": len(embeddings)
        }
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend/similar")
async def get_similar_posts(request:SimilarPostsRequest):
    try:
        results=recommendation_service.get_similar_posts(
            request.post_id,
            request.limit
        )
        return {"posts":results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend/search")
async def semantic_search(request: SearchRequest):
    """
    Semantic search using query embedding
    """
    try:
        query_embedding = embedding_service.generate_embedding(request.query)
        results = await recommendation_service.search_posts(
            query_embedding,
            request.limit
        )
        
        return {
            "posts": results,
            "count": len(results)
        }
    except Exception as e:
        logger.error(f"Semantic search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    try:
        results=recommendation_service.search_by_text(
            request.query,
            request.limit
        )
        return {"posts":results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend/feed")
async def personalized_feed(request: PersonalizedFeedRequest):
    """
    Get personalized feed for user
    """
    try:
        posts = await recommendation_service.get_personalized_feed(
            request.user_id,
            request.user_tags,
            request.limit
        )
        
        return {
            "posts": posts,
            "count": len(posts)
        }
    except Exception as e:
        logger.error(f"Personalized feed failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/compute-vector", response_model=UserVectorResponse)
async def compute_user_vector(request: UserVectorRequest):
    """
    Compute user interest vector from interaction history
    
    Example:
    POST /api/user/compute-vector
    {
        "viewed_posts": [
            {"embedding": [...], "timestamp": "2024-01-01"}
        ],
        "upvoted_posts": [...],
        "saved_posts": [...]
    }
    """
    try:
        user_vector = embedding_service.compute_user_vector(
            viewed_posts=request.viewed_posts,
            upvoted_posts=request.upvoted_posts,
            saved_posts=request.saved_posts
        )
        
        return {
            "vector": user_vector
        }
    except Exception as e:
        logger.error(f"User vector computation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/update-vector", response_model=UserVectorResponse)
async def update_user_vector(request: UpdateUserVectorRequest):
    """
    Update user vector with new interaction (online learning)
    
    Example:
    POST /api/user/update-vector
    {
        "current_vector": [...],
        "new_post_embedding": [...],
        "interaction_weight": 0.7
    }
    """
    try:
        updated_vector = embedding_service.update_user_vector_online(
            current_vector=request.current_vector,
            new_post_embedding=request.new_post_embedding,
            interaction_weight=request.interaction_weight
        )
        
        return {
            "vector": updated_vector
        }
    except Exception as e:
        logger.error(f"User vector update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/cold-start-from-posts", response_model=UserVectorResponse)
async def cold_start_from_posts(request: ColdStartFromPostsRequest):
    """
    Generate cold start vector from top posts in user's interest tags
    More accurate than just using tag text
    
    Example:
    POST /api/user/cold-start-from-posts
    {
        "top_posts_embeddings": [[...], [...], [...]]
    }
    """
    try:
        cold_start_vector = embedding_service.compute_cold_start_from_posts(
            top_posts_embeddings=request.top_posts_embeddings
        )
        
        return {
            "vector": cold_start_vector
        }
    except Exception as e:
        logger.error(f"Cold start from posts failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/cold-start-from-tags", response_model=UserVectorResponse)
async def cold_start_from_tags(request: ColdStartFromTagsRequest):
    """
    Generate cold start vector from interest tags (fallback method)
    Used when no posts are available in selected tags
    
    Example:
    POST /api/user/cold-start-from-tags
    {
        "interest_tags": ["javascript", "react", "nodejs"]
    }
    """
    try:
        cold_start_vector = embedding_service.get_cold_start_vector(
            interest_tags=request.interest_tags
        )
        
        return {
            "vector": cold_start_vector
        }
    except Exception as e:
        logger.error(f"Cold start from tags failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ranking/neural-rank")
async def neural_rank_posts(request: NeuralRankRequest):
    """
    Rank posts using neural ranking model
    
    Example:
    POST /api/ranking/neural-rank
    {
        "user_vector": [...],
        "user_interests": ["javascript", "react"],
        "candidate_posts": [...],
        "limit": 20
    }
    """
    try:
        ranked_posts = ranking_service.rank_posts_for_user(
            user_vector=request.user_vector,
            user_interests=request.user_interests,
            candidate_posts=request.candidate_posts,
            limit=request.limit
        )
        
        return {
            "posts": ranked_posts,
            "count": len(ranked_posts),
            "ranking_method": "neural" if ranking_service.is_neural_ranker_available() else "rule_based"
        }
    except Exception as e:
        logger.error(f"Neural ranking failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ranking/status", response_model=RankingStatusResponse)
async def get_ranking_status():
    """
    Get status of ranking service
    
    Returns information about whether neural ranker is available
    """
    is_available = ranking_service.is_neural_ranker_available()
    
    return {
        "neural_ranker_available": is_available,
        "ranking_method": "neural" if is_available else "rule_based"
    }

@app.post("/api/ranking/switch-method")
async def switch_ranking_method(use_neural: bool = True):
    """
    Switch between neural and rule-based ranking
    
    Example:
    POST /api/ranking/switch-method?use_neural=true
    """
    if use_neural:
        success = ranking_service.switch_to_neural()
        if success:
            return {"message": "Switched to neural ranking", "method": "neural"}
        else:
            return {"message": "Neural ranker not available, using rule-based", "method": "rule_based"}
    else:
        ranking_service.switch_to_rule_based()
        return {"message": "Switched to rule-based ranking", "method": "rule_based"}

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting ML Service...")
    logger.info("📊 Loading TensorFlow model...")
    try:
        _ = embedding_service.generate_embedding("warm up test")
        logger.info("✅ Embedding model loaded successfully")
        
        # Check neural ranker status
        if ranking_service.is_neural_ranker_available():
            logger.info("✅ Neural ranking model loaded successfully")
        else:
            logger.warning("⚠️  Neural ranker not available, using rule-based ranking")
            
    except Exception as e:
        logger.error(f"❌ Model loading failed: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down ML Service...")


if __name__=="__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)