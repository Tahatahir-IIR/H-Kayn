import mysql from "mysql2/promise"

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hkayn_support",
  port: Number.parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

const globalWithMysql = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool
}

export function getPool() {
  if (!globalWithMysql.mysqlPool) {
    globalWithMysql.mysqlPool = mysql.createPool(dbConfig)
  }
  return globalWithMysql.mysqlPool
}

export async function query(sql: string, params?: any[]) {
  const connection = getPool()
  try {
    const [results] = await connection.execute(sql, params)
    return results
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

export async function closePool() {
  const pool = globalWithMysql.mysqlPool
  if (pool) {
    await pool.end()
    globalWithMysql.mysqlPool = null
  }
}

// User operations
export async function getUsers() {
  const connection = getPool()
  const [rows] = await connection.execute(`
    SELECT u.*, 
           GROUP_CONCAT(
             DISTINCT JSON_OBJECT(
               'id', sg.id,
               'name', sg.name,
               'description', sg.description
             )
           ) as user_groups
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN support_groups sg ON ug.group_id = sg.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)

  return Array.isArray(rows)
    ? rows.map((row: any) => ({
        ...row,
        groups: row.user_groups ? JSON.parse(`[${row.user_groups}]`) : [],
      }))
    : []
}

export async function getUserByCredentials(username: string, password: string) {
  const connection = getPool()
  const [rows] = await connection.execute(
    `
    SELECT u.*, 
           GROUP_CONCAT(
             DISTINCT JSON_OBJECT(
               'id', sg.id,
               'name', sg.name,
               'description', sg.description
             )
           ) as user_groups
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN support_groups sg ON ug.group_id = sg.id
    WHERE u.username = ? AND u.password = ?
    GROUP BY u.id
  `,
    [username, password],
  )

  if (Array.isArray(rows) && rows.length > 0) {
    const user = rows[0] as any
    return {
      ...user,
      groups: user.user_groups ? JSON.parse(`[${user.user_groups}]`) : [],
    }
  }
  return null
}

export async function getUserById(userId: number) {
  const connection = getPool()
  const [rows] = await connection.execute(`SELECT * FROM users WHERE id = ?`, [userId])
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export async function createUser(userData: {
  username: string
  password: string
  name: string
  type: string
}) {
  const connection = getPool()
  const [result] = await connection.execute("INSERT INTO users (username, password, name, type) VALUES (?, ?, ?, ?)", [
    userData.username,
    userData.password,
    userData.name,
    userData.type,
  ])
  return result
}

export async function deleteUser(userId: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM users WHERE id = ?", [userId])
  return result
}

// Support Groups operations
export async function getSupportGroups() {
  const connection = getPool()
  const [rows] = await connection.execute(`
    SELECT sg.*, 
           COUNT(ug.user_id) as member_count,
           chief.name as chief_name,
           GROUP_CONCAT(
             JSON_OBJECT(
               'id', u.id,
               'name', u.name,
               'username', u.username,
               'type', u.type,
               'is_chief', IF(u.id = sg.chief_id, true, false)
             )
           ) as members
    FROM support_groups sg
    LEFT JOIN user_groups ug ON sg.id = ug.group_id
    LEFT JOIN users u ON ug.user_id = u.id AND u.type = 'support'
    LEFT JOIN users chief ON sg.chief_id = chief.id
    GROUP BY sg.id
    ORDER BY sg.created_at DESC
  `)

  return Array.isArray(rows)
    ? rows.map((row: any) => ({
        ...row,
        members: row.members ? JSON.parse(`[${row.members}]`) : [],
      }))
    : []
}

export async function createSupportGroup(groupData: {
  name: string
  description?: string
}) {
  const connection = getPool()
  const [result] = await connection.execute("INSERT INTO support_groups (name, description) VALUES (?, ?)", [
    groupData.name,
    groupData.description || null,
  ])
  return result
}

export async function updateSupportGroup(
  groupId: number,
  groupData: {
    name: string
    description?: string
  },
) {
  const connection = getPool()
  const [result] = await connection.execute(
    "UPDATE support_groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [groupData.name, groupData.description || null, groupId],
  )
  return result
}

export async function deleteSupportGroup(groupId: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM support_groups WHERE id = ?", [groupId])
  return result
}

export async function assignUserToGroup(userId: number, groupId: number) {
  const connection = getPool()
  const [result] = await connection.execute("INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)", [
    userId,
    groupId,
  ])
  return result
}

export async function removeUserFromGroup(userId: number, groupId: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM user_groups WHERE user_id = ? AND group_id = ?", [
    userId,
    groupId,
  ])
  return result
}

export async function getSupportUsers() {
  const connection = getPool()
  const [rows] = await connection.execute(`
    SELECT u.*, 
           GROUP_CONCAT(
             DISTINCT JSON_OBJECT(
               'id', sg.id,
               'name', sg.name,
               'description', sg.description
             )
           ) as user_groups
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN support_groups sg ON ug.group_id = sg.id
    WHERE u.type = 'support'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)

  return Array.isArray(rows)
    ? rows.map((row: any) => ({
        ...row,
        groups: row.user_groups ? JSON.parse(`[${row.user_groups}]`) : [],
      }))
    : []
}

export async function setGroupChief(userId: number, groupId: number) {
  const connection = getPool()
  const [result] = await connection.execute(
    "UPDATE support_groups SET chief_id = ?, chief_name = (SELECT name FROM users WHERE id = ?) WHERE id = ?",
    [userId, userId, groupId],
  )
  return result
}

// Tache operations
export async function getTaches() {
  const connection = getPool()

  // First get all taches with total_session_time
  const [tacheRows] = await connection.execute(`
    SELECT *, COALESCE(total_session_time, 0) as total_session_time 
    FROM taches 
    ORDER BY created_at DESC
  `)

  if (!Array.isArray(tacheRows)) {
    return []
  }

  // Then get responses and comments for each tache
  const tachesWithDetails = await Promise.all(
    tacheRows.map(async (tache: any) => {
      const [responseRows] = await connection.execute(
        `SELECT id, message, support_name, support_id, created_at 
         FROM responses 
         WHERE tache_id = ? 
         ORDER BY created_at ASC`,
        [tache.id],
      )
      const [commentRows] = await connection.execute(
        `SELECT id, user_id, user_name, user_type, message, created_at 
         FROM task_comments 
         WHERE tache_id = ? 
         ORDER BY created_at ASC`,
        [tache.id],
      )

      return {
        ...tache,
        responses: Array.isArray(responseRows) ? responseRows : [],
        comments: Array.isArray(commentRows) ? commentRows : [],
      }
    }),
  )

  return tachesWithDetails
}

export async function getTachesByEmployee(employeeId: number) {
  const connection = getPool()

  // First get taches for the employee with total_session_time
  const [tacheRows] = await connection.execute(
    `SELECT *, COALESCE(total_session_time, 0) as total_session_time 
     FROM taches 
     WHERE employee_id = ? 
     ORDER BY created_at DESC`,
    [employeeId],
  )

  if (!Array.isArray(tacheRows)) {
    return []
  }

  // Then get responses and comments for each tache
  const tachesWithDetails = await Promise.all(
    tacheRows.map(async (tache: any) => {
      const [responseRows] = await connection.execute(
        `SELECT id, message, support_name, support_id, created_at 
         FROM responses 
         WHERE tache_id = ? 
         ORDER BY created_at ASC`,
        [tache.id],
      )
      const [commentRows] = await connection.execute(
        `SELECT id, user_id, user_name, user_type, message, created_at 
         FROM task_comments 
         WHERE tache_id = ? 
         ORDER BY created_at ASC`,
        [tache.id],
      )

      return {
        ...tache,
        responses: Array.isArray(responseRows) ? responseRows : [],
        comments: Array.isArray(commentRows) ? commentRows : [],
      }
    }),
  )

  return tachesWithDetails
}

export async function getTacheById(tacheId: number) {
  const connection = getPool()
  const [rows] = await connection.execute(
    `SELECT *, COALESCE(total_session_time, 0) as total_session_time 
     FROM taches WHERE id = ?`,
    [tacheId],
  )

  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0] as any
  }
  return null
}

