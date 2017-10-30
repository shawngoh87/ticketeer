/* Init */
var myApp = new Framework7({
    modalTitle: 'Ticketeer',
    material: true,
    tapHold: true
});
var $$ = Dom7;
var mainView = myApp.addView('.view-main', {});
var onScan = false;

/* Global Namespace*/

/* Authentication */
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        mainView.router.loadPage('main.html');
        setTimeout(() => {
            $$('.index-preloader').hide();
            $$('.form-login').show();
        }, 1000);
    }
    else {
        // User signed out.
        // Turn off .on() listeners here.
    }
});

function login(){
    $$('.form-login').hide();
    $$('.index-preloader').show();
    var email = $$('.user-email').val();
    var pw = $$('.user-pw').val();
    try{
        firebase.auth().signInWithEmailAndPassword(email, pw).then(function(){}).catch(function (error) {
            // Handle Errors here.
            $$('.form-login').show();
            $$('.index-preloader').hide();
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
    }
    catch (err) {
        alert(err.message);
    }
}

$$(document).on('taphold', function () {
    if (onScan) {
        $("html").find('*').attr('style', '');
        onScan = false;
    }
});

function hideAll() {
    // Hide all elements for preview
    $("html").find('body').attr('style',
        '   background: none transparent; \
            display: none;\
        '
    );
    //$("html").find('div').attr('style', '');
    //$("html").find('div').attr('style',
    //    '   background: white; \
    //        display: block;\
    //    '
    //);
}

function logout() {
    myApp.confirm('Log out?', function () {
        firebase.auth().signOut().then(function () {
            //$$('.page-on-left').remove();
            //mainView.router.loadPage('index.html');
            location = "index.html";
        }).catch(function (err) {
            alert(err);
        });
        
    });
}

function showDeductResult(item) {
    var balance = parseInt($$('.balance-var').attr('value'));
    var amount = parseInt($$(item).text().replace(/\D/g, ''));
    var change = balance - amount;

    if (change < 0) {
        alert('Not enough balance!');
        return;
    }
    $$('.balance-var').empty().append(balance + ' -> ' + '<span style="color:red;">' + change + '</span>');
    $$('.balance-var').attr('change', change);
    $$('.balance-var').attr('amount', amount);
}

function showReloadResult(item) {
    var balance = parseInt($$('.balance-var').attr('value'));
    var amount = parseInt($$(item).text().replace(/\D/g, ''));
    var change = balance + amount;

    $$('.balance-var').empty().append(balance + ' -> ' + '<span style="color:green;">' + change + '</span>');
    $$('.balance-var').attr('change', change);
    $$('.balance-var').attr('amount', amount);
}

function confirmTransaction(op) {

    var change = $$('.balance-var').attr('change');
    var amount = $$('.balance-var').attr('amount');
    var uid = $$('.uid').text();
    var user_name = $$('.name').text();

    if (amount === null) { // check for null
        alert('Please select an amount!');
        return;
    }
    myApp.showIndicator();
    var timestamp = Math.floor(Date.now());
    firebase.database().ref('users/' + uid).update({
        "balance": change
    })
        .then(function () {
            firebase.database().ref('users/' + uid + '/transactions/' + timestamp).update({
                "timestamp": timestamp,
                "amount": amount,
                "operation": op
            })
            .then(function () {
                firebase.database().ref('execs/' + 'execA' + '/transactions/' + timestamp).update({
                        "user_name": user_name,
                        "user_uid": uid,
                        "timestamp": timestamp,
                        "amount": amount,
                        "operation": op
                    })
                .then(function () {
                    myApp.hideIndicator();
                    mainView.router.loadPage('main.html');
                    $$('.page-on-left').remove();
                    mainView.history = ['index.html'];
                })
                .catch(function (err) {
                    alert(err);
                    myApp.hideIndicator();
                    mainView.router.loadPage('main.html');
                    $$('.page-on-left').remove();
                    mainView.history = ['index.html'];
                });
            })
            .catch(function (err) {
                alert(err);
                myApp.hideIndicator();
                mainView.router.loadPage('main.html');
                $$('.page-on-left').remove();
                mainView.history = ['index.html'];
            });
        })
        .catch(function (err) {
            alert(err);
            myApp.hideIndicator();
            mainView.router.loadPage('main.html');
            $$('.page-on-left').remove();
            mainView.history = ['index.html'];
        });;

}

function reload() {

    // If scanned, show all elements
    var scanned = function (err, uid) {
        if (err) {
            alert(err._message);
        }

        onScan = false;
        myApp.showIndicator();
        $("html").find('*').attr('style', '');

        var str1 = '<div data-page="reload" class="page"> <div class="page-content login-screen-content"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="index.html" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center"></div> <div class="right"></div> </div> </div> <div class="login-screen-title"> Reload </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value name">';
        var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value uid">';
        var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Balance</div> <div class="col-66 reload-details-value balance-var" value="';
        var str4 = '">';
        var str5 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <a href="#" class="button button-raised col-33" value="1" onclick="showReloadResult(this);">RM1</a> <a href="#" class="button button-raised col-33" value="2" onclick="showReloadResult(this);">RM2</a> <a href="#" class="button button-raised col-33" value="5" onclick="showReloadResult(this);">RM5</a> </div> </div> </li> </ul> </div> <div class="content-block"><a href="#" class="button button-big" onclick="confirmTransaction(\'reload\');">Confirm</a></div> </div> </div></div>';

        firebase.database().ref('users/' + uid).once('value', function (data) {
            var user = data.val();
            var strPage = str1 + user.name + str2 + uid + str3 + user.balance + str4 + user.balance + str5;
            mainView.loadContent(strPage);
            myApp.hideIndicator();
        }).catch(function (err) {
            myApp.hideIndicator();
            alert(err);
        });
    };

    // Init QR Scanner
    var done = function (err, status) {
        if (err) {
            alert(err._message);
            return;
        }
        hideAll();
        QRScanner.scan(scanned);
        QRScanner.show();
    };

    onScan = true;
    QRScanner.prepare(done);
}

function deduct() {

    // If scanned, show all elements
    var scanned = function (err, uid) {
        if (err) {
            alert(err._message);
            return;
        }

        onScan = false;
        myApp.showIndicator();
        $("html").find('*').attr('style', '');

        var str1 = '<div data-page="deduct" class="page"> <div class="page-content login-screen-content"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="index.html" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center"></div> <div class="right"></div> </div> </div> <div class="login-screen-title"> Deduct </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value name">';
        var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value uid">';
        var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Balance</div> <div class="col-66 reload-details-value balance-var" value="';
        var str4 = '">';
        var str5 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <a href="#" class="button button-raised col-33" value="1" onclick="showDeductResult(this);">RM1</a> <a href="#" class="button button-raised col-33" value="2" onclick="showDeductResult(this);">RM2</a> <a href="#" class="button button-raised col-33" value="5" onclick="showDeductResult(this);">RM5</a> </div> </div> </li> </ul> </div> <div class="content-block"><a href="#" class="button button-big" onclick="confirmTransaction(\'deduct\');">Confirm</a></div> </div> </div></div>';

        firebase.database().ref('users/' + uid).once('value', function (data) {
            var user = data.val();
            var strPage = str1 + user.name + str2 + uid + str3 + user.balance + str4 + user.balance + str5;
            mainView.loadContent(strPage);
            myApp.hideIndicator();
        }).catch(function (err) {
            myApp.hideIndicator();
            alert(err);
        });
    };

    // Init QR Scanner
    var done = function (err, status) {
        if (err) {
            alert(err._message);
            return;
        }
        hideAll();
        QRScanner.scan(scanned);
        QRScanner.show();
    };

    onScan = true;
    QRScanner.prepare(done);
}

function history() {
    var pageContentHeader = '<div data-page="history" class="page"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="#" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center">History</div> </div> </div> <div class="page-content vehicle-history-page">';
    var pageContentFooter = '</div></div>';
    var pageContent = '';
    var uid = "execA";
    myApp.showIndicator();
    firebase.database().ref('execs/' + uid + '/transactions').once('value', function (data) {

        var history = data.val();
        for (var eachHistory in history) {

            var color = '';
            var historyInstance = history[eachHistory];
            switch (historyInstance.operation) {
                case 'reload':
                    color = 'bg-lightgreen'; // Default colors of F7
                    break;
                case 'deduct':
                    color = 'bg-red';
                    break;
            }

            // For readability purpose
            var str1 = '<div class="card ' + color + '"> <div class="card-header"><div class="col-75">';
            var name = historyInstance.user_name;
            var str3 = '</div> <div class="col-25">';
            var amt = historyInstance.amount;
            var str4 = '</div> </div> </div>';

            // If need to display more info, use this:
            //var str1 = '<div class="card"> <div class="card-header">';
            //var name = historyInstance.user_name;
            //var str2 = '</div> <div class="card-footer"> <div class="col-75">';
            //var op = historyInstance.operation;
            //var str3 = '</div> <div class="col-25">';
            //var amt = historyInstance.amount;
            //var str4 = '</div> </div> </div>';

            pageContent += (str1 + name + str3 + amt + str4);
        }
        mainView.loadContent(pageContentHeader + pageContent + pageContentFooter);
        myApp.hideIndicator();
    }).catch(function (err) {
        alert(err);
    });
    return;
}
