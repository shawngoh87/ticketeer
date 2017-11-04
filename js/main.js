/* Init */
var myApp = new Framework7({
    modalTitle: 'Ticketeer',
    material: true,
    tapHold: true
});
var $$ = Dom7;
var mainView = myApp.addView('.view-main', {});

/* Global Namespace*/
var DB = {};
DB.exec = null;
DB.permission = {};

/* Authentication */
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        $$('.form-login').hide();
        $$('.index-preloader').show();
        initDB(user.uid, function () {
            mainView.router.loadPage('main.html');
            setTimeout(() => {
                $$('.index-preloader').hide();
                $$('.form-login').show();
            }, 1000);
        });
    }
    else {
        // User signed out.
        // Turn off .on() listeners here.
    }
});

function initDB(uid, callback) {
    firebase.database().ref('execs/' + uid).once('value', function (data) {
        var exec = data.val();
        if (exec === null) {
            alert('Unregistered executive.');
            return;
        }
        DB.permission = {
            access: exec.clearance.access,
            description: exec.clearance.description
        }
        firebase.database().ref('admin/clearance/' + DB.permission.access + '/accessables/').once('value', function (data) {
            DB.permission.accessables = data.val();
            callback.call();
        }).catch(function (err) {
            alert(err);
        });;
    }).catch(function (err) {
        alert(err);
    });;
}

