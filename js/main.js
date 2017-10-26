// Init App
var myApp = new Framework7({
    modalTitle: 'Project Appss',
    // Enable Material theme
    material: true,
});

// Expose Internal DOM library
var $$ = Dom7;

// Add main view
var mainView = myApp.addView('.view-main', {
});

// Global Variables
var Db = {};
var Strg = {};
var Loaded, user, userRef, adminRef, carRef, carRead, storageRef, topupHistRef, historyRef, historyRead, topupHistRead, storageuserRef;
var colorTheme = "aliceblue";
var rate, selfset = false, selectedCar = false, selectedLocation = false, checkPromo = false;
var expired = false, extendDuration;

// Global user position Var
var user_pos = {
    lat: 0,
    lng: 0,
    city: 'none',
    full_addr: 'none'
};
var geo_accuracy;
//------------------------------------------
// Check Whether User has signed in or not
//------------------------------------------
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        if (!user.emailVerified) {                // Reminder: NOT the condition.
            // email succesfully verified
            // User is signed in.
            $$('.index-preloader').show();
            initUserInfo();
            Loaded = 0;
            // Load local storage after 5 seconds.
            setTimeout(function () {
                console.log('Timedout');
                if (!Loaded) {
                    Db.admin = JSON.parse(localStorage.getItem('admin'));
                    Strg.logo = JSON.parse(localStorage.getItem('logo'));
                    Strg.icon = JSON.parse(localStorage.getItem('icon'));
                    Db.user = JSON.parse(localStorage.getItem('user'));
                    if (Db.user) { // local storage available
                        console.log('Unable to load from firebase. Local storage used instead.');
                        console.log(Db.user);
                        mainView.router.loadPage("main.html");
                        $$('.index-preloader').hide();
                    }
                    else {
                        console.log('Neither cache nor DB available. Please wait.')
                        // You gotta wait for firebase DB then :/
                    }

                }
                else console.log('Global DB initialized correctly. Local storage is not used.');
            }, 10000);
        }
        else {
            // not yet verifiy email
            myApp.alert('An email verification has been sent to you. Please verify it before signing in.', 'Notification');
            firebase.auth().signOut().then(function () { }).catch(function (error) { });
        }
    }
    else {
        // User signed out.
        // Turn off .on() listeners here.
    }
});

function initUserInfo() {
    user = firebase.auth().currentUser;
    userRef = firebase.database().ref('users/' + user.uid);
    adminRef = firebase.database().ref('admin');
    carRef = userRef.child('cars');
    historyRef = userRef.child('history');
    topupHistRef = userRef.child('topup_history');
    storageRef = firebase.storage().ref();
    storageuserRef = storageRef.child('users/' + user.uid);
    userRef.on('value',
        // Succeeded promise
        function (snapshot) {
            console.log('Promise succees from DB.');
            Db.user = snapshot.val();
            localStorage.setItem('user', JSON.stringify(Db.user));
            if (!Loaded) { mainView.router.loadPage("main.html"); Loaded = 1; } // Route to main.html only once.
            $$('.index-preloader').hide();
            console.log(Db.user);
            carRead = Db.user.cars;
            historyRead = Db.user.history;
            topupHistRead = Db.user.topup_history;
            refreshActiveHistory();
        },
        // Failed promise
        function (err) {
            console.log(err);
        }
    );
    adminRef.on('value', function (snapshot) {
        Db.admin = snapshot.val();
        localStorage.setItem('admin', JSON.stringify(Db.admin));
        rate = Db.admin.token_per_minute / 60000;
        Strg.logo = {};
        Strg.icon = {};
        for (var promoCompany in Db.admin.promotions) {
            (function (promoC) {
                storageRef.child('logo/' + promoC + '.png').getDownloadURL().then(function (url) {
                    Strg.logo[promoC] = url;
                })
            })(promoCompany);
            (function (promoC) {
                storageRef.child('icon/' + promoC + '_marker.png').getDownloadURL().then(function (url) {
                    Strg.icon[promoC] = url;
                })
            })(promoCompany);
        }
        var strgIntrv = setInterval(function () {
            var finishLogo = false, finishIcon = false;
            if (Strg.logo.length == Db.admin.promotions.length) {
                localStorage.setItem('logo', JSON.stringify(Strg.logo));
                finishLogo = true;
            }
            if (Strg.icon.length == Db.admin.promotions.length) {
                localStorage.setItem('icon', JSON.stringify(Strg.icon));
                finishIcon = true;
            }
            if (finishLogo && finishIcon) {
                clearInterval(strgIntrv);
            }
        })
    })
}

//----------------------------------
// Forget Password button function
//----------------------------------
$$('#forget-password').on('click', function () {
    myApp.prompt('Enter your email address below and a password reset email will be sent to you.', 'Forget Password?', function (fp_email) {
        if (fp_email === "") {
            myApp.alert('Please try again to enter your email address.', 'Error');
        }
        else {
            firebase.auth().sendPasswordResetEmail(fp_email).then(function () {
                // Email sent.
                myApp.alert("Email is sent.");
            }).catch(function (error) {
                // An error happened.
            });
        }
    });
});

//--------------------------
// Login Authentication
//-------------------------
$$('.button-login').on('click', function () {
    var si_email = $$('.user-email').val();
    var si_password = $$('.password').val();

    firebase.auth().signInWithEmailAndPassword(si_email, si_password).catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === "auth/user-disabled")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode === "auth/invalid-email")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode === "auth/user-not-found")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode == "auth/wrong-password")
            myApp.alert(errorMessage, 'Error');
    });
})

//--------------------
// Go to Sign up Page
//--------------------
$$('.button-signup').on('click', function () {
    mainView.router.loadPage("signup.html");
})

//---------------------------
// Function to remove vehicle
//---------------------------
// Vehicle Tab - Remove vehicle via cancel icon
function removeVehicle(item) {
    
    myApp.modal({
        title: 'Delete?',
        buttons: [
            {
                text: 'Cancel',
                onClick: function () {/* Do Nothing */ }
            },
            {
                text: 'Ok',
                onClick: function () {
                    $$('.actively-parking-car').each(function () {
                        if ($$(this).find('#car-icon').text().replace(/drive_eta/g, '') == $$(item).closest('.card').find('.owned-car').text()) {
                            $$(this).remove();
                        }
                    })
                    carRef.child($$(item).closest('.card').find('.owned-car').text()).remove();
                    $$(item).closest('.card').remove()
                }
            },
        ]
    })
}

// Vehicle tab - Load specific vehicle history via routing
function loadSpecificTransaction(carPlate) {
    var uid = firebase.auth().currentUser.uid;
    var pageContentHeader = '<div data-page="vehicle-history" class="page"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="#" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center">History</div> </div> </div> <div class="page-content vehicle-history-page">';
    var pageContentFooter = '</div></div>';
    var pageContent = '';

    var history = Db.user.cars[carPlate].history; // Clone it to prevent async bugs
    for (var eachHistory in history) {
        var historyInstance = history[eachHistory];

        // For readability purpose
        var str1 = '<div class="card"> <div class="card-header">';
        var loc = historyInstance.address;
        var str2 = '</div> <div class="card-footer"> <div class="col-75">';
        var dur = historyInstance.duration;
        var str3 = '</div> <div class="col-25">';
        var total = historyInstance.amount;
        var str4 = '</div> </div> </div>';

        pageContent += (str1 + loc + str2 + dur + str3 + total + str4);
        $$('.vehicle-history-page').append(str1 + loc + str2 + dur + str3 + total + str4);
    }
    mainView.loadContent(pageContentHeader + pageContent + pageContentFooter);
}

//---------------------------------
//Function to refresh active card
//--------------------------------
function refreshActiveHistory() {
    $$('.actively-parking-car').each(function () {
        var ownedCarPlate = $$(this).find('#car-icon').text().replace(/drive_eta/g, '');
        var endTime = carRead[ownedCarPlate].parking.timestamp + carRead[ownedCarPlate].parking.duration;
        var remainTime = endTime - Date.now();
        var timeVal;
        var timeUnit;
        var progress;

        //refresh for the progress bar
        var duration = carRead[ownedCarPlate].parking.duration;

        var dataProgress = Math.floor((((duration - remainTime) / duration) * 100));
        var percentProgress = dataProgress - 100;

        strDataProgress = ''+ dataProgress +''
        document.getElementById('progressbar'+ownedCarPlate+'').setAttribute("data-progress", strDataProgress);

        var strProgressbar = 'transform: translate3d(' + percentProgress + '%, 0px, 0px);'
        document.getElementById('innerProgressbar' + ownedCarPlate + '').setAttribute("style", strProgressbar);

        if (remainTime > 999) {

            if (timestamp2Time(remainTime).second >= 60) {
                if (timestamp2Time(remainTime).minute >= 60) {
                    timeVal = timestamp2Time(remainTime).hour;
                    timeUnit = 'hour';
                    if (timestamp2Time(remainTime).hour > 1) {
                        timeUnit += 's';
                    }
                }
                else {
                    timeVal = timestamp2Time(remainTime).minute;
                    timeUnit = 'minute';
                    if (timestamp2Time(remainTime).minute > 1) {
                        timeUnit += 's';
                    }
                }
            }
            else {
                timeVal = timestamp2Time(remainTime).second;
                timeUnit = 'second';
                if (timestamp2Time(remainTime).second > 1) {
                    timeUnit += 's';
                }
            }
            $$(this).find('#lbl-time-left').html(timeVal);
            $$(this).find('#lbl-time-remain').html(timeUnit + '<br />remaining');
        }
        else {
            $$(this).remove();
            for (var ownedCarPlate in carRead) {
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(9999999999999 -parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
                        }).then(function () {
                            refreshHistory();
                            })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                    }
                }
            }
        }
    });
}

