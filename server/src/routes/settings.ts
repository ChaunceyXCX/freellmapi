import { Router } from 'express';
import type { Request, Response } from 'express';
import { getUnifiedApiKey, regenerateUnifiedKey, getDb } from '../db/index.js';
import { encrypt, decrypt } from '../lib/crypto.js';

export const settingsRouter = Router();

// Get the unified API key
settingsRouter.get('/api-key', (_req: Request, res: Response) => {
  res.json({ apiKey: getUnifiedApiKey() });
});

// Regenerate the unified API key
settingsRouter.post('/api-key/regenerate', (_req: Request, res: Response) => {
  const newKey = regenerateUnifiedKey();
  res.json({ apiKey: newKey });
});

// Gist synchronization
settingsRouter.post('/gist/sync', async (req: Request, res: Response) => {
  try {
    const { githubToken, gistId, action } = req.body;

    if (!githubToken) {
      res.status(400).json({ error: { message: 'GitHub Token is required' } });
      return;
    }

    const db = getDb();

    if (action === 'backup') {
      // Fetch and decrypt all keys
      const rows = db.prepare('SELECT * FROM api_keys').all() as any[];
      const backupData = rows.map(row => {
        try {
          const realKey = decrypt(row.encrypted_key, row.iv, row.auth_tag);
          return {
            platform: row.platform,
            label: row.label,
            key: realKey,
            status: row.status,
            enabled: row.enabled === 1,
          };
        } catch (e) {
          // Skip if decryption fails (e.g. invalid key or bad encryption configuration)
          return null;
        }
      }).filter(Boolean);

      const fileContent = JSON.stringify(backupData, null, 2);
      const gistData = {
        description: 'FreeLLMAPI Keys Backup',
        public: false,
        files: {
          'freellmapi_keys.json': {
            content: fileContent,
          },
        },
      };

      let response;
      if (gistId) {
        // Update existing Gist
        response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'FreeLLMAPI-Server',
          },
          body: JSON.stringify(gistData),
        });
      } else {
        // Create new Gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'FreeLLMAPI-Server',
          },
          body: JSON.stringify(gistData),
        });
      }

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        res.status(response.status).json({
          error: { message: errorData.message || `GitHub API returned HTTP ${response.status}` },
        });
        return;
      }

      const result: any = await response.json();
      res.json({ success: true, gistId: result.id, htmlUrl: result.html_url });
      return;
    } else if (action === 'restore') {
      if (!gistId) {
        res.status(400).json({ error: { message: 'Gist ID is required for restore' } });
        return;
      }

      // Fetch Gist content
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FreeLLMAPI-Server',
        },
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        res.status(response.status).json({
          error: { message: errorData.message || `GitHub API returned HTTP ${response.status}` },
        });
        return;
      }

      const gist: any = await response.json();
      const file = gist.files?.['freellmapi_keys.json'];
      if (!file || !file.content) {
        res.status(400).json({ error: { message: 'No valid freellmapi_keys.json file found in Gist' } });
        return;
      }

      let backupData;
      try {
        backupData = JSON.parse(file.content);
      } catch (e) {
        res.status(400).json({ error: { message: 'Failed to parse Gist content as JSON' } });
        return;
      }

      if (!Array.isArray(backupData)) {
        res.status(400).json({ error: { message: 'Invalid keys backup format (expected array)' } });
        return;
      }

      // Restore keys to database
      let restoredCount = 0;
      const insertStmt = db.prepare(`
        INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const selectExisting = db.prepare(`SELECT * FROM api_keys WHERE platform = ?`);

      const runRestore = db.transaction(() => {
        for (const item of backupData) {
          if (!item || !item.platform || !item.key) continue;

          // Decrypt existing keys in DB to check for duplicates
          const existingRows = selectExisting.all(item.platform) as any[];
          let duplicate = false;
          for (const row of existingRows) {
            try {
              const decrypted = decrypt(row.encrypted_key, row.iv, row.auth_tag);
              if (decrypted === item.key) {
                duplicate = true;
                break;
              }
            } catch (e) {
              // Ignore decryption error
            }
          }

          if (!duplicate) {
            const { encrypted, iv, authTag } = encrypt(item.key);
            insertStmt.run(
              item.platform,
              item.label || '',
              encrypted,
              iv,
              authTag,
              item.status || 'unknown',
              item.enabled ? 1 : 0
            );
            restoredCount++;
          }
        }
      });

      runRestore();

      res.json({ success: true, restoredCount });
      return;
    } else {
      res.status(400).json({ error: { message: 'Invalid action. Must be backup or restore.' } });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Internal server error' } });
  }
});
