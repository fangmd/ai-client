import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { app } from 'electron'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logError, logInfo } from './logger'

let ragDbInstance: Database.Database | null = null
let ragDbInitialized = false

function getRagDatabasePath(): string {
  let baseDir: string

  if (!app.isPackaged) {
    baseDir = path.join(process.cwd(), 'prisma')
  } else {
    let userDataPath: string
    try {
      userDataPath = app.getPath('userData')
    } catch {
      userDataPath = process.cwd()
    }
    baseDir = path.join(userDataPath, 'data')
  }

  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true })
  }

  return path.join(baseDir, 'rag.db')
}

function configureRagDatabase(db: Database.Database): void {
  db.defaultSafeIntegers(true)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -64000')
}

function createRagTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rag_library (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rag_document (
      id INTEGER PRIMARY KEY,
      library_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(library_id) REFERENCES rag_library(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rag_chunk (
      id INTEGER PRIMARY KEY,
      document_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER,
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(document_id) REFERENCES rag_document(id) ON DELETE CASCADE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS rag_vector USING vec0(
      embedding FLOAT[512]
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunk_fts USING fts5(
      content,
      content='rag_chunk',
      content_rowid='id'
    );
  `)

  // 创建索引以优化查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rag_document_library_id 
    ON rag_document(library_id);
    
    CREATE INDEX IF NOT EXISTS idx_rag_document_status 
    ON rag_document(status);
    
    CREATE INDEX IF NOT EXISTS idx_rag_chunk_document_id 
    ON rag_chunk(document_id);
  `)

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS rag_chunk_ai
    AFTER INSERT ON rag_chunk
    BEGIN
      INSERT INTO rag_chunk_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS rag_chunk_au
    AFTER UPDATE ON rag_chunk
    BEGIN
      INSERT INTO rag_chunk_fts(rag_chunk_fts, rowid, content)
      VALUES ('delete', old.id, old.content);
      INSERT INTO rag_chunk_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS rag_chunk_ad
    AFTER DELETE ON rag_chunk
    BEGIN
      INSERT INTO rag_chunk_fts(rag_chunk_fts, rowid, content)
      VALUES ('delete', old.id, old.content);
    END;
  `)
}

export function initializeRagDatabase(): void {
  if (ragDbInitialized) {
    return
  }

  try {
    const dbPath = getRagDatabasePath()
    const db = new Database(dbPath)

    sqliteVec.load(db)
    configureRagDatabase(db)
    createRagTables(db)

    ragDbInstance = db
    ragDbInitialized = true

    logInfo('RAG database initialized', { path: dbPath })
  } catch (error) {
    logError('Failed to initialize RAG database', error)
    throw error
  }
}

export function getRagDatabase(): Database.Database {
  if (!ragDbInstance) {
    initializeRagDatabase()
  }

  if (!ragDbInstance) {
    throw new Error('RAG database not initialized')
  }

  return ragDbInstance
}

export function closeRagDatabase(): void {
  if (ragDbInstance) {
    ragDbInstance.close()
    ragDbInstance = null
    ragDbInitialized = false
  }
}
