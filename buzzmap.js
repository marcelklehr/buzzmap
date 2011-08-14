/**
 * buzzmap
 * Copyright (c) 2011 Marcel Klehr
 *
 * based on js-mindmap
 * Copyright (c) 2008/09/10 Kenneth Kufluk http://kenneth.kufluk.com/
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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($) {

/* Define Node */
	var Node = function (obj, info, parent)
	{

	/* Define Properties */
		this.obj      = obj;
		this.info     = info;
		this.parent   = parent;
		this.children = [];

		// animation handling
		this.moving = false;
		this.editing = false;
		this.moveTimer = 0;
		this.obj.movementStopped = false;
		this.visible = true;
		this.hasLayout = true;
		this.x = 1;
		this.y = 1;
		this.dx = 0;
		this.dy = 0;
		this.hasPosition = false;

	/* create the html element*/
		this.el = $('<div>'+this.info+'</div>');
		this.el.css('position','absolute');
		this.el.addClass('node');
		$('.buzzmap-active').prepend(this.el);

	/* root node */
		if(!this.parent)
		{
			// make active
			this.el.addClass('active');
		}
	/* child node */
		else
		{
			// draw a line to parent
			this.obj.lines[this.obj.lines.length] = new Line(obj, this, parent);
			// say hello to parent
			this.parent.children.push(this);
		}

	/* make node interactive */
		var thisnode = this;
		var opennode = function (event)
		{
			// toggle active
			if(thisnode.children.length > 0)
			{
				thisnode.el.toggleClass('active');
				thisnode.obj.root.animateToStatic();
				return false;
			}

			return true;
		};

		// drag
		this.el.draggable({
			drag:function ()
			{
				// execute ondrag callback
				if (typeof(thisnode.obj.options.ondrag) === 'function')
				{
					thisnode.obj.options.ondrag(thisnode.obj.root);
				}
				// animate map
				thisnode.obj.root.animateToStatic();
			}
		});

		// edit
		if(this.obj.options.editable === true)
		{
			this.el.dblclick(function (event)
			{
				thisnode.editing = true;
				thisnode.edit();
			});
		}

		// click
		this.el.click(function (event)
		{
			if(thisnode.obj.options.editable === true)
			{
				//little puffer time for enabling dblclick
				setTimeout(function() {
					if(thisnode.editing === true)
						return false;
					opennode();
				},500);
			}else
			{
				opennode();
			}
			return true;
		});
	};

	// serialize (recursive)
	Node.prototype.serialize = function ()
	{
		var string = '{"node":"' + $(this.el).html().replace(/"/g, '\\"') + '","children":[';
		var count = 0;
		$.each(this.children, function () {
			if(!this.el.hasClass('addNode'))
			{
				count++;
				if(count > 1)
					string += ',';
				string = string+this.serialize();
			}
		});
		return string+']}';
	};

	// edit node
	Node.prototype.edit = function ()
	{
		var thisnode = this;

		//don't edit a '+'-node
		if(this.el.hasClass('addNode'))
			return true;

		//store current value
		var old_value = $(':eq(0)', this.el).html();

		//clear label
		this.el.html('');

		var submit = function (label)
		{
			thisnode.el.html($('<span>'+label+'</span>'));

			// execute onchange callback
			if (typeof(thisnode.obj.options.onchange) === 'function')
			{
				thisnode.obj.options.onchange(thisnode, thisnode.obj.root.serialize());
			}
			thisnode.editing = false;
			thisnode.obj.root.animateToStatic();
		};

		var cancel = function ()
		{
			thisnode.el.html($('<span>'+old_value+'</span>'));
			thisnode.editing = false;
			thisnode.obj.root.animateToStatic();
		};

		// create input
		var $input = $('<input type="text"/>').val(old_value);

		// cancel on blur
		$input.blur(function (event)
		{
			if($.trim(old_value) === '')
				return true;

			cancel();
		});

		// prevent opennode while editing
		$input.click(function () {return false;});

		// listen to keys
		$input.keyup(function (event) {
			var keycode = event.which;

			// escape: cancel
			if(keycode === 27)
			{
				cancel();
			}

			// enter: submit
			else if(keycode === 13)
			{
				submit($input.val());
			}
			return true;
		});
		
		$input.appendTo(thisnode.el).focus().select();
		
		// build '+' button
		$('<a style="margin-left:0.5em;" href="#">[+]</a>').click(function ()
		{
			thisnode.obj.original.addNode(thisnode,'...').edit();
			thisnode.obj.root.animateToStatic();
			cancel();
			return false;
		}).appendTo(thisnode.el);

		// build delete button
		if(thisnode !== this.obj.root)
		{
			$('<a style="margin-left:0.5em;" href="#">[x]</a>').click(function ()
			{
				cancel();
				thisnode.removeNode();
				thisnode.obj.root.animateToStatic();
				return false;
			}).appendTo(thisnode.el);
		}
		return false;
	};

	// ROOT NODE ONLY:  control animation loop
	Node.prototype.animateToStatic = function ()
	{
		var thisnode = this;

		// stop the movement after a certain time
		clearTimeout(this.moveTimer);
		this.moveTimer = setTimeout(function () {
			// stop the movement
			thisnode.obj.movementStopped = true;
		}, this.obj.options.timeout*1000);

		// don't do anything if already moving
		if (this.moving)
			return;

		// tell everybody that I'm moving the map
		this.moving = true;
		this.obj.movementStopped = false;

		// animate
		this.animateLoop();
	};

	// ROOT NODE ONLY:  animate all nodes (recursive)
	Node.prototype.animateLoop = function ()
	{
		var thisnode = this;

		// redraw lines
		this.obj.canvas.clear();
		for (var i = 0; i < this.obj.lines.length; i++)
		{
			this.obj.lines[i].updatePosition();
		}

		if (this.findEquilibrium() || this.obj.movementStopped)
		{
			this.moving=false;
			return;
		}

		setTimeout(function () {
			thisnode.animateLoop();
		}, 1000 / this.obj.options.frameRate);
	};

	// find the right position for this node
	Node.prototype.findEquilibrium = function ()
	{
		var Static = true;
		Static = this.display() && Static;
		for (var i=0;i<this.children.length;i++)
		{
			if(this.children[i].visible || this.el.hasClass('active'))
			{
				Static = this.children[i].findEquilibrium() && Static;
			}
		}
		return Static;
	};

	//Display this node, and its children
	Node.prototype.display = function ()
	{

	/* Draw node */
		if (this.visible)
		{
			// if my parent is not active: hide me
			if(this.parent !== null && !this.parent.el.hasClass('active'))
			{
				// execute onhide callback
				if (typeof(this.obj.options.onhide) === 'function')
				{
					this.obj.options.onhide(this);
				}
				this.el.hide();
				this.visible = false;
			}

			// if I'm not active my children can't be, too
			if(!this.el.hasClass('active'))
			{
				$.each(this.children, function (index,node)
				{
					node.el.removeClass('active');
				});
			}
		}else
		{
			// if my parent or I are active: show me
			if (this.el.hasClass('active') || this.parent.el.hasClass('active')) {
				this.el.show();
				this.visible = true;

				// execute onshow callback
				if (typeof(this.obj.options.onshow) === 'function')
				{
					this.obj.options.onshow(this);
				}
			}
		}
		this.drawn = true;

	/* position node */
		if (!this.hasPosition)
		{
			this.x = this.obj.options.mapArea.x/2;
			this.y = this.obj.options.mapArea.y/2;
			this.el.css('left', this.x + "px");
			this.el.css('top', this.y + "px");
			this.hasPosition=true;
		}

        /* position children */
		var stepAngle = Math.PI*2/this.children.length;
		var parent = this;
		$.each(this.children, function (index) {
			if (!this.hasPosition && this.el.css('display') !== 'none')
			{
				var angle = index * stepAngle;
				this.x = (50 * Math.cos(angle)) + parent.x;
				this.y = (50 * Math.sin(angle)) + parent.y;
				this.hasPosition=true;
				this.el.css('left', this.x + "px");
				this.el.css('top', this.y + "px");
			}
		});
		// update my position
		return this.updatePosition();
	};

	// updatePosition returns a boolean stating whether it's been static
	Node.prototype.updatePosition = function ()
	{
		if ($(this.el).hasClass("ui-draggable-dragging"))
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
			if (this.obj.options.showSublines && !nodes[i].hasLayout)
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
		var xdist = this.x + $(this.el).width();
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

	Node.prototype.removeNode = function ()
	{
		// execute onremove callback
		if (typeof(this.obj.options.onremove) === 'function')
		{
			this.obj.options.onremove(this);
		}

		// remove all children
		for (var i=0;i<this.children.length;i++)
		{
			this.children[i].removeNode();
		}

		// delete me from the node stack
		var oldnodes = this.obj.nodes;
		this.obj.nodes = new Array();
		for(var i = 0; i < oldnodes.length; i++)
		{
			if(oldnodes[i]===this)
				continue;
			this.obj.nodes.push(oldnodes[i]);
		}

		// delete all associated lines
		var oldlines = this.obj.lines;
		this.obj.lines = new Array();
		for (var i = 0; i < oldlines.length; i++)
		{
			if(oldlines[i].start === this || oldlines[i].end === this)
			{
				continue;
			}else
			{
				this.obj.lines.push(oldlines[i]);
			}
		}

		// remove html
		$(this.el).remove();

		// execute onchange callback
		if (typeof(this.obj.options.onchange) === 'function')
		{
			this.obj.options.onchange(this, this.obj.root.serialize());
		}
	};

/* Line */
	function Line(obj, startNode, endNode)
	{
		this.obj = obj;
		this.start = startNode;
		this.end = endNode;
	};

	Line.prototype.updatePosition = function ()
	{
		if (!this.obj.options.showSublines && (!this.start.visible || !this.end.visible))
			return;
		if (this.obj.options.showSublines && (!this.start.hasLayout || !this.end.hasLayout))
			return;
		this.strokeStyle = this.obj.options.lineColor;
		this.strokeWidth = this.obj.options.lineWidth;
		this.strokeOpacity = this.obj.options.lineOpacity;

		var c = this.obj.canvas.path("M"+this.start.x+' '+this.start.y+"L"+this.end.x+' '+this.end.y)
		                        .attr({stroke: this.strokeStyle, opacity:this.strokeOpacity, 'stroke-width':this.strokeWidth});
	};

	$.fn.addNode = function (parent, name)
	{
		var obj = this[0];
		var node = obj.nodes[obj.nodes.length] = new Node(obj, name, parent);

		obj.root.animateToStatic();
		return node;
	};

	$.fn.addRootNode = function (content)
	{
		var node = this[0].nodes[0] = new Node(this[0], content, null);
		this[0].root = node;
		this[0].original = this;

		return node;
	};

    $.fn.buzzmap = function (options) {
	  var $mindmap = $('ul:eq(0)',this);
	  if(!$mindmap.hasClass('buzzmap-active'))
	  {

	  // Define default settings.
            var options = $.extend({
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

		  attract: 12,
		  repulse: 10,
		  maxForce: 0.15,
		  damping: 0.9,
		  acceleration: 3.5,

		  lineWidth: '5px',
		  lineColor: '#FFF',
		  lineOpacity: 0.3,

		  wallrepulse: 0.5,
		  centerOffset:100,
		  centerAttraction:0,
		  minSpeed: 0.05,
		  frameRate:50,
		  timeout: 5
            },options);

	  return $mindmap.each(function () {
		  var mindmap = this;
		  this.mindmapInit = true;
		  this.nodes = new Array();
		  this.lines = new Array();
		  this.activeNode = null;
		  this.options = options;
		  this.animateToStatic = function () {
		      this.root.animateToStatic();
		  }
		  $(window).resize(function () {
		      mindmap.animateToStatic();
		  });

		  //canvas
		  if (options.mapArea.x==-1) {
		      options.mapArea.x = $(window).width();
		  }
		  if (options.mapArea.y==-1) {
		      options.mapArea.y = $(window).height();
		  }
		  //create drawing area
		  //if($('.buzzmap-active'))
		  this.canvas = Raphael(0, 0, options.mapArea.x, options.mapArea.y);

		  // Add a class to the object, so that styles can be applied
		  $(this).addClass('buzzmap-active');

		  // add the data to the mindmap
		  if(options.loadData)
		  {
			var map = $.parseJSON(options.loadData);
			var nodeCreate = function (parent, children)
			{
				$.each(children, function (index,object)
				{
					node = $mindmap.addNode(parent, decodeURI(object.node))
					nodeCreate(node, object.children);
				});
			};


			var root = $mindmap.addRootNode(decodeURI(map.node), {});
			$.each(map.children, function (index,object)
			{
				node = $mindmap.addNode(root, decodeURI(object.node))
				nodeCreate(node, object.children);
			});
		  }else{
			  $el = $('>li',this);
			  var root = $el.get(0).mynode = $mindmap.addRootNode($('>li>div',this).html());
			  
			  $el.hide();
			  var addLI = function ()
			  {
			      var parentnode = $(this).parents('li').get(0);
			      if (typeof(parentnode) === 'undefined')
			      {
				parentnode=root;
			      }
			      else {
				parentnode=parentnode.mynode;
			      }
			      this.mynode = $mindmap.addNode(parentnode, $('div:eq(0)',this).html(), {});
			      $(this).hide();
			      $('>ul>li', this).each(addLI);
			  };
			  $('>li>ul', $mindmap).each(function () {
			      $('>li', this).each(addLI);
			  });
		  }
	  });
	}
    };
})(jQuery);