/*
Copyright: Boaz Segev, 2017
License: MIT

Feel free to copy, use and enjoy according to the license provided.
*/
function MiniPlayer(obj_id) {
  this.vol_background = "#557";
  this.vol_color = "#99f";
  this.time_background = "#756";
  this.time_color = "#f9a";
  this.background = "#5578";
  this.color = "#f9f8";

  this.obj_id = obj_id;
  this.container = document.getElementById(obj_id);
  this.container.owner = this;

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
  this.player.style.position = "absolute";
  this.player.style.display = "hidden";
  this.player.style.top = "0";
  this.player.style.left = "0";
  this.player.style.width = "0px";
  this.player.style.height = "0px";
  this.container.appendChild(this.player);
  this.player.addEventListener("timeupdate",
                               function(e) { e.target.owner.draw_time(); });
  this.player.addEventListener("seeked",
                               function(e) { e.target.owner.draw_time(); });
  this.player.addEventListener("canplaythrough", function(e) {
    e.target.play();
    e.target.owner.redraw();
  });
  this.player.addEventListener("volumechange",
                               function(e) { e.target.owner.draw_volume(); });
  this.player.addEventListener("loadedmetadata", function(e) {
    console.log(e);
    e.target.owner.container.title = "";
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
    // make sure the player is actuve before allowing control state.
    if (e.target.owner.player.seekable.length == 0 ||
        e.target.owner.player.played.length == 0)
      return false;
    e.target.owner.controller.style.display = "block";
    e.target.owner.controller.mouse_xy = {x : e.screenX, y : e.screenY};
  });
  this.controller.addEventListener("mouseup", function(e) {
    if (e.target.state == 0)
      e.target.owner.play_or_pause();
    e.target.state = 0;
    e.target.style.display = "none";
  });
  this.controller.addEventListener("mouseout", function(e) {
    e.target.state = 0;
    e.target.style.display = "none";
    return false;
  });
  this.controller.addEventListener("mousemove", function(e) {
    var xy = {x : e.screenX, y : e.screenY};
    var old_xy = e.target.mouse_xy;
    if (e.target.state == 0) {
      // make sure the difference is noticable (more than 5px)
      if (Math.abs(xy.x - old_xy.x) < 5 && Math.abs(xy.y - old_xy.y) < 5)
        return false;
      // set state:
      //   1 == volume control
      //   2 == seeking / time control
      if (Math.abs(xy.x - old_xy.x) > Math.abs(xy.y - old_xy.y))
        e.target.state = 2;
      else
        e.target.state = 1;
    }
    if (e.target.state == 1) {
      //   volume control
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
      e.target.owner.player.currentTime = total_time;
      else if (new_time <= 0)
      e.target.owner.player.currentTime = 0;
      else e.target.owner.player.currentTime = new_time;
    }
    e.target.mouse_xy = xy;
  });

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
  context.lineWidth = radius_limit * 0.05;
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
  context.lineWidth = radius_limit * 0.04;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.4, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * this.player.volume * 0.75));
  context.stroke();
};

MiniPlayer.prototype.draw_time = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  var time = 0.0;
  if (this.player.duration > 0) {
    time = player.player.currentTime / this.player.duration;
  }
  // Draw background
  context.beginPath();
  context.strokeStyle = this.time_background;
  context.lineWidth = radius_limit * 0.05;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.3, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  context.stroke();
  // Draw time value
  context.beginPath();
  context.strokeStyle = this.time_color;
  context.lineWidth = radius_limit * 0.04;
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
  }
};

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

MiniPlayer.prototype.set_sources = function() {
  // clear existing sources.
  while (this.player.firstChild) {
    this.player.removeChild(this.player.firstChild);
  }
  // add requested sources.
  for (var i = 0; i < arguments.length; i++) {
    if (typeof(arguments[i]) == typeof('')) {
      var tmp = document.createElement('source')
      tmp.src = arguments[i];
      this.player.appendChild(tmp);
    }
  }
  // clear title
  this.container.title = "";
  // load
  this.player.load();
};

MiniPlayer.prototype.play = function() {
  return this.player.play();
  this.redraw();
};
MiniPlayer.prototype.pause = function() {
  return this.player.pause();
  this.redraw();
};
MiniPlayer.prototype.play_or_pause = function() {
  if (this.player.paused)
    this.player.play();
  else
    this.player.pause();
  this.redraw();
};

MiniPlayer.prototype.redraw = function() {
  // set the correct size
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  // draw details
  this.draw_state();
  this.draw_volume();
  this.draw_time();

};
