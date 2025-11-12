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

const getPublicUrl = (fileName) => {
  const { MINIO_PUBLIC_URL, MINIO_BUCKET } = process.env;
  if (MINIO_PUBLIC_URL && MINIO_BUCKET) {
    return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${fileName}`;
  }
  return `https://mock-storage.local/${fileName}`;
};

class MinioService {
  async upload(fileBuffer, fileName) {
    try {
      const client = buildClient();
      const bucket = process.env.MINIO_BUCKET;

      if (!client || !bucket) {
        console.warn('MinIO configuration incomplete, using mock upload');
        return getPublicUrl(fileName);
      }

      await client.putObject(bucket, fileName, fileBuffer);
      return getPublicUrl(fileName);
    } catch (err) {
      console.error("MinIO upload failed:", err.message);
      throw new Error("Erreur lors de lenvoi du fichier vers MinIO");
    }
  }
}

export default new MinioService();
