/*
 buzzmap
 Copyright (c) 2011 Marcel Klehr
 
 Original js-mindmap
 Copyright (c) 2008/09/10 Kenneth Kufluk http://kenneth.kufluk.com/
 
 MIT (X11) license
  
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

*/

/*
    Things to do:
        - save to json

*/
(function($){

    // Define all Node related functions.
    var Node = function(obj, info, parent, opts) {
        this.obj = obj;
        this.options = obj.options;

        this.info = info;
        this.href = opts.href;
        if (opts.url) {
            this.url = opts.url;
        }

        // create the element for display
        this.el = $('<div>'+this.info+'</div>');
        this.el.addClass('node');
        $('.buzzmap-active').prepend(this.el);
        
        if (!parent) {
            obj.activeNode = this;
            $(this.el).addClass('active');
//            $(this.el).addClass('root');
        } else {
            var lineno = obj.lines.length;
            obj.lines[lineno] = new Line(obj, this, parent);
        }
        this.parent = parent;
        this.children = [];
        if (this.parent) {
            this.parent.children.push(this);
        }
        
        // animation handling
        this.moving = false;
        this.moveTimer = 0;
        this.obj.movementStopped = false;
        this.visible = true;
        this.hasLayout = true;
        this.x = 1;
        this.y = 1;
        this.dx = 0;
        this.dy = 0;
        this.hasPosition = false;
        
        this.content = []; // array of content elements to display onclick;
        
        this.el.css('position','absolute');        

        var thisnode = this;

        this.el.draggable({
            drag:function() {
	      if (typeof(obj.options.ondrag)=='function') {
			obj.options.ondrag(obj.root);
	      }
                obj.root.animateToStatic();
            }
        });
        
        var opennode = function(event){
            if (typeof(opts.onclick)=='function') {
                var r = opts.onclick(thisnode);
                if(r == false)
		return false;
            }
	  obj.activeNode = thisnode;
	  
	  if(thisnode.children.length > 0)
	  {
		obj.activeNode.el.toggleClass('active');
		obj.root.animateToStatic();
		return false;
	  }
	  
            obj.root.animateToStatic();
            return true;
        };
        
        if(this.options.editable == true)
        {
	        this.el.click(opennode);
	        this.el.click(function(event){
	                return false;
	        });
	        this.el.dblclick(function(event){
			if(thisnode.el.hasClass('addNode'))
				return true;
			
			var old_value = $('span:eq(0)', thisnode.el).html();
			thisnode.el.html('');
			thisnode.el.click(function(){return false;})
			var $input = $('<input type="text"/>').val(old_value);
			$input.blur(function(event){
					if($input.val() != '')
					{
						thisnode.el.html($('<span>'+$input.val()+'</span>'));
						obj.root.animateToStatic();
					}
				})
				.click(function(){return false;})
				.keyup(function(event) {
					var keycode = event.which;
					var type = this.tagName.toLowerCase();
					if(keycode == 27) { // escape
						thisnode.el.html(old_value);
						obj.root.animateToStatic();
					}
					else if(keycode == 13) { // enter
						thisnode.el.html($('<span>'+$input.val()+'</span>'));
						thisnode.el.addClass('active');
						
						if (typeof(obj.options.onchange)=='function') {
							obj.options.onchange(obj.root.serialize());
						}
						obj.root.animateToStatic();
					}
					return true;
				})
				.appendTo(thisnode.el)
			if(thisnode != obj.root)
				$('<a style="margin-left:1em;" href="#">[x]</a>').click(function(){
					thisnode.removeNode();
					if (typeof(obj.options.onchange)=='function') {
							obj.options.onchange(obj.root.serialize());
					}
					obj.root.animateToStatic();
				}).appendTo(thisnode.el);
			$input.focus().select();
			return false;
		});
        }else{
                  this.el.click(opennode);
        }

    };
    
    Node.prototype.serialize = function()
    {
	var string = '{"node":"' + encodeURI(this.el.html()) + '","children":[';
	var count = 0;
	$.each(this.children, function(){
		if(!this.el.hasClass('addNode'))
		{
			count++;
			if(count > 1)
				string = string+','
			string = string+this.serialize();
		}
	});
	return string+']}';
    }

    // ROOT NODE ONLY:  control animation loop
    Node.prototype.animateToStatic = function() {

        clearTimeout(this.moveTimer);
        // stop the movement after a certain time
        var thisnode = this;
        this.moveTimer = setTimeout(function() {
            //stop the movement
            thisnode.obj.movementStopped = true;
        }, this.options.timeout*1000);

        if (this.moving) return;
        this.moving = true;
        this.obj.movementStopped = false;
        this.animateLoop();
    }
    
    // ROOT NODE ONLY:  animate all nodes (calls itself recursively)
    Node.prototype.animateLoop = function() {
        this.obj.canvas.clear();
        for (var i = 0; i < this.obj.lines.length; i++) {
            this.obj.lines[i].updatePosition();
        }
        if (this.findEquilibrium() || this.obj.movementStopped) {
            this.moving=false;
            return;
        }
        var mynode = this;
        setTimeout(function() {
            mynode.animateLoop();
        }, 10);
    }

    // find the right position for this node
    Node.prototype.findEquilibrium = function() {
        var Static = true;
        Static = this.display() && Static;
        for (var i=0;i<this.children.length;i++) {
            Static = this.children[i].findEquilibrium() && Static;
        }
        return Static;
    }

    //Display this node, and its children
    Node.prototype.display = function() {
        if (this.visible) {
          // if: I'm not active AND my parent's not active AND my children aren't active ...
          if (!this.el.hasClass('active'))
          {
	  if(this.parent != null)
	  {
	   if(!this.parent.el.hasClass('active'))
	   {
		  if (typeof(obj.options.onhide)=='function') {
			obj.options.onhide(this);
		  }
		  this.el.hide();
		  this.visible = false;
             }
            }
            
          }
        } else {
          if (this.el.hasClass('active') || this.parent.el.hasClass('active')) {
            this.el.show();
            this.visible = true;
            if (typeof(obj.options.onshow)=='function') {
		obj.options.onshow(this);
	  }
          }
        }
        this.drawn = true;
        // am I positioned?  If not, position me.
        if (!this.hasPosition) {
            this.x = this.options.mapArea.x/2;
            this.y = this.options.mapArea.y/2;
        	this.el.css('left', this.x + "px");
        	this.el.css('top', this.y + "px");
            this.hasPosition=true;
        }
        // are my children positioned?  if not, lay out my children around me
        var stepAngle = Math.PI*2/this.children.length;
        var parent = this;  
        $.each(this.children, function(index) {
            if (!this.hasPosition && this.el.css('display') != 'none') {
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
    }

    // updatePosition returns a boolean stating whether it's been static
    Node.prototype.updatePosition = function(){
        if ($(this.el).hasClass("ui-draggable-dragging")) {
    		this.x = parseInt(this.el.css('left')) + ($(this.el).width() / 2);
    		this.y = parseInt(this.el.css('top')) + ($(this.el).height() / 2);
    		this.dx = 0;
    		this.dy = 0;
    		return false;
    	}
        
        //apply accelerations
        var forces = this.getForceVector();
        this.dx += forces.x * this.options.acceleration;
        this.dy += forces.y * this.options.acceleration;

        // damp the forces
        this.dx = this.dx * this.options.damping;
        this.dy = this.dy * this.options.damping;

        //ADD MINIMUM SPEEDS
        if (Math.abs(this.dx) < this.options.minSpeed) this.dx = 0;
        if (Math.abs(this.dy) < this.options.minSpeed) this.dy = 0;
        if (Math.abs(this.dx)+Math.abs(this.dy)==0) return true;
        //apply velocity vector
        this.x += this.dx * this.options.acceleration;
        this.y += this.dy * this.options.acceleration;
        this.x = Math.min(this.options.mapArea.x,Math.max(1,this.x));
        this.y = Math.min(this.options.mapArea.y,Math.max(1,this.y));
        // display
    	var showx = this.x - ($(this.el).width() / 2);
    	var showy = this.y - ($(this.el).height() / 2) - 10;
    	this.el.css('left', showx + "px");
    	this.el.css('top', showy + "px");
    	return false;
    }

    Node.prototype.getForceVector = function(){
        var fx = 0;
        var fy = 0;
        
        var nodes = this.obj.nodes;
        var lines = this.obj.lines;
        
        // Calculate the repulsive force from every other node
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i] == this) continue;
            if (this.options.showSublines && !nodes[i].hasLayout) continue;
            if (!nodes[i].visible) continue;
            // Repulsive force (coulomb's law)
            var x1 = (nodes[i].x - this.x);
            var y1 = (nodes[i].y - this.y);
            //adjust for variable node size
//		var nodewidths = (($(nodes[i]).width() + $(this.el).width())/2);
            var xsign = x1 / Math.abs(x1);
            var ysign = y1 / Math.abs(y1);
            var dist = Math.sqrt((x1 * x1) + (y1 * y1));
            var theta = Math.atan(y1 / x1);
            if (x1 == 0) {
                theta = Math.PI / 2;
                xsign = 0;
            }
            // force is based on radial distance
            var myrepulse = this.options.repulse;
//                if (this.parent==nodes[i]) myrepulse=myrepulse*10;  //parents stand further away
            var f = (myrepulse * 500) / (dist * dist);
            if (Math.abs(dist) < 500) {
                fx += -f * Math.cos(theta) * xsign;
                fy += -f * Math.sin(theta) * xsign;
            }
        }
        // add repulsive force of the "walls"
        //left wall
        var xdist = this.x + $(this.el).width();
        var f = (this.options.wallrepulse * 500) / (xdist * xdist);
        fx += Math.min(2, f);
        //right wall
        var rightdist = (this.options.mapArea.x - xdist);
        var f = -(this.options.wallrepulse * 500) / (rightdist * rightdist);
        fx += Math.max(-2, f);
        //top wall
        var f = (this.options.wallrepulse * 500) / (this.y * this.y);
        fy += Math.min(2, f);
        //bottom wall
        var bottomdist = (this.options.mapArea.y - this.y);
        var f = -(this.options.wallrepulse * 500) / (bottomdist * bottomdist);
        fy += Math.max(-2, f);

        // for each line, of which I'm a part, add an attractive force.
        for (var i = 0; i < lines.length; i++) {
            var otherend = null;
            if (lines[i].start == this) {
                otherend = lines[i].end;
            } else if (lines[i].end == this) {
                otherend = lines[i].start;
            } else continue;
            // Ignore the pull of hidden nodes
            if (!otherend.visible) continue;
            // Attractive force (hooke's law)
            var x1 = (otherend.x - this.x);
            var y1 = (otherend.y - this.y);
            var dist = Math.sqrt((x1 * x1) + (y1 * y1));
            var xsign = x1 / Math.abs(x1);
            var theta = Math.atan(y1 / x1);
            if (x1==0) {
                theta = Math.PI / 2;
                xsign = 0;
            }
            // force is based on radial distance
            var f = (this.options.attract * dist) / 10000;
            if (Math.abs(dist) > 0) {
                fx += f * Math.cos(theta) * xsign;
                fy += f * Math.sin(theta) * xsign;
            }
        }

        // if I'm active, attract me to the centre of the area
        if (this.obj.activeNode === this) {
            // Attractive force (hooke's law)
            var otherend = this.options.mapArea;
            var x1 = ((otherend.x / 2) - this.options.centerOffset - this.x);
            var y1 = ((otherend.y / 2) - this.y);
            var dist = Math.sqrt((x1 * x1) + (y1 * y1));
            var xsign = x1 / Math.abs(x1);
            var theta = Math.atan(y1 / x1);
            if (x1 == 0) {
                theta = Math.PI / 2;
                xsign = 0;
            }
            // force is based on radial distance
            var f = (0.1 * this.options.attract * dist * this.options.centerAttraction) / 1000;
            if (Math.abs(dist) > 0) {
                fx += f * Math.cos(theta) * xsign;
                fy += f * Math.sin(theta) * xsign;
            }
        }

        if (Math.abs(fx) > this.options.maxForce) fx = this.options.maxForce * (fx / Math.abs(fx));
        if (Math.abs(fy) > this.options.maxForce) fy = this.options.maxForce * (fy / Math.abs(fy));
        return {
            x: fx,
            y: fy
        };
    }

    Node.prototype.removeNode = function(){
        for (var i=0;i<this.children.length;i++) {
            this.children[i].removeNode();
        }
    
        var oldnodes = this.obj.nodes;
        this.obj.nodes = new Array();
        for (var i = 0; i < oldnodes.length; i++) {
            if (oldnodes[i]===this) continue;
            this.obj.nodes.push(oldnodes[i]);
        }

        var oldlines = this.obj.lines;
        this.obj.lines = new Array();
        for (var i = 0; i < oldlines.length; i++) {
            if (oldlines[i].start == this) {
                continue;
            } else if (oldlines[i].end == this) {
                continue;
            } else this.obj.lines.push(oldlines[i]);
        }

        $(this.el).remove();
    }



    // Define all Line related functions.
    function Line(obj, startNode, endNode){
        this.obj = obj;
        this.options = obj.options;
        this.start = startNode;
        this.colour = "blue";
        this.size = "thick";
        this.end = endNode;
    }

    Line.prototype.updatePosition = function(){
        if (this.options.showSublines && (!this.start.hasLayout || !this.end.hasLayout)) return;
        if (!this.options.showSublines && (!this.start.visible || !this.end.visible)) return;
        this.strokeStyle = this.options.lineColor;
        this.strokeWidth = this.options.lineWidth;
        this.strokeOpacity = this.options.lineOpacity;

        var c = this.obj.canvas.path("M"+this.start.x+' '+this.start.y+"L"+this.end.x+' '+this.end.y).attr({stroke: this.strokeStyle, opacity:this.strokeOpacity, 'stroke-width':this.strokeWidth});                

    }
    
    $.fn.addNode = function (parent, name, options, addNode) {
        var obj = this[0];
        var node = obj.nodes[obj.nodes.length] = new Node(obj, name, parent, options);
        console.log(obj.root);
        
        //add a "+"-Node for adding new nodes
        if(node.options.editable == true && !addNode)
		this.addNewNode(node);
        
        obj.root.animateToStatic();
        return node;
    }
    
    $.fn.addNewNode = function (parent)
    {
	var parent = parent;
	var mindmap = this;
	node = this.addNode(parent, '+',{
		onclick:function(event)
		{
			newnode = mindmap.addNode(parent, '...', {});
			newnode.el.trigger('dblclick');
			return false;
		}
	}, true);
	node.el.addClass('addNode');
	return node;
    }

    $.fn.addRootNode = function (content, opts) {
        var node = this[0].nodes[0] = new Node(this[0], content, null, opts);
        this[0].root = node;
        
        //add a "+"-Node for adding new nodes
        if(node.options.editable == true)
		this.addNewNode(node);
        
        return node;
    }
    
    $.fn.removeNode = function (name) {
        return this.each(function() {
//            if (!!this.mindmapInit) return false;
            //remove a node matching the anme
//            alert(name+' removed');
        });
    }
    
    $.fn.buzzmap = function(options) {
	  var $mindmap = $('ul:eq(0)',this);
	  if(!$mindmap.hasClass('buzzmap-active'))
	  {
	  
	  // Define default settings.
            var options = $.extend({
		  editable: false,
		  onchange: function(data){},
		  ondrag: function(root){},
		  onshow: function(node){},
		  onhide: function(node){},
		  attract: 10,
		  repulse: 6,
		  damping: 0.55,
		  wallrepulse: 0.4,
		  mapArea: {
		      x:-1,
		      y:-1
		  },
		  acceleration: 15,
		  minSpeed: 0.05,
		  maxForce: 0.1,
		  lineWidth: '5px',
		  lineColor: '#FFF',
		  lineOpacity: 0.3,
		  centerOffset:100,
		  centerAttraction:0,
		  timeout: 5,
            },options);
            
	  return $mindmap.each(function() {
		  var mindmap = this;
		  this.mindmapInit = true;
		  this.nodes = new Array();
		  this.lines = new Array();
		  this.activeNode = null;
		  this.options = options;
		  this.animateToStatic = function() {
		      this.activeNode.animateToStatic();
		  }
		  $(window).resize(function(){
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
		  this.canvas = Raphael(0, 0, options.mapArea.x, options.mapArea.y);
		  
		  // Add a class to the object, so that styles can be applied
		  $(this).addClass('buzzmap-active');
	   
		  // add the data to the mindmap
		  var root = $('>li',this).get(0).mynode = $mindmap.addRootNode($('>li>div',this).html(), {});

		  $('>li',this).hide();
		  var addLI = function() {
		      var parentnode = $(this).parents('li').get(0);
		      if (typeof(parentnode)=='undefined') parentnode=root;
			else parentnode=parentnode.mynode;
		      
		      this.mynode = $mindmap.addNode(parentnode, $('div:eq(0)',this).html(), {});
		      $(this).hide();
		      $('>ul>li', this).each(addLI);
		  };
		  $('>li>ul',mindmap).each(function() {
		      $('>li', this).each(addLI);
		  });
	  });
	}
    };
})(jQuery);