export async function createTache(tacheData: {
  employee_id: number
  employee_name: string
  title: string
  type: string
  category: string
  entite: string
  assigned_member_id?: number
  assigned_to_group?: boolean
  assigned_group_id?: number
  expiration?: string
  related_taches?: string
  pole: string
  canal: string
  description: string
  priority?: string
}) {
  const connection = getPool()
  const [result] = await connection.execute(
    `
    INSERT INTO taches (
      employee_id, employee_name, title, type, category, entite, 
      assigned_member_id, assigned_to_group, assigned_group_id,
      expiration, related_taches, pole, canal, description, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      tacheData.employee_id,
      tacheData.employee_name,
      tacheData.title,
      tacheData.type,
      tacheData.category,
      tacheData.entite,
      tacheData.assigned_member_id || null,
      tacheData.assigned_to_group || false,
      tacheData.assigned_group_id || null,
      tacheData.expiration || null,
      tacheData.related_taches || null,
      tacheData.pole,
      tacheData.canal,
      tacheData.description,
      tacheData.priority || "medium",
    ],
  )
  return result
}

export async function updateTache(
  tacheId: number,
  tacheData: {
    title: string
    type: string
    category: string
    entite: string
    assigned_member_id?: number
    assigned_to_group?: boolean
    assigned_group_id?: number
    expiration?: string
    related_taches?: string
    pole: string
    canal: string
    description: string
    priority?: string
  },
) {
  const connection = getPool()
  const [result] = await connection.execute(
    `
    UPDATE taches SET
      title = ?, type = ?, category = ?, entite = ?, 
      assigned_member_id = ?, assigned_to_group = ?, assigned_group_id = ?,
      expiration = ?, related_taches = ?, pole = ?, canal = ?, description = ?, priority = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    [
      tacheData.title,
      tacheData.type,
      tacheData.category,
      tacheData.entite,
      tacheData.assigned_member_id || null,
      tacheData.assigned_to_group || false,
      tacheData.assigned_group_id || null,
      tacheData.expiration || null,
      tacheData.related_taches || null,
      tacheData.pole,
      tacheData.canal,
      tacheData.description,
      tacheData.priority || "medium",
      tacheId,
    ],
  )
  return result
}

