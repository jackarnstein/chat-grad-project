(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        var self = this;
        var unseen = {};

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
            ).then (setTimeout(self.updateMessageLogs(), 2000));
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
            console.log("Retrieve " + targetUser.id + " message logs and " + unseen[targetUser.id] + " unseen");
            $http.get("/api/conversations/" + targetUser.id).then(function(result) {
                $scope.conversations = result.data;
                $scope.target = targetUser;
                if(unseen[targetUser.id] === true) {
                    console.log(targetUser.id + " being sent a seen message");
                    $http.put("/api/conversations/" + $scope.target.id, {
                        seen: true
                    });
                    unseen[$scope.target.id] = false;
                }
            });
            console.log(targetUser.id + " message logs retrieved ----");
        };

        self.createMessage = function(user, msg) {
            console.log("message to " + user.id + "being sent");
            var time = new Date().getTime();
            $http.post("/api/conversations/" + user.id, {
                sent: time,
                body: msg.body
            }).then(function(response) {
                self.resetMessage();
                    self.getMessageLog(user);
                    self.updateMessageLogs();
                }
            );
            console.log("message to " + user.id + "has been sent");
        };

        setTimeout(function() {
            console.log("firing refresh");
          setTimeout(self.updateMessageLogs(), 2000);
        });

        self.checkUnreceived = function(userQuery){
            //console.log(userQuery.id + " has " + unseen[userQuery.id] + " unread messages");
            if(unseen[userQuery.id]===true){
                return true;
            }
           // console.log(" therefore returning false");
            $("#chatbox").prop({ scrollTop: $("#chatbox").prop("scrollHeight") });
            return false;
        }

        self.updateMessageLogs = function() {
            console.log("setting up logs which are unseen");
            $http.get("/api/conversations/").then(function(result) {
                $scope.received = result.data;
                if($scope.received){
                    for(var i = 0; i < $scope.received.length; i++) {
                       unseen[$scope.received[i].user] = true;
                    }
                }
            });
            console.log("logs set to unseen");
        };

        self.deleteConversation = function(targetUser) {
            console.log("delete conversation for: " + targetUser.id);
            var response = $http.delete("/api/conversations/" + targetUser.id)
                .then(function (response) {
                    console.log(response);
                });
        }

        self.createGroup = function(targetUser){
            console.log("create group button clicked");



            $http.put("/api/groups/" + "othergroup", {
                title:"hello"
            });
        }
    })
})();
