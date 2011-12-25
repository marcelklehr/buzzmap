/**
 * buzzmap
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
		this.obj      = obj;// root ul
		this.parent   = parent;
		this.children = [];
    this.visible = false;
    this.moveTimer = 0;
    
    // Vectors
    this.x = 1;
		this.y = 1;
		this.dx = 0;
		this.dy = 0;
    
    // Define States
    this.editing = false;
    this.dragging = false;
    this.hasPosition = false;// node position calculated?
    
    // create the node element
		this.el = $('<div></div>');
		this.el.css('position','absolute');
		this.el.addClass('node');
		this.obj.el.prepend(this.el);
    this.el.hide();
    
    // label
    this.label(label);
    
    // root node?
    if(!this.parent)// mighty root node
    {
      this.el.addClass('active');
    }else
    {
      this.parent.children.push(this);
      
      if(!this.parent.parent)// visible root
      {
        this.el.addClass('active');
        this.el.addClass('root');
      }
      else// child nodes
      {
        this.obj.lines[this.obj.lines.length] = new Line(obj, this, parent);
      }
    }
    
    // click
		this.el.mouseup(function () {
      if(thisnode.editing == true || thisnode.dragging == true)
        return true;
      
			if(thisnode.obj.options.editable !== true)
			{
        thisnode.toggleChildren();
        return true;
      }
      
      // edit mode: little puffer time for enabling dblclick
      window.setTimeout(function() {
        thisnode.toggleChildren();
      },200);
      
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
		if(this.obj.options.editable === true)
		{
			this.el.dblclick(function (event)
			{
        thisnode.el.addClass('active');
				thisnode.editing = true;
				thisnode.obj.editing = true;
				thisnode.edit();
        thisnode.obj.animate();
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
  
  // serialize (recursive)
	Node.prototype.serialize = function ()
	{
		var string = '{"label":"' + $(this.el).html().replace(/"/g, '\\"') + '","children":[';
		var count = 0;
		$.each(this.children, function () {
      count++;
      if(count > 1) string += ',';
      string = string+this.serialize();
		});
		return string+']}';
	};
  
  // edit node
	Node.prototype.edit = function ()
	{
		var thisnode = this;

		//store current value
		var old_value = this.label();

		//clear label
		this.label('');

		var submit = function (text)
		{
			thisnode.label('<span>'+text+'</span>');

			// execute onchange callback
		  thisnode.obj.trigger('onchange', thisnode, thisnode.obj.serialize());
			thisnode.obj.editing = false;
			thisnode.editing = false;
			thisnode.obj.animate();
		};

		var cancel = function ()
		{
			thisnode.label('<span>'+old_value+'</span>');
			thisnode.editing = false;
			thisnode.obj.editing = false;
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
		$('<button class="edit-button">+</button>').click(function ()	{
			thisnode.obj.addNode(thisnode, 'Type something...').edit();
      console.log('should have added node');
			cancel();
			return false;
		}).appendTo(thisnode.el);

		// build 'x' button
		if(thisnode !== this.obj.root)
		{
			$('<button class="edit-button">x</button>').click(function ()
			{
        cancel();
				thisnode.removeNode();
        thisnode.obj.animate();
				return false;
			}).appendTo(thisnode.el);
		}
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

		// delete me from the node stack
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
        console.log('placing child, where parent is...');
        var x = parseInt(this.parent.el.css('left'));
        var y = parseInt(this.parent.el.css('top'));
      }else
      {// root
        var x = this.obj.options.mapArea.x/2;
        var y = this.obj.options.mapArea.y/2;
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
      var x = (50 * Math.cos(angle)) + parent.x;
      var y = (50 * Math.sin(angle)) + parent.y;
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
			this.x = parseInt(this.el.css('left')) + ($(this.el).width() / 2);
			this.y = parseInt(this.el.css('top')) + ($(this.el).height() / 2);
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
		this.x = Math.min(this.obj.options.mapArea.x,Math.max(1,this.x));
		this.y = Math.min(this.obj.options.mapArea.y,Math.max(1,this.y));
		
		// display
		var showx = this.x - ($(this.el).width() / 2);
		var showy = this.y - ($(this.el).height() / 2) - 10;
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
		for (var i = 0; i < nodes.length; i++)
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
			if (Math.abs(dist) < 500)
			{
				fx += -f * Math.cos(theta) * xsign;
				fy += -f * Math.sin(theta) * xsign;
			}
		}
		
		// add repulsive force of the "walls"
		//left wall
		var xdist = this.x + this.el.width();
		var f = (this.obj.options.wallrepulse * 500) / (xdist * xdist);
		fx += Math.min(2, f);
		//right wall
		var rightdist = (this.obj.options.mapArea.x - xdist);
		var f = -(this.obj.options.wallrepulse * 500) / (rightdist * rightdist);
		fx += Math.max(-2, f);
		//top wall
		var f = (this.obj.options.wallrepulse * 500) / (this.y * this.y);
		fy += Math.min(2, f);
		//bottom wall
		var bottomdist = (this.obj.options.mapArea.y - this.y);
		var f = -(this.obj.options.wallrepulse * 500) / (bottomdist * bottomdist);
		fy += Math.max(-2, f);

		// for each line, of which I'm a part, add an attractive force.
		for (var i = 0; i < lines.length; i++)
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
		if (!this.parent)
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

  $.fn.buzzmap = function (options) {
	  var $mindmap = $(this).filter('ul');
	  if(!$mindmap.hasClass('buzzmap-active')) {
      $mindmap.each(function () {
        var obj = new Buzzmap($(this), options);
        
        // Add a class to the object, so that styles can be applied
        obj.el.addClass('buzzmap-active');
        obj.el[0].obj = obj;
        
        // add the data to the mindmap
        if(obj.options.loadData)
        {
          var map = $.parseJSON(options.loadData);
          var nodeCreate = function (parent, children)
          {
            $.each(children, function (index, n)
            {
              node = obj.addNode(parent, decodeURI(n.label))
              nodeCreate(node, n.children);
            });
          };

          //var root = obj.addNode(obj.root, decodeURI(map.node));
          $.each(map.children, function(index, n) {
            node = obj.addNode(obj.root, decodeURI(n.label))
            nodeCreate(node, n.children);
          });
        }else{
          var addLI = function ()
          {
              var parentnode = $(this).parents('li').get(0);
              parentnode = (typeof(parentnode) === 'undefined') ? obj.root : parentnode.mynode;
              this.mynode = obj.addNode(parentnode, $('div:eq(0)',this).html());
              $(this).hide();
              $('>ul>li', this).each(addLI);
          };
          $('>li', obj.el).each(addLI);
        }
        obj.animate();
      });
    }
    return $mindmap[0].obj;
  };
  
  var Buzzmap = function(el, options) {
    var obj = this;
    
    this.el = el;
    this.nodes = [];
    this.lines = [];
    this.parseOptions(options);
    this.moving = false;
    this.editing = false;
		this.movementStopped = false;
    this.fps = 0;
    
    window.setInterval(function() {
      var fps = obj.fps;
      obj.fps = 0;
      obj.trigger('fps', fps);
    }, 1000);
    
    // root node
    this.root = this.nodes[0] = new Node(this, null, '<span>__ROOT__</span>');
    
    $(window).resize(function () {
        obj.animate();
    });
    
    //create drawing area (canvas)
    if (this.options.mapArea.x==-1) this.options.mapArea.x = $(window).width();
    if (this.options.mapArea.y==-1) this.options.mapArea.y = $(window).height();
    this.canvas = Raphael(0, 0, this.options.mapArea.x, this.options.mapArea.y);
  };
  
  MicroEvent.mixin(Buzzmap);
  
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
    if(obj.options.timeout != 0) {
      var timeout = (obj.editing == true) ? 1.5 : obj.options.timeout;
      clearTimeout(obj.moveTimer);
      obj.moveTimer = setTimeout(function () {
          obj.movementStopped = true;
      }, timeout*1000);
    }

		// don't do anything if already moving
		if (obj.moving)
			return;

		// tell everybody that I'm moving the map
		obj.moving = true;
		obj.movementStopped = false;

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
    
		if(this.root.findEquilibrium() || this.movementStopped)
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
      mapArea: {
          x:-1,
          y:-1
      },
      loadData: null,
      editable: false,

      onchange: function (node, data) {},
      ondrag: function (root) {},
      onshow: function (node) {},
      onhide: function (node) {},
      onremove: function (node) {},

      attract: 3,
      repulse: 2.5,
      maxForce: 0.15,
      damping: 0.9,
      acceleration: 4,

      lineWidth: '5px',
      lineColor: '#FFF',
      lineOpacity: 0.3,

      wallrepulse: 0.5,
      centerOffset:100,
      centerAttraction:0,
      minSpeed: 0.05,
      frameRate:50,
      timeout: 5
    }, opts);
    this.bind('onchange', this.options.onchange);
    this.bind('ondrag', this.options.ondrag);
    this.bind('onshow', this.options.onshow);
    this.bind('onhide', this.options.onhide);
    this.bind('onremove', this.options.onremove);
  };
  
})(jQuery);