function login() {
    $$('.form-login').hide();
    $$('.index-preloader').show();
    var email = $$('.user-email').val();
    var pw = $$('.user-pw').val();
    try {
        firebase.auth().signInWithEmailAndPassword(email, pw).then(function () { }).catch(function (error) {
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

function register() {
    var reg = {
        name: $$('#txt-reg-name').val(),
        password: $$('#txt-reg-password').val(),
        password_confirm: $$('#txt-reg-password-confirm').val(),
        email: $$('#txt-reg-email').val(),
        phone: $$('#txt-reg-phone').val()
    }

    if (reg.name === "") { alert('Please enter your name.'); }
    else if (reg.password === "") { alert('Please enter your password.'); }
    else if (reg.password_confirm === "") { alert('Please confirm your password.'); }
    else if (reg.email === "") { alert('Please enter your email.'); }
    else if (reg.phone === "") { alert('Please enter your phone number.'); }
    else if (reg.password !== reg.password_confirm) { alert('Passwords do not match.'); }
    else {
        myApp.prompt('Please collect your registration code from the administrator', 'Registration Code', function (regCode) {
            firebase.database().ref('/admin/codes/' + regCode).once('value', function (data) {
                var code = data.val();
                if (code !== null) {
                    if (!code.used) {
                        firebase.auth().createUserWithEmailAndPassword(reg.email, reg.password).then(function (data) {
                            var exec = firebase.auth().currentUser;

                            //--------------------------------
                            // Set user info to database
                            //--------------------------------               
                            firebase.database().ref('execs/' + exec.uid).set({
                                email: reg.email,
                                name: reg.name,
                                phone: reg.phone,
                                timestamp_reg: Math.floor(Date.now()),
                                clearance: {
                                    access: "X",
                                    description: "Unassigned"
                                }
                            });

                            //------------------------------
                            // force sign out after sign up
                            //------------------------------
                            firebase.auth().signOut().then(function () {
                                // Sign-out successful.                    
                                mainView.router.back(); // Route later
                            }).catch(function (error) {
                                alert(error)
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
                    else {
                        alert('Code already used.')
                    }
                }
                else {
                    alert('Registration code not found.');
                }

            });
        })

    }
}

/* Operations */
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
    var user_uid = $$('.uid').text();
    var user_name = $$('.name').text();
    var exec_uid = firebase.auth().currentUser.uid;

    if (amount === null) { // check for null
        alert('Please select an amount!');
        return;
    }
    myApp.showIndicator();
    var timestamp = Math.floor(Date.now());
    firebase.database().ref('users/' + user_uid).update({
        "balance": change
    })
        .then(function () {
            firebase.database().ref('users/' + user_uid + '/transactions/' + timestamp).update({
                "timestamp": timestamp,
                "amount": amount,
                "operation": op
            })
            .then(function () {
                firebase.database().ref('execs/' + exec_uid + '/transactions/' + timestamp).update({
                    "user_name": user_name,
                    "user_uid": user_uid,
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

    cordova.plugins.barcodeScanner.scan(
      function (result) {
          if (result.cancelled) {
              mainView.router.loadPage('main.html');
              $$('.page-on-left').remove();
              mainView.history = ['index.html'];
              return;
          }
          var uid = result.text;
          //TODO: check for result.format and figure out what button triggers result.cancelled.
          myApp.showIndicator();

          var str1 = '<div data-page="reload" class="page"> <div class="page-content login-screen-content"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="index.html" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center"></div> <div class="right"></div> </div> </div> <div class="login-screen-title"> Reload </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value name">';
          var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value uid">';
          var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Balance</div> <div class="col-66 reload-details-value balance-var" value="';
          var str4 = '">';
          var str5 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <a href="#" class="button button-raised col-33" value="1" onclick="showReloadResult(this);">RM1</a> <a href="#" class="button button-raised col-33" value="2" onclick="showReloadResult(this);">RM2</a> <a href="#" class="button button-raised col-33" value="5" onclick="showReloadResult(this);">RM5</a> </div> </div> </li> </ul> </div> <div class="content-block"><a href="#" class="button button-big" onclick="confirmTransaction(\'reload\');">Confirm</a></div> </div> </div></div>';

          firebase.database().ref('users/' + uid).once('value', function (data) {
              if (data.val() !== null) {
                  var user = data.val();
                  var strPage = str1 + user.name + str2 + uid + str3 + user.balance + str4 + user.balance + str5;
                  mainView.loadContent(strPage);
                  myApp.hideIndicator();
              }
              else {
                  alert('User does not exist.');
                  mainView.router.loadPage('main.html');
                  $$('.page-on-left').remove();
                  mainView.history = ['index.html'];
                  myApp.hideIndicator();
              }
          }, function (err) {
              myApp.hideIndicator();
              alert(err);
          }).catch(function (err) {
              myApp.hideIndicator();
              alert(err);
          });
      },
      function (error) {
          alert("Scanning failed: " + error);
          mainView.router.loadPage('main.html');
          $$('.page-on-left').remove();
          mainView.history = ['index.html'];
      }
   );
}

function deduct() {

    cordova.plugins.barcodeScanner.scan(
     function (result) {
         if (result.cancelled) {
             mainView.router.loadPage('main.html');
             $$('.page-on-left').remove();
             mainView.history = ['index.html'];
             return;
         }
         var uid = result.text;
         //TODO: check for result.format and figure out what button triggers result.cancelled.
         myApp.showIndicator();

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
     },
     function (error) {
         alert("Scanning failed: " + error);
         mainView.router.loadPage('main.html');
         $$('.page-on-left').remove();
         mainView.history = ['index.html'];
     }
  );
}

/* History */
function history() {
    var pageContentHeader = '<div data-page="history" class="page"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="#" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center">History</div> </div> </div> <div class="page-content vehicle-history-page">';
    var pageContentFooter = '</div></div>';
    var pageContent = '';
    var uid = firebase.auth().currentUser.uid;
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

/* Management */
function manageView() {
    myApp.showIndicator();
    var pageHeader = '<div class="page" data-page="manage-view"><div class="navbar"><div class="navbar-inner"><div class="left"><a class="back link icon-only" href="index.html"><i class="icon icon-back"></i></a></div><div class="center">View Management</div></div></div><div class="page-content">';
    var pageFooter = '</div></div>';
    var pageContent = '';
    firebase.database().ref('admin/clearance/').once('value', function (data) {
        /*  Sort access level, load the title blocks to DOM.   
            Then append each execs into the blocks. 
            FIXIT: Database design is flawed, one function should only retrieve once.*/
        var clearances = data.val();
        var accessList = [];
        for (var accessId in clearances){
            accessList.push(accessId);
        }
        accessList.sort(sortAlphaNum);
        accessList.forEach(function (val, _, _) {
            pageContent += '<div class="access-block" style="display:none"><div class="content-block-title" >' + clearances[val].description + '</div>';
            pageContent += '<div class="list-block""><ul class="' + val + '-list"></ul></div></div>';
        });
        var strPage = pageHeader + pageContent + pageFooter;
        mainView.loadContent(strPage); // Load to DOM
        firebase.database().ref('execs/').once('value', function (data) {
            var execs = data.val();
            for (var exec_uid in execs) {
                var exec = execs[exec_uid];
                var accessClass = '.' + exec.clearance.access + '-list';
                var str1 = '<li><a href="#" class="item-link item-content"> <div class="item-inner"> <div class="item-title">';
                var str2 = '</div> </div></a></li>';
                $$(accessClass).append(str1 + exec.name + str2);
                $$(accessClass).closest('.access-block').show();
            }
            myApp.hideIndicator();
        });
    });
}

function manageAccessSettings() {
    myApp.showIndicator();
    var pageHeader = '<div class="page" data-page="manage-access-settings"><div class="navbar"><div class="navbar-inner"><div class="left"><a class="back link icon-only" href="index.html"><i class="icon icon-back"></i></a></div><div class="center">Access Settings</div></div></div><div class="page-content">';
    var pageFooter = '</div></div>';
    var pageContent = '';
    firebase.database().ref('admin/access/').once('value', function (data) {
        var settings = data.val();
        for (var settingKey in settings) {
            var setting = settings[settingKey];
            // add title here
            pageContent += '<div class="content-block-title">' + settingKey.toUpperCase() + '</div><div class="list-block accordion-list"><ul>';
            for (var subsettingKey in setting) {
                var subsetting = setting[subsettingKey];
                pageContent += '<li class="accordion-item"><a class="item-link item-content" href="#"><div class="item-inner"><div class="item-title">';
                pageContent += subsetting.description;
                pageContent += '</div></div></a><div class="accordion-item-content"><div class="list-block"><ul>';
                // add content here (checkboxes)
                for (var role in subsetting.accessed_by) {
                    pageContent += '<li> <label class="label-checkbox item-content"> <input type="checkbox" ';
                    //console.log(role + ' is ' + subsetting.accessed_by[role]);
                    if (subsetting.accessed_by[role]) { pageContent += 'checked '; }
                    //else { pageContent += 'f' }
                    //else alert('error');
                    pageContent += 'name="' + subsettingKey + '" value="' + role + '">';
                    pageContent += '<div class="item-media"><i class="icon icon-form-checkbox"></i></div> <div class="item-inner"> <div class="item-title">';
                    pageContent += role + '</div> </div> </label> </li>';
                }
                pageContent += '</ul></div></div>';
            }
            pageContent += '</ul></div>';
        }
        var strPage = pageHeader + pageContent + pageFooter;
        mainView.loadContent(strPage); // Load to DOM
        myApp.hideIndicator();
    });
}

/* Misc. */
function sortAlphaNum(a,b) {
    // Thanks @epascarello from StackOverflow
    var reA = /[^a-zA-Z]/g;
    var reN = /[^0-9]/g;
    var aA = a.replace(reA, "");
    var bA = b.replace(reA, "");
    if(aA === bA) {
        var aN = parseInt(a.replace(reN, ""), 10);
        var bN = parseInt(b.replace(reN, ""), 10);
        return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
        return aA > bA ? 1 : -1;
    }
}

