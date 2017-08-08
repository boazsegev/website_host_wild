---
layout: layouts/layout.erb
---
# My Portfolio

Here you will find examples of songs I wrote and work I have performed.

Please choose the style and piece you wish to listen to from the menu.

To listen please press on the play button at the bottom of the page.

<!-- TODO -->

<script type="text/javascript">
    var player = undefined;
    function init_player() {
        document.getElementById('player_container').className = "active";
        player = new BoPlayer('player');
        player.autoplay = true;
        player.set_volume(1);
        player.playlist.push("media/whilemyguitar.m4a");
        player.playlist.push("media/jimmie_the_cloud.m4a");
        player.playlist.push("media/hello.m4a");
        player.next();
        player.enable_keyboard();
        player.on_play = (p) => {console.log("now playing" , p.player.currentSrc)};
    };
    addEventListener("load", init_player);
</script>
