import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Access environment variables with type safety
const getEnvVar = (key: string): string | undefined => {
  return process.env[key];
};

const dbPath = getEnvVar('DATABASE_PATH') || './data/ai_board.db';

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
const initializeDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_message TEXT NOT NULL,
      agent_response TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      model_used TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS agent_metrics (
      agent_role TEXT PRIMARY KEY,
      total_queries INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      best_responses INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_role);

    CREATE TABLE IF NOT EXISTS agent_persona_overrides (
      agent_id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add model_config and title columns to sessions table if they don't exist
  try {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN model_config TEXT DEFAULT NULL;
    `);
    console.log('✅ Migration: Added model_config column to sessions table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column')) {
      console.error('Migration error (model_config):', error.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN title TEXT DEFAULT NULL;
    `);
    console.log('✅ Migration: Added title column to sessions table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column')) {
      console.error('Migration error (title):', error.message);
    }
  }
};

// Session operations
const createSession = (id: string, modelConfig?: string, title?: string) => {
  const stmt = db.prepare('INSERT INTO sessions (id, model_config, title) VALUES (?, ?, ?)');
  stmt.run(id, modelConfig || null, title || null);
  return { id };
};

const getSession = (id: string) => {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(id) as any;
};

const getAllSessions = () => {
  const stmt = db.prepare(`
    SELECT s.*, COUNT(c.id) as conversation_count
    FROM sessions s
    LEFT JOIN conversations c ON s.id = c.session_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  return stmt.all() as any[];
};

const updateSessionModelConfig = (id: string, modelConfig: string) => {
  const stmt = db.prepare('UPDATE sessions SET model_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(modelConfig, id);
};

const updateSessionStatus = (id: string, status: string) => {
  const stmt = db.prepare('UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(status, id);
};

const deleteSessionPermanently = (sessionId: string) => {
  const deleteMessagesBySession = db.prepare(`
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT id FROM conversations WHERE session_id = ?
    )
  `);
  const deleteConversationsBySession = db.prepare('DELETE FROM conversations WHERE session_id = ?');
  const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE id = ?');

  const tx = db.transaction((id: string) => {
    deleteMessagesBySession.run(id);
    deleteConversationsBySession.run(id);
    deleteSessionStmt.run(id);
  });

  tx(sessionId);
};

const deleteSessionsPermanently = (sessionIds: string[]) => {
  const unique = Array.from(new Set(sessionIds)).filter(Boolean);
  if (unique.length === 0) return;

  const tx = db.transaction((ids: string[]) => {
    ids.forEach((id) => deleteSessionPermanently(id));
  });

  tx(unique);
};

// Conversation operations
const createConversation = (data: {
  id: string;
  session_id: string;
  user_message: string;
  agent_response: string;
  agent_role: string;
  model_used: string;
  score?: number;
}) => {
  const stmt = db.prepare(`
    INSERT INTO conversations (id, session_id, user_message, agent_response, agent_role, model_used, score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(data.id, data.session_id, data.user_message, data.agent_response, data.agent_role, data.model_used, data.score || 0);
  
  // Update agent metrics
  updateAgentMetrics(data.agent_role, data.score || 0);
  
  return { id: data.id };
};

const getConversationsBySession = (sessionId: string) => {
  const stmt = db.prepare('SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp DESC');
  return stmt.all(sessionId) as any[];
};

const getConversationById = (id: string) => {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  return stmt.get(id) as any;
};

// Message operations
const createMessage = (data: {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
}) => {
  const stmt = db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)');
  stmt.run(data.id, data.conversation_id, data.role, data.content);
  return { id: data.id };
};

const getMessagesByConversation = (conversationId: string) => {
  const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC');
  return stmt.all(conversationId) as any[];
};

// Agent metrics operations
const updateAgentMetrics = (agentRole: string, score: number) => {
  const existing = db.prepare('SELECT * FROM agent_metrics WHERE agent_role = ?').get(agentRole) as any;
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE agent_metrics 
      SET total_queries = total_queries + 1,
          total_score = total_score + ?,
          best_responses = best_responses + CASE WHEN ? >= (SELECT MAX(score) FROM conversations WHERE agent_role = ?) THEN 1 ELSE 0 END,
          avg_response_time = (total_score + ?) / (total_queries + 1),
          updated_at = CURRENT_TIMESTAMP
      WHERE agent_role = ?
    `);
    stmt.run(score, score, agentRole, score, agentRole);
  } else {
    const stmt = db.prepare(`
      INSERT INTO agent_metrics (agent_role, total_queries, total_score, best_responses, avg_response_time)
      VALUES (?, 1, ?, CASE WHEN ? >= 90 THEN 1 ELSE 0 END, ?)
    `);
    stmt.run(agentRole, score, score, score);
  }
};

const getAllAgentMetrics = () => {
  const stmt = db.prepare('SELECT * FROM agent_metrics ORDER BY total_queries DESC');
  return stmt.all() as any[];
};

// Statistics
const getSessionStats = (sessionId: string) => {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_conversations,
      AVG(score) as avg_score,
      MAX(score) as best_score,
      MIN(score) as worst_score
    FROM conversations 
    WHERE session_id = ?
  `);
  return stmt.get(sessionId) as any;
};

// Persona override operations
const getPersonaOverride = (agentId: string) => {
  const stmt = db.prepare('SELECT * FROM agent_persona_overrides WHERE agent_id = ?');
  return stmt.get(agentId) as any;
};

const getAllPersonaOverrides = () => {
  const stmt = db.prepare('SELECT * FROM agent_persona_overrides');
  return stmt.all() as any[];
};

const savePersonaOverride = (agentId: string, role: string) => {
  const stmt = db.prepare(`
    INSERT INTO agent_persona_overrides (agent_id, role, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(agent_id) DO UPDATE SET
    role = excluded.role,
    updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(agentId, role);
  return { agentId };
};

const deletePersonaOverride = (agentId: string) => {
  const stmt = db.prepare('DELETE FROM agent_persona_overrides WHERE agent_id = ?');
  stmt.run(agentId);
};

// System settings operations
const getSystemSetting = (key: string) => {
  const stmt = db.prepare('SELECT * FROM system_settings WHERE key = ?');
  return stmt.get(key) as any;
};

const setSystemSetting = (key: string, value: string) => {
  const stmt = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(key, value);
};

// Initialize database on import
initializeDatabase();

export {
  db,
  createSession,
  getSession,
  getAllSessions,
  updateSessionStatus,
  updateSessionModelConfig,
  deleteSessionPermanently,
  deleteSessionsPermanently,
  createConversation,
  getConversationsBySession,
  getConversationById,
  createMessage,
  getMessagesByConversation,
  getAllAgentMetrics,
  getSessionStats,
  getPersonaOverride,
  getAllPersonaOverrides,
  savePersonaOverride,
  deletePersonaOverride,
  getSystemSetting,
  setSystemSetting,
};