//-------------------------------------
//          Show History
//-------------------------------------
function showHistory() {
    var historyStackDate = null; //Stack Date for date checking
    var historyStampIndex = 0; //Index stamping for date
    historyCurrentIndex = 0;
    var historyCounter;
    if (historyRead == null) {
        historyCounter = 0;
    }
    else {
        historyCounter = Object.keys(historyRead).length;
    }

    var historyList = new Array(); //historyList
    for (var eleMent in historyRead) {
        var historyDate = new Date(historyRead[eleMent].startTime);
        //Grouping of same date
        if (historyStackDate === null) {                                 //--------Starting
            historyStackDate = historyDate;
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            //Check for last iteration
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }
        else if (historyStackDate.getYear() === historyDate.getYear() &&
            historyStackDate.getMonth() === historyDate.getMonth() &&
            historyStackDate.getDate() === historyDate.getDate()) {      //--------Same date
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }
        else {                                                          //--------Next date checked
            showMeHistory();
            historyStackDate = historyDate;                             //--------Stack the new date for date grouping
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }

        //History output

        function showMeHistory() {
            var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            var historyTemplate = "";
            for (historyTempIndex = historyStampIndex; historyTempIndex < historyCurrentIndex; historyTempIndex++) {
                historyTime = new Date(historyList[historyTempIndex].startTime);
                var historyTemp2 = '<li class="accordion-item" id="histInfo' + [historyTempIndex] + '1">' +
                    '<a href="#" class="item-content item-link">' +
                    '<div class="item-inner" style="background-color:'+colorTheme+'" id="histItem">' +
                    '<div id="car-icon" class="item-title"><i class="material-icons">directions_car</i>' + historyList[historyTempIndex].carPlate + '</div>' +
                    '<div class="item-after"><div id="histInfo">' + addZeroHist(historyTime.getHours()) + ":" + addZeroHist(historyTime.getMinutes()) + '<br>' + historyList[historyTempIndex].city +'</div>' +
                    '</div> ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="history-car-plate"><i class="material-icons">directions_car</i> <b >' + historyList[historyTempIndex].carPlate + '<br> </b> </div>' +
                    '<div id="history-info">' +
                    '<div><i class="material-icons">place</i>' + historyList[historyTempIndex].city +'</div>' +
                    '<div><i class="material-icons">access_time</i> ' + historyTime.getDate() + ' ' + monthNames[historyStackDate.getMonth()] + ' ' + historyTime.getFullYear() + ' ' + addZeroHist(historyTime.getHours()) + ':' + addZeroHist(historyTime.getMinutes()) + '</div>' +
                    '<div><i class="material-icons">hourglass_empty</i> ' + historyList[historyTempIndex].duration + '</div>' +
                    '<div><i class="material-icons">attach_money</i> ' + historyList[historyTempIndex].amount + ' tokens</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</li>';
                function addZeroHist(i) {
                    if (i < 10) {
                        i = "0" + i;
                    }
                    return i;
                }
                historyTemplate += historyTemp2;

            }
            historyStampIndex = historyCurrentIndex;
            var historyTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + historyStackDate.getDate() + '<sub><sup>' + monthNames[historyStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + historyTemplate;
            $$("#show-history").append(historyTemp1);

        }
    }
    historyList = [];
}

function refreshHistory() {
    clearBox('show-history');
    showHistory();
}
function clearBox(id) {
    document.getElementById(id).innerHTML = "";
}


//-------------------------------------
//        Show Topup History
//------------------------------------

function showTopupHist() {
    var topupHistStackDate = null; //Stack Date for date checking
    var topupHistStampIndex = 0; //Index stamping for date
    topupHistCurrentIndex = 0;
    var topupHistList = new Array(); //topuphistoryList
    var topupHistCounter;
    if (topupHistRead == null) {
        topupHistCounter = 0;
    }
    else {
        topupHistCounter = Object.keys(topupHistRead).length;
    }
    for (var topupElement in topupHistRead) {
        var topupHistDate = new Date(topupHistRead[topupElement].topup_time);

        //Grouping of same date
        if (topupHistStackDate === null) {                                 //--------Starting
            topupHistStackDate = topupHistDate;
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            //Check for last iteration
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }
        else if (topupHistStackDate.getYear() === topupHistDate.getYear() &&
            topupHistStackDate.getMonth() === topupHistDate.getMonth() &&
            topupHistStackDate.getDate() === topupHistDate.getDate()) {      //--------Same date
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }
        else {                                                          //--------Next date checked
            showMeTopupHist();
            topupHistStackDate = topupHistDate;                             //--------Stack the new date for date grouping
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }

        //History output

        function showMeTopupHist() {
            var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            var monthNameFull = new Array("January", "February", "March", "April", "May", "Jun", "July", "August", "September", "October", "November", "December");
            var topupHistTemplate = "";
            for (topupHistTempIndex = topupHistStampIndex; topupHistTempIndex < topupHistCurrentIndex; topupHistTempIndex++) {
                topupHistTime = new Date(topupHistList[topupHistTempIndex].topup_time);
                var topupHistTemp2 = '<li class="accordion-item" id="topupHistInfo' + [topupHistTempIndex] + '1">' +
                    '<a href="#"  class="item-content item-link" >' +
                    '<div class="item-inner" style="background-color:' + colorTheme +'" id="topupHistItem">' +
                    '<div id="topup-icon" class="item-title"> <i class="material-icons">credit_card</i> -XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '</div>' +
                    '<div class="item-after"><div>RM ' + topupHistList[topupHistTempIndex].amount + '</div>' +
                    '</div > ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="topup-info">' +
                    '<div><i class="material-icons">access_time</i>' + topupHistTime.getDate() + ' ' + monthNameFull[topupHistStackDate.getMonth()] + ' ' + topupHistTime.getFullYear() + '<br></div>' +
                    '<div><i class="material-icons">attach_money</i> RM ' + topupHistList[topupHistTempIndex].amount + '<br></div>' +
                    '<div><i class="material-icons">credit_card</i>XXXX-XXXX-XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '<br> (exp: ' + topupHistList[topupHistTempIndex].expired_date + ')</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</li>';

                function addZeroHist(i) {
                    if (i < 10) {
                        i = "0" + i;
                    }
                    return i;
                }
                topupHistTemplate += topupHistTemp2;
            }
            topupHistStampIndex = topupHistCurrentIndex;
            var topupHistTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + topupHistStackDate.getDate() + '<sub><sup>' + monthNames[topupHistStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + topupHistTemplate;
            $$("#show-topup-hist").append(topupHistTemp1);

        }
    }
}

function refreshTopupHist() {
    clearBox('show-topup-hist');
    showTopupHist();
}

myApp.onPageInit('profile-settings', function (page) {

});
myApp.onPageInit('profile-help', function (page) {

});
function myactive() {
    $$("#tab-profile").addClass("active")
    $$("#tab-park").removeClass("active")
}

function myactive() {
    $$("#tab-profile").addClass("active")
    $$("#tab-park").removeClass("active")
}

myApp.onPageInit('main', function (page) {
    console.log(Db);
    var tokenNO, tokenReq, tokenBal, parkDuration, carPlate, confirmText;
    var ownedCar, timeStamp;

    //-----------------------
    //Initiate UI
    //-----------------------
    myApp.showIndicator();
    var waitLoading = setTimeout(function () {
        myApp.hideIndicator();
        myApp.alert('Poor internet connection.', 'Notification');
    }, 10000);
    var waitIntrv = setInterval(function () {
        if (Db.user && Db.admin) {
            clearInterval(waitIntrv);
            console.log("Loading completed")
            myApp.hideIndicator();
            clearTimeout(waitLoading);
            //Initiate duration selection bar info
            getDuration();

            //Get cars and update

            for (var ownedCarPlate in carRead) {
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                var parkingPromocode = carRead[ownedCarPlate].parking.promocode;
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            promocode: parkingPromocode,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(9999999999999 - parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
                        }).then(function () {
                            refreshHistory();
                        })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                    }
                }
            }

            // Init vehicle tab
            var cars = Db.user.cars;
            for (var displayCarPlate in cars) {//write to UI
                var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li> <a class="item-content item-link"  onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                var str2 = '</div><div class="cards-item-title">'
                var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link" style="display: none">cancel</i></div></div> </a > </li></ul></div></div></div>';
                //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
                $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
            }

            // flip delete 
            $$('.flip-cancel').on('click', function () {

                var something = $$(this).attr('state');
                console.log(something);


                if ($$(this).attr('state') == 'open') {
                    $$('#sub-tab-vehicle').empty();
                    var cars = Db.user.cars;
                    for (var displayCarPlate in cars) {//write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block" style="background-color: LightGray"><ul><li><div class="item-content item-link"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><a href="#" onclick="removeVehicle(this);" class="override-icon-color"><i class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></a></div></div></div></li></ul></div></div></div>';

                        $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                    }
                    $$('.vehicle-cancel').show();
                    $$(this).attr('state', 'close');

                }

                else if ($$(this).attr('state') == 'close') {
                    $$('#sub-tab-vehicle').empty();
                    var cars = Db.user.cars;
                    for (var displayCarPlate in cars) {//write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></div></div></a></li></ul></div></div></div>';

                        $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                    }

                    $$(this).attr('state', 'open');
                    $$('.floating-button').click();
                }


            });



            //Get tokens
            userRef.child('balance').on('value', function (snapshot) {
                $$('.token').html(+snapshot.val());
            })

            //Get History of Active Car
            var activeCarRead = carRead;
            for (var activeCarPlate in activeCarRead) {
                var activeStatus = activeCarRead[activeCarPlate].parking.active;
                var activeAmount = activeCarRead[activeCarPlate].parking.amount;
                var activeDuration = activeCarRead[activeCarPlate].parking.duration;
                var activeTimestamp = activeCarRead[activeCarPlate].parking.timestamp;
                var activeLocation = activeCarRead[activeCarPlate].parking.location;
                var activeCity = activeCarRead[activeCarPlate].parking.city;
                var activePromo = activeCarRead[activeCarPlate].parking.promocode;
                if (activeStatus) {
                    //write data to UI
                    var activeAddress, promoCode = null;
                    var current_time = Date.now();
                    var end_time = activeTimestamp + activeDuration;
                    var end_time_dis = new Date(end_time);
                    var remain_time = end_time - current_time;
                    var time_unit, time_val;
                    if (timestamp2Time(remain_time).second >= 60) {
                        if (timestamp2Time(remain_time).minute >= 60) {
                            time_val = timestamp2Time(remain_time).hour;
                            time_unit = 'hour';
                            if (timestamp2Time(remain_time).hour > 1) {
                                time_unit += 's';
                            }
                        }
                        else {
                            time_val = timestamp2Time(remain_time).minute;
                            time_unit = 'minute';
                            if (timestamp2Time(remain_time).minute > 1) {
                                time_unit += 's';
                            }
                        }
                    }
                    else {
                        time_val = timestamp2Time(remain_time).second;
                        time_unit = 'second';
                        if (timestamp2Time(remain_time).second > 1) {
                            time_unit += 's';
                        }
                    }

                    if (activePromo == "")
                        activePromo = "Nothing is used!"

                    var dataProgress = Math.floor((((activeDuration - remain_time) / activeDuration) * 100));
                    var percentProgress = dataProgress - 100;
                    var str_active = '<li class="actively-parking-car">' +
                        '<a href="#" data-popover=".popover-active' + activeCarPlate + '" class="item-link item-content open-popover">' +
                        '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                        '<div id="car-icon" class="item-title"><i class="material-icons">drive_eta</i>' + activeCarPlate + '</div>' +
                        '<input id="timestamp-active-end" value="' + end_time + '" />' +
                        '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                        '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                        '</div>' +
                        '<div class="item-subtitle active-car-location">' + user_pos.city + '</div>' +
                        '</div>' +
                        '</a>' +
                        '<div class="popover popover-active' + activeCarPlate + '" id="popover-active">' +
                        '<div class="popover-angle"></div>' +
                        '<div class="popover-inner">' +
                        '<div class="content-block">' +
                        '<div id="active-car-plate">' + activeCarPlate + '</div>' +
                        '<div id="location"></div><br />' +
                        '<div id="promo">Promotion used: ' + activePromo + '</div>' +
                        '<div id="lbl-time">Expected End Time:</div>' +
                        '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                        '<div id="lbl-btns">Press button to extend or terminate the parking time.</div><br/>' +
                        '<div id="btns">' +
                        '<a class="button button-fill button-raised" id="terminate-btn" onclick="terminateParkingTime(\'' + activeCarPlate + '\',this)">Terminate</a>' +
                        '<a class="button button-fill button-raised" id="extend-btn" onclick="extendParkingTime(\'' + activeCarPlate + '\',this)">Extend</a>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<span class="progressbar" id="progressbar' + activeCarPlate + '" data-progress="' + dataProgress + '">' +
                        '<span class="" id="innerProgressbar' + activeCarPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                        '</span>'
                    '</li>';
                    $$('#ulist-active').append(str_active);
                    $$('.actively-parking-car').each(function () {
                        if ($$(this).find('#active-car-plate').text() === activeCarPlate) {
                            $$(this).find('.active-car-location').html('<i class="material-icons">place</i>' + activeCity);
                            $$(this).find('#location').html(activeCity);
                        }
                    })
                }
            }
        }
    },100)

    //---------------------------------------
    // Get Car Select List from Vehicle Tab
    //---------------------------------------

    $$('.select-car-menu').on('click', function () {
        $$('.car-choice').remove();
        ownedCar = [];

        $$('.owned-car').each(function () {
            ownedCar.push($$(this).text());
        });

        if (ownedCar.length <= 0) {
            myApp.alert('Please add your car', 'Notification');
        }
        else {
            var availableCar = 0;
            for (var ownedCarPlate in carRead) {
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(9999999999999 -parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
                        }).then(function () {
                            refreshHistory();
                        })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                        $$(".select-car").append(
                            '<li class="car-choice"><label class="label-radio item-content">' +
                            '<input type="radio" name="car-plate" value="' + ownedCarPlate + '" />' +
                            '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                            '<div class="item-inner">' +
                            '<div class="item-title">' + ownedCarPlate + '</div>' +
                            '</div>' +
                            '</label></li>'
                        );
                        availableCar++;
                    }
                }
                else {
                    $$(".select-car").append(
                        '<li class="car-choice"><label class="label-radio item-content">' +
                        '<input type="radio" name="car-plate" value="' + ownedCarPlate + '" />' +
                        '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                        '<div class="item-inner">' +
                        '<div class="item-title">' + ownedCarPlate + '</div>' +
                        '</div>' +
                        '</label></li>'
                );
                    availableCar++;
                }
            }
            if (availableCar == 0) {
                myApp.alert('All car is currently not available', 'Notification')
            }
        }
        //--------------------
        // Get Selected Car
        //--------------------
        $$('.car-choice').on('click', function () {
            console.log('ok')
            carPlate = $$(this).find('input[name=car-plate]').val();
            $$('.selected-car-plate').html(carPlate);
            $$('.selected-car-logo').css('color', 'blue');
            selectedCar = true;
            myApp.closeModal();
        })
    });

    //----------------------
    //Get Selected Duration
    //----------------------
    function getDuration() {
        parkDuration = +$$('.park-duration').val();
        tokenReq = (parkDuration * rate);
        $$('.selected-duration').html(clockPass(parkDuration));
        $$('.selected-park-duration').html(timestamp2Time(parkDuration).shortName);
        $$('.required-token').html(tokenReq);
    }

    getDuration();

    setInterval(function () {
        getDuration();
    }, 60000)

    $$('.park-duration').on('input', function () {
        getDuration();
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment').on('click', function () {
        if (selectedCar && selectedLocation && parkDuration > 0) {
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Park Until&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {

                tokenNo = Db.user.balance;
                tokenBal = tokenNo - tokenReq;
                if (tokenBal < 0) {
                    myApp.alert('Insufficient balance.', 'Notification');
                }
                else {
                    myApp.modal({
                        title: 'Payment confirmed',
                        text: 'Nearbyshop might have some special promotions for YOU! Get FREE tokens by watching their promotion videos',
                        verticalButtons: true,
                        buttons: [
                            {
                                text: 'Check it out',
                                onClick: function () {
                                    mainView.router.loadPage("promotion.html");
                                }
                            },
                            {
                                text: 'Nevermind',
                                onClick: function () {
                                    //Do nothing
                                }
                            }
                        ]
                    })
                    userRef.update({
                        balance: tokenBal
                    })
                    $$('.token').html(+tokenBal);
                    $$('.selected-car-plate').html('Select Car');
                    $$('.selected-location').html('Location');
                    $$('.selected-car-logo').css('color', 'inherit');
                    $$('.selected-location-logo').css('color', 'inherit');
                    selectedCar = false;
                    selectedLocation = false;
                    myApp.showTab('#tab-history');
                    myApp.showTab('#active');
                    var timestamp = Math.floor(Date.now());
                    carRef.child(carPlate).child('parking').update({
                        active: true,
                        amount: tokenReq,
                        timestamp: timestamp,
                        duration: parkDuration,
                        location: { lat: user_pos.lat, lng: user_pos.lng },
                        city: user_pos.city
                    })

                    //write data to UI
                    var promoCode = $$('#used-promo-code').val();
                    var current_time = Date.now();
                    var end_time = timestamp + parkDuration;
                    var end_time_dis = new Date(end_time);
                    var remain_time = end_time - current_time;
                    var time_val;
                    var time_unit;
                    var dataProgress;

                    if (promoCode == "")
                        promoCode = "Nothing is used!"

                    if (timestamp2Time(remain_time).second >= 60) {
                        if (timestamp2Time(remain_time).minute >= 60) {
                            time_val = timestamp2Time(remain_time).hour;
                            time_unit = 'hour';
                            if (timestamp2Time(remain_time).hour > 1) {
                                time_unit += 's';
                            }
                        }
                        else {
                            time_val = timestamp2Time(remain_time).minute;
                            time_unit = 'minute';
                            if (timestamp2Time(remain_time).minute > 1) {
                                time_unit += 's';
                            }
                        }
                    }
                    else {
                        time_val = timestamp2Time(remain_time).second;
                        time_unit = 'second';
                        if (timestamp2Time(remain_time).second > 1) {
                            time_unit += 's';
                        }
                    }
                    
                    var dataProgress = Math.floor((((parkDuration - remain_time) / parkDuration) * 100));
                    var percentProgress = dataProgress - 100;

                    var str_active = '<li class="actively-parking-car">' +
                                        '<a href="#" data-popover=".popover-active' + carPlate + '" class="item-link item-content open-popover">' +
                                            '<div class="item-inner">' +
                                                '<div class="item-title-row">' +
                                                    '<div id="car-icon" class="item-title"><i class="material-icons">drive_eta</i>' + carPlate + '</div>' +
                                                    '<input id="timestamp-active-end" value="' + end_time + '" />' +
                                                    '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                                                    '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                                                    '</div>' +
                                                    '<div class="item-subtitle active-car-location"><i class="material-icons">place</i>' + user_pos.city + '</div>' +
                                            '</div>' +
                                        '</a>' +
                                        '<div class="popover popover-active' + carPlate + '" id="popover-active">' +
                                            '<div class="popover-angle"></div>' +
                                            '<div class="popover-inner">' +
                                                '<div class="content-block">' +
                                                    '<div id="active-car-plate">' + carPlate + '</div>' +
                                                    '<div id="location">' + user_pos.city + '</div><br />' +
                                                    '<div id="promo">Promotion used: ' + promoCode + '</div>' +
                                                    '<div id="lbl-time">Expected End Time:</div>' +
                                                    '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                                                    '<div id="lbl-btns">Press button to extend or terminate the parking time.</div><br/>' +
                                                    '<div id="btns">' +
                                                        '<a class="button button-fill button-raised" id="terminate-btn" onclick="terminateParkingTime(\''+ carPlate +'\',this)">Terminate</a>' +
                                                        '<a class="button button-fill button-raised" id="extend-btn" onclick="extendParkingTime(\''+ carPlate +'\',this)">Extend</a>' +
                                                    '</div>' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>' +
                                        '<span class="progressbar" id="progressbar' + carPlate + '" data-progress="' + dataProgress + '">' +
                                            '<span class="" id="innerProgressbar' + carPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                                        '</span>'
                                     '</li>';

                    $$('#ulist-active').append(str_active);
                    selfset = false;
                }
            });

        }
        else {
            myApp.alert('Please complete your info', 'Notification');
        }
    });

    $$('.check-promotion').on('click', function () {
        user_pos = {
            lat: 0,
            lng: 0,
            city: 'none',
            full_addr: 'none'
        };
        checkPromo = true;
    })

    $$('#tab-history-button').on('click', function () {
        refreshActiveHistory();
    })

    $$('#tab-active-button').on('click', function () {
        refreshActiveHistory();
    })

    // Vehicle Tab - Adding vehicle via floating action button
    $$('.modal-vehicle').on('click', function () {
        myApp.modal({
            title: 'Add vehicle',
            afterText: '<div class="input-field"><input type="text" id="txt-car-plate" class="modal-text-input" placeholder="Car plate"></div><div class="input-field"><input type="text" id="txt-car-description" class="modal-text-input" placeholder="Description"></div>',
            buttons: [
                {
                    text: 'Cancel',
                    onClick: function () {/* Do Nothing */ }
                },
                {
                    text: 'Ok',
                    onClick: function () {
                        //Car Plate Format
                        var displayCarPlate = $$('#txt-car-plate').val().toUpperCase().replace(/ /g, '');

                        //write into database
                        carRef.child(displayCarPlate).update({
                            description: $$('#txt-car-description').val(),
                            timestamp_reg: Math.floor(Date.now()),
                            history: ''
                        });

                        carRef.child(displayCarPlate).child('parking').update({
                            active: false,
                            duration: 0,
                            amount: 0,
                            timestamp: ''

                        })

                        //write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><i onclick="alert("a")" class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></div></div></a></li></ul></div></div></div>';
                        //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
                        $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-description').val() + str3);
                        myApp.closeModal();
                    }
                },
            ]
        })
    });


    
    //-----------------------------
    // History tab 
    //-----------------------------
    

    $$("#historyRefresh").on('ptr:refresh', function (e) {
        setTimeout(function () {
            refreshHistory();
            myApp.pullToRefreshDone();
            return;
        }, 5000);
    });

    refreshHistory();

    $$('#show-history').on("accordion:open", function () {
        for (j = 0; j < historyCurrentIndex; j++) {
            var ID = document.getElementById('histInfo' + j + '1');
            myApp.accordionCheckClose(ID);
        }
        return;
    });

    $$("#topupHistRefresh").on('ptr:refresh', function (e) {
        setTimeout(function () {
            myApp.pullToRefreshDone();
            return;
        }, 5000);
    });

    
    refreshTopupHist();

    $$('#show-topup-hist').on("accordion:open", function () {
        for (j = 0; j < topupHistCurrentIndex; j++) {
            var ID = document.getElementById('topupHistInfo' + j + '1');
            myApp.accordionCheckClose(ID);
        }
        return;
    });

    


    //--Profile Tab-------------------------------------------------

    $$('.confirm-logout-ok').on('click', function () {
        myApp.confirm('Are you sure to logout?', 'Logout', function () {
            firebase.auth().signOut().then(function () {
                // Sign-out successful.
                mainView.router.back();     // cant use router.loadPage(index.html), there are some issue
            }).catch(function (error) {
                // An error happened.
            });
            myApp.alert('Successfully logout!!!');
        });
    });

    //profile tab
    $$('.load-username').html(Db.user.username);
    $$('.load-token').append(Db.user.balance.toString());

    var ministr1 = '<img src="';
    var ministr2 = '" width="80">';
    
    if (user.photo_URL != "") {
        $$('.profile-pic-mini').append(ministr1 + user.photoURL + ministr2);
    } else {
        $$('.profile-pic-mini').append('<img class="profile-pic" src="images/profile_pic_default.png" width="100">');
    }

});

