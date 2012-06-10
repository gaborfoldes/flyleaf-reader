$(function(){

    $('.searchform').submit(function(event){
        var query = escape($('.searchfield').attr('value').replace(/ /g, '+'));
        $.get('http://www.feedbooks.com/books/search.atom?query=' + query, function (data) {
            $('#searchresults').html('');
            $(data).find('entry').each(function(index) {
                var title = $(this).children('title').text();
                var author = '';
                $(this).children('author').each(function(){
                    author += ((author != '') ? ', ' : '') + $(this).children('name').text();
                });
                var fbid = $(this).children('id').text().match(/[^\/]*$/);
                var bookid = title.toLowerCase().replace(/ /g, '-').replace(/[\:\'\(\)]/g, '');
                var summary = $(this).children('summary').text();
                $('#searchresults').append( '<a href="/feedbooks/' + fbid + '/' + bookid + '">' +
                    author + ': ' + title +
                    '</a><p>' + summary + '</p>'
                );
            });
        }, 'xml');
        event.preventDefault();
    });
    
});