export async function updateTacheStatus(tacheId: number, status: string) {
  const connection = getPool()
  const [result] = await connection.execute(
    "UPDATE taches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, tacheId],
  )
  return result
}

export async function updateTacheSessionTime(tacheId: number, additionalSeconds: number) {
  const connection = getPool()
  const [result] = await connection.execute(
    "UPDATE taches SET total_session_time = COALESCE(total_session_time, 0) + ? WHERE id = ?",
    [additionalSeconds, tacheId],
  )
  return result
}

// Response operations
export async function createResponse(responseData: {
  tache_id: number
  support_id: number
  support_name: string
  message: string
}) {
  const connection = getPool()
  const [result] = await connection.execute(
    "INSERT INTO responses (tache_id, support_id, support_name, message) VALUES (?, ?, ?, ?)",
    [responseData.tache_id, responseData.support_id, responseData.support_name, responseData.message],
  )
  return result
}

// Comment operations
export async function createTaskComment(commentData: {
  tache_id: number
  user_id: number
  user_name: string
  user_type: string
  message: string
}) {
  const connection = getPool()
  const [result] = await connection.execute(
    "INSERT INTO task_comments (tache_id, user_id, user_name, user_type, message) VALUES (?, ?, ?, ?, ?)",
    [commentData.tache_id, commentData.user_id, commentData.user_name, commentData.user_type, commentData.message],
  )
  return result
}

// Session operations
export async function createOrUpdateTacheSession(sessionData: {
  tache_id: number
  user_id: number
  user_name: string
  user_type: string
}) {
  const connection = getPool()
  const [result] = await connection.execute(
    `
    INSERT INTO tache_sessions (tache_id, user_id, user_name, user_type, opened_at, last_activity)
    VALUES (?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE 
      last_activity = NOW(),
      user_name = VALUES(user_name),
      user_type = VALUES(user_type)
  `,
    [sessionData.tache_id, sessionData.user_id, sessionData.user_name, sessionData.user_type],
  )
  return result
}

export async function removeTacheSession(tacheId: number, userId: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM tache_sessions WHERE tache_id = ? AND user_id = ?", [
    tacheId,
    userId,
  ])
  return result
}

export async function getActiveTacheSessions(tacheId: number) {
  const connection = getPool()
  // Get sessions that have been active in the last 30 seconds
  const [rows] = await connection.execute(
    `
    SELECT user_id, user_name, user_type, opened_at, last_activity,
           TIMESTAMPDIFF(SECOND, opened_at, NOW()) as session_duration
    FROM tache_sessions 
    WHERE tache_id = ? 
    AND last_activity > DATE_SUB(NOW(), INTERVAL 30 SECOND)
    ORDER BY opened_at ASC
  `,
    [tacheId],
  )
  return rows
}

export async function cleanupInactiveSessions() {
  const connection = getPool()
  // Remove sessions that haven't been active for more than 1 minute
  const [result] = await connection.execute(
    "DELETE FROM tache_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 1 MINUTE)",
  )
  return result
}