//---------------------------------------
// Extend Button Function
//---------------------------------------
function extendParkingTime(theCar) {
    theCarPlate = theCar;
    var extendCarRead = carRead;
    $$('.actively-parking-car').each(function(){
        if((extendCarRead[theCar].parking.timestamp + extendCarRead[theCar].parking.duration) - Date.now() <= 0){
            expired = true;
        }
    });
    if (expired) {
        myApp.closeModal();
        myApp.alert('The parking session of this car was expired', 'Notification');
        refreshActiveHistory();
        expired = false;
    }
    else {
        myApp.closeModal();
        if ($$('.picker-modal.modal-in').length > 0) {
            myApp.closeModal('.picker-modal.modal-in');
        }

        myApp.pickerModal(
            '<div class="picker-modal">' +
                '<div class="toolbar">' +
                    '<div class="toolbar-inner">' +
                        '<div class="left" id="extendCarPlate">&emsp;' + theCar + '</div>' +
                        '<div class="right"><a href="#" class="close-picker" id="extendCancel">Cancel&emsp;</a></div>' +
                    '</div>' +
                '</div>' +
                '<div class="picker-modal-inner">' +
                    '<div class="content-block" id="extend-content">' +
                        '<div id="lbl-extend">Please select the duration to extend the parking time.</div><br/>' +
                        '<div class="item-title label">' +
                            '<p class="slider-info row">' +
                                '<span class="col-30">Park until:</span>' +
                                '<span class="col-50">Duration:</span>' +
                                '<span class="col-20">Token:</span>' +
                            '</p>' +
                        '</div>' +
                        '<div>' +
                            '<p class="slider-info row">' +
                                '<span class="col-30 extended-duration"></span>' +
                                '<span class="col-55 selected-extend-duration"></span>' +
                                '<span class="col-15 extended-token"></span>' +
                            '</p>' +
                        '</div>' +
                        '<div class="item-input">' +
                            '<div class="range-slider">' +
                                '<input type="range" class="extend-duration" min="600000" max="43200000" value="3600000" step="600000" />' +
                            '</div>' +
                        '</div><br />' +
                        '<a class="button button-fill button-raised" id="confirm-btn" onclick="extendConfirmed(\''+ theCarPlate +'\',this)">Confirm</a>' +
                    '</div>' +
                '</div>' +
            '</div>'
        )
    }

    //----------------------
    //Get Selected Extend Duration
    //----------------------
    var extendEndTime = (extendCarRead[theCar].parking.timestamp + extendCarRead[theCar].parking.duration) - Date.now();
    function getDuration() {
        extendDuration = +$$('.extend-duration').val();
        var tokenNeeded = (extendDuration * rate);
        $$('.extended-duration').html(clockPass(extendEndTime + extendDuration));
        $$('.selected-extend-duration').html(timestamp2Time(extendDuration).name);
        $$('.extended-token').html(tokenNeeded);
    }

    getDuration();

    setInterval(function () {
        getDuration();
    }, 60000)

    $$('.extend-duration').on('input', function () {
        getDuration();
    })
};

