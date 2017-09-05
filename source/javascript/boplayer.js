/*
Copyright: Boaz Segev, 2017
License: MIT

Feel free to copy, use and enjoy according to the license provided.
*/

/**
The BoPlayer is a simple audio player that utilizes the HTML5 audio object
using a circular GUI player instead of the OS's player.

BoPlayer displays controls for volume (outer ring), position (middle ring) and
play / pause (inner circle).

Volume and seeking are controlled clicking / touching the BoPlayer and moving
the cursor (or finger). Double click / tap will skip forward and a triple click
/ tap will skip backwards. Keyboard control is also available (off by default).

Multiple BoPlayer instances can be initialized on a single page, allowing
multiple streams to play at the same time. However, keyboard control is limited
to a single BoPlayer instance and must be initialized for that object.

On iOS, it's impossible to control volume (seeking still works) or to start in
autoplay mode. Also only one BoPlayer object can play at any given time.

These limitations are imposed by iOS, where volume is controlled by the physical
device and autoplay requires the user's interaction to confirm playback (a
security measure).

================================================================================

To create a BoPlayer, a "parent" DOM object is required. The player will be
drawn over the parent element matching the element's size.

After the player had been created it's possible to set the source urls for audio
playback.

Audio will begin playing automatically when enough data was downloaded, unless
the `autoplay` property was set to `false`.

i.e.

    <html>
    <head>
      <script type="text/javascript" src='javascript/BoPlayer.js'></script>
    </head>
    <body>
      <div id='player' style='width:100px; height:100px;'></div>
      <script>
        var player = new BoPlayer('player');
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
function BoPlayer(obj_id) {
  /** Player settings. */
  this.vol_background = "#557";
  this.vol_color = "#99f";
  this.time_background = "#756";
  this.time_color = "#f9a";
  this.background = "rgba(85,85,120,0.5)";
  this.color = "rgba(255,120,255,0.5)";
  this.on_stop = false;
  this.on_play = false;
  this.autoplay = false;
  /** History and Playlist objects. */
  this.playlist = [];
  this.history = [];
  /** control, double click / tap support. */
  this._center_xy = {};
  this._canvas_offset = {};
  this._tap_count = 0;
  this._state = 0;
  /** Attaching the BoPlayer to the DOM. */
  this.obj_id = obj_id;
  this.container = document.getElementById(obj_id);
  this.container.owner = this;
  /** The canvas object. */
  this.canvas = document.createElement('canvas');
  this.canvas.owner = this;
  if (!(typeof this.canvas.getContext === "function"))
    alert("This web page requires an updated browser with support for HTML5.");
  this.canvas.style.position = "absolute";
  this.canvas.style.top = "0";
  this.canvas.style.left = "0";
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.canvas.style.transition = "transform 0.25s";
  this.canvas.style.transform = "translate(0px, 0px)";
  this.container.appendChild(this.canvas);
  /** The HTML5 audio player. */
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
  this.player.volume = 0.5;
  if (this.player.volume == 0.5)
    this.volume_control_enabled = true;
  else
    this.volume_control_enabled = false;
  this.player.volume = 1;
  this.container.appendChild(this.player);

  /** Audio event handlers. */
  this.player.addEventListener("timeupdate", this.event_handlers.redraw);
  this.player.addEventListener("seeked", this.event_handlers.redraw);
  this.player.addEventListener("volumechange", this.event_handlers.redraw);
  this.player.addEventListener("loadedmetadata", function(e) {
    // console.log(e);
    // e.target.owner.container.title = "";
  });
  this.player.addEventListener("canplaythrough", function(e) {
    e.target.autoplay = e.target.owner.autoplay;
    e.target.owner.can_play = true;
    if (e.target.owner.autoplay) {
      e.target.owner.play();
    }
  });
  this.player.addEventListener("play", function(e) {
    e.target.owner.redraw();
    if (e.target.owner.on_play)
      e.target.owner.on_play(e.target.owner);
  });
  this.player.addEventListener("ended", function(e) {
    e.target.owner.redraw();
    if (!(e.target.owner.autoplay && e.target.owner.next()) &&
        e.target.owner.on_stop)
      e.target.owner.on_stop(e.target.owner);
  });

  /** The controller DOM layer (fullscreen event collecting). */
  this.controller = document.createElement('div');
  this.controller.owner = this;
  this.controller.style.position = "fixed";
  this.controller.style.display = "none";
  this.controller.style.top = "0";
  this.controller.style.left = "0";
  this.controller.style.width = "100%";
  this.controller.style.height = "100%";
  this.controller.style["z-index"] = "99999";
  document.body.appendChild(this.controller);

  /** The container-controller events. */
  this.canvas.addEventListener("scroll", function(e) {
    console.log(e);
    e.returnValue = false;
    return false;
  });
  this.container.onmousedown = this.event_handlers.control_start;
  this.container.ontouchstart = this.event_handlers.control_start;
  this.container.onmouseup = this.event_handlers.control_end;
  this.container.ontouchmove = this.event_handlers.control_change;
  this.container.ontouchend = this.event_handlers.control_end;

  this.controller.onmousedown = this.event_handlers.control_end;
  this.controller.onmouseup = this.event_handlers.control_end;
  this.controller.onmouseout = function(e) {
    if (e.target.owner._state)
      e.target.owner.event_handlers.control_end(e);
  };
  this.controller.onmousemove = this.event_handlers.control_change;

  /** Handling the resize event when the container is device-responsive. */
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

  /** Draw the Player. */
  this.redraw();
  this;
};

