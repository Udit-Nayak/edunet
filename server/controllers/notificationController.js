const notificationService = require("../services/notificationService");
const cacheService = require("../services/cacheService");

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    // Check cache
    const cacheKey = `notifications:${req.user._id}:${page}:${limit}:${unreadOnly}`;
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      console.log(`✅ Cache hit: Notifications for user ${req.user._id}`);
      return res.status(200).json(cachedData);
    }
    
    const result = await notificationService.getUserNotification(req.user._id, {
      page,
      limit,
      unreadOnly: unreadOnly === "true",
    });

    const response = {
      success: true,
      ...result,
    };
    
    // Cache for 30 seconds
    await cacheService.set(cacheKey, response, 30);

    res.status(200).json(response);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};


exports.getUnreadCount=async (req, res)=>{
    try {
        // Check cache
        const cacheKey = `notifications:unread:${req.user._id}`;
        const cachedCount = await cacheService.get(cacheKey);
        
        if (cachedCount !== null) {
          console.log(`✅ Cache hit: Unread count for user ${req.user._id}`);
          return res.status(200).json({
            success: true,
            count: cachedCount,
          });
        }
        
        const count=await notificationService.getUnreadCount(req.user._id);

        // Cache for 30 seconds
        await cacheService.set(cacheKey, count, 30);

        res.status(200).json({
            success:true,
            count,
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success:false,
            message:'Error fetching unread count',
            error:error.message,
        });
    }
};

exports.markAsRead= async (req, res)=>{
    try {
        const {id}=req.params;
        const notification=await notificationService.markAsRead(id, req.user._id);

        if(!notification){
            return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
        }
        
        // Clear notification caches
        await cacheService.delPattern(`notifications:${req.user._id}:*`);
        await cacheService.del(`notifications:unread:${req.user._id}`);
        
        res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
    } catch (error) {
        console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
    }
};


exports.markAllAsRead=async(req, res)=>{
    try {
        await notificationService.markAllAsRead(req.user._id);

        // Clear notification caches
        await cacheService.delPattern(`notifications:${req.user._id}:*`);
        await cacheService.del(`notifications:unread:${req.user._id}`);

        res.status(200).json({
            success:true,
            message:'All notifications are marked as read',
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message,
    });
    }
};

exports.deleteNotification=async (req, res)=>{
    try {
        const {id}=req.params;

        await notificationService.deleteNotification(id, req.user._id);

        // Clear notification caches
        await cacheService.delPattern(`notifications:${req.user._id}:*`);
        await cacheService.del(`notifications:unread:${req.user._id}`);

        res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message,
    });
  }
};