var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var _ = require('underscore-contrib');

module.exports = function(port, db, githubAuthoriser) {
    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    app.use(express.static("public"));
    app.use(bodyParser.json());
    app.use(cookieParser());

    var users = db.collection("users");
    var conversations = db.collection("conversations");
    var groups = db.collection("groups");
    var sessions = {};

    http.listen(3000, function(){
        console.log('listening on *:3000');
    });

    io.on('connection', function(socket){
        console.log('a user connected');
        socket.on('disconnect', function(){
            console.log('user disconnected');
            });
        socket.on('postMessage', function(msg){
            console.log('message socket stuff done');
            app.post("/api/conversations/:id", function(req, res) {
                var sent = req.body.sent;
                var body = req.body.body;
                console.log(body);
                conversations.insertOne({
                    seen: false,
                    from: req.session.user,
                    to: req.params.id,
                    sent: sent,
                    body: body
                });
                res.status(201).send(req.id);
            });

            socket.emit('update', app.get("/api/conversations/:id", function(req, res) {
                var userId = req.params.id;
                console.log(userId);
                conversations.find().toArray(function(err, docs) {
                    docs = docs.filter(function(conversation) {
                        if ((conversation.to === userId || conversation.from === userId) &&
                            (conversation.to === req.session.user || conversation.from === req.session.user))
                        {
                            return conversation;
                        }
                    });
                    docs = docs.sort(function(a ,b){return a.sent - b.sent});
                    if (!err) {
                        res.json(docs.map(function(conversation) {
                            return {
                                sent: conversation.sent,
                                body: conversation.body,
                                from: conversation.from,
                                to:   conversation.to,
                                seen: conversation.seen
                            };

                        }));
                    } else {
                        res.sendStatus(500);
                    }
                });
            }));
        });
    });

    app.get("/oauth", function(req, res) {
        githubAuthoriser.authorise(req, function(githubUser, token) {
            if (githubUser) {
                users.findOne({
                    _id: githubUser.login
                }, function(err, user) {
                    if (!user) {
                        // TODO: Wait for this operation to complete
                        users.insertOne({
                            _id: githubUser.login,
                            name: githubUser.name,
                            avatarUrl: githubUser.avatar_url
                        });
                    }
                    sessions[token] = {
                        user: githubUser.login
                    };
                    res.cookie("sessionToken", token);
                    res.header("Location", "/");
                    res.sendStatus(302);
                });
            }
            else {
                res.sendStatus(400);
            }

        });
    });

    app.get("/api/oauth/uri", function(req, res) {
        res.json({
            uri: githubAuthoriser.oAuthUri
        });
    });

    app.use(function(req, res, next) {
        if (req.cookies.sessionToken) {
            req.session = sessions[req.cookies.sessionToken];
            if (req.session) {
                next();
            } else {
                res.sendStatus(401);
            }
        } else {
            res.sendStatus(401);
        }
    });

    app.get("/api/user", function(req, res) {
        users.findOne({
            _id: req.session.user
        }, function(err, user) {
            if (!err) {
                res.json(user);
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.get("/api/users", function(req, res) {
        users.find().toArray(function(err, docs) {
            if (!err) {
                res.json(docs.map(function(user) {
                    return {
                        id: user._id,
                        name: user.name,
                        avatarUrl: user.avatarUrl
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.post("/api/conversations/:id", function(req, res) {
        var sent = req.body.sent;
        var body = req.body.body;
        console.log(body);

        conversations.insertOne({
            seen: false,
            from: req.session.user,
            to: req.params.id,
            sent: sent,
            body: body
        });

        //
        //conversations.insertOne({
        //    seen: false,
        //    to: req.session.user,
        //    from: req.params.id,
        //    sent: sent,
        //    body: body
        //});
        res.status(201).send(req.id);
    });

    app.get("/api/conversations/:id", function(req, res) {
        var userId = req.params.id;
        console.log(userId);
        conversations.find().toArray(function(err, docs) {
            docs = docs.filter(function(conversation) {
                if ((conversation.to === userId || conversation.from === userId) &&
                (conversation.to === req.session.user || conversation.from === req.session.user))
                {
                    return conversation;
                }
            });
            docs = docs.sort(function(a ,b){return a.sent - b.sent});
            if (!err) {
                res.json(docs.map(function(conversation) {
                    return {
                        sent: conversation.sent,
                        body: conversation.body,
                        from: conversation.from,
                        to:   conversation.to,
                        seen: conversation.seen
                    };

                }));
            } else {
                res.sendStatus(500);
            }
        });
    });


    app.get("/api/conversations/", function(req, res) {
        var check = req.session.user;
        console.log("USER:");
        console.log(check);

        //find all conversations which the user has partaken in
        conversations.find().toArray(function(err, docs) {
            if (!err) {
            docs = docs.filter(function (conversation) {
                if ((conversation.to === req.session.user && conversation.from !== req.session.user)) {
                    return conversation;
                }
            });

            //try to filter out the ones which arent new
            docs = docs.filter(function (conversation) {
                if (!conversation.seen){
                    return conversation;
                }
            });
            var messageMap = {};
            for(var i = 0; i < docs.length; i++)
            {
                if(messageMap[docs[i].from] == null) {
                    messageMap[docs[i].from] = docs[i];
                }
                else if(messageMap[docs[i].from].sent<docs[i].sent) {
                    messageMap[docs[i].from] = docs[i];
                }
            }

            res.json(_.values(messageMap).map(function(conversation) {
                return {
                    user: conversation.from,
                    lastMessage: conversation.body,
                    unseen: true
                };
            }));
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.put("/api/conversations/:id", function(req, res) {
        console.log("trying to set conversation to seen");
        var user = req.session.user;
        var sender = req.params.id;
        conversations.update(
            {to: user, from: sender, seen: false},
            {$set:{seen:true}},
            {multi:true}
        );
        console.log("conversation set to seen");

    });

    app.put("/api/groups/:id", function(req, res) {
        console.log("Trying to make a new group");

        var groupID = req.params.id;
        console.log("looking for existing group called: " +groupID);

        groups.findOne({
            _id: req.params.id
        }, function(err, group) {
            console.log(group);
            if (group != null) {
                // TODO: Wait for this operation to complete
                groups.update(
                {_id: req.params.id},
                {$set:{title:req.params.title}},
                {multi:false}
            );
            res.sendStatus(200);
            } else {
                groups.insertOne({
                    _id: req.params.id,
                    title: req.params.title
                });
                res.sendStatus(201);
            }
        });
    });



    app.delete("/api/conversations/:id", function(req,res) {
        console.log("making delete request");
        var targetUser = req.params.id;
        conversations.remove({
                from:req.session.user, to: targetUser
            }, {
            multi:true
        });
    });

    return app.listen(port);
};
