from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.services.recommendation import recommendation_service
from app.config import settings
from bson.objectid import ObjectId
from fastapi.encoders import jsonable_encoder

app=FastAPI(
    title="Edunet ML Service",
    version="1.0.0",
    description="Machine Learning Service for Edunet Platform"
)

#CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class SimilarPostsRequest(BaseModel):
    post_id: int
    limit: Optional[int] = 10

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

class UserRecommendationsRequest(BaseModel):
    user_id: str
    user_tags: List[str]
    limit: Optional[int] = 10


#Routes
@app.get("/")
def root():
    return{
        "service": "EduConnect ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "similar_posts": "/api/recommend/similar",
            "search": "/api/recommend/search",
            "user_feed": "/api/recommend/feed"
        }
    }

@app.get("/health")
def health_check():
    return {"status":"healthy"}

@app.post("/api/recommend/similar")
def get_similar_posts(request:SimilarPostsRequest):
    try:
        results=recommendation_service.get_similar_posts(
            request.post_id,
            request.limit
        )
        return {"posts":results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommend/search")
def search_posts(request:SearchRequest):
    try:
        results=recommendation_service.search_by_text(
            request.query,
            request.limit
        )
        return {"posts":results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend/feed")
def get_personalised_feed(request: UserRecommendationsRequest):
    try:
        results = recommendation_service.get_recommendations_for_user(
            request.user_id,
            request.user_tags,
            request.limit
        )

        safe_posts = []
        for doc in results:
            d = dict(doc) 
            _id = d.get("_id")
            if isinstance(_id, ObjectId):
                d["id"] = str(_id)
                del d["_id"]

            safe_posts.append(d)

        return jsonable_encoder({"posts": safe_posts})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__=="__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
    