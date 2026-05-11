const fs = require('fs');
const crypto = require('crypto');

const USERS_FILE = '../users.json';

// Хранилище сессий в памяти
const sessions = {};

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return check === hash;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware — проверяет токен, редиректит если не авторизован
function requireAuth(req, res, next) {
  const token = req.headers['authorization'] || req.query.token;
  if (sessions[token]) {
    req.user = sessions[token]; // { userId, username }
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Роуты авторизации — подключаются в server.js
function setupAuthRoutes(app) {
  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Введите логин и пароль' });
    if (username.length < 3)
      return res.status(400).json({ error: 'Логин минимум 3 символа' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const users = readUsers();
    if (users.find(u => u.username === username))
      return res.status(409).json({ error: 'Пользователь уже существует' });

    users.push({
      id: Date.now(),
      username,
      password: hashPassword(password),
      createdAt: new Date().toISOString()
    });
    writeUsers(users);

    res.json({ message: 'Регистрация успешна' });
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user || !verifyPassword(password, user.password))
      return res.status(401).json({ error: 'Неверный логин или пароль' });

    const token = generateToken();
    sessions[token] = { userId: user.id, username: user.username };

    res.json({ token, username: user.username });
  });

  app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization'];
    delete sessions[token];
    res.json({ message: 'Выход выполнен' });
  });

  app.get('/api/me', (req, res) => {
    const token = req.headers['authorization'];
    const session = sessions[token];
    if (!session) return res.status(401).json({ error: 'Не авторизован' });
    res.json({ username: session.username });
  });
}

function getSession(token) {
  return sessions[token]
}

module.exports = { setupAuthRoutes, requireAuth, getSession };