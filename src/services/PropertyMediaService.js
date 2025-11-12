import sharp from 'sharp';
import Property from '../models/Property.js';
import MinioService from './MinioService.js';

const sanitizeFileName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isImage = (mimetype) => mimetype?.startsWith('image/');
const isVideo = (mimetype) => mimetype?.startsWith('video/');

class PropertyMediaService {
  async addMedia({ propertyId, ownerId, files }) {
    const property = await Property.findOne({ _id: propertyId, ownerId });
    if (!property) {
      throw new Error('Property not found or access denied');
    }

    const mediaEntries = [];
    for (const file of files) {
      const safeName = sanitizeFileName(file.originalname || 'media');
      const timestamp = Date.now();
      const basePath = `${propertyId}/${timestamp}-${safeName}`;

      const url = await MinioService.upload(file.buffer, basePath);

      let thumbnailUrl = url;
      if (isImage(file.mimetype)) {
        try {
          const thumbnailBuffer = await sharp(file.buffer)
            .resize({ width: 500, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          thumbnailUrl = await MinioService.upload(thumbnailBuffer, `${propertyId}/thumb-${timestamp}-${safeName}.webp`);
        } catch (error) {
          console.warn('Thumbnail generation failed', error.message);
        }
      }

      mediaEntries.push({
        type: isVideo(file.mimetype) ? 'video' : 'image',
        url,
        thumbnailUrl,
      });
    }

    property.media.push(...mediaEntries);
    await property.save();

    return property;
  }

  async removeMedia({ propertyId, ownerId, mediaId }) {
    const property = await Property.findOne({ _id: propertyId, ownerId });
    if (!property) {
      throw new Error('Property not found or access denied');
    }

    property.media = property.media.filter((item) => item._id.toString() !== mediaId);
    await property.save();

    return property;
  }
}

export default PropertyMediaService;

