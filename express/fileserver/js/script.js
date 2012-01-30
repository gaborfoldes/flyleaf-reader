/* Author: 
   Gabor Foldes
   (C) Flyleaf 2012
*/

$(function(){

    window.lastLoaded = '';
    window.chapterpath = 'chapters/';
    
    $('article').html('Loading chapter...');

    $.ajaxSetup({
      error: function(xhr, status, error) {
        $('article').html('<center>Sorry, it looks like we messed up and we could not load the requested page.</center>');
        console.log('Error:', status, error);
      }
    });
    
    function loadChapter (ch, scrolltop) {
        if (window.lastLoaded == ch) { return false; } 
        else {
            window.lastLoaded = ch;
            var fullurl = window.readroot + window.bookid + window.chapterpath + ch;
//            $('header').append('<pre>Loading: ' + fullurl + '</pre>')
            $.get(fullurl, function(data) {
                var article = $(data).children('article');
                var nav = $(data).children('nav');
                var headext = $(data).children('headext');
                var title = $(data).children('title');
                if (title) { $('head title').html(title.html()); }
                $('head').append(headext.html())
                $('nav').html(nav.html());
                $('article').html(article.html());
                setSize(window.scale, true);
                if (parseInt(ch) && parseInt(ch) > 0) { $('#prev').attr('href', parseInt(ch)-1); }
                    else { $('#prev').attr('href', '#'); } 
                if (parseInt(ch)+1) { $('#next').attr('href', parseInt(ch)+1); }
                    else { $('#next').attr('href', '#'); } 
                if (parseInt(ch)) { $('#position').html((parseInt(ch)+1)) } else { $('#position').html(''); }
                window.localStorage.setItem(window.bookid + '-lastchapter', ch);
                if (scrolltop) {
                    $(window).scrollTop(scrolltop);
                } else {
                    var h = ch.split('#');
                    if (h.length > 1) { $.scrollTo('#' + h[1]); /*document.location.hash = h[1];*/ }
                }
            }, 'html');
        }
    }

    $('article, .internal-link').on('click', 'a', function(event) {
        if (this.hostname == location.hostname) {
            var loc = $(this).attr('href');
            if (loc != '#') {
                history.pushState({}, '', window.readroot + window.bookid + loc)
                loadChapter(loc);
            }
            event.stopPropagation();
            event.preventDefault();
        }
    });
    
    
    function loadCurrent() {

        var pathitems = location.pathname.split('/');
        var loc = 'toc';
        if ( window.readroot != 'undefined' && pathitems.length > 1 ) { window.readroot = '/' + pathitems[1] + '/'; }
        if ( window.bookid != 'undefined' && pathitems.length > 2 ) { window.bookid = pathitems[2] + '/'; }
        if ( pathitems.length > 3 ) { loc = pathitems[3]; }
        if (location.hash) { loc += location.hash; }
//        $('header').append('here we go: ' + loc);

        var storedScale = window.localStorage.getItem(window.bookid + '-scale');
        if (storedScale) { window.scale = storedScale; }

        var storedScroll = null;
        console.log(window.lastLoaded);
        if (window.lastLoaded == '') {
            var storedLoc = window.localStorage.getItem(window.bookid + '-lastchapter');
            if (storedLoc) {
                loc = storedLoc;
                history.replaceState({}, '', window.readroot + window.bookid + loc)
                storedScroll = window.localStorage.getItem(window.bookid + '-scrolltop');
            }
        }
        loadChapter(loc, storedScroll);
    }

    var popped = ('state' in window.history), initialURL = location.href;

    $(window).on('popstate', function(event) {
        var initialPop = !popped && location.href == initialURL;
        popped = true;
        if ( initialPop ) return;
  
        loadCurrent();
    });
    

    window.swipeStartX = -1;
    window.swipeStartY = -1;
    
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length == 1) {
         window.swipeStartX = event.touches[0].pageX;
         window.swipeStartY = event.touches[0].pageY;
        }
    }, false);

    document.addEventListener('touchend', function(event) {
        if ((window.swipeStartX != -1) && (window.swipeStartY != -1)) {
            var dx = (event.changedTouches[0].pageX - window.swipeStartX)/window.innerWidth*100;
            var dy = (event.changedTouches[0].pageY - window.swipeStartY)/window.innerHeight*100;
//            $('header').append('Swipe: ', dx, 'x', dy);
            if ((Math.abs(dx) > 30) && (Math.abs(dy) < 15)) {
                if (dx<0) { $('#next').click(); }
                else { $('#prev').click(); }
            }
            window.swipeStartX = -1;
            window.swipeStartY = -1;
        }
    });
    
    window.scale = 1.0;
    window.scaleMultiplier = 1.1;
    window.maxScale = 1.8;
    
    function setSize (scale, resetMain) {
/*        if (resetMain) { $('#main').css('font-size', 16); }
        $.each($('#main, #main div, #main span, #main p'), function() {
            $(this).css('font-size', parseFloat($(this).css('font-size')) * scale);
        });
*/
        $('#main').css('font-size', (resetMain) ? 16.0 * scale : parseFloat($('#main').css('font-size')) * scale);
        $.each($('#main img, #flyleaf-toc'), function() {
            $(this).css('zoom', parseFloat($(this).css('zoom')) * scale);
        });
    }
    
    $('#fontup').click( function() {
        if (window.scale < window.maxScale) {
            setSize(window.scaleMultiplier, false);
            window.scale *= scaleMultiplier;
            window.localStorage.setItem(window.bookid + '-scale', window.scale);
        }
    });

    $('#fontdown').click( function() {
        if (window.scale > 1/window.maxScale) {
            setSize(1/window.scaleMultiplier, false);
            window.scale /= scaleMultiplier;
            window.localStorage.setItem(window.bookid + '-scale', window.scale);
        }
    });

    $(window).scroll( function () {
        window.localStorage.setItem(window.bookid + '-scrolltop', $(this).scrollTop());
    });

    loadCurrent();

});
