/** Holds the event handlers. Some are used for both touch and mouse events. */
BoPlayer.prototype.event_handlers = {};

/** a simple handler of events that only require a redraw. */
BoPlayer.prototype.event_handlers.redraw = function(e) {
  e.target.owner.redraw();
};

/** When the mouse / touch starts. */
BoPlayer.prototype.event_handlers.control_start = function(e) {
  e.target.owner._state = 0;
  e.target.owner._vol_step = 0;
  e.target.owner._seek_step = 0;
  e.target.owner._center_xy.x = e.pageX;
  e.target.owner._center_xy.y = e.pageY;
  var box = e.target.owner.canvas.getBoundingClientRect();
  e.target.owner._canvas_offset.y =
      e.pageY -
      Math.floor(
          (e.target.owner.canvas.height / 2) + box.top +
          (window.pageYOffset || document.documentElement.scrollTop ||
           document.body.scrollTop) -
          (document.documentElement.clientTop || document.body.clientTop || 0));
  e.target.owner._canvas_offset.x =
      e.pageX -
      Math.floor((e.target.owner.canvas.width / 2) + box.left +
                 (window.pageXOffset || document.documentElement.scrollLeft ||
                  document.body.scrollLeft) -
                 (document.documentElement.clientLeft ||
                  document.body.clientLeft || 0));

  e.target.owner.canvas.style.transform =
      "translate(" + e.target.owner._canvas_offset.x + "px, " +
      e.target.owner._canvas_offset.y + "px)";
  window.setTimeout(function(pl) {
    pl.canvas.style.transition = "transform 0s";
  }, 250, e.target.owner);
  // make sure the player is active before allowing control state.
  if (!e.target.owner.can_play) {
    e.returnValue = false;
    return false;
  }
  e.target.owner.controller.style.display = "block";
  if (!e.target.owner._ctrl_interval)
    e.target.owner._ctrl_interval = window.setInterval(
        e.target.owner.event_handlers.control_review, 50, e.target.owner);

  if (e.target.owner._last_tap && e.timeStamp - e.target.owner._last_tap < 420)
    e.target.owner._tap_count++;
  else
    e.target.owner._tap_count = 1;
  e.target.owner._last_tap = e.timeStamp;
  if (e.target.owner._last_tap_timeout) {
    window.clearTimeout(e.target.owner._last_tap_timeout);
    e.target.owner._last_tap_timeout = false;
  }
  e.target.owner._last_tap_timeout = window.setTimeout(function(pl) {
    if (pl._state)
      return;
    switch (pl._tap_count) {
    case 2:
      pl.next();
      pl._state = 8;
      pl.play();
      break;
    case 3:
      pl.prev();
      pl._state = 8;
      pl.play();
      break;
    }
    pl._tap_count = 0;
    pl._last_tap_timeout = false;
  }, 420, e.target.owner);

  e.target.owner.redraw();
  e.returnValue = false;
  return false;
};

