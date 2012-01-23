/* Author: 
   Gabor Foldes
   (C) Flyleaf 2012
*/

$(function(){

    window.lastLoaded = '';
    
    window.contentroot = 'contents/';
    
    $('article').html('Loading chapter...');

    $.ajaxSetup({
      error: function(xhr, status, error) {
        $('article').html("Sorry, it looks like we messed up and for some reason we couldn't load the chapter.  We are looking into it...");
        console.log('Error:', status, error);
      }
    });
    
    function loadChapter (ch) {
        if (window.lastLoaded == ch) { return false; } 
        else {
            window.lastLoaded = ch;
            var fullurl = window.bookroot + window.contentroot + ch;
            //$('header').append('<pre>Loading: ' + ch + '</pre>')
            if (ch === 'cover') {
                $('article').html('<center><img src="' + fullurl + '" style="height:90%" /></center>');
            } else {
                $.get(fullurl, function(data) {
                    var article = $(data).find('article');
                    console.log(article);
                    var nav = $(data).find('nav');
                    var headext = $(data).find('headext');
                    var title = $(data).find('title');
                    if (title) { $('head title').html(title.html()); }
                    $('head').append(headext.html())
                    $('nav').html(nav.html());
                    $('article').html(article.html());
                    $('#prev').attr('href', parseInt(ch)-1);
                    $('#next').attr('href', parseInt(ch)+1);
                    var h = ch.split('#');
                    if (h.length > 1) { $.scrollTo('#' + h[1]); /*document.location.hash = h[1];*/ }
                }, 'html');
            }
        }
    }

    $('article, nav, header').on('click', 'a', function(event) {
        if (this.hostname == location.hostname) {
            var loc = $(this).attr('href');
            history.pushState({}, '', window.bookroot + loc)
            loadChapter(loc);
            event.stopPropagation();
            event.preventDefault();
        }
    });
    
    function loadCurrent() {
        var pathitems = location.pathname.split('/');
        var loc = '';
        if ( window.bookroot != 'undefined' && pathitems.length > 1 ) { window.bookroot = '/' + pathitems[1] + '/'; }
        if ( pathitems.length > 2 ) { loc = pathitems[2]; }
        if (location.hash) { loc += location.hash; }
//       $('header').append('here we go: ' + loc);
        loadChapter(loc);
    }

    $(window).on('popstate', function(event) {
        loadCurrent();
    });
    
    $(window).touchwipe({
        wipeLeft: function() { $('#next').click(); },
        wipeRight: function() { $('#prev').click(); },
        preventDefaultEvents: false
    });
    
    loadCurrent();

});
























