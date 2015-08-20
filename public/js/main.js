(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        var self = this;
        var unseen = {};
        var socket = io();

        //Trace connection status to server
        socket.on("connect", function () {
                console.log("User knows connected to server");
        });

        //Send message over socket
        self.createMessage = function(user, msg) {
            var time = new Date().getTime();
            socket.emit("postMessage", $http.post("/api/conversations/" + user.id, {
                sent: time,
                body: msg.body
            }));
            self.resetMessage();
            //self.updateMessageLogs(); <--- dont do this, creating doesnt mean update
            //not until the sever has confirmed it has received the message
        };

        //The message was received by the server so need to update
        socket.on("update", function() {
            console.log ("Chathost, time to update");
            self.getMessageLog($scope.target);
            self.updateMessageLogs();
        });


        self.updateMessageLogs = function() {
            $http.get("/api/conversations/").then(function(result) {
                $scope.received = result.data;
                if($scope.received){
                    for(var i = 0; i < $scope.received.length; i++) {
                        unseen[$scope.received[i].user] = true;
                    }
                }
            });
        };








        socket.on("update", function() {
            console.log ("Chathost, time to update");
            self.getMessageLog($scope.target);
            self.updateMessageLogs();
        });

        socket.on("receive", function() {
            console.log ("Message received");
            self.updateMessageLogs();
        });

            $scope.loggedIn = false;
            $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                $scope.loginUri = result.data.uri;
            }
            );
        });

        self.newMessage = {
            body: ""
        };

        self.resetMessage = function(){
            self.newMessage = {
                body: ""
            };
        };

        self.newGroup = {
            title: ""
        };

        self.resetGroup = function(){
            self.newGroup = {
                title: ""
            };
        };

        function extract(result) {
            return result.data;
        }

        self.getMessageLog = function(targetUser) {
            $http.get("/api/conversations/" + targetUser.id).then(function(result) {
                $scope.conversations = result.data;
                $scope.target = targetUser;
                if(unseen[targetUser.id] === true) {
                    $http.put("/api/conversations/" + $scope.target.id, {
                        seen: true
                    });
                    unseen[$scope.target.id] = false;
                }
            });
        };

        self.checkUnreceived = function(userQuery) {
            if(unseen[userQuery.id]===true){
                return true;
            }
           // console.log(" therefore returning false");
            $("#chatbox").prop({ scrollTop: $("#chatbox").prop("scrollHeight") });
            return false;
        };



        self.deleteConversation = function(targetUser) {
            var response = $http.delete("/api/conversations/" + targetUser.id)
                .then(function (response) {
                    console.log(response);
                });
        };

        self.createGroup = function(targetUser) {
            $http.put("/api/groups/" + "newwerrgroup", {
                title:"hello"
            });
        };
    });
})();
