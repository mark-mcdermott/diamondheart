import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function deleteFile(fileKey: string): Promise<void> {
  await utapi.deleteFiles(fileKey);
}

export async function getFileUrl(fileKey: string): Promise<string> {
  const files = await utapi.getFileUrls(fileKey);
  return files.data[0]?.url ?? "";
}
