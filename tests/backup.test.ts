import { describe, it, expect } from 'vitest';
import { importDatabaseBackup } from '@/lib/storage/db';

describe('Storage Backup & Data Validation', () => {
  it('rejects invalid JSON string gracefully', async () => {
    const res = await importDatabaseBackup('not-a-json-object');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Failed to import JSON');
  });

  it('rejects non-SONARA format payload', async () => {
    const invalidPayload = JSON.stringify({
      app: 'RANDOM_APP',
      version: '1.0.0',
      data: {},
    });
    const res = await importDatabaseBackup(invalidPayload);
    expect(res.success).toBe(false);
    expect(res.message).toBe('Invalid SONARA backup format.');
  });

  it('rejects payload missing artists array', async () => {
    const invalidPayload = JSON.stringify({
      app: 'SONARA',
      version: '1.0.0',
      data: {
        tracks: [],
      },
    });
    const res = await importDatabaseBackup(invalidPayload);
    expect(res.success).toBe(false);
    expect(res.message).toContain('artists array is required');
  });
});

