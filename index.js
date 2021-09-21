const express = require('express');
const bp = require('body-parser');
const mongoose = require('mongoose');
const { ObjectId } = require('bson');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {v4: uuid4} = require('uuid');
const Schema = mongoose.Schema;
const app = express();
const secret = "SecretMessage"
const saltRounds = 10;


mongoose.connect('mongodb://localhost:27017/instagram');

app.use(bp.json());
app.use(bp.urlencoded({extended:true}))

//SCHEMAS AND MODELS
const userSchema = new Schema({
    username: String,
    email:String,
    password: String, 
    token: String

})

const User = mongoose.model('user', userSchema)

const postSchema = new Schema({
    title: String,
    description: String, 
    userId: ObjectId
})

const Post = mongoose.model('post', postSchema)

const commentSchema = new Schema({
    text: String,
    userId: ObjectId,
    postId: ObjectId
})

const Comment = mongoose.model('comment', commentSchema)


//REGISTER
app.post("/register", function(req, res) {
    let password = req.body.password;

    User.findOne( {
        $or: [{
            email: req.body.email
        }, {
            username: req.body.username
        }]
    }).then(user => {
        if(user) {
            let error = "";
            if(user.username == req.body.username) {
                error = "Username already exists";
            } else if(user.email == req.body.email) {
                error = "Email already exists";
            }
            return res.send(error);
        } else {

            if(password.length > 6) {

                bcrypt.genSalt(saltRounds, function(err, salt) {
                    bcrypt.hash(password, salt, function(err, hash) {
                        if(err) {
                            res.sendStatus(401);
                        }

                        const user = new User({
                            username: req.body.username,
                            email: req.body.email,
                            password: hash,
                            token: ""
                        })
                        
                        user.save(function(err) {
                            if(err) {
                                res.send(err)
                            }
                            res.send("user saved")
                        })
                    })
                })
            } else {
                res.send("Invalid password")
            }

        }
    })  

})

//LOGIN
app.post('/login', async function(req, res) {
    let token = uuid4();
    
    User.findOne({email: req.body.email}, function(err, user) {
        if(err){
            res.send(err);
        }

        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if(result) {
                user.token = token;
                               
                setTimeout(() => {
                    user.token = "";
                },1000)
                user.save(function(err) {
                    if(err) {
                        res.send(err)
                    }
                    res.send("user logged in")
                })
                
            } else {
                res.send("error")
            }
        })

    })
      
})


//USERS
app.get('/users', (req, res) => {

    User.find({}, function(err, docs) {
        if(err) {
            res.send(err)
        }
        res.send(docs)
    })
})

app.get('/user/:id', (req, res) => {
    const id = req.params.id;
    User.findById(id, function (err, doc) {
        if(err) {
            res.send(err)
        }
        res.send(doc)
    })
})


app.put('/user/:id', (req, res) => {
    const userData = {
        name: req.body.name,
        age: req.body.age
    }
    const id = req.params.id;
    User.findByIdAndUpdate(id, userData, function(err) {
        if(err) {
            res.send(err)
        }
        res.send("User Updated")

    })
})

app.delete('/user/:id', (req, res) => {
    const id = req.params.id;

    User.findByIdAndDelete(id, function(err) {
        if(err) {
            res.send(err);
        }
        res.send("User Deleted");
    })
})


//POSTS
app.post('/user/:id/posts', (req, res) => {
    //save
    const token = req.headers['x-access-token'] || req.body.token;


    User.findOne({email: req.body.email}, function(err, user) {
        if(err) {
            res.send(err);
        }
    
        const post = new Post({
            title: req.body.title,
            description: req.body.description,
            userId: user._id
        })
    
        post.save(function(err) {
            if(err) {
                res.send(err)
            }
            res.send("Post Saved")
        })

    })


    
})

app.get('/user/:id/posts', (req, res) => {
    Post.find({}, function(err, doc) {
        if(err) {
            res.send(err)
        }
        res.send(doc)
    })
})

app.get('/user/:id/post/:postId', (req, res) => {
    const postId = req.params.postId;
    Post.findById(postId, function(err, doc) {
        if(err) {
            res.send(err)
        }
        res.send(doc)
    })
})

app.put('/user/:id/post/:postId', (req, res) => {
    const postId = req.params.postId;

    User.findOne({email:req.body.email}, function(err, user) {
        if(err) {
            res.send(err);
        }

        if(!user) {
            res.send("No such user exists")
        }
        if(user.token) {
            const postData = {
                title: req.body.title,
                description: req.body.description,
                userId: req.body.userId
            }
            if(user._id == postData.userId) {
                Post.findByIdAndUpdate(postId, postData, function(err) {
                    if(err) {
                        res.send(err)
                    }
                    res.send("Post Updated")
                })
            }else {
                res.send("The user does not have authentification to edit the post")
            }
        } else {
            res.send("Invalid token")
        }
    })
    
})


app.delete('/user/:id/post/:postId', (req, res) => {
    const postId = req.params.postId;
    User.findOne({email: req.body.email}, function(err, user) {
        if(err) {
            res.send(err);
        }

        if(!user) {
            res.send("No such user exists")
        }

        if(user.token) {
            Post.findByIdAndDelete(postId, function(err) {
                if(err) {
                    res.send(err)
                }
                res.send("Post Deleted")
            })
        } else {
            res.send("Invalid token")
        }


    })
})


//COMMENTS
app.post('/user/:id/post/:postId/comments', (req, res) => {
    
    const comment = new Comment({
        text: req.body.text,
        userId: req.params.id,
        postid: req.params.postId
    })

    comment.save(function(err) {
        if(err) {
            res.send(err)
        }
        res.send("comment saved")
    })


    
})

app.get('/user/:id/post/:postId/comments', (req, res) => {
    Comment.find({}, function(err, doc) {
        if(err) {
            res.send(err)
        }
        res.send(doc)
    })
})

app.get('/user/:id/post/:postId/comment/:commentId', (req, res) => {
    const commentId = req.params.commentId;
    Comment.findById(commentId, function(err, doc) {
        if(err) {
            res.send(err)
        }
        res.send(doc)
    })
})

app.put('/user/:id/post/:postId/comment/:commentId', (req, res) => {
    const commentId = req.params.commentId;

    User.findOne({email:req.body.email}, function(err, user) {
        if(err) {
            res.send(err);
        }

        if(!user) {
            res.send("No such user exists")
        }
        if(user.token) {
            const commentData = {
                text: req.body.text,
                userId: req.body.userId,
                postId: req.body.postId
            }

            if(user._id == commentData.userId) {
                Comment.findByIdAndUpdate(commentId, commentData, function(err) {
                    if(err) {
                        res.send(err)
                    }
                    res.send("Comment Updated")
                })
            }else {
                // res.send("The user does not have authentification to edit the comment")
                res.send(commentData.userId)
                
            }
        } else {
            res.send("Invalid token")
        }
    })


    
})


app.delete('/user/:id/post/:postId/comment/:commentId', (req, res) => {
    const commentId = req.params.commentId;
    User.findOne({email: req.body.email}, function(err, user) {
        if(err) {
            res.send(err);
        }

        if(!user) {
            res.send("No such user exists")
        }

        if(user.token) {
            Comment.findByIdAndDelete(commentId, function(err) {
                if(err) {
                    res.send(err)
                }
                res.send("Comment Deleted")
            })
        } else {
            res.send("Invalid token")
        }


    })
})


app.listen(3000);