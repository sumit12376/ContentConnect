const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: { type: Number, min: 0 }, // Added min validation for age
    name: { type: String },
    password: { type: String, required: true },
    profilepic:{
        type:String,
        default:"default.png"
    },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});
const userModel = mongoose.model('user', userSchema);
module.exports = userModel;
