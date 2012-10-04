/**
 * Buzzmap 2.0.1
 * Copyright (c) 2011 Marcel Klehr
 *
 * based on "js-mindmap"
 * Copyright (c) 2008/09/10 Kenneth Kufluk http://kenneth.kufluk.com/
 *
 * This program makes use of "MicroEvent - to make any js object an event emitter (server or browser)"
 * Copyright (c) 2011 Jerome Etienne, http://jetienne.com
 * 
 * 
 * MIT (X11) license
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($) {
  var MicroEvent	= function(){}
  MicroEvent.prototype	= {
    bind	: function(event, fct){
      this._events = this._events || {};
      this._events[event] = this._events[event]	|| [];
      this._events[event].push(fct);
    },
    unbind	: function(event, fct){
      this._events = this._events || {};
      if( event in this._events === false  )	return;
      this._events[event].splice(this._events[event].indexOf(fct), 1);
    },
    trigger	: function(event /* , args... */){
      this._events = this._events || {};
      if( event in this._events === false  )	return;
      for(var i = 0; i < this._events[event].length; i++){
        this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
      }
    }
  };

  MicroEvent.mixin	= function(destObject){
    var props	= ['bind', 'unbind', 'trigger'];
    for(var i = 0; i < props.length; i ++){
      destObject.prototype[props[i]]	= MicroEvent.prototype[props[i]];
    }
  };
  
  function Line(obj, startNode, endNode)
	{
		this.obj = obj;
		this.start = startNode;
		this.end = endNode;
	};

	Line.prototype.updatePosition = function ()
	{
		if (!this.start.visible || !this.end.visible)
			return;
		this.strokeStyle = this.obj.options.lineColor;
		this.strokeWidth = this.obj.options.lineWidth;
		this.strokeOpacity = this.obj.options.lineOpacity;

		var c = this.obj.canvas.path("M"+this.start.x+' '+this.start.y+"L"+this.end.x+' '+this.end.y)
		                       .attr({stroke: this.strokeStyle, opacity: this.strokeOpacity, 'stroke-width': this.strokeWidth});
	};
  
	var Node = function (obj, parent, label)
	{
    var thisnode = this;
    
	  // Define Properties
		this.obj      = obj;// Buzzmap object
		this.parent   = parent;
		this.children = [];
    
    // Vectors
    this.x = 1;
		this.y = 1;
		this.dx = 0;
		this.dy = 0;
    
    // Define States
    this.visible = false;
    this.editing = false;
    this.dragging = false;
    this.hasPosition = false;// node position calculated?
    
    // create the node element
		this.el = $('<div></div>');
		this.el.css('position', 'absolute');
		this.el.addClass('node');
		this.obj.el.append(this.el);
    this.el.hide();
    
    // label
    this.label(label);
    
    // root node?
    if(!this.parent)// THE (INVISIBLE) ALMIGHTY ROOT NODE! (It will kick you in the ass, watch out! I have warned you...)
    {
      this.el.addClass('active');
    }else {
      this.parent.children.push(this);
      
      if(!this.parent.parent){ // Some normal, (visible) root node
        this.el.addClass('active');
        this.el.addClass('root');
      }
      else{ // Some normal child node
        this.obj.lines[this.obj.lines.length] = new Line(obj, this, parent);
      }
    }
    
    // click
		this.el.mouseup(function () {
      if(thisnode.dragging == true ||thisnode.editing == true)
        return true;
      
			if(thisnode.obj.options.editable !== true)
			{
        thisnode.toggleChildren();
        return true;
      }
      
      // edit mode: little puffer time for enabling dblclick
      window.setTimeout(function() {
        if(thisnode.editing == true)
          return true;
        thisnode.toggleChildren();
      },250);
      
      return true;
		});
    
    // drag
		this.el.draggable({
      cancel: ':input,option,button,a',
      start: function() {
        thisnode.dragging = true;
      },
			drag: function () {
        thisnode.obj.trigger('ondrag', thisnode);
				thisnode.obj.animate();
			},
      stop: function() {
        thisnode.dragging = false;
      }
		});

		// edit
		if(this.obj.options.editable === true) {
			this.el.dblclick(function (event) {
				thisnode.edit();
        event.preventDefault();
			});
		}
	};
  
  Node.prototype.toggleChildren = function () {
			// toggle active
			if(this.children.length > 0 && this.parent.parent)
			{
				this.el.toggleClass('active');
        this.obj.animate();
				return false;
			}
			return true;
  };
  
  Node.prototype.label = function(label) {
    if(typeof(label) !== 'undefined') {
      this.el.html($(label));
    }
    return $(':eq(0)', this.el).html();
  };
  
  // serialize
	Node.prototype.serialize = function() {
    return JSON.stringify(this.toJSON());
  };
  
  // toJSON recursive
	Node.prototype.toJSON = function ()
	{
		var json = {"label":$(this.el).html(),"children":[]};
		var count = 0;
		$.each(this.children, function () {
      json.children.push(this.toJSON());
		});
		return json;
	};
  
  // edit node
	Node.prototype.edit = function ()
	{
		var thisnode = this;
    
    thisnode.editing = true;
    
    // adjust min speed
    var minSpeed = thisnode.obj.options.minSpeed;
    thisnode.obj.options.minSpeed = (0.35 > minSpeed) ? 0.35 : minSpeed;

		// save current value and clear
		var old_value = this.label();
		this.label('');

		var submit = function (text)
		{
			thisnode.label('<span>'+text+'</span>');

			// execute onchange callback
		  thisnode.obj.trigger('onchange', thisnode, thisnode.obj.serialize());
			thisnode.editing = false;
      thisnode.obj.options.minSpeed = minSpeed;
      thisnode.obj.animate();
		};

		var cancel = function ()
		{
			thisnode.label('<span>'+old_value+'</span>');
			thisnode.editing = false;
      thisnode.obj.options.minSpeed = minSpeed;
      thisnode.obj.animate();
		};

		// create input
		var $input = $('<input class="edit-field" type="text" />').val(old_value);

		// listen to keys
		$input.keyup(function (event) {
			var keycode = event.which;

			// [escape] -> cancel
			if(keycode === 27)
			{
				cancel();
			}

			// [enter] -> submit
			else if(keycode === 13)
			{
				submit($input.val());
			}
			return true;
		});
		
		$input.appendTo(thisnode.el).focus().select();
		
		// build '+' button
		$('<button class="edit-button">+</button>').click(function (evt)	{
      thisnode.el.addClass('active');
      cancel();
      var node = thisnode.obj.addNode(thisnode);
      node.edit();
			return false;
		}).appendTo(thisnode.el);

		// build 'x' button
    $('<button class="edit-button">x</button>').click(function ()
    {
      cancel();
      thisnode.removeNode();
      thisnode.obj.animate();
      return false;
    }).appendTo(thisnode.el);
		return false;
	};
  
  Node.prototype.removeNode = function ()
	{
		// execute onremove callback
	  this.obj.trigger('onremove', this);

		// remove all children
		for (var i=0;i<this.children.length;i++)
		{
			this.children[i].removeNode();
		}
    
    // remove me from parent
    if(this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);

		// remove me from the node stack
    this.obj.nodes.splice(this.obj.nodes.indexOf(this), 1);

		// delete all associated lines
		var oldlines = this.obj.lines;
		this.obj.lines = [];
		for (var i = 0; i < oldlines.length; i++)
		{
			if(oldlines[i].start === this || oldlines[i].end === this) continue;
			this.obj.lines.push(oldlines[i]);
		}

		// remove html
		$(this.el).remove();

		// execute onchange callback
	  this.obj.trigger('onchange', this, this.obj.serialize());
    
    this.obj.animate();
	};
  
  
 /* ANIMATION */

	// find the right position for this node  (recursive)
	Node.prototype.findEquilibrium = function ()
	{
		var isStatic = (!this.parent) ? true : this.display();
    
		for (var i=0; i < this.children.length; i++)
		{
      if(this.children[i].visible || this.el.hasClass('active'))
				isStatic = this.children[i].findEquilibrium() && isStatic;
		}
		return isStatic;
	};
  
  Node.prototype.hide = function() {
    this.obj.trigger('onhide', this);
    this.el.removeClass('active');
    this.el.hide();
    this.visible = false;
    this.hasPosition = false;// reset position
  };
  
  Node.prototype.show = function() {
    this.el.show();
    this.visible = true;
    this.obj.trigger('onshow', this);
  };
  
  Node.prototype.setPosition = function(x,y) {
    this.x = x;
		this.y = y;
		this.el.css('left', x + "px");
		this.el.css('top', y + "px");
    this.hasPosition=true;
  };
  
  // Display this node, and its children
	Node.prototype.display = function ()
	{
   /* Draw node */
    if (this.visible)
    {
      // if my parent is not active: hide me
      if(!this.parent.el.hasClass('active')) {
        this.hide();
      }
    }else
    {
      // if I'm root or my parent's active: show me
      if(this.parent.parent === null || this.parent.el.hasClass('active')) {
        this.show();
      }
    }

	 /* position node */
  
    if(!this.visible)
      return true;
  
		if(!this.hasPosition)
		{
      if(this.parent.parent !== null)
      {// not root
        var x = parseInt(this.parent.el.css('left'));
        var y = parseInt(this.parent.el.css('top'));
      }else
      {// root
        var x = this.obj.width/2;
        var y = this.obj.height/2;
      }
			this.setPosition(x,y);
		}

  /* position children */
		var stepAngle = Math.PI*2/this.children.length;
		var parent = this;
		$.each(this.children, function (i) {
			if (this.visible)
        return;
      var angle = i * stepAngle;
      var x = (100 * Math.cos(angle)) + parent.x;
      var y = (100 * Math.sin(angle)) + parent.y;
      this.setPosition(x,y);
		});
		// update my position
		return this.updatePosition();
	};
  
  // updatePosition returns a boolean stating whether it's been static
	Node.prototype.updatePosition = function ()
	{
		if($(this.el).hasClass("ui-draggable-dragging"))
		{
			this.x = parseInt(this.el.css('left')) + ($(this.el).width() / 2) - this.obj.offset.left;
			this.y = parseInt(this.el.css('top')) + ($(this.el).height() / 2) - this.obj.offset.top;
			this.dx = 0;
			this.dy = 0;
			return false;
		}

		//apply accelerations
		var forces = this.getForceVector();
		this.dx += forces.x * this.obj.options.acceleration;
		this.dy += forces.y * this.obj.options.acceleration;

		// damp the forces
		this.dx = this.dx * this.obj.options.damping;
		this.dy = this.dy * this.obj.options.damping;

		//ADD MINIMUM SPEEDS
		if (Math.abs(this.dx) < this.obj.options.minSpeed) this.dx = 0;
		if (Math.abs(this.dy) < this.obj.options.minSpeed) this.dy = 0;
		if (Math.abs(this.dx)+Math.abs(this.dy)==0) return true;
		
		//apply velocity vector
		this.x += this.dx * this.obj.options.acceleration;
		this.y += this.dy * this.obj.options.acceleration;
		this.x = Math.min(this.obj.width,Math.max(1,this.x));
		this.y = Math.min(this.obj.height,Math.max(1,this.y));
		
		// display
		var showx = this.obj.offset.left + this.x - ($(this.el).width() / 2);
		var showy = this.obj.offset.top + this.y - ($(this.el).height() / 2) - 10;
		this.el.css('left', showx + "px");
		this.el.css('top', showy + "px");
		return false;
	};
  
  Node.prototype.getForceVector = function ()
	{
		var fx = 0;
		var fy = 0;

		var nodes = this.obj.nodes;
		var lines = this.obj.lines;

		// Calculate the repulsive force from every other node
		for(var i = 0; i < nodes.length; i++)
		{
			if (nodes[i] === this)
				continue;
			if (this.obj.options.showSublines && !nodes[i].hasPosition)
				continue;
			if (!nodes[i].visible)
				continue;
			
			// Repulsive force (coulomb's law)
			var x1 = (nodes[i].x - this.x);
			var y1 = (nodes[i].y - this.y);
			
			//adjust for variable node size
			var xsign = x1 / Math.abs(x1);
			var ysign = y1 / Math.abs(y1);
			var dist = Math.sqrt((x1 * x1) + (y1 * y1));
			var theta = Math.atan(y1 / x1);
			if (x1 === 0)
			{
				theta = Math.PI / 2;
				xsign = 0;
			}
			
			// force is based on radial distance
			var myrepulse = this.obj.options.repulse;
			var f = (myrepulse * 500) / (dist * dist);
			if(Math.abs(dist) < 500)
			{
				fx += -f * Math.cos(theta) * xsign;
				fy += -f * Math.sin(theta) * xsign;
			}
		}
		
		// add repulsive force of the "walls"
		//left wall
		var xdist = this.x + this.el.width();
		var f = (this.obj.options.wallRepulse * 500) / (xdist * xdist);
		fx += Math.min(2, f);
		//right wall
		var rightdist = (this.obj.width - xdist);
		var f = -(this.obj.options.wallRepulse * 500) / (rightdist * rightdist);
		fx += Math.max(-2, f);
		//top wall
		var f = (this.obj.options.wallRepulse * 500) / (this.y * this.y);
		fy += Math.min(2, f);
		//bottom wall
		var bottomdist = (this.obj.height - this.y);
		var f = -(this.obj.options.wallRepulse * 500) / (bottomdist * bottomdist);
		fy += Math.max(-2, f);

		// for each line, of which I'm a part, add an attractive force.
		for(var i = 0; i < lines.length; i++)
		{
			var otherend = null;
			if (lines[i].start === this)
			{
				otherend = lines[i].end;
			} else if (lines[i].end === this)
			{
				otherend = lines[i].start;
			} else
				continue;
			
			// Ignore the pull of hidden nodes
			if (!otherend.visible)
				continue;
			
			// Attractive force (hooke's law)
			var x1 = (otherend.x - this.x);
			var y1 = (otherend.y - this.y);
			var dist = Math.sqrt((x1 * x1) + (y1 * y1));
			var xsign = x1 / Math.abs(x1);
			var theta = Math.atan(y1 / x1);
			if (x1==0)
			{
				theta = Math.PI / 2;
				xsign = 0;
			}
			// force is based on radial distance
			var f = (this.obj.options.attract * dist) / 10000;
			if (Math.abs(dist) > 0)
			{
				fx += f * Math.cos(theta) * xsign;
				fy += f * Math.sin(theta) * xsign;
			}
		}

		// if I'm root, attract me to the centre of the area
		if (!this.parent.parent && false)
		{
			// Attractive force (hooke's law)
			var otherend = this.obj.options.mapArea;
			var x1 = ((otherend.x / 2) - this.obj.options.centerOffset - this.x);
			var y1 = ((otherend.y / 2) - this.y);
			var dist = Math.sqrt((x1 * x1) + (y1 * y1));
			var xsign = x1 / Math.abs(x1);
			var theta = Math.atan(y1 / x1);
			if (x1 === 0)
			{
				theta = Math.PI / 2;
				xsign = 0;
			}
			// force is based on radial distance
			var f = (0.1 * this.obj.options.attract * dist * this.obj.options.centerAttraction) / 1000;
			if (Math.abs(dist) > 0)
			{
				fx += f * Math.cos(theta) * xsign;
				fy += f * Math.sin(theta) * xsign;
			}
		}

		if (Math.abs(fx) > this.obj.options.maxForce) fx = this.obj.options.maxForce * (fx / Math.abs(fx));
		if (Math.abs(fy) > this.obj.options.maxForce) fy = this.obj.options.maxForce * (fy / Math.abs(fy));
		return {
			x: fx,
			y: fy
		};
	};
  
  