/** When the mouse / touch stops. */
BoPlayer.prototype.event_handlers.control_end = function(e) {
  e.target.owner._vol_step = 0;
  e.target.owner._seek_step = 0;
  e.target.owner._center_xy.x = 0;
  e.target.owner._center_xy.y = 0;
  e.target.owner.canvas.style.transition = "transform 0.25s";
  window.setTimeout(function(pl) {
    pl.canvas.style.transform = "translate(0px, 0px)";
  }, 10, e.target.owner);

  if (e.target.owner._ctrl_interval) {
    window.clearInterval(e.target.owner._ctrl_interval)
    e.target.owner._ctrl_interval = false;
  }
  e.target.owner.controller.style.display = "none";

  if (e.target.owner._state) {
    e.target.owner.play();
  } else
    e.target.owner.play_or_pause();

  e.target.owner._state = 0;

  e.returnValue = false;
  return false;
};

/** Volume / seek control */
BoPlayer.prototype.event_handlers.control_change = function(e) {
  e.target.owner._seek_step = (e.pageX - e.target.owner._center_xy.x) / 32.0;
  if (e.target.owner.volume_control_enabled)
    e.target.owner._vol_step = (e.target.owner._center_xy.y - e.pageY) / 2048.0;
  e.target.owner.canvas.style.transform =
      "translate(" +
      (e.target.owner._canvas_offset.x +
       Math.round((e.pageX - e.target.owner._center_xy.x) / 2)) +
      "px, " +
      (e.target.owner._canvas_offset.y +
       Math.round((e.pageY - e.target.owner._center_xy.y) / 2)) +
      "px)";
  e.target.owner.redraw();
  e.returnValue = false;
  return false;
};

BoPlayer.prototype.event_handlers.control_review = function(pl) {
  /** Volume control */
  if (pl._vol_step >= 0.0075) {
    pl._state |= 4;
    pl._state |= 8;
    pl.volume_up(pl._vol_step);
  } else if (pl._vol_step <= -0.0075) {
    pl._state |= 4;
    pl._state |= 8;
    pl.volume_down(0 - pl._vol_step);
  } else {
    pl._state &= ~4;
  };
  /** Seek control */
  if (pl._seek_step >= 0.4) {
    pl._state |= 2;
    pl._state |= 8;
    pl.pause();
    // pl.play();
    pl.step_forward(pl._seek_step);
  } else if (pl._seek_step <= -0.4) {
    pl._state |= 2;
    pl._state |= 8;
    pl.pause();
    // pl.play();
    pl.step_back(0 - pl._seek_step);
  } else if (pl._state & 2) {
    pl._state &= ~2;
    pl.play();
  };
};

