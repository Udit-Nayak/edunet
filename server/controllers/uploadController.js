const storageService=require('../services/storageService');

// @desc    Get signed upload URL
// @route   POST /api/upload/signed-url
// @access  Private
exports.getSignedUploadUrl=async (req, res)=>{
    try {
        const {bucket, fileName}=req.body;

        if(!bucket || !fileName){
            return res.status(400).json({
                success:false,
                message:'Bucket and fileName are required',
            });
        }

    const validBuckets = ['post-attachments', 'answer-attachments', 'user-avatars'];
    if (!validBuckets.includes(bucket)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bucket name',
      });
    }

    const userId=req.user._id.toString();

    const uploadData=await storageService.getUploadUrl(
        bucket, userId, fileName, 3600
    );

    res.status(200).json({
        success:true, 
        data:uploadData,
    });
    } catch (error) {
        console.error('Get signed URL error:' , error);
        res.status(500).json({
            success:false,
            message:'Error generating upload URL', 
            error:error.message,
        }); 
    }
};

// @desc    Upload file directly (alternative method)
// @route   POST /api/upload/direct
// @access  Private
exports.uploadFileDirect = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { bucket } = req.body;
    const userId = req.user._id.toString();

    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      bucket,
      userId,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(200).json({
      success: true,
      data: {
        url: publicUrl,
        name: req.file.originalname,
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'pdf',
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/upload/file
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const { bucket, filePath } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({
        success: false,
        message: 'Bucket and filePath are required',
      });
    }

    const userId = req.user._id.toString();
    if (!filePath.startsWith(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own files',
      });
    }

    await storageService.deleteFile(bucket, filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message,
    });
  }
};

// @desc    Get user's uploaded files
// @route   GET /api/upload/my-files/:bucket
// @access  Private
exports.getMyFiles = async (req, res) => {
  try {
    const { bucket } = req.params;
    const userId = req.user._id.toString();

    const files = await storageService.listUserFiles(bucket, userId);

    res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message,
    });
  }
};