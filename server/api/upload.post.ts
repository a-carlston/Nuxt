import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

// File type configurations
const ALLOWED_TYPES: Record<string, { mimes: string[]; maxSize: number; folder: string }> = {
  avatar: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'avatars'
  },
  logo: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'logos'
  },
  header: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'headers'
  },
  document: {
    mimes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 25 * 1024 * 1024, // 25MB for HIPAA docs
    folder: 'documents'
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Validate R2 configuration
  if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
    throw createError({
      statusCode: 500,
      message: 'R2 storage not configured'
    })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  // Get file and type from form data
  const fileField = formData.find(f => f.name === 'file')
  const typeField = formData.find(f => f.name === 'type')

  if (!fileField || !fileField.data) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  const uploadType = typeField?.data?.toString() || 'document'
  const typeConfig = ALLOWED_TYPES[uploadType]

  if (!typeConfig) {
    throw createError({
      statusCode: 400,
      message: 'Invalid upload type'
    })
  }

  // Validate file type
  const mimeType = fileField.type || 'application/octet-stream'
  if (!typeConfig.mimes.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid file type. Allowed: ${typeConfig.mimes.join(', ')}`
    })
  }

  // Validate file size
  if (fileField.data.length > typeConfig.maxSize) {
    throw createError({
      statusCode: 400,
      message: `File too large. Max size: ${typeConfig.maxSize / 1024 / 1024}MB`
    })
  }

  // Create S3 client for R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey
    }
  })

  // Generate unique filename
  const ext = fileField.filename?.split('.').pop() || 'bin'
  const filename = `${typeConfig.folder}/${randomUUID()}.${ext}`

  try {
    // Upload to R2
    await s3Client.send(new PutObjectCommand({
      Bucket: config.r2BucketName,
      Key: filename,
      Body: fileField.data,
      ContentType: mimeType
    }))

    // Return the public URL
    const publicUrl = config.public.r2PublicUrl
      ? `${config.public.r2PublicUrl}/${filename}`
      : filename // Return just the key if no public URL configured

    return {
      success: true,
      url: publicUrl,
      key: filename,
      size: fileField.data.length,
      type: mimeType
    }
  } catch (error: any) {
    console.error('R2 upload error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload file'
    })
  }
})
