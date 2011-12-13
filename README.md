# buzzmap
fluid mindmaps in javascript (jquery plugin)  
Copyright (c) 2011 Marcel Klehr

based on "js-mindmap"  
Copyright (c) 2008/09/10 Kenneth Kufluk http://kenneth.kufluk.com/

This program makes use of "MicroEvent"  
Copyright (c) 2011 Jerome Etienne, http://jetienne.com

## Features
 - Draggable nodes
 - Realistic animation (nodes look like floating in water)
 - Loads mindmap from HTML or JSON data
 - Callbacks for many operations
 - Fully and intuitively editable in edit mode

## Requirements
 - jQuery
 - jQueryUI
 - Raphael

## Documentation
See the [wiki](http://github.com/marcelklehr/buzzmap/wiki) for more information about how to install and use **buzzmap**.

## Issues
Submit any bugs and feature requests to the [bug tracker](http://github.com/marcelklehr/buzzmap/issues)

## Changelog
1.8:

- Now more than one root nodes are possible
- Fixed a strange behaviour (some nodes weren't moving until being dragged)
- There's now a CSS class for root nodes ('root')
- Root nodes' children can no longer be hidden
- New event system (MicroEvent)
- New class 'Buzzmap'