/** Draws the volume (outer ring). */
BoPlayer.prototype.draw_volume = function() {
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

/** Draws the playhead position (middle ring). */
BoPlayer.prototype.draw_time = function() {
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

/** Draws the Play / Pause state (inner circle). */
BoPlayer.prototype.draw_state = function() {
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
  if (this._center_xy.x) {
    // draw controls
    if (this._state == 0) {
      // pause / play control
      context.beginPath();
      context.strokeStyle = this.color;
      context.fillStyle = this.color;
      context.lineWidth = radius_limit * 0.03;
      context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
                  radius_limit * 0.1, 0.75 * Math.PI,
                  0.75 * Math.PI + (2 * Math.PI * 1));
      context.fill();
    }
    if (this._vol_step >= 0.0075) {
      // volume up
      context.beginPath();
      context.strokeStyle = this.vol_color;
      context.fillStyle = this.vol_color;
      context.lineWidth = radius_limit * 0.05;
      context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
                  radius_limit * 0.25, 1.25 * Math.PI,
                  1.25 * Math.PI + (2 * Math.PI * 0.25));
      context.lineTo(this.canvas.width * 0.5, this.canvas.height * 0.5);
      context.fill();
    } else if (this._vol_step <= -0.0075) {
      // volume down
      context.beginPath();
      context.strokeStyle = this.vol_color;
      context.fillStyle = this.vol_color;
      context.lineWidth = radius_limit * 0.05;
      context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
                  radius_limit * 0.25, 0.25 * Math.PI,
                  0.25 * Math.PI + (2 * Math.PI * 0.25));
      context.lineTo(this.canvas.width * 0.5, this.canvas.height * 0.5);
      context.fill();
    };
    if (this._seek_step >= 0.4) {
      // seek forward
      context.beginPath();
      context.strokeStyle = this.time_color;
      context.fillStyle = this.time_color;
      context.lineWidth = radius_limit * 0.05;
      context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
                  radius_limit * 0.25, 1.75 * Math.PI,
                  1.75 * Math.PI + (2 * Math.PI * 0.25));
      context.lineTo(this.canvas.width * 0.5, this.canvas.height * 0.5);
      context.fill();
    } else if (this._seek_step <= -0.4) {
      // seek backward
      context.beginPath();
      context.strokeStyle = this.time_color;
      context.fillStyle = this.time_color;
      context.lineWidth = radius_limit * 0.05;
      context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
                  radius_limit * 0.25, 0.75 * Math.PI,
                  0.75 * Math.PI + (2 * Math.PI * 0.25));
      context.lineTo(this.canvas.width * 0.5, this.canvas.height * 0.5);
      context.fill();
    };
  } else if (this.is_playing()) {
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
  } else {
    // draw "paused" state
    context.beginPath();
    context.strokeStyle = this.color;
    context.moveTo(radius_limit * 0.4, radius_limit * 0.65);
    context.lineTo(radius_limit * 0.6, radius_limit * 0.5);
    context.lineTo(radius_limit * 0.4, radius_limit * 0.35);
    context.stroke();
  };
};

/** sets playback volume within the range of 0..1 (i.e. 0.75).*/
BoPlayer.prototype.set_volume = function(volume) {
  if (volume > 1)
    volume = 1;
  if (volume < 0)
    volume = 0;
  this.player.volume = volume;
  this.draw_volume();
};

/** returns the playback volume within the range of 0..1.*/
BoPlayer.prototype.get_volume = function(volume) { return this.player.volume; };

/**
Sets the current source for playback and resumes playback (if playing).

It's possible to set fallback sources by passing an array of strings instead of
a single string.
*/
BoPlayer.prototype.set_sources = function(sources) {
  // clear existing sources.
  while (this.player.firstChild) {
    this.player.removeChild(this.player.firstChild);
  }
  if (!sources) {
    this.player.src = "";
    this.player.load();
    return;
  }
  // set playback flag
  this.can_play = false;
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
  this.player.autoplay = this.autoplay;
  this.player.load();
  if (this.autoplay)
    this.player.play();
};

/** returns the playback state. */
BoPlayer.prototype.is_playing = function() { return (!this.player.paused); };
/** a flag indicating if enough data was downloaded for continuous playback. */
BoPlayer.prototype.can_play = false;

