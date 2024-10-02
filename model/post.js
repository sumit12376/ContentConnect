const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    date: {
        type: String,
        default: () => new Date().toISOString().slice(0, 10) // Returns the date as YYYY-MM-DD
    },
    
    content: String,
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: []
    }]

    
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
