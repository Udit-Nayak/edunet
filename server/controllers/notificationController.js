const notificationService = require("../services/notificationService");
const NotificationService = require("../services/notificationService");

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const result = await notificationService.getUserNotification(req.user._id, {
      page,
      limit,
      unreadOnly: unreadOnly === "true",
    });

    res.status(200).json({
      success: true,
      ...result,
    });
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
        const count=await notificationService.getUnreadCount(req.user._id);

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