export async function getTacheWithSessions(tacheId: number) {
  const connection = getPool()

  // Get the tache with total_session_time
  const [tacheRows] = await connection.execute(
    `SELECT *, COALESCE(total_session_time, 0) as total_session_time 
     FROM taches WHERE id = ?`,
    [tacheId],
  )

  if (!Array.isArray(tacheRows) || tacheRows.length === 0) {
    return null
  }

  const tache = tacheRows[0]

  // Get responses for this tache
  const [responseRows] = await connection.execute(
    `SELECT id, message, support_name, support_id, created_at 
     FROM responses 
     WHERE tache_id = ? 
     ORDER BY created_at ASC`,
    [tacheId],
  )

  // Get comments for this tache
  const [commentRows] = await connection.execute(
    `SELECT id, user_id, user_name, user_type, message, created_at 
     FROM task_comments 
     WHERE tache_id = ? 
     ORDER BY created_at ASC`,
    [tacheId],
  )

  // Get active sessions
  const sessions = await getActiveTacheSessions(tacheId)

  return {
    ...tache,
    responses: Array.isArray(responseRows) ? responseRows : [],
    comments: Array.isArray(commentRows) ? commentRows : [],
    activeSessions: sessions,
  }
}

// Settings operations
export async function getSettings() {
  const connection = getPool()
  const [rows] = await connection.execute("SELECT * FROM system_settings WHERE is_active = TRUE ORDER BY category, display_order, value")

  const settings = {
    priorities: [],
    statuses: [],
    categories: [],
    poles: [],
    canals: [],
    types: [],
  }

  if (Array.isArray(rows)) {
    rows.forEach((row: any) => {
      if (settings[row.category as keyof typeof settings]) {
        settings[row.category as keyof typeof settings].push(row)
      }
    })
  }

  return settings
}

export async function createSetting(category: string, value: string, color?: string) {
  const connection = getPool()
  const [result] = await connection.execute("INSERT INTO system_settings (category, value, color) VALUES (?, ?, ?)", [
    category,
    value,
    color || null,
  ])
  return result
}

export async function updateSetting(id: number, category: string, value: string, color?: string) {
  const connection = getPool()
  const [result] = await connection.execute("UPDATE system_settings SET category = ?, value = ?, color = ? WHERE id = ?", [
    category,
    value,
    color || null,
    id,
  ])
  return result
}

export async function deleteSetting(id: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM system_settings WHERE id = ?", [id])
  return result
}

// Email Group operations
export async function getEmailGroups() {
  const connection = getPool()
  const [rows] = await connection.execute(`SELECT * FROM email_groups ORDER BY name ASC`)
  return Array.isArray(rows)
    ? rows.map((row: any) => {
        let emailsArray: string[] = [];
        if (row.emails) {
          const rawEmailsString = String(row.emails); // Ensure it's a string
          console.log(`DEBUG: Raw emails string from DB for ID ${row.id}:`, rawEmailsString, `Type: ${typeof rawEmailsString}`);
          try {
            // Attempt to parse as JSON first
            const parsed = JSON.parse(rawEmailsString);
            // Ensure it's an array of strings
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                emailsArray = parsed;
            } else {
                throw new Error("Parsed JSON is not an array of strings.");
            }
          } catch (e) {
            console.error(`Error parsing emails for group ID ${row.id} as JSON. Falling back.`, e, `Raw data: "${rawEmailsString}"`);
            // Fallback: if JSON parsing fails, try splitting by comma
            if (typeof rawEmailsString === 'string' && rawEmailsString.includes(',')) {
                emailsArray = rawEmailsString.split(',').map(email => email.trim());
                console.warn(`WARN: Falling back to comma-separated parsing for ID ${row.id}. Result:`, emailsArray);
            } else if (typeof rawEmailsString === 'string' && rawEmailsString.trim() !== '') {
                // If it's a single email string not in JSON format, treat it as a single email
                emailsArray = [rawEmailsString.trim()];
                console.warn(`WARN: Treating as single email string for ID ${row.id}. Result:`, emailsArray);
            }
          }
        }
        return {
          ...row,
          emails: emailsArray,
        };
      })
    : [];
}

export async function createEmailGroup(groupData: {
  name: string
  description?: string
  emails: string[]
}) {
  const connection = getPool()
  const [result] = await connection.execute(
    "INSERT INTO email_groups (name, description, emails) VALUES (?, ?, ?)",
    [groupData.name, groupData.description || null, JSON.stringify(groupData.emails)],
  )
  return result
}

export async function updateEmailGroup(
  groupId: number,
  groupData: {
    name: string
    description?: string
    emails: string[]
  },
) {
  const connection = getPool()
  const [result] = await connection.execute(
    "UPDATE email_groups SET name = ?, description = ?, emails = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [groupData.name, groupData.description || null, JSON.stringify(groupData.emails), groupId],
  )
  return result
}

export async function deleteEmailGroup(groupId: number) {
  const connection = getPool()
  const [result] = await connection.execute("DELETE FROM email_groups WHERE id = ?", [groupId])
  return result
}