//---------------------------------------
// Extend Function
//---------------------------------------
function extendConfirmed(theCar) {
    var tokenNO, tokenReq, tokenBal;

    tokenReq = (extendDuration * rate);
    extendConfirmText =
        'Selected car is&emsp;&emsp;&nbsp:' + theCar.toString() + '<br>' +
        'Extended until&emsp;&emsp; :' + $$('.extended-duration').text() + '<br>' +
        'Token required is&emsp;:' + tokenReq.toString() + '<br><br>' +
        'Confirm Transaction?';
    myApp.confirm(extendConfirmText, 'Confirmation', function () {

            tokenNo = Db.user.balance;
            tokenBal = tokenNo - tokenReq;
            if (tokenBal < 0) {
                myApp.alert('Insufficient balance.', 'Notification');
            }
            else {
                myApp.alert('Transaction is done successfully. Thank You!', 'Confirmation');
                userRef.update({
                    balance: tokenBal
                })
                $$('.token').html(+tokenBal.toFixed(2));
                $$('.selected-duration').html('Duration');
                $$('.selected-duration-logo').css('color', 'inherit');
                extendedDuration = false;
                $$('.close-picker').click();
            }

        //Update to firebase
        var amount = carRead[theCar].parking.amount;
        var duration = carRead[theCar].parking.duration;
        var timestamp = carRead[theCar].parking.timestamp;
        var location = carRead[theCar].parking.location;
        
        var newAmount = amount + tokenReq;
        var newDuration = duration + extendDuration;

        carRef.child(theCar).child('parking').update({
            active: true,
            amount: newAmount,
            duration: newDuration
        })
    })
    myApp.showTab('#tab-history');
    myApp.showTab('#active');
}

