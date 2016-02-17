var Positions = function() {

    var Location = function() {
        var error = function(error) {
            if (error.code == 1) {
                console.error("PERMISSION_DENIED: User denied access to their location");
            } else if (error.code === 2) {
                console.error("POSITION_UNAVAILABLE: Network is down or positioning satellites cannot be reached");
            } else if (error.code === 3) {
                console.error("TIMEOUT: Calculating the user's location too took long");
            } else {
                console.error("Unexpected error code")
            }
        };

        return {
            get: function (success) {
                if (typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined") {
                    navigator.geolocation.getCurrentPosition(success, error);
                } else {
                    console.error("Your browser does not support the HTML5 Geolocation API, so this demo will not work.")
                }
            }
        };
    };

    var Renderer = function() {
        var positionsElmt = document.getElementById("positions");
        var statusElmt = document.getElementById("status");

        return {
            add: function (key, value) {
                var child = document.createElement("div");
                child.id = key;
                child.appendChild(document.createTextNode(value.lat + ", " + value.lng));
                positionsElmt.appendChild(child);
            },
            remove: function (key) {
                positionsElmt.removeChild(document.getElementById(key));
            },
            update: function (key, value) {
                document.getElementById(key).innerHTML = value.lat + ", " + value.lng;
            },
            status : function(message) {
                statusElmt.innerHTML = message;
            }
        };
    };

    var Log = function() {
        var logElmt = document.getElementById("log");
        var log = [];

        return {
            log: function (entry) {
                log.push(entry);
                var child = document.createElement("div");
                child.appendChild(document.createTextNode(entry));
                logElmt.appendChild(child);
            }
        };
    };

    var Register = function(renderer) {
        var locationKey = null;
        var previousLocation = {};

        return {
            init: function () {
                new Location().get(function (location) {
                    var firebase = new Firebase("https://ourmap.firebaseio.com/");
                    var post = {lat: location.coords.latitude, lng: location.coords.longitude};

                    // Show the position of an added position
                    firebase.on("child_added", function (snapshot) {
                        Log().log("Child added. Rendering child");
                        renderer.add(snapshot.key(), snapshot.val())
                    });

                    // Remove the position from display when the position is removed
                    firebase.on("child_removed", function (snapshot) {
                        renderer.remove(snapshot.key(), snapshot.val());
                        if(this.locationKey == snapshot.key()) {
                            this.locationKey = null;
                            Log().log("You lost connection. Refresh to reconnect");
                        }
                    });

                    // Update the position in display when the position is updated
                    firebase.on("child_changed", function (snapshot) {
                        Log().log("Child changed. Rendering change.");
                        renderer.update(snapshot.key(), snapshot.val())
                    });

                    // Add the user position to Firebase
                    firebase.push(post).then(function (ref) {
                        // Remove the user position from Firebase when the user disconnects
                        this.locationKey = ref.key();
                        firebase.child(ref.key()).onDisconnect().remove();
                    });

                    // Update the user position every 1 second
                    setInterval(function() {
                        new Location().get(function (location) {
                            var onComplete = function(error) {
                                if(error) {
                                    Log().log("Synchronization failed");
                                } else {
                                    Log().log("Synchronization succeeded")
                                }
                            };

                            renderer.status("Your position: " + location.coords.latitude + ", " + location.coords.longitude +
                                ", updated " + new Date());

                            if(this.locationKey !== null && (location.coords.latitude !== previousLocation.lat || location.coords.longitude !== previousLocation.lng)) {
                                // Update the user position to Firebase
                                Log().log("Detected change in location. Updating Firebase");
                                firebase.child(this.locationKey).set({
                                    lat: location.coords.latitude,
                                    lng: location.coords.longitude
                                }, onComplete);
                            }

                            previousLocation = { lat : location.coords.latitude, lng : location.coords.longitude };
                        });
                    }, 1000);
                });
            }
        };
    };

    return {
        init : function() {
            var renderer = new Renderer();
            new Register(renderer).init();
        }
    };

};