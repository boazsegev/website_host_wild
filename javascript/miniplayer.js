/*
Copyright: Boaz Segev, 2017
License: MIT

Feel free to copy, use and enjoy according to the license provided.
*/

/**
The MiniPlayer is a simple audio player that utilizes the HTML5 audio object
using a circular GUI player instead of the OS's player.

MiniPlayer displays controls for volume (outer ring), position (middle ring) and
play / pause (inner circle).

Volume and seeking are controlled clicking / touching the MiniPlayer and moving
the cursor (or finger). Double click / tap will skip forward and a triple click
/ tap will skip backwards. Keyboard control is also available (off by default).

Multiple MiniPlayer instances can be initialized on a single page, allowing
multiple streams to play at the same time. However, keyboard control is limited
to a single MiniPlayer instance and must be initialized for that object.

On iOS, it's impossible to control volume (seeking still works) or to start in
autoplay mode. Also only one MiniPlayer object can play at any given time.

These limitations are imposed by iOS, where volume is controlled by the physical
device and autoplay requires the user's interaction to confirm playback (a
security measure).

================================================================================

To create a MiniPlayer, a "parent" DOM object is required. The player will be
drawn over the parent element matching the element's size.

After the player had been created it's possible to set the source urls for audio
playback.

Audio will begin playing automatically when enough data was downloaded, unless
the `autoplay` property was set to `false`.

i.e.

    <html>
    <head>
      <script type="text/javascript" src='javascript/miniplayer.js'></script>
    </head>
    <body>
      <div id='player' style='width:100px; height:100px;'></div>
      <script>
        var player = new MiniPlayer('player');
        player.set_sources(["source.mp3", "source.ogg"]);
      </script>
    </body>
    </html>

It's possible to add audio media to a player's playlist. Any urls added to the
playlist will be played automatically (if the file format is supported by the
player and `autoplay` wasn't disabled). i.e.:

    player.playlist.push("song2.mp3");
    // or, including an ogg fallback
    player.playlist.push(["song2.mp3", "song2.ogg"]);

It's possible to access the undelying HTML5 audio object using the `player`
property. i.e.:

    player.player.pause();

Evey time a song starts to play, the `on_play` callback is called. i.e.

    player.on_play = (p) => { console.log(p.player.currentSrc); };

Once playback stops, the `on_stop` callback is called. i.e.

    player.on_stop = (p) => { p.set_sources("repeat_me.mp3"); };

It's possible to enable keyboard controls using the `enable_keyboard` method.
Only one player can have control of the keyboard.

    player.enable_keyboard();

*/
function MiniPlayer(obj_id) {
  this.vol_background = "#557";
  this.vol_color = "#99f";
  this.time_background = "#756";
  this.time_color = "#f9a";
  this.background = "rgba(85,85,120,0.5)";
  this.color = "rgba(255,120,255,0.5)";
  this.on_stop = false;
  this.autoplay = true;

  this.playlist = [];
  this.history = [];
  this._tap_count = 0;

  this.obj_id = obj_id;
  this.container = document.getElementById(obj_id);
  this.container.owner = this;
  this.container.state = 0;

  this.canvas = document.createElement('canvas');
  this.canvas.owner = this;
  this.canvas.style.position = "absolute";
  this.canvas.style.top = "0";
  this.canvas.style.left = "0";
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.container.appendChild(this.canvas);

  this.player = document.createElement('audio');
  this.player.owner = this;
  this.player.controls = false;
  this.player.autoplay = false;
  this.player.style.position = "absolute";
  this.player.style.display = "hidden";
  this.player.style.top = "0";
  this.player.style.left = "0";
  this.player.style.width = "0px";
  this.player.style.height = "0px";
  this.container.appendChild(this.player);
  this.player.addEventListener("timeupdate",
                               function(e) { e.target.owner.redraw(); });
  this.player.addEventListener("seeked",
                               function(e) { e.target.owner.redraw(); });
  this.player.addEventListener("canplaythrough", function(e) {
    if (e.target.owner.autoplay) {
      e.target.owner.play();
    }
  });
  this.player.addEventListener("play", function(e) {
    e.target.owner.redraw();
    if (e.target.owner.on_play)
      e.target.owner.on_play(e.target.owner);
  });
  this.player.addEventListener("volumechange",
                               function(e) { e.target.owner.redraw(); });
  this.player.addEventListener("loadedmetadata", function(e) {
    // console.log(e);
    // e.target.owner.container.title = "";
  });
  this.player.addEventListener("ended", function(e) {
    e.target.owner.redraw();
    if (!(e.target.owner.autoplay && e.target.owner.next()) &&
        e.target.owner.on_stop)
      e.target.owner.on_stop(e.target.owner);
  });

  this.controller = document.createElement('controller');
  this.controller.owner = this;
  this.controller.state = 0;
  this.controller.style.position = "absolute";
  this.controller.style.display = "none";
  this.controller.style.top = "0";
  this.controller.style.left = "0";
  this.controller.style.width = "100%";
  this.controller.style.height = "100%";
  this.controller.style["z-index"] = "99999";
  document.body.appendChild(this.controller);

  this.container.addEventListener("mousedown", function(e) {
    // make sure the player is active before allowing control state.
    if (e.target.owner.player.seekable.length == 0 ||
        e.target.owner.player.played.length == 0)
      return false;
    e.target.owner.controller.style.display = "block";
    e.target.owner.controller.mouse_xy = {x : e.pageX, y : e.pageY};

    if (e.target.owner._last_tap &&
        e.timeStamp - e.target.owner._last_tap < 200)
      e.target.owner._tap_count++;
    else
      e.target.owner._tap_count = 1;
    e.target.owner._last_tap = e.timeStamp;
    if (e.target.owner._last_tap_timeout) {
      window.clearTimeout(e.target.owner._last_tap_timeout);
      e.target.owner._last_tap_timeout = false;
    }
    e.target.owner._last_tap_timeout = window.setTimeout(function(pl) {
      switch (pl._tap_count) {
      case 2:
        console.log("next");
        pl.controller.state = 0;
        pl.controller.style.display = "none";
        pl.next();
        break;
      case 3:
        console.log("prev");
        pl.controller.state = 0;
        pl.controller.style.display = "none";
        pl.prev();
        break;
      }
      pl._tap_count = 0;
      pl._last_tap_timeout = false;
    }, 300, e.target.owner);

    e.returnValue = false;
    return false;
  });
  this.container.addEventListener("touchstart", function(e) {
    // make sure the player is active before allowing control state.
    e.target.mouse_xy = {x : e.pageX, y : e.pageY};
    e.target.state = 0;

    if (e.target.owner._last_tap &&
        e.timeStamp - e.target.owner._last_tap < 500)
      e.target.owner._tap_count++;
    else
      e.target.owner._tap_count = 1;
    e.target.owner._last_tap = e.timeStamp;
    if (e.target.owner._last_tap_timeout) {
      window.clearTimeout(e.target.owner._last_tap_timeout);
      e.target.owner._last_tap_timeout = false;
    }
    e.target.owner._last_tap_timeout = window.setTimeout(function(pl) {
      switch (pl._tap_count) {
      case 2:
        console.log("next");
        pl.controller.state = 0;
        pl.controller.style.display = "none";
        pl.next();
        break;
      case 3:
        console.log("prev");
        pl.controller.state = 0;
        pl.controller.style.display = "none";
        pl.prev();
        break;
      }
      pl._tap_count = 0;
      pl._last_tap_timeout = false;
    }, 500, e.target.owner);

    e.returnValue = false;
    return false;
  });
  this.container.addEventListener("mouseup", function(e) {
    // make sure the player is actuve before allowing control state.
    if (e.target.owner.player.seekable.length == 0 ||
        e.target.owner.player.played.length == 0)
      e.target.owner.play_or_pause();
    return false;
  });
  this.container.addEventListener("mousedown", function(e) {
    // make sure the player is actuve before allowing control state.
    if (e.target.owner.player.seekable.length == 0 ||
        e.target.owner.player.played.length == 0)
      e.target.owner.play_or_pause();
    return false;
  });
  this.container.addEventListener("touchend", function(e) {
    // make sure the player is actuve before allowing control state.
    if (e.target.state == 0)
      e.target.owner.play_or_pause();
    else if (e.target.state == 2) {
      e.target.owner.autoplay = e.target.owner.autoplay_store;
      delete e.target.owner.autoplay_store;
      e.target.owner.play();
    }

    e.target.state = 0;
    return false;
  });

  this.controller.addEventListener("mouseup", function(e) {
    if (e.target.state == 0)
      e.target.owner.play_or_pause();
    else if (e.target.state == 2) {
      e.target.owner.autoplay = e.target.owner.autoplay_store;
      delete e.target.owner.autoplay_store;
      e.target.owner.play();
    }

    e.target.state = 0;
    e.target.style.display = "none";
    return false;
  });
  this.controller.addEventListener("mouseout", function(e) {
    if (e.target.state == 2) {
      e.target.owner.autoplay = e.target.owner.autoplay_store;
      delete e.target.owner.autoplay_store;
      e.target.owner.play();
    }
    e.target.state = 0;
    e.target.style.display = "none";
    return false;
  });

  var func_move = function(e) {
    var xy = {x : e.pageX, y : e.pageY};
    var old_xy = e.target.mouse_xy;
    if (e.target.state == 0) {
      // make sure the difference is noticable (more than 5px)
      if (Math.abs(xy.x - old_xy.x) < 5 && Math.abs(xy.y - old_xy.y) < 5)
        return false;
      // set state:
      //   1 == volume control
      //   2 == seeking / time control
      if (Math.abs(xy.x - old_xy.x) > Math.abs(xy.y - old_xy.y)) {
        e.target.owner.autoplay_store = e.target.owner.autoplay;
        e.target.owner.autoplay = false;
        e.target.owner.pause();
        e.target.state = 2;
      } else {
        e.target.state = 1;
      }
    }
    if (e.target.state == 1) {
      //   volume control - won't work on iOS.
      var target_volume =
          e.target.owner.player.volume + (0.01 * (old_xy.y - xy.y));
      if (target_volume > 1)
        target_volume = 1;
      else if (target_volume < 0)
        target_volume = 0;
      e.target.owner.player.volume = target_volume;
    } else {
      //   seeking / time control
      var new_time =
          e.target.owner.player.currentTime + (0.5 * (xy.x - old_xy.x));
      var total_time = e.target.owner.player
                           .duration // e.target.owner.player.seekable.end(0);
      if (new_time >= total_time)
      e.target.owner.player.currentTime = total_time - 0.1;
      else if (new_time <= 0)
      e.target.owner.player.currentTime = 0;
      else e.target.owner.player.currentTime = new_time;
    }
    e.target.mouse_xy = xy;
    e.returnValue = false;
    return false;
  };
  this.controller.addEventListener("mousemove", func_move);
  this.container.addEventListener("touchmove", func_move);

  if (window.javascript_player_objects == undefined) {
    window.javascript_player_objects = [];
  }
  window.javascript_player_objects.push(this);

  window.addEventListener("resize", function(e) {
    var len = window.javascript_player_objects.length;
    for (var i = 0; i < len; i++) {
      window.javascript_player_objects[i].redraw();
    }
  });

  this.redraw();
  this;
};