//---------------------------------------
// Terminate Function
//---------------------------------------
function terminateParkingTime(theCar) {
    var timeVal, timeUnit;
    var terminateTotalAmount = carRead[theCar].parking.amount;
    var terminateDuration = carRead[theCar].parking.duration;
    var terminateTimestamp = carRead[theCar].parking.timestamp;
    var terminateLocation = carRead[theCar].parking.location;
    var terminatePromoCode = carRead[theCar].parking.promocode;
    var terminateCity = carRead[theCar].parking.city;

    var terminateRemainTime = (terminateTimestamp + terminateDuration) - Date.now();
    var terminateTime = new Date(terminateTimestamp + terminateDuration);
    var terminateRemainToken = 2 * Math.floor(terminateRemainTime / 600000);
    var tokenBalance = Db.user.balance;
    tokenBalance += terminateRemainToken;
    var terminateAmount = terminateTotalAmount - terminateRemainToken;

    if (timestamp2Time(terminateRemainTime).second >= 60) {
        if (timestamp2Time(terminateRemainTime).minute >= 60) {
            timeVal = timestamp2Time(terminateRemainTime).hour;
            timeUnit = 'hour';
            if (timestamp2Time(terminateRemainTime).hour > 1) {
                timeUnit += 's';
            }
        }
        else {
            timeVal = timestamp2Time(terminateRemainTime).minute;
            timeUnit = 'minute';
            if (timestamp2Time(terminateRemainTime).minute > 1) {
                timeUnit += 's';
            }
        }
    }
    else {
        timeVal = timestamp2Time(terminateRemainTime).second;
        timeUnit = 'second';
        if (timestamp2Time(terminateRemainTime).second > 1) {
            timeUnit += 's';
        }
    }

    terminateConfirmText =
        'Are you sure that you want to terminate the follwing parking?<br/>' +
        'Car Plate Number&emsp;&nbsp  :' + theCar.toString() + '<br/>' +
        'Time Remaining&emsp;&emsp; :' + timeVal + ' ' + timeUnit + '<br/>' +
        'Expected End Time is :<br/>' + terminateTime.getHours() + ' : ' + terminateTime.getMinutes() + ' : ' + terminateTime.getSeconds() + '<br/><br/>' +
        'Confirm to Terminate?';

    myApp.closeModal();
    myApp.confirm(terminateConfirmText, 'Confirmation', function () {
        //Update to firebase
        carRef.child(theCar).child('parking').update({
            active: false,
            duration: 0,
            timestamp: 0
        })

        terminateDuration -= terminateRemainTime;

        carRef.child(theCar).child('history').child(theCar + terminateTimestamp).update({
            amount: terminateAmount,
            promocode: terminatePromoCode,
            location: terminateLocation,
            duration: timestamp2Time(terminateDuration).name,
            start_time: terminateTimestamp,
            city: terminateCity
        })
        
        userRef.update({
            balance: tokenBalance
        })

        historyRef.child(9999999999999 - terminateTimestamp).update({
            carPlate: theCar,
            amount: terminateAmount,
            location: terminateLocation,
            duration: timestamp2Time(terminateDuration).name,
            startTime: terminateTimestamp,
            city: terminateCity
        }).then(function () {
            refreshHistory();
            })

        myApp.alert('The parking for car plate number ' + theCar + ' is terminated.<br>Token refunded: ' + terminateRemainToken + ' tokens', 'Confirmation');
        $$('.close-picker').click();
    })
    refreshActiveHistory();
}



myApp.onPageInit('signup', function (page) {
    var su_email;
    var su_password;
    var su_username;
    var su_phone;
    var su_ic;

    
   

    //-----------------------------
    // back button function
    //-----------------------------
    $$('#button-signup-back').on('click', function () {
        mainView.router.back();
    })

    //-----------------------------
    // submit button for signUp 
    //-----------------------------
    $$('#button-signup-submit').on('click', function () {
        if ($$('#su-email').val() === "") {
            //empty email input textbox case
            myApp.alert('Please enter your email.', 'Error');
        }
        else if ($$('#su-password').val() === "") {
            //empty password input textbox case
            myApp.alert('Please enter your password.', 'Error');
        }
        else if ($$('#su-username').val() === "") {
            //empty username input textbox case
            myApp.alert('Please enter your username.', 'Error');
        }
        else if ($$('#su-phone-no').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your phone number.', 'Error');
        }
        else if ($$('#su-password').val() !== $$('#su-confirm-password').val()) {
            // password does not match confirm password
            myApp.alert('Password and Confirm Password does not match. Please try again.', 'Error');
        }
        else {
            su_email = $$('#su-email').val();
            su_password = $$('#su-password').val();
            su_username = $$('#su-username').val();
            su_phone = $$('#su-phone-no').val();
            su_ic = $$('#su-ic').val();

            firebase.auth().createUserWithEmailAndPassword(su_email, su_password).then(function (data) {
                var curr_user = firebase.auth().currentUser;
                //--------------------------------
                // Sent email verification
                //--------------------------------
                curr_user.sendEmailVerification().then(function () {
                    // Email sent.                    
                }).catch(function (error) {
                    // An error happened.
                });

                //--------------------------------
                // Set user info to database
                //--------------------------------               
                firebase.database().ref('users/' + curr_user.uid).set({
                    email: su_email,
                    username: su_username,
                    phone_no: su_phone,
                    balance: 0,
                    IC: su_ic
                });

                //------------------------------
                // force sign out after sign up
                //------------------------------
                firebase.auth().signOut().then(function () {
                    // Sign-out successful.                    
                    mainView.router.back(); // Route later
                }).catch(function (error) {
                    // An error happened.
                });


            }).catch(function (error) {
                // Handle Sign Up Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode === "auth/email-already-in-use")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/invalid-email")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/operation-not-allowed")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/weak-password")
                    myApp.alert(errorMessage, 'Error');
            });

        }
    })
});

