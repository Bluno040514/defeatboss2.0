import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";

// POST /api/upload - 上传图片
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "没有上传文件",
        },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "不支持的文件类型，仅支持 JPG、PNG、GIF、WebP",
        },
        { status: 400 }
      );
    }

    // 验证文件大小（最大5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "文件大小超过限制（最大5MB）",
        },
        { status: 400 }
      );
    }

    // 将文件转换为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // 尝试使用S3存储
      const storage = new S3Storage({
        endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
        accessKey: "",
        secretKey: "",
        bucketName: process.env.COZE_BUCKET_NAME,
        region: "cn-beijing",
      });

      // 生成文件名
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `boss-custom/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // 上传文件
      const fileKey = await storage.uploadFile({
        fileContent: buffer,
        fileName: fileName,
        contentType: file.type,
      });

      // 生成签名URL
      const imageUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 86400 * 7, // 7天有效期
      });

      return NextResponse.json({
        success: true,
        data: {
          key: fileKey,
          url: imageUrl,
        },
      });
    } catch (s3Error) {
      console.log("S3存储不可用，使用base64编码返回图片", s3Error);
      
      // 使用base64编码作为备选方案
      const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;
      
      return NextResponse.json({
        success: true,
        data: {
          key: `base64_${Date.now()}`,
          url: base64Image,
        },
      });
    }
  } catch (error) {
    console.error("上传图片失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "上传图片失败",
      },
      {
        status: 500,
      }
    );
  }
}