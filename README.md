# Mindmaps with ease
Buzzmap is a jQuery plugin, that enables you to visualize structured data online, directly in your browser. But, while most mindmap tools look static and boring, buzzmap renders your mindmap dynamically and animates it, so you can drag the nodes around and display their child nodes on the fly.  
[Give it a try!](http://marcelklehr.github.com/buzzmap)

#### Download
Download the latest version as [zip](https://github.com/marcelklehr/buzzmap/zipball/master) | [tar](https://github.com/marcelklehr/buzzmap/tarball/master).

#### Requirements
Buzzmap requires [jQuery](http://jquery.com/), [jQueryUI](http://jqueryui.com/) and [Raphael](http://raphaeljs.com/).

#### Features
 - Awesome animation (looks like floating in water)
 - Draggable nodes
 - Loads mindmaps from JSON data and the DOM (everything jQuery swallows).
 - Callback hooks for every posible operation
 - Edit mode for live editing in your browser

#### Documentation
See the [buzzmap wiki](http://github.com/marcelklehr/buzzmap/wiki) for more information about how to install and use buzzmap.

#### Issues
Submit any bugs and feature requests to the [bug tracker](http://github.com/marcelklehr/buzzmap/issues) after looking, whether a similar bug has already been submitted there or has been added to the author's [to-do list](http://github.com/marcelklehr/buzzmap/wiki/Todo).

# License
[MIT (X11) License](http://github.com/marcelklehr/buzzmap/blob/master/LICENSE) (see `LICENSE` file)

# Changelog
2.0.3:

 - Fixed bug in `Node#removeNode()` function

2.0.2:

 - Fixed serialization

2.0.1:

 - Fixed Bug: Don't throw Error on init
 
2.0.0:

 - Changed names of some options (`animationTimeout`, `wallRepuse`, `structure`)
 - Center attraction is no longer supported!
 - Edit mode: finally, as it should be! (Fixed dblclick behaviour; adjust `minSpeed` while editing)
 - Changed class `buzzmap-active`into `buzzmap`
 - Changed stylesheets (removed `buzzmap.css`; `custom-style.css` is now called `styles.css`)

1.8.2:

- Bugfix: Nodes weren't removed from their parents when deleting them
- Tried to make edit mode more intuitive (doubleclicking still fires 'click' event)

1.8.1:

- Corrected jQuery selection mechanism (now the buzzmap container must be selected directly)
- New CSS class for root nodes ('root') 

1.8:

- Now more than one root nodes are possible
- Bugfix: Fixed a strange behaviour (some nodes weren't moving until being dragged)
- Root nodes' children can no longer be hidden
- New event system (MicroEvent)
- New class 'Buzzmap'