// ======= Color themes ======= 
myApp.onPageInit('color-themes', function (page) {
    $$(page.container).find('.color-theme').click(function () {
        var classList = $$('body')[0].classList;
        for (var i = 0; i < classList.length; i++) {
            if (classList[i].indexOf('theme') === 0) classList.remove(classList[i]);
        }
        classList.add('theme-' + $$(this).attr('data-theme'));
        switch ($$(this).attr('data-theme')) {
            case 'red':
                colorTheme = "lightpink";
                break;
            case 'pink':
                colorTheme = "lightpink";
                break;
            case 'purple':
                colorTheme = "plum";
                break;
            case 'deeppurple':
                colorTheme = "plum";
                break;
            case 'indigo':
                colorTheme = "aliceblue";
                break;
            case 'blue':
                colorTheme = "aliceblue";
                break;
            case 'lightblue':
                colorTheme = "aliceblue";
            case 'cyan':
                colorTheme = "aliceblue";
                break;
            case 'teal':
                colorTheme = "palegreen";
                break;
            case 'green':
                colorTheme = "palegreen";
                break;
            case 'lightgreen':
                colorTheme = "palegreen";
                break;
            case 'lime':
                colorTheme = "lightgoldenrodyellow";
                break;
            case 'yellow':
                colorTheme = "lightgoldenrodyellow";
                break;
            case 'amber':
                colorTheme = "lightgoldenrodyellow";
                break;
            case 'orange':
                colorTheme = "lightyellow";
                break;
            case 'deeporange':
                colorTheme = "lightsalmon";
                break;
            case 'brown':
                colorTheme = "lightgoldenrodyellow";
                break;
            case 'gray':
                colorTheme = "whitesmoke";
                break;
            case 'bluegray':
                colorTheme = "whitesmoke";
                break;
            case 'black':
                colorTheme = "whitesmoke";
                break;
                break;
        }
        //colorTheme = $$(this).attr('data-theme');
    });
});

//function loadProfilePic(url) {

//    return new Promise(function (resolve, reject) {
//        try {
//            var pp = new XMLHttpRequest();
//            pp.open("GET", url);
//            pp.responseType = "blob";
//            pp.onerror = function () { reject("Network error.") };
//            pp.onload = function () {
//                if (pp.status === 200) { resolve(pp.response) }
//                else { reject("Loading error:" + pp.statusText) }
//            };
//            pp.send();
//        }
//        catch (err) { reject(err.message) }
//    });
//}

//Display User My Profile
myApp.onPageInit('profile-myprofile', function (page) {

    //user.updateProfile({
    //    //photoURL: 'images/car-car.png'
    //    photoURL: 'https://twirpz.files.wordpress.com/2015/06/twitter-avi-gender-balanced-figure.png'

    //}).then(function () {
    //    myApp.alert('sejjejje');
    //});

    //var profile_pic = user.photoURL;

    //loadProfilePic("images/car-car.png").then(function (blob) {
    //    var xyz = blob;
    //    user.updateProfile({
    //        displayName: "wwji",
    //        photoURL: "https://www.google.com/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0ahUKEwj678eU8oXXAhVFMY8KHaXqCdsQjRwIBw&url=http%3A%2F%2Fjonvilma.com%2Fgirl.html&psig=AOvVaw2kB6mjACFhL8hl_znsVyQZ&ust=1508818791837265"
    //    });
    //    console.log(blob);
    //    console.log(xyz);
    //    console.log(user.photoURL);
    //});

    //var browsepic = myApp.photoBrowser({
    //    //photo: ['images/car-car.png']
    //    photos: [user.photoURL]
    //    // theme: 'dark'
    //});



    navigator.camera.getPicture(function cameraSuccess(imageUri) {

        var blob = to_blob(imageUri);
        return blob;
        console.log("return blob liao");

    }, function cameraError(error) {
        console.debug("Unable to obtain picture: " + error, "app");

    }, options);
})


//Display User My Profile
myApp.onPageInit('profile-myprofile', function (page) {
    //Display Profile Pic and Info
    var str1 = '<img class="profile-pic" src="';
    var str2 = '" width="100">';
    if (user.photo_URL != "") {
        $$('.button-profile-pic').append(str1 + user.photoURL + str2);
    } else {
        $$('.button-profile-pic').append('<img class="profile-pic" src="images/profile_pic_default.png" width="100">');
    }
    $$('.load-username').html(Db.user.username);
    $$('.load-real-name').html(Db.user.real_name);
    $$('.load-email').html(Db.user.email);          //might need to change
    $$('.load-phone-no').html(Db.user.phone_no);
    $$('.load-ic-no').html(Db.user.IC);
    $$('.load-gender').html(Db.user.gender);
    $$('.load-birthday').html(Db.user.birthday);
    $$('.load-address').html(Db.user.address);

    /*
   to_blob("images/car-car.png").then(function (blob) {
       user.updateProfile({
           displayName: "wwji",
           photoURL: "https://www.google.com/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0ahUKEwj678eU8oXXAhVFMY8KHaXqCdsQjRwIBw&url=http%3A%2F%2Fjonvilma.com%2Fgirl.html&psig=AOvVaw2kB6mjACFhL8hl_znsVyQZ&ust=1508818791837265"
       });
       console.log(blob);
       console.log(user.photoURL);
   });

   */
    // Create a reference to the file we want to download
    var profilepicRef = storageuserRef.child('profile_pic.jpg');

    // Get the download URL
    profilepicRef.getDownloadURL().then(function (url) {
        // Insert url into an <img> tag to "download"
        user.updateProfile({
            photoURL: url
        }).then(function () {
            console.log("url into photoURL dy");
            console.log(user.photoURL);
            console.log(url);
            myApp.alert('hhdhdhdh');
        });
    }).catch(function (error) {
        switch (error.code) {
            case 'storage/object_not_found':
                // File doesn't exist
                break;

            case 'storage/unauthorized':
                // User doesn't have permission to access the object
                break;

            case 'storage/canceled':
                // User canceled the upload
                break;

            case 'storage/unknown':
                // Unknown error occurred, inspect the server response
                break;
        }
    });

 

     $$('.button-profile-pic').on('click', function () {
         var options = [
             {
                 text: 'View Profile Picture',
                 bold: true,
                 onClick: function () {
                     mainView.router.loadPage("view-profile-picture.html");
                 }
             },
             {
                 text: 'Edit Profile Picture',
                 bold: true,
                 onClick: function () {
                     var img_blob = openFilePicker();
                     var metadata = {
                         name: 'profile_pic',
                         contentType: 'image/jpg'
                     };
                     /*
                     var uploadTask = storageuserRef.child(profile_pic.jpg).put(img_blob, metadata);
                     // Listen for state changes, errors, and completion of the upload.
                     uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshot) {
                             // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                             var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                             console.log('Upload is ' + progress + '% done');
                             switch (snapshot.state) {
                                 case firebase.storage.TaskState.PAUSED: // or 'paused'
                                     console.log('Upload is paused');
                                     break;
                                 case firebase.storage.TaskState.RUNNING: // or 'running'
                                     console.log('Upload is running');
                                     break;
                             }
                         }, function (error) {
 
                             // A full list of error codes is available at
                             // https://firebase.google.com/docs/storage/web/handle-errors
                             switch (error.code) {
                                 case 'storage/unauthorized':
                                     // User doesn't have permission to access the object
                                     break;
 
                                 case 'storage/canceled':
                                     // User canceled the upload
                                     break;
                                 case 'storage/unknown':
                                     // Unknown error occurred, inspect error.serverResponse
                                     break;
                             }
                         }, function () {
                             // Upload completed successfully, now we can get the download URL
                             var downloadURL = uploadTask.snapshot.downloadURL;
                         });*/
                 }
             }
         ];
         var cancel = [
             {
                 text: 'Cancel',
                 color: 'red',
                 bold: true
             }
         ];
         var action_profile_pic = [options, cancel];
         myApp.actions(action_profile_pic);

     });
});

