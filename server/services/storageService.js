const supabase=require('../config/supabase');
const {v4:uuidv4}=require('uuid');

class StorageService{
  /**
   * Get signed upload URL for client-side upload
   * @param {string} bucket - Bucket name (post-attachments, answer-attachments, user-avatars)
   * @param {string} userId - User ID for folder organization
   * @param {string} fileName - Original file name
   * @param {number} expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
   * @returns {object} - { uploadUrl, filePath, publicUrl }
   */

  async getUploadUrl(bucket, userId, fileName, expiresIn=3600){
    try{
        const validBuckets=['post-attachments', 'answer-attachments','user-avatars'];

        if(!validBuckets.includes(bucket)){
            throw new Error('Invalid nucket name');
        }

        const sanitizedName=fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueId=uuidv4();
        const filePath= `${userId}/${uniqueId}_${sanitizedName}`;

        const{data,error}=await supabase.storage.from(bucket).createSignedUploadUrl(filePath);

        if(error){
            throw error;
        }

        const {data: publicUrlData}=supabase.storage.from(bucket).getPublicUrl(filePath);

        return {
            uploadUrl:data.signedUrl,
            filePath:filePath,
            publicUrl:publicUrlData.publicUrl,
            token:data.token,
        };
    }
    catch(error){
        console.error('Get upload URL error:', error);
      throw new Error(`Failed to generate upload URL: ${error.message}`);

    }
  }

  /**
   *Upload file directly from backend (for server-side uploads)
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} bucket - Bucket name
   * @param {string} userId - User ID
   * @param {string} fileName - File name
   * @param {string} contentType - MIME type
   * @returns {string} - Public URL
   */

   async uploadFile(fileBuffer, bucket, userId, fileName, contentType){
    try {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueId = uuidv4();
      const filePath = `${userId}/${uniqueId}_${sanitizedName}`;  

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    
    } catch (error) {
        console.error('Upload file error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete file from storage
   * @param {string} bucket - Bucket name
   * @param {string} filePath - Full file path in bucket
   * @returns {boolean}
   */
  async deleteFile(bucket, filePath) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   * @param {string} bucket - Bucket name
   * @param {array} filePaths - Array of file paths
   * @returns {boolean}
   */
  async deleteMultipleFiles(bucket, filePaths) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Delete multiple files error:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Get file info
   * @param {string} bucket - Bucket name
   * @param {string} filePath - File path
   * @returns {object} - File metadata
   */
  async getFileInfo(bucket, filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(filePath.split('/')[0], {
          search: filePath.split('/')[1],
        });

      if (error) {
        throw error;
      }

      return data[0] || null;
    } catch (error) {
      console.error('Get file info error:', error);
      return null;
    }
  }

  /**
   * List user's files in a bucket
   * @param {string} bucket - Bucket name
   * @param {string} userId - User ID
   * @returns {array} - Array of files
   */
  async listUserFiles(bucket, userId) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(userId);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('List files error:', error);
      return [];
    }
  }

  /**
   * Extract file path from public URL
   * @param {string} publicUrl - Public URL from Supabase
   * @returns {string} - File path
   */
  extractFilePathFromUrl(publicUrl) {
    try {
      const url = new URL(publicUrl);
      const pathParts = url.pathname.split('/');
      // Format: /storage/v1/object/public/bucket-name/file-path
      const bucketIndex = pathParts.indexOf('public') + 1;
      return pathParts.slice(bucketIndex + 1).join('/');
    } catch (error) {
      console.error('Extract path error:', error);
      return null;
    }
  }
}

module.exports = new StorageService();

