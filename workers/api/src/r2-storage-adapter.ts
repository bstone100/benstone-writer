import type {
  Chunk,
  StorageAdapterInterface,
  StorageKey,
} from "@automerge/automerge-repo";

/**
 * R2StorageAdapter — automerge-repo's storage interface over the native
 * Cloudflare R2 binding (§8.1, Tier 2). automerge-repo uses content-addressed,
 * chunked keys, so dedupe + compaction are automatic; we only map its
 * `StorageKey` (a `string[]`) to/from an R2 object key:
 *
 *   ["{docId}", "snapshot", "{headsHash}"]      → "{docId}/snapshot/{headsHash}"
 *   ["{docId}", "incremental", "{sha256}"]      → "{docId}/incremental/{sha256}"
 *   ["{docId}", "sync-state", "{storageId}"]    → "{docId}/sync-state/{storageId}"
 *
 * Native R2 (`.get/.put/.delete/.list`), not the S3 SDK — cheaper, no egress,
 * and a binding (not a network call).
 */
export class R2StorageAdapter implements StorageAdapterInterface {
  /**
   * @param onPersist optional hook fired AFTER a durable write resolves, with the
   *   document id (`key[0]`) + chunk type (`key[1]`) — the cloud-save signal (R4).
   */
  constructor(
    private readonly bucket: R2Bucket,
    private readonly onPersist?: (documentId: string, type: string) => void,
  ) {}

  private objectKey(key: StorageKey): string {
    return key.join("/");
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    const object = await this.bucket.get(this.objectKey(key));
    if (!object) return undefined;
    return new Uint8Array(await object.arrayBuffer());
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    await this.bucket.put(this.objectKey(key), data);
    if (key[0] && key[1]) this.onPersist?.(key[0], key[1]); // AFTER the durable R2 write resolves (R4)
  }

  async remove(key: StorageKey): Promise<void> {
    await this.bucket.delete(this.objectKey(key));
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const prefix = this.objectKey(keyPrefix);
    const chunks: Chunk[] = [];
    let cursor: string | undefined;
    do {
      const listing = await this.bucket.list({ prefix, cursor, limit: 1000 });
      // R2 list returns metadata only; fetch each object's bytes.
      const objects = await Promise.all(
        listing.objects.map(async (o) => ({
          key: o.key,
          object: await this.bucket.get(o.key),
        })),
      );
      for (const { key, object } of objects) {
        if (object) {
          chunks.push({
            key: key.split("/"),
            data: new Uint8Array(await object.arrayBuffer()),
          });
        }
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);
    return chunks;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const prefix = this.objectKey(keyPrefix);
    let cursor: string | undefined;
    do {
      const listing = await this.bucket.list({ prefix, cursor, limit: 1000 });
      if (listing.objects.length > 0) {
        await this.bucket.delete(listing.objects.map((o) => o.key));
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);
  }
}