/* MAP */
  
  var Buzzmap = function(el, options) {
    var obj = this;
    
    this.el = $(el);
    this.el[0].buzzmap = this;
    this.el.addClass('buzzmap');
    
    this.nodes = [];
    this.lines = [];
    this.parseOptions(options);
    
    this.moveTimer = 0;
    this.moving = false;
		this.stopMovement = false;
    this.fps = 0;
    
    window.setInterval(function() {
      var fps = obj.fps * 2;
      obj.fps = 0;
      obj.trigger('fps', fps);
    }, 500);
    
    $(window).resize(function() {
      obj.animate();
    });
    
    // root node
    this.root = this.nodes[0] = new Node(this, null, '<span>Buzzmap</span>');
  };
  
  MicroEvent.mixin(Buzzmap);
  
  Buzzmap.prototype.createCanvas = function() {
    this.height = this.el.height();
    this.width = this.el.width();
    if(!this.canvas){
      this.canvas = Raphael(this.el[0], this.width, this.height);
    }else{
      this.canvas.setSize(this.width, this.height);
    }
    
    // calc canvas offset
    this.offset = (this.el.css('position') == 'relative') ? {top:0, left:0} : this.el.offset();
  };
  
  Buzzmap.prototype.addNode = function (parent, label)
	{
		var node = this.nodes[this.nodes.length] = new Node(this, parent, label);
    this.animate();

		return node;
	};
  
  Buzzmap.prototype.serialize = function() {
    return this.root.serialize();
  };
  
  // control animation loop
	Buzzmap.prototype.animate = function ()
	{
    var obj = this;
    
		// Set animation timeout
    if(obj.options.animationTimeout != 0) {
      clearTimeout(obj.moveTimer);
      obj.moveTimer = setTimeout(function () {
          obj.stopMovement = true;
      }, obj.options.animationTimeout*1000);
    }

		// don't do anything if already moving
		if (obj.moving)
			return;
    
    // (re)calculate canvas position and offset
    obj.createCanvas();

		// tell everybody that I'm moving the map
		obj.moving = true;
		obj.stopMovement = false;

		// start animation loop
		obj.animateLoop();
	};
  
  // animate all nodes
	Buzzmap.prototype.animateLoop = function ()
	{
		var obj = this;
    
		// redraw lines
		this.canvas.clear();
		for (var i = 0; i < this.lines.length; i++)
		{
			this.lines[i].updatePosition();
		}
    
		if(this.root.findEquilibrium() || this.stopMovement)
		{
			this.moving=false;
			return;
		}
    
    // Wait for next frame
    window.setTimeout(function() {
      obj.fps++;
	    obj.animateLoop();
		}, 1000 / obj.options.maxFps);
	};
  
  Buzzmap.prototype.parseOptions = function(opts) {
    // Define default settings.
    this.options = $.extend({
      structure: null,
      editable: false,

      onchange: function (node, data) {},
      ondrag: function (root) {},
      onshow: function (node) {},
      onhide: function (node) {},
      onremove: function (node) {},
      fps: function (fps) {},

      attract: 5,
      repulse: 5,
      wallRepulse: 0.5,
      maxForce: 0.25,
      damping: 0.90,
      acceleration: 5,

      lineWidth: '5px',
      lineColor: '#FFF',
      lineOpacity: 0.3,

      minSpeed: 0.2,
      animationTimeout: 5
      // centerOffset: 100, #DEPRECATED
      // centerAttraction: 0, #DEPRECATED
    }, opts);
    this.bind('onchange', this.options.onchange);
    this.bind('ondrag', this.options.ondrag);
    this.bind('onshow', this.options.onshow);
    this.bind('onhide', this.options.onhide);
    this.bind('onremove', this.options.onremove);
    this.bind('fps', this.options.fps);
  };
  
  /* jQUERY */
  
  $.fn.buzzmap = function (options) {
    var obj = new Buzzmap(this[0], options);
    
    // no data to pre-load
    if(!obj.options.structure)
      return obj;
    
    var buzz = function() {
      // Set ui-draggable style
      $('<style type="text/css"></style>').text('.ui-draggable{position:absolute !important;}').appendTo('head');
      obj.animate();
      return obj;
    };
    
    // jQuery selector
    var $data = $(obj.options.structure).filter('ul');
    if($data.length > 0) {
      var addLI = function () {
          var parent = $(this).parents('li').get(0);
          parent = (!parent) ? obj.root : parent.buzznode;
          this.buzznode = obj.addNode(parent, $('div:eq(0)', this).html());
          $(this).hide();
          $('>ul>li', this).each(addLI);
      };
      $('>li', $data).each(addLI);
      return buzz();
    }
    
    // can this be JSON?
    if(typeof(obj.options.structure) !== 'string')
      throw new Error('Buzzmap: Couldn\'t interpret the passed structure');
    
    // serialized JSON data
    try {
      var map = JSON.parse(obj.options.structure);
      var nodeCreate = function (parent, children) {
        $.each(children, function (index, n) {
          if(!n.label || !n.children) return;
          var node = obj.addNode(parent, n.label)
          nodeCreate(node, n.children);
        });
      };
      nodeCreate(obj.root, map.children);
    }catch(e) {
      throw new Error('Buzzmap: Couldn\'t interpret the passed structure');
    }
    return buzz();
  };
  
})(jQuery);