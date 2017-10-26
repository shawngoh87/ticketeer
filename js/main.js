/* Init */
var myApp = new Framework7({
    modalTitle: 'Project Appss',
    material: true,
});
var $$ = Dom7;
var mainView = myApp.addView('.view-main', {});

/* Global */
function reload() {

    // Init QR Scanner
    var done = function (err, status) {
        if (err) {
            alert(err._message);
        } else {
            //alert('QRScanner is initialized. Status:');
            //alert(status);
        }
    };
    QRScanner.prepare(done);

    // Hide all elements for preview
    $("html").find('*').attr('style',
        '   background: none transparent !important; \
                    color: none transparent !important; \
                    display: none;\
                '
        );

    // If scanned, show all elements
    var scanned = function (err, uid) {
        if (err) {
            alert(err._message);
        }
        alert('URL: ' + uid);
        $("html").find('*').attr('style', '');

        //mainView.router.loadPage('reload.html');

        var str1 = '<div data-page="reload" class="page"> <div class="page-content login-screen-content"> <div class="login-screen-title"> Reload </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value">';
        var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value">';
        var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Amount</div> <div class="col-66 reload-details-value">';
        var str4 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Remark</div> <div class="col-66 reload-details-value">';
        var str5 = '</div> </div> </div> </li> </ul> </div> <div class="content-block"><a href="main.html" class="button button-big" onclick="alert(\'Reloaded!\');">Confirm</a></div> </div> </div></div>';
        var user = {
            name: "Lorem Ipsum",
            uid: "12ef-4352-7ae9-1bc4",
            amount: 5,
            remark: "a bit retarded"
        }

        var strPage = str1 + user.name + str2 + user.uid + str3 + user.amount + str4 + user.remark + str5;
        mainView.loadContent(strPage);
    };
    QRScanner.scan(scanned);

    QRScanner.show();


}

function deduct() {

    // Init QR Scanner
    var done = function (err, status) {
        if (err) {
            alert(err._message);
        } else {
            //alert('QRScanner is initialized. Status:');
            //alert(status);
        }
    };
    QRScanner.prepare(done);

    // Hide all elements for preview
    $("html").find('*').attr('style',
        '   background: none transparent !important; \
                    color: none transparent !important; \
                    display: none;\
                '
        );

    // If scanned, show all elements
    var scanned = function (err, uid) {
        if (err) {
            alert(err._message);
        }
        alert('URL: ' + uid);
        $("html").find('*').attr('style', '');

        //mainView.router.loadPage('reload.html');

        var str1 = '<div data-page="deduct" class="page"> <div class="page-content login-screen-content"> <div class="login-screen-title"> Deduct </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value">';
        var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value">';
        var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Amount</div> <div class="col-66 reload-details-value">';
        var str4 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Remark</div> <div class="col-66 reload-details-value">';
        var str5 = '</div> </div> </div> </li> </ul> </div> <div class="content-block"><a href="main.html" class="button button-big" onclick="alert(\'Deducted!\');">Confirm</a></div> </div> </div></div>';
        var user = {
            name: "Lorem Ipsum",
            uid: "12ef-4352-7ae9-1bc4",
            amount: 5,
            remark: "a bit retarded"
        }

        var strPage = str1 + user.name + str2 + user.uid + str3 + user.amount + str4 + user.remark + str5;
        mainView.loadContent(strPage);
    };
    QRScanner.scan(scanned);

    QRScanner.show();
}

function history() {
    var str1 = '<div data-page="reload" class="page"> <div class="page-content login-screen-content"> <div class="login-screen-title"> Reload </div> <div class="content-block"> <div class="list-block inputs-list"> <ul> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Name</div> <div class="col-66 reload-details-value">';
    var str2 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">UID</div> <div class="col-66 reload-details-value">';
    var str3 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Amount</div> <div class="col-66 reload-details-value">';
    var str4 = '</div> </div> </div> </li> <li class="item-content"> <div class="item-inner"> <div class="row"> <div class="col-33 reload-details-key">Remark</div> <div class="col-66 reload-details-value">';
    var str5 = '</div> </div> </div> </li> </ul> </div> <div class="content-block"><a href="main.html" class="button button-big" onclick="alert(\'Reloaded!\');">Confirm</a></div> </div> </div></div>';
    var user = {
        name: "Lorem Ipsum",
        uid: "12ef-4352-7ae9-1bc4",
        amount: 5,
        remark: "a bit retarded"
    }

    var strPage = str1 + user.name + str2 + user.uid + str3 + user.amount + str4 + user.remark + str5;
    mainView.loadContent(strPage);
}

function showLoading() {

}