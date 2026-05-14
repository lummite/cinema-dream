const fs = require('fs')

const COMMENTS_FILE = './comments.json'

// Load comments from disk, create file if needed
function readComments() {
    if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, '[]')
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'))
}

// Save comments back to the JSON file
function writeComments(comments) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2))
}

// Return comments for the requested item, newest first
function getComments(itemType, itemId) {
    const comments = readComments()
    return comments
        .filter(comment => comment.itemType === itemType && String(comment.itemId) === String(itemId))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
}

// Add or update a user's comment for a content item
function upsertComment({ itemType, itemId, userId, username, rating, text }) {
    const comments = readComments()
    const existing = comments.find(comment =>
        comment.itemType === itemType &&
        String(comment.itemId) === String(itemId) &&
        String(comment.userId) === String(userId)
    )

    const now = new Date().toISOString()

    if (existing) {
        existing.rating = rating
        existing.text = text
        existing.updatedAt = now
        writeComments(comments)
        return existing
    }

    const newComment = {
        id: Date.now(),
        itemType,
        itemId: String(itemId),
        userId: String(userId),
        username,
        rating,
        text,
        createdAt: now,
        updatedAt: now
    }

    comments.push(newComment)
    writeComments(comments)
    return newComment
}

module.exports = { getComments, upsertComment }
