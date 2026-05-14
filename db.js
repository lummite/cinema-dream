// Database helper functions for the Cinema Dream app
const sql = require('mssql');

// Simplified connection: use explicit env vars. If DB_PORT is provided, connect by TCP port.
const DB_SERVER = process.env.DB_SERVER || 'localhost';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;
const DB_USER = process.env.DB_USER || undefined;
const DB_PASSWORD = process.env.DB_PASSWORD || undefined;
const DB_NAME = process.env.DB_NAME || 'cinema_dream';
const CONNECT_TIMEOUT = process.env.DB_CONNECT_TIMEOUT ? parseInt(process.env.DB_CONNECT_TIMEOUT, 10) : 60000;

const DEFAULT_OPTIONS = { encrypt: false, trustServerCertificate: true };

async function createPool() {
    if (!DB_USER || !DB_PASSWORD) {
        throw new Error('DB_USER and DB_PASSWORD must be set in environment for SQL authentication');
    }

    const cfg = {
        user: DB_USER,
        password: DB_PASSWORD,
        server: DB_SERVER,
        database: DB_NAME,
        options: DEFAULT_OPTIONS,
        connectionTimeout: CONNECT_TIMEOUT
    };

    if (DB_PORT) cfg.port = DB_PORT;

    const pool = await new sql.ConnectionPool(cfg).connect();
    return pool;
}

let poolPromise = null;
function getPool() {
    if (!poolPromise) {
        poolPromise = createPool().catch(err => {
            poolPromise = null; // allow retry
            throw err;
        });
    }
    return poolPromise;
}

async function getRandomMovies(limit = 8) {
    const pool = await getPool();
    const q = `SELECT TOP (${parseInt(limit, 10)}) id, title, cover_image FROM Movies ORDER BY NEWID()`;
    const res = await pool.request().query(q);
    return res.recordset;
}

async function getRandomSeries(limit = 8, mediaType = 'Сериал') {
    const pool = await getPool();
    const q = `SELECT TOP (${parseInt(limit, 10)}) id, title, cover_image FROM Series WHERE type=@type ORDER BY NEWID()`;
    const res = await pool.request().input('type', sql.NVarChar, mediaType).query(q);
    return res.recordset;
}

async function getAllMovies() {
    const pool = await getPool();
    const res = await pool.request().query("SELECT id, title, cover_image, year, rating FROM Movies ORDER BY title");
    return res.recordset;
}

async function getAllSeries() {
    const pool = await getPool();
    const res = await pool.request().query("SELECT id, title, cover_image, year, rating FROM Series WHERE type='Сериал' ORDER BY title");
    return res.recordset;
}

async function getAllAnime() {
    const pool = await getPool();
    const res = await pool.request().query("SELECT id, title, cover_image, year, rating FROM Series WHERE type='Аниме' ORDER BY title");
    return res.recordset;
}

async function getMovieGenres(movieId) {
    const pool = await getPool();
    const res = await pool.request().input('movieId', sql.VarChar, movieId.toString()).query(`
    SELECT g.name
    FROM MovieGenres mg
    JOIN Genres g ON mg.genre_id = g.id
    WHERE mg.movie_id = @movieId
  `);
    return res.recordset.map(r => r.name);
}

async function getSeriesGenres(seriesId) {
    const pool = await getPool();
    const res = await pool.request().input('seriesId', sql.VarChar, seriesId.toString()).query(`
    SELECT g.name
    FROM SeriesGenres sg
    JOIN Genres g ON sg.genre_id = g.id
    WHERE sg.series_id = @seriesId
  `);
    return res.recordset.map(r => r.name);
}

async function getAllGenres(category = 'movie') {
    const pool = await getPool();
    let q;
    if (category === 'movie') q = `SELECT DISTINCT g.name FROM Genres g JOIN MovieGenres mg ON g.id = mg.genre_id JOIN Movies m ON m.id = mg.movie_id`;
    else q = `SELECT DISTINCT g.name FROM Genres g JOIN SeriesGenres sg ON g.id = sg.genre_id JOIN Series s ON s.id = sg.series_id`;
    const res = await pool.request().query(q);
    return res.recordset.map(r => r.name);
}

