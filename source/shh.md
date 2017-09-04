---
layout: layouts/layout.erb
---
# The Sprout Recital

## Hi, Amazing players!

I'll update this page with the show's Set (playlist) and add links to rehearsal demos and lead sheets.

Since most of the songs are fairly simple, I hope you would have them memorized. I think reading the lead sheets during a show is distracting.

Please feel free to make suggestions and improvements.

## The Set / Playlist

The main links lead to my Evernote notes about each song, which is where you can find the updated Lyrics as well as Sibelius files, older drafts etc'.

You can also click "Demo" to listen to a demo of a conceptual arrangement for our band and you can click "PDF" for the score or lead sheet.

1. [Hello (Please Don't Say Goodbye)](https://www.evernote.com/l/AMdckF7s04BCR5HT-wpKlVqQXbURhvRPoTs) - <a href='media/hello.m4a' onclick='player.next();player.set_sources("media/hello.m4a");player.play();return false;'>Demo</a> / [PDF](media/hello.pdf)

1. [Bad Boy](https://www.evernote.com/l/AMc-dimL6UtAf7RrZlyy6_qQ2FvXQnDDwXw) - <a href='media/bad_boy.m4a' onclick='player.next();player.set_sources("media/bad_boy.m4a");player.play();return false;'>Demo</a> / [PDF](media/bad_boy.pdf)

1. [She (He) Was a Lost Soul](https://www.evernote.com/shard/s199/nl/2147483647/235bf246-5c07-4eb0-8f4f-7b557e43ffcf/) -  <a href='media/lost_soul.m4a' onclick='player.next();player.set_sources("media/lost_soul.m4a");player.play();return false;'>Demo</a> / [PDF](media/lost_soul.pdf)

1. [Tears To My Smile](https://www.evernote.com/l/AMeV5kSt0BJEJo586yfT8CJxkt6KSNjtXPg) -  <a href='media/tears2smile.m4a' onclick='player.next();player.set_sources("media/tears2smile.m4a");player.play();return false;'>Demo</a> / [PDF](media/tears2smile.pdf) (Bo solo)

1. [Never Was A Touching Man](https://www.evernote.com/l/AMf5sGF3qUVGF5gRvM0w9wpsab2EC3VHsdQ) -  <a href='media/never_was.m4a' onclick='player.next();player.set_sources("media/never_was.m4a");player.play();return false;'>Demo</a> / [PDF](media/never_was.pdf) (Bo vocals)

1. [Miss You When I'm Gone](https://www.evernote.com/l/AMfdgKRYIfhNvZ4WXa3jhH-EgY5Mog89dLI) -  <a href='media/miss_you_when.m4a' onclick='player.next();player.set_sources("media/miss_you_when.m4a");player.play();return false;'>Demo</a> / [PDF](media/miss_you_when.pdf) (Bo vocals) (MISSING)

1. [Tell Me](https://www.evernote.com/l/AMfpDbGCfJpJ3asf1hE817x4yC9VOOf-wqc) -  <a href='media/tell_me.m4a' onclick='player.next();player.set_sources("media/tell_me.m4a");player.play();return false;'>Demo</a> / [PDF](media/tell_me.pdf) (missing demo)

1. [Nightmare (I've got so much to give)](https://www.evernote.com/l/AMfVsH1UqfxH1ZoDOAb4rZuY3JbC1V-Z-6Y) -  <a href='media/nightmare.m4a' onclick='player.next();player.set_sources("media/nightmare.m4a");player.play();return false;'>Demo</a> / [PDF](media/nightmare.pdf) (MISSING PDF)

1. [Guilty Dealings](https://www.evernote.com/l/AMe3FO8InhVOX6b7qkNlzlon9iSqEOhMPCQ) -  <a href='media/guilty_dealings.m4a' onclick='player.next();player.set_sources("media/guilty_dealings.m4a");player.play();return false;'>Demo</a> / [PDF](media/guilty_dealings.pdf) (demo has old lyrics)


Some songs I considered and left. Let me know if you think we should put them back instead of one of the existing songs:

1. [Tonight (Sorry)](https://www.evernote.com/l/AMetRIfA2RVJVqiJeXoEws9ibIlQII6jCTM) -  <a href='media/tonight.m4a' onclick='player.next();player.set_sources("media/tonight.m4a");player.play();return false;'>Demo</a> / [PDF](media/tonight.pdf) (MISSING)

1. [Jimmie the Cloud](https://www.evernote.com/l/AMfl4lZ_rbRKlKhTbq-F2o829W56X7MDyyE) -  <a href='media/jimmie_the_cloud.m4a' onclick='player.next();player.set_sources("media/jimmie_the_cloud.m4a");player.play();return false;'>Demo</a> / [PDF]() (missing PDF)


<script type="text/javascript">
    var player = undefined;
    function play_file(e) {
        player.next();
        player.set_sources("media/" + e.target.attributes.data_name.textContent + ".m4a");
        player.play();
        return false;
    }

    function print_links() {
        var l = document.links;
        for (var i = l.length - 1; i >= 0; i--) {
            if(l[i].attributes.data_name) {
                l[i].onclick = play_file;
                l[i].href = "media/" + l[i].attributes.data_name.textContent + ".m4a";
                var pdf_link = document.createElement("a");
                pdf_link.appendChild(document.createTextNode("PDF"));
                pdf_link.href = "media/" + l[i].attributes.data_name.textContent + ".pdf";
                l[i].insertAdjacentElement('afterend', pdf_link);
                l[i].insertAdjacentText('afterend', " / ");
            }
        }
    }

    function init_player() {
        document.getElementById('player_container').className = "active";
        player = new BoPlayer('player'); // , 'content'
        player.autoplay = false;
        player.set_volume(1);
        player.next();
        player.enable_keyboard();
        player.on_play = (p) => {console.log("now playing" , p.player.currentSrc)};
        print_links();
    };
    addEventListener("load", init_player);


</script>