MiniPlayer.prototype.draw_volume = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  // Draw background
  context.beginPath();
  context.strokeStyle = this.vol_background;
  context.lineWidth = Math.floor(radius_limit * 0.05);
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.4, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  context.stroke();
  // Draw volume value
  if (this.player.volume > 1)
    this.player.volume = 1;
  if (this.player.volume < 0)
    this.player.volume = 0;
  context.beginPath();
  context.strokeStyle = this.vol_color;
  context.lineWidth = Math.floor(radius_limit * 0.04);
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.4, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * this.player.volume * 0.75));
  context.stroke();
};

MiniPlayer.prototype.draw_time = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  var time = 0.0;
  if (!isNaN(this.player.duration) && this.player.duration > 0) {
    time = player.player.currentTime / this.player.duration;
  }
  // Draw background
  context.beginPath();
  context.strokeStyle = this.time_background;
  context.lineWidth = Math.floor(radius_limit * 0.05);
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.3, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  context.stroke();
  // Draw time value
  context.beginPath();
  context.strokeStyle = this.time_color;
  context.lineWidth = Math.floor(radius_limit * 0.04);
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.3, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * time * 0.75));
  context.stroke();
};

MiniPlayer.prototype.draw_state = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  // Clear & Draw background
  // clear current frame
  context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  context.beginPath();
  context.strokeStyle = this.background;
  context.fillStyle = this.background;
  context.lineWidth = radius_limit * 0.05;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.25, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  // context.stroke();
  context.fill();
  // Draw content
  if (this.player.paused) {
    // draw "paused" state
    context.beginPath();
    context.strokeStyle = this.color;
    context.moveTo(radius_limit * 0.4, radius_limit * 0.65);
    context.lineTo(radius_limit * 0.6, radius_limit * 0.5);
    context.lineTo(radius_limit * 0.4, radius_limit * 0.35);
    context.stroke();
  } else {
    // draw "playing" state
    context.beginPath();
    context.strokeStyle = this.color;
    context.moveTo(radius_limit * 0.4, radius_limit * 0.65);
    context.lineTo(radius_limit * 0.4, radius_limit * 0.35);
    context.stroke();
    context.beginPath();
    context.strokeStyle = this.color;
    context.moveTo(radius_limit * 0.6, radius_limit * 0.65);
    context.lineTo(radius_limit * 0.6, radius_limit * 0.35);
    context.stroke();
  };
};
/** sets playback volume within the range of 0..1 (i.e. 0.75).*/
MiniPlayer.prototype.set_volume = function(volume) {
  if (volume > 1)
    volume = 1;
  if (volume < 0)
    volume = 0;
  this.player.volume = volume;
  this.draw_volume();
};

