import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Lazy initialization of R2 client
let r2Client = null;

const getR2Client = () => {
  if (!r2Client) {
    // Debug credentials before creating S3Client
    console.log('Creating R2 client with credentials:');
    console.log('R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID);
    console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? `${process.env.R2_ACCESS_KEY_ID.substring(0, 8)}...` : 'undefined');
    console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? `${process.env.R2_SECRET_ACCESS_KEY.substring(0, 8)}...` : 'undefined');
    console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);

    // Validate credentials before creating S3Client
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID) {
      throw new Error('Missing required R2 environment variables');
    }

    // Create S3 client for Cloudflare R2
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Important for R2
    });
  }
  return r2Client;
};

// Upload file to R2
export const uploadToR2 = async (file, key, contentType) => {
  try {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await client.send(command);
    
    // Return the public URL
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

// Get signed URL for private files
export const getSignedUrlFromR2 = async (key, expiresIn = 3600) => {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
};

// Get signed URL for one-time purchase (5 minutes expiry)
export const getSignedUrlForPurchase = async (key) => {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // 5 minutes = 300 seconds
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL for purchase:', error);
    throw error;
  }
};

// Get signed URL for subscription access (1 hour expiry)
export const getSignedUrlForSubscription = async (key) => {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // 1 hour = 3600 seconds
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL for subscription:', error);
    throw error;
  }
};

// Delete file from R2
export const deleteFromR2 = async (key) => {
  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw error;
  }
};

// Generate unique file key
export const generateFileKey = (folderPath, filename, fileType) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop();
  
  // Create folder structure: folderPath/timestamp_randomId.extension
  const key = folderPath && folderPath !== 'root' ? `${folderPath}/${timestamp}_${randomId}.${extension}` : `${timestamp}_${randomId}.${extension}`;
  
  return key;
};

export default getR2Client;
