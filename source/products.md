---
layout: layouts/layout.erb
---
# Your Story - Straight to the Heart

My work as a musician, a songwriter and a music producer made one thing clear - you are at the center of my work.

My work is all about discovering **your** *voice*, **your** *story* and **your** *essence*.

As a songwriter I will help you focus your story and express your emotions. The melody, the harmony and the lyrics will work together to match your voice, to express your character and expose the context of your story.

As a producer I'll make sure that the track supports the arc and journey of your story as we pull the listener along and keep them engaged.

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