MiniPlayer.prototype.get_volume = function(volume) {
  return this.player.volume;
};
/**
Sets the current source for playback and initiates playback (unless `autoplay`
was set to `false`).

It's possible to set fallback sources by passing an array of strings instead of
a single string.
*/
MiniPlayer.prototype.set_sources = function(sources) {
  // clear existing sources.
  while (this.player.firstChild) {
    this.player.removeChild(this.player.firstChild);
  }
  if (!sources) {
    this.player.src = "";
    this.player.load();
    return;
  }
  // add requested sources.
  if (typeof(sources) == typeof(""))
    sources = [ sources ];
  else if (typeof(sources) == typeof([]) && (sources instanceof Array)) {
    console.error(
        "player sources should be either a string or an array, but got",
        sources);
  }
  var unset = true;
  for (var i = 0; i < sources.length; i++) {
    if (typeof(sources[i]) == typeof('')) {
      var tmp = document.createElement('source')
      tmp.src = sources[i];
      this.player.appendChild(tmp);
      if (unset) {
        this.player.src = sources[i];
        unset = false;
      }
    }
  }
  // clear title
  this.container.title = '';
  // load
  this.player.load();
  this.player.play();
};
/** Starts playback. Uses playlist items if available and no source is set. */
MiniPlayer.prototype.play = function() {
  if (this.player.childElementCount == 0) {
    if (this.playlist.length > 0) {
      return this.next();
    } else if (this.history.length > 0) {
      return this.prev();
    }
    return false;
  }
  this.player.play();
  this.redraw();
  return true;
};
/** pauses playback. */
MiniPlayer.prototype.pause = function() {
  this.player.pause();
  this.redraw();
};
/** changes the playback state. */
MiniPlayer.prototype.play_or_pause = function() {
  if (this.player.paused)
    this.play();
  else
    this.pause();
};
/** nudges the volume up. */
MiniPlayer.prototype.volume_up = function() {
  if (this.player.volume > 0.9)
    this.player.volume = 1;
  else
    this.player.volume += 0.1;
};
/** nudges the volume down. */
MiniPlayer.prototype.volume_down = function() {
  if (this.player.volume < 0.1)
    this.player.volume = 0;
  else
    this.player.volume -= 0.1;
};
/** nudges the playhead forward. */
MiniPlayer.prototype.step_forward = function() {
  var time = player.player.currentTime
  var dur = this.player.duration;
  if (dur == 0)
    return;
  if (dur - time <= 5)
    time = dur - 0.1;
  else
    player.player.currentTime = time + 5;
};
/** nudges the playhead backwards. */
MiniPlayer.prototype.step_back = function() {
  var time = player.player.currentTime
  var dur = this.player.duration;
  if (dur == 0)
    return;
  if (time <= 5)
    player.player.currentTime = 0;
  else
    player.player.currentTime = time - 5;
};
/** plays the previous source, if available. */
MiniPlayer.prototype.prev = function() {
  if (this.player.currentSrc && this.player.childElementCount)
    this.playlist.unshift(this.player.currentSrc);
  this.set_sources(this.history.pop());
  this.redraw();
  return (this.player.childElementCount > 0);
};
/** plays the next source, if available. */
MiniPlayer.prototype.next = function() {
  if (this.player.currentSrc && this.player.childElementCount)
    this.history.push(this.player.currentSrc);
  this.set_sources(this.playlist.shift());
  this.redraw();
  return (this.player.childElementCount > 0);
};
/** changes the playback state. */
MiniPlayer.prototype.enable_keyboard = function() {
  document.miniplayer_keyboard_control = this;
  if (document.miniplayer_keyboard_control_enabled)
    return;
  document.miniplayer_keyboard_control_enabled = true;
  document.addEventListener('keydown', function(e) {
    if (!document.miniplayer_keyboard_control ||
        document.activeElement.tagName == 'INPUT' ||
        document.activeElement.tagName == 'TEXTAREA')
      return true;
    console.log(e);
    switch (e.keyCode) {
    case 32:
      document.miniplayer_keyboard_control.play_or_pause();
      break;
    case 37:
      document.miniplayer_keyboard_control.step_back();
      break;
    case 39:
      document.miniplayer_keyboard_control.step_forward();
      break;
    case 38:
      document.miniplayer_keyboard_control.volume_up();
      break;
    case 40:
      document.miniplayer_keyboard_control.volume_down();
      break;
    case 78:
      document.miniplayer_keyboard_control.next();
      break;
    case 80:
      document.miniplayer_keyboard_control.prev();
      break;
    }
  });
};

/** disables keyboard controls. */
MiniPlayer.prototype.disable_keyboard = function() {
  document.miniplayer_keyboard_control = false;
};
/** redraws the player. */
MiniPlayer.prototype.redraw = function() {
  // set the correct size
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  // draw details
  this.draw_state();
  this.draw_volume();
  this.draw_time();
};
