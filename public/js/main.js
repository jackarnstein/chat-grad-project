(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http, $rootScope) {
        var self = this;
        var unseen = {};
        $scope.socket = null;
        $scope.loggedIn = false;
        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
            $scope.getSockets();
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                    $scope.loginUri = result.data.uri;
                }
            );
        });

        $scope.getSockets = function(){
            $scope.socket = io();
            console.log("setting up sockets");
            //Trace connection status to server
            $scope.socket.on("connect", function () {
                $scope.socket.emit("login", $scope.user._id);
                console.log("User knows connected to server");
                $scope.socket.on("update", function(msg) {
                    console.log ("Update function called in client socket");
                    self.getMessageLog($scope.target);
                    self.updateMessageLogs();
                    $rootScope.$apply(function() {
                        $scope.conversations.push(msg);
                    });
                });
            });
        };

        //Send message over socket
        self.createMessage = function(recipient, msg) {
            console.log("creating message");
            var time = new Date().getTime();
            var message = {
                sent: time,
                body: msg.body,
                to: recipient.id,
                from: $scope.user._id
            };
            console.log("sending message from client");
            $scope.socket.emit("postMessage", message);
            self.resetMessage();
        };



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