//---------------------------
// Select Location function
//---------------------------
myApp.onPageInit("select-location", function (page) {
    myApp.showIndicator();
    var default_marker = [];
    var default_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none'
    };
    var selfset_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none'
    };
    var default_user_addr;
    var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 18
    });

    //--------------------------------
    // default checkbox function
    //--------------------------------
    $$('input[name=default-loca]').change(function () {
        if ($$(this).is(':checked')) {
            selfset = false;
            // checked
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];
            $$('#default-address').html(default_pos['full_addr']);
            document.getElementById("pac-input").style.visibility = "hidden";
            var pos = {
                lat: default_pos['lat'],
                lng: default_pos['lng']
            }
            map.setCenter(pos);
            map.setZoom(18);
            // Create a marker for each place.
            default_marker.push(new google.maps.Marker({
                map: map,
                position: pos
            }));
        }
        else {
            selfset = true;
            // not checked
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];
            $$('#default-address').html(selfset_pos['full_addr']);
            document.getElementById("pac-input").style.visibility = "visible";
            var pos = {
                lat: selfset_pos['lat'],
                lng: selfset_pos['lng']
            }
            map.setCenter(pos);
            map.setZoom(18);
            // Create a marker for each place.
            default_marker.push(new google.maps.Marker({
                map: map,
                position: pos
            }));
        }
    });

    // User click confirm button function
    $$('#use-selfset-loca').on('click', function () {
        if (selfset === true) {
            user_pos['lat'] = selfset_pos['lat'];
            user_pos['lng'] = selfset_pos['lng'];
            user_pos['city'] = selfset_pos['city'];
            user_pos['full_addr'] = selfset_pos['full_addr'];
        }
        else {
            user_pos['lat'] = default_pos['lat'];
            user_pos['lng'] = default_pos['lng'];
            user_pos['city'] = default_pos['city'];
            user_pos['full_addr'] = default_pos['full_addr'];
        }
        console.log(user_pos);
        mainView.router.back();
        $$('.selected-location').html(user_pos['city']);
        $$('.selected-location-logo').css('color', 'red');
        selectedLocation = true;
    })

    initMap(map);

    //------------------------------------------------------
    // Allow user to set their own location using search box
    //------------------------------------------------------
    function initAutocomplete(map) {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());
        });

        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();

            if (places.length === 0) {
                return;
            }

            // Clear out the old markers.  
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) {
                    myApp.alert("Returned place contains no geometry");
                    return;
                }

                // Create a marker for each place.
                default_marker.push(new google.maps.Marker({
                    map: map,
                    position: place.geometry.location
                }));

                selfset_pos['lat'] = place.geometry.location.lat();
                selfset_pos['lng'] = place.geometry.location.lng();
                var pos = {
                    lat: selfset_pos['lat'],
                    lng: selfset_pos['lng']
                };
                geocodeLatLng(pos, selfset_pos);
                selfset = true;

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
            map.setZoom(18);
        });
    }

    //---------------------------------------
    // Full address and city name Geocoding
    //---------------------------------------
    function geocodeLatLng(latlng, obj) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            var city, route;
            if (status === 'OK') {
                if (results[0]) {
                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    city = element2.long_name;
                                    break;
                                case 'route':
                                    route = element2.long_name;
                                    break;
                            }
                        })
                    });
                    if (city) {
                        obj['city'] = city;

                    }
                    else {
                        obj['city'] = route;
                    }
                    obj['full_addr'] = results[0].formatted_address;
                    $$('#default-address').html(results[0].formatted_address);  // display full address 
                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------------
    // Only Full address (Geocoding)
    //---------------------------------------
    function geocodeAddr(latlng, name) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    var POI_content_html =
                        '<li><div class="item-inner item-content">' +
                        '<div class="item-title-row">' +
                        '<div class="item-title">' + name + '</div>' +
                        '<div class="item-after">ICON</div>' +
                        '</div>' +
                        '<div class="item-text">' + results[0].formatted_address + '</div>' +
                        '</div></li>';

                    $$("#POI-content").append(POI_content_html);
                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------
    // Only City name (Geocoding)
    //---------------------------------
    function geocodeCity(latlng) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {

                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    city = element2.long_name;
                                    break;
                            }
                        })
                    });
                    $$('#default-address').html(city);  //demo: display city name

                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------------
    // Create Map with default address
    //---------------------------------------
    function initMap(map) {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                default_pos['lat'] = position.coords.latitude;
                default_pos['lng'] = position.coords.longitude;
                geocodeLatLng(default_pos, default_pos);
                selfset_pos['lat'] = position.coords.latitude;
                selfset_pos['lng'] = position.coords.longitude;
                geocodeLatLng(selfset_pos, selfset_pos);

                if (selectedLocation && selfset) {
                    $$('input[name=default-loca]').prop('checked', false);
                    document.getElementById("pac-input").style.visibility = "visible";
                    selfset_pos = user_pos;
                    pos = {
                        lat: selfset_pos.lat,
                        lng: selfset_pos.lng
                    }
                    var intrv = setInterval(function () {
                        if (default_pos.full_addr !== 'none') {
                            clearInterval(intrv);
                            $$('#default-address').html(selfset_pos['full_addr']);
                        }
                    }, 100);
                }
                map.setCenter(pos);
                // Create a marker 
                default_marker.push(new google.maps.Marker({
                    map: map,
                    position: pos
                }));

                initAutocomplete(map);
                myApp.hideIndicator();
            }, function () {
                    myApp.alert("Ops! Geolocation service failed.", "Message");
                }, { enableHighAccuracy: true });
        }
        else {
            // Device doesn't support Geolocation
            myApp.alert("Device does not support geolocation.", "Message");
        }
    }
});

//Need to change ordering way//////////////////////
//Promocode
myApp.onPageInit('profile-promocode', function (page) {
    //Display Promocode
    function loadPromocode() {
        var uid = firebase.auth().currentUser.uid;
        var path = 'users/' + user.uid + '/promotion';

        firebase.database().ref(path).once('value').then(function (snapshot) {
            var data = snapshot.val();

            for (var eachPromotion in data) {
                var promocode = data[eachPromotion];

                // For readability purpose
                var str1 = '<li class="accordion-item"> <a href="#" class="item-link item-content"> <div class="item-inner"> <div class="item-title">'
                var str2 = '</div>'
                //only for all
                var str_a = '<div class="item-after" style = "color: springgreen" > '
                if (promocode.status.toLowerCase() === 'available') {
                    $$('.promo-list-available').append(str1 + eachPromotion + str2 + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text);
                    var str_all = '<div class="item-after" style = "color: springgreen" >Available</div>'
                } else if (promocode.status.toLowerCase() === 'expired') {
                    var str_all = '<div class="item-after" style = "color: red" >Expired</div>'
                } else if (promocode.status.toLowerCase() === 'used') {
                    var str_all = '<div class="item-after">Used</div>'
                }

                var str3 = '</div > </a > <div class="accordion-item-content"> <div class="content-block"> <p>Discount Amount: '
                var str4 = ' tokens</p> <p>Expiry Date: '
                var str5 = '</p> <p>'
                var str6 = '</p> </div> </div> </li>'

                $$('.promo-list-all').append(str1 + eachPromotion + str2 + str_all + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text + str6);
            }

        });
    }

    loadPromocode();
});

//Change password
myApp.onPageInit('settings-change-password', function (page) {

    $$('#button-update-password').on('click', function () {
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, $$('#old-password').val());
        user.reauthenticateWithCredential(credential).then(function () {
            if ($$('#new-password').val() === $$('#confirm-new-password').val()) {
                user.updatePassword($$('#new-password').val()).then(function () {
                    // Update successful.
                    myApp.alert('Your password has been updated!');
                    mainView.router.loadPage("profile-settings.html");
                }).catch(function (error) {
                    // An error happened.
                });
            } else {
                myApp.alert('Password and confirm password does not match', 'Error!');
            }
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === "auth/wrong-password")
                myApp.alert(errorMessage, 'Error');
            })
    });
});


