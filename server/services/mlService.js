const axios = require("axios");

const ML_SERVIE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
class MLService {
  async getSimilarPosts(postId, limit = 10) {
    try {
      const response = await axios.post(
        `${ML_SERVIE_URL}/api/recomment/similar`,
        { post_id: postId, limit },
      );
      return response.data.posts;
    } catch (error) {
      console.error("ML Service error:", error.message);
      return [];
    }
  }

  async searchPosts(query, limit = 10) {
    try {
      const response = await axios.post(
        `${ML_SERVIE_URL}/api/recommend/search`,
        { query, limit },
      );
      return response.data.posts;
    } catch (error) {
      console.error("ML Service error:", error.message);
      return [];
    }
  }

  async getPersonalizedFeed(userId, userTags, limit = 20) {
    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/api/recommend/feed`,
        { user_id: userId, user_tags: userTags, limit },
      );
      return response.data.posts;
    } catch (error) {
      console.error("ML Service error:", error.message);
      return [];
    }
  }
}

module.exports = new MLService();