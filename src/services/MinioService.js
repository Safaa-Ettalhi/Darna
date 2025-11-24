import dotenv from "dotenv";
import * as Minio from "minio";

dotenv.config();

let minioClient;

const buildClient = () => {
  const {
    MINIO_ENDPOINT,
    MINIO_PORT,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_USE_SSL,
    MINIO_BUCKET,
  } = process.env;

  if (
    !MINIO_ENDPOINT ||
    !MINIO_PORT ||
    !MINIO_ACCESS_KEY ||
    !MINIO_SECRET_KEY ||
    !MINIO_BUCKET
  ) {
    return null;
  }

  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: parseInt(MINIO_PORT, 10),
      useSSL: MINIO_USE_SSL === 'true',
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }

  return minioClient;
};

const ensureBucket = async (client, bucket) => {
  const exists = await client.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucket, '').catch((error) => {
      console.error('MinIO makeBucket failed:', error.message);
      throw new Error("Impossible de créer le bucket MinIO demandé");
    });
  }
};

const getPublicUrl = (fileName) => {
  const {
    MINIO_PUBLIC_URL,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_PORT,
    MINIO_USE_SSL,
  } = process.env;

  if (MINIO_PUBLIC_URL && MINIO_BUCKET) {
    return `${MINIO_PUBLIC_URL.replace(/\/$/, '')}/${MINIO_BUCKET}/${fileName}`;
  }

  if (MINIO_ENDPOINT && MINIO_PORT && MINIO_BUCKET) {
    const protocol = MINIO_USE_SSL === 'true' ? 'https' : 'http';
    return `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET}/${fileName}`;
  }

  return `/${fileName}`;
};

class MinioService {
  async upload(fileBuffer, fileName, metaData = {}) {
    try {
      const client = buildClient();
      const bucket = process.env.MINIO_BUCKET;

      if (!client || !bucket) {
        console.warn('MinIO configuration incomplete, using mock upload');
        return getPublicUrl(fileName);
      }

      await ensureBucket(client, bucket);

      await client.putObject(bucket, fileName, fileBuffer, metaData);
      return getPublicUrl(fileName);
    } catch (err) {
      console.error("MinIO upload failed:", err.message);
      throw new Error("Erreur lors de lenvoi du fichier vers MinIO");
    }
  }
}

export default new MinioService();
