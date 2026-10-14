var cur = 0;

$('body').keyup(function (e) {

    if (e.altKey && (e.which == 112 || e.which == 80)) {
        $('body').removeClass('cursor1');
        $('body').removeClass('cursor2');
        if (cur == 0) {
            $('body').addClass('cursor1');
            cur = 1;
        }
        else if (cur == 1) {
            cur = 2;
            $('body').addClass('cursor2');
        }
        else {
            cur = 0;
        }
    }

    if (!e.ctrlKey) {
        return;
    }

    // -->
    if (e.which == 39) {
       window.location = frward;
    }
    // <--
    if (e.which == 37) {
        window.location = backward;
    }
       

});