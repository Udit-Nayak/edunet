const redisClient=require('../config/redis');

class CacheService{
    isAvailable(){
        return redisClient.status=='ready';
    }

    async set(key, value, expiryInSec=3600){
        try{
            if(!this.isAvailable()){
                return false;
            }

            const serializedValue=JSON.stringify(value);
            await redisClient.setex(key, expiryInSec, serializedValue);
            return true;
        }
        catch(error){
            console.error("Cache set error:", error.message);
            return false;
        }
    }

    
  // Get cache
  async get(key) {
    try {
      if (!this.isAvailable()) {
        return null;
      }
      
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }
  
  async del(key) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }
  
  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error.message);
      return false;
    }
  }
  
  async exists(key) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error.message);
      return false;
    }
  }
  
  async setNoExpiry(key, value) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      const serializedValue = JSON.stringify(value);
      await redisClient.set(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set no expiry error:', error.message);
      return false;
    }
  }
}

module.exports = new CacheService();