async function getMovieById(movieId) {
    const pool = await getPool();
    const res = await pool.request().input('id', sql.VarChar, movieId.toString()).query('SELECT * FROM Movies WHERE id = @id');
    return res.recordset[0] || null;
}

async function getSeriesById(seriesId) {
    const pool = await getPool();
    const res = await pool.request().input('id', sql.VarChar, seriesId.toString()).query('SELECT * FROM Series WHERE id = @id');
    return res.recordset[0] || null;
}

async function getEpisodesBySeriesId(seriesId) {
    const pool = await getPool();
    const res = await pool.request().input('seriesId', sql.VarChar, seriesId.toString()).query(`
        SELECT * FROM Episodes
        WHERE season_id IN (
            SELECT id FROM Seasons WHERE series_id = @seriesId
        )
        ORDER BY season_id ASC, episode_number ASC
    `);
    return res.recordset;
}

async function getMoviesFiltered({ year, rating, sort, genres } = {}) {
    const pool = await getPool();
    let query = `
    SELECT DISTINCT m.id, m.title, m.cover_image, m.year, m.rating
    FROM Movies m
    LEFT JOIN MovieGenres mg ON m.id = mg.movie_id
    LEFT JOIN Genres g ON mg.genre_id = g.id
    WHERE 1=1
  `;
    const request = pool.request();

    if (year) {
        query += ' AND m.year = @year';
        request.input('year', sql.Int, year);
    }
    if (rating) {
        query += ' AND m.rating >= @rating';
        request.input('rating', sql.Float, rating);
    }
    if (genres && genres.length) {
        const placeholders = genres.map((g, i) => `@g${i}`).join(',');
        query += ` AND g.name IN (${placeholders})`;
        genres.forEach((g, i) => request.input(`g${i}`, sql.NVarChar, g));
    }
    if (sort) {
        if (sort === 'year-new') query += ' ORDER BY m.year DESC';
        else if (sort === 'year-old') query += ' ORDER BY m.year ASC';
        else if (sort === 'alpha-asc') query += ' ORDER BY m.title ASC';
        else if (sort === 'alpha-desc') query += ' ORDER BY m.title DESC';
    }

    const res = await request.query(query);
    return res.recordset;
}

async function getSeriesAnimeFiltered(mediaType, { year, rating, sort, genres } = {}) {
    const pool = await getPool();
    let query = `
    SELECT DISTINCT s.id, s.title, s.cover_image, s.year, s.rating
    FROM Series s
    LEFT JOIN SeriesGenres sg ON s.id = sg.series_id
    LEFT JOIN Genres g ON sg.genre_id = g.id
    WHERE s.type = @mediaType
  `;
    const request = pool.request().input('mediaType', sql.NVarChar, mediaType);

    if (year) {
        query += ' AND s.year = @year';
        request.input('year', sql.Int, year);
    }
    if (rating) {
        query += ' AND s.rating >= @rating';
        request.input('rating', sql.Float, rating);
    }
    if (genres && genres.length) {
        const placeholders = genres.map((g, i) => `@g${i}`).join(',');
        query += ` AND g.name IN (${placeholders})`;
        genres.forEach((g, i) => request.input(`g${i}`, sql.NVarChar, g));
    }
    if (sort) {
        if (sort === 'year-new') query += ' ORDER BY s.year DESC';
        else if (sort === 'year-old') query += ' ORDER BY s.year ASC';
        else if (sort === 'alpha-asc') query += ' ORDER BY s.title ASC';
        else if (sort === 'alpha-desc') query += ' ORDER BY s.title DESC';
    }

    const res = await request.query(query);
    return res.recordset;
}

module.exports = {
    getRandomMovies,
    getRandomSeries,
    getAllMovies,
    getAllSeries,
    getAllAnime,
    getMovieGenres,
    getSeriesGenres,
    getAllGenres,
    getMovieById,
    getSeriesById,
    getEpisodesBySeriesId,
    getMoviesFiltered,
    getSeriesAnimeFiltered
};