//Make Report (CarLoss/IllegalPark)
myApp.onPageInit('profile-report', function (page) {

    var cl_owner_name;
    var cl_owner_ic;
    var cl_owner_pass;
    var cl_phone;
    var cl_plate;
    var cl_location;
    var cl_remarks;
    //-----------------------------
    // submit button for Carloss Report 
    //-----------------------------
    $$('#cl-submit').on('click', function () {
        if ($$('#cl-owner-name').val() === "") {
            //empty email input textbox case
            myApp.alert("Please enter car owner's name.", 'Error');
        }
        else if (($$('#cl-owner-ic').val() === "") && ($$('#cl-owner-pass').val() === "")) {
            //empty password input textbox case
            myApp.alert("Please enter car owner's IC No. or passport.", 'Error');
        }
        else if ($$('#cl-phone').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your phone number.', 'Error');
        }
        else if ($$('#cl-plate').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your car plate number.', 'Error');
        }
        else if ($$('#cl-location').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Where did you lost your car?', 'Error');
        }
        else {
            cl_owner_name = $$('#cl-owner-name').val();
            cl_owner_ic = $$('#cl-owner-ic').val();
            cl_owner_pass = $$('#cl-owner-pass').val();
            cl_phone = $$('#cl-phone').val();
            cl_plate = $$('#cl-plate').val();
            cl_location = $$('#cl-location').val();
            cl_remarks = $$('#cl-remarks').val();

            userRef.child('report').child('car_loss').push({
                cl_owner_name: cl_owner_name,
                cl_owner_ic: cl_owner_ic,
                cl_owner_pass: cl_owner_pass,
                cl_phone: cl_phone,
                cl_plate: cl_plate,
                cl_location: cl_location,
                cl_remarks: cl_remarks
            }).then(function () {
                myApp.alert('Report Submitted!');
                mainView.router.refreshPage();
            }).catch(function (error) {

            });

        }

    });


    var ip_plate;
    var ip_location;
    var ip_behavior;
    var ip_remarks;
    //-----------------------------
    // submit button for illegal parking
    //-----------------------------
    $$('#ip-submit').on('click', function () {
        if ($$('#ip-plate').val() === "") {
            //empty email input textbox case
            myApp.alert('Please enter the car plate of illegal parked car.', 'Error');
        }
        else if ($$('#ip-location').val() === "") {
            //empty password input textbox case
            myApp.alert('Please enter the loaction.', 'Error');
        }
        else if ($$('#ip-behavior').val() === "") {
            //empty username input textbox case
            myApp.alert('Please enter the behavior of illegal parked car.', 'Error');
        }
        else {
            ip_plate = $$('#ip-plate').val();
            ip_location = $$('#ip-location').val();
            ip_behavior = $$('#ip-behavior').val();
            ip_remarks = $$('#ip-remarks').val();

            userRef.child('report').child('illegal_park').push({
                ip_plate: ip_plate,
                ip_location: ip_location,
                ip_behavior: ip_behavior,
                ip_remarks: ip_remarks
            }).then(function () {
                myApp.alert('Report Submitted!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }

    });


});


myApp.onPageInit('promotion', function (page) {
    //-------------
    //Initiate UI
    //-------------
    //promotion info

    myApp.showIndicator();
    for (var promoType in Db.admin.promotions) {
        for (var promoNum in Db.admin.promotions[promoType]) {
            $$('#nearbyPromo').append('\
                <div class="card">\
                    <div class="card-content">\
                        <div class="card-content-inner" style="padding:16px 16px 0px 16px;">\
                            <p class="row">\
                                <span class="col-30"><img class="promo-card-logo" src="brokenImg" /></span>\
                                <span class="col-70" style="height:100%;">\
                                    <b class="promo-card-title">'+ promoType + '</b><br />\
                                    <i class="promo-card-content">'+ Db.admin.promotions[promoType][promoNum] + '</i><br />\
                                </span>\
                            </p>\
                        </div>\
                        <div class="promo-deadline" color="gray" style="text-align:right; width:100%; height:16px; font-size:x-small;">Until:&ensp;'+ promoNum + '&emsp;</div>\
                    </div >\
                </div >\
            ');
            $$('.promo-card-title').each(function () {
                if ($$(this).text() == promoType) {
                    $$(this).closest('.card').find('.promo-card-logo').attr('src', Strg.logo[promoType]);
                }
            })
        }
    }

    var nearbyMarkers = [];
    var nearbyInfo = [];
    var nearby_map = new google.maps.Map(document.getElementById('nearby-map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 17
    });

    createMap(nearby_map);

    //--------------
    // init map
    //--------------
    function createMap(map) {
        var pos;
        // Try HTML5 geolocation.
        if (user_pos.full_addr == 'none') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                }, function () {
                    myApp.alert("Ops! Geolocation service failed.", "Message");
                }, { enableHighAccuracy: true });
            }
            else {
                // Device doesn't support Geolocation
                myApp.alert("Device does not support geolocation.", "Message");
            }
        }
        else {
            pos = {
                lat: user_pos.lat,
                lng: user_pos.lng
            };
        }
        var mapIntrv = setInterval(function () {
            if (pos) {
                clearInterval(mapIntrv);
                map.setCenter(pos);

                // Create a infowindow for each place.
                var contentString = '<h4>Your location</h4>';
                var infowindow = new google.maps.InfoWindow({
                    content: contentString
                });
                nearbyInfo.push(infowindow);

                // Create a marker for each place.
                nearbyMarkers.push(new google.maps.Marker({
                    map: nearby_map,
                    position: pos,
                }));

                google.maps.event.addListener(nearbyMarkers[0], 'click', function () {
                    nearbyInfo[0].open(nearby_map, nearbyMarkers[0]);

                });

                nearbySearch(map, pos);
            }
        },100)
    }
   
    //-------------------------------
    // Search nearby POI
    //-------------------------------
    function nearbySearch(map, pos) {
        var request = {
            location: pos,
            radius: '250',          // unit is in meters (value now is 250m)
            type: ['restaurant', 'bank']
        };
        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, displayNearby);
    }

    //-------------------------------
    // Display nearby POI on apps
    //-------------------------------
    function displayNearby(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            var promoMarker = 0;
            for (var i = 0; i < results.length; i++) {
                var pos = {
                    lat: results[i].geometry.location.lat(),
                    lng: results[i].geometry.location.lng()
                };
              
                // Create a marker for each place.    
                for (var promoCompany in Db.admin.promotions) {
                    if (~results[i].name.indexOf(promoCompany)) {
                        // Create a infowindow for each place.
                        var contentString = Db.admin.rewards[promoCompany] + ' tokens';
                        var infowindow = new google.maps.InfoWindow({
                            content: '<h4>Click here to watch the video<br />and get free ' + contentString.fontcolor("goldenrod") + '</h4>'
                        });
                        nearbyInfo.push(infowindow);

                        promoMarker++;

                        nearbyMarkers.push(new google.maps.Marker({
                            map: nearby_map,
                            position: pos,
                            icon: Strg.icon[promoCompany]
                        }));
                        for (var rewardCompany in Db.admin.rewards) {
                            if (rewardCompany == promoCompany) {
                                nearbyMarkers[promoMarker].setAnimation(google.maps.Animation.BOUNCE);
                                nearbyInfo[promoMarker].open(nearby_map, nearbyMarkers[promoMarker]);
                                (function (promoM) {
                                    setTimeout(function () {
                                        nearbyInfo[promoM].close();
                                    }, 10000);
                                })(promoMarker)
                                google.maps.event.addListener(nearbyMarkers[promoMarker], 'click', function (innerKey) {
                                    return function () {
                                        nearbyInfo[innerKey].close();
                                        nearbyMarkers[innerKey].setAnimation(null);
                                        myApp.popover('.popover-ads-video', '#nearby-promo-ads');
                                        document.getElementById('ads-video').play();
                                        $$('#ads-video').on('ended', function () {
                                            //myApp.closeModal();
                                        })
                                    }
                                }(promoMarker));
                            }
                        }

                        $$('.promo-card-title').each(function () {
                            if ($$(this).text() == promoCompany) {
                                $$('#nearby-map-promo').append('<div class="card">' + $$(this).closest('.card').html() + '</div>');
                            }
                        })
                    }
                }
            }
            if (checkPromo) {
                checkPromo = false;
                myApp.showTab('#nearbyPromo');
            }
            myApp.hideIndicator();
        }
    }

});

//Change Profile
myApp.onPageInit('settings-change-profile', function (page) {
    var name = Db.user.real_name;
    var ic = Db.user.IC;
    var birthday = Db.user.birthday;
    var address = Db.user.address;
    var gender = Db.user.gender;

    $$('#edit-name').val(name);
    $$('#edit-ic').val(ic);
    $$('#edit-birthday').val(birthday);
    $$('#edit-address').val(address);
    $$('#edit-gender').val(gender);

    $$('#button-update-profile').on('click', function () {
        if ($$('#edit-name').val() !== ("") && $$('#edit-ic').val() !== ("") && $$('#edit-birthday').val() !== ("") && $$('#edit-address').val() !== ("")) {

            userRef.update({
                real_name: $$('#edit-name').val(),
                IC: $$('#edit-ic').val(),
                birthday: $$('#edit-birthday').val(),
                address: $$('#edit-address').val(),
                gender: $$('#edit-gender').val(),
            }).then(function () {
                ;
                myApp.alert('Your profile has been updated successfully!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }
        else {
            myApp.alert('Please completed your profile.', 'Error!');
        }
    });

});

//Change H/P No.
myApp.onPageInit('settings-change-hp', function (page) {
    $$('.load-phone-no').html(Db.user.phone_no);

    $$('#button-update-hp').on('click', function () {
        if ($$('#new-hp').val() != ("") ) {

            userRef.update({
                phone_no: $$('#new-hp').val(),
            }).then(function () {
                ;
                myApp.alert('Your H/P number has been updated successfully!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }
        else {
            myApp.alert('H/P Number cannot be empty.', 'Error!');
        }
    });

});
    /*
myApp.onPageInit('change-profile-picture', function (page) {
    var myPhotoBrowserDark = myApp.photoBrowser({
        photos: [
            'http://lorempixel.com/1024/1024/sports/1/',
        ],
        theme: 'dark'
    });
    $$('.pb-standalone-dark').on('click', function () {
        myPhotoBrowserDark.open();
    });

})*/