/** Starts playback. Uses playlist / history data if available. */
BoPlayer.prototype.play = function() {
  this.autoplay = true;
  this.player.autoplay = true;

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
BoPlayer.prototype.pause = function() {
  this.player.pause();
  this.autoplay = false;
  this.player.autoplay = false;
  this.redraw();
};

/** inverts the playback state. */
BoPlayer.prototype.play_or_pause = function() {
  if (this.player.paused)
    this.play();
  else
    this.pause();
};
/** nudges the volume up. */
BoPlayer.prototype.volume_up = function(step) {
  if (!step || step >= 1)
    step = 0.1;
  if (this.player.volume > (1 - step))
    this.player.volume = 1;
  else
    this.player.volume += step;
};
/** nudges the volume down. */
BoPlayer.prototype.volume_down = function(step) {
  if (!step || step >= 1)
    step = 0.1;
  if (this.player.volume < step)
    this.player.volume = 0;
  else
    this.player.volume -= step;
};
/** nudges the playhead forward. */
BoPlayer.prototype.step_forward = function(step) {
  if (!step)
    step = 5;
  var time = player.player.currentTime
  var dur = this.player.duration;
  if (dur == 0)
    return;
  if (dur - time <= step)
    time = dur - 0.1;
  else
    player.player.currentTime = time + step;
};

/** nudges the playhead backwards. */
BoPlayer.prototype.step_back = function(step) {
  if (!step)
    step = 5;
  var time = player.player.currentTime
  var dur = this.player.duration;
  if (dur == 0)
    return;
  if (time <= step)
    player.player.currentTime = 0;
  else
    player.player.currentTime = time - step;
};

/** plays the previous source, if available. */
BoPlayer.prototype.prev = function() {
  if (this.player.currentSrc && this.player.childElementCount)
    this.playlist.unshift(this.player.currentSrc);
  this.set_sources(this.history.pop());
  this.redraw();
  return (this.player.childElementCount > 0);
};

/** plays the next source, if available. */
BoPlayer.prototype.next = function() {
  if (this.player.currentSrc && this.player.childElementCount)
    this.history.push(this.player.currentSrc);
  this.set_sources(this.playlist.shift());
  this.redraw();
  return (this.player.childElementCount > 0);
};

/** enables keyboard control for the player. */
BoPlayer.prototype.enable_keyboard = function() {
  document.BoPlayer_keyboard_control = this;
  if (document.BoPlayer_keyboard_control_enabled)
    return;
  document.BoPlayer_keyboard_control_enabled = true;
  document.addEventListener('keydown', function(e) {
    if (!document.BoPlayer_keyboard_control ||
        document.activeElement.tagName == 'INPUT' ||
        document.activeElement.tagName == 'TEXTAREA')
      return true;
    switch (e.keyCode) {
    case 32: // space - play / pause
      document.BoPlayer_keyboard_control.play_or_pause();
      e.preventDefault();
      break;
    case 78: // "n"
      document.BoPlayer_keyboard_control.next();
      break;
    case 80: // "p"
      document.BoPlayer_keyboard_control.prev();
      break;
    }
    if (!document.BoPlayer_keyboard_control.is_playing())
      return true;
    switch (e.keyCode) {
    case 13: // enter - seek to top
      document.BoPlayer_keyboard_control.step_back(10000);
      break;
    case 37: // right arrow
      document.BoPlayer_keyboard_control.step_back();
      break;
    case 39: // left arrow
      document.BoPlayer_keyboard_control.step_forward();
      break;
    case 38: // up arrow
      document.BoPlayer_keyboard_control.volume_up();
      break;
    case 40: // down arrow
      document.BoPlayer_keyboard_control.volume_down();
      break;
    }
    e.preventDefault();
    return false;
  });
};

/** disables keyboard controls. */
BoPlayer.prototype.disable_keyboard = function() {
  document.BoPlayer_keyboard_control = false;
};

/** redraws the player. */
BoPlayer.prototype.redraw = function() {
  // set the correct size
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  // draw details
  this.draw_state();
  this.draw_volume();
  this.draw_time();
};
