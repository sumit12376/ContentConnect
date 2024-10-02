require('dotenv').config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const userModel = require('./model/user');
const postModel = require('./model/post');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.error('MongoDB connection error:', err);
});


    app.get('/home', isLogin, (req, res) => {
        const currentUser = req.currentuser || null; 
        console.log(currentUser)
        res.render('home', { currentUser }); 
    });
    
    app.get('/', (req, res) => {
        const currentUser = req.currentuser
        
        res.render('home', { currentUser }); 
    });
    
app.get('/create', (req, res) => {
    res.render('index');
});
app.get('/post/:user', isLogin, async (req, res) => {
    const username = req.params.user; 

    try {
        let user = await userModel.findOne({ _id: username }).populate('posts');
        console.log("post hai ye", user);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const currentUser = req.currentuser; 
        return res.render('posts', { user, currentUser }); 
    } catch (error) {
        console.error("Profile fetch error:", error);
        return res.status(500).send("Server error"); 
    }
});


app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;

    try {
        let user = await userModel.findOne({ email: email });
        if (user) return res.status(409).send("User is already registered");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await userModel.create({
            username: username,
            email: email,
            age: age,
            name: name,
            password: hash
        });

        let token = jwt.sign({ email: email, userid: newUser._id }, "sumit");
        res.cookie("token", token);
        res.redirect('/login')
    } catch (error) {
        res.status(500).send("Server error");
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await userModel.findOne({ email: email });
        if (!user) return res.status(401).send("User not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            let token = jwt.sign({ email: email, userid: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.cookie("token", token,{maxAge:30*24*60*60*1000 , httpOnly: true,
                secure: false});
            return res.status(200).redirect('/profile');
        } else {
            return res.status(401).send("Invalid credentials");
        }
    } catch (error) {
        res.status(500).send("Server error");
    }
});

app.get('/like/:id', isLogin, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user");
        const userId = req.currentuser.userid;
        const likeIndex = post.likes.indexOf(userId);

        if (likeIndex === -1) {
            post.likes.push(userId);
        } else {
            post.likes.pull(userId);
        }

        await post.save();
        res.redirect('/allposts');
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).send("Server error");
    }
});


app.get('/remove/:id', isLogin, async (req, res) => {
    try {
        const userId = req.currentuser.userid;
        const post = await postModel.findOne({ _id: req.params.id });
        if (!post) {
            return res.status(404).send("Post not found");
        }
        if (post.user.toString() !== userId) {
            return res.status(403).send("You are not authorized to delete this post");
        }

        // Remove the post
        await postModel.deleteOne({ _id: req.params.id });

        res.redirect('/profile');
    } catch (error) {
        console.error("Error removing post:", error);
        res.status(500).send("Server error");
    }
});
app.get('/allposts', isLogin, async (req, res) => {
    try {
        const posts = await postModel.find().populate("user");
        console.log("user populate hai ye",posts)
        const currentUser = req.currentuser;
        res.render('allpost', { posts, user: currentUser }); 
        
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Server error");
    }
});



app.get('/profile', isLogin, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.currentuser.email }).populate('posts');
        const currentUser = req.currentuser;
        res.render('profile', { user, users: currentUser});
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).send("Server error");
    }
});

app.get('/logout', (req, res) => {
    res.cookie("token", "", { maxAge: 0 });
    res.redirect('/');
});

function isLogin(req, res, next) {
    if (!req.cookies.token || req.cookies.token === "") {
        return res.status(401).redirect('/login');
    }

    try {
        let data = jwt.verify(req.cookies.token,  process.env.JWT_SECRET);
        req.currentuser = data;
        next();
    } catch (error) {
        return res.status(401).send("Invalid token");
    }
}

app.post('/post', isLogin, async (req, res) => {
    let user = await userModel.findOne({ email: req.currentuser.email });
    let { content } = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});

const PORT = process.env.PORT || 3000; // Use the PORT from the .env file or fallback to 3000

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

