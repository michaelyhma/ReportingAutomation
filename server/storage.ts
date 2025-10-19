import { randomUUID } from "crypto";

// Storage for processed vintage files
export interface IStorage {
  storeVintageFile(vintageName: string, buffer: Buffer): Promise<string>;
  getVintageFile(vintageName: string): Promise<Buffer | undefined>;
  clearVintageFiles(): Promise<void>;
}

export class MemStorage implements IStorage {
  private vintageFiles: Map<string, Buffer>;

  constructor() {
    this.vintageFiles = new Map();
  }

  async storeVintageFile(vintageName: string, buffer: Buffer): Promise<string> {
    this.vintageFiles.set(vintageName, buffer);
    return vintageName;
  }

  async getVintageFile(vintageName: string): Promise<Buffer | undefined> {
    return this.vintageFiles.get(vintageName);
  }

  async clearVintageFiles(): Promise<void> {
    this.vintageFiles.clear();
  }
}

export const storage = new MemStorage();
