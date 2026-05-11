require('dotenv').config()
const express = require('express')
const path = require('path')
const db = require('./db')
const comments = require('./comments')
const exphbs = require('express-handlebars')

const app = express()

const port = process.env.PORT || 4000

const MEDIA_FOLDER = path.join(process.cwd(), 'media')

const auth = require('./auth/auth')

app.set('views', path.join(__dirname, 'views'))
app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts')
}))
app.set('view engine', 'hbs')

app.use('/static', express.static(path.join(__dirname, 'static')))
app.use('/media', express.static(MEDIA_FOLDER))
app.use('/covers', express.static(MEDIA_FOLDER))

app.use(express.json())

app.get('/', async (req, res) => {
    try {
        const movies = await db.getRandomMovies(8)
        const series = await db.getRandomSeries(8, 'Сериал')
        const anime = await db.getRandomSeries(8, 'Аниме')
        res.render('index', { movies, series, anime })
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/content', async (req, res) => {
    let category = req.query.category || 'movies'
    if (category === 'movie') category = 'movies'
    if (category === 'series') category = 'serials'

    try {
        let title, items
        if (category === 'movies') {
            title = 'Фильмы'
            items = await db.getAllMovies()
        } else if (category === 'serials') {
            title = 'Сериалы'
            items = await db.getAllSeries()
        } else if (category === 'anime') {
            title = 'Аниме'
            items = await db.getAllAnime()
        } else {
            title = 'Категория'
            items = []
        }
        res.render('content', { title, items, category })
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/player/:content_type/:item_id', async (req, res) => {
    const { content_type, item_id } = req.params
    //console.log('Player request:', content_type, item_id)

    try {
        if (content_type === 'movies') {
            const item = await db.getMovieById(parseInt(item_id, 10))
            //console.log('Movie item:', item ? item.id : 'null')
            if (!item) return res.status(404).send('Элемент не найден')
            const genres = await db.getMovieGenres(parseInt(item_id, 10))
            const video_file = item.movie_file
            const itemComments = comments.getComments('movie', item_id)
            res.render('player', { item, type: 'movies', title: item.title, genres, video_file, comments: itemComments })
        } else if (content_type === 'serials') {
            const item = await db.getSeriesById(parseInt(item_id, 10))
            //console.log('Series item:', item ? item.id : 'null')
            if (!item) return res.status(404).send('Элемент не найден')
            const genres = await db.getSeriesGenres(parseInt(item_id, 10))
            const episodes = await db.getEpisodesBySeriesId(parseInt(item_id, 10))
            if (!episodes || episodes.length === 0) return res.status(404).send('Эпизоды не найдены')
            const video_file = episodes[0].movie_file
            const itemComments = comments.getComments('series', item_id)
            res.render('player', { item, type: 'series', title: item.title, genres, video_file, comments: itemComments })
        } else if (content_type === 'anime') {
            const item = await db.getSeriesById(parseInt(item_id, 10))
            //console.log('Anime item:', item ? item.id : 'null')
            if (!item) return res.status(404).send('Элемент не найден')
            const genres = await db.getSeriesGenres(parseInt(item_id, 10))
            const episodes = await db.getEpisodesBySeriesId(parseInt(item_id, 10))
            if (!episodes || episodes.length === 0) return res.status(404).send('Эпизоды не найдены')
            const video_file = episodes[0].movie_file
            const itemComments = comments.getComments('anime', item_id)
            res.render('player', { item, type: 'anime', title: item.title, genres, video_file, comments: itemComments })
        } else {
            res.status(404).send('Элемент не найден')
        }
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/api/search', async (req, res) => {
    const query = (req.query.query || '').trim().toLowerCase()
    if (!query) return res.json([])
    try {
        const results = []
        const movies = await db.getAllMovies()
        const series = await db.getAllSeries()
        const anime = await db.getAllAnime()

        movies.forEach(m => { if (m.title && m.title.toLowerCase().includes(query)) results.push({ id: m.id, title: m.title, type: 'movies' }) })
        series.forEach(s => { if (s.title && s.title.toLowerCase().includes(query)) results.push({ id: s.id, title: s.title, type: 'serials' }) })
        anime.forEach(a => { if (a.title && a.title.toLowerCase().includes(query)) results.push({ id: a.id, title: a.title, type: 'anime' }) })

        res.json(results)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/api/filter', async (req, res) => {
    let category = req.query.category || 'movies'
    if (category === 'movie') category = 'movies'
    if (category === 'series') category = 'serials'
    const year = req.query.year ? parseInt(req.query.year, 10) : null
    const rating = req.query.rating ? parseFloat(req.query.rating) : null
    const sort = req.query.sort
    const genres = req.query['genres[]'] ? (Array.isArray(req.query['genres[]']) ? req.query['genres[]'] : [req.query['genres[]']]) : []
    try {
        let items = []
        if (category === 'movies') items = await db.getMoviesFiltered({ year, rating, sort, genres })
        else if (category === 'serials') items = await db.getSeriesAnimeFiltered('Сериал', { year, rating, sort, genres })
        else if (category === 'anime') items = await db.getSeriesAnimeFiltered('Аниме', { year, rating, sort, genres })
        res.json(items)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/api/genres', async (req, res) => {
    let category = req.query.category || 'movies'
    if (category === 'movie') category = 'movies'
    if (category === 'series') category = 'serials'
    try {
        const normalized = category === 'movies' ? 'movie' : category === 'serials' ? 'series' : 'anime'
        const genres = await db.getAllGenres(normalized)
        res.json(genres)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get('/api/comments', async (req, res) => {
    const itemType = req.query.type
    const itemId = req.query.id
    if (!itemType || !itemId) return res.status(400).json({ error: 'Неверные параметры' })
    if (!['movies', 'series', 'anime'].includes(itemType)) return res.status(400).json({ error: 'Неверный тип контента' })

    try {
        const result = comments.getComments(itemType, itemId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.post('/api/comments', async (req, res) => {
    console.log('Received comment POST:', req.body);
    const token = req.headers['authorization']
    const session = auth.getSession(token)
    if (!session) return res.status(401).json({ error: 'Не авторизован' })

    let { itemType, itemId, rating, text } = req.body
    if (!itemType || !itemId || typeof rating === 'undefined' || typeof text === 'undefined') {
        return res.status(400).json({ error: 'Неверные данные комментария' })
    }

    if (itemType === 'movies') itemType = 'movie'
    if (itemType === 'serials') itemType = 'series'

    if (!['movie', 'series', 'anime'].includes(itemType)) {
        return res.status(400).json({ error: 'Неверный тип контента' })
    }

    const ratingValue = parseInt(rating, 10)
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 10) {
        return res.status(400).json({ error: 'Оценка должна быть от 1 до 10' })
    }

    const cleanText = String(text).trim()
    const words = cleanText.split(/\s+/).filter(Boolean)
    if (words.length > 100) {
        return res.status(400).json({ error: 'Отзыв не должен превышать 100 слов' })
    }
    if (cleanText.length === 0) {
        return res.status(400).json({ error: 'Отзыв не может быть пустым' })
    }

    try {
        const comment = comments.upsertComment({
            itemType,
            itemId,
            userId: session.userId,
            username: session.username,
            rating: ratingValue,
            text: cleanText
        })
        res.json(comment)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

auth.setupAuthRoutes(app)

app.listen(port, () => console.log(`Server started on http://localhost:${port}`))
