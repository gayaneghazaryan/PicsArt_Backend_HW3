const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const {v4: uuid4} = require('uuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const e = require('express');
const saltRounds = 10;

const app = express();

const dataPath = "./db/fakedb.json";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static(__dirname))
app.use(multer({dest:"uploads"}).single("filedata"));


const getData = () => {

    let data = fs.readFileSync(dataPath);
    return JSON.parse(data);

}


const saveData = (data) => {
    let stringifyData = JSON.stringify(data)
    fs.writeFileSync(dataPath,stringifyData)
}


app.post('/users/register',(req,res) => {

    let data = getData();
    let id = uuid4();

    let emails = data['users'].map((element) => {
        return element.email;
    })

    if(emails.includes(req.body.email)) {
        res.send("Email already exists")
    }

    let password = req.body.password;

    if(password.length > 6) 
    {

        bcrypt.genSalt(saltRounds,function(err,salt) {
            bcrypt.hash(password,salt, function(err,hash) {

                if(!err) {

                    let obj = {
                        "id": id,
                        "username":req.body.username,
                        "email":req.body.email,
                        "password": hash,
                        "token":""
                    }


                    data['users'].push(obj);
                    saveData(data);

                    res.send(obj)
                }
                else {
                    res.sendStatus(401);
                }
            
            });
        });
    }

})

app.post('/users/login',(req,res) => {
    let data = getData();
    let token = uuid4();
    let email = req.body.email;

    let emails = data['users'].map((element) => {
        return element.email;
    })

    let user = data['users'].find(element => {
        if(element.email == email) {
            return element;
        }
    })

    let index = data['users'].indexOf(user)


    if(emails.includes(email)){
        bcrypt.compare(req.body.password,user.password,function(err,result) {
            if(result) {
                data['users'][index]['token'] = token;
                saveData(data);

                setTimeout(()=> {
                    data['users'][index]['token'] = "";
                    saveData(data);
                },10000)
                res.send("Successfully logged in")
            }else {
                res.send("Invalid password");
            }
    })

    }
    else {
        res.send("Invalid email")
    }

})


app.post('/users/upload/:id', (req,res) => {
    const filedata = req.file;
    const userId = req.params.id;
    const data = getData();
    const user = data['users'].find(element => {
        if(element.id === userId) {
            return element;
        }
    })
    const token = user['token'];
    
    console.log(filedata);

    if(token) {
        'image/jpg','image/jpeg','image/png','image/gif'
        if(filedata) {
            if(filedata.mimetype === 'image/jpg' || filedata.mimetype === 'image/jpeg' || filedata.mimetype === 'image/png' || filedata.mimetype === 'image/jpg') {
                let file = {
                    id: uuid4(),
                    title: filedata.filename,
                    path: filedata.path,
                    authorId: userId
            
                }
            
                data["photos"].push(file);
                saveData(data);
                res.send("Uploaded")
            } else {
                res.send("Invalid format")
            }
        } else {
            res.send("no file data found")
        }
    } else {
        res.send("invalid token")
    }


})


app.listen(8080,()=> {
    console.